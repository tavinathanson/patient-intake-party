import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { createApp } from '../server.mjs';

const question=async()=>({kind:'question',question:'Does your name start with A?',aside:'The alphabet has suspects.',guess:null});
async function setup(t,generateTurn=question) {
  const server=createApp({generateTurn});
  assert.ok(server,'createApp must return an HTTP server');
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=(path,body,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  return {base,post,server};
}

test('HTTP game creation, restore and stale answer handling use authoritative state',async t=>{
  const {base,post}=await setup(t);
  const start=await post('/api/games',{}); assert.equal(start.status,201);
  const {game}=await start.json();
  const next=await post(`/api/games/${game.id}/answer`,{turnId:game.turn.id,answer:'maybe'});
  assert.equal(next.status,200);
  assert.equal((await next.json()).game.asked,2);
  const duplicate=await post(`/api/games/${game.id}/answer`,{turnId:game.turn.id,answer:'maybe'});
  assert.equal(duplicate.status,409);
  const restored=await (await fetch(`${base}/api/games/${game.id}`)).json();
  assert.equal(restored.game.history.length,1);
});

test('HTTP rejects foreign origins, non-JSON, malformed bodies and missing games',async t=>{
  const {base,post}=await setup(t);
  assert.equal((await post('/api/games',{}, {Origin:'https://example.org'})).status,403);
  assert.equal((await post('/api/games',{}, {'Content-Type':'text/plain'})).status,415);
  assert.equal((await post('/api/games',null)).status,400);
  assert.equal((await fetch(`${base}/api/games/nope`)).status,404);
  assert.equal((await fetch(`${base}/src/detective-instructions.md`)).status,404);
  assert.equal((await fetch(`${base}/api/health`)).status,200);
});

test('failed model answer can be retried without spending two questions',async t=>{
  let calls=0;
  const generateTurn=async()=>{calls++;if(calls===2)throw new Error('model offline');return question();};
  const {post}=await setup(t,generateTurn);
  const {game}=await (await post('/api/games',{})).json();
  const body={turnId:game.turn.id,answer:'no'};
  assert.equal((await post(`/api/games/${game.id}/answer`,body)).status,502);
  const retried=await post(`/api/games/${game.id}/answer`,body);
  const next=(await retried.json()).game;
  assert.equal(next.asked,2);
  assert.equal(next.history.length,1);
});

test('concurrent answers cannot consume the same question twice',async t=>{
  let calls=0;
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const generateTurn=async()=>{if(++calls===2)await gate;return question();};
  const {post}=await setup(t,generateTurn);
  const {game}=await (await post('/api/games',{})).json();
  const first=post(`/api/games/${game.id}/answer`,{turnId:game.turn.id,answer:'no'});
  const second=post(`/api/games/${game.id}/answer`,{turnId:game.turn.id,answer:'yes'});
  setTimeout(release,50);
  const responses=await Promise.all([first,second]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
});

test('fallback preserves a multibyte name split across HTTP chunks',async t=>{
  const {base,post,server}=await setup(t);
  let {game}=await (await post('/api/games',{})).json();
  for(let n=0;n<20;n++) ({game}=await (await post(`/api/games/${game.id}/answer`,{turnId:game.turn.id,answer:'maybe'})).json());
  const body=Buffer.from(JSON.stringify({value:{firstName:'Zoë'}}));
  const split=body.indexOf(Buffer.from('ë'))+1;
  const result=await new Promise((resolve,reject)=>{
    const req=request(`${base}/api/games/${game.id}/fallback`,{method:'POST',headers:{'Content-Type':'application/json'}},res=>{
      let text='';
      res.setEncoding('utf8');
      res.on('data',chunk=>{text+=chunk;});
      res.on('error',reject);
      res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(text)}));
    });
    req.on('error',reject);
    // Only send the remaining bytes once the server has received the first chunk.
    server.once('request',incoming=>incoming.once('data',()=>req.end(body.subarray(split))));
    req.write(body.subarray(0,split));
  });
  assert.equal(result.status,200);
  assert.deepEqual(result.body.game.results.name.value,{firstName:'Zoë'});
});
