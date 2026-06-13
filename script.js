/* LoL Draft Tool — script.js */

const LANE_ICONS = {
  all:    'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/icon-position-fill-all.png',
  top:    'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/icon-position-fill-top.png',
  jungle: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/icon-position-fill-jungle.png',
  mid:    'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/icon-position-fill-middle.png',
  adc:    'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/icon-position-fill-bottom.png',
  support:'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-parties/global/default/icon-position-fill-utility.png',
};

const SEQ = [
  {t:'ban', s:'blue',i:0},{t:'ban', s:'red', i:0},
  {t:'ban', s:'blue',i:1},{t:'ban', s:'red', i:1},
  {t:'ban', s:'blue',i:2},{t:'ban', s:'red', i:2},
  {t:'pick',s:'blue',i:0},{t:'pick',s:'red', i:0},
  {t:'pick',s:'red', i:1},{t:'pick',s:'blue',i:1},
  {t:'pick',s:'blue',i:2},{t:'pick',s:'red', i:2},
  {t:'ban', s:'red', i:3},{t:'ban', s:'blue',i:3},
  {t:'ban', s:'red', i:4},{t:'ban', s:'blue',i:4},
  {t:'pick',s:'red', i:3},{t:'pick',s:'blue',i:3},
  {t:'pick',s:'blue',i:4},{t:'pick',s:'red', i:4},
];

const PHASES = [
  'FASE DE BAN 1','FASE DE BAN 1','FASE DE BAN 1','FASE DE BAN 1','FASE DE BAN 1','FASE DE BAN 1',
  'FASE DE PICK 1','FASE DE PICK 1','FASE DE PICK 1','FASE DE PICK 1','FASE DE PICK 1','FASE DE PICK 1',
  'FASE DE BAN 2','FASE DE BAN 2','FASE DE BAN 2','FASE DE BAN 2',
  'FASE DE PICK 2','FASE DE PICK 2','FASE DE PICK 2','FASE DE PICK 2',
];

const ROLES_PT = ['Top','Jungle','Mid','ADC','Suporte'];
const LANE_KEYS = ['top','jungle','mid','adc','support'];

// ── GLOBAL STATE ──
let G = {
  champs:[], filtered:[], ver:'',
  turn:0, tmax:30, tval:30, ticker:null,
  blue:{name:'Time Azul', bans:Array(5).fill(null), picks:Array(5).fill(null)},
  red: {name:'Time Vermelho', bans:Array(5).fill(null), picks:Array(5).fill(null)},
  role:'all', started:false, loaded:false,
  myTeam:null, draftId:null,
  // Series
  format:'bo1', fearless:false,
  gameNum:1, maxGames:1,
  scores:{blue:0, red:0},
  // Fearless: all champs used across games (by id)
  usedInSeries:{blue:new Set(), red:new Set()},
};

const $=id=>document.getElementById(id);

// ── LANE ICONS ──
function applyLaneIcons(){
  document.querySelectorAll('[data-lane]').forEach(el=>{
    const k=el.dataset.lane;
    if(LANE_ICONS[k]){
      el.src=LANE_ICONS[k];
      el.onload=()=>el.classList.add('loaded');
      el.onerror=()=>{ el.style.display='none'; };
    }
  });
}

// ── TYPING ANIMATION for team names ──
function typeText(el, text, speed=60){
  el.textContent='';
  el.classList.add('typing-cursor');
  let i=0;
  const iv=setInterval(()=>{
    el.textContent+=text[i++];
    if(i>=text.length){ clearInterval(iv); el.classList.remove('typing-cursor'); }
  }, speed);
}

// ── STORAGE ──
function mkId(){ return Math.random().toString(36).slice(2,10).toUpperCase(); }

function save(){
  if(!G.draftId) return;
  localStorage.setItem('ld_'+G.draftId, JSON.stringify({
    bn:G.blue.name, rn:G.red.name, tmax:G.tmax,
    turn:G.turn,
    bb:G.blue.bans, bp:G.blue.picks,
    rb:G.red.bans,  rp:G.red.picks,
    format:G.format, fearless:G.fearless,
    gameNum:G.gameNum, maxGames:G.maxGames,
    scores:G.scores,
    usedBlue:[...G.usedInSeries.blue],
    usedRed:[...G.usedInSeries.red],
    ts:Date.now(),
  }));
}

function loadSave(id){
  try{ return JSON.parse(localStorage.getItem('ld_'+id)||'null'); }catch(e){return null;}
}

// ── SYNC ──
let poll=null;
function startPoll(){ stopPoll(); poll=setInterval(doSync,1500); }
function stopPoll(){ if(poll){clearInterval(poll);poll=null;} }

function doSync(){
  if(!G.draftId) return;
  const d=loadSave(G.draftId); if(!d) return;
  const prev=G.turn;
  G.blue.bans=d.bb; G.blue.picks=d.bp;
  G.red.bans=d.rb;  G.red.picks=d.rp;
  G.scores=d.scores;
  G.usedInSeries.blue=new Set(d.usedBlue||[]);
  G.usedInSeries.red=new Set(d.usedRed||[]);
  d.bb.forEach((c,i)=>{ if(c) setBanUI('blue',i,c); });
  d.rb.forEach((c,i)=>{ if(c) setBanUI('red', i,c); });
  d.bp.forEach((c,i)=>{ if(c) setPickUI('blue',i,c); });
  d.rp.forEach((c,i)=>{ if(c) setPickUI('red', i,c); });
  markUsed();
  updateBanDisplayBar();
  if(d.turn!==prev){
    G.turn=d.turn;
    clearInterval(G.ticker);
    document.querySelectorAll('.act').forEach(e=>e.classList.remove('act','blue','red'));
    if(G.turn>=SEQ.length){ endOfDraft(); return; }
    const step=SEQ[G.turn];
    hlSlot(step); setLabels(step); updatePoolState();
    startClock(step);
  }
}

function isMyTurn(){
  if(G.myTeam===null) return false;
  if(G.turn>=SEQ.length) return false;
  return SEQ[G.turn].s===G.myTeam;
}

function updatePoolState(){
  const pool=$('pool-wrap');
  const isSpectator=G.myTeam===null;
  const myTurn=isMyTurn();

  if(isSpectator){
    pool.classList.remove('my-turn','not-turn');
    $('spectator-veil').style.display='flex';
  } else {
    $('spectator-veil').style.display='none';
    if(myTurn){ pool.classList.add('my-turn'); pool.classList.remove('not-turn'); }
    else { pool.classList.add('not-turn'); pool.classList.remove('my-turn'); }
  }

  // Update card classes
  document.querySelectorAll('.cc').forEach(card=>{
    if(isSpectator || !myTurn) card.classList.add('not-my-turn');
    else card.classList.remove('not-my-turn');
  });
}

// ── BAN DISPLAY BAR ──
function buildBanDisplayBar(){
  const blueBar=$('ban-display-blue');
  const redBar=$('ban-display-red');
  blueBar.innerHTML=''; redBar.innerHTML='';
  for(let i=0;i<5;i++){
    const sl=document.createElement('div');
    sl.className='bd-slot'; sl.id=`bd-blue-${i}`;
    sl.innerHTML='<img src="" alt=""/>';
    blueBar.appendChild(sl);
    const sr=document.createElement('div');
    sr.className='bd-slot'; sr.id=`bd-red-${i}`;
    sr.innerHTML='<img src="" alt=""/>';
    redBar.appendChild(sr);
  }
}

function updateBanDisplayBar(){
  ['blue','red'].forEach(team=>{
    G[team].bans.forEach((c,i)=>{
      const sl=$(`bd-${team}-${i}`); if(!sl) return;
      if(c){
        sl.querySelector('img').src=c.img;
        sl.classList.add('filled-ban'); sl.classList.remove('active-ban');
      }
    });
  });
  // Highlight active ban slot
  if(G.turn<SEQ.length){
    const step=SEQ[G.turn];
    if(step.t==='ban'){
      const sl=$(`bd-${step.s}-${step.i}`);
      if(sl && !sl.classList.contains('filled-ban')) sl.classList.add('active-ban');
    }
  }
}

// ── SETUP ──
document.querySelectorAll('.fbtn').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('.fbtn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    G.format=b.dataset.fmt;
    G.maxGames=G.format==='bo5'?5:G.format==='bo3'?3:1;
    $('fearless-row').style.display=G.format!=='bo1'?'block':'none';
    if(G.format==='bo1') $('fearless-check').checked=false;
  });
});

document.querySelectorAll('.tbtn').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('.tbtn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); G.tmax=parseInt(b.dataset.t)||0;
  });
});

$('btn-start').addEventListener('click',()=>{
  G.blue.name=$('blue-team-name').value.trim()||'Time Azul';
  G.red.name =$('red-team-name').value.trim()||'Time Vermelho';
  G.fearless=$('fearless-check').checked;
  G.maxGames=G.format==='bo5'?5:G.format==='bo3'?3:1;
  G.gameNum=1; G.scores={blue:0,red:0};
  G.usedInSeries={blue:new Set(),red:new Set()};
  G.draftId=mkId(); save(); showShare();
});

function showShare(){
  $('sbn').textContent=G.blue.name; $('srn').textContent=G.red.name;
  const base=location.href.split('?')[0];
  $('lnk-blue').value=`${base}?d=${G.draftId}&t=blue`;
  $('lnk-red').value= `${base}?d=${G.draftId}&t=red`;
  showScreen('share');
}

window.copyLink=function(team){
  const inp=$(team==='blue'?'lnk-blue':'lnk-red');
  inp.select(); navigator.clipboard.writeText(inp.value).catch(()=>document.execCommand('copy'));
  const btn=inp.nextElementSibling;
  btn.textContent='✓ Copiado!'; btn.classList.add('ok');
  setTimeout(()=>{btn.textContent='Copiar';btn.classList.remove('ok');},2000);
};
window.enter=function(team){ G.myTeam=team; beginDraft(); };

// ── URL PARAMS ──
function checkUrl(){
  const p=new URLSearchParams(location.search);
  const id=p.get('d'), team=p.get('t');
  if(!id) return false;
  const d=loadSave(id);
  if(!d){alert('Draft não encontrado. Peça um novo link.');return false;}
  G.draftId=id; G.myTeam=team||null;
  G.blue.name=d.bn; G.red.name=d.rn; G.tmax=d.tmax;
  G.turn=d.turn;
  G.blue.bans=d.bb; G.blue.picks=d.bp;
  G.red.bans=d.rb;  G.red.picks=d.rp;
  G.format=d.format||'bo1'; G.fearless=d.fearless||false;
  G.gameNum=d.gameNum||1; G.maxGames=d.maxGames||1;
  G.scores=d.scores||{blue:0,red:0};
  G.usedInSeries={blue:new Set(d.usedBlue||[]),red:new Set(d.usedRed||[])};
  G.started=true;
  beginDraft(); return true;
}

// ── BEGIN DRAFT ──
async function beginDraft(){
  showScreen('draft');
  buildBanDisplayBar();
  G.started=true;
  $('ftr-txt').textContent='Carregando campeões...';
  $('game-badge').textContent=G.maxGames>1?`Partida ${G.gameNum} de ${G.maxGames}`:'';

  try{
    await loadChamps();
    G.blue.bans.forEach((c,i)=>{ if(c) setBanUI('blue',i,c); });
    G.red.bans.forEach((c,i)=> { if(c) setBanUI('red', i,c); });
    G.blue.picks.forEach((c,i)=>{ if(c) setPickUI('blue',i,c); });
    G.red.picks.forEach((c,i)=> { if(c) setPickUI('red', i,c); });
    markUsed(); updateBanDisplayBar();
    // Typing animation for team names
    typeText($('hdr-blue'), G.blue.name, 55);
    setTimeout(()=>typeText($('hdr-red'), G.red.name, 55), 300);
    if(G.turn>=SEQ.length){ endOfDraft(); return; }
    advanceTurn(); startPoll();
  }catch(e){ $('ftr-txt').textContent='Erro ao carregar. Verifique a internet.'; console.error(e); }
}

// ── CHAMPIONS ──
async function loadChamps(){
  if(G.loaded) return;
  const vs=await(await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json();
  G.ver=vs[0];
  const data=await(await fetch(`https://ddragon.leagueoflegends.com/cdn/${G.ver}/data/pt_BR/champion.json`)).json();
  G.champs=Object.values(data.data).map(c=>({
    id:c.id, name:c.name, tags:c.tags,
    img:`https://ddragon.leagueoflegends.com/cdn/${G.ver}/img/champion/${c.id}.png`,
    spl:`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${c.id}_0.jpg`,
  })).sort((a,b)=>a.name.localeCompare(b.name));
  G.filtered=[...G.champs];
  G.loaded=true;
  renderGrid();
}

function renderGrid(){
  const frag=document.createDocumentFragment();
  G.filtered.forEach(c=>{
    const d=document.createElement('div');
    d.className='cc'; d.dataset.id=c.id;
    const img=document.createElement('img');
    img.src=c.img; img.alt=c.name; img.loading='lazy';
    const lbl=document.createElement('div');
    lbl.className='cn'; lbl.textContent=c.name;
    d.appendChild(img); d.appendChild(lbl);
    d.addEventListener('click',()=>onPick(c));
    d.addEventListener('mouseenter',()=>showTip(c));
    d.addEventListener('mouseleave',hideTip);
    frag.appendChild(d);
  });
  $('pool-grid').innerHTML='';
  $('pool-grid').appendChild(frag);
  markUsed(); updatePoolState();
}

function markUsed(){
  const banned=new Set([
    ...G.blue.bans.filter(Boolean).map(c=>c.id),
    ...G.red.bans.filter(Boolean).map(c=>c.id),
  ]);
  const picked=new Set([
    ...G.blue.picks.filter(Boolean).map(c=>c.id),
    ...G.red.picks.filter(Boolean).map(c=>c.id),
  ]);
  const fearlessUsed=G.fearless
    ? new Set([...G.usedInSeries.blue, ...G.usedInSeries.red])
    : new Set();

  document.querySelectorAll('.cc').forEach(el=>{
    const id=el.dataset.id;
    el.classList.toggle('banned', banned.has(id));
    el.classList.toggle('picked', picked.has(id));
    el.classList.toggle('fearless-blocked', !banned.has(id) && !picked.has(id) && fearlessUsed.has(id));
  });
}

function showTip(c){ $('tip-img').src=c.img; $('tip-name').textContent=c.name; $('champ-tip').classList.add('vis'); }
function hideTip(){ $('champ-tip').classList.remove('vis'); }

document.querySelectorAll('.rb').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('.rb').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); G.role=b.dataset.role; filter();
  });
});
$('srch').addEventListener('input',filter);

function filter(){
  const q=$('srch').value.toLowerCase().trim(), r=G.role;
  const tm={top:['Fighter','Tank'],jungle:['Fighter','Assassin'],mid:['Mage','Assassin'],adc:['Marksman'],support:['Support','Tank']};
  G.filtered=G.champs.filter(c=>{
    const mn=c.name.toLowerCase().includes(q)||c.id.toLowerCase().includes(q);
    const mr=r==='all'||(tm[r]||[]).some(t=>c.tags.includes(t));
    return mn&&mr;
  });
  renderGrid();
}

// ── SCREENS ──
function showScreen(n){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(`${n}-screen`).classList.add('active');
}

// ── RESET ──
$('btn-reset').addEventListener('click',()=>{ if(confirm('Reiniciar o draft?')){ stopPoll(); fullReset(); showScreen('setup'); }});
$('btn-new').addEventListener('click',()=>{ stopPoll(); fullReset(); showScreen('setup'); });
$('btn-end-series').addEventListener('click',()=>{ stopPoll(); fullReset(); showScreen('setup'); });

function fullReset(){
  clearInterval(G.ticker);
  G={...G,
    turn:0, started:false, myTeam:null, draftId:null, ticker:null,
    blue:{name:'Time Azul', bans:Array(5).fill(null), picks:Array(5).fill(null)},
    red: {name:'Time Vermelho', bans:Array(5).fill(null), picks:Array(5).fill(null)},
    gameNum:1, scores:{blue:0,red:0}, usedInSeries:{blue:new Set(),red:new Set()},
  };
  resetDraftUI();
}

function resetDraftUI(){
  document.querySelectorAll('.ban-slot').forEach(sl=>{sl.innerHTML='<span>B</span>';sl.classList.remove('act','done');});
  document.querySelectorAll('.pick-slot').forEach(sl=>{
    const i=parseInt(sl.dataset.i);
    sl.innerHTML=`<div class="pi"><img class="li" data-lane="${LANE_KEYS[i]}" src="${LANE_ICONS[LANE_KEYS[i]]}"/><span class="pr">${ROLES_PT[i]}</span><span class="pn">Esperando...</span></div>`;
    sl.classList.remove('act','done','blue','red');
  });
  $('clock-arc').classList.remove('urgent');
  updateTimerUI(G.tmax,G.tmax);
  $('clock-num').textContent=G.tmax||'∞';
  markUsed(); updatePoolState();
}

// ── ADVANCE ──
function advanceTurn(){
  clearInterval(G.ticker);
  document.querySelectorAll('.act').forEach(e=>e.classList.remove('act','blue','red'));
  updateBanDisplayBar();
  if(G.turn>=SEQ.length){ endOfDraft(); return; }
  const step=SEQ[G.turn];
  hlSlot(step); setLabels(step); updatePoolState();
  startClock(step);
}

function hlSlot(step){
  if(step.t==='ban'){
    const s=document.querySelector(`.ban-slot[data-team="${step.s}"][data-i="${step.i}"]`);
    if(s) s.classList.add('act');
  } else {
    const s=document.querySelector(`.pick-slot[data-team="${step.s}"][data-i="${step.i}"]`);
    if(s) s.classList.add('act',step.s);
  }
}

function setLabels(step){
  const n=step.s==='blue'?G.blue.name:G.red.name;
  const isBan=step.t==='ban';
  $('phase-tag').textContent=PHASES[G.turn]||'';
  $('action-tag').textContent=isBan?'Banindo':'Escolhendo';
  $('action-tag').className='action-tag '+(isBan?'ban':'pick');

  // Side labels next to clock
  const leftEl=$('turn-side-left'), rightEl=$('turn-side-right');
  leftEl.textContent=''; rightEl.textContent='';
  leftEl.className='turn-side'; rightEl.className='turn-side';
  if(step.s==='blue'){
    leftEl.textContent=G.blue.name;
    leftEl.classList.add('blue-side-txt');
  } else {
    rightEl.textContent=G.red.name;
    rightEl.classList.add('red-side-txt');
  }

  $('ftr-txt').textContent=`${n} está ${isBan?'banindo':'escolhendo'} — Turno ${G.turn+1} de ${SEQ.length}`;
}

// ── CLOCK ──
function startClock(step){
  $('clock-arc').classList.remove('urgent');
  if(G.tmax===0){ updateTimerUI(1,1); $('clock-num').textContent='∞'; return; }
  G.tval=G.tmax; updateTimerUI(G.tval,G.tmax);
  $('clock-num').textContent=G.tval;
  G.ticker=setInterval(()=>{
    G.tval--;
    $('clock-num').textContent=G.tval;
    updateTimerUI(G.tval,G.tmax);
    if(G.tval<=5) $('clock-arc').classList.add('urgent');
    if(G.tval<=0){
      clearInterval(G.ticker);
      // BAN/PICK PERDIDO — pula sem fazer nada
      G.turn++; save();
      setTimeout(advanceTurn, 300);
    }
  },1000);
}

function updateTimerUI(v,m){
  $('clock-arc').style.strokeDashoffset=m>0?188.5*(1-v/m):0;
}

// ── PICK / BAN ──
function getUsed(){
  return new Set([
    ...G.blue.bans.filter(Boolean).map(c=>c.id),...G.red.bans.filter(Boolean).map(c=>c.id),
    ...G.blue.picks.filter(Boolean).map(c=>c.id),...G.red.picks.filter(Boolean).map(c=>c.id),
  ]);
}

function onPick(champ){
  if(!G.started||G.turn>=SEQ.length) return;
  if(G.myTeam===null) return; // spectator — cannot act
  if(!isMyTurn()) return;
  if(getUsed().has(champ.id)) return;
  // Fearless check
  if(G.fearless){
    const allUsed=new Set([...G.usedInSeries.blue,...G.usedInSeries.red]);
    if(allUsed.has(champ.id)) return;
  }
  applyChoice(champ,SEQ[G.turn]);
}

function applyChoice(champ,step){
  clearInterval(G.ticker);
  $('clock-arc').classList.remove('urgent');
  if(step.t==='ban'){
    G[step.s].bans[step.i]=champ; setBanUI(step.s,step.i,champ);
  } else {
    G[step.s].picks[step.i]=champ; setPickUI(step.s,step.i,champ);
  }
  markUsed(); updateBanDisplayBar();
  G.turn++; save();
  setTimeout(advanceTurn,350);
}

function setBanUI(team,idx,champ){
  const s=document.querySelector(`.ban-slot[data-team="${team}"][data-i="${idx}"]`); if(!s) return;
  s.classList.remove('act'); s.classList.add('done');
  s.innerHTML=`<img src="${champ.img}" alt="${champ.name}" title="${champ.name}"/>`;
}

function setPickUI(team,idx,champ){
  const s=document.querySelector(`.pick-slot[data-team="${team}"][data-i="${idx}"]`); if(!s) return;
  s.classList.remove('act'); s.classList.add('done');
  s.innerHTML=`
    <img class="ci" src="${champ.spl}" alt="${champ.name}" onerror="this.src='${champ.img}'"/>
    <div class="pi">
      <img class="li" src="${LANE_ICONS[LANE_KEYS[idx]]}" data-lane="${LANE_KEYS[idx]}" alt="${ROLES_PT[idx]}"/>
      <span class="pr">${ROLES_PT[idx]}</span>
      <span class="pn">${champ.name}</span>
    </div>`;
}

// ── END OF DRAFT ──
function endOfDraft(){
  stopPoll();
  // Register picks to fearless used list
  if(G.fearless){
    G.blue.picks.filter(Boolean).forEach(c=>G.usedInSeries.blue.add(c.id));
    G.red.picks.filter(Boolean).forEach(c=>G.usedInSeries.red.add(c.id));
  }
  showResultScreen();
}

function showResultScreen(){
  $('rb-name').textContent=G.blue.name; $('rr-name').textContent=G.red.name;
  $('rb-bans').textContent=G.blue.bans.filter(Boolean).map(c=>c.name).join(', ')||'—';
  $('rr-bans').textContent=G.red.bans.filter(Boolean).map(c=>c.name).join(', ')||'—';

  const roles=ROLES_PT;
  ['blue','red'].forEach(team=>{
    const cont=$(`r${team[0]}-picks`); cont.innerHTML='';
    G[team].picks.forEach((c,i)=>{
      if(!c) return;
      const row=document.createElement('div'); row.className='rpr';
      row.innerHTML=`<img src="${c.img}" alt="${c.name}"/><span>${roles[i]} — ${c.name}</span>`;
      cont.appendChild(row);
    });
  });

  const nextBtn=$('btn-next');
  const neededToWin=G.format==='bo5'?3:G.format==='bo3'?2:1;
  const seriesOver=G.scores.blue>=neededToWin||G.scores.red>=neededToWin||G.gameNum>=G.maxGames;

  if(G.maxGames>1 && !seriesOver){
    nextBtn.style.display='inline-flex';
    nextBtn.textContent=`Partida ${G.gameNum+1} →`;
  } else {
    nextBtn.style.display='none';
  }

  setTimeout(()=>showScreen('result'),500);
}

// Next game button
$('btn-next').addEventListener('click',()=>{
  G.gameNum++;
  G.blue={...G.blue, bans:Array(5).fill(null), picks:Array(5).fill(null)};
  G.red= {...G.red,  bans:Array(5).fill(null), picks:Array(5).fill(null)};
  G.turn=0; G.started=false;
  save();
  showGameSelectScreen();
});

function showGameSelectScreen(){
  $('gs-title').textContent=`Partida ${G.gameNum}`;
  $('gs-sub').textContent=`Prepare-se para o próximo draft (${G.format.toUpperCase()})`;

  const sb=$('gs-scores');
  sb.innerHTML=`
    <div class="gs-score-item"><span>${G.blue.name}</span><span>${G.scores.blue}</span></div>
    <div style="font-size:1.2rem;color:var(--gd)">—</div>
    <div class="gs-score-item"><span>${G.red.name}</span><span>${G.scores.red}</span></div>`;

  const fb=$('gs-fearless-block');
  if(G.fearless && (G.usedInSeries.blue.size>0||G.usedInSeries.red.size>0)){
    fb.style.display='block';
    const pool=$('fearless-pool'); pool.innerHTML='';
    const allUsed=new Set([...G.usedInSeries.blue,...G.usedInSeries.red]);
    allUsed.forEach(id=>{
      const c=G.champs.find(x=>x.id===id); if(!c) return;
      const img=document.createElement('img');
      img.src=c.img; img.alt=c.name; img.title=c.name;
      pool.appendChild(img);
    });
  } else {
    fb.style.display='none';
  }

  showScreen('game-select');
}

$('btn-next-game').addEventListener('click',()=>{
  resetDraftUI();
  buildBanDisplayBar();
  G.started=true;
  save();
  showScreen('draft');
  $('game-badge').textContent=`Partida ${G.gameNum} de ${G.maxGames}`;
  typeText($('hdr-blue'), G.blue.name, 55);
  setTimeout(()=>typeText($('hdr-red'), G.red.name, 55), 300);
  advanceTurn(); startPoll();
});

// ── PARTICLES ──
function mkParticles(){
  const cont=$('particles'); if(!cont) return;
  for(let i=0;i<28;i++){
    const p=document.createElement('div'); p.className='p';
    p.style.left=Math.random()*100+'%';
    p.style.animationDuration=(7+Math.random()*10)+'s';
    p.style.animationDelay=(Math.random()*9)+'s';
    const sz=(1+Math.random()*2)+'px'; p.style.width=p.style.height=sz;
    cont.appendChild(p);
  }
}

// ── INIT ──
mkParticles();
applyLaneIcons();
if(!checkUrl()) showScreen('setup');
