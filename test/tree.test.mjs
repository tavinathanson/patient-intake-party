import test from 'node:test';
import assert from 'node:assert/strict';
import { getEvidence, generateFromDeck } from '../public/src/tree.mjs';

const deck = {
  candidates: [
    {id:'a',value:{firstName:'Andrew'}},
    {id:'b',value:{firstName:'John'}},
    {id:'c',value:{firstName:'Willow'}},
  ],
  questions: [
    {id:'alias',text:'Does your name keep a shorter alias on file?',yesIds:['a','b']},
    {id:'andy',text:'Does your name answer to Andy when the authorities are not looking?',yesIds:['a']},
  ],
};

test('Yes and No follow opposite branches; Maybe retains the entire suspect list', () => {
  assert.deepEqual(getEvidence(deck,[{clueId:'alias',answer:'yes'}])?.remaining.map(c=>c.id),['a','b']);
  assert.deepEqual(getEvidence(deck,[{clueId:'alias',answer:'no'}])?.remaining.map(c=>c.id),['c']);
  assert.deepEqual(getEvidence(deck,[{clueId:'alias',answer:'maybe'}])?.remaining.map(c=>c.id),['a','b','c']);
});

test('Maybe changes the question without excluding candidates', () => {
  const turn = generateFromDeck(deck,{asked:2,history:[{clueId:'alias',answer:'maybe'}]});
  assert.equal(turn?.clueId,'andy');
  assert.equal(turn?.kind,'question');
});

test('a sole survivor is only proposed as a guess with its canonical value', () => {
  const turn = generateFromDeck(deck,{asked:3,history:[{clueId:'alias',answer:'yes'},{clueId:'andy',answer:'yes'}]});
  assert.equal(turn?.kind,'guess');
  assert.equal(turn?.candidateId,'a');
  assert.deepEqual(turn?.guess,{firstName:'Andrew'});
});

test('rejected guesses are excluded, uncertain guesses remain but are not repeated', () => {
  const history=[{clueId:'alias',answer:'yes'},{clueId:'andy',answer:'maybe'},{candidateId:'a',answer:'no'}];
  assert.deepEqual(getEvidence(deck,history)?.remaining.map(c=>c.id),['b']);
  assert.equal(generateFromDeck(deck,{asked:4,history})?.candidateId,'b');
  const uncertain=[...history.slice(0,2),{candidateId:'a',answer:'maybe'}];
  assert.deepEqual(getEvidence(deck,uncertain)?.remaining.map(c=>c.id),['a','b']);
  assert.equal(generateFromDeck(deck,{asked:4,history:uncertain})?.candidateId,'b');
});

test('contradictory clues never revive an eliminated candidate or declare a solution', () => {
  const history=[{clueId:'alias',answer:'no'},{clueId:'andy',answer:'yes'}];
  assert.deepEqual(getEvidence(deck,history)?.remaining,[]);
  const turn=generateFromDeck(deck,{asked:3,history});
  assert.equal(turn?.kind,'question');
  assert.equal(turn?.guess,null);
});
