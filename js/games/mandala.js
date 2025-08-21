// Mandala module (lazy-loaded)
let canvas, ctx, resizeObserver;
let drawing=false, currentStroke=[], strokes=[], symmetry=8, brushSize=6, color='#ffffff', bgDark=false;
let pendingDraw=false, lastDrawIndex=0;
let boundResize, boundPointerDown, boundPointerMove, boundPointerUp;

export function init(){
    // create or grab DOM elements inside the mandala modal
    canvas = document.querySelector('#mandalaCanvas');
    if(!canvas) return console.warn('mandala: canvas not found');
    ctx = canvas.getContext('2d');

    // pick up controls
    const symEl = document.querySelector('#symmetry');
    const brushEl = document.querySelector('#brushSize');
    const palette = document.querySelector('#palette');
    symmetry = parseInt(symEl?.value || 8, 10);
    brushSize = parseInt(brushEl?.value || 6, 10);

    // wire control events
    symEl?.addEventListener('change', e=>{ symmetry = parseInt(e.target.value,10); redraw(); });
    brushEl?.addEventListener('input', e=>{ brushSize = parseInt(e.target.value,10); });

    // palette swatches
    const colors = ['#ffffff','#60a5fa','#a78bfa','#f472b6','#fb7185','#4ade80','#facc15','#38bdf8','#818cf8','#94a3b8'];
    if(palette && !palette.dataset.inited){
        colors.forEach(c=>{ const sw=document.createElement('div'); sw.className='color-swatch'; sw.style.background=c; sw.addEventListener('click',()=>{ color=c; palette.querySelectorAll('.color-swatch').forEach(s=>s.classList.toggle('active', s===sw)); }); palette.appendChild(sw); });
        palette.dataset.inited = '1';
    }

    // set up DPI-aware canvas sizing
    function resizeCanvas(){
        const rect = canvas.parentElement.getBoundingClientRect();
        // Use the real devicePixelRatio (do not floor) for crisp rendering on fractional DPR displays
        const dpr = Math.max(1, (window.devicePixelRatio || 1));
        // Set CSS size
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        // Set backing store size in device pixels
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        // Reset transforms and scale so drawing coordinates are in CSS pixels
        ctx.setTransform(1,0,0,1,0,0);
        ctx.scale(dpr, dpr);
        redraw();
    }

    resizeCanvas();
    boundResize = resizeCanvas;
    window.addEventListener('resize', boundResize);

    // pointer handling
    function pointerPos(e){ // works with PointerEvent
        const r = canvas.getBoundingClientRect();
        const x = (e.clientX) - r.left;
        const y = (e.clientY) - r.top;
        return {x,y};
    }

    // Draw a single segment using precomputed center/angle to avoid repeated layout reads
    function drawSegment(x,y,px,py,cx,cy,angle){
        for(let i=0;i<symmetry;i++){
            // normal
            ctx.save();
            ctx.translate(cx,cy);
            ctx.rotate(i*angle);
            ctx.beginPath();
            ctx.lineCap='round';
            ctx.lineJoin='round';
            ctx.strokeStyle=color;
            ctx.lineWidth=brushSize;
            ctx.moveTo(px-cx,py-cy);
            ctx.lineTo(x-cx,y-cy);
            ctx.stroke();
            ctx.restore();
            // mirrored
            ctx.save();
            ctx.translate(cx,cy);
            ctx.scale(1,-1);
            ctx.rotate(i*angle);
            ctx.beginPath();
            ctx.lineCap='round';
            ctx.lineJoin='round';
            ctx.strokeStyle=color;
            ctx.lineWidth=brushSize;
            // reflect y across center: y' = 2*cy - y
            ctx.moveTo(px-cx, 2*cy - py - cy);
            ctx.lineTo(x-cx, 2*cy - y - cy);
            // Note: using simple math above yields same visual as earlier approach but kept explicit
            ctx.stroke();
            ctx.restore();
        }
    }

    function flushDraw(){
        if(!drawing){ pendingDraw=false; return; }
        // Precompute layout once per frame to avoid thrashing
        const rect = canvas.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const angle = (2*Math.PI) / symmetry;
        for(let i=Math.max(1,lastDrawIndex); i<currentStroke.length; i++){
            const a = currentStroke[i-1];
            const b = currentStroke[i];
            // respect per-point size/color
            const prevSize = a.size; const prevColor = a.color;
            // temporarily apply point-specific attributes
            const savedBrush = brushSize; const savedColor = color;
            brushSize = prevSize; color = prevColor;
            drawSegment(b.x, b.y, a.x, a.y, cx, cy, angle);
            // restore globals
            brushSize = savedBrush; color = savedColor;
        }
        lastDrawIndex = currentStroke.length;
        pendingDraw = false;
    }

    function startDraw(e){ drawing=true; currentStroke=[]; lastDrawIndex=0; const {x,y}=pointerPos(e); currentStroke.push({x,y,size:brushSize,color}); }
    function moveDraw(e){ if(!drawing) return; const {x,y}=pointerPos(e); currentStroke.push({x,y,size:brushSize,color}); if(!pendingDraw){ pendingDraw=true; requestAnimationFrame(flushDraw); } }
    function endDraw(){ if(!drawing) return; drawing=false; if(pendingDraw) flushDraw(); strokes.push(currentStroke.slice()); currentStroke=[]; lastDrawIndex=0; }

    boundPointerDown = function(e){ e.preventDefault(); try{ canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); }catch(err){} startDraw(e); };
    boundPointerMove = function(e){ moveDraw(e); };
    boundPointerUp = function(e){ try{ canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId); }catch(err){} endDraw(e); };

    canvas.addEventListener('pointerdown', boundPointerDown, {passive:false});
    canvas.addEventListener('pointermove', boundPointerMove, {passive:true});
    window.addEventListener('pointerup', boundPointerUp);

    // additional UI bindings
    document.querySelector('#undoBtn')?.addEventListener('click', ()=>{ strokes.pop(); redraw(); });
    document.querySelector('#clearBtn')?.addEventListener('click', ()=>{ strokes=[]; redraw(); });
    document.querySelector('#saveBtn')?.addEventListener('click', ()=>{ const link=document.createElement('a'); link.download='zen-mandala.png'; link.href=canvas.toDataURL('image/png'); link.click(); });
    document.querySelector('#bgToggle')?.addEventListener('click', e=>{ bgDark=!bgDark; e.target.textContent=bgDark? 'Light BG' : 'Dark BG'; redraw(); });

    // redraw
    function redraw(){
        // Clear full device-pixel buffer
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.restore();
        // paint bg if requested (use CSS pixel coords by restoring transform)
        if(bgDark){ ctx.save(); ctx.fillStyle='#0f172a'; ctx.globalAlpha=0.9; // fill in device pixels
            // fill using CSS pixels to match subsequent drawing coordinates
            const rect = canvas.getBoundingClientRect();
            ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.globalAlpha=1; ctx.restore(); }
        // Precompute center and angle once
        const rect = canvas.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const angle = (2*Math.PI) / symmetry;
        strokes.forEach(st=>{
            for(let i=1;i<st.length;i++){
                const a = st[i-1]; const b = st[i];
                const savedBrush = brushSize; const savedColor = color;
                brushSize = a.size; color = a.color;
                drawSegment(b.x, b.y, a.x, a.y, cx, cy, angle);
                brushSize = savedBrush; color = savedColor;
            }
        });
    }

    // expose redraw for external calls
    window.mandala = { redraw };
}

export function destroy(){ try{ window.mandala = null; }catch(e){} try{ window.removeEventListener('resize', boundResize); canvas?.removeEventListener('pointerdown', boundPointerDown); canvas?.removeEventListener('pointermove', boundPointerMove); window.removeEventListener('pointerup', boundPointerUp); }catch(e){} }
