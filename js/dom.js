// Lightweight DOM helpers and CSS loader
export function $(sel, ctx=document){ return ctx.querySelector(sel); }
export function $all(sel, ctx=document){ return Array.from(ctx.querySelectorAll(sel)); }

const loadedCss = new Set();
export function loadCss(href){ if(loadedCss.has(href)) return Promise.resolve(); return new Promise((res,rej)=>{ const l=document.createElement('link'); l.rel='stylesheet'; l.href=href; l.onload = ()=>{ loadedCss.add(href); res(); }; l.onerror = rej; document.head.appendChild(l); }); }

// Simple utility to create and show a small loader inside a modal content
export function showModalLoader(modalSelector){ const modal = $(modalSelector); if(!modal) return null; const content = modal.querySelector('.modal-content'); if(!content) return null; let loader = content.querySelector('.module-loader'); if(!loader){ loader = document.createElement('div'); loader.className = 'module-loader'; loader.innerHTML = '<div class="spinner" aria-hidden="true"></div><div class="loader-text">Loading…</div>'; loader.style.cssText = 'display:flex; align-items:center; gap:.6rem; justify-content:center; position:absolute; inset:0; background:linear-gradient(rgba(0,0,0,0.0), rgba(0,0,0,0.0)); z-index:40;'; const spinner = loader.querySelector('.spinner'); spinner.style.cssText = 'width:28px; height:28px; border-radius:50%; border:3px solid rgba(255,255,255,0.18); border-top-color:rgba(255,255,255,0.85); animation:spin 1s linear infinite;'; const style = document.createElement('style'); style.innerHTML = '@keyframes spin{to{transform:rotate(360deg)}}'; loader.appendChild(style); content.appendChild(loader); }
    loader.style.display = 'flex'; return loader;
}
export function hideModalLoader(modalSelector){ const modal = $(modalSelector); if(!modal) return; const content = modal.querySelector('.modal-content'); if(!content) return; const loader = content.querySelector('.module-loader'); if(loader) loader.style.display = 'none'; }
