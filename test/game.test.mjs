import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, answerGame, submitFallback, continueGame } from '../public/src/game.mjs';

const question = async () => ({ kind: 'question', question: 'Does your name contain an E?', aside: 'A vowel. A motive.', guess: null });
const guess = (value) => async () => ({ kind: 'guess', question: 'Is this your answer?', aside: 'The evidence is overwhelming.', guess: value });

test('twenty Maybe answers reveal fallback without asking a twenty-first question', async () => {
  let calls = 0;
  const generate = async (...args) => { calls++; return question(...args); };
  let game = await createGame(generate);
  for (let n = 1; n <= 20; n++) {
    assert.equal(game.asked, n);
    assert.equal(game.phase, 'question');
    game = await answerGame(game, game.turn.id, 'maybe', generate);
  }
  assert.equal(game.phase, 'fallback');
  assert.equal(game.history.length, 20);
  assert.equal(calls, 20);
  assert.equal(game.turn, null);
});

test('ordinary Yes does not resolve the category, but Yes to a complete guess does', async () => {
  let game = await createGame(question);
  game = await answerGame(game, game.turn.id, 'yes', guess({firstName:'Ada'}));
  assert.deepEqual(game.results, {});
  assert.equal(game.asked, 2);
  game = await answerGame(game, game.turn.id, 'yes', question);
  assert.equal(game.phase, 'between');
  assert.deepEqual(game.results.name, {value:{firstName:'Ada'},method:'deduced',questions:2});
});

test('No and Maybe reject explicit guesses and a Yes at question 20 still solves', async () => {
  let game = await createGame(guess({firstName:'Ada'}));
  for (let n=1; n<20; n++) game = await answerGame(game, game.turn.id, n%2 ? 'no' : 'maybe', guess({firstName:'Ada'}));
  assert.equal(game.asked,20);
  game = await answerGame(game,game.turn.id,'yes',question);
  assert.equal(game.phase,'between');
  assert.equal(game.results.name.method,'deduced');
});

test('all four categories complete with verified values and question count resets', async () => {
  const values = [{firstName:'Ada'}, {reason:'A sore ankle'}, {dob:'1985-12-10'}, {pharmacyName:'CVS',pharmacyAddress:'123 Main St, Boston, MA'}];
  let game=await createGame(guess(values[0]));
  for (let i=0;i<4;i++) {
    assert.equal(game.categoryIndex,i);
    assert.equal(game.asked,1);
    game=await answerGame(game,game.turn.id,'yes',question);
    assert.equal(game.phase,i===3?'complete':'between');
    if(i<3) game=await continueGame(game,guess(values[i+1]));
  }
  assert.deepEqual(Object.keys(game.results),['name','reason','dob','pharmacy']);
});

test('model failures preserve the previous answerable state for retry', async () => {
  const game=await createGame(question);
  const before=JSON.stringify(game);
  await assert.rejects(answerGame(game,game.turn.id,'no',async()=>{throw new Error('offline');}),/offline/);
  assert.equal(JSON.stringify(game),before);
  const retried=await answerGame(game,game.turn.id,'no',question);
  assert.equal(retried.history.length,1);
  assert.equal(retried.asked,2);
});

test('invalid answers, stale turn IDs, partial guesses and premature fallback are rejected', async () => {
  const game=await createGame(question);
  await assert.rejects(answerGame(game,'old-turn','yes',question),/stale|already/i);
  await assert.rejects(answerGame(game,game.turn.id,'anything',question),/answer/i);
  assert.throws(()=>submitFallback(game,{firstName:'Ada'}),/fallback|twenty|20/i);
  await assert.rejects(createGame(guess({})),/first name/i);
});

test('fallback trims required fields and validates real dates and specific pharmacies', async () => {
  let game=await createGame(question);
  for(let n=0;n<20;n++) game=await answerGame(game,game.turn.id,'maybe',question);
  assert.throws(()=>submitFallback(game,{firstName:'  '}),/first name/i);
  game=submitFallback(game,{firstName:' Ada ',other:'ignored'});
  assert.deepEqual(game.results.name.value,{firstName:'Ada'});
  assert.equal(game.results.name.method,'confessed');
  const dateGame={...game,phase:'fallback',categoryIndex:2};
  for(const dob of ['2023-02-29','2099-01-01','not a date']) assert.throws(()=>submitFallback(dateGame,{dob}),/birth|date/i);
  assert.equal(submitFallback(dateGame,{dob:'2000-02-29'}).results.dob.value.dob,'2000-02-29');
  assert.throws(()=>submitFallback({...game,phase:'fallback',categoryIndex:3},{pharmacyName:'CVS'}),/address|location/i);
});

test('retrying an already recorded fallback reports a stale state conflict',async()=>{
  let game=await createGame(question);
  for(let n=0;n<20;n++) game=await answerGame(game,game.turn.id,'maybe',question);
  const value={firstName:'Ada'};
  game=submitFallback(game,value);
  assert.throws(()=>submitFallback(game,value),error=>error.status===409);
  assert.deepEqual(game.results.name.value,value);
});
