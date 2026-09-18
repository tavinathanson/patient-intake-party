import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, GameError } from './game.mjs';

const schemaPath=fileURLToPath(new URL('./turn.schema.json',import.meta.url));
const instructionsPath=fileURLToPath(new URL('./detective-instructions.md',import.meta.url));
const timeoutMs=Number(process.env.CODEX_TIMEOUT_MS)||90000;

export function generateTurn(game) {
  const category=CATEGORIES[game.categoryIndex];
  const prompt=JSON.stringify({
    instruction:'Generate the next detective turn for this game. Use only the evidence below.',
    category:category.label,fields:Object.keys(category.fields),questionNumber:game.asked,questionLimit:20,
    confirmedFacts:game.results,transcript:game.history,
  });
  const args=[
    'exec','--ephemeral','--ignore-user-config','--skip-git-repo-check','--sandbox','read-only',
    '--output-schema',schemaPath,'--color','never',
    '-c','approval_policy="never"',
    '-c',`model_instructions_file=${JSON.stringify(instructionsPath)}`,
    '-c','project_doc_max_bytes=0','-c','model_reasoning_effort="low"',
    '-c','web_search="disabled"',
  ];
  // This agent plays a game; it does not need the user's apps, files, or shell.
  for(const feature of ['shell_tool','unified_exec','apps','plugins','hooks','multi_agent','browser_use','browser_use_external','computer_use','image_generation','in_app_browser','memories','workspace_dependencies']) args.push('--disable',feature);
  if(process.env.CODEX_MODEL) args.push('--model',process.env.CODEX_MODEL);
  args.push('-');
  return new Promise((resolve,reject)=>{
    const child=spawn(process.env.CODEX_BIN||'codex',args,{stdio:['pipe','pipe','pipe'],cwd:fileURLToPath(new URL('.',import.meta.url))});
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    let output='',stderr='',settled=false;
    const finish=(error,value)=>{
      if(settled)return;
      settled=true;clearTimeout(timer);
      if(error)reject(error);else resolve(value);
    };
    const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new GameError('The detective took too long at the evidence board. Try that answer again.',504));},timeoutMs);
    child.stdout.on('data',chunk=>{
      output+=chunk;
      if(output.length>200000){child.kill('SIGKILL');finish(new GameError('The detective wrote an entire novel. Please retry.',502));}
    });
    child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-4000);});
    child.on('error',error=>finish(new GameError(error.code==='ENOENT'?'Codex CLI was not found. Install Codex and run codex login, then restart the app.':'Could not start Codex. Check the server terminal.',503)));
    child.stdin.on('error',()=>{});
    child.on('close',code=>{
      if(settled)return;
      if(code!==0){
        console.error('Codex failed:',stderr);
        if(/at capacity/i.test(stderr)) return finish(new GameError('The detective’s model is temporarily at capacity. Please retry in a moment.',503));
        return finish(new GameError(/unauthorized|not logged|authentication|401/i.test(stderr)?'Codex needs you to sign in. Run codex login in a terminal, then retry.':/usage limit|rate limit|quota/i.test(stderr)?'Codex has reached its usage limit. Try again when your limit resets.':'The detective could not reach Codex. Check the server terminal and try again.',502));
      }
      try { finish(null,JSON.parse(output.trim())); }
      catch { finish(new GameError('The detective handed over an unreadable note. Please try again.',502)); }
    });
    child.stdin.end(prompt);
  });
}
