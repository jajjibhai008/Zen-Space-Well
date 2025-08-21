function $(sel, ctx=document){ return ctx.querySelector(sel); }
function $all(sel, ctx=document){ return Array.from(ctx.querySelectorAll(sel)); }

// Cache frequently used elements
const nav = $('.navbar');
const orbEls = $all('.orb');

// Create wrappers for orbs so CSS animations on .orb stay intact while JS applies transforms to the wrapper
const orbWrappers = orbEls.map(o => {
    const cs = getComputedStyle(o);
    const wrapper = document.createElement('div');
    wrapper.className = 'orb-wrapper';
    // copy positioning and size from computed style to wrapper
    wrapper.style.position = 'absolute';
    ['top','left','right','bottom','width','height'].forEach(prop=>{
        const v = cs.getPropertyValue(prop);
        if(v && v !== 'auto') wrapper.style.setProperty(prop, v);
    });
    // make orb fill wrapper
    o.style.position = 'relative';
    o.style.top = '0';
    o.style.left = '0';
    o.parentNode.insertBefore(wrapper, o);
    wrapper.appendChild(o);
    wrapper.style.willChange = 'transform';
    return wrapper;
});

// Smooth scroll
$all('a[href^="#"]').forEach(a=>{ a.addEventListener('click',e=>{ const id=a.getAttribute('href'); if(id.length>1){ e.preventDefault(); const t=$(id); if(t) t.scrollIntoView({behavior:'smooth'}); }}); });

// Throttled scroll + mouse handling using rAF to avoid layout thrashing
let latestScroll = window.pageYOffset || 0;
let mouseX = 0, mouseY = 0;
let ticking = false;

function updateVisuals(){
    // navbar background
    if(nav){ nav.style.background = latestScroll>100 ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.12)'; }
    // orbs parallax + subtle mouse movement — apply to wrappers to avoid fighting CSS animations on .orb
    orbWrappers.forEach((w,i)=>{
        const speed = (i+1)*0.25;
        const scY = latestScroll * speed;
        const mx = (mouseX - 0.5) * ((i+1)*10);
        const my = (mouseY - 0.5) * ((i+1)*6);
        // Use translate3d for GPU compositing
        w.style.transform = `translate3d(${mx.toFixed(2)}px, ${scY + my}px, 0)`;
    });
    ticking = false;
}

window.addEventListener('scroll', ()=>{
    latestScroll = window.pageYOffset || 0;
    if(!ticking){ requestAnimationFrame(updateVisuals); ticking = true; }
});

document.addEventListener('mousemove', e=>{
    mouseX = e.clientX / window.innerWidth;
    mouseY = e.clientY / window.innerHeight;
    if(!ticking){ requestAnimationFrame(updateVisuals); ticking = true; }
});

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

// Lazy-load Mandala module when the mandala modal is opened
$('#openMandalaBtn')?.addEventListener('click', async (e)=>{
    // Open modal first so layout settles, then initialize mandala module
    openModal('#mandalaModal');
    try{
        const mod = await import('./js/games/mandala.js');
        // Allow one frame for modal layout/transition to apply
        requestAnimationFrame(()=> { setTimeout(()=> { mod.init?.(); }, 20); });
    }catch(err){ console.error('Failed to load mandala module', err); }
});

// Breathing Game Logic
const breathingPatterns={ '4-7-8':[4,7,8,0], '5-5':[5,0,5,0], '4-4-6-2':[4,0,6,2] }; // inhale, hold1, exhale, hold2
let currentPattern='4-7-8'; let phaseIndex=0; let cycle=0; let running=false; let pause=false; let startTime=null; let elapsedInt=null; let timer=null; const orb=$('#breathingOrb'); const phaseEl=$('#breathingPhase');
function updateElapsed(){ if(startTime){ const sec=Math.floor((Date.now()-startTime)/1000); $('#elapsedTime').textContent=sec+'s'; }}

// Improved breathing animation: keep numeric scale state and animate without fragile string parsing
let _breathScale = 0.72; // default resting scale
function setPhase(name,duration,next){
    phaseEl.textContent = name;
    // stop any previous animation
    try{ orb.getAnimations().forEach(a=>a.cancel()); }catch(e){}
    const scaleMap = { Inhale: 1, Hold: 0.98, Exhale: 0.72, 'Hold 2': 0.72, Ready: 0.72 };
    const target = scaleMap[name] || 0.72;
    // Use WAAPI but track numeric state to avoid reading/parsing inline styles
    const anim = orb.animate([
        { transform: `scale(${_breathScale})` },
        { transform: `scale(${target})` }
    ], { duration: Math.max(300, duration*1000), fill: 'forwards', easing: 'ease-in-out' });
    anim.onfinish = ()=>{ _breathScale = target; orb.style.transform = `scale(${_breathScale})`; };
    clearTimeout(timer);
    if(duration>0){ timer = setTimeout(()=> next(), duration*1000); } else { next(); }
}

function nextPhase(){ const pattern=breathingPatterns[currentPattern]; const labels=['Inhale','Hold','Exhale','Hold 2']; while(pattern[phaseIndex]===0){ phaseIndex=(phaseIndex+1)%pattern.length; if(phaseIndex===0) cycle++; } const dur=pattern[phaseIndex]; const label=labels[phaseIndex].replace(' 2',''); $('#cycleCount').textContent=cycle; setPhase(label,dur,()=>{ phaseIndex=(phaseIndex+1)%pattern.length; if(phaseIndex===0) cycle++; nextPhase(); }); }
function startBreathing(){ if(running) return; running=true; pause=false; startTime=Date.now(); elapsedInt=setInterval(updateElapsed,1000); phaseIndex=0; cycle=0; $('#cycleCount').textContent='0'; $('#startBreathing').textContent='Restart'; $('#pauseBreathing').disabled=false; $('#resetBreathing').disabled=false; nextPhase(); }
function pauseBreathing(){ if(!running) return; pause=!pause; if(pause){ clearInterval(elapsedInt); clearTimeout(timer); phaseEl.textContent='Paused'; $('#pauseBreathing').textContent='Resume'; } else { startTime=Date.now()-(parseInt($('#elapsedTime').textContent)||0)*1000; elapsedInt=setInterval(updateElapsed,1000); nextPhase(); $('#pauseBreathing').textContent='Pause'; } }
function resetBreathing(){ running=false; pause=false; clearInterval(elapsedInt); clearTimeout(timer); phaseEl.textContent='Ready'; $('#elapsedTime').textContent='0s'; $('#cycleCount').textContent='0'; $('#startBreathing').textContent='Start'; $('#pauseBreathing').textContent='Pause'; $('#pauseBreathing').disabled=true; $('#resetBreathing').disabled=true; }
$('#startBreathing').addEventListener('click', startBreathing); $('#pauseBreathing').addEventListener('click', pauseBreathing); $('#resetBreathing').addEventListener('click', resetBreathing);
$('#patternControls').addEventListener('click', e=>{ const chip=e.target.closest('.chip'); if(!chip) return; currentPattern=chip.dataset.pattern; $all('.chip').forEach(c=>c.classList.toggle('active', c===chip)); $('#patternName').textContent=chip.textContent; resetBreathing(); });

// Note: Mandala drawing logic has been moved to a lazy-loaded module at ./js/games/mandala.js

// Lazy-load AdSense: push ads on first user interaction or after 3s fallback
function loadAds(){ try{ const ins = document.querySelectorAll('ins.adsbygoogle[data-ad-loaded="false"]'); if(ins.length){ (window.adsbygoogle = window.adsbygoogle || []); ins.forEach(i=>{ try{ window.adsbygoogle.push({}); i.setAttribute('data-ad-loaded','true'); }catch(e){} }); } }catch(e){}
}
let adsLoaded = false;
function onFirstInteraction(){ if(adsLoaded) return; adsLoaded = true; loadAds(); window.removeEventListener('mousemove', onFirstInteraction); window.removeEventListener('touchstart', onFirstInteraction); window.removeEventListener('scroll', onFirstInteraction); window.removeEventListener('click', onFirstInteraction); }
window.addEventListener('mousemove', onFirstInteraction, {passive:true});
window.addEventListener('touchstart', onFirstInteraction, {passive:true});
window.addEventListener('scroll', onFirstInteraction, {passive:true});
window.addEventListener('click', onFirstInteraction, {passive:true});
// fallback: load after 3s if no interaction
setTimeout(()=>{ if(!adsLoaded) { adsLoaded = true; loadAds(); } }, 3000);

// Focus trap enhancement (basic)
function trapFocus(modal){ const focusables=modal.querySelectorAll('button, [href], select, textarea, input'); if(!focusables.length) return; let first=focusables[0]; let last=focusables[focusables.length-1]; modal.addEventListener('keydown', e=>{ if(e.key==='Tab'){ if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); } else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); } } }); first.focus(); }
$all('.modal-overlay').forEach(m=> m.addEventListener('transitionend', ()=>{ if(m.classList.contains('active')) trapFocus(m); }, {once:false}));

// helper: dynamically load CSS (avoid duplicate loads)
const loadedCss = new Set();
function loadCss(href){ if(loadedCss.has(href)) return Promise.resolve(); return new Promise((res,rej)=>{ const l=document.createElement('link'); l.rel='stylesheet'; l.href=href; l.onload = ()=>{ loadedCss.add(href); res(); }; l.onerror=rej; document.head.appendChild(l); }); }

let breathingModuleLoaded = false;
$('#openBreathingBtn')?.addEventListener('click', async ()=>{ openModal('#breathingModal'); if(breathingModuleLoaded) return; breathingModuleLoaded = true; try{ await loadCss('styles.css'); const mod = await import('./js/games/breathing.js'); mod.init?.(); }catch(err){ console.error('Failed to load breathing module', err); } });
$('#launchBreathing')?.addEventListener('click', e=>{ e.preventDefault(); openModal('#breathingModal'); if(breathingModuleLoaded) return; breathingModuleLoaded = true; import('./js/games/breathing.js').then(m=>m.init()).catch(e=>console.error(e)); });

// Mandala lazy-load with CSS
let mandalaModuleLoaded = false;
$('#openMandalaBtn')?.addEventListener('click', async (e)=>{
    openModal('#mandalaModal');
    if(mandalaModuleLoaded) { requestAnimationFrame(()=> window.mandala?.redraw?.()); return; }
    mandalaModuleLoaded = true;
    try{
        // load optional mandala-specific css if we split styles (we keep single CSS for now but leave helper)
        // await loadCss('css/mandala.css');
        const mod = await import('./js/games/mandala.js');
        requestAnimationFrame(()=> { setTimeout(()=> { mod.init?.(); }, 20); });
    }catch(err){ console.error('Failed to load mandala module', err); }
});
