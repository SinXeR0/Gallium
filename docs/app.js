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
const fmtN = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : String(n));
const avatar = (u, cls = '') => `<span class="av ${cls}" style="background:${esc(u?.avatar_color || '#888')}">${esc((u?.display_name || u?.username || '?')[0].toUpperCase())}</span>`;
const postLink = (p) => (p.kind === 'video' ? `#/watch/${p.id}` : p.kind === 'short' ? `#/shorts/${p.id}` : `#/p/${p.id}`);

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
async function saveSheet(p) {
  const folders = await api('/folders?post=' + p.id);
  const sheet = openSheet(`<h3>Save to a folder</h3><p class="why">Tap a folder to add or remove this.</p>
    ${folders.map((f) => `<button class="opt ${f.contains ? 'on' : ''}" data-id="${f.id}">${icon('folder')}<span class="grow">${esc(f.name)}<small>${f.count} saved</small></span>${f.contains ? icon('check', 'check') : ''}</button>`).join('')}
    <form id="nf" style="display:flex;gap:8px;margin-top:10px"><input id="nf-name" name="name" placeholder="New folder name" maxlength="60" autocomplete="off"><button class="btn primary">Create</button></form>`);
  $$('.opt', sheet).forEach((b) => (b.onclick = async () => {
    const r = await api(`/folders/${b.dataset.id}/toggle`, { body: { post_id: p.id } });
    p.saved = r.saved || folders.some((f) => f.contains && String(f.id) !== b.dataset.id);
    toast(r.saved ? `Saved to ${r.folder}` : `Removed from ${r.folder}`);
    saveSheet(p);
  }));
  $('#nf', sheet).onsubmit = async (e) => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    if (!name) return;
    const f = await api('/folders', { body: { name } });
    await api(`/folders/${f.id}/toggle`, { body: { post_id: p.id } });
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
    ${p.tags.length ? `<div class="tags">${p.tags.map((t) => `<a>#${esc(t)}</a>`).join('')}</div>` : ''}
    <div class="actions">${reactPill(p)}<button class="chip-btn" data-comments>${icon('comment')}<span>${fmtN(p.comments)}</span></button><span class="spacer"></span><button class="icon-btn" data-more aria-label="More options">${icon('more')}</button></div>`;
  wireReact(el, p);
  $('[data-comments]', el).onclick = () => commentsSheet(p);
  $('[data-more]', el).onclick = () => moreMenu(p, () => { el.style.transition = 'opacity .25s'; el.style.opacity = 0; setTimeout(() => el.remove(), 250); });
  const play = $('[data-play]', el);
  if (play) play.onclick = () => Player.play(p, [p]);
  return el;
}
function renderPosts(list, box, empty) {
  box.innerHTML = '';
  if (!list.length) box.innerHTML = `<div class="empty">${empty}</div>`;
  list.forEach((p) => box.append(postEl(p)));
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
  view.innerHTML = `<div class="page"><div id="one"></div><div class="comments-panel" id="cbox"></div></div>`;
  $('#one').append(postEl(p));
  renderComments(p, $('#cbox'));
}

function vtile(p) {
  return `<a class="vtile" href="#/watch/${p.id}"><span class="thumb"><img src="${media(p.cover)}" alt="" loading="lazy"><span class="dur">${fmtTime(p.duration)}</span></span>
    <span class="meta">${avatar(p.author)}<span><b>${esc(p.title)}</b><span class="muted">${esc(p.author.display_name)} · ${ago(p.created_at)} · ${fmtN(p.likes)} likes</span></span></span></a>`;
}
async function longView() {
  view.innerHTML = `<div class="page wide"><div class="vgrid" id="grid"></div></div>`;
  const list = await api('/feed?kinds=video&limit=60');
  $('#grid').innerHTML = list.map(vtile).join('') || '<div class="empty">No long-form videos yet.</div>';
}
// The watch page follows the user's sketch: player, likes and dislikes with •••, description, channel, comments, then the next videos.
async function watchView(id) {
  const [p, rest] = await Promise.all([api('/posts/' + id), api('/feed?kinds=video&limit=20')]);
  const ch = await api('/users/' + encodeURIComponent(p.author.username));
  Player.pause();
  setTitle(p.title);
  view.innerHTML = `<div class="watch">
    <video class="watch-player" src="${media(p.media)}" poster="${media(p.cover)}" controls autoplay playsinline></video>
    <div class="watch-body">
      <div class="watch-bar">${reactPill(p)}<span class="spacer"></span><button class="chip-btn" data-save aria-label="Save">${icon('save', p.saved ? 'fill' : '')}</button><button class="icon-btn" data-more aria-label="More options">${icon('more')}</button></div>
      <div class="desc" id="desc"><h1>${esc(p.title)}</h1><div class="meta">${ago(p.created_at)}${p.tags.length ? ' · ' + p.tags.map((t) => '#' + esc(t)).join(' ') : ''}</div>
        ${p.body ? `<div class="text">${esc(p.body)}</div><button class="toggle" id="desc-toggle">Show more</button>` : ''}</div>
      <div class="channel-card"><a href="#/u/${esc(p.author.username)}">${avatar(p.author, 'lg')}</a><a href="#/u/${esc(p.author.username)}"><b>${esc(p.author.display_name)}</b></a>
        <span class="muted"><span id="subs-n">${fmtN(ch.followers)}</span> subscribers</span>
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
  if ($('#sub')) $('#sub').onclick = async (e) => { const r = await api(`/users/${p.author.id}/follow`, { method: 'POST' }); e.target.textContent = r.following ? 'Subscribed' : 'Subscribe'; e.target.classList.toggle('primary', !r.following); $('#subs-n').textContent = fmtN(r.followers); };
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
    if (en.isIntersecting) { Player.pause(); v.play().catch(() => en.target.classList.add('paused')); } else v.pause();
  }), { threshold: 0.6 });
  $$('.short', wrap).forEach((s) => io.observe(s));
  cleanup = () => { io.disconnect(); $$('video', wrap).forEach((v) => v.pause()); };
}

async function musicView() {
  const tracks = await api('/feed?kinds=track&limit=100');
  view.innerHTML = `<div class="page">
    <div class="music-hero">${icon('music')}<div><h1>Music</h1><div class="muted">Tracks from creators on Gallium, ranked by your taste.</div>
      <button class="btn primary" style="margin-top:12px" id="playall">${icon('play')}Play all</button></div></div>
    <div id="tracks">${tracks.map((t, i) => `<div class="track" data-i="${i}" data-id="${t.id}"><img src="${media(t.cover)}" alt=""><div style="min-width:0"><b>${esc(t.title)}</b><div class="muted">${esc(t.author.display_name)} · ${t.tags.map((x) => '#' + esc(x)).join(' ')}</div></div>
      <span class="muted">${fmtTime(t.duration)}</span><button class="icon-btn" data-more aria-label="More options">${icon('more')}</button></div>`).join('') || '<div class="empty">No tracks yet.</div>'}</div></div>`;
  $$('.track').forEach((row) => {
    const t = tracks[row.dataset.i];
    row.onclick = (e) => { if (e.target.closest('button')) return; Player.play(t, tracks); };
    $('[data-more]', row).onclick = () => moreMenu(t, () => row.remove());
  });
  if ($('#playall')) $('#playall').onclick = () => tracks.length && Player.play(tracks[0], tracks);
  Player.highlight();
}

async function foldersView(id) {
  if (id) {
    const f = await api('/folders/' + id);
    setTitle(f.name);
    view.innerHTML = `<div class="page"><div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><a class="btn small ghost" href="#/folders">${icon('back')}Folders</a><span style="flex:1"></span><button class="btn small danger" id="delf">${icon('trash')}Delete folder</button></div><div id="fposts"></div></div>`;
    renderPosts(f.posts, $('#fposts'), 'This folder is empty. Use ••• then “Save to a folder” on anything you want to keep.');
    $('#delf').onclick = (e) => {
      if (e.target.closest('button').dataset.armed) { api('/folders/' + id, { method: 'DELETE' }).then(() => { toast('Folder deleted'); location.hash = '#/folders'; }); return; }
      const b = e.target.closest('button'); b.dataset.armed = '1'; b.lastChild.textContent = 'Tap again to delete';
    };
    return;
  }
  const folders = await api('/folders');
  view.innerHTML = `<div class="page"><div class="fgrid">
    ${folders.map((f) => `<a class="folder" href="#/folders/${f.id}"><div class="cover">${f.cover ? `<img src="${media(f.cover)}" alt="">` : icon('folder')}<span class="n">${f.count}</span></div><b>${esc(f.name)}</b></a>`).join('')}
    <button class="folder new" id="newf" style="text-align:left"><div class="cover">${icon('plus')}</div><b>New folder</b></button></div></div>`;
  $('#newf').onclick = () => {
    const sheet = openSheet(`<h3>New folder</h3><form id="nf" style="display:flex;gap:8px;margin-top:10px"><input id="nf-name" name="name" placeholder="Folder name" maxlength="60" autocomplete="off"><button class="btn primary">Create</button></form>`);
    $('#nf-name', sheet).focus();
    $('#nf', sheet).onsubmit = async (e) => { e.preventDefault(); const name = e.target.name.value.trim(); if (!name) return; await api('/folders', { body: { name } }); closeSheet(); foldersView(); };
  };
}

async function subsView() {
  const [subs, posts] = await Promise.all([api('/subscriptions'), api('/feed?scope=subs&limit=60')]);
  view.innerHTML = `<div class="page"><div class="subs-row">${subs.map((u) => `<a href="#/u/${esc(u.username)}">${avatar(u, 'lg')}<span>${esc(u.display_name.split(' ')[0])}</span></a>`).join('') || '<span class="muted">You haven’t subscribed to anyone yet.</span>'}</div><div id="sposts"></div></div>`;
  renderPosts(posts, $('#sposts'), 'New posts from channels you subscribe to show up here, newest first.');
}

async function channelView(username) {
  const d = await api('/users/' + encodeURIComponent(username));
  const mine = d.user.id === me.id;
  setTitle(mine ? 'Your channel' : d.user.display_name);
  const TABS = [['all', 'All'], ['video', 'Long-form'], ['short', 'Shorts'], ['posts', 'Posts'], ['track', 'Music'], ['reposts', 'Reposts']];
  view.innerHTML = `<div class="banner"></div><div class="page" style="padding-top:0">
    <div class="channel-head">${avatar(d.user, 'xl')}<h1>${esc(d.user.display_name)}</h1><div class="muted">@${esc(d.user.username)}</div>
      <div class="stats"><b id="subs-n">${fmtN(d.followers)}</b> subscribers · <b>${d.posts.length}</b> uploads</div>
      ${d.user.bio ? `<div class="bio">${esc(d.user.bio)}</div>` : ''}
      <div class="row">${mine
        ? '<button class="btn" id="edit">Edit channel</button><button class="btn" id="logout">Sign out</button>' + (window.galliumReset ? '<button class="btn danger" id="reset">Reset demo</button>' : '')
        : `<button class="btn ${d.isFollowing ? '' : 'primary'}" id="sub">${d.isFollowing ? 'Subscribed' : 'Subscribe'}</button><a class="btn" href="#/messages/${d.user.id}">${icon('chat')}Message</a>`}</div></div>
    <div class="tabs">${TABS.map(([k, l], i) => `<button data-t="${k}" class="${i ? '' : 'on'}">${l}</button>`).join('')}</div>
    <div id="cposts"></div></div>`;
  const show = (t) => {
    const list = t === 'reposts' ? d.reposts : d.posts.filter((p) => t === 'all' || (t === 'posts' ? ['text', 'photo'].includes(p.kind) : p.kind === t));
    $('#cposts').innerHTML = '';
    if (!list.length) $('#cposts').innerHTML = '<div class="empty">Nothing here yet.</div>';
    list.forEach((p) => $('#cposts').append(postEl(p, t === 'reposts' ? { reposter: d.user.username } : {})));
  };
  $$('.tabs button').forEach((b) => (b.onclick = () => { $$('.tabs button').forEach((x) => x.classList.toggle('on', x === b)); show(b.dataset.t); }));
  show('all');
  if (mine) {
    $('#logout').onclick = async () => { await api('/logout', { method: 'POST' }); me = null; location.hash = '#/'; renderAuth(); };
    if ($('#reset')) $('#reset').onclick = () => { window.galliumReset(); toast('Demo reset'); location.hash = '#/'; boot(); };
    $('#edit').onclick = () => {
      const sheet = openSheet(`<h3>Edit channel</h3><form id="pf" style="margin-top:12px"><div class="field"><label for="pf-name">Channel name</label><input id="pf-name" name="display_name" value="${esc(d.user.display_name)}"></div>
        <div class="field"><label for="pf-bio">About</label><textarea id="pf-bio" name="bio" rows="3">${esc(d.user.bio)}</textarea></div><button class="btn primary block">Save</button></form>`);
      $('#pf', sheet).onsubmit = async (e) => { e.preventDefault(); await api('/me', { method: 'PATCH', body: Object.fromEntries(new FormData(e.target)) }); me = await api('/me'); closeSheet(); renderNav(); channelView(username); };
    };
  } else {
    $('#sub').onclick = async (e) => { const r = await api(`/users/${d.user.id}/follow`, { method: 'POST' }); e.target.textContent = r.following ? 'Subscribed' : 'Subscribe'; e.target.classList.toggle('primary', !r.following); $('#subs-n').textContent = fmtN(r.followers); };
  }
}

async function messagesView(otherId) {
  const thread = otherId ? await api('/messages/' + otherId) : null; // loads first so it is marked read
  const convos = await api('/conversations');
  view.innerHTML = `<div class="dm-layout ${otherId ? 'in-chat' : ''}">
    <div class="dm-list"><div class="head"><input id="dm-q" placeholder="Search people to message" autocomplete="off" aria-label="Search people"><div id="dmsearch"></div></div>
      ${convos.map((c) => `<a class="dm-item ${String(c.user.id) === otherId ? 'active' : ''}" href="#/messages/${c.user.id}">${avatar(c.user)}<div class="who"><b>${esc(c.user.display_name)}</b><div class="preview">${c.last.sender_id === me.id ? 'You: ' : ''}${esc(c.last.body)}</div></div>${c.unread ? `<span class="unread">${c.unread}</span>` : ''}</a>`).join('') || '<div class="muted" style="padding:16px">No conversations yet.</div>'}
    </div>
    <div class="chat" id="chat">${otherId ? '' : '<div class="chat-empty">Pick a conversation, or search for someone to message.</div>'}</div></div>`;
  const q = $('#dm-q');
  q.oninput = async () => {
    if (!q.value.trim()) return ($('#dmsearch').innerHTML = '');
    const r = await api('/search?q=' + encodeURIComponent(q.value.trim()));
    $('#dmsearch').innerHTML = r.users.filter((u) => u.id !== me.id).map((u) => `<a class="dm-item" href="#/messages/${u.id}">${avatar(u)}<div class="who"><b>${esc(u.display_name)}</b><div class="preview">@${esc(u.username)}</div></div></a>`).join('');
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
  const items = await api('/roadmap');
  view.innerHTML = `<div class="page">
    <div class="explainer">Gallium gets built in the order you vote for. Suggest a feature or report something broken, and upvote what matters to you. The top of this list is what gets worked on next.</div>
    <form id="rmform" style="margin:16px 0 22px;display:grid;gap:8px">
      <div style="display:flex;gap:8px"><select name="kind" style="width:auto" aria-label="Type"><option value="idea">Idea</option><option value="fix">Fix</option></select><input name="title" placeholder="What should change?" maxlength="140" required aria-label="Title"></div>
      <textarea name="body" rows="2" placeholder="Details (optional)" aria-label="Details"></textarea>
      <div style="display:flex;justify-content:flex-end"><button class="btn primary">Submit</button></div></form>
    ${items.map((i) => `<div class="rm-item"><button class="vote ${i.voted ? 'on' : ''}" data-id="${i.id}" aria-label="Vote">${icon('up')}<b>${i.votes}</b></button><div style="min-width:0"><span class="pill ${i.kind === 'fix' ? 'block' : 'boost'}">${i.kind}</span> <b>${esc(i.title)}</b><div class="muted" style="margin-top:4px;font-size:14px">${esc(i.body || '')}</div><div class="muted" style="font-size:12px;margin-top:6px">@${esc(i.username)} · ${ago(i.created_at)}</div></div></div>`).join('')}</div>`;
  $('#rmform').onsubmit = async (e) => { e.preventDefault(); await api('/roadmap', { body: Object.fromEntries(new FormData(e.target)) }); roadmapView(); };
  $$('.vote').forEach((b) => (b.onclick = async () => { await api(`/roadmap/${b.dataset.id}/vote`, { method: 'POST' }); roadmapView(); }));
}

// ---------- music player (keeps playing across pages) ----------
const Player = {
  audio: $('#audio'), queue: [], i: 0,
  play(track, queue) { this.queue = queue; this.i = Math.max(0, queue.findIndex((t) => t.id === track.id)); this.load(); },
  load() {
    const t = this.queue[this.i];
    if (!t) return;
    this.audio.src = media(t.media);
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
  ['create', '#/create', 'plus', 'Create'], ['folders', '#/folders', 'folder', 'Folders'], ['subs', '#/subs', 'subs', 'Subscriptions']];
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
const TITLES = { home: 'Home', long: 'Long-form', shorts: 'Short-form', music: 'Music', create: 'Create', folders: 'Folders', subs: 'Subscriptions', messages: 'Messages', controls: 'Feed controls', roadmap: 'Roadmap', p: 'Post' };
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
  route.section = section;
  document.body.classList.toggle('has-rrail', section === 'home');
  $('#open-r').hidden = section !== 'home';
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
