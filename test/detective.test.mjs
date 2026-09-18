import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateTurn } from '../src/detective.mjs';

test('Codex output preserves a multibyte character split across stdout chunks',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'intake-codex-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const executable=join(directory,'codex');
  await writeFile(executable,`#!/usr/bin/env node
const output=Buffer.from(JSON.stringify({kind:'question',question:'Does your name rhyme with Zoë?',aside:'A clue.',guess:{firstName:'',reason:'',dob:'',pharmacyName:'',pharmacyAddress:''}}));
const split=output.indexOf(Buffer.from('ë'))+1;
process.stdout.write(output.subarray(0,split));
setTimeout(()=>process.stdout.end(output.subarray(split)),100);
`,{mode:0o700});
  const original=process.env.CODEX_BIN;
  process.env.CODEX_BIN=executable;
  t.after(()=>{if(original===undefined)delete process.env.CODEX_BIN;else process.env.CODEX_BIN=original;});
  const turn=await generateTurn({categoryIndex:0,asked:1,results:{},history:[]});
  assert.equal(turn.question,'Does your name rhyme with Zoë?');
});

test('Codex model capacity failures explain the temporary capacity issue',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'intake-codex-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const executable=join(directory,'codex');
  await writeFile(executable,`#!/usr/bin/env node
process.stderr.write('Selected model is at capacity. Please try a different model.');
process.exitCode=1;
`,{mode:0o700});
  const original=process.env.CODEX_BIN;
  process.env.CODEX_BIN=executable;
  t.after(()=>{if(original===undefined)delete process.env.CODEX_BIN;else process.env.CODEX_BIN=original;});
  t.mock.method(console,'error',()=>{});
  await assert.rejects(generateTurn({categoryIndex:0,asked:1,results:{},history:[]}),error=>error.status===503 && /capacity/i.test(error.message) && /try again|retry/i.test(error.message));
});
