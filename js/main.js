import { $, $all, loadCss, showModalLoader, hideModalLoader } from './dom.js';

// Reuse much of app.js behaviour but as module with imports

// Cache frequently used elements
const nav = $('.navbar');
const orbEls = $all('.orb');

// orb wrapper conversion
const orbWrappers = orbEls.map(o => {
    const cs = getComputedStyle(o);
    const wrapper = document.createElement('div');
    wrapper.className = 'orb-wrapper';
    ['top','left','right','bottom','width','height'].forEach(prop=>{
        const v = cs.getPropertyValue(prop);
        if(v && v !== 'auto') wrapper.style.setProperty(prop, v);
    });
    o.style.position = 'relative';
    o.style.top = '0'; o.style.left='0';
    o.parentNode.insertBefore(wrapper, o); wrapper.appendChild(o); wrapper.style.willChange='transform';
    return wrapper;
});

// Smooth scroll
$all('a[href^="#"]').forEach(a=>{ a.addEventListener('click',e=>{ const id=a.getAttribute('href'); if(id.length>1){ e.preventDefault(); const t=$(id); if(t) t.scrollIntoView({behavior:'smooth'}); }}); });

// throttle visuals
let latestScroll = window.pageYOffset || 0;
// keep scroll listener (uses ticking declared later)
window.addEventListener('scroll', ()=>{ latestScroll = window.pageYOffset || 0; if(!ticking){ requestAnimationFrame(updateVisuals); ticking=true; } });

// Intersection observe
const observer=new IntersectionObserver(entries=>{ entries.forEach(en=>{ if(en.isIntersecting){ en.target.style.opacity='1'; en.target.style.transform='translateY(0)'; }}); }, {threshold:0.1, rootMargin:'0px 0px -60px 0px'});
$all('.app-card, .science-item').forEach(el=>{ el.style.opacity='0'; el.style.transform='translateY(50px)'; el.style.transition='all .65s ease'; observer.observe(el); });

// Modal helpers
export function openModal(id){ const m=$(id); if(m){ m.classList.add('active'); m.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }}
export function closeModal(m){ m.classList.remove('active'); m.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
$all('[data-close-modal]').forEach(btn=> btn.addEventListener('click', ()=> closeModal(btn.closest('.modal-overlay'))));
$all('.modal-overlay').forEach(ov=> ov.addEventListener('click', e=>{ if(e.target===ov) closeModal(ov); }));
document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ $all('.modal-overlay.active').forEach(m=>closeModal(m)); }});
$('#openResearch')?.addEventListener('click', ()=> openModal('#researchModal'));
$('#viewResearchBtn')?.addEventListener('click', e=>{ e.preventDefault(); openModal('#researchModal'); });

// Focus trap
export function trapFocus(modal){ const focusables=modal.querySelectorAll('button, [href], select, textarea, input'); if(!focusables.length) return; let first=focusables[0]; let last=focusables[focusables.length-1]; modal.addEventListener('keydown', e=>{ if(e.key==='Tab'){ if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); } else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); } } }); first.focus(); }
$all('.modal-overlay').forEach(m=> m.addEventListener('transitionend', ()=>{ if(m.classList.contains('active')) trapFocus(m); }, {once:false}));

// Ad lazy load
function loadAds(){ try{ const ins = document.querySelectorAll('ins.adsbygoogle[data-ad-loaded="false"]'); if(ins.length){ (window.adsbygoogle = window.adsbygoogle || []); ins.forEach(i=>{ try{ window.adsbygoogle.push({}); i.setAttribute('data-ad-loaded','true'); }catch(e){} }); } }catch(e){}
}
let adsLoaded=false; function onFirstInteraction(){ if(adsLoaded) return; adsLoaded=true; loadAds(); window.removeEventListener('mousemove', onFirstInteraction); window.removeEventListener('touchstart', onFirstInteraction); window.removeEventListener('scroll', onFirstInteraction); window.removeEventListener('click', onFirstInteraction); }
window.addEventListener('mousemove', onFirstInteraction, {passive:true}); window.addEventListener('touchstart', onFirstInteraction, {passive:true}); window.addEventListener('scroll', onFirstInteraction, {passive:true}); window.addEventListener('click', onFirstInteraction, {passive:true}); setTimeout(()=>{ if(!adsLoaded) { adsLoaded=true; loadAds(); } }, 3000);

// Wire lazy-loaded modules and use loader + CSS helper
let breathingModuleLoaded=false; let mandalaModuleLoaded=false; let breathingMod=null; let mandalaMod=null;

$('#openBreathingBtn')?.addEventListener('click', async ()=>{
    openModal('#breathingModal');
    showModalLoader('#breathingModal');
    if(breathingModuleLoaded){ hideModalLoader('#breathingModal'); return; }
    breathingModuleLoaded = true;
    try{
        await loadCss('styles.css');
        const mod = await import('./games/breathing.js');
        breathingMod = mod;
        mod.init?.();
    }catch(err){ console.error('Failed to load breathing module', err); }
    hideModalLoader('#breathingModal');
});

$('#launchBreathing')?.addEventListener('click', e=>{ e.preventDefault(); $('#openBreathingBtn').click(); });

$('#openMandalaBtn')?.addEventListener('click', async ()=>{
    openModal('#mandalaModal');
    showModalLoader('#mandalaModal');
    if(mandalaModuleLoaded){ hideModalLoader('#mandalaModal'); requestAnimationFrame(()=> window.mandala?.redraw?.()); return; }
    mandalaModuleLoaded = true;
    try{
        // ideally load component CSS (split later)
        // await loadCss('css/mandala.css');
        const mod = await import('./games/mandala.js');
        mandalaMod = mod;
        // give layout paint a tick
        requestAnimationFrame(()=> { setTimeout(()=> { mod.init?.(); hideModalLoader('#mandalaModal'); }, 20); });
    }catch(err){ console.error(err); hideModalLoader('#mandalaModal'); }
});

// When modal closes, call destroy on modules to clean up timers/listeners
$all('[data-close-modal]').forEach(btn=> btn.addEventListener('click', ()=>{ const m = btn.closest('.modal-overlay'); if(m.id==='breathingModal'){ breathingMod?.destroy?.(); } if(m.id==='mandalaModal'){ mandalaMod?.destroy?.(); } }));
$all('.modal-overlay').forEach(ov=> ov.addEventListener('click', e=>{ if(e.target===ov){ if(ov.id==='breathingModal'){ breathingMod?.destroy?.(); } if(ov.id==='mandalaModal'){ mandalaMod?.destroy?.(); } } }));

// Export some pieces for potential external testing
export { breathingMod, mandalaMod };

// Throttle helper for rAF updates (minimum interval in ms)
let lastVisualUpdate = 0;
const VISUAL_MIN_INTERVAL = 80; // limit to ~12.5fps for non-critical motion

// Replace existing mousemove handling to respect low-motion and throttle frequency
let mouseX = 0, mouseY = 0;
let ticking = false;

function updateVisuals(){ const now = performance.now(); if(now - lastVisualUpdate < VISUAL_MIN_INTERVAL){ ticking = false; return; } lastVisualUpdate = now;
    // navbar background
    if(nav){ nav.style.background = latestScroll>100 ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.12)'; }
    // orbs parallax + subtle mouse movement — apply to wrappers to avoid fighting CSS animations on .orb
    const lowMotion = document.documentElement.classList.contains('low-motion');
    orbWrappers.forEach((w,i)=>{
        const speed = (i+1)*0.18 * (lowMotion?0.3:1); // reduce movement when low-motion
        const scY = latestScroll * speed;
        const mx = (mouseX - 0.5) * ((i+1)*(lowMotion?4:10));
        const my = (mouseY - 0.5) * ((i+1)*(lowMotion?2:6));
        w.style.transform = `translate3d(${mx.toFixed(2)}px, ${scY + my}px, 0)`;
    });
    ticking = false;
}

// smarter mouse handler: skip updates when low-motion or when pointer hasn't moved much
let lastMouseStamp = 0; const MOUSE_MIN_MOVE = 0.003; // normalized movement threshold
document.addEventListener('mousemove', e=>{
    // respect prefers-reduced-motion / low-motion mode
    if(document.documentElement.classList.contains('low-motion')) return;
    const nx = e.clientX / window.innerWidth; const ny = e.clientY / window.innerHeight;
    const dx = Math.abs(nx - mouseX); const dy = Math.abs(ny - mouseY);
    mouseX = nx; mouseY = ny;
    const now = performance.now();
    if(dx < MOUSE_MIN_MOVE && dy < MOUSE_MIN_MOVE && now - lastMouseStamp < 60) return; // ignore micro-movements
    lastMouseStamp = now;
    if(!ticking){ requestAnimationFrame(updateVisuals); ticking = true; }
});

// Update evaluatePerformanceHints to check stored preference
async function evaluatePerformanceHints(){
    try{
        // user preference from localStorage takes precedence
        const stored = localStorage.getItem('zen_low_motion');
        if(stored === '1'){ document.documentElement.classList.add('low-motion'); return; }
        if(stored === '0'){ document.documentElement.classList.remove('low-motion'); }

        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if(prefersReduced){ document.documentElement.classList.add('low-motion'); }
        // network save-data
        if(navigator.connection && navigator.connection.saveData){ document.documentElement.classList.add('low-motion'); }
        // low CPU
        if(navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2){ document.documentElement.classList.add('low-motion'); }
        // Battery status: if available and low (<=25%) and not charging, enable low-motion
        if('getBattery' in navigator){ const bat = await navigator.getBattery(); if(bat.level <= 0.25 && !bat.charging){ document.documentElement.classList.add('low-motion'); } bat.addEventListener('levelchange', ()=>{ if(bat.level <= 0.25 && !bat.charging) document.documentElement.classList.add('low-motion'); }); bat.addEventListener('chargingchange', ()=>{ if(bat.charging) document.documentElement.classList.remove('low-motion'); }); }
    }catch(e){ /* silent fallback */ }

    // If low-motion was enabled, hide some decorative orbs to reduce painting
    if(document.documentElement.classList.contains('low-motion')){
        const orbs = document.querySelectorAll('.floating-orbs .orb');
        orbs.forEach((o,i)=>{ if(i>0) o.style.opacity = '0'; else o.style.opacity='0.85'; });
    }
}

// expose force toggle for debugging or user control
export function setLowMotion(enable=true){ if(enable){ document.documentElement.classList.add('low-motion'); localStorage.setItem('zen_low_motion','1'); } else { document.documentElement.classList.remove('low-motion'); localStorage.setItem('zen_low_motion','0'); } // reflect button state
    const btn = document.getElementById('motionToggle'); if(btn) btn.setAttribute('aria-pressed', String(enable)); }

// add UI wiring for the toggle (initialize state and label, then wire click)
const motionBtn = document.getElementById('motionToggle');
if(motionBtn){
    // determine initial state: localStorage > document class
    const stored = localStorage.getItem('zen_low_motion');
    const enabled = stored === '1' || (stored === null && document.documentElement.classList.contains('low-motion'));
    // reflect state on document and button
    if(enabled) document.documentElement.classList.add('low-motion'); else document.documentElement.classList.remove('low-motion');
    motionBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    motionBtn.textContent = enabled ? 'Low Motion: On' : 'Low Motion: Off';

    motionBtn.addEventListener('click', ()=>{
        const pressed = motionBtn.getAttribute('aria-pressed') === 'true';
        const next = !pressed;
        setLowMotion(next);
        motionBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
        motionBtn.textContent = next ? 'Low Motion: On' : 'Low Motion: Off';
    });
}

// run detection early
evaluatePerformanceHints();
// ensure the visuals update after detection
requestAnimationFrame(()=>{ if(typeof updateVisuals === 'function') updateVisuals(); });
