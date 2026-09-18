import test from 'node:test';
import assert from 'node:assert/strict';
import { DECKS, generateTurn } from '../public/src/local-detective.mjs';
import { CATEGORIES, createGame, answerGame, continueGame } from '../public/src/game.mjs';
import { getEvidence } from '../public/src/tree.mjs';

const targets = {
  name: {firstName:'Andrew'},
  reason: {reason:'GLP-1 / weight loss'},
  dob: {dob:'1995-05-26'},
  pharmacy: {pharmacyName:'CVS',pharmacyAddress:'258 8th Ave, New York, NY 10011'},
};

test('each deck has exactly 100 unique candidates, valid clues, and the requested answer', () => {
  for (const [key, deck] of Object.entries(DECKS)) {
    assert.equal(deck.candidates.length,100,key);
    assert.equal(new Set(deck.candidates.map(c=>c.id)).size,100,key);
    assert.equal(new Set(deck.candidates.map(c=>JSON.stringify(c.value))).size,100,key);
    assert.ok(deck.candidates.some(c=>JSON.stringify(c.value)===JSON.stringify(targets[key])),`missing ${key} anchor`);
    assert.equal(new Set(deck.questions.map(q=>q.id)).size,deck.questions.length);
    const ids = new Set(deck.candidates.map(c=>c.id));
    for (const question of deck.questions) {
      assert.ok(question.text.endsWith('?') || question.text.includes('?'), question.id);
      assert.ok(question.yesIds.length>0 && question.yesIds.length<100,question.id);
      assert.ok(question.yesIds.every(id=>ids.has(id)),question.id);
    }
  }
  assert.equal(DECKS.pharmacy.candidates.filter(c=>c.fictional).length,99);
});

function answerFor(deck, target, turn) {
  if (turn.kind==='guess') return turn.candidateId===target.id?'yes':'no';
  const clue=deck.questions.find(q=>q.id===turn.clueId);
  assert.ok(clue,`Missing clue metadata: ${turn.question}`);
  return clue.yesIds.includes(target.id)?'yes':'no';
}

test('all 400 candidates can be confirmed within 20 questions without repeated clues',async()=>{
  const stats={};
  for(const [index, category] of CATEGORIES.entries()) {
    const deck=DECKS[category.key];
    let max=0;
    for(const target of deck.candidates) {
      const forCategory=game=>generateTurn({...game,categoryIndex:index});
      let game=await createGame(forCategory);
      game={...game,categoryIndex:index};
      const seen=new Set();
      while(game.phase==='question') {
        const key=game.turn.clueId||game.turn.candidateId;
        assert.ok(key,`${target.id}: turn identity is missing`);
        assert.ok(!seen.has(key),`${target.id}: repeated ${key}`);
        seen.add(key);
        game=await answerGame(game,game.turn.id,answerFor(deck,target,game.turn),generateTurn);
      }
      assert.deepEqual(game.results[category.key]?.value,target.value,`${target.id} wasn't solved in 20 questions`);
      max=Math.max(max,game.asked);
    }
    stats[category.key]=max;
  }
  console.log('Longest honest path by category:',stats);
});

test('the four requested answers work end to end in one intake',async()=>{
  let game=await createGame(generateTurn);
  for(const category of CATEGORIES) {
    const deck=DECKS[category.key];
    const target=deck.candidates.find(c=>JSON.stringify(c.value)===JSON.stringify(targets[category.key]));
    while(game.phase==='question') game=await answerGame(game,game.turn.id,answerFor(deck,target,game.turn),generateTurn);
    assert.deepEqual(game.results[category.key]?.value,targets[category.key]);
    if(game.phase==='between') game=await continueGame(game,generateTurn);
  }
  assert.equal(game.phase,'complete');
});

test('twenty Maybes retain all suspects and reach normal entry on every category',async()=>{
  for(const [index,category] of CATEGORIES.entries()) {
    let game=await createGame(g=>generateTurn({...g,categoryIndex:index}));
    game={...game,categoryIndex:index};
    const seen=new Set();
    for(let i=0;i<20;i++) {
      assert.ok(!seen.has(game.turn.clueId));
      seen.add(game.turn.clueId);
      game=await answerGame(game,game.turn.id,'maybe',generateTurn);
    }
    assert.equal(game.phase,'fallback');
    assert.equal(getEvidence(DECKS[category.key],game.history).remaining.length,100);
    assert.deepEqual(game.results,{});
  }
});

test('known anchor clues agree with the supplied values',()=>{
  const cvs=DECKS.pharmacy.candidates.find(c=>!c.fictional);
  for(const id of ['pharmacy-city-0','pharmacy-shop-0','pharmacy-national','pharmacy-east']) {
    assert.ok(DECKS.pharmacy.questions.find(q=>q.id===id).yesIds.includes(cvs.id),id);
  }
  const date='dob-1995-05-26';
  for(const id of ['dob-month-5','dob-era-1990','dob-late-month','dob-last-week']) assert.ok(DECKS.dob.questions.find(q=>q.id===id).yesIds.includes(date),id);
  assert.ok(!DECKS.dob.questions.find(q=>q.id==='dob-even-year').yesIds.includes(date));
});
