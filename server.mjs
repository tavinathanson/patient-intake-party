import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createGame, answerGame, submitFallback, continueGame, GameError } from './src/game.mjs';
import { generateTurn as codexTurn } from './src/detective.mjs';

const publicDir=new URL('./public/',import.meta.url);
const staticFiles=new Map([
  ['/', ['index.html','text/html; charset=utf-8']],
  ['/index.html',['index.html','text/html; charset=utf-8']],
  ['/styles.css',['styles.css','text/css; charset=utf-8']],
  ['/app.js',['app.js','text/javascript; charset=utf-8']],
  ['/detective.svg',['detective.svg','image/svg+xml']],
]);

function json(res,status,body) {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if(!req.headers['content-type']?.startsWith('application/json')) throw new GameError('Send application/json.',415);
  req.setEncoding('utf8');
  let body='';
  for await (const chunk of req) {
    body+=chunk;
    if(Buffer.byteLength(body)>16384) throw new GameError('This statement is too long.',413);
  }
  let parsed;
  try { parsed=JSON.parse(body); } catch { throw new GameError('Invalid JSON request.'); }
  if(!parsed || typeof parsed!=='object' || Array.isArray(parsed)) throw new GameError('Expected a JSON object.');
  return parsed;
}

export function createApp({generateTurn=codexTurn}={}) {
  const games=new Map();
  const busy=new Set();
  let starting=false;
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    try {
      const host=req.headers.host||'';
      if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) throw new GameError('This app is available on localhost only.',403);
      const origin=req.headers.origin;
      if(origin && origin!==`http://${host}`) throw new GameError('Only requests from this local app are accepted.',403);
      if(req.headers['sec-fetch-site']==='cross-site') throw new GameError('Cross-site requests are not accepted.',403);
      const url=new URL(req.url,`http://${host}`);
      const path=url.pathname;
      if(req.method==='GET' && staticFiles.has(path)) {
        const [file,type]=staticFiles.get(path);
        const content=await readFile(new URL(file,publicDir));
        res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});res.end(content);return;
      }
      if(req.method==='GET' && path==='/favicon.ico') {res.writeHead(204);res.end();return;}
      if(req.method==='GET' && path==='/api/health') return json(res,200,{ok:true,backend:'codex'});
      if(req.method==='POST' && path==='/api/games') {
        await readBody(req);
        if(starting) throw new GameError('The detective is already opening a case. Try again in a moment.',409);
        starting=true;
        try {
          const game=await createGame(generateTurn);
          // Bound session memory for a local demo; the oldest case expires first.
          if(games.size>=100) games.delete(games.keys().next().value);
          games.set(game.id,game);return json(res,201,{game});
        } finally {starting=false;}
      }
      const match=path.match(/^\/api\/games\/([a-zA-Z0-9-]+)(?:\/(answer|fallback|continue))?$/);
      if(!match) throw new GameError('Not found.',404);
      const [,id,action]=match;
      if(!games.has(id)) throw new GameError('This case file has expired. Start a new investigation.',404);
      if(req.method==='GET' && !action) return json(res,200,{game:games.get(id)});
      if(req.method!=='POST' || !action) throw new GameError('Method not allowed.',405);
      const body=await readBody(req);
      if(busy.has(id)) throw new GameError('The detective is still examining your last answer.',409);
      busy.add(id);
      try {
        const game=games.get(id);
        const next=action==='answer'?await answerGame(game,body.turnId,body.answer,generateTurn):action==='fallback'?submitFallback(game,body.value):await continueGame(game,generateTurn);
        games.set(id,next);
        json(res,200,{game:next});
      } finally {busy.delete(id);}
    } catch(error) {
      if(!res.headersSent) json(res,error.status||502,{error:error.status?error.message:'The detective lost the connection. Please try again.'});
      else res.end();
    }
  });
  server.requestTimeout=120000;
  return server;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const port=Number(process.env.PORT)||4317;
  const server=createApp();
  server.on('error',error=>{console.error(`Could not start Intake Investigations: ${error.message}`);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(`Intake Investigations → http://localhost:${port}\nDetective: Codex CLI (${process.env.CODEX_MODEL||'default model'})\nPress Ctrl+C to close the bureau.`));
}
