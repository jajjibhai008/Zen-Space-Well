function $(sel, ctx=document){ return ctx.querySelector(sel); }
function $all(sel, ctx=document){ return Array.from(ctx.querySelectorAll(sel)); }
// Smooth scroll
$all('a[href^="#"]').forEach(a=>{ a.addEventListener('click',e=>{ const id=a.getAttribute('href'); if(id.length>1){ e.preventDefault(); const t=$(id); if(t) t.scrollIntoView({behavior:'smooth'}); }}); });
// Navbar scroll style
window.addEventListener('scroll', ()=>{ const nav=$('.navbar'); nav.style.background = window.scrollY>100 ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.12)'; });
// Orbs parallax
window.addEventListener('scroll', ()=>{ const sc=window.pageYOffset; $all('.orb').forEach((o,i)=>{ const speed=(i+1)*0.25; o.style.transform = `translateY(${sc*speed}px)`; }); });
// Mouse subtle movement
document.addEventListener('mousemove', e=>{ const x=(e.clientX/window.innerWidth)-0.5; const y=(e.clientY/window.innerHeight)-0.5; $all('.orb').forEach((o,i)=>{ const inten=(i+1)*10; o.style.transform += ` translate(${x*inten}px, ${y*inten}px)`; }); });
// Intersection observer animations
const observer=new IntersectionObserver(entries=>{ entries.forEach(en=>{ if(en.isIntersecting){ en.target.style.opacity='1'; en.target.style.transform='translateY(0)'; }}); }, {threshold:0.1, rootMargin:'0px 0px -60px 0px'});
$all('.app-card, .science-item').forEach(el=>{ el.style.opacity='0'; el.style.transform='translateY(50px)'; el.style.transition='all .65s ease'; observer.observe(el); });
// Modal handling
function openModal(id){ const m=$(id); if(m){ m.classList.add('active'); m.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }}
function closeModal(m){ m.classList.remove('active'); m.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
$all('[data-close-modal]').forEach(btn=> btn.addEventListener('click', ()=> closeModal(btn.closest('.modal-overlay'))));
$all('.modal-overlay').forEach(ov=> ov.addEventListener('click', e=>{ if(e.target===ov) closeModal(ov); }));
document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ $all('.modal-overlay.active').forEach(m=>closeModal(m)); }});
$('#openResearch')?.addEventListener('click', ()=> openModal('#researchModal'));
$('#viewResearchBtn')?.addEventListener('click', e=>{ e.preventDefault(); openModal('#researchModal'); });
// Adjusted to new button IDs instead of removed #cardBreathing / #cardMandala
$('#openBreathingBtn')?.addEventListener('click', ()=> openModal('#breathingModal'));
$('#launchBreathing')?.addEventListener('click', e=>{ e.preventDefault(); openModal('#breathingModal'); });
$('#openMandalaBtn')?.addEventListener('click', ()=> openModal('#mandalaModal'));
// Breathing Game Logic
const breathingPatterns={ '4-7-8':[4,7,8,0], '5-5':[5,0,5,0], '4-4-6-2':[4,0,6,2] }; // inhale, hold1, exhale, hold2
let currentPattern='4-7-8'; let phaseIndex=0; let cycle=0; let running=false; let pause=false; let startTime=null; let elapsedInt=null; let timer=null; const orb=$('#breathingOrb'); const phaseEl=$('#breathingPhase');
function updateElapsed(){ if(startTime){ const sec=Math.floor((Date.now()-startTime)/1000); $('#elapsedTime').textContent=sec+'s'; }}
function setPhase(name,duration,next){ phaseEl.textContent=name; orb.style.animation='none'; void orb.offsetWidth; const scaleMap={Inhale:1,Hold:0.98,Exhale:0.72,'Hold 2':0.72,Ready:0.72}; orb.animate([{transform:`scale(${orb.style.transform?.match(/scale\(([^)]+)\)/)?.[1]||'1'})`},{transform:`scale(${scaleMap[name]||1})`}],{duration:duration*1000, fill:'forwards', easing:'ease-in-out'}); clearTimeout(timer); if(duration>0){ timer=setTimeout(()=>{ next(); }, duration*1000); } else { next(); } }
function nextPhase(){ const pattern=breathingPatterns[currentPattern]; const labels=['Inhale','Hold','Exhale','Hold 2']; while(pattern[phaseIndex]===0){ phaseIndex=(phaseIndex+1)%pattern.length; if(phaseIndex===0) cycle++; } const dur=pattern[phaseIndex]; const label=labels[phaseIndex].replace(' 2',''); $('#cycleCount').textContent=cycle; setPhase(label,dur,()=>{ phaseIndex=(phaseIndex+1)%pattern.length; if(phaseIndex===0) cycle++; nextPhase(); }); }
function startBreathing(){ if(running) return; running=true; pause=false; startTime=Date.now(); elapsedInt=setInterval(updateElapsed,1000); phaseIndex=0; cycle=0; $('#cycleCount').textContent='0'; $('#startBreathing').textContent='Restart'; $('#pauseBreathing').disabled=false; $('#resetBreathing').disabled=false; nextPhase(); }
function pauseBreathing(){ if(!running) return; pause=!pause; if(pause){ clearInterval(elapsedInt); clearTimeout(timer); phaseEl.textContent='Paused'; $('#pauseBreathing').textContent='Resume'; } else { startTime=Date.now()-(parseInt($('#elapsedTime').textContent)||0)*1000; elapsedInt=setInterval(updateElapsed,1000); nextPhase(); $('#pauseBreathing').textContent='Pause'; } }
function resetBreathing(){ running=false; pause=false; clearInterval(elapsedInt); clearTimeout(timer); phaseEl.textContent='Ready'; $('#elapsedTime').textContent='0s'; $('#cycleCount').textContent='0'; $('#startBreathing').textContent='Start'; $('#pauseBreathing').textContent='Pause'; $('#pauseBreathing').disabled=true; $('#resetBreathing').disabled=true; }
$('#startBreathing').addEventListener('click', startBreathing); $('#pauseBreathing').addEventListener('click', pauseBreathing); $('#resetBreathing').addEventListener('click', resetBreathing);
$('#patternControls').addEventListener('click', e=>{ const chip=e.target.closest('.chip'); if(!chip) return; currentPattern=chip.dataset.pattern; $all('.chip').forEach(c=>c.classList.toggle('active', c===chip)); $('#patternName').textContent=chip.textContent; resetBreathing(); });
// Mandala Drawing Logic
const canvas=$('#mandalaCanvas'); const ctx=canvas.getContext('2d'); let drawing=false; let symmetry=parseInt($('#symmetry').value,10); let brushSize=$('#brushSize').value; let color='#ffffff'; let bgDark=false; let strokes=[]; let currentStroke=[];
function resizeCanvas(){ const rect=canvas.parentElement.getBoundingClientRect(); canvas.width=rect.width*2; canvas.height=rect.height*2; ctx.scale(2,2); redraw(); }
window.addEventListener('resize', resizeCanvas); resizeCanvas();
function drawSegment(x,y,px,py){ const cx=canvas.width/4; const cy=canvas.height/4; const angle=(2*Math.PI)/symmetry; for(let i=0;i<symmetry;i++){ ctx.save(); ctx.translate(cx,cy); ctx.rotate(i*angle); ctx.beginPath(); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle=color; ctx.lineWidth=brushSize; ctx.moveTo(px-cx,py-cy); ctx.lineTo(x-cx,y-cy); ctx.stroke(); ctx.restore(); ctx.save(); ctx.translate(cx,cy); ctx.scale(1,-1); ctx.rotate(i*angle); ctx.beginPath(); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle=color; ctx.lineWidth=brushSize; ctx.moveTo(px-cx,cy-(py-cy)); ctx.lineTo(x-cx,cy-(y-cy)); ctx.stroke(); ctx.restore(); } }
function pointerPos(e){ const r=canvas.getBoundingClientRect(); const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left; const y=(e.touches?e.touches[0].clientY:e.clientY)-r.top; return {x,y}; }
function startDraw(e){ drawing=true; currentStroke=[]; const {x,y}=pointerPos(e); currentStroke.push({x,y,size:brushSize,color,px:x,py:y}); }
function moveDraw(e){ if(!drawing) return; const {x,y}=pointerPos(e); const last=currentStroke[currentStroke.length-1]; drawSegment(x,y,last.px,last.py); currentStroke.push({x,y,size:brushSize,color,px:x,py:y}); }
function endDraw(){ if(!drawing) return; drawing=false; strokes.push(currentStroke); currentStroke=[]; }
canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mousemove', moveDraw); window.addEventListener('mouseup', endDraw); canvas.addEventListener('touchstart', e=>{ e.preventDefault(); startDraw(e); }); canvas.addEventListener('touchmove', e=>{ e.preventDefault(); moveDraw(e); }); canvas.addEventListener('touchend', endDraw);
function redraw(){ ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.restore(); if(bgDark){ ctx.fillStyle='#0f172a'; ctx.globalAlpha=0.9; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.globalAlpha=1; } strokes.forEach(st=>{ for(let i=1;i<st.length;i++){ const a=st[i-1]; const b=st[i]; brushSize=a.size; color=a.color; drawSegment(b.x,b.y,a.x,a.y); } }); }
$('#symmetry').addEventListener('change', e=>{ symmetry=parseInt(e.target.value,10); redraw(); });
$('#brushSize').addEventListener('input', e=>{ brushSize=e.target.value; });
const paletteColors=['#ffffff','#60a5fa','#a78bfa','#f472b6','#fb7185','#4ade80','#facc15','#38bdf8','#818cf8','#94a3b8']; const paletteEl=$('#palette');
paletteColors.forEach(c=>{ const sw=document.createElement('div'); sw.className='color-swatch'; sw.style.background=c; if(c===color) sw.classList.add('active'); sw.addEventListener('click',()=>{ color=c; $all('.color-swatch').forEach(s=>s.classList.toggle('active', s===sw)); }); paletteEl.appendChild(sw); });
$('#undoBtn').addEventListener('click', ()=>{ strokes.pop(); redraw(); });
$('#clearBtn').addEventListener('click', ()=>{ strokes=[]; redraw(); });
$('#saveBtn').addEventListener('click', ()=>{ const link=document.createElement('a'); link.download='zen-mandala.png'; link.href=canvas.toDataURL('image/png'); link.click(); });
$('#bgToggle').addEventListener('click', e=>{ bgDark=!bgDark; e.target.textContent=bgDark? 'Light BG' : 'Dark BG'; redraw(); });
// Focus trap enhancement (basic)
function trapFocus(modal){ const focusables=modal.querySelectorAll('button, [href], select, textarea, input'); if(!focusables.length) return; let first=focusables[0]; let last=focusables[focusables.length-1]; modal.addEventListener('keydown', e=>{ if(e.key==='Tab'){ if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); } else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); } } }); first.focus(); }
$all('.modal-overlay').forEach(m=> m.addEventListener('transitionend', ()=>{ if(m.classList.contains('active')) trapFocus(m); }, {once:false}));
