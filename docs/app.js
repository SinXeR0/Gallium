// Gallium front end: no build step, hash routing, one file.
// Talks to server.js, or to preview/mock-api.js when the browser-only preview loads it first.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const media = (f) => (window.galliumMedia ? window.galliumMedia(f) : f ? '/media/' + encodeURIComponent(f) : '');
const view = $('#view');
let me = null;

// ---------- icons (pink line icons; filled when active) ----------
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v14H6.5A2.5 2.5 0 0 0 4 19.5a2.5 2.5 0 0 0 2.5 2.5H20"/><path d="M9 7h7M9 11h5"/>',
  shorts: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="m10.5 9 4 3-4 3z"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
  subs: '<rect x="3" y="8" width="18" height="13" rx="2.5"/><path d="M6 5h12M8.5 2h7"/><path d="m10.5 11.5 4 3-4 3z"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20.5l1.5-5A8.5 8.5 0 1 1 21 11.5z"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  roadmap: '<path d="M4 20V11M10 20V4M16 20v-6M2 20h20"/><path d="m8 7 2-3 2 3"/>',
  up: '<path d="M7 10.5V21H3.5V10.5z"/><path d="M7 10.5 11 3a2.6 2.6 0 0 1 2.6 2.6V9h5.4a2 2 0 0 1 2 2.3l-1.3 7.9A2.2 2.2 0 0 1 17.5 21H7"/>',
  down: '<g transform="rotate(180 12 12)"><path d="M7 10.5V21H3.5V10.5z"/><path d="M7 10.5 11 3a2.6 2.6 0 0 1 2.6 2.6V9h5.4a2 2 0 0 1 2 2.3l-1.3 7.9A2.2 2.2 0 0 1 17.5 21H7"/></g>',
  comment: '<path d="M4 4.5h16v11.5H9.5L4 20.5z"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  save: '<path d="M6 3h12v18l-6-4.2L6 21z"/>',
  share: '<path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 13v7h14v-7"/>',
  repost: '<path d="m17 2 3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="m7 22-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  flag: '<path d="M5 21V4h12l-2 4 2 4H5"/>',
  never: '<circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/>',
  boost: '<path d="M12 20V7"/><path d="m6 12 6-6 6 6"/><path d="M5 3h14"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
  pause: '<path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" fill="currentColor" stroke="none"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  photo: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  text: '<path d="M5 6h14M5 12h14M5 18h9"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
  port: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 17v3h16v-3"/>',
  // folder icons
  star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',
  heart: '<path d="M12 20s-7.5-4.6-9-9.3C2 7.2 4.2 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3 0 5.2 2.7 4.2 6.2C19.5 15.4 12 20 12 20z"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  chef: '<path d="M7 14.5A4 4 0 0 1 6.5 6.6 5.5 5.5 0 0 1 17.5 6.6 4 4 0 0 1 17 14.5V20H7z"/><path d="M7 17h10"/>',
  game: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7 10.5v4M5 12.5h4"/><circle cx="15.5" cy="11.5" r="1" fill="currentColor"/><circle cx="17.5" cy="14" r="1" fill="currentColor"/>',
  bolt: '<path d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12z"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  bookmark: '<path d="M6 3h12v18l-6-4.2L6 21z"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  list: '<rect x="3" y="5" width="5" height="4" rx="1"/><rect x="3" y="15" width="5" height="4" rx="1"/><path d="M11 7h10M11 17h10"/>',
  large: '<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M3 20h18"/>',
  arrowup: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowdown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  reorder: '<path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  newfolder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/><path d="M12 11v6M9 14h6"/>',
};
const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const KIND = { text: ['Post', 'text'], photo: ['Photo', 'photo'], short: ['Short', 'shorts'], video: ['Long-form', 'book'], track: ['Track', 'music'] };

// ---------- data ----------
async function api(path, opts = {}) {
  const method = opts.method || (opts.body ? 'POST' : 'GET');
  try {
    if (window.galliumApi) return await window.galliumApi(method, path, opts.body);
    const init = { method, headers: {} };
    if (opts.body instanceof FormData) init.body = opts.body;
    else if (opts.body) { init.body = JSON.stringify(opts.body); init.headers['Content-Type'] = 'application/json'; }
    const res = await fetch('/api' + path, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || 'Something went wrong'); e.status = res.status; throw e; }
    return data;
  } catch (err) {
    if (err.status === 401 && path !== '/me') { me = null; renderAuth(); throw new Error('signed out'); }
    throw err;
  }
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 2600);
}
function ago(ts) {
  const s = (Date.now() - new Date(ts + 'Z').getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
const fmtTime = (sec) => { sec = Math.round(sec || 0); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = String(sec % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`; };
// Every count on Gallium is exact, to the last digit. Never "1.2M".
const fmtN = (n) => Number(n || 0).toLocaleString('en-US');
const count = (n, word) => `<b>${fmtN(n)}</b> ${word}${n === 1 ? '' : 's'}`;
const avatar = (u, cls = '') => `<span class="av ${cls}" style="background:${esc(u?.avatar_color || '#888')}">${esc((u?.display_name || u?.username || '?')[0].toUpperCase())}</span>`;
const postLink = (p) => (p.kind === 'video' ? `#/watch/${p.id}` : p.kind === 'short' ? `#/shorts/${p.id}` : `#/p/${p.id}`);

// Opening something adds it to your private watch history.
const seen = (p) => api(`/posts/${p.id}/view`, { method: 'POST' }).catch(() => {});

// ---------- search: one bar for every part of the app, and every match shows up ----------
// Each word you type has to appear somewhere (title, text, tags or creator). No sampling, no "top results".
const words = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
const matches = (q, ...fields) => { const hay = fields.join(' ').toLowerCase(); return words(q).every((w) => hay.includes(w)); };
const postMatches = (p, q) => matches(q, p.title, p.body, p.tags.join(' '), p.author.username, p.author.display_name);
function searchBar(placeholder, onQuery, value = '') {
  const bar = document.createElement('div');
  bar.className = 'sbar';
  bar.innerHTML = `${icon('search')}<input type="search" placeholder="${esc(placeholder)}" value="${esc(value)}" autocomplete="off" enterkeyhint="search" aria-label="${esc(placeholder)}"><span class="sbar-n" hidden></span><button type="button" class="sbar-x" aria-label="Clear search" ${value ? '' : 'hidden'}>${icon('close')}</button>`;
  const input = $('input', bar), x = $('.sbar-x', bar);
  x.onclick = () => { input.value = ''; input.dispatchEvent(new Event('input')); input.focus(); };
  let timer, seq = 0;
  // Results from an older, slower search never replace a newer one.
  input.oninput = () => { x.hidden = !input.value; clearTimeout(timer); timer = setTimeout(async () => { const n = ++seq, q = input.value.trim(); const shown = await onQuery(q); if (n === seq) bar.count(q ? shown : null); }, 140); };
  bar.count = (n) => { const c = $('.sbar-n', bar); c.hidden = n == null; c.textContent = n == null ? '' : `${fmtN(n)} result${n === 1 ? '' : 's'}`; };
  bar.value = () => input.value.trim();
  return bar;
}

// A repost is a shout-out: just the original's thumbnail, and tapping it opens the original post.
function repostEl(p, reposter) {
  const el = document.createElement('article');
  el.className = 'post repost';
  const cover = p.cover || (p.kind === 'photo' ? p.media : null);
  const title = p.title || p.body || KIND[p.kind][0];
  el.innerHTML = `<div class="reposted">${icon('repost')}@${esc(reposter)} reposted</div>
    <a class="rp-card" href="${postLink(p)}"><span class="si-thumb ${p.kind === 'short' ? 'tall' : ''}">${cover ? `<img src="${media(cover)}" alt="" loading="lazy">` : `<span class="si-text">${esc(title.slice(0, 140))}</span>`}<span class="si-kind">${icon(KIND[p.kind][1])}</span></span>
      <span class="rp-meta"><b>${esc(title.slice(0, 90))}</b><span class="muted">${avatar(p.author)}Original by @${esc(p.author.username)}</span><span class="rp-go">Open the original post</span></span></a>`;
  return el;
}

// Uploads ported from another platform say where they came from, and show that platform's own numbers separately.
const PLAT = (k) => window.GalliumConnect?.PLATFORMS[k] || { name: k, unit: 'follower', color: '#8a9e9f' };
const fmtDay = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
function sourceLine(p) {
  if (!p.source_platform) return '';
  const pl = PLAT(p.source_platform);
  return `<div class="source" style="--pc:${pl.color}">${icon('port')}<span>Ported from <b>${esc(pl.name)}</b> · first posted ${fmtDay(p.source_date)}<br>On ${esc(pl.name)}: ${count(p.source_views, 'view')} · ${count(p.source_likes, 'like')} · ${count(p.source_comments, 'comment')}</span></div>`;
}

// ---------- sheets ----------
function openSheet(html) {
  $('#sheet').innerHTML = html;
  $('#sheet').hidden = $('#sheet-backdrop').hidden = false;
  return $('#sheet');
}
function closeSheet() { $('#sheet').hidden = $('#sheet-backdrop').hidden = true; }
$('#sheet-backdrop').onclick = closeSheet;

// ---------- likes and dislikes, shared by every surface ----------
function reactPill(p) {
  return `<div class="react"><button data-like class="${p.liked ? 'on' : ''}" aria-label="Like">${icon('up')}<span>${fmtN(p.likes)}</span></button><i></i>`
    + `<button data-dislike class="${p.disliked ? 'on' : ''}" aria-label="Dislike">${icon('down')}<span>${fmtN(p.dislikes)}</span></button></div>`;
}
function wireReact(root, p) {
  const paint = () => {
    $$('[data-like]', root).forEach((b) => { b.classList.toggle('on', p.liked); $('span, small', b.closest('[data-wrap]') || b).textContent = fmtN(p.likes); });
    $$('[data-dislike]', root).forEach((b) => { b.classList.toggle('on', p.disliked); $('span, small', b.closest('[data-wrap]') || b).textContent = fmtN(p.dislikes); });
  };
  const go = (which) => async () => { Object.assign(p, await api(`/posts/${p.id}/${which}`, { method: 'POST' })); paint(); };
  $$('[data-like]', root).forEach((b) => (b.onclick = go('like')));
  $$('[data-dislike]', root).forEach((b) => (b.onclick = go('dislike')));
}

// ---------- the ••• menu ----------
function moreMenu(p, onGone) {
  const sheet = openSheet(`
    <h3>${esc(p.title || (p.body || '').slice(0, 60) || KIND[p.kind][0])}</h3>
    ${p.why ? `<p class="why">Why you're seeing this: <b>${esc(p.why.join(' · '))}</b></p>` : ''}
    <button class="opt" data-a="save">${icon('save')}<span class="grow">Save to a folder</span></button>
    <button class="opt" data-a="more">${icon('boost')}<span class="grow">More of this<small>Boost @${esc(p.author.username)}${p.tags.length ? ', ' + p.tags.slice(0, 2).map((t) => '#' + esc(t)).join(', ') : ''}</small></span></button>
    <button class="opt" data-a="never">${icon('never')}<span class="grow">Never show me this<small>Hide it, or block the creator, a topic or a format</small></span></button>
    <button class="opt" data-a="share">${icon('share')}<span class="grow">Share</span></button>
    <button class="opt" data-a="repost">${icon('repost')}<span class="grow">${p.reposted ? 'Undo repost' : 'Repost'}<small>${p.reposted ? 'Remove it from your channel' : 'Show it to your subscribers'}</small></span></button>
    <button class="opt" data-a="stats">${icon('eye')}<span class="grow">View interactions</span></button>
    <button class="opt danger" data-a="report">${icon('flag')}<span class="grow">Report</span></button>`);
  const acts = {
    save: () => saveSheet(p),
    more: async () => { await api(`/posts/${p.id}/more`, { method: 'POST' }); closeSheet(); toast(`You'll see more like this`); },
    never: () => neverSheet(p, onGone),
    share: () => sharePost(p),
    repost: async () => { const r = await api(`/posts/${p.id}/repost`, { method: 'POST' }); Object.assign(p, r); closeSheet(); toast(r.reposted ? 'Reposted to your channel' : 'Repost removed'); },
    stats: () => statsSheet(p),
    report: () => reportSheet(p),
  };
  $$('.opt', sheet).forEach((b) => (b.onclick = acts[b.dataset.a]));
}
// Folders arrive as a flat list; this turns them into rows in tree order with their depth.
function folderTree(list, skip) {
  const kids = {};
  list.forEach((f) => (kids[f.parent_id ?? 0] ||= []).push(f));
  const out = [];
  const walk = (pid, depth) => (kids[pid] || []).forEach((f) => { if (f.id === skip) return; out.push({ ...f, depth }); walk(f.id, depth + 1); });
  walk(0, 0);
  return out;
}
// Folder colors are any hex; older folders may still hold one of the original named colors.
const FCOLORS = { tq: '#7cfcfd', pk: '#fd9efc', violet: '#b9a2ff', blue: '#82b8ff', green: '#8ff0b0', yellow: '#ffe27a', red: '#ff8a9a', white: '#ecfbfb' };
const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c || '');
const fcolor = (f) => (isHex(f.color) ? f.color : FCOLORS[f.color] || FCOLORS.tq);
// A folder icon is any emoji, drawn as a single-color vector (tinted with the folder color), as the
// device's own emoji, or an uploaded picture. Older folders may name one of the built-in line icons.
function fglyph(f) {
  if (f.icon_style === 'image' && f.icon_image) return `<img src="${f.icon_image.startsWith('blob:') ? f.icon_image : media(f.icon_image)}" alt="">`;
  if (ICONS[f.icon] && f.icon_style !== 'native') return icon(f.icon);
  return emo(ICONS[f.icon] ? '📁' : f.icon || '📁', f.icon_style === 'native');
}
// Vector style drops the emoji variation selector so the single-color font is used instead of the color one.
const vec = (e) => e.replace(/\uFE0F/g, '');
const emo = (e, native) => `<span class="emo ${native ? 'native' : 'vector'}">${esc(native ? e : vec(e))}</span>`;
const fbadge = (f) => `<span class="fbadge ${f.icon_style === 'image' && f.icon_image ? 'pic' : ''}" style="--fc:${fcolor(f)}">${fglyph(f)}</span>`;
// The emoji list is ~40 KB, so it loads the first time someone opens the picker.
function loadEmoji() {
  if (window.GALLIUM_EMOJI) return Promise.resolve(window.GALLIUM_EMOJI);
  return (loadEmoji.p ||= new Promise((ok, bad) => { const sc = document.createElement('script'); sc.src = 'emoji.js?v=1792450900'; sc.onload = () => ok(window.GALLIUM_EMOJI); sc.onerror = bad; document.head.append(sc); }));
}
// ---------- color math for the wheel ----------
function hsvToHex(h, s, v) {
  const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return '#' + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
function hexToHsv(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}
// Hue goes around the wheel, saturation out from the middle; the slider under it sets brightness.
function colorWheel(root, start, onChange) {
  root.innerHTML = `<div class="wheel"><div class="wheel-dim"></div><span class="wheel-dot"></span></div>
    <input type="range" class="wheel-v" min="0" max="100" aria-label="Brightness">
    <div class="hexrow"><span class="hex-swatch"></span><input class="hex-in" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Hex code">
      <button type="button" class="btn small" data-copy>Copy</button><button type="button" class="btn small" data-paste>Paste</button></div>`;
  const wheel = $('.wheel', root), dot = $('.wheel-dot', root), dim = $('.wheel-dim', root), vIn = $('.wheel-v', root), hexIn = $('.hex-in', root), sw = $('.hex-swatch', root);
  let hsv = hexToHsv(isHex(start) ? start : FCOLORS.tq);
  const paint = (fromInput) => {
    const hex = hsvToHex(hsv.h, hsv.s, hsv.v), rad = (hsv.h * Math.PI) / 180;
    dot.style.left = 50 + 50 * hsv.s * Math.sin(rad) + '%';
    dot.style.top = 50 - 50 * hsv.s * Math.cos(rad) + '%';
    dot.style.background = hex;
    dim.style.opacity = 1 - hsv.v;
    vIn.value = Math.round(hsv.v * 100);
    vIn.style.setProperty('--hue', hsvToHex(hsv.h, hsv.s, 1));
    sw.style.background = hex;
    if (!fromInput) hexIn.value = hex;
    onChange(hex);
  };
  const pick = (e) => {
    const r = wheel.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
    hsv.h = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
    hsv.s = Math.min(1, Math.hypot(x, y) / (r.width / 2));
    if (hsv.v < 0.15) hsv.v = 1;
    paint();
  };
  wheel.onpointerdown = (e) => { wheel.setPointerCapture(e.pointerId); pick(e); wheel.onpointermove = pick; };
  wheel.onpointerup = wheel.onpointercancel = () => (wheel.onpointermove = null);
  vIn.oninput = () => { hsv.v = vIn.value / 100; paint(); };
  const typed = (val) => {
    let v = val.trim().toLowerCase();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9a-f]{3}$/.test(v)) v = '#' + [...v.slice(1)].map((c) => c + c).join('');
    if (isHex(v)) { hsv = hexToHsv(v); paint(true); return true; }
    return false;
  };
  hexIn.oninput = () => typed(hexIn.value);
  hexIn.onblur = () => (hexIn.value = hsvToHex(hsv.h, hsv.s, hsv.v));
  $('[data-copy]', root).onclick = async () => {
    try { await navigator.clipboard.writeText(hexIn.value); toast(`Copied ${hexIn.value}`); } catch { hexIn.select(); toast('Select the code and copy it'); }
  };
  $('[data-paste]', root).onclick = async () => {
    try { const t = await navigator.clipboard.readText(); if (typed(t)) hexIn.value = t.trim(); else toast(`"${t.slice(0, 12)}" isn't a hex code`); } catch { hexIn.focus(); toast('Paste into the code box'); }
  };
  paint();
}
// ---------- emoji picker: every emoji, searchable, shown in the folder's chosen style ----------
async function emojiPicker(root, cur, onPick) {
  root.innerHTML = `<input class="emo-search" type="search" placeholder="Search emoji" autocomplete="off"><div class="emo-tabs"></div><div class="emo-grid"><div class="empty">Loading…</div></div>`;
  let groups;
  try { groups = (await loadEmoji()).map(([name, list]) => [name, list.split('|').map((x) => { const i = x.indexOf(' '); return [x.slice(0, i), x.slice(i + 1)]; })]); }
  catch { $('.emo-grid', root).innerHTML = '<div class="empty">Couldn’t load the emoji list.</div>'; return; }
  let tab = 0;
  const grid = $('.emo-grid', root), tabs = $('.emo-tabs', root), search = $('.emo-search', root);
  const draw = (list) => { grid.innerHTML = list.map(([e, n]) => `<button type="button" title="${esc(n)}" data-e="${e}" class="${e === cur.icon ? 'on' : ''}"><span class="v">${vec(e)}</span><span class="n">${e}</span></button>`).join('') || '<div class="empty">No emoji match that.</div>'; };
  const TAB = ['😀', '👋', '🐵', '🍇', '🌍', '⚽', '💡', '❤', '🏁'];
  tabs.innerHTML = groups.map(([name], i) => `<button type="button" data-g="${i}" title="${name}" aria-label="${name}" class="${i ? '' : 'on'}">${TAB[i] || '•'}</button>`).join('');
  $$('button', tabs).forEach((b) => (b.onclick = () => { tab = +b.dataset.g; search.value = ''; $$('button', tabs).forEach((x) => x.classList.toggle('on', x === b)); draw(groups[tab][1]); }));
  search.oninput = () => {
    const q = search.value.trim().toLowerCase();
    draw(q ? groups.flatMap((g) => g[1]).filter(([e, n]) => n.includes(q)).slice(0, 300) : groups[tab][1]);
  };
  grid.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; $$('button.on', grid).forEach((x) => x.classList.remove('on')); b.classList.add('on'); onPick(b.dataset.e); };
  draw(groups[0][1]);
}
async function saveSheet(p) {
  const folders = await api('/folders?post=' + p.id);
  const rows = folderTree(folders);
  const sheet = openSheet(`<h3>Save to a folder</h3><p class="why">Tap a folder to add or remove this. Tap + to make a folder inside one.</p>
    <div class="ftree">${rows.map((f) => `<div class="frow ${f.contains ? 'on' : ''}" style="--depth:${f.depth}">
      <button class="opt" data-id="${f.id}">${fbadge(f)}<span class="grow">${esc(f.name)}<small>${f.count} saved${f.folders ? ` · ${f.folders} folder${f.folders > 1 ? 's' : ''}` : ''}</small></span>${f.contains ? icon('check', 'check') : ''}</button>
      <button class="icon-btn" data-sub="${f.id}" aria-label="New folder inside ${esc(f.name)}">${icon('plus')}</button></div>`).join('')}</div>
    <form id="nf" class="nf-row"><input id="nf-name" name="name" placeholder="New folder name" maxlength="60" autocomplete="off">
      <select name="parent" aria-label="Put it inside"><option value="">Top level</option>${rows.map((f) => `<option value="${f.id}">${'– '.repeat(f.depth)}${esc(f.name)}</option>`).join('')}</select>
      <button class="btn primary">Create and save</button></form>`);
  $$('[data-id]', sheet).forEach((b) => (b.onclick = async () => {
    const r = await api(`/folders/${b.dataset.id}/toggle`, { body: { post_id: p.id } });
    p.saved = r.saved || folders.some((f) => f.contains && String(f.id) !== b.dataset.id);
    toast(r.saved ? `Saved to ${r.folder}` : `Removed from ${r.folder}`);
    saveSheet(p);
  }));
  $$('[data-sub]', sheet).forEach((b) => (b.onclick = () => { $('#nf select', sheet).value = b.dataset.sub; $('#nf-name', sheet).focus(); }));
  $('#nf', sheet).onsubmit = async (e) => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    if (!name) return $('#nf-name', sheet).focus();
    const f = await api('/folders', { body: { name, parent_id: e.target.parent.value || null } });
    await api(`/folders/${f.id}/toggle`, { body: { post_id: p.id } });
    p.saved = true;
    toast(`Saved to ${f.name}`);
    saveSheet(p);
  };
}
function neverSheet(p, onGone) {
  const opts = [
    ['post', '', 'never', 'Hide this post', 'It never comes back'],
    ['creator', '', 'user', `Never show @${p.author.username}`, 'Nothing from this creator, anywhere'],
    ...p.tags.map((t) => ['tag', t, 'never', `Never show #${t}`, 'Anything tagged with this topic']),
    ['kind', '', KIND[p.kind][1], `Never show ${KIND[p.kind][0].toLowerCase()}s`, 'Turn off this whole format'],
  ];
  const sheet = openSheet(`<h3>Never show me this</h3><p class="why">Pick how far to go. You can undo any of it in Feed controls.</p>
    ${opts.map(([s, t, ic, l, sub]) => `<button class="opt" data-scope="${s}" data-target="${esc(t)}">${icon(ic)}<span class="grow">${esc(l)}<small>${esc(sub)}</small></span></button>`).join('')}`);
  $$('.opt', sheet).forEach((b) => (b.onclick = async () => {
    await api(`/posts/${p.id}/never`, { body: { scope: b.dataset.scope, target: b.dataset.target } });
    closeSheet();
    toast(b.dataset.scope === 'post' ? 'Hidden. It won’t come back.' : 'Done. You won’t see that again.');
    onGone?.();
  }));
}
async function sharePost(p) {
  const url = location.href.split('#')[0] + postLink(p);
  closeSheet();
  try { if (navigator.share) { await navigator.share({ title: p.title || 'Gallium', url }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast(url); }
}
async function statsSheet(p) {
  const s = await api(`/posts/${p.id}/interactions`);
  const people = (list) => list.length ? `<div class="people">${list.map((u) => `<a href="#/u/${esc(u.username)}">${avatar(u)}${esc(u.display_name)}</a>`).join('')}</div>` : '<p class="muted" style="margin:0">Nobody yet.</p>';
  openSheet(`<h3>Interactions</h3>
    <div class="stat-row"><div><b>${fmtN(s.likes)}</b><span>Likes</span></div><div><b>${fmtN(s.dislikes)}</b><span>Dislikes</span></div><div><b>${fmtN(s.comments)}</b><span>Comments</span></div><div><b>${fmtN(s.reposts)}</b><span>Reposts</span></div><div><b>${fmtN(s.saves)}</b><span>Saves</span></div></div>
    <h2 style="margin-top:6px">Liked by</h2>${people(s.likers)}
    <h2>Reposted by</h2>${people(s.reposters)}
    <p class="why" style="margin-top:16px">Who disliked or saved something stays private. Only the counts are public.</p>`);
  $$('#sheet .people a').forEach((a) => a.addEventListener('click', closeSheet));
}
function reportSheet(p) {
  const reasons = ['Spam or scam', 'Harassment or bullying', 'Hate speech', 'Violence or threats', 'Nudity or sexual content', 'False information', 'Something else'];
  const sheet = openSheet(`<h3>Report</h3><p class="why">What's wrong with this post? Reports go to Gallium's moderators, and the creator doesn't see who sent them.</p>
    ${reasons.map((r) => `<button class="opt" data-r="${esc(r)}">${icon('flag')}<span class="grow">${esc(r)}</span></button>`).join('')}`);
  $$('.opt', sheet).forEach((b) => (b.onclick = async () => { await api(`/posts/${p.id}/report`, { body: { reason: b.dataset.r } }); closeSheet(); toast('Thanks. The report was sent.'); }));
}
async function commentsSheet(p) {
  const sheet = openSheet(`<h3>Comments</h3><div id="cbox"></div>`);
  await renderComments(p, $('#cbox', sheet));
}
async function renderComments(p, box) {
  const list = await api(`/posts/${p.id}/comments`);
  box.innerHTML = `${list.map((c) => `<div class="comment">${avatar(c)}<div><b>${esc(c.display_name)}</b> <span class="muted" style="font-size:12px">${ago(c.created_at)}</span><p>${esc(c.body)}</p></div></div>`).join('') || '<p class="muted">No comments yet. Start it off.</p>'}
    <form class="comment-form"><input name="body" placeholder="Add a comment" autocomplete="off" aria-label="Comment"><button class="btn primary">Post</button></form>`;
  $('form', box).onsubmit = async (e) => {
    e.preventDefault();
    const body = e.target.body.value.trim();
    if (!body) return;
    await api(`/posts/${p.id}/comments`, { body: { body } });
    p.comments++;
    renderComments(p, box);
  };
}

// ---------- feed post ----------
function postEl(p, { reposter } = {}) {
  const el = document.createElement('article');
  el.className = 'post';
  let body = '';
  if (p.kind === 'photo') body = `<a class="media" href="#/p/${p.id}"><img src="${media(p.media)}" alt="${esc(p.body || 'Photo')}" loading="lazy"></a>`;
  if (p.kind === 'short') body = `<div class="media vertical"><video src="${media(p.media)}" poster="${media(p.cover)}" controls playsinline preload="none"></video></div>`;
  if (p.kind === 'video') body = `<a class="thumb" href="#/watch/${p.id}"><img src="${media(p.cover)}" alt="" loading="lazy"><span class="play">${icon('play')}</span><span class="dur">${fmtTime(p.duration)}</span></a>`;
  if (p.kind === 'track') body = `<div class="track-row"><img src="${media(p.cover)}" alt=""><div style="flex:1;min-width:0"><b>${esc(p.title)}</b><div class="muted">${esc(p.author.display_name)} · ${fmtTime(p.duration)}</div></div><button class="play-circle" data-play aria-label="Play">${icon('play')}</button></div>`;
  const repostLine = reposter || (p.why || []).find((w) => w.startsWith('Reposted by'));
  el.innerHTML = `
    ${repostLine ? `<div class="reposted">${icon('repost')}${esc(reposter ? 'Reposted by @' + reposter : repostLine)}</div>` : ''}
    <div class="post-head">${avatar(p.author)}<a class="who" href="#/u/${esc(p.author.username)}"><b>${esc(p.author.display_name)}</b><div class="muted">@${esc(p.author.username)} · ${ago(p.created_at)}</div></a><span class="kind">${KIND[p.kind][0]}</span></div>
    ${p.title && p.kind !== 'track' ? `<p class="post-title">${p.kind === 'video' ? `<a href="#/watch/${p.id}">${esc(p.title)}</a>` : esc(p.title)}</p>` : ''}
    ${p.body && p.kind !== 'video' && p.kind !== 'track' ? `<p class="post-body">${esc(p.body)}</p>` : ''}
    ${body}
    ${sourceLine(p)}
    ${p.tags.length ? `<div class="tags">${p.tags.map((t) => `<a>#${esc(t)}</a>`).join('')}</div>` : ''}
    <div class="actions">${reactPill(p)}<button class="chip-btn" data-comments>${icon('comment')}<span>${fmtN(p.comments)}</span></button><span class="spacer"></span><button class="icon-btn" data-more aria-label="More options">${icon('more')}</button></div>`;
  wireReact(el, p);
  $('[data-comments]', el).onclick = () => commentsSheet(p);
  $('[data-more]', el).onclick = () => moreMenu(p, () => { el.style.transition = 'opacity .25s'; el.style.opacity = 0; setTimeout(() => el.remove(), 250); });
  const play = $('[data-play]', el);
  if (play) play.onclick = () => Player.play(p, [p]);
  return el;
}
// A post that reaches you only because someone you follow reposted it shows as a repost card.
function renderPosts(list, box, empty) {
  box.innerHTML = '';
  if (!list.length) box.innerHTML = `<div class="empty">${empty}</div>`;
  list.forEach((p) => {
    const by = (p.why || []).find((w) => w.startsWith('Reposted by @'));
    const direct = (p.why || []).includes('You subscribe to this creator') || p.author.id === me.id;
    box.append(by && !direct ? repostEl(p, by.slice('Reposted by @'.length)) : postEl(p));
  });
}

// ---------- views ----------
const FILTERS = [['', 'For you', 'sparkle'], ['text,photo', 'Posts', 'text'], ['short', 'Shorts', 'shorts'], ['video', 'Long-form', 'book'], ['track', 'Music', 'music']];
let feedFilter = '';
function renderRail() {
  $('#rrail').innerHTML = `<div class="label">Show</div>
    ${FILTERS.map(([k, l, ic]) => `<button class="ftab ${k === feedFilter ? 'on' : ''}" data-k="${k}">${icon(ic)}${l}</button>`).join('')}
    <a class="controls-link" href="#/controls">${icon('sliders')}Feed controls</a>`;
  $$('#rrail .ftab').forEach((b) => (b.onclick = () => { feedFilter = b.dataset.k; closeDrawers(); renderRail(); if (route.section === 'home') homeView(); else location.hash = '#/'; }));
}
async function homeView() {
  view.innerHTML = `<div class="page"><div id="feed"><div class="empty">Loading…</div></div></div>`;
  const posts = await api('/feed?limit=40' + (feedFilter ? '&kinds=' + feedFilter : ''));
  renderPosts(posts, $('#feed'), `Nothing here. You may have blocked it all. <a href="#/controls">Check feed controls</a>.`);
}
async function postView(id) {
  const p = await api('/posts/' + id);
  seen(p);
  view.innerHTML = `<div class="page"><div id="one"></div><div class="comments-panel" id="cbox"></div></div>`;
  $('#one').append(postEl(p));
  renderComments(p, $('#cbox'));
}

function vtile(p) {
  return `<a class="vtile" href="#/watch/${p.id}"><span class="thumb"><img src="${media(p.cover)}" alt="" loading="lazy"><span class="dur">${fmtTime(p.duration)}</span></span>
    <span class="meta">${avatar(p.author)}<span><b>${esc(p.title)}</b><span class="muted">${esc(p.author.display_name)} · ${ago(p.created_at)} · ${fmtN(p.likes)} likes</span></span></span></a>`;
}
async function longView() {
  view.innerHTML = `<div class="page wide"><div id="sb"></div><div class="vgrid" id="grid"></div></div>`;
  const list = await api('/feed?kinds=video&limit=60');
  const draw = (items, q) => ($('#grid').innerHTML = items.map(vtile).join('') || `<div class="empty">${q ? `No long-form videos match “${esc(q)}”.` : 'No long-form videos yet.'}</div>`);
  $('#sb').replaceWith(searchBar('Search all long-form', async (q) => { const items = q ? (await api('/search?kinds=video&q=' + encodeURIComponent(q))).posts : list; draw(items, q); return items.length; }));
  draw(list);
}
// The watch page follows the user's sketch: player, likes and dislikes with •••, description, channel, comments, then the next videos.
async function watchView(id) {
  const [p, rest] = await Promise.all([api('/posts/' + id), api('/feed?kinds=video&limit=20')]);
  const ch = await api('/users/' + encodeURIComponent(p.author.username));
  Player.pause();
  seen(p);
  setTitle(p.title);
  view.innerHTML = `<div class="watch">
    <video class="watch-player" src="${media(p.media)}" poster="${media(p.cover)}" controls autoplay playsinline></video>
    <div class="watch-body">
      <div class="watch-bar">${reactPill(p)}<span class="spacer"></span><button class="chip-btn" data-save aria-label="Save">${icon('save', p.saved ? 'fill' : '')}</button><button class="icon-btn" data-more aria-label="More options">${icon('more')}</button></div>
      <div class="desc" id="desc"><h1>${esc(p.title)}</h1><div class="meta">${ago(p.created_at)}${p.tags.length ? ' · ' + p.tags.map((t) => '#' + esc(t)).join(' ') : ''}</div>
        ${sourceLine(p)}
        ${p.body ? `<div class="text">${esc(p.body)}</div><button class="toggle" id="desc-toggle">Show more</button>` : ''}</div>
      <div class="channel-card"><a href="#/u/${esc(p.author.username)}">${avatar(p.author, 'lg')}</a><a href="#/u/${esc(p.author.username)}"><b>${esc(p.author.display_name)}</b></a>
        <span class="muted" id="subs-n">${count(ch.followers, 'subscriber')}</span>
        ${p.author.id === me.id ? '' : `<button class="btn ${ch.isFollowing ? '' : 'primary'}" id="sub">${ch.isFollowing ? 'Subscribed' : 'Subscribe'}</button>`}</div>
      <button class="comments-bar" id="cbar">${icon('comment')}Comments <span class="count">${fmtN(p.comments)}</span></button>
      <div class="comments-panel" id="cbox" hidden></div>
      <div class="next-label">Up next</div>
      <div class="next-list">${rest.filter((r) => r.id !== p.id).map(vtile).join('') || '<p class="muted">That’s everything for now.</p>'}</div>
    </div></div>`;
  wireReact(view, p);
  $('[data-more]').onclick = () => moreMenu(p, () => (location.hash = '#/long'));
  $('[data-save]').onclick = () => saveSheet(p);
  if ($('#desc-toggle')) $('#desc-toggle').onclick = (e) => { const d = $('#desc'); d.classList.toggle('open'); e.target.textContent = d.classList.contains('open') ? 'Show less' : 'Show more'; };
  if ($('#sub')) $('#sub').onclick = async (e) => { const r = await api(`/users/${p.author.id}/follow`, { method: 'POST' }); e.target.textContent = r.following ? 'Subscribed' : 'Subscribe'; e.target.classList.toggle('primary', !r.following); $('#subs-n').innerHTML = count(r.followers, 'subscriber'); };
  $('#cbar').onclick = () => { const box = $('#cbox'); box.hidden = !box.hidden; if (!box.hidden) renderComments(p, box); };
}

async function shortsView(startId) {
  view.innerHTML = `<div class="shorts" id="shorts"></div>`;
  let list = await api('/feed?kinds=short&limit=50');
  if (startId) { const i = list.findIndex((p) => String(p.id) === startId); if (i > 0) list = [...list.slice(i), ...list.slice(0, i)]; }
  const wrap = $('#shorts');
  if (!list.length) return (wrap.innerHTML = '<div class="empty">No shorts to show.</div>');
  for (const p of list) {
    const s = document.createElement('section');
    s.className = 'short';
    s.dataset.id = p.id;
    s.innerHTML = `<div class="short-frame">
      <video src="${media(p.media)}" poster="${media(p.cover)}" loop playsinline preload="metadata"></video>
      <div class="tap-hint">${icon('play')}</div>
      <div class="overlay"><a class="who-row" href="#/u/${esc(p.author.username)}">${avatar(p.author)}@${esc(p.author.username)}</a>
        <div style="margin-top:8px;line-height:1.4">${esc(p.title || p.body || '')}</div>
        <div class="tags">${p.tags.map((t) => `<a>#${esc(t)}</a>`).join('')}</div></div>
      <div class="rail">
        <div data-wrap><button data-like class="${p.liked ? 'on' : ''}" aria-label="Like">${icon('up')}</button><small>${fmtN(p.likes)}</small></div>
        <div data-wrap><button data-dislike class="${p.disliked ? 'on' : ''}" aria-label="Dislike">${icon('down')}</button><small>${fmtN(p.dislikes)}</small></div>
        <div><button data-comments aria-label="Comments">${icon('comment')}</button><small>${fmtN(p.comments)}</small></div>
        <div><button data-more aria-label="More options">${icon('more')}</button><small>More</small></div>
      </div></div>`;
    const v = $('video', s);
    $('.short-frame', s).addEventListener('click', (e) => { if (e.target.closest('.rail, a')) return; v.paused ? v.play() : v.pause(); });
    v.onplay = () => s.classList.remove('paused'); v.onpause = () => s.classList.add('paused');
    wireReact(s, p);
    $('[data-comments]', s).onclick = () => commentsSheet(p);
    $('[data-more]', s).onclick = () => moreMenu(p, () => { v.pause(); s.remove(); });
    wrap.append(s);
  }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    const v = $('video', en.target);
    if (en.isIntersecting) { Player.pause(); v.play().catch(() => en.target.classList.add('paused')); seen({ id: en.target.dataset.id }); } else v.pause();
  }), { threshold: 0.6 });
  $$('.short', wrap).forEach((s) => io.observe(s));
  cleanup = () => { io.disconnect(); $$('video', wrap).forEach((v) => v.pause()); };
}

async function musicView() {
  const all = await api('/feed?kinds=track&limit=100');
  let tracks = all;
  view.innerHTML = `<div class="page">
    <div class="music-hero">${icon('music')}<div><h1>Music</h1><div class="muted">Tracks from creators on Gallium, ranked by your taste.</div>
      <button class="btn primary" style="margin-top:12px" id="playall">${icon('play')}Play all</button></div></div>
    <div id="sb"></div><div id="tracks"></div></div>`;
  const draw = (q) => {
    $('#tracks').innerHTML = tracks.map((t, i) => `<div class="track" data-i="${i}" data-id="${t.id}"><img src="${media(t.cover)}" alt=""><div style="min-width:0"><b>${esc(t.title)}</b><div class="muted">${esc(t.author.display_name)} · ${t.tags.map((x) => '#' + esc(x)).join(' ')}</div></div>
      <span class="muted">${fmtTime(t.duration)}</span><button class="icon-btn" data-more aria-label="More options">${icon('more')}</button></div>`).join('') || `<div class="empty">${q ? `No tracks match “${esc(q)}”.` : 'No tracks yet.'}</div>`;
    $$('.track').forEach((row) => {
      const t = tracks[row.dataset.i];
      row.onclick = (e) => { if (e.target.closest('button')) return; Player.play(t, tracks); };
      $('[data-more]', row).onclick = () => moreMenu(t, () => row.remove());
    });
    Player.highlight();
  };
  $('#sb').replaceWith(searchBar('Search all music', async (q) => { tracks = q ? (await api('/search?kinds=track&q=' + encodeURIComponent(q))).posts : all; draw(q); return tracks.length; }));
  $('#playall').onclick = () => tracks.length && Player.play(tracks[0], tracks);
  draw();
}

// Folders are their own space: folders inside folders, each with its own color, icon, tile shape,
// layout and order, and a format filter on the right like the home feed.
const FKINDS = [['', 'Everything', 'sparkle'], ['text,photo', 'Posts', 'text'], ['short', 'Shorts', 'shorts'], ['video', 'Long-form', 'book'], ['track', 'Music', 'music']];
let folderFilter = '';
function folderTile(f, reorder) {
  const bits = [f.total ? `${fmtN(f.total)} saved` : 'Empty', f.folders ? `${fmtN(f.folders)} folder${f.folders > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
  return `<div class="folder shape-${f.shape || 'rounded'}" style="--fc:${fcolor(f)}" data-fid="${f.id}">
    <a href="#/folders/${f.id}" class="cover">${f.icon_style === 'image' && f.icon_image ? `<span class="pic-cover">${fglyph(f)}</span>` : (f.cover ? `<img src="${media(f.cover)}" alt="">` : '') + fbadge(f)}</a>
    <b>${esc(f.name)}</b><span class="muted">${bits}</span>
    ${reorder ? `<div class="mover"><button data-mv="-1" aria-label="Move earlier">${icon('arrowup')}</button><button data-mv="1" aria-label="Move later">${icon('arrowdown')}</button></div>` : ''}</div>`;
}
function savedItem(p, layout, reorder) {
  const cover = p.cover || (p.kind === 'photo' ? p.media : null);
  const title = p.title || p.body || '';
  const mover = reorder ? `<div class="mover"><button data-mv="-1" aria-label="Move earlier">${icon('arrowup')}</button><button data-mv="1" aria-label="Move later">${icon('arrowdown')}</button><button data-rm aria-label="Remove from folder">${icon('close')}</button></div>` : '';
  if (layout === 'list') return `<div class="sitem row-item" data-pid="${p.id}"><a href="${postLink(p)}" class="si-thumb">${cover ? `<img src="${media(cover)}" alt="" loading="lazy">` : icon(KIND[p.kind][1])}</a>
    <a href="${postLink(p)}" class="grow"><b>${esc(title.slice(0, 90))}</b><span class="muted">${icon(KIND[p.kind][1])}${KIND[p.kind][0]} · ${esc(p.author.display_name)}</span></a>${mover}</div>`;
  return `<div class="sitem tile-item" data-pid="${p.id}"><a href="${postLink(p)}" class="si-thumb ${p.kind === 'short' ? 'tall' : ''}">${cover ? `<img src="${media(cover)}" alt="" loading="lazy">` : `<span class="si-text">${esc(title.slice(0, 120))}</span>`}<span class="si-kind">${icon(KIND[p.kind][1])}</span></a>
    <a href="${postLink(p)}"><b>${esc(title.slice(0, 70))}</b><span class="muted">${esc(p.author.display_name)}</span></a>${mover}</div>`;
}
function folderRail(f) {
  const n = (k) => (k ? f.posts.filter((p) => k.split(',').includes(p.kind)).length : f.posts.length);
  $('#rrail').innerHTML = `<div class="label">In this folder</div>
    ${FKINDS.map(([k, l, ic]) => `<button class="ftab ${k === folderFilter ? 'on' : ''}" data-k="${k}">${icon(ic)}<span class="grow">${l}</span><small>${n(k)}</small></button>`).join('')}`;
  $$('#rrail .ftab').forEach((b) => (b.onclick = () => { folderFilter = b.dataset.k; closeDrawers(); folderRail(f); drawFolder(f); }));
}
let folderReorder = false, folderQuery = '';
function drawFolder(f) {
  const q = folderQuery;
  const items = f.posts.filter((p) => (!folderFilter || folderFilter.split(',').includes(p.kind)) && (!q || postMatches(p, q)));
  const kids = q ? f.children.filter((c) => matches(q, c.name)) : f.children;
  const box = $('#fbody');
  box.innerHTML = `${kids.length ? `<h4 class="fsec">Folders</h4><div class="fgrid">${kids.map((c) => folderTile(c, folderReorder && !q)).join('')}</div>` : ''}
    <h4 class="fsec">${folderFilter ? FKINDS.find((k) => k[0] === folderFilter)[1] : 'Saved'}</h4>
    <div class="sitems layout-${f.layout}" id="fposts"></div>`;
  const list = $('#fposts');
  if (!items.length) list.innerHTML = `<div class="empty">${q ? `Nothing in this folder matches “${esc(q)}”.` : f.posts.length ? 'Nothing in this format here.' : 'Nothing saved here yet. Use ••• then “Save to a folder” on anything you want to keep.'}</div>`;
  else if (f.layout === 'large' && !folderReorder) items.forEach((p) => list.append(postEl(p)));
  else list.innerHTML = items.map((p) => savedItem(p, f.layout === 'list' ? 'list' : 'grid', folderReorder && !q)).join('');
  return items.length + kids.length;
  // Reordering swaps neighbours (within the visible format) and saves the whole order.
  $$('.folder [data-mv]', box).forEach((b) => (b.onclick = async () => {
    const i = f.children.findIndex((c) => c.id === +b.closest('[data-fid]').dataset.fid), j = i + +b.dataset.mv;
    if (j < 0 || j >= f.children.length) return;
    [f.children[i], f.children[j]] = [f.children[j], f.children[i]];
    drawFolder(f);
    await api('/folders/reorder', { body: { ids: f.children.map((c) => c.id) } });
  }));
  $$('.sitem [data-mv]', box).forEach((b) => (b.onclick = async () => {
    const pid = +b.closest('[data-pid]').dataset.pid, vi = items.findIndex((p) => p.id === pid), other = items[vi + +b.dataset.mv];
    if (!other) return;
    const i = f.posts.indexOf(items[vi]), j = f.posts.indexOf(other);
    [f.posts[i], f.posts[j]] = [f.posts[j], f.posts[i]];
    drawFolder(f);
    await api(`/folders/${f.id}/reorder`, { body: { post_ids: f.posts.map((p) => p.id) } });
  }));
  $$('.sitem [data-rm]', box).forEach((b) => (b.onclick = async () => {
    const pid = +b.closest('[data-pid]').dataset.pid;
    await api(`/folders/${f.id}/toggle`, { body: { post_id: pid } });
    f.posts = f.posts.filter((p) => p.id !== pid);
    folderRail(f); drawFolder(f); toast(`Removed from ${f.name}`);
  }));
}
// One sheet for making and customizing a folder: name, color, icon, tile shape, layout, and where it lives.
async function folderSheet(f, { parentId = null, onDone } = {}) {
  const isNew = !f;
  const cur = { name: '', color: '#7cfcfd', icon: '📁', icon_style: 'vector', icon_image: null, shape: 'rounded', layout: 'grid', parent_id: parentId, ...(f || {}) };
  cur.color = fcolor(cur);
  if (ICONS[cur.icon]) cur.icon = '📁';
  let imageFile = null;
  const all = await api('/folders');
  const places = folderTree(all, f?.id);
  const pick = (key, opts, render) => `<div class="pickrow" data-key="${key}">${opts.map((o) => `<button type="button" class="pk-opt ${cur[key] === o ? 'on' : ''}" data-v="${o}">${render(o)}</button>`).join('')}</div>`;
  const sheet = openSheet(`<h3>${isNew ? 'New folder' : 'Customize folder'}</h3>
    <form id="fs" class="fs">
      <div class="fs-preview" id="fs-prev"></div>
      <div class="field"><label for="fs-name">Name</label><input id="fs-name" name="name" maxlength="60" value="${esc(cur.name)}" placeholder="Folder name" autocomplete="off"></div>
      <div class="field"><label>Color</label><div id="fs-color"></div></div>
      <div class="field"><label>Icon</label>${pick('icon_style', ['vector', 'native', 'image'], (k) => ({ vector: 'Vector', native: 'Your device', image: 'Image' }[k]))}
        <div id="fs-emoji" class="fs-emoji"></div>
        <div id="fs-image" class="fs-image"><label class="btn"><input type="file" accept="image/*" id="fs-file" hidden>${icon('photo')}<span>${cur.icon_image ? 'Change picture' : 'Upload a picture'}</span></label><p class="muted">Any picture you want. Your folders are private.</p></div></div>
      <div class="field"><label>Tile shape</label>${pick('shape', ['rounded', 'square', 'circle'], (s) => `<span class="shape-demo ${s}"></span>${s[0].toUpperCase() + s.slice(1)}`)}</div>
      <div class="field"><label>Show saved items as</label>${pick('layout', ['grid', 'list', 'large'], (l) => icon(l) + { grid: 'Grid', list: 'List', large: 'Full posts' }[l])}</div>
      <div class="field"><label for="fs-parent">Inside</label><select id="fs-parent" name="parent"><option value="">Top level</option>${places.map((p) => `<option value="${p.id}" ${String(p.id) === String(cur.parent_id ?? '') ? 'selected' : ''}>${'– '.repeat(p.depth)}${esc(p.name)}</option>`).join('')}</select></div>
      <div class="err" id="fs-err"></div>
      <button class="btn primary block">${isNew ? 'Create folder' : 'Save changes'}</button>
      ${isNew ? '' : `<button type="button" class="btn danger block" id="fs-del" style="margin-top:8px">${icon('trash')}Delete folder</button>`}
    </form>`);
  const preview = () => {
    $('#fs-prev', sheet).innerHTML = folderTile({ ...cur, name: $('#fs-name', sheet).value || 'Folder name', total: f?.total || 0, folders: f?.folders || 0, cover: null });
    $('#fs-emoji', sheet).style.setProperty('--fc', cur.color);
    $('#fs-emoji', sheet).classList.toggle('native', cur.icon_style === 'native');
    $('#fs-emoji', sheet).hidden = cur.icon_style === 'image';
    $('#fs-image', sheet).hidden = cur.icon_style !== 'image';
  };
  $$('.pickrow', sheet).forEach((row) => $$('.pk-opt', row).forEach((b) => (b.onclick = () => {
    cur[row.dataset.key] = b.dataset.v;
    $$('.pk-opt', row).forEach((x) => x.classList.toggle('on', x === b));
    preview();
  })));
  colorWheel($('#fs-color', sheet), cur.color, (hex) => { cur.color = hex; if ($('#fs-prev', sheet).firstChild) preview(); });
  emojiPicker($('#fs-emoji', sheet), cur, (e) => { cur.icon = e; preview(); });
  $('#fs-file', sheet).onchange = (e) => {
    imageFile = e.target.files[0] || null;
    if (!imageFile) return;
    if (imageFile.size > 10 * 1024 * 1024) { imageFile = null; return toast('Images up to 10 MB'); }
    cur.icon_image = URL.createObjectURL(imageFile);
    preview();
  };
  $('#fs-name', sheet).oninput = preview;
  preview();
  if (isNew) $('#fs-name', sheet).focus();
  $('#fs', sheet).onsubmit = async (e) => {
    e.preventDefault();
    const style = cur.icon_style === 'image' && !imageFile && !f?.icon_image ? 'vector' : cur.icon_style;
    const body = { name: $('#fs-name', sheet).value.trim(), color: cur.color, icon: cur.icon, icon_style: style, shape: cur.shape, layout: cur.layout, parent_id: $('#fs-parent', sheet).value || null };
    if (!body.name) return ($('#fs-err', sheet).textContent = 'Name the folder');
    try {
      let saved = isNew ? await api('/folders', { body }) : await api('/folders/' + f.id, { method: 'PATCH', body });
      if (imageFile && style === 'image') { const fd = new FormData(); fd.append('image', imageFile); saved = await api(`/folders/${saved.id}/image`, { body: fd }); }
      closeSheet(); toast(isNew ? `Made ${saved.name}` : 'Folder updated'); onDone?.(saved);
    } catch (err) { $('#fs-err', sheet).textContent = err.message; }
  };
  if ($('#fs-del', sheet)) $('#fs-del', sheet).onclick = (e) => {
    const b = e.currentTarget;
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.lastChild.textContent = f.folders ? 'Tap again: deletes the folders inside too' : 'Tap again to delete'; return; }
    api('/folders/' + f.id, { method: 'DELETE' }).then(() => { closeSheet(); toast('Folder deleted'); location.hash = f.parent_id ? '#/folders/' + f.parent_id : '#/folders'; });
  };
}
async function foldersView(id) {
  if (!id) {
    const all = await api('/folders');
    const top = all.filter((f) => !f.parent_id);
    let q = '';
    // Searching here looks through every folder's name, nested ones included.
    const shown = () => (q ? folderTree(all).filter((f) => matches(q, f.name)) : top);
    const grid = () => { const list = shown(); $('#fgrid').innerHTML = list.map((f) => folderTile(f, folderReorder && !q)).join('') || `<div class="empty">No folder is called “${esc(q)}”.</div>`; wireMove(); return list.length; };
    const wireMove = () => $$('[data-mv]').forEach((b) => (b.onclick = async () => {
      const i = top.findIndex((c) => c.id === +b.closest('[data-fid]').dataset.fid), j = i + +b.dataset.mv;
      if (j < 0 || j >= top.length) return;
      [top[i], top[j]] = [top[j], top[i]];
      grid();
      await api('/folders/reorder', { body: { ids: top.map((c) => c.id) } });
    }));
    const draw = () => {
      view.innerHTML = `<div class="page"><div id="sb"></div><div class="ftools"><button class="btn small primary" id="newf">${icon('newfolder')}New folder</button><button class="btn small ${folderReorder ? 'on' : ''}" id="ford">${icon('reorder')}${folderReorder ? 'Done' : 'Reorder'}</button></div>
        <div class="fgrid" id="fgrid"></div></div>`;
      $('#sb').replaceWith(searchBar('Search your folders', (v) => { q = v; return grid(); }, q));
      grid();
      $('#newf').onclick = () => folderSheet(null, { onDone: (n) => (location.hash = '#/folders/' + n.id) });
      $('#ford').onclick = () => { folderReorder = !folderReorder; draw(); };
    };
    draw();
    return;
  }
  const f = await api('/folders/' + id);
  if (folderView.id !== f.id) { folderFilter = ''; folderQuery = ''; folderView.id = f.id; }
  setTitle(f.name);
  view.innerHTML = `<div class="page">
    <nav class="crumbs"><a href="#/folders">Folders</a>${f.path.map((p) => `<span>›</span><a href="#/folders/${p.id}">${esc(p.name)}</a>`).join('')}<span>›</span><b>${esc(f.name)}</b></nav>
    <div class="fhead" style="--fc:${fcolor(f)}">${fbadge(f)}<div class="grow"><h2>${esc(f.name)}</h2><span class="muted">${fmtN(f.count)} saved here${f.children.length ? ` · ${fmtN(f.children.length)} folder${f.children.length > 1 ? 's' : ''}` : ''}</span></div></div>
    <div id="sb"></div>
    <div class="ftools"><button class="btn small" id="fsub">${icon('newfolder')}New folder inside</button><button class="btn small" id="fedit">${icon('edit')}Customize</button><button class="btn small ${folderReorder ? 'on' : ''}" id="ford">${icon('reorder')}${folderReorder ? 'Done' : 'Reorder'}</button></div>
    <div id="fbody"></div></div>`;
  $('#sb').replaceWith(searchBar(`Search ${f.name}`, (q) => { folderQuery = q; return drawFolder(f); }, folderQuery));
  folderRail(f);
  drawFolder(f);
  $('#fsub').onclick = () => folderSheet(null, { parentId: f.id, onDone: () => foldersView(id) });
  $('#fedit').onclick = () => folderSheet(f, { onDone: () => foldersView(id) });
  $('#ford').onclick = (e) => { folderReorder = !folderReorder; e.currentTarget.classList.toggle('on', folderReorder); e.currentTarget.lastChild.textContent = folderReorder ? 'Done' : 'Reorder'; drawFolder(f); };
}
const folderView = { id: null };

async function subsView() {
  const [subs, posts] = await Promise.all([api('/subscriptions'), api('/feed?scope=subs&limit=60')]);
  view.innerHTML = `<div class="page"><div id="sb"></div><div class="subs-row" id="srow"></div><div id="sposts"></div></div>`;
  const row = (list) => ($('#srow').innerHTML = list.map((u) => `<a href="#/u/${esc(u.username)}">${avatar(u, 'lg')}<span>${esc(u.display_name.split(' ')[0])}</span></a>`).join('') || `<span class="muted">${subs.length ? 'No channel by that name.' : 'You haven’t subscribed to anyone yet.'}</span>`);
  $('#sb').replaceWith(searchBar('Search your subscriptions', async (q) => {
    if (!q) { row(subs); renderPosts(posts, $('#sposts'), 'New posts from channels you subscribe to show up here, newest first.'); return; }
    const found = (await api('/search?scope=subs&q=' + encodeURIComponent(q))).posts, chans = subs.filter((u) => matches(q, u.username, u.display_name));
    row(chans);
    renderPosts(found, $('#sposts'), `Nothing from your subscriptions matches “${esc(q)}”.`);
    return found.length + chans.length;
  }));
  row(subs);
  renderPosts(posts, $('#sposts'), 'New posts from channels you subscribe to show up here, newest first.');
}

// Watch history: private, searchable, and gone for good when you clear it.
async function historyView() {
  const all = await api('/history');
  view.innerHTML = `<div class="page"><div id="sb"></div><div class="ftools"><span class="muted grow">Only you can see this. ${fmtN(all.length)} item${all.length === 1 ? '' : 's'}.</span>${all.length ? '<button class="btn small danger" id="hclear">' + icon('trash') + 'Clear history</button>' : ''}</div><div class="sitems layout-list" id="hlist"></div></div>`;
  const draw = (q) => {
    const list = q ? all.filter((p) => postMatches(p, q)) : all;
    $('#hlist').innerHTML = list.map((p) => savedItem(p, 'list').replace('</span></a>', ` · ${ago(p.viewed_at)}</span></a>`)).join('') || `<div class="empty">${q ? `Nothing in your history matches “${esc(q)}”.` : 'Nothing here yet. Anything you watch, read or listen to shows up here.'}</div>`;
    return list.length;
  };
  $('#sb').replaceWith(searchBar('Search your history', draw));
  draw('');
  if ($('#hclear')) $('#hclear').onclick = (e) => {
    const b = e.currentTarget;
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.lastChild.textContent = 'Tap again to erase it all'; return; }
    api('/history', { method: 'DELETE' }).then(() => { toast('History cleared'); historyView(); });
  };
}

// Search everything on Gallium: people and every post that matches, filtered by format.
async function searchView(start) {
  let kind = '', res = { users: [], posts: [] }, q = start || '';
  view.innerHTML = `<div class="page"><div id="sb"></div><div class="tabs" id="stabs"></div><div id="speople"></div><div id="sres"></div></div>`;
  const draw = () => {
    const n = (k) => (k ? res.posts.filter((p) => k.split(',').includes(p.kind)).length : res.posts.length);
    $('#stabs').hidden = !q;
    $('#stabs').innerHTML = FKINDS.map(([k, l]) => `<button data-k="${k}" class="${k === kind ? 'on' : ''}">${k ? l : 'All'}<small>${fmtN(n(k))}</small></button>`).join('');
    $$('#stabs button').forEach((b) => (b.onclick = () => { kind = b.dataset.k; draw(); }));
    $('#speople').innerHTML = res.users.length ? `<h2>People</h2><div class="people">${res.users.map((u) => `<a href="#/u/${esc(u.username)}">${avatar(u)}${esc(u.display_name)}</a>`).join('')}</div><h2>Posts</h2>` : '';
    const list = kind ? res.posts.filter((p) => kind.split(',').includes(p.kind)) : res.posts;
    if (!q) $('#sres').innerHTML = '<div class="empty">Search every post, video, short, song and person on Gallium. Every match shows up, not just a few.</div>';
    else renderPosts(list, $('#sres'), `Nothing matches “${esc(q)}”. Check the spelling, or try fewer words.`);
  };
  const run = async (v) => {
    q = v;
    history.replaceState(null, '', '#/search' + (q ? '?q=' + encodeURIComponent(q) : ''));
    res = q ? await api('/search?q=' + encodeURIComponent(q)) : { users: [], posts: [] };
    draw();
    return res.posts.length + res.users.length;
  };
  const bar = searchBar('Search Gallium', run, q);
  $('#sb').replaceWith(bar);
  $('input', bar).focus();
  if (q) bar.count(await run(q)); else draw();
}

// ---------- linked platforms ----------
// Each linked platform keeps its own verified stats card. Gallium's own numbers stay the main ones.
function linksBlock(links, mine) {
  if (!links.length && !mine) return '';
  return `<div class="links">${links.map((l) => { const pl = PLAT(l.platform); return `<div class="link-card" style="--pc:${pl.color}" data-lid="${l.id}">
      <div class="lc-head"><b>${esc(pl.name)}</b><span class="muted">@${esc(l.handle)}</span><span class="verified">${icon('shield')}Verified</span></div>
      <div class="lc-stats">${count(l.followers, pl.unit)} · ${count(l.uploads, 'upload')} · ${count(l.views, 'view')} · ${count(l.likes, 'like')} · ${count(l.comments, 'comment')}</div>
      <div class="muted lc-when">Numbers from ${esc(pl.name)}, verified ${ago(l.verified_at)}</div>
      ${mine ? `<div class="lc-row"><button class="btn small primary" data-port>${icon('port')}Port uploads</button><button class="btn small" data-tell>${icon('share')}Tell your fans</button><button class="btn small danger" data-unlink>Unlink</button></div>` : ''}</div>`; }).join('')}
    ${mine ? `<button class="btn" id="addlink">${icon('link')}${links.length ? 'Link another platform' : 'Bring your channel from another platform'}</button>` : ''}</div>`;
}
function wireLinks(d, mine, refresh) {
  if (!mine) return;
  $('#addlink').onclick = () => linkSheet(refresh);
  $$('.link-card').forEach((card) => {
    const l = d.links.find((x) => x.id === +card.dataset.lid);
    $('[data-port]', card).onclick = () => portSheet(l, refresh);
    $('[data-tell]', card).onclick = () => tellSheet(l);
    $('[data-unlink]', card).onclick = (e) => {
      const b = e.currentTarget;
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again to unlink'; return; }
      api('/links/' + l.id, { method: 'DELETE' }).then(() => { toast(`Unlinked ${PLAT(l.platform).name}. Ported uploads stay on Gallium.`); refresh(); });
    };
  });
}
// Linking: pick the platform, sign in there, and allow Gallium to read the channel. Only the owner can link it.
function linkSheet(refresh) {
  const P = window.GalliumConnect.PLATFORMS;
  const sheet = openSheet(`<h3>Bring your channel</h3><p class="why">Link the account you already have. You'll sign in there to prove it's yours, so nobody can link a channel that isn't theirs.</p>
    <div class="plat-grid">${Object.entries(P).map(([k, pl]) => `<button class="plat" data-p="${k}" style="--pc:${pl.color}"><span class="dot"></span>${esc(pl.name)}</button>`).join('')}</div>`);
  $$('.plat', sheet).forEach((b) => (b.onclick = () => step2(b.dataset.p)));
  const step2 = (k) => {
    const pl = P[k];
    sheet.innerHTML = `<h3>Link ${esc(pl.name)}</h3><p class="why">What's your handle on ${esc(pl.name)}?</p>
      <form id="lf"><div class="field"><input name="handle" placeholder="@yourname" autocomplete="off" autocapitalize="off" spellcheck="false"></div><div class="err" id="lerr"></div>
      <button class="btn primary block" style="--pc:${pl.color}">Sign in with ${esc(pl.name)}</button></form>`;
    $('input', sheet).focus();
    $('#lf', sheet).onsubmit = (e) => {
      e.preventDefault();
      const handle = e.target.handle.value.trim().replace(/^@/, '');
      if (handle.length < 2) return ($('#lerr', sheet).textContent = 'Enter your handle');
      consent(k, handle);
    };
  };
  // Stands in for the platform's own sign-in page until Gallium has developer keys for it.
  const consent = (k, handle) => {
    const pl = P[k];
    sheet.innerHTML = `<div class="consent" style="--pc:${pl.color}"><div class="c-brand">${esc(pl.name)}</div>
      <p><b>Gallium</b> wants to:</p><ul><li>See your ${esc(pl.name)} channel name and stats</li><li>See your uploads so you can bring them over</li></ul>
      <p class="muted">It can't post, edit or delete anything on ${esc(pl.name)}.</p>
      <p class="demo-note">Preview: this sign-in is simulated. The real app opens ${esc(pl.name)}'s own sign-in page.</p>
      <div class="err" id="lerr"></div>
      <div class="lc-row"><button class="btn" id="deny">Cancel</button><button class="btn primary" id="allow">Allow as @${esc(handle)}</button></div></div>`;
    $('#deny', sheet).onclick = closeSheet;
    $('#allow', sheet).onclick = async () => {
      try {
        const l = await api('/links', { body: { platform: k, handle } });
        sheet.innerHTML = `<h3>${icon('shield')} ${esc(pl.name)} verified</h3><p class="why">@${esc(l.handle)} is linked. Its stats now show on your channel as their own card, and nothing gets mixed into your Gallium numbers.</p>
          <button class="btn primary block" id="portnow">${icon('port')}Port uploads now</button><button class="btn block" id="later" style="margin-top:8px">Later</button>`;
        $('#portnow', sheet).onclick = () => portSheet(l, refresh);
        $('#later', sheet).onclick = () => { closeSheet(); refresh(); };
      } catch (err) { $('#lerr', sheet).textContent = err.message; }
    };
  };
}
// Pick single uploads or select all. Each one comes over on its own, so a big library takes a while.
async function portSheet(l, refresh) {
  const pl = PLAT(l.platform);
  const sheet = openSheet(`<h3>Port from ${esc(pl.name)}</h3><div class="empty">Loading your uploads…</div>`);
  const list = await api(`/links/${l.id}/uploads`);
  const pick = new Set();
  const left = list.filter((u) => !u.imported);
  const thumb = (u) => (u.cover || (u.kind === 'photo' ? u.media : null));
  sheet.innerHTML = `<h3>Port from ${esc(pl.name)}</h3><p class="why">${fmtN(list.length)} uploads on @${esc(l.handle)}${list.length - left.length ? `, ${fmtN(list.length - left.length)} already here` : ''}. Each keeps its original date and its ${esc(pl.name)} numbers.</p>
    <div class="port-bar"><label class="chk"><input type="checkbox" id="pall" ${left.length ? '' : 'disabled'}><span>Select all</span></label><span class="muted" id="pn">0 selected</span></div>
    <div class="port-list">${list.map((u) => `<label class="port-item ${u.imported ? 'done' : ''}"><input type="checkbox" data-sid="${esc(u.source_id)}" ${u.imported ? 'disabled checked' : ''}>
      <span class="si-thumb">${thumb(u) ? `<img src="${media(thumb(u))}" alt="" loading="lazy">` : `<span class="si-text">${esc(u.body || '')}</span>`}<span class="si-kind">${icon(KIND[u.kind][1])}</span></span>
      <span class="pi-meta"><b>${esc(u.title || u.body || KIND[u.kind][0])}</b><span class="muted">${KIND[u.kind][0]} · ${fmtDay(u.date)} · ${count(u.views, 'view')}</span>${u.imported ? '<span class="pi-done">Already on Gallium</span>' : ''}</span></label>`).join('')}</div>
    <div class="port-go"><div class="progress" hidden><span></span></div><div class="muted" id="pstat"></div><button class="btn primary block" id="pgo" disabled>Port uploads</button></div>`;
  const paint = () => {
    $('#pn', sheet).textContent = `${fmtN(pick.size)} selected`;
    $('#pgo', sheet).disabled = !pick.size;
    $('#pgo', sheet).textContent = pick.size ? `Port ${fmtN(pick.size)} upload${pick.size === 1 ? '' : 's'}` : 'Port uploads';
    $('#pall', sheet).checked = left.length > 0 && pick.size === left.length;
  };
  $$('[data-sid]:not(:disabled)', sheet).forEach((c) => (c.onchange = () => { c.checked ? pick.add(c.dataset.sid) : pick.delete(c.dataset.sid); paint(); }));
  $('#pall', sheet).onchange = (e) => { $$('[data-sid]:not(:disabled)', sheet).forEach((c) => { c.checked = e.target.checked; c.checked ? pick.add(c.dataset.sid) : pick.delete(c.dataset.sid); }); paint(); };
  $('#pgo', sheet).onclick = async () => {
    const ids = list.filter((u) => pick.has(u.source_id)).reverse(); // oldest first, so newer uploads stay on top
    $$('input', sheet).forEach((c) => (c.disabled = true));
    $('#pgo', sheet).disabled = true;
    const bar = $('.progress', sheet); bar.hidden = false;
    let done = 0;
    for (const u of ids) {
      $('#pstat', sheet).textContent = `Porting ${fmtN(done + 1)} of ${fmtN(ids.length)}: ${u.title || u.body || KIND[u.kind][0]}`;
      try { await api(`/links/${l.id}/import`, { body: { source_id: u.source_id } }); } catch (err) { $('#pstat', sheet).textContent = err.message; return; }
      done++;
      $('span', bar).style.width = (done / ids.length) * 100 + '%';
      const row = $(`[data-sid="${CSS.escape(u.source_id)}"]`, sheet)?.closest('.port-item');
      if (row) row.classList.add('done');
    }
    $('#pstat', sheet).textContent = `Done. ${fmtN(done)} upload${done === 1 ? '' : 's'} ported to your channel.`;
    $('#pgo', sheet).disabled = false;
    $('#pgo', sheet).textContent = 'See your channel';
    $('#pgo', sheet).onclick = () => { closeSheet(); refresh(); };
  };
  paint();
}
// A ready-made post for the old platform, so active fans know where to find you.
function tellSheet(l) {
  const pl = PLAT(l.platform);
  const url = location.href.split('#')[0] + '#/u/' + me.username;
  const text = `I'm moving to Gallium! No ads, nothing creepy, and creators keep 90%+ of what fans send. Everything I've posted here is coming with me. Follow me there: ${url}`;
  const sheet = openSheet(`<h3>Tell your fans on ${esc(pl.name)}</h3><p class="why">Post this as a community post or pinned post on ${esc(pl.name)}. Edit it however you like.</p>
    <textarea id="tell" rows="5">${esc(text)}</textarea><button class="btn primary block" id="tcopy" style="margin-top:10px">${icon('share')}Copy post</button>`);
  $('#tcopy', sheet).onclick = async () => {
    const t = $('#tell', sheet).value;
    try { await navigator.clipboard.writeText(t); toast('Copied. Paste it on ' + pl.name); } catch { $('#tell', sheet).select(); toast('Select the text and copy it'); }
  };
}

async function channelView(username) {
  const d = await api('/users/' + encodeURIComponent(username));
  const mine = d.user.id === me.id;
  setTitle(mine ? 'Your channel' : d.user.display_name);
  const TABS = [['all', 'All'], ['video', 'Long-form'], ['short', 'Shorts'], ['posts', 'Posts'], ['track', 'Music'], ['reposts', 'Reposts']];
  const inTab = (t) => (t === 'reposts' ? d.reposts : d.posts.filter((p) => t === 'all' || (t === 'posts' ? ['text', 'photo'].includes(p.kind) : p.kind === t)));
  let tab = 'all', q = '';
  view.innerHTML = `<div class="banner"></div><div class="page" style="padding-top:0">
    <div class="channel-head">${avatar(d.user, 'xl')}<h1>${esc(d.user.display_name)}</h1><div class="muted">@${esc(d.user.username)}</div>
      <div class="stats"><span id="subs-n">${count(d.followers, 'subscriber')}</span> · ${count(d.posts.length, 'upload')} · ${count(d.following, 'subscription')}</div>
      ${d.user.bio ? `<div class="bio">${esc(d.user.bio)}</div>` : ''}
      ${linksBlock(d.links, mine)}
      <div class="row">${mine
        ? '<button class="btn" id="edit">Edit channel</button><button class="btn" id="logout">Sign out</button>' + (window.galliumReset ? '<button class="btn danger" id="reset">Reset demo</button>' : '')
        : `<button class="btn ${d.isFollowing ? '' : 'primary'}" id="sub">${d.isFollowing ? 'Subscribed' : 'Subscribe'}</button><a class="btn" href="#/messages/${d.user.id}">${icon('chat')}Message</a>`}</div></div>
    <div class="tabs">${TABS.map(([k, l], i) => `<button data-t="${k}" class="${i ? '' : 'on'}">${l}<small>${fmtN(inTab(k).length)}</small></button>`).join('')}</div>
    <div id="sb"></div><div id="cposts"></div></div>`;
  const label = () => TABS.find((x) => x[0] === tab)[1];
  const show = () => {
    const list = inTab(tab).filter((p) => !q || postMatches(p, q));
    $('#cposts').innerHTML = '';
    if (!list.length) $('#cposts').innerHTML = `<div class="empty">${q ? `Nothing in ${tab === 'all' ? 'this channel' : label()} matches “${esc(q)}”.` : 'Nothing here yet.'}</div>`;
    list.forEach((p) => $('#cposts').append(tab === 'reposts' ? repostEl(p, d.user.username) : postEl(p)));
    return list.length;
  };
  const bar = searchBar(`Search ${d.user.display_name}'s channel`, (v) => { q = v; return show(); });
  $('#sb').replaceWith(bar);
  // The search bar searches whichever section is open.
  $$('.tabs button').forEach((b) => (b.onclick = () => {
    $$('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
    tab = b.dataset.t;
    $('input', bar).placeholder = tab === 'all' ? `Search ${d.user.display_name}'s channel` : `Search ${label()} on this channel`;
    bar.count(q ? show() : (show(), null));
  }));
  show();
  wireLinks(d, mine, () => channelView(username));
  if (mine) {
    $('#logout').onclick = async () => { await api('/logout', { method: 'POST' }); me = null; location.hash = '#/'; renderAuth(); };
    if ($('#reset')) $('#reset').onclick = () => { window.galliumReset(); toast('Demo reset'); location.hash = '#/'; boot(); };
    $('#edit').onclick = () => {
      const sheet = openSheet(`<h3>Edit channel</h3><form id="pf" style="margin-top:12px"><div class="field"><label for="pf-name">Channel name</label><input id="pf-name" name="display_name" value="${esc(d.user.display_name)}"></div>
        <div class="field"><label for="pf-bio">About</label><textarea id="pf-bio" name="bio" rows="3">${esc(d.user.bio)}</textarea></div><button class="btn primary block">Save</button></form>`);
      $('#pf', sheet).onsubmit = async (e) => { e.preventDefault(); await api('/me', { method: 'PATCH', body: Object.fromEntries(new FormData(e.target)) }); me = await api('/me'); closeSheet(); renderNav(); channelView(username); };
    };
  } else {
    $('#sub').onclick = async (e) => { const r = await api(`/users/${d.user.id}/follow`, { method: 'POST' }); e.target.textContent = r.following ? 'Subscribed' : 'Subscribe'; e.target.classList.toggle('primary', !r.following); $('#subs-n').innerHTML = count(r.followers, 'subscriber'); };
  }
}

async function messagesView(otherId) {
  const thread = otherId ? await api('/messages/' + otherId) : null; // loads first so it is marked read
  const convos = await api('/conversations');
  view.innerHTML = `<div class="dm-layout ${otherId ? 'in-chat' : ''}">
    <div class="dm-list"><div class="head"><input id="dm-q" type="search" placeholder="Search chats and people" autocomplete="off" aria-label="Search chats and people"><div id="dmsearch"></div></div>
      <div id="convos"></div>
    </div>
    <div class="chat" id="chat">${otherId ? '' : '<div class="chat-empty">Pick a conversation, or search for someone to message.</div>'}</div></div>`;
  const drawConvos = (list, query) => ($('#convos').innerHTML = list.map((c) => `<a class="dm-item ${String(c.user.id) === otherId ? 'active' : ''}" href="#/messages/${c.user.id}">${avatar(c.user)}<div class="who"><b>${esc(c.user.display_name)}</b><div class="preview">${c.last.sender_id === me.id ? 'You: ' : ''}${esc(c.last.body)}</div></div>${c.unread ? `<span class="unread">${fmtN(c.unread)}</span>` : ''}</a>`).join('')
    || `<div class="muted" style="padding:16px">${query ? `No chat mentions “${esc(query)}”.` : 'No conversations yet.'}</div>`);
  drawConvos(convos);
  // Searches the names and every message in your chats, plus people you could start a chat with.
  const q = $('#dm-q');
  let seq = 0;
  q.oninput = async () => {
    const v = q.value.trim(), n = ++seq;
    if (!v) { $('#dmsearch').innerHTML = ''; return drawConvos(convos); }
    const [found, r] = await Promise.all([api('/conversations?q=' + encodeURIComponent(v)), api('/search?q=' + encodeURIComponent(v))]);
    if (n !== seq) return;
    drawConvos(found, v);
    const talked = new Set(found.map((c) => c.user.id));
    const people = r.users.filter((u) => u.id !== me.id && !talked.has(u.id));
    $('#dmsearch').innerHTML = people.length ? `<div class="muted dm-label">Start a chat</div>` + people.map((u) => `<a class="dm-item" href="#/messages/${u.id}">${avatar(u)}<div class="who"><b>${esc(u.display_name)}</b><div class="preview">@${esc(u.username)}</div></div></a>`).join('') : '';
  };
  if (!otherId) return;
  const { user, messages } = thread;
  refreshUnread();
  setTitle(user.display_name);
  $('#chat').innerHTML = `<div class="chat-head"><a href="#/messages" class="icon-btn only-phone" aria-label="Back">${icon('back')}</a>${avatar(user)}<a class="who" href="#/u/${esc(user.username)}"><b>${esc(user.display_name)}</b><div class="muted">@${esc(user.username)}</div></a></div>
    <div class="chat-log" id="log"></div>
    <form class="chat-form" id="send"><input name="body" placeholder="Message @${esc(user.username)}" autocomplete="off" aria-label="Message"><button class="btn primary">Send</button></form>`;
  const log = $('#log');
  const addMsg = (m) => { $('.chat-empty', log)?.remove(); const d = document.createElement('div'); d.className = 'bubble' + (m.sender_id === me.id ? ' mine' : ''); d.textContent = m.body; log.append(d); log.scrollTop = log.scrollHeight; };
  messages.forEach(addMsg);
  if (!messages.length) log.innerHTML = `<div class="chat-empty">Say hi to ${esc(user.display_name)}.</div>`;
  $('#send').onsubmit = async (e) => {
    e.preventDefault();
    const body = e.target.body.value.trim();
    if (!body) return;
    e.target.body.value = '';
    await api('/messages/' + otherId, { body: { body } });
  };
  activeChat = { otherId: Number(otherId), addMsg };
}
let activeChat = null;

function createView() {
  let kind = 'text';
  const fields = {
    text: { title: false, file: null, cover: false, hint: '' },
    photo: { title: false, file: 'image/*', cover: false, hint: 'Choose a photo' },
    short: { title: true, file: 'video/*', cover: false, hint: 'Choose a vertical video (under 3 minutes)' },
    video: { title: true, file: 'video/*', cover: true, hint: 'Choose a video, any length' },
    track: { title: true, file: 'audio/*', cover: true, hint: 'Choose an audio file (mp3, m4a, wav, ogg)' },
  };
  view.innerHTML = `<div class="page">
    <div class="kind-picker">${Object.entries(KIND).map(([k, [l, ic]]) => `<button data-k="${k}" class="${k === kind ? 'on' : ''}">${icon(ic)}${l}</button>`).join('')}</div>
    <form id="cform">
      <div class="field" data-f="title"><label for="c-title">Title</label><input id="c-title" name="title" maxlength="140"></div>
      <div class="field" data-f="file"><label class="drop" id="drop"><input type="file" name="media"><span id="droptext"></span></label></div>
      <div class="field" data-f="cover"><label for="c-cover">Cover image (optional)</label><input id="c-cover" type="file" name="cover" accept="image/*"></div>
      <div class="field"><label id="bodylabel" for="c-body">What's on your mind?</label><textarea id="c-body" name="body" rows="4" maxlength="5000"></textarea></div>
      <div class="field"><label for="c-tags">Tags (people can boost or block these)</label><input id="c-tags" name="tags" placeholder="e.g. gaming, cooking, hiphop"></div>
      <div class="err" id="cerr"></div>
      <button class="btn primary block">Publish</button>
    </form></div>`;
  const form = $('#cform');
  const apply = () => {
    const f = fields[kind];
    $('[data-f=title]').hidden = !f.title;
    $('[data-f=file]').hidden = !f.file;
    $('[data-f=cover]').hidden = !f.cover;
    form.media.accept = f.file || '';
    form.media.value = '';
    $('#drop').classList.remove('has');
    $('#droptext').textContent = f.hint;
    $('#bodylabel').textContent = kind === 'text' ? "What's on your mind?" : kind === 'track' ? 'About this track (optional)' : 'Description (optional)';
  };
  $$('.kind-picker button').forEach((b) => (b.onclick = () => { kind = b.dataset.k; $$('.kind-picker button').forEach((x) => x.classList.toggle('on', x === b)); apply(); }));
  form.media.onchange = () => { const f = form.media.files[0]; $('#drop').classList.toggle('has', !!f); $('#droptext').textContent = f ? `${f.name} (${(f.size / 1e6).toFixed(1)} MB)` : fields[kind].hint; };
  apply();
  form.onsubmit = async (e) => {
    e.preventDefault();
    $('#cerr').textContent = '';
    const fd = new FormData(form);
    fd.set('kind', kind);
    const file = form.media.files[0];
    if (!file) fd.delete('media');
    if (!form.cover.files[0]) fd.delete('cover');
    const btn = $('button.primary', form);
    try {
      if (file && kind !== 'photo') {
        const meta = await probeMedia(file, kind === 'track' ? 'audio' : 'video');
        fd.set('duration', meta.duration);
        if (kind !== 'track' && !form.cover.files[0] && meta.poster) fd.set('cover', meta.poster, 'cover.jpg');
      }
      btn.disabled = true; btn.textContent = 'Uploading…';
      await api('/posts', { body: fd });
      toast('Published');
      location.hash = { text: '#/', photo: '#/', short: '#/shorts', video: '#/long', track: '#/music' }[kind];
    } catch (err) {
      $('#cerr').textContent = err.message;
      btn.disabled = false; btn.textContent = 'Publish';
    }
  };
}
// Read duration in the browser, and grab a poster frame for videos.
function probeMedia(file, type) {
  return new Promise((resolve) => {
    const el = document.createElement(type);
    el.preload = 'metadata'; el.muted = true; el.src = URL.createObjectURL(file);
    el.onerror = () => resolve({ duration: 0 });
    el.onloadedmetadata = () => {
      const duration = el.duration;
      if (type === 'audio') return resolve({ duration });
      el.currentTime = Math.min(1, duration / 3);
      el.onseeked = () => {
        const c = document.createElement('canvas');
        c.width = el.videoWidth; c.height = el.videoHeight;
        c.getContext('2d').drawImage(el, 0, 0);
        c.toBlob((poster) => resolve({ duration, poster }), 'image/jpeg', 0.85);
      };
    };
  });
}

async function controlsView() {
  const { rules, hiddenCount } = await api('/prefs');
  const blocks = rules.filter((r) => r.action === 'block'), boosts = rules.filter((r) => r.action === 'boost');
  const ruleRow = (r) => `<div class="rule" data-id="${r.id}"><span class="pill ${r.action}">${r.action === 'block' ? 'Never' : 'More'}</span><span class="label">${esc(r.label)}</span>
    ${r.action === 'boost' ? `<input type="range" min="1" max="10" value="${r.weight}" aria-label="How much more">` : ''}<button class="btn small danger" data-del>Remove</button></div>`;
  view.innerHTML = `<div class="page">
    <div class="explainer">This is the whole algorithm. Your feed is ranked by <b>how new a post is</b>, <b>who you subscribe to</b>, <b>what they repost</b>, a little bit of <b>what's popular</b>, and <b>the rules below</b>. A <b>Never</b> rule is absolute: matching content is removed before ranking, everywhere. <b>More</b> rules push things up, and the slider sets how hard. Nothing else is hidden from you.</div>
    <h2>Never show me</h2>${blocks.map(ruleRow).join('') || '<div class="muted">Nothing blocked. Use ••• on anything to block it.</div>'}
    <h2>Show me more of</h2>${boosts.map(ruleRow).join('') || '<div class="muted">No boosts yet. Use ••• then “More of this” on anything you like.</div>'}
    <h2>Add a rule</h2>
    <form class="add-rule" id="addrule">
      <select name="action" aria-label="Rule"><option value="boost">More of</option><option value="block">Never show</option></select>
      <select name="target_type" aria-label="Kind of rule"><option value="tag">#topic</option><option value="creator">@creator</option><option value="kind">format</option></select>
      <input name="target" placeholder="e.g. cooking" required aria-label="Topic or creator">
      <button class="btn primary">Add</button>
    </form><div class="err" id="rerr"></div>
    <h2>Hidden posts</h2><div class="rule"><span class="label">${hiddenCount} post${hiddenCount === 1 ? '' : 's'} hidden one by one</span>${hiddenCount ? '<button class="btn small" id="unhide">Unhide all</button>' : ''}</div></div>`;
  const form = $('#addrule');
  form.target_type.onchange = () => {
    if (form.target_type.value === 'kind') form.target.outerHTML = `<select name="target" aria-label="Format">${Object.entries(KIND).map(([k, [l]]) => `<option value="${k}">${l}s</option>`).join('')}</select>`;
    else if (form.target.tagName === 'SELECT') form.target.outerHTML = `<input name="target" placeholder="${form.target_type.value === 'tag' ? 'e.g. cooking' : 'username'}" required aria-label="Topic or creator">`;
    else form.target.placeholder = form.target_type.value === 'tag' ? 'e.g. cooking' : 'username';
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/prefs', { body: Object.fromEntries(new FormData(form)) }); controlsView(); } catch (err) { $('#rerr').textContent = err.message; }
  };
  $$('.rule[data-id]').forEach((row) => {
    $('[data-del]', row).onclick = async () => { await api('/prefs/' + row.dataset.id, { method: 'DELETE' }); row.remove(); };
    const range = $('input[type=range]', row);
    if (range) range.onchange = () => api('/prefs/' + row.dataset.id, { method: 'PATCH', body: { weight: range.value } });
  });
  if ($('#unhide')) $('#unhide').onclick = async () => { await api('/hidden', { method: 'DELETE' }); controlsView(); };
}

async function roadmapView() {
  const all = await api('/roadmap');
  let items = all;
  view.innerHTML = `<div class="page">
    <div class="explainer">Gallium gets built in the order you vote for. Suggest a feature or report something broken, and upvote what matters to you. The top of this list is what gets worked on next.</div>
    <form id="rmform" style="margin:16px 0 22px;display:grid;gap:8px">
      <div style="display:flex;gap:8px"><select name="kind" style="width:auto" aria-label="Type"><option value="idea">Idea</option><option value="fix">Fix</option></select><input name="title" placeholder="What should change?" maxlength="140" required aria-label="Title"></div>
      <textarea name="body" rows="2" placeholder="Details (optional)" aria-label="Details"></textarea>
      <div style="display:flex;justify-content:flex-end"><button class="btn primary">Submit</button></div></form>
    <div id="sb"></div><div id="rmlist"></div></div>`;
  const draw = (q) => {
    items = q ? all.filter((i) => matches(q, i.title, i.body, i.kind, i.username)) : all;
    $('#rmlist').innerHTML = items.map((i) => `<div class="rm-item"><button class="vote ${i.voted ? 'on' : ''}" data-id="${i.id}" aria-label="Vote">${icon('up')}<b>${fmtN(i.votes)}</b></button><div style="min-width:0"><span class="pill ${i.kind === 'fix' ? 'block' : 'boost'}">${i.kind}</span> <b>${esc(i.title)}</b><div class="muted" style="margin-top:4px;font-size:14px">${esc(i.body || '')}</div><div class="muted" style="font-size:12px;margin-top:6px">@${esc(i.username)} · ${ago(i.created_at)}</div></div></div>`).join('') || `<div class="empty">${q ? `No idea or fix matches “${esc(q)}”. Suggest it above.` : 'Nothing suggested yet.'}</div>`;
    $$('.vote').forEach((b) => (b.onclick = async () => { await api(`/roadmap/${b.dataset.id}/vote`, { method: 'POST' }); roadmapView(); }));
    return items.length;
  };
  $('#sb').replaceWith(searchBar('Search ideas and fixes', draw));
  $('#rmform').onsubmit = async (e) => { e.preventDefault(); await api('/roadmap', { body: Object.fromEntries(new FormData(e.target)) }); roadmapView(); };
  draw('');
}

// ---------- music player (keeps playing across pages) ----------
const Player = {
  audio: $('#audio'), queue: [], i: 0,
  play(track, queue) { this.queue = queue; this.i = Math.max(0, queue.findIndex((t) => t.id === track.id)); this.load(); },
  load() {
    const t = this.queue[this.i];
    if (!t) return;
    this.audio.src = media(t.media);
    seen(t);
    this.audio.play().catch(() => {});
    $('#player').hidden = false;
    document.body.classList.add('has-player');
    $('#player-cover').src = media(t.cover);
    $('#player-title').textContent = t.title;
    $('#player-artist').textContent = t.author.display_name;
    this.highlight();
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.author.display_name, artwork: [{ src: media(t.cover) }] });
  },
  pause() { if (!this.audio.paused) this.audio.pause(); },
  highlight() {
    const cur = this.queue[this.i];
    const playing = cur && !$('#player').hidden ? cur.id : null;
    $$('#tracks .track').forEach((r) => r.classList.toggle('playing', playing !== null && r.dataset.id === String(playing)));
  },
};
$('#player-toggle').innerHTML = icon('pause');
$('#player-close').innerHTML = icon('close');
Player.audio.onplay = () => ($('#player-toggle').innerHTML = icon('pause'));
Player.audio.onpause = () => ($('#player-toggle').innerHTML = icon('play'));
Player.audio.ontimeupdate = () => { if (Player.audio.duration) $('#player-seek').value = (Player.audio.currentTime / Player.audio.duration) * 100; };
Player.audio.onended = () => { if (Player.i < Player.queue.length - 1) { Player.i++; Player.load(); } };
$('#player-seek').oninput = (e) => { if (Player.audio.duration) Player.audio.currentTime = (e.target.value / 100) * Player.audio.duration; };
$('#player-toggle').onclick = () => (Player.audio.paused ? Player.audio.play() : Player.audio.pause());
$('#player-close').onclick = () => { Player.audio.pause(); $('#player').hidden = true; document.body.classList.remove('has-player'); Player.highlight(); };

// ---------- side rails: always visible on wide screens, swipe-in drawers on phones ----------
const NAV = [['home', '#/', 'home', 'Home'], ['long', '#/long', 'book', 'Long-form'], ['shorts', '#/shorts', 'shorts', 'Short-form'], ['music', '#/music', 'music', 'Music'],
  ['create', '#/create', 'plus', 'Create'], ['folders', '#/folders', 'folder', 'Folders'], ['subs', '#/subs', 'subs', 'Subscriptions'], ['history', '#/history', 'clock', 'History']];
function renderNav() {
  $('#lnav').innerHTML = `<a class="brand" href="#/" aria-label="Gallium home"><span class="tile"><small>31</small>Ga</span></a>
    ${NAV.map(([k, href, ic, l]) => `<a class="nav-i ${k === 'create' ? 'create' : ''}" data-nav="${k}" href="${href}">${icon(ic)}<span>${l}</span></a>`).join('')}
    <a class="nav-i" data-nav="me" href="#/me">${avatar(me)}<span>Your channel</span></a>
    <hr>
    <a class="nav-i" data-nav="controls" href="#/controls">${icon('sliders')}<span>Feed controls</span></a>
    <a class="nav-i" data-nav="roadmap" href="#/roadmap">${icon('roadmap')}<span>Roadmap</span></a>`;
  $$('#lnav a').forEach((a) => a.addEventListener('click', closeDrawers));
}
const isWide = () => matchMedia('(min-width: 1000px)').matches;
const closeDrawers = () => document.body.classList.remove('open-l', 'open-r');
const openDrawer = (side) => { if (!isWide()) { closeDrawers(); document.body.classList.add('open-' + side); } };
$('#scrim').onclick = closeDrawers;
$('#grip-l').onclick = () => openDrawer('l');
$('#grip-r').onclick = () => openDrawer('r');
$('#open-l').onclick = () => openDrawer('l');
$('#open-r').onclick = () => openDrawer('r');
$('#open-r').innerHTML = icon('filter');
$('#msg-btn').insertAdjacentHTML('afterbegin', icon('chat'));
$('#search-btn').innerHTML = icon('search');
// Swipe from a screen edge toward the middle to pull a rail out; swipe it back to close.
(() => {
  let sx = 0, sy = 0, mode = null;
  const ZONE = 44;
  document.addEventListener('touchstart', (e) => {
    if (isWide() || e.touches.length !== 1) return (mode = null);
    const t = e.touches[0], w = innerWidth, b = document.body.classList;
    sx = t.clientX; sy = t.clientY;
    mode = b.contains('open-l') ? 'close-l' : b.contains('open-r') ? 'close-r' : sx < ZONE ? 'open-l' : sx > w - ZONE && b.contains('has-rrail') ? 'open-r' : null;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!mode) return;
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (mode === 'open-l' && dx > 0) openDrawer('l');
      if (mode === 'open-r' && dx < 0) openDrawer('r');
      if (mode === 'close-l' && dx < 0) closeDrawers();
      if (mode === 'close-r' && dx > 0) closeDrawers();
    }
    mode = null;
  }, { passive: true });
})();

// ---------- sign in ----------
function renderAuth() {
  $('#lnav').hidden = true; $('#topbar').hidden = true;
  document.body.classList.remove('has-rrail');
  let mode = 'login';
  const draw = () => {
    view.innerHTML = `<div class="auth"><div class="auth-box"><span class="tile big"><small>31</small>Ga</span><h1>Gallium</h1><p class="muted">Every kind of social, one app. No ads, no paywalls, and a feed you actually control.</p>
      <form id="af">
      ${mode === 'signup' ? '<div class="field"><label for="a-name">Channel name</label><input id="a-name" name="display_name" autocomplete="name"></div>' : ''}
      <div class="field"><label for="a-user">Username</label><input id="a-user" name="username" autocomplete="username" required></div>
      <div class="field"><label for="a-pass">Password</label><input id="a-pass" name="password" type="password" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" required></div>
      <div class="err" id="aerr"></div>
      <button class="btn primary block">${mode === 'signup' ? 'Create account' : 'Sign in'}</button>
      <p class="muted" style="margin-top:14px;font-size:14px;text-align:center">${mode === 'signup' ? 'Already have an account?' : 'New here?'} <a href="#" id="swap" style="color:var(--tq)">${mode === 'signup' ? 'Sign in' : 'Create an account'}</a></p>
      ${mode === 'login' ? '<p class="muted" style="font-size:13px;text-align:center">Demo account: <b>demo</b> / <b>gallium123</b></p>' : ''}</form></div></div>`;
    $('#swap').onclick = (e) => { e.preventDefault(); mode = mode === 'login' ? 'signup' : 'login'; draw(); };
    $('#af').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/' + mode, { body: Object.fromEntries(new FormData(e.target)) }); boot(); } catch (err) { $('#aerr').textContent = err.message; }
    };
  };
  draw();
}

// ---------- live messages ----------
let streamHooked = false;
function onMessage(m) {
  if (!me || (m.sender_id !== me.id && m.recipient_id !== me.id)) return;
  const other = m.sender_id === me.id ? m.recipient_id : m.sender_id;
  if (activeChat && activeChat.otherId === other && location.hash.startsWith('#/messages/')) {
    activeChat.addMsg(m);
    if (m.sender_id !== me.id) api('/messages/' + other); // marks read
  } else if (m.sender_id !== me.id) {
    toast(`${m.from?.display_name || 'New message'}: ${m.body.slice(0, 60)}`);
    refreshUnread();
  }
}
function connectStream() {
  if (streamHooked) return;
  streamHooked = true;
  if (window.galliumEvents) return window.galliumEvents.on(onMessage);
  const es = new EventSource('/api/stream');
  es.addEventListener('message', (e) => onMessage(JSON.parse(e.data)));
}
async function refreshUnread() {
  const convos = await api('/conversations');
  const n = convos.reduce((a, c) => a + c.unread, 0);
  $('#unread').hidden = !n; $('#unread').textContent = n;
}

// ---------- router ----------
const TITLES = { home: 'Home', long: 'Long-form', shorts: 'Short-form', music: 'Music', create: 'Create', folders: 'Folders', subs: 'Subscriptions', history: 'History', search: 'Search', messages: 'Messages', controls: 'Feed controls', roadmap: 'Roadmap', p: 'Post' };
const setTitle = (t) => { $('#page-title').textContent = t; document.title = t === 'Home' ? 'Gallium' : `${t} · Gallium`; };
const route = { section: 'home' };
let cleanup = null;
async function onRoute() {
  if (!me) return;
  cleanup?.(); cleanup = null; activeChat = null;
  closeSheet(); closeDrawers();
  const [pathPart, query] = location.hash.slice(1).split('?');
  const parts = (pathPart || '/').split('/').filter(Boolean);
  let section = parts[0] || 'home';
  if (section === 'watch' && !parts[1]) section = 'long';
  if (section === 'u' && parts[1] === me.username) section = 'me';
  const kinds = new URLSearchParams(query || '').get('kinds');
  if (kinds !== null) feedFilter = kinds;
  if (section !== 'folders') folderReorder = false;
  route.section = section;
  const hasRail = section === 'home' || (section === 'folders' && !!parts[1]);
  document.body.classList.toggle('has-rrail', hasRail);
  $('#open-r').hidden = !hasRail;
  renderRail();
  $$('#lnav [data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === (section === 'watch' ? 'long' : section === 'p' ? 'home' : section)));
  setTitle(TITLES[section] || 'Gallium');
  if (section === 'home' && feedFilter) setTitle(FILTERS.find((f) => f[0] === feedFilter)?.[1] || 'Home');
  window.scrollTo(0, 0);
  try {
    if (section === 'home') await homeView();
    else if (section === 'long') await longView();
    else if (section === 'watch') await watchView(parts[1]);
    else if (section === 'shorts') await shortsView(parts[1]);
    else if (section === 'music') await musicView();
    else if (section === 'create') createView();
    else if (section === 'folders') await foldersView(parts[1]);
    else if (section === 'subs') await subsView();
    else if (section === 'history') await historyView();
    else if (section === 'search') await searchView(new URLSearchParams(query || '').get('q'));
    else if (section === 'me') await channelView(me.username);
    else if (section === 'u') await channelView(parts[1]);
    else if (section === 'messages') await messagesView(parts[1]);
    else if (section === 'controls') await controlsView();
    else if (section === 'roadmap') await roadmapView();
    else if (section === 'p') await postView(parts[1]);
    else await homeView();
  } catch (err) { if (err.message !== 'signed out') view.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
}
window.addEventListener('hashchange', onRoute);

async function boot() {
  try { me = await api('/me'); } catch { me = null; }
  if (!me) return renderAuth();
  $('#lnav').hidden = false; $('#topbar').hidden = false;
  renderNav();
  connectStream();
  refreshUnread();
  onRoute();
}
boot();
