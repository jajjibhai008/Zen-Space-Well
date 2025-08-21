// Breathing module (lazy-loaded)
const breathingPatterns={ '4-7-8':[4,7,8,0], '5-5':[5,0,5,0], '4-4-6-2':[4,0,6,2] }; // inhale, hold1, exhale, hold2
let currentPattern='4-7-8'; let phaseIndex=0; let cycle=0; let running=false; let paused=false; let startTime=null; let elapsedInt=null; let timer=null;
let _breathScale = 0.72; // numeric scale state
let orb, phaseEl;

function updateElapsed(){ if(startTime){ const sec=Math.floor((Date.now()-startTime)/1000); document.getElementById('elapsedTime').textContent=sec+'s'; }}

function setPhase(name,duration,next){ phaseEl.textContent = name; try{ orb.getAnimations().forEach(a=>a.cancel()); }catch(e){}
    const scaleMap = { Inhale: 1, Hold: 0.98, Exhale: 0.72, 'Hold 2': 0.72, Ready: 0.72 };
    const target = scaleMap[name] || 0.72;
    const anim = orb.animate([
        { transform: `scale(${_breathScale})` },
        { transform: `scale(${target})` }
    ], { duration: Math.max(300, duration*1000), fill: 'forwards', easing: 'ease-in-out' });
    anim.onfinish = ()=>{ _breathScale = target; orb.style.transform = `scale(${_breathScale})`; };
    clearTimeout(timer);
    if(duration>0){ timer = setTimeout(()=> next(), duration*1000); } else { next(); }
}

function nextPhase(){ const pattern=breathingPatterns[currentPattern]; const labels=['Inhale','Hold','Exhale','Hold 2']; while(pattern[phaseIndex]===0){ phaseIndex=(phaseIndex+1)%pattern.length; if(phaseIndex===0) cycle++; } const dur=pattern[phaseIndex]; const label=labels[phaseIndex].replace(' 2',''); document.getElementById('cycleCount').textContent=cycle; setPhase(label,dur,()=>{ phaseIndex=(phaseIndex+1)%pattern.length; if(phaseIndex===0) cycle++; nextPhase(); }); }

function startBreathing(){ if(running) return; running=true; paused=false; startTime=Date.now(); elapsedInt=setInterval(updateElapsed,1000); phaseIndex=0; cycle=0; document.getElementById('cycleCount').textContent='0'; document.getElementById('startBreathing').textContent='Restart'; document.getElementById('pauseBreathing').disabled=false; document.getElementById('resetBreathing').disabled=false; nextPhase(); }
function pauseBreathing(){ if(!running) return; paused=!paused; if(paused){ clearInterval(elapsedInt); clearTimeout(timer); phaseEl.textContent='Paused'; document.getElementById('pauseBreathing').textContent='Resume'; } else { startTime=Date.now()-(parseInt(document.getElementById('elapsedTime').textContent)||0)*1000; elapsedInt=setInterval(updateElapsed,1000); nextPhase(); document.getElementById('pauseBreathing').textContent='Pause'; } }
function resetBreathing(){ running=false; paused=false; clearInterval(elapsedInt); clearTimeout(timer); phaseEl.textContent='Ready'; document.getElementById('elapsedTime').textContent='0s'; document.getElementById('cycleCount').textContent='0'; document.getElementById('startBreathing').textContent='Start'; document.getElementById('pauseBreathing').textContent='Pause'; document.getElementById('pauseBreathing').disabled=true; document.getElementById('resetBreathing').disabled=true; }

export function init(){ orb = document.getElementById('breathingOrb'); phaseEl = document.getElementById('breathingPhase'); if(!orb || !phaseEl) return console.warn('breathing: required DOM not found');
    document.getElementById('startBreathing').addEventListener('click', startBreathing);
    document.getElementById('pauseBreathing').addEventListener('click', pauseBreathing);
    document.getElementById('resetBreathing').addEventListener('click', resetBreathing);
    document.getElementById('patternControls').addEventListener('click', e=>{ const chip=e.target.closest('.chip'); if(!chip) return; currentPattern=chip.dataset.pattern; document.querySelectorAll('#patternControls .chip').forEach(c=>c.classList.toggle('active', c===chip)); document.getElementById('patternName').textContent=chip.textContent; resetBreathing(); });
    document.querySelectorAll('#patternControls .chip').forEach(c=> c.classList.toggle('active', c.dataset.pattern===currentPattern));
    document.getElementById('patternName').textContent = document.querySelector('#patternControls .chip.active')?.textContent || currentPattern;
    resetBreathing();
}

export function destroy(){ try{ clearInterval(elapsedInt); clearTimeout(timer); }catch(e){} }
