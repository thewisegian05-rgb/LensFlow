const CSS = `
:root {
  --lf-ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --lf-ease-soft: cubic-bezier(0.22, 1, 0.36, 1);
  --lf-text-heading:   #f1f5f9;
  --lf-text-body:      #94a3b8;
  --lf-text-label:     #64748b;
  --lf-text-accent:    #22d3ee;
  --lf-text-muted:     #475569;
  --lf-text-white:     #ffffff;
}
html { scroll-behavior: smooth; }

.lf-text-heading  { color: var(--lf-text-heading);  }
.lf-text-body     { color: var(--lf-text-body);     }
.lf-text-label    { color: var(--lf-text-label);    }
.lf-text-accent   { color: var(--lf-text-accent);   }
.lf-text-muted    { color: var(--lf-text-muted);    }
.lf-text-white    { color: var(--lf-text-white);    }
.lf-shimmer-text  { color: var(--lf-text-accent);   }

@keyframes lf-fade-up   { from { opacity: 0; transform: translateY(28px) scale(.97); filter: blur(6px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes lf-fade-down { from { opacity: 0; transform: translateY(-18px); } to { opacity: 1; transform: none; } }
@keyframes lf-fade-in   { from { opacity: 0; } to { opacity: 1; } }
@keyframes lf-row-in    { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: none; } }
@keyframes lf-modal-pop { from { opacity: 0; transform: scale(.94) translateY(24px); } to { opacity: 1; transform: none; } }
@keyframes lf-pulse-dot { 0% { transform: scale(1); opacity: .6; } 70%, 100% { transform: scale(3.2); opacity: 0; } }
@keyframes lf-shimmer   { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }

.lf-header-in { animation: lf-fade-down .7s var(--lf-ease-out-expo) backwards; }
.lf-rise      { animation: lf-fade-up .9s var(--lf-ease-out-expo) backwards; animation-delay: var(--d, 0ms); }

.lf-page { animation: lf-page-in .55s var(--lf-ease-out-expo) backwards; }
@keyframes lf-page-in {
  from { opacity: 0; transform: translateX(48px); filter: blur(4px); }
  to   { opacity: 1; transform: none; filter: none; }
}

.lf-orb { position: absolute; border-radius: 9999px; filter: blur(90px); opacity: .35; will-change: transform; }
.lf-orb-1 { width: 520px; height: 520px; top: -140px; left: -120px; background: rgba(56, 189, 248, .35); animation: lf-drift-a 22s ease-in-out infinite alternate; }
.lf-orb-2 { width: 460px; height: 460px; top: 35%; right: -140px; background: rgba(99,102,241,.45); opacity: .22; animation: lf-drift-b 28s ease-in-out infinite alternate; }
.lf-orb-3 { width: 400px; height: 400px; bottom: -160px; left: 30%; background: rgba(56,189,248,.35); opacity: .16; animation: lf-drift-c 32s ease-in-out infinite alternate; }
@keyframes lf-drift-a { to { transform: translate(180px, 120px) scale(1.15); } }
@keyframes lf-drift-b { to { transform: translate(-220px, -80px) scale(1.2); } }
@keyframes lf-drift-c { to { transform: translate(140px, -160px) scale(1.1); } }

.lf-kenburns { animation: lf-kenburns 18s ease-in-out infinite alternate; transform-origin: 60% 40%; }
@keyframes lf-kenburns { from { transform: scale(1); } to { transform: scale(1.12) translate(-1.5%, -1%); } }

.lf-focus-pull { animation: lf-focus-pull 1.4s var(--lf-ease-out-expo) backwards; }
@keyframes lf-focus-pull {
  0%   { opacity: 0; filter: blur(18px); transform: scale(1.06); letter-spacing: .06em; }
  60%  { opacity: 1; }
  100% { opacity: 1; filter: blur(0); transform: scale(1); letter-spacing: normal; }
}

.lf-shimmer-text {
  background: linear-gradient(100deg, #38bdf8 20%, #e0f2fe 40%, #a78bfa 60%, #38bdf8 80%);
  background-size: 250% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: lf-text-shimmer 5s linear infinite;
}
@keyframes lf-text-shimmer { to { background-position: -250% 0; } }

.lf-vf { position: absolute; width: 22px; height: 22px; border-color: rgba(56,189,248,.85); opacity: 0; animation: lf-vf-in .8s ease-out 1.2s forwards, lf-vf-pulse 3.2s ease-in-out 2s infinite; }
.lf-vf-tl { top: 16px; left: 16px;  border-top: 2px solid; border-left: 2px solid;  border-top-left-radius: 4px; }
.lf-vf-tr { top: 16px; right: 16px; border-top: 2px solid; border-right: 2px solid; border-top-right-radius: 4px; }
.lf-vf-bl { bottom: 16px; left: 16px;  border-bottom: 2px solid; border-left: 2px solid;  border-bottom-left-radius: 4px; }
.lf-vf-br { bottom: 16px; right: 16px; border-bottom: 2px solid; border-right: 2px solid; border-bottom-right-radius: 4px; }
@keyframes lf-vf-in    { from { opacity: 0; transform: scale(1.8); } to { opacity: 1; transform: scale(1); } }
@keyframes lf-vf-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(.82); } }

.lf-rec { width: 8px; height: 8px; border-radius: 9999px; background: #f43f5e; animation: lf-blink 1.4s steps(2, jump-none) infinite; }
@keyframes lf-blink { 50% { opacity: .15; } }

.lf-reveal {
  opacity: 0;
  transform: translateY(28px) scale(.97);
  filter: blur(6px);
  transition: opacity .8s var(--lf-ease-out-expo), transform .8s var(--lf-ease-out-expo), filter .8s var(--lf-ease-out-expo);
  transition-delay: var(--d, 0ms);
}
.lf-reveal.lf-in { opacity: 1; transform: none; filter: none; }

.lf-reveal:not(.lf-in) .lf-photo { opacity: 0; }
.lf-in .lf-photo { animation: lf-fade-up .8s var(--lf-ease-out-expo) backwards; animation-delay: var(--d, 0ms); }
.lf-photo { transition: transform .35s var(--lf-ease-soft), box-shadow .35s var(--lf-ease-soft), border-color .25s ease; }
.lf-photo:hover { transform: translateY(-6px); box-shadow: 0 16px 34px rgba(2, 6, 23, .4); }

.lf-reveal:not(.lf-in) .lf-row { opacity: 0; }
.lf-in .lf-row { animation: lf-row-in .7s var(--lf-ease-out-expo) backwards; animation-delay: var(--d, 0ms); transition: background-color .25s ease; }
.lf-row:hover { background-color: rgba(255, 255, 255, .04); }

.lf-sheen { position: relative; overflow: hidden; }
.lf-sheen::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.22) 50%, transparent 65%);
  transform: translateX(-120%); transition: transform .9s ease; }
.lf-sheen:hover::after { transform: translateX(120%); }

.lf-dot { position: relative; }
.lf-dot::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: inherit; animation: lf-pulse-dot 1.8s infinite; }

.lf-btn { transition: transform .25s var(--lf-ease-soft), box-shadow .25s var(--lf-ease-soft), background-color .2s ease, border-color .2s ease, color .2s ease; }
.lf-btn:hover:not(:disabled) { transform: translateY(-2px); }
.lf-btn:active:not(:disabled) { transform: scale(.95); }
.lf-star { transition: transform .25s var(--lf-ease-soft); }
.lf-star:hover { transform: scale(1.25) rotate(-8deg); }
.lf-star:active { transform: scale(.9); }

.lf-cta { position: relative; overflow: hidden; }
.lf-cta::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%);
  transform: translateX(-130%); animation: lf-cta-sweep 3.6s ease-in-out infinite; }
@keyframes lf-cta-sweep { 0%, 55% { transform: translateX(-130%); } 100% { transform: translateX(130%); } }

.lf-float { animation: lf-float 4s ease-in-out infinite; }
@keyframes lf-float { 50% { transform: translateY(-8px) rotate(-4deg); } }

.lf-lens { animation: lf-lens 4.5s ease-in-out infinite; }
@keyframes lf-lens {
  0%, 100% { filter: drop-shadow(0 0 0 rgba(56,189,248,0)); transform: scale(1); }
  50%      { filter: drop-shadow(0 0 8px rgba(56,189,248,.9)); transform: scale(1.12) rotate(-6deg); }
}

.lf-ring { position: relative; padding: 3px; border-radius: 9999px; flex-shrink: 0; }
.lf-ring::before { content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: conic-gradient(from 0deg, #38bdf8, #a78bfa, #34d399, #38bdf8); animation: lf-spin 6s linear infinite; }
.lf-ring::after { content: ""; position: absolute; inset: -6px; border-radius: inherit; background: inherit;
  box-shadow: 0 0 28px rgba(56,189,248,.35); opacity: .7; animation: lf-glow 3s ease-in-out infinite; pointer-events: none; }
.lf-ring > * { position: relative; z-index: 1; border-radius: 9999px; }
@keyframes lf-spin { to { transform: rotate(360deg); } }
@keyframes lf-glow { 50% { opacity: .2; transform: scale(1.06); } }

.lf-tab { position: relative; overflow: hidden; transition: transform .15s ease, background-color .25s ease, color .25s ease; }
.lf-tab:active { transform: scale(.96); }
.lf-tab svg { transition: transform .3s cubic-bezier(.34,1.56,.64,1); }
.lf-tab:hover svg { transform: translateX(3px) scale(1.2) rotate(-6deg); }
.lf-tab-on svg { animation: lf-icon-nudge .5s cubic-bezier(.34,1.56,.64,1); }
@keyframes lf-icon-nudge { 0% { transform: translateX(-8px) scale(.8); } 100% { transform: none; } }

.lf-nav-indicator {
  position: absolute; left: 0; top: 0; z-index: 0; pointer-events: none;
  border-left: 4px solid #0ea5e9;
  background: linear-gradient(90deg, rgba(14,165,233,.24), rgba(14,165,233,.06));
  box-shadow: inset 0 0 24px rgba(14,165,233,.12);
  transition: transform .5s cubic-bezier(.65,0,.35,1), width .5s cubic-bezier(.65,0,.35,1), height .5s cubic-bezier(.65,0,.35,1), opacity .3s ease;
  will-change: transform;
}
.lf-nav-indicator.no-anim { transition: none; }

.lf-skeleton { padding: 20px; box-sizing: border-box; display: flex; flex-direction: column; gap: 14px;
  background: #10192c; border: 1px solid #30425f; border-radius: 12px;
  animation: lf-fade-in .5s var(--lf-ease-soft) backwards; animation-delay: calc(var(--i, 0) * 60ms); }
.lf-skeleton-top { display: flex; align-items: center; gap: 13px; margin-bottom: 6px; }
.lf-skeleton-lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.lf-skeleton-avatar { width: 64px; height: 64px; border-radius: 50%; flex-shrink: 0; }
.lf-skeleton-line { display: block; height: 12px; border-radius: 6px; }
.lf-skeleton-photo { display: block; aspect-ratio: 4 / 3; border-radius: 10px; }
.w40 { width: 40%; } .w60 { width: 60%; } .w70 { width: 70%; } .w90 { width: 90%; }
.lf-shimmer-bar { background: linear-gradient(90deg, #17243a 0%, #22324d 50%, #17243a 100%); background-size: 800px 100%; animation: lf-shimmer 1.4s linear infinite; }

.lf-lightbox { animation: lf-fade-in .3s var(--lf-ease-soft); }
.lf-lightbox-img { animation: lf-modal-pop .45s var(--lf-ease-out-expo) both; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .lf-orb, .lf-kenburns, .lf-shimmer-text, .lf-vf, .lf-rec, .lf-ring::before, .lf-ring::after,
  .lf-cta::after, .lf-float, .lf-lens, .lf-dot::after, .lf-shimmer-bar, .lf-tab-on svg,
  .lf-header-in, .lf-rise, .lf-focus-pull, .lf-photo, .lf-row, .lf-lightbox, .lf-lightbox-img, .lf-page { animation: none !important; }
  .lf-reveal, .lf-vf { opacity: 1 !important; transform: none !important; filter: none !important; transition: none !important; }
  .lf-nav-indicator { transition: none; }
}
`;

export default function ClientPortalStyles() {
  return <style>{CSS}</style>;
}