// ===== 0. NAV + REVEAL =====
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
function setMobileMenu(open) {
  mobileMenu.classList.toggle('open', open);
  menuBtn.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
  document.body.classList.toggle('menu-open', open);
}
if (menuBtn && mobileMenu) {
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = mobileMenu.classList.contains('open');
    setMobileMenu(!isOpen);
  });
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMobileMenu(false)));
  document.addEventListener('click', (e) => {
    if (!menuBtn.contains(e.target) && !mobileMenu.contains(e.target) && mobileMenu.classList.contains('open')) {
      setMobileMenu(false);
    }
  });
  // landscape / rotate: drawer di atas fold tanpa tombol terlihat -> tutup otomatis
  addEventListener('resize', () => {
    if (mobileMenu.classList.contains('open') && innerWidth > innerHeight && innerWidth <= 960) setMobileMenu(false);
  });
}

const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target;
  [...el.querySelectorAll('.card,.panel,.pipe')].forEach((c, i) => c.style.transitionDelay = Math.min(i * 60, 240) + 'ms');
  el.classList.add('visible');
  io.unobserve(el);
}), { threshold: .1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// progress + scrollspy
const prog = document.getElementById('progress');
const navAs = [...document.querySelectorAll('.nav-links a')];
const mobAs = [...document.querySelectorAll('#mobileMenu a[href^="#"]')];
const secs = [...new Set([...navAs, ...mobAs].map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean))];
addEventListener('scroll', () => {
  const h = document.documentElement;
  const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
  if (prog) prog.style.width = (p * 100).toFixed(2) + '%';
  let cur = null;
  secs.forEach(s => { if (s.getBoundingClientRect().top < 150) cur = '#' + s.id; });
  navAs.forEach(a => a.classList.toggle('active', a.getAttribute('href') === cur));
  mobAs.forEach(a => a.classList.toggle('active', a.getAttribute('href') === cur));
}, { passive: true });

// ===== 0b. RUNTIME BUDGET: tab visibility + per-canvas gating =====
const runtime = { visible: !document.hidden };
document.addEventListener('visibilitychange', () => { runtime.visible = !document.hidden; });
const cvVis = new WeakMap();
const cvIO = new IntersectionObserver(es => es.forEach(e => {
  cvVis.set(e.target, e.isIntersecting);
  // canvas yang tadinya content-skipped perlu re-fit saat pertama kali terlihat
  if (e.isIntersecting && !e.target.__fitted) { e.target.__fitted = true; dispatchEvent(new Event('resize')); }
}), { rootMargin: '80px' });
const cvVisible = cv => !cv || cvVis.get(cv) !== false;
function watchCV(cv){ if (cv) cvIO.observe(cv); }

// crisp canvas helper (DPR aware)
function fitCanvas(cv, h) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = cv.offsetWidth || 600, hh = h || cv.getAttribute('height') || 200;
  cv.width = w * dpr; cv.height = hh * dpr;
  cv.style.height = hh + 'px';
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h: +hh };
}

// counters
const cio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; cio.unobserve(e.target);
  const el = e.target, target = +el.dataset.count, suf = el.dataset.suffix || '';
  const t0 = performance.now(), dur = 1600;
  (function tick(t){ const p = Math.min(1,(t-t0)/dur), ease = 1-Math.pow(1-p,3);
    el.textContent = Math.round(target*ease) + suf; if(p<1) requestAnimationFrame(tick); })(t0);
}), { threshold:.5 });
document.querySelectorAll('[data-count]').forEach(el=>cio.observe(el));

// ===== 1. BACKGROUND NEURAL FIELD (interaktif mouse + pulsa) =====
const bg = document.getElementById('neural-bg'), bctx = bg.getContext('2d');
const glow = document.getElementById('cursorGlow');
const toastEl = document.getElementById('toast');
let toastT=null;
function toast(msg){ toastEl.textContent=msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>toastEl.classList.remove('show'),2200); }
let W,H,pts=[],pulses=[],mouse={x:-999,y:-999};
function bgResize(){ W=bg.width=innerWidth; H=bg.height=innerHeight;
  // mobile budget: partikel lebih sedikit di layar kecil / banyak core tidak tersedia
  const isSmall = Math.min(innerWidth, innerHeight) < 640;
  pts = Array.from({length: Math.min(isSmall ? 55 : 120, W/12)}, ()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.45,vy:(Math.random()-.5)*.45,r:1+Math.random()*1.8,glow:Math.random()})); }
bgResize(); addEventListener('resize', bgResize);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
addEventListener('mousemove',e=>{ mouse.x=e.clientX; mouse.y=e.clientY; if(glow&&glow.style.display!=='none'){glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px';} });
setInterval(()=>{ // spontaneous traveling pulse
  if (!runtime.visible) return;
  if(pts.length<2) return;
  const a=pts[Math.floor(Math.random()*pts.length)];
  let best=null,bd=1e9;
  pts.forEach(b=>{ if(b===a)return; const d=Math.hypot(a.x-b.x,a.y-b.y); if(d<220&&d<bd){bd=d;best=b;} });
  if(best) pulses.push({a,b:best,t:0});
},500);
(function loop(){
  if (runtime.visible && !reducedMotion) {
    bctx.clearRect(0,0,W,H);
  pts.forEach(p=>{
    const dx=p.x-mouse.x, dy=p.y-mouse.y, d=Math.hypot(dx,dy);
    if(d<160&&d>1){ p.x+=dx/d*1.2; p.y+=dy/d*1.2; } // repel
    p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>W)p.vx*=-1; if(p.y<0||p.y>H)p.vy*=-1;
    const g = .5 + .5*Math.sin(Date.now()/900 + p.glow*6);
    bctx.globalAlpha=.35+.5*g;
    bctx.fillStyle = g>.85 ? '#b6ff3b' : '#00e5ff';
    bctx.shadowBlur = g>.85?12:6; bctx.shadowColor='#00e5ff';
    bctx.beginPath(); bctx.arc(p.x,p.y,p.r,0,7); bctx.fill(); bctx.shadowBlur=0;
  });
  bctx.globalAlpha=.13; bctx.strokeStyle='#00e5ff'; bctx.lineWidth=1;
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
    const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.hypot(dx,dy);
    if(d<150){bctx.globalAlpha=(1-d/150)*.22; bctx.beginPath();bctx.moveTo(pts[i].x,pts[i].y);bctx.lineTo(pts[j].x,pts[j].y);bctx.stroke();}}
  bctx.globalAlpha=1;
  pulses = pulses.filter(pl=>pl.t<=1);
  pulses.forEach(pl=>{
    pl.t+=.04;
    const x=pl.a.x+(pl.b.x-pl.a.x)*pl.t, y=pl.a.y+(pl.b.y-pl.a.y)*pl.t;
    bctx.fillStyle='#b6ff3b'; bctx.shadowBlur=14; bctx.shadowColor='#b6ff3b';
    bctx.beginPath(); bctx.arc(x,y,2.6,0,7); bctx.fill(); bctx.shadowBlur=0;
  });
  }
  requestAnimationFrame(loop);
})();


// ===== 2. HERO SPIKE TRAIN =====
const hero = document.getElementById('spikeHero'), hctx = hero.getContext('2d');
// resolusi internal tinggi mengikuti tinggi tampilan CSS (120px di mobile, 160 default) supaya tidak squish
function fitHero(){ if(hero){ hero.width = hero.offsetWidth || 340; hero.height = hero.clientHeight || 160; } }
fitHero();
addEventListener('resize', fitHero);
let hx = 0;
setInterval(()=>{
  if (!runtime.visible || !cvVisible(hero)) return;
  if(!hero) return;
  const w=hero.width,h=hero.height||120;
  hctx.fillStyle='#020208'; hctx.fillRect(hx,0,2,h);
  const spike = Math.random()<.28;
  hctx.strokeStyle = spike ? '#b6ff3b' : '#00e5ff55';
  hctx.beginPath(); hctx.moveTo(hx,h/2);
  if(spike){ hctx.lineTo(hx+1,10); hctx.lineTo(hx+2,h-10); hctx.lineTo(hx+3,h/2); }
  else hctx.lineTo(hx+2,h/2+(Math.random()-.5)*14);
  hctx.stroke();
  hx=(hx+3)%w;
},30);

// ===== 8. REGISTER CANVAS VISIBILITY WATCHER =====
['spikeHero','neuronCanvas','axonStrip','netPlay','apCanvas','axonCanvas','attCanvas'].forEach(id => {
  watchCV(document.getElementById(id));
});

// token stream text
const phrases=['otak → [0.92] neuron → [0.87] sinapsis → [0.81] memori ...','decoder → [0.95] kursor → [0.88] klik → [0.76] ketik ...','attention → [0.93] konteks → [0.85] token → [0.79] makna ...'];
let pi=0; setInterval(()=>{ document.getElementById('tokenStream').textContent='LLM thinking: '+phrases[pi++%phrases.length]; },3000);

// ===== 3. BRAIN REGION EXPLORER =====
const REGIONS = {
  frontal:{t:'Frontal Lobe — Eksekutif',d:'Perencanaan, keputusan, kepribadian. Paling manusiawi. LLM meniru ini via reasoning chain, tapi tanpa kesadaran & tubuh.',m:'gamma 40Hz • Neuralink: decoding niat • AI analog: planning agent'},
  broca:{t:'Area Broca — Produksi Bahasa',d:'Menyusun kata jadi ucapan. Rusak → afasia non-fluen. Neuralink 2025 mendecode attempted speech dari sini.',m:'beta 20Hz • BCI speech prosthesis • LLM analog: decoder head'},
  motor:{t:'Korteks Motorik — Gerak',d:'Peta tubuh (homunculus). Implan N1 pertama ditanam di sini — pasien menggerakkan kursor hanya dengan niat.',m:'mu 10Hz • 1024 kanal N1 • decoder RNN'},
  sensory:{t:'Korteks Somatosensorik',d:'Sentuhan & proprioception. Closed-loop masa depan: stimulasi balik agar tangan robot bisa “merasa”.',m:'alpha 10Hz • stimulasi mikron • feedback loop'},
  wernicke:{t:'Area Wernicke — Pemahaman',d:'Memahami makna bahasa. LLM melakukan hal mirip secara statistik via embedding, tanpa pengalaman tubuh.',m:'theta 6Hz • komprehensi • embedding semantik'},
  visual:{t:'Korteks Visual — Melihat',d:'30% korteks untuk visi. Proyek Blindsight Neuralink menargetkan sini untuk mengembalikan penglihatan.',m:'gamma 60Hz • Blindsight • vision transformer'},
  hippocampus:{t:'Hippocampus — Memori',d:'Konsolidasi memori jangka pendek → panjang. Otak: rekonstruktif & lupa. LLM: context window tetap.',m:'sharp-wave ripple • LTP • RAG sebagai analog'}
};
const rT=document.getElementById('regionTitle'), rD=document.getElementById('regionDesc'), rM=document.getElementById('regionMeta');
document.querySelectorAll('#brainNodes circle').forEach(c=>{
  const selectNode = (e)=>{
    if(e && e.type === 'touchstart') e.preventDefault();
    document.querySelectorAll('#brainNodes circle').forEach(x=>x.classList.remove('active'));
    c.classList.add('active');
    const r=REGIONS[c.dataset.region];
    if(r){ rT.textContent=r.t; rD.textContent=r.d; rM.textContent=r.m; }
  };
  c.addEventListener('click', selectNode);
  c.addEventListener('touchstart', selectNode, {passive:false});
});

// ===== 4. LLM PLAYGROUND (simulasi) =====
const NEXT = {
  otak:['manusia|0.34','bekerja|0.22','adalah|0.16','memiliki|0.12','dapat|0.08','berpikir|0.08'],
  neuralink:['memungkinkan|0.30','menanamkan|0.20','membaca|0.18','mengendalikan|0.14','memulihkan|0.10','menghubungkan|0.08'],
  ai:['berikutnya|0.32','dengan|0.22','secara|0.16','menggunakan|0.12','berdasarkan|0.10','tanpa|0.08']
};
const FOLLOW = ['dengan|0.25','yang|0.20','untuk|0.15','secara|0.12','melalui|0.10','dan|0.08','pada|0.06','secara langsung|0.04'];
const out=document.getElementById('tokenOut'), bars=document.getElementById('probBars');
const temp=document.getElementById('tempSlider'), tempVal=document.getElementById('tempVal');
temp.oninput=()=>tempVal.textContent=(+temp.value).toFixed(1);
function sample(list, T){
  const scored = list.map(s=>{const[w,p]=s.split('|'); return {w,p:+p, s: Math.pow(+p, 1/T) * (0.7+Math.random()*0.6)};});
  const sum=scored.reduce((a,b)=>a+b.s,0); scored.forEach(o=>o.prob=o.s/sum);
  scored.sort((a,b)=>b.prob-a.prob);
  let r=Math.random(), acc=0, pick=scored[0];
  for(const o of scored){acc+=o.prob; if(r<=acc){pick=o;break;}}
  return {pick, scored};
}
let tokens=[];
function render(probs){
  bars.innerHTML = probs.slice(0,5).map(o=>`<div class="prob-row"><span>${o.w}</span><div class="prob-track"><i style="width:${Math.round(o.prob*100)}%"></i></div><b>${(o.prob*100).toFixed(1)}%</b></div>`).join('');
}
document.getElementById('genBtn').onclick=()=>{
  const key=document.getElementById('promptSel').value, T=+temp.value;
  if(!tokens.length){ tokens = document.getElementById('promptSel').selectedOptions[0].text.split(' ');
    out.innerHTML=tokens.map(t=>`<span class="tk">${t}</span>`).join(' '); }
  const pool = tokens.length<9 ? (NEXT[key]||FOLLOW) : FOLLOW;
  const {pick, scored}=sample(pool,T);
  tokens.push(pick.w);
  out.innerHTML+=` <span class="tk ${tokens.length%2?'':'alt'}">${pick.w}</span>`;
  render(scored);
  if(tokens.length>40) tokens=tokens.slice(-30);
};
document.getElementById('clearBtn').onclick=()=>{tokens=[];out.innerHTML='';bars.innerHTML='';};

// ===== 5. NEURON SIMULATOR =====
const nc=document.getElementById('neuronCanvas'), nctx=nc.getContext('2d');
const cur=document.getElementById('curSlider'), thr=document.getElementById('thrSlider'), leak=document.getElementById('leakSlider');
const curVal=document.getElementById('curVal'), thrVal=document.getElementById('thrVal'), leakVal=document.getElementById('leakVal'), spikeStat=document.getElementById('spikeStat');
const ax=document.getElementById('axonStrip'), axctx=ax.getContext('2d');
function resizeNeuronCanvases(){
  if(nc){ nc.width = nc.offsetWidth || 340; }
  if(ax){ ax.width = ax.offsetWidth || 340; }
}
resizeNeuronCanvases();
addEventListener('resize', resizeNeuronCanvases);

cur.oninput=()=>curVal.textContent=(+cur.value).toFixed(1);
thr.oninput=()=>thrVal.textContent=thr.value;
leak.oninput=()=>leakVal.textContent=(+leak.value).toFixed(2);
let V=-70, trace=[], spikes=0;
let axPulses=[], flash=0;
const somaState=document.getElementById('somaState');
setInterval(()=>{
  if (!runtime.visible || !cvVisible(nc)) return;
  const I=+cur.value, T=+thr.value, L=+leak.value;
  V += I*0.35 - L*(V+70)*0.3 + (Math.random()-.5)*1.2;
  if(V>=T){V=-75;spikes++;spikeStat.textContent=spikes+' spikes';axPulses.push({x:0});flash=1;
    somaState.textContent='spike';somaState.classList.add('firing');}
  else if(flash<=0){ somaState.textContent='istirahat'; somaState.classList.remove('firing'); }
  flash=Math.max(0,flash-.08);
  if(V<-80)V=-80;
  trace.push(V); if(trace.length>160)trace.shift();
  const w=nc.width,h=nc.height||180;
  const grad=nctx.createLinearGradient(0,0,0,h); grad.addColorStop(0,'#0a0a18'); grad.addColorStop(1,'#020208');
  nctx.fillStyle=grad;nctx.fillRect(0,0,w,h);
  nctx.strokeStyle='#ffffff10';nctx.lineWidth=1;
  for(let g=0;g<4;g++){const gy=h/4*g;nctx.beginPath();nctx.moveTo(0,gy);nctx.lineTo(w,gy);nctx.stroke();}
  nctx.strokeStyle='#ff3b5c88';nctx.setLineDash([6,5]);
  const ty=h-((T+80)/45)*h; nctx.beginPath();nctx.moveTo(0,ty);nctx.lineTo(w,ty);nctx.stroke();nctx.setLineDash([]);
  nctx.fillStyle='#ff3b5c';nctx.font='10px JetBrains Mono';nctx.fillText('threshold '+T+' mV',8,ty-5);
  // glow trace
  nctx.shadowBlur=12+flash*24; nctx.shadowColor=flash>.4?'#b6ff3b':'#00e5ff';
  nctx.strokeStyle=flash>.4?'#b6ff3b':'#00e5ff';nctx.lineWidth=2.4;nctx.beginPath();
  trace.forEach((v,i)=>{const x=i/160*w, y=h-((v+80)/45)*h; i?nctx.lineTo(x,y):nctx.moveTo(x,y);});
  nctx.stroke();nctx.shadowBlur=0;nctx.lineWidth=1;
  // spike dots
  trace.forEach((v,i)=>{ if(v<-58)return; const x=i/160*w,y=h-((v+80)/45)*h;
    nctx.fillStyle='#b6ff3b';nctx.beginPath();nctx.arc(x,y,2.5,0,7);nctx.fill(); });
  // axon strip
  const aw=ax.width, ah=ax.height||58;
  axctx.fillStyle='#020208';axctx.fillRect(0,0,aw,ah);
  axctx.fillStyle='#151527'; axctx.fillRect(10,ah/2-7,aw-20,14); // axon body
  axctx.fillStyle='#00e5ff'; axctx.beginPath(); axctx.arc(18,ah/2,11+flash*6,0,7); axctx.fill(); // soma
  axctx.fillStyle='#001318'; axctx.font='bold 9px Inter'; axctx.fillText('SOMA',10,ah/2+3);
  axPulses.forEach(p=>p.x+=aw/60);
  axPulses=axPulses.filter(p=>p.x<aw);
  axPulses.forEach(p=>{ axctx.shadowBlur=16; axctx.shadowColor='#b6ff3b'; axctx.fillStyle='#b6ff3b';
    axctx.beginPath(); axctx.arc(30+p.x,ah/2,6,0,7); axctx.fill(); axctx.shadowBlur=0; });
  axctx.fillStyle='#9aa0ae'; axctx.font='9px JetBrains Mono';
  const labelX = Math.max(70, aw - (aw < 400 ? 140 : 190));
  const labelTxt = aw < 400 ? 'terminal → transmisi' : 'terminal → neurotransmitter dilepas';
  axctx.fillText(labelTxt, labelX, ah/2-12);
},50);

// ===== 6. ELECTRODE GRID =====
const grid=document.getElementById('electrodeGrid'), einfo=document.getElementById('electrodeInfo');
const cells=[];
function selectChannel(idx, el){
  cells.forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
  einfo.textContent=`kanal #${idx+1} • ${(2+Math.random()*6).toFixed(2)} kHz • SNR ${(6+Math.random()*8).toFixed(1)} dB • unit: ${Math.random()<.3?'multi':'single'}`;
}
for(let i=0;i<256;i++){
  const d=document.createElement('div');
  grid.appendChild(d);
  cells.push(d);
  d.addEventListener('mouseenter', ()=>selectChannel(i, d));
  d.addEventListener('pointerdown', ()=>selectChannel(i, d));
}
setInterval(()=>{ if (!runtime.visible || !cvVisible(grid)) return; cells.forEach(c=>c.classList.toggle('firing', Math.random()<.12));},400);

// ===== 7. TOGGLES + CHARTS =====
document.querySelectorAll('.toggle').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.toggle').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  ['table','chart','energy'].forEach(v=>document.getElementById('view-'+v).classList.toggle('hidden', v!==b.dataset.view));
  if(b.dataset.view!=='table') initCharts();
});
let chartsDone=false;
function initCharts(){
  if(chartsDone||typeof Chart==='undefined')return;chartsDone=true;
  Chart.defaults.color='#9aa0ae';Chart.defaults.borderColor='#ffffff14';Chart.defaults.font.family='JetBrains Mono';
  new Chart(document.getElementById('chartScale'),{type:'bar',
    data:{labels:['C. elegans (302)','Lebah (1M)','Otak (86M)','GPT-2 (1.5B)','GPT-4 (~1.8T)','Sinapsis (100T)'],
    datasets:[{data:[302,1e6,86e9,1.5e9,1.8e12,100e12],backgroundColor:['#333','#555','#00e5ff','#7c3aed','#b6ff3b','#ff3bd4']}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{type:'logarithmic'}}}});
  new Chart(document.getElementById('chartLearn'),{type:'line',
    data:{labels:['1 contoh','100','10rb','1jt','100jt','1M'],
    datasets:[{label:'Otak (one-shot)',data:[90,92,93,94,94,95],borderColor:'#b6ff3b',tension:.4},{label:'LLM (data skala)',data:[12,28,55,74,86,93],borderColor:'#00e5ff',tension:.4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{boxWidth:10,font:{size:11}}}}}});
  new Chart(document.getElementById('chartEnergy'),{type:'bar',
    data:{labels:['Otak (wajah)','LLM (1 query)','LLM Train','N1 implant'],
    datasets:[{data:[20,350,1e7,8],backgroundColor:['#b6ff3b','#00e5ff','#7c3aed','#ff3b5c']}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{type:'logarithmic'}}}});
}

// ===== 7b. JARINGAN SARAF HIDUP (spiking network playground) =====
(function(){
const cv=document.getElementById('netPlay'); if(!cv) return;
const ctx=cv.getContext('2d');
let neurons=[], edges=[], spikesP=[], totalSpikes=0, recentSpikes=[];
let thrN=0.8, speedM=1, plast=true;
const thrS=document.getElementById('netThr'), spdS=document.getElementById('netSpd'), conS=document.getElementById('netCon');

function fitNet(){
  const oldW = cv.width || 800;
  cv.width = cv.offsetWidth || 340;
  cv.height = window.innerWidth < 640 ? 290 : 420;
  const ratio = cv.width / (oldW || 1);
  if(neurons.length && ratio !== 1){
    neurons.forEach(n => {
      n.x = Math.max(25, Math.min(cv.width - 25, n.x * ratio));
      n.y = Math.max(25, Math.min(cv.height - 25, n.y));
    });
  }
}
fitNet();
addEventListener('resize', fitNet);

thrS.oninput=()=>document.getElementById('netThrVal').textContent=(+thrS.value).toFixed(2);
spdS.oninput=()=>document.getElementById('netSpdVal').textContent=(+spdS.value).toFixed(1)+'x';
conS.oninput=()=>{ const m=['rendah','sedang','padat']; document.getElementById('netConVal').textContent=m[+conS.value-1]; reconnect(); };
document.getElementById('netPlast').onchange=e=>plast=e.target.checked;
function addN(x,y){ neurons.push({x,y,v:Math.random()*.3,ref:0,fire:0,id:neurons.length}); }
function seed(n){ const w=cv.width,h=cv.height||320;
  for(let i=0;i<n;i++) addN(40+Math.random()*(w-80),40+Math.random()*(h-80)); reconnect(); }
function reconnect(){
  edges=[]; const k=+conS.value+1;
  neurons.forEach((a,i)=>{ const ds=neurons.map((b,j)=>({j,d:Math.hypot(a.x-b.x,a.y-b.y)})).filter(o=>o.d>10).sort((p,q)=>p.d-q.d).slice(0,k);
    ds.forEach(o=>{ if(!edges.some(e=>(e.a===i&&e.b===o.j)||(e.a===o.j&&e.b===i))) edges.push({a:i,b:o.j,w:.3+Math.random()*.5}); }); });
}
function stimulate(i,strong=1){ const n=neurons[i]; if(!n||n.ref>0)return; n.v+=1.2*strong; }
let drag=null;
function pos(e){
  const r=cv.getBoundingClientRect();
  const cx = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  const cy = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
  return {x:(cx-r.left)*(cv.width/(r.width||1)), y:(cy-r.top)*(cv.height/(r.height||1))};
}
cv.addEventListener('pointerdown',e=>{
  const p=pos(e);
  let hit=null,hd=1e9;
  neurons.forEach((n,i)=>{const d=Math.hypot(n.x-p.x,n.y-p.y); if(d<30&&d<hd){hd=d;hit=i;}});
  if(hit!==null){
    stimulate(hit,1.2); drag=hit; toast('Neuron #'+(hit+1)+' distimulasi');
    try { cv.setPointerCapture(e.pointerId); } catch(err){}
  } else {
    addN(p.x,p.y); reconnect(); toast('Neuron baru ditambahkan');
  }
});
cv.addEventListener('pointermove',e=>{
  if(drag!==null && neurons[drag]){
    const p=pos(e);
    neurons[drag].x = Math.max(15, Math.min(cv.width - 15, p.x));
    neurons[drag].y = Math.max(15, Math.min(cv.height - 15, p.y));
  }
});
cv.addEventListener('pointerup',e=>{
  if(drag!==null){
    try { cv.releasePointerCapture(e.pointerId); } catch(err){}
    drag=null;
  }
});
cv.addEventListener('pointercancel',()=>drag=null);
document.getElementById('netStim').onclick=()=>stimulate(Math.floor(Math.random()*neurons.length),1.4);
document.getElementById('netBurst').onclick=()=>{ neurons.forEach((_,i)=>setTimeout(()=>stimulate(i,1.3),i*60)); toast('Gelombang burst dilepaskan'); };
document.getElementById('netAdd').onclick=()=>{ const w=cv.width,h=cv.height||420; for(let i=0;i<5;i++)addN(60+Math.random()*(w-120),60+Math.random()*(h-120)); reconnect(); };
document.getElementById('netClear').onclick=()=>{ neurons=[];edges=[];spikesP=[];totalSpikes=0;seed(10); };
seed(10);
setInterval(()=>{ if (!runtime.visible) return; recentSpikes=recentSpikes.filter(t=>Date.now()-t<1000);
  document.getElementById('netSpikes').textContent=totalSpikes;
  document.getElementById('netRate').textContent=recentSpikes.length;
  document.getElementById('netN').textContent=neurons.length;
  document.getElementById('netW').textContent=(edges.reduce((a,e)=>a+e.w,0)/(edges.length||1)).toFixed(2);
},300);
(function tick(){
  if (runtime.visible && cvVisible(cv)) {
  thrN=+thrS.value; speedM=+spdS.value;
  const h=cv.height||420;
  ctx.fillStyle='#020208';ctx.fillRect(0,0,cv.width,h);
  // edges
  edges.forEach(e=>{ const a=neurons[e.a],b=neurons[e.b]; if(!a||!b)return;
    ctx.strokeStyle=`rgba(0,229,255,${.08+e.w*.35})`; ctx.lineWidth=1+e.w*3;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    if(e.w>.75){ ctx.fillStyle='#b6ff3b'; const mx=(a.x+b.x)/2,my=(a.y+b.y)/2; ctx.beginPath();ctx.arc(mx,my,2,0,7);ctx.fill(); }
  });
  // traveling spikes
  spikesP.forEach(s=>s.t+=.06*speedM);
  spikesP=spikesP.filter(s=>s.t<1);
  spikesP.forEach(s=>{ const a=neurons[s.e.a],b=neurons[s.e.b]; if(!a||!b)return;
    const x=a.x+(b.x-a.x)*s.t, y=a.y+(b.y-a.y)*s.t;
    ctx.shadowBlur=14;ctx.shadowColor='#b6ff3b';ctx.fillStyle='#eaffb0';
    ctx.beginPath();ctx.arc(x,y,3.4,0,7);ctx.fill();ctx.shadowBlur=0;
    if(s.t>=.98){ b.v+=s.e.w*.9;
      if(plast){ s.e.w=Math.min(1,s.e.w+.03); } // LTP
    }
  });
  // neurons
  neurons.forEach((n,i)=>{
    n.ref=Math.max(0,n.ref-1); n.fire=Math.max(0,n.fire-.06);
    n.v*=0.94; n.v-=0.008;
    if(n.v>=thrN&&n.ref<=0){ n.v=-.2; n.ref=8; n.fire=1; totalSpikes++; recentSpikes.push(Date.now());
      edges.filter(e=>e.a===i||e.b===i).forEach(e=>{ const other=e.a===i?e.b:e.a;
        if(Math.random()<.9) spikesP.push({e:{a:i,b:other,w:e.w},t:0}); });
    }
    const potent=Math.max(0,Math.min(1,(n.v+.3)/1.3));
    // dendrite halo
    ctx.strokeStyle=`rgba(124,58,237,${.15+potent*.4})`;ctx.lineWidth=1;
    for(let k=0;k<5;k++){ const an=k/5*Math.PI*2+1; ctx.beginPath();ctx.moveTo(n.x,n.y);
      ctx.lineTo(n.x+Math.cos(an)*(14+potent*8),n.y+Math.sin(an)*(14+potent*8));ctx.stroke(); }
    // soma
    const R=11+n.fire*7+potent*4;
    const g=ctx.createRadialGradient(n.x,n.y,2,n.x,n.y,R);
    if(n.fire>.3){ g.addColorStop(0,'#ffffff');g.addColorStop(.4,'#b6ff3b');g.addColorStop(1,'#7c3aed'); }
    else { g.addColorStop(0,`rgba(0,229,255,${.4+potent*.6})`);g.addColorStop(1,'#1a1a3a'); }
    ctx.shadowBlur=18*potent+22*n.fire;ctx.shadowColor=n.fire>.3?'#b6ff3b':'#00e5ff';
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(n.x,n.y,R,0,7);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#04040a';ctx.font='bold 9px Inter';ctx.textAlign='center';ctx.fillText(i+1,n.x,n.y+3);
    // potential ring
    ctx.strokeStyle=n.fire>.3?'#b6ff3b':'#ffffff33';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(n.x,n.y,R+5,-Math.PI/2,-Math.PI/2+potent*Math.PI*2);ctx.stroke();
  });
  }
  requestAnimationFrame(tick);
})();
})();

// ===== 7c. ACTION POTENTIAL EXPLORER =====
(function(){
const cv=document.getElementById('apCanvas'); if(!cv)return;
const ctx=cv.getContext('2d'); const ax=document.getElementById('axonCanvas'), axc=ax.getContext('2d');
function fit(){
  cv.width=cv.offsetWidth||340;
  cv.height=window.innerWidth < 640 ? 200 : 260;
  ax.width=ax.offsetWidth||340;
}
fit();
addEventListener('resize',fit);
const PHASES=[
 {t:'Resting Potential',d:'Pompa Na+/K+ menjaga -70 mV. Kanal Na+ tertutup, K+ sedikit bocor. Neuron menunggu input dendrit.',na:'tertutup',k:'bocor parsial',v:'-70 mV',vp:-70},
 {t:'Stimulus — Ambang -55 mV',d:'Input terakumulasi (summation). Jika mencapai -55 mV, kanal Na+ voltage-gated mulai terbuka.',na:'mulai terbuka',k:'tertutup',v:'-55 mV',vp:-55},
 {t:'Depolarisasi — Influx Na+',d:'Na+ masuk ke sel sehingga voltase naik ke +40 mV dalam 0,5 ms. Sinyal merambat di akson 1–120 m/s.',na:'terbuka',k:'tertutup',v:'+40 mV',vp:40},
 {t:'Repolarisasi — Eflux K+',d:'Kanal Na+ mengalami inaktivasi, kanal K+ terbuka. K+ keluar sehingga voltase turun cepat. Berlaku periode refrakter.',na:'inaktif',k:'terbuka',v:'-80 mV',vp:-80},
 {t:'Hiperpolarisasi — Pemulihan',d:'Kanal K+ menutup perlahan, pompa mengembalikan potensial ke -70 mV. Neuron siap untuk siklus berikutnya.',na:'tertutup',k:'menutup',v:'-70 mV',vp:-70},
];
const curve=[-70,-70,-70,-55,40,-80,-75,-70,-70,-70,-70];
let phase=0, dot=0, playing=false, axP=0;
const btns=[...document.querySelectorAll('.ap-btn')];
function setPhase(i){ phase=i; btns.forEach((b,j)=>b.classList.toggle('active',j===i));
  document.getElementById('apTitle').textContent=PHASES[i].t;
  document.getElementById('apDesc').textContent=PHASES[i].d;
  const na=document.getElementById('ionNa'),k=document.getElementById('ionK'),v=document.getElementById('ionV');
  na.innerHTML='Na⁺<b>'+PHASES[i].na+'</b>'; k.innerHTML='K⁺<b>'+PHASES[i].k+'</b>'; v.innerHTML='V<sub>m</sub><b>'+PHASES[i].v+'</b>';
  na.classList.toggle('open',PHASES[i].na.includes('terbuka') || PHASES[i].na.includes('BUKA'));
  k.classList.toggle('open',PHASES[i].k.includes('terbuka') || PHASES[i].k.includes('BUKA'));
  dot=i*2;
}
btns.forEach(b=>b.onclick=()=>{playing=false;setPhase(+b.dataset.ap);});
document.getElementById('apPlay').onclick=()=>{playing=true;phase=0;dot=0;};
setPhase(0);
setInterval(()=>{ if(playing){dot+=.35; if(dot>=curve.length-1){dot=0;phase=(phase+1)%5;setPhase(phase); if(phase===0)playing=false;}} },120);
(function draw(){
  if (runtime.visible && cvVisible(cv)) {
  const w=cv.width,h=cv.height||200;
  ctx.fillStyle='#020208';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#ffffff10';for(let g=0;g<5;g++){ctx.beginPath();ctx.moveTo(0,h/5*g);ctx.lineTo(w,h/5*g);ctx.stroke();}
  const Y=v=>h-((v+90)/150)*h;
  [-70,-55,0,40].forEach(v=>{ctx.fillStyle='#ffffff44';ctx.font='9px JetBrains Mono';ctx.fillText(v+'mV',6,Y(v)-4);
    ctx.strokeStyle='#ffffff14';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(0,Y(v));ctx.lineTo(w,Y(v));ctx.stroke();ctx.setLineDash([]);});
  // curve glow
  ctx.shadowBlur=14;ctx.shadowColor='#00e5ff';ctx.strokeStyle='#00e5ff';ctx.lineWidth=2.6;ctx.beginPath();
  curve.forEach((v,i)=>{const x=i/(curve.length-1)*w; i?ctx.lineTo(x,Y(v)):ctx.moveTo(x,Y(v));});ctx.stroke();ctx.shadowBlur=0;
  // moving dot
  const i0=Math.floor(dot), f=dot-i0, vv=curve[i0]*(1-f)+curve[Math.min(curve.length-1,i0+1)]*f;
  const dx=dot/(curve.length-1)*w, dy=Y(vv);
  ctx.fillStyle='#b6ff3b';ctx.shadowBlur=20;ctx.shadowColor='#b6ff3b';
  ctx.beginPath();ctx.arc(dx,dy,6,0,7);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle='#000';ctx.font='bold 8px Inter';ctx.textAlign='center';ctx.fillText('spike',dx,dy+3);
  // phase zones
  ctx.fillStyle='#00e5ff';ctx.font='8.5px JetBrains Mono';ctx.textAlign='left';
  ctx.fillText('◀ rest   thr   PEAK   refractory   pulih ▶',8,h-8);
  // axon mini
  const aw=ax.width,ah=ax.height||58;
  axc.fillStyle='#020208';axc.fillRect(0,0,aw,ah);
  axc.fillStyle='#1a1a2e';axc.fillRect(8,ah/2-6,aw-16,12);
  axP=(axP+.02)%1; const px=8+(aw-16)*((dot/(curve.length-1)));
  const hot=vv>-20;
  axc.shadowBlur=hot?18:0;axc.shadowColor='#b6ff3b';axc.fillStyle=hot?'#b6ff3b':'#00e5ff88';
  axc.beginPath();axc.arc(px,ah/2,hot?7:4,0,7);axc.fill();axc.shadowBlur=0;
  }
  requestAnimationFrame(draw);
})();
})();

// ===== 7d. ATTENTION VISUALIZER =====
(function(){
const words=['Neuralink','membaca','niat','gerak','dari','otak'];
const mat=[[.95,.05,.08,.10,.04,.20],[.10,.90,.45,.30,.05,.25],[.15,.40,.92,.60,.08,.35],[.12,.28,.55,.93,.10,.40],[.06,.05,.10,.12,.88,.15],[.30,.15,.30,.35,.12,.94]];
const wrap=document.getElementById('attWords'); if(!wrap)return;
const cv=document.getElementById('attCanvas'),ctx=cv.getContext('2d');
function fit(){
  cv.width=cv.offsetWidth||340;
  cv.height=window.innerWidth < 640 ? 180 : 220;
}
fit();
addEventListener('resize',()=> { fit(); draw(sel); });
let sel=0;
words.forEach((w,i)=>{const b=document.createElement('button');b.textContent=w;if(i===0)b.classList.add('active');
  b.onclick=()=>{sel=i;[...wrap.children].forEach((x,j)=>x.classList.toggle('active',j===i));draw(i);info(i);};wrap.appendChild(b);});
function draw(i){
  const w=cv.width,h=cv.height||180;
  ctx.fillStyle='#020208';ctx.fillRect(0,0,w,h);
  const n=words.length,bh=Math.min(24,(h-24)/n);
  const isMob = w < 380;
  const bx = isMob ? 72 : 95;
  const bw = Math.max(50, w - bx - (isMob ? 36 : 46));
  words.forEach((wl,j)=>{
    const v=mat[i][j]; const y=8+j*(bh+5);
    ctx.fillStyle='#9aa0ae';ctx.font=(isMob ? '10px' : '11px') + ' JetBrains Mono';ctx.textAlign='left';
    ctx.fillText(wl.slice(0,8),6,y+bh*0.7);
    ctx.fillStyle='#ffffff10';ctx.fillRect(bx,y,bw,bh);
    const g=ctx.createLinearGradient(bx,0,bx+bw,0);g.addColorStop(0,'#7c3aed');g.addColorStop(1,'#00e5ff');
    ctx.fillStyle=g;ctx.globalAlpha=.25+v*.75;ctx.fillRect(bx,y,bw*v,bh);ctx.globalAlpha=1;
    ctx.fillStyle=v>.5?'#fff':'#9aa0ae';ctx.font='bold ' + (isMob ? '9px' : '10px') + ' JetBrains Mono';
    ctx.fillText((v*100).toFixed(0)+'%',bx+bw+4,y+bh*0.7);
  });
}
function info(i){
  document.getElementById('attTitle').textContent='“'+words[i]+'” fokus ke: '+words[mat[i].indexOf(Math.max(...mat[i]))];
  const top=[...mat[i]].map((v,j)=>({v,w:words[j]})).sort((a,b)=>b.v-a.v).slice(0,3).map(o=>o.w+' '+(o.v*100).toFixed(0)+'%').join(' • ');
  document.getElementById('attDesc').textContent='Skor attention tertinggi untuk kata ini.';
  document.getElementById('attMeta').textContent=top;
}
draw(0);info(0);
})();


