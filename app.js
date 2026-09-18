import { bounceOffPaddle } from './physics.js';
const $ = (id) => document.getElementById(id);
const baseQuestions = [
  {label:'Age',category:'01 · A LITTLE ABOUT YOU',title:'How old are you?',hint:'Start with your age group. Next, pop your exact age.',options:['0–9','10–19','20–29','30–39','40–49','50–59','60–69','70–79','80–89','90–99','100–109','110+']},
  {label:'Reason for visit',category:'02 · YOUR VISIT',title:'What brings you in?',hint:'Aim for the main reason for your visit.',options:['Checkup','New concern','Follow-up','Prescription','Other']},
  {label:'How you feel',category:'03 · CHECKING IN',title:'How are you feeling today?',hint:'Pick the balloon that feels most like you.',options:['Great','Good','Okay','Not great','Unwell']},
  {label:'Medications',category:'04 · THE EVERYDAY DETAILS',title:'Taking any medications?',hint:'Include prescriptions, supplements, and over-the-counter medicines.',options:['Yes','No','Not sure']},
  {label:'Allergies',category:'05 · ONE LAST THING',title:'Any known allergies?',hint:'Your care team can ask about the details during your visit.',options:['Yes','No','Not sure']}
];
const palette=['#f2b452','#ed896c','#81c9c7','#aebbe6','#c0d276','#e8a8c1'];
const duration=['Today','2–3 days','1 week','2–4 weeks','1–3 months','3+ months'];
const yesNo=['Yes','No','Not sure'];
const q=(label,title,options)=>({label,title,options,hint:'Aim at your answer. Balloon values change every 10 seconds.'});
const forms={
  'Glaucoma':[q('Diagnosis','Have you been diagnosed with glaucoma?',yesNo),q('Affected eye','Which eye is affected?',['Left','Right','Both','Not sure']),q('Eye drops','Do you use prescription eye drops?',yesNo),q('Last eye exam','When was your last eye exam?',['<1 month','1–6 months','6–12 months','1–2 years','2+ years','Never','Not sure'])],
  'Persistent pain':[q('Pain location','Where is your main pain?',['Back','Neck','Head','Joints','Abdomen','Arms','Legs','Other']),q('Duration','How long have you had this pain?',duration),q('Pain intensity','How intense is your pain today?',Array.from({length:11},(_,i)=>String(i))),q('Daily impact','How much does pain affect your day?',['Not at all','A little','Moderately','A lot','Completely'])],
  'GLP-1 / Weight Loss':[q('Visit goal','What would you like to discuss?',['Starting','Follow-up','Side effects','Options','Other']),q('Current treatment','Are you currently taking a GLP-1?',yesNo),q('Past treatment','Have you tried weight-loss treatment?',yesNo),q('Main goal','What is your main goal?',['Weight loss','More energy','Mobility','Overall health','Other'])],
  'Strained back':[q('Back area','Where does your back hurt?',['Upper','Middle','Lower','All over','Not sure']),q('Duration','When did the back pain start?',duration),q('Trigger','What were you doing when it started?',['Lifting','Exercise','Twisting','Sitting','A fall','Other','Not sure']),q('Pain intensity','How intense is your pain today?',Array.from({length:11},(_,i)=>String(i)))],
  'Eczema':[q('Affected area','Where is your main affected area?',['Face','Hands','Arms','Legs','Torso','Scalp','Other']),q('Duration','How long has this flare lasted?',duration),q('Itch intensity','How intense is the itching?',Array.from({length:11},(_,i)=>String(i))),q('Current treatment','Are you using an eczema treatment?',yesNo)]
};
let selectedForm='Glaucoma';
let questions=[baseQuestions[0],...forms[selectedForm]];
const formAnswers=Object.fromEntries(Object.keys(forms).map(name=>[name,Array(5).fill(null)]));
const canvas=$('game'),ctx=canvas.getContext('2d');
let answers=formAnswers[selectedForm];
let current=0,angle=0,shot=null,balloons=[],particles=[],pending=null,ageBase=null,simple=false,sound=false,audio=null,prev=0,elapsed=0;
let refreshRemaining=10;
const origin={x:400,y:410};
const heldKeys=new Set();
const difficulties={
  classic:{name:'Classic',speed:0,radius:51,description:'Stationary shooter. Use ← / → to adjust your aim. Full-size balloons, no blockers.'},
  drifter:{name:'Drifter',speed:180,radius:51,description:'The shooter moves on its own. Use ← / → to aim and time your shot.'},
  bank:{name:'Bank Shot',speed:150,radius:48,description:'Automatic movement + a moving, rotating paddle. Ricochet off its face or the walls.'},
  orbit:{name:'Orbit',speed:0,radius:32,description:'Shooter on the outer track. Balloons on the inner orbit. Everything moves clockwise; ← / → aim relative to center.'},
  chaos:{name:'Chaos',speed:260,radius:38,description:'Faster movement, smaller drifting balloons, and two rotating paddles. Time your ricochet!'}
};
let difficulty='classic',travelDirection=1,baseAngle=0;
function blockers(){
  if(simple)return [];
  if(difficulty==='bank')return [{x:400+Math.sin(elapsed*1.1)*125,y:265+Math.sin(elapsed*.8)*22,w:230,h:20,angle:Math.sin(elapsed*.95)*1.1}];
  if(difficulty==='chaos')return [{x:255+Math.sin(elapsed*1.3)*110,y:225,w:175,h:18,angle:elapsed*1.05},{x:540+Math.sin(elapsed*1.1+2)*95,y:290,w:145,h:18,angle:-elapsed*1.25+.6}];
  return [];
}
function feedback(message){$('shot-feedback').textContent=message;$('announcement').textContent=message;}

function options(){return current===0&&ageBase!==null?[...Array.from({length:110},(_,i)=>String(i)),'110+']:questions[current].options;}
function makeBalloons(refresh=false){
  const pool=options();
  const previous=balloons.filter(b=>!b.action).map(b=>b.label);
  let items;
  if(refresh){
    const fresh=pool.filter(value=>!previous.includes(value));
    for(let i=fresh.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[fresh[i],fresh[j]]=[fresh[j],fresh[i]];}
    // Prefer unseen values; small answer sets can only change positions.
    const repeated=[...previous.slice(1),previous[0]].filter(value=>pool.includes(value));
    items=[...fresh,...repeated].slice(0,5);
  }else{
    const start=current===0&&ageBase!==null?ageBase:0;
    items=Array.from({length:Math.min(5,pool.length)},(_,i)=>pool[(start+i)%pool.length]);
  }
  balloons=items.map((label,i)=>({label,x:400+(i-items.length/2)*120,y:88,r:difficulties[difficulty].radius,color:palette[i%palette.length]}));
  balloons.push({label:'↻ Shuffle',action:'shuffle',x:400+items.length/2*120,y:88,r:difficulties[difficulty].radius,color:'#396952'});
  for(const balloon of balloons)balloon.baseX=balloon.x;
  refreshRemaining=10;
  canvas.setAttribute('aria-label',`Balloon shooter. Current answers: ${items.join(', ')}. Shoot the green Shuffle balloon to change the values immediately. Use left and right arrows to adjust your aim, and Space to fire. Aim with the mouse or angle slider. Values change every 10 seconds.`);
}
function renderSheet(){
  $('answers').replaceChildren(...questions.map((q,i)=>{const li=document.createElement('li');li.className=answers[i]!==null?'done':i===current?'active':'';const step=document.createElement('span');step.className='step';step.textContent=answers[i]!==null?'✓':String(i+1).padStart(2,'0');const label=document.createElement('div');label.className='answer-label';label.textContent=q.label;const value=document.createElement('span');value.className='answer-value';value.textContent=answers[i]??(i===current?'Up next':'Waiting for your shot');label.append(value);li.append(step,label);if(answers[i]!==null){const edit=document.createElement('button');edit.textContent='Edit';edit.setAttribute('aria-label',`Edit ${q.label}`);edit.onclick=()=>load(i);li.append(edit);}return li;}));
  const count=answers.filter(v=>v!==null).length;$('progress').style.width=`${count/5*100}%`;$('progress-text').textContent=`${count} of 5 answers collected`;
}
function load(index){
  current=index;origin.x=400;origin.y=410;baseAngle=0;heldKeys.clear();ageBase=null;pending=null;shot=null;particles=[];angle=0;$('aim').value=0;$('angle').textContent='0°';$('result').hidden=true;$('shoot').disabled=false;
  const q=questions[current];$('round').textContent=`ROUND ${String(current+1).padStart(2,'0')} / 05`;$('category').textContent=`${String(current+1).padStart(2,'0')} · ${selectedForm.toUpperCase()}`;$('question').textContent=q.title;$('hint').textContent=q.hint;
  makeBalloons();renderSimple();renderSheet();
}
function renderSimple(){
  $('simple').hidden=!simple;$('simple').replaceChildren(...options().map(label=>{const button=document.createElement('button');button.textContent=label;button.disabled=pending!==null;button.onclick=()=>select(label);return button;}));
}
function select(label){
  if(current===0&&ageBase===null&&label!=='110+'){
    ageBase=Number(label.split('–')[0]);$('hint').textContent='Pop your exact age. Shuffle draws new ages from the full range.';shot=null;makeBalloons();renderSimple();$('shoot').disabled=false;$('announcement').textContent=`Age group ${label}. Now choose your exact age.`;return;
  }
  pending=label;$('picked').textContent=current===0?`${label} years old`:label;$('next').textContent=answers.filter(v=>v!==null).length>=4?'Review answers →':'Keep answer →';$('result').hidden=false;$('shoot').disabled=true;renderSimple();$('announcement').textContent=`Selected ${label}. Keep this answer or try again.`;$('next').focus({preventScroll:true});$('result').scrollIntoView({block:'nearest',behavior:'smooth'});
}
function pop(balloon){
  for(let i=0;i<25;i++){const a=Math.random()*Math.PI*2;particles.push({x:balloon.x,y:balloon.y,vx:Math.cos(a)*(70+Math.random()*170),vy:Math.sin(a)*(70+Math.random()*170),life:1,color:balloon.color});}
  if(sound){audio??=new AudioContext();audio.resume();const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.connect(gain);gain.connect(audio.destination);oscillator.frequency.setValueAtTime(700,audio.currentTime);oscillator.frequency.exponentialRampToValueAtTime(230,audio.currentTime+.14);gain.gain.setValueAtTime(.07,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.18);oscillator.start();oscillator.stop(audio.currentTime+.2);}
  shot=null;
  if(balloon.action==='shuffle'){
    makeBalloons(true);
    $('shoot').disabled=false;
    $('announcement').textContent='Balloon values refreshed. Take another shot!';
    return;
  }
  select(balloon.label);
}
function fire(){if(shot||pending!==null||simple||$('review').open)return;const rad=(angle+baseAngle)*Math.PI/180;shot={x:origin.x,y:origin.y,vx:Math.sin(rad)*700,vy:-Math.cos(rad)*700,life:0};$('shoot').disabled=true;}
function setAngle(value){angle=Math.max(-72,Math.min(72,value));$('aim').value=angle;$('angle').textContent=`${Math.round(angle)}°`;}
function aimAt(event){const rect=canvas.getBoundingClientRect();const x=(event.clientX-rect.left)*800/rect.width,y=(event.clientY-rect.top)*470/rect.height;const absolute=Math.atan2(x-origin.x,origin.y-y)*180/Math.PI;setAngle(((absolute-baseAngle+540)%360)-180);}
canvas.addEventListener('pointermove',event=>{if(!shot&&pending===null)aimAt(event);});
canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;aimAt(event);canvas.focus();fire();});
document.addEventListener('keydown',event=>{
  if($('review').open||event.target.closest('textarea,select,[contenteditable=true],input:not([type=range])'))return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();heldKeys.add(event.key);}
  else if(event.key===' '&&pending===null&&!simple){event.preventDefault();if(!event.repeat)fire();}
});
document.addEventListener('keyup',event=>heldKeys.delete(event.key));
window.addEventListener('blur',()=>heldKeys.clear());
function moveShooter(distance){
  if(pending!==null||simple||$('review').open)return;
  setAngle(angle+distance/8);
}
for(const [id,key,direction] of [['move-left','ArrowLeft',-1],['move-right','ArrowRight',1]]){
  const button=$(id);
  button.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    moveShooter(direction*24);
    heldKeys.add(key);
  });
  for(const eventName of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(eventName,()=>heldKeys.delete(key));
  button.addEventListener('click',event=>{if(event.detail===0)moveShooter(direction*24);});
}
$('space-shoot').onclick=fire;

$('aim').oninput=event=>setAngle(Number(event.target.value));$('shoot').onclick=fire;
$('retry').onclick=()=>{pending=null;$('result').hidden=true;$('shoot').disabled=false;makeBalloons();renderSimple();canvas.focus();};
$('next').onclick=()=>{answers[current]=pending;renderSheet();if(answers.every(v=>v!==null))review();else load(answers.findIndex((v,i)=>i>current&&v===null)>=0?answers.findIndex((v,i)=>i>current&&v===null):answers.findIndex(v=>v===null));};
$('mode').onclick=()=>{simple=!simple;shot=null;$('shoot').disabled=simple||pending!==null;$('mode').textContent=simple?'Switch to arcade mode':'Switch to simple mode';$('mode').setAttribute('aria-pressed',simple);renderSimple();};
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-pressed',sound);$('sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');};
function review(){
  $('review-answers').replaceChildren(...questions.map((q,i)=>{const row=document.createElement('div'),label=document.createElement('span'),button=document.createElement('button');label.textContent=`${q.label}: ${answers[i]}`;button.textContent='Edit';button.setAttribute('aria-label',`Edit ${q.label}`);button.onclick=()=>{$('review').close();load(i);};row.append(label,button);return row;}));
  $('completion').textContent='';$('finish').disabled=false;$('review').showModal();
}
$('finish').onclick=()=>{$('completion').textContent='All done! Your demo intake is complete. No answers were sent or saved.';$('finish').disabled=true;};
$('restart').onclick=()=>{$('review').close();answers.fill(null);load(0);};
function circle(x,y,r,fill,stroke= '#24493d',width=2){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function draw(dt){
  ctx.clearRect(0,0,800,470);
  if(difficulty==='orbit'&&!simple){
    ctx.strokeStyle='#93b38b';ctx.lineWidth=1.5;ctx.setLineDash([5,7]);
    ctx.beginPath();ctx.roundRect(48,48,704,374,15);ctx.stroke();
    ctx.beginPath();ctx.ellipse(400,235,215,98,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  }
  const obstacles=blockers();
  for(const block of obstacles){
    ctx.save();ctx.translate(block.x,block.y);ctx.rotate(block.angle);
    ctx.fillStyle='#254b41';ctx.strokeStyle='#112f26';ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(-block.w/2,-block.h/2,block.w,block.h,6);ctx.fill();ctx.stroke();
    ctx.save();ctx.clip();ctx.strokeStyle='#f2b452';ctx.lineWidth=7;
    for(let x=-block.w/2-20;x<block.w/2+20;x+=25){ctx.beginPath();ctx.moveTo(x,block.h/2);ctx.lineTo(x+20,-block.h/2);ctx.stroke();}ctx.restore();
    circle(0,0,5,'#fff3d9');ctx.restore();
  }
  for(const b of balloons){
    if(pending===b.label)continue;
    ctx.fillStyle='#254f3520';ctx.beginPath();ctx.ellipse(b.x+3,b.y+9,b.r,b.r,0,0,7);ctx.fill();
    circle(b.x,b.y,b.r,b.color);ctx.beginPath();ctx.arc(b.x-2,b.y-3,b.r-8,3.65,4.85);ctx.strokeStyle='#ffffff85';ctx.lineWidth=5;ctx.lineCap='round';ctx.stroke();
    ctx.fillStyle=b.action==='shuffle'?'#fff9ec':'#203e36';ctx.font=`bold ${b.label.length>10?15:b.label.length>6?18:22}px 'Trebuchet MS',sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.label,b.x,b.y+3,b.r*1.8);
    ctx.beginPath();ctx.moveTo(b.x-4,b.y+b.r+4);ctx.lineTo(b.x+4,b.y+b.r+4);ctx.lineTo(b.x,b.y+b.r-2);ctx.closePath();ctx.fillStyle=b.color;ctx.fill();
  }

  ctx.save();ctx.translate(origin.x-400,origin.y-410);
  ctx.fillStyle='#c0d5b4';ctx.beginPath();ctx.ellipse(400,443,64,12,0,0,7);ctx.fill();
  circle(400,423,32,'#f4be62');circle(375,407,12,'#f4be62');circle(425,407,12,'#f4be62');
  circle(386,425,3,'#183e35',null);circle(414,425,3,'#183e35',null);ctx.beginPath();ctx.arc(400,426,7,.2,Math.PI-.2);ctx.strokeStyle='#183e35';ctx.lineWidth=2;ctx.stroke();
  ctx.save();ctx.translate(400,401);ctx.rotate((angle+baseAngle)*Math.PI/180);ctx.fillStyle='#396952';ctx.strokeStyle='#183e35';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(-13,-50,26,47,6);ctx.fill();ctx.stroke();ctx.fillStyle='#8eb797';ctx.fillRect(-10,-44,20,6);ctx.restore();circle(400,405,17,'#fff3d9');circle(400,405,7,'#ef8866');
  ctx.restore();
  if(shot){
    // Short substeps prevent fast projectiles from passing through balloons.
    for(let i=0;i<5&&shot;i++){
      shot.life+=dt/5;shot.x+=shot.vx*dt/5;shot.y+=shot.vy*dt/5;if(shot.x<19||shot.x>781){shot.x=Math.max(19,Math.min(781,shot.x));shot.vx*=-1;feedback('Bank shot!');}
      if(difficulty==='orbit'&&(shot.y<19||shot.y>451)){shot.y=Math.max(19,Math.min(451,shot.y));shot.vy*=-1;feedback('Bank shot!');}
      for(const paddle of obstacles)if(bounceOffPaddle(shot,paddle))feedback('Ricochet! Paddle bounce.');
      const hit=balloons.find(b=>Math.hypot(shot.x-b.x,shot.y-b.y)<b.r+10);
      if(hit){pop(hit);break;}
      if(shot.y<-15||shot.y>490||shot.life>8){shot=null;$('shoot').disabled=false;feedback('Missed! Adjust your aim and try again.');}
    }
    if(shot){circle(shot.x,shot.y,11,'#fff5db');circle(shot.x-3,shot.y-3,3,'#fff',null);}
  }
  particles=particles.filter(p=>p.life>0);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.life-=dt*1.7;ctx.globalAlpha=Math.max(0,p.life);circle(p.x,p.y,4,p.color,null);}ctx.globalAlpha=1;
}
function frame(time){
  const realDt=prev?Math.max(0,(time-prev)/1000):0,dt=Math.min(realDt,.035);prev=time;
  if(!shot&&pending===null&&!simple&&!document.hidden&&!$('review').open){refreshRemaining-=realDt;if(refreshRemaining<=0)makeBalloons(true);}
  $('refresh').textContent=simple?'ALL ANSWERS AVAILABLE':shot||pending!==null||$('review').open?'REFRESH PAUSED':`NEW VALUES IN ${Math.ceil(refreshRemaining)}s`;
  if(pending===null&&!simple&&!document.hidden&&!$('review').open){
    elapsed+=dt;
    const steer=(heldKeys.has('ArrowRight')?1:0)-(heldKeys.has('ArrowLeft')?1:0),mode=difficulties[difficulty];
    if(difficulty==='orbit'){
      // Follow the outer rectangle clockwise, beginning at its top-left corner.
      let distance=(elapsed*145)%2156;
      if(distance<704){origin.x=48+distance;origin.y=48;}
      else if(distance<1078){origin.x=752;origin.y=48+distance-704;}
      else if(distance<1782){origin.x=752-(distance-1078);origin.y=422;}
      else{origin.x=48;origin.y=422-(distance-1782);}
      baseAngle=Math.atan2(400-origin.x,origin.y-235)*180/Math.PI;
      if(steer)setAngle(angle+steer*80*dt);
    }else if(mode.speed){
      origin.x+=travelDirection*mode.speed*dt;
      if(origin.x>=650||origin.x<=150){origin.x=Math.max(150,Math.min(650,origin.x));travelDirection*=-1;}
      if(steer)setAngle(angle+steer*80*dt);
    }else if(steer)setAngle(angle+steer*80*dt);
    for(const [i,b] of balloons.entries()){
      if(difficulty==='orbit'){
        const phase=elapsed*.42+i*Math.PI*2/balloons.length;
        b.x=400+Math.cos(phase)*215;b.y=235+Math.sin(phase)*98;
      }else{b.x=b.baseX+(difficulty==='chaos'?Math.sin(elapsed*1.9)*32:0);b.y=88;}
    }
  }
  draw(dt);requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{prev=0;heldKeys.clear();});
const picker=document.createElement('section');picker.className='form-picker';picker.setAttribute('aria-label','Choose intake form');
const pickerLabel=document.createElement('p');pickerLabel.className='eyebrow';pickerLabel.textContent='CHOOSE YOUR INTAKE';picker.append(pickerLabel);
for(const name of Object.keys(forms)){const button=document.createElement('button');button.textContent=name;button.setAttribute('aria-pressed',name===selectedForm);button.onclick=()=>{selectedForm=name;questions=[baseQuestions[0],...forms[name]];answers=formAnswers[name];for(const item of picker.querySelectorAll('button'))item.setAttribute('aria-pressed',item===button);load(Math.max(0,answers.findIndex(v=>v===null)));};picker.append(button);}
document.querySelector('.workspace').before(picker);
const refresh=document.createElement('div');refresh.id='refresh';refresh.className='refresh';document.querySelector('.playfield').prepend(refresh);
const difficultyPanel=document.createElement('section');difficultyPanel.className='difficulty-panel';difficultyPanel.setAttribute('aria-label','Difficulty settings');
const difficultyLabel=document.createElement('span');difficultyLabel.className='eyebrow';difficultyLabel.textContent='DIFFICULTY';difficultyPanel.append(difficultyLabel);
for(const [key,mode] of Object.entries(difficulties)){
  const button=document.createElement('button');button.textContent=mode.name;button.setAttribute('aria-pressed',key===difficulty);
  button.onclick=()=>{
    difficulty=key;shot=null;heldKeys.clear();elapsed=0;origin.x=400;origin.y=410;baseAngle=0;travelDirection=1;
    for(const item of difficultyPanel.querySelectorAll('button'))item.setAttribute('aria-pressed',item===button);
    $('difficulty-description').textContent=mode.description;
    $('movement-label').textContent=' aim / ';
    $('move-left').setAttribute('aria-label','Aim left');
    $('move-right').setAttribute('aria-label','Aim right');
    $('shoot').disabled=simple||pending!==null;
    makeBalloons();feedback(`${mode.name} selected.`);
  };difficultyPanel.append(button);
}
const description=document.createElement('p');description.id='difficulty-description';description.textContent=difficulties.classic.description;difficultyPanel.append(description);
const shotFeedback=document.createElement('p');shotFeedback.id='shot-feedback';shotFeedback.textContent='Pick your angle. Take your shot.';difficultyPanel.append(shotFeedback);
document.querySelector('.question').before(difficultyPanel);
load(0);requestAnimationFrame(frame);
