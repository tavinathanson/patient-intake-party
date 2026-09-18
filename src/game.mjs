import { randomUUID } from 'node:crypto';

export const CATEGORIES = [
  {key:'name',label:'First name',fields:{firstName:'First name'}},
  {key:'reason',label:'Primary reason for visit',fields:{reason:'Reason for visit'}},
  {key:'dob',label:'Date of birth',fields:{dob:'Date of birth'}},
  {key:'pharmacy',label:'Specific pharmacy',fields:{pharmacyName:'Pharmacy name',pharmacyAddress:'Pharmacy address / location'}},
];
export const LIMIT = 20;

export class GameError extends Error {
  constructor(message,status=400) { super(message); this.status=status; }
}

function normalizeValue(categoryIndex, input) {
  const category=CATEGORIES[categoryIndex];
  if(!input || typeof input!=='object' || Array.isArray(input)) throw new GameError('Enter the missing information.');
  const value={};
  for(const [key,label] of Object.entries(category.fields)) {
    if(typeof input[key]!=='string' || !input[key].trim()) throw new GameError(`${label} is required.`);
    if(input[key].length>500) throw new GameError(`${label} must be 500 characters or fewer.`);
    value[key]=input[key].trim();
  }
  if(category.key==='dob') {
    const date=new Date(`${value.dob}T00:00:00Z`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value.dob) || Number.isNaN(date.getTime()) || date.toISOString().slice(0,10)!==value.dob || value.dob<'1900-01-01' || value.dob>new Date().toISOString().slice(0,10)) {
      throw new GameError('Enter a real date of birth between 1900 and today.');
    }
  }
  return value;
}

async function nextTurn(game,generateTurn) {
  const raw=await generateTurn(structuredClone(game));
  if(!raw || !['question','guess'].includes(raw.kind) || typeof raw.question!=='string' || !raw.question.trim() || raw.question.length>1200 || typeof raw.aside!=='string' || raw.aside.length>1200) {
    throw new GameError('The detective lost his train of thought. Please try again.',502);
  }
  let value=null;
  if(raw.kind==='guess') {
    try { value=normalizeValue(game.categoryIndex,raw.guess); }
    catch(error) { throw new GameError(`The detective returned an incomplete guess: ${error.message}`,502); }
  }
  return {...game,phase:'question',turn:{id:randomUUID(),kind:raw.kind,question:raw.question.trim(),aside:raw.aside.trim(),guess:value}};
}

function resolve(game,value,method) {
  const category=CATEGORIES[game.categoryIndex];
  return {...game,turn:null,phase:game.categoryIndex===3?'complete':'between',results:{...game.results,[category.key]:{value,method,questions:game.asked}}};
}

export async function createGame(generateTurn) {
  return nextTurn({id:randomUUID(),categoryIndex:0,phase:'question',asked:1,turn:null,history:[],results:{}},generateTurn);
}

export async function answerGame(game,turnId,answer,generateTurn) {
  if(game.phase!=='question' || !game.turn || game.turn.id!==turnId) throw new GameError('This question was already answered or is stale. Refresh the case file.',409);
  if(!['yes','no','maybe'].includes(answer)) throw new GameError('Choose a valid answer: Yes, No, or Maybe.');
  const next={...game,history:[...game.history,{category:CATEGORIES[game.categoryIndex].key,number:game.asked,question:game.turn.question,answer,aside:game.turn.aside}]};
  if(game.turn.kind==='guess' && answer==='yes') return resolve(next,game.turn.guess,'deduced');
  if(game.asked>=LIMIT) return {...next,phase:'fallback',turn:null};
  return nextTurn({...next,asked:game.asked+1,turn:null},generateTurn);
}

export function submitFallback(game,input) {
  if(game.phase!=='fallback') throw new GameError('Normal input is available after 20 unresolved questions.',409);
  return resolve(game,normalizeValue(game.categoryIndex,input),'confessed');
}

export async function continueGame(game,generateTurn) {
  if(game.phase!=='between') throw new GameError('Finish the current case before continuing.',409);
  return nextTurn({...game,categoryIndex:game.categoryIndex+1,asked:1,turn:null},generateTurn);
}
