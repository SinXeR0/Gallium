// Gallium front end: no build step, hash routing, one file.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const media = (f) => window.galliumMedia(f);
const view = $('#view');
let me = null;

async function api(path, opts = {}) {
  const method = opts.method || (opts.body ? 'POST' : 'GET');
  try {
    return await window.galliumApi(method, path, opts.body);
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
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}
const fmtTime = (sec) => { sec = Math.round(sec || 0); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = String(sec % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`; };
const avatar = (u, cls = '') => `<span class="avatar ${cls}" style="background:${esc(u?.avatar_color || '#888')}">${esc((u?.display_name || u?.username || '?')[0].toUpperCase())}</span>`;
const KIND = { text: ['Post', '✎'], photo: ['Photo', '◫'], short: ['Short', '▶'], video: ['Video', '▣'], track: ['Track', '♫'] };

// ---------- sheet (modal) ----------
function openSheet(html) {
  $('#sheet').innerHTML = html;
  $('#sheet').hidden = $('#sheet-backdrop').hidden = false;
}
function closeSheet() { $('#sheet').hidden = $('#sheet-backdrop').hidden = true; }
$('#sheet-backdrop').onclick = closeSheet;

// ---------- feed controls, shared by every surface ----------
async function moreOfThis(post) {
  await api(`/posts/${post.id}/more`, { method: 'POST' });
  const what = [`@${post.author.username}`, ...post.tags.map((t) => '#' + t)].slice(0, 3).join(', ');
  toast(`You'll see more like this (${what})`);
}
function neverShow(post, onDone) {
  const opts = [
    ['post', '', '⊘', 'Hide this post', 'It never comes back'],
    ['creator', '', '◉', `Never show @${post.author.username}`, 'Nothing from this creator, anywhere'],
    ...post.tags.map((t) => ['tag', t, '#', `Never show #${t}`, 'Anything tagged with this topic']),
    ['kind', '', KIND[post.kind][1], `Never show ${KIND[post.kind][0].toLowerCase()}s`, 'Turn off this whole format'],
  ];
  openSheet(`<h3>Never show me this</h3><p class="muted" style="margin:0 0 10px">Pick how far to go. You can undo any of it in Feed controls.</p>
    ${opts.map(([s, t, ic, l, sub]) => `<button class="opt" data-scope="${s}" data-target="${esc(t)}"><span class="ic">${esc(ic)}</span><span>${esc(l)}<small>${esc(sub)}</small></span></button>`).join('')}
    <button class="btn" style="width:100%;margin-top:8px" data-close>Cancel</button>`);
  $('[data-close]', $('#sheet')).onclick = closeSheet;
  $$('.opt', $('#sheet')).forEach((b) => (b.onclick = async () => {
    await api(`/posts/${post.id}/never`, { body: { scope: b.dataset.scope, target: b.dataset.target } });
    closeSheet();
    toast(b.dataset.scope === 'post' ? 'Hidden. It won’t come back.' : 'Done. You won’t see that again.');
    onDone?.(b.dataset.scope);
  }));
}
async function toggleLike(post, btn) {
  const r = await api(`/posts/${post.id}/like`, { method: 'POST' });
  post.liked = r.liked; post.likes = r.likes;
  btn.classList.toggle('on', r.liked);
  btn.innerHTML = `${r.liked ? '♥' : '♡'} <span>${r.likes}</span>`;
}

// ---------- post card ----------
function postCard(p) {
  const el = document.createElement('article');
  el.className = 'card';
  el.dataset.id = p.id;
  let mediaHtml = '';
  if (p.kind === 'photo') mediaHtml = `<img class="card-media" src="${media(p.media)}" alt="${esc(p.title || 'Photo')}" loading="lazy">`;
  if (p.kind === 'short') mediaHtml = `<video class="card-media vertical" src="${media(p.media)}" poster="${media(p.cover)}" controls playsinline preload="none"></video>`;
  if (p.kind === 'video') mediaHtml = `<a href="#/watch/${p.id}" style="position:relative;display:block"><img class="card-media" src="${media(p.cover)}" alt="" loading="lazy" style="aspect-ratio:16/9"><span class="dur" style="position:absolute;right:10px;bottom:10px;background:rgba(0,0,0,.8);padding:2px 7px;border-radius:6px;font-size:12px">${fmtTime(p.duration)}</span></a>`;
  if (p.kind === 'track') mediaHtml = `<div class="track-row"><img src="${media(p.cover)}" alt=""><div style="flex:1;min-width:0"><b>${esc(p.title)}</b><div class="muted">${esc(p.author.display_name)} · ${fmtTime(p.duration)}</div></div><button class="play-circle" data-play aria-label="Play">▶</button></div>`;
  el.innerHTML = `
    <div class="card-head">${avatar(p.author)}<a class="who" href="#/u/${esc(p.author.username)}"><b>${esc(p.author.display_name)}</b><div class="muted">@${esc(p.author.username)} · ${ago(p.created_at)}</div></a><span class="kind-tag">${KIND[p.kind][1]} ${KIND[p.kind][0]}</span></div>
    ${p.title && p.kind !== 'track' ? `<div class="card-title">${p.kind === 'video' ? `<a href="#/watch/${p.id}">${esc(p.title)}</a>` : esc(p.title)}</div>` : ''}
    ${p.body && p.kind !== 'video' ? `<div class="card-body">${esc(p.body)}</div>` : ''}
    ${mediaHtml}
    ${p.tags.length ? `<div class="tags">${p.tags.map((t) => `<a>#${esc(t)}</a>`).join('')}</div>` : ''}
    ${p.why ? `<div class="why">Why you're seeing this: ${esc(p.why.join(' · '))}</div>` : ''}
    <div class="actions">
      <button class="icon-btn ${p.liked ? 'on' : ''}" data-like>${p.liked ? '♥' : '♡'} <span>${p.likes}</span></button>
      <button class="icon-btn" data-comments>💬 <span>${p.comments}</span></button>
      <span class="spacer"></span>
      <button class="icon-btn more-btn" data-more title="Show me more like this">▲ More of this</button>
      <button class="icon-btn never-btn" data-never title="Never show me this">⊘ Never</button>
    </div>
    <div class="comments" hidden></div>`;
  $('[data-like]', el).onclick = (e) => toggleLike(p, e.currentTarget);
  $('[data-more]', el).onclick = () => moreOfThis(p);
  $('[data-never]', el).onclick = () => neverShow(p, () => { el.style.transition = 'opacity .25s'; el.style.opacity = 0; setTimeout(() => el.remove(), 250); });
  $('[data-comments]', el).onclick = () => toggleComments(p, $('.comments', el));
  const play = $('[data-play]', el);
  if (play) play.onclick = () => Player.play(p, [p]);
  return el;
}
async function toggleComments(p, box) {
  if (!box.hidden) return (box.hidden = true);
  box.hidden = false;
  const list = await api(`/posts/${p.id}/comments`);
  box.innerHTML = `${list.map((c) => `<div class="comment"><b>${esc(c.display_name)}</b> <span class="muted">${ago(c.created_at)}</span><div>${esc(c.body)}</div></div>`).join('') || '<div class="comment muted">No comments yet.</div>'}
    <form style="display:flex;gap:8px;margin-top:8px"><input name="body" placeholder="Add a comment" autocomplete="off"><button class="btn primary">Post</button></form>`;
  $('form', box).onsubmit = async (e) => {
    e.preventDefault();
    const body = e.target.body.value.trim();
    if (!body) return;
    await api(`/posts/${p.id}/comments`, { body: { body } });
    box.hidden = true; toggleComments(p, box);
  };
}

// ---------- views ----------
const FILTERS = [['', 'For you'], ['text,photo', 'Posts'], ['short', 'Shorts'], ['video', 'Videos'], ['track', 'Music']];
async function homeView(params) {
  const kinds = params.get('kinds') || '';
  view.innerHTML = `<div class="page">
    <div class="page-head"><h1>Home</h1><div class="mobile-top"><a class="btn small" href="#/controls">⚙ Controls</a><a class="btn small" href="#/roadmap">★</a><a class="btn small" href="#/me">◉</a></div></div>
    <div class="chips">${FILTERS.map(([k, l]) => `<a class="chip ${k === kinds ? 'on' : ''}" href="#/${k ? '?kinds=' + k : ''}">${l}</a>`).join('')}</div>
    <div id="feed"><div class="empty">Loading…</div></div></div>`;
  const posts = await api('/feed?limit=40' + (kinds ? '&kinds=' + kinds : ''));
  const feed = $('#feed');
  feed.innerHTML = posts.length ? '' : `<div class="empty">Nothing here. You may have blocked it all. <a href="#/controls" style="color:var(--gold)">Check feed controls</a>.</div>`;
  posts.forEach((p) => feed.append(postCard(p)));
}

async function shortsView() {
  view.innerHTML = `<div class="shorts" id="shorts"></div>`;
  const list = await api('/feed?kinds=short&limit=50');
  const wrap = $('#shorts');
  if (!list.length) return (wrap.innerHTML = '<div class="empty">No shorts to show.</div>');
  for (const p of list) {
    const s = document.createElement('section');
    s.className = 'short';
    s.innerHTML = `<div class="short-frame">
      <video src="${media(p.media)}" poster="${media(p.cover)}" loop playsinline preload="metadata"></video>
      <div class="tap-hint">▶</div>
      <div class="overlay"><a href="#/u/${esc(p.author.username)}" style="display:flex;gap:8px;align-items:center">${avatar(p.author)}<b>@${esc(p.author.username)}</b></a>
        <div style="margin-top:8px">${esc(p.title || p.body || '')}</div>
        <div class="tags">${p.tags.map((t) => `<a>#${esc(t)}</a>`).join('')}</div></div>
      <div class="rail">
        <div><button data-like class="${p.liked ? 'on' : ''}">${p.liked ? '♥' : '♡'}</button><small data-likes>${p.likes}</small></div>
        <div><button data-more class="boost" title="More of this">▲</button><small>More</small></div>
        <div><button data-never title="Never show">⊘</button><small>Never</small></div>
        <div><button data-dm title="Send">✉</button><small>Send</small></div>
      </div></div>`;
    const v = $('video', s);
    $('.short-frame', s).addEventListener('click', (e) => { if (e.target.closest('.rail, a')) return; v.paused ? v.play() : v.pause(); });
    v.onplay = () => s.classList.remove('paused'); v.onpause = () => s.classList.add('paused');
    $('[data-like]', s).onclick = async (e) => { await toggleLike(p, e.currentTarget); e.currentTarget.textContent = p.liked ? '♥' : '♡'; $('[data-likes]', s).textContent = p.likes; };
    $('[data-more]', s).onclick = () => moreOfThis(p);
    $('[data-never]', s).onclick = () => neverShow(p, () => { v.pause(); s.remove(); });
    $('[data-dm]', s).onclick = () => location.hash = `#/messages/${p.author.id}`;
    wrap.append(s);
  }
  // autoplay whichever short is on screen
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    const v = $('video', en.target);
    if (en.isIntersecting) { Player.pause(); v.play().catch(() => en.target.classList.add('paused')); } else { v.pause(); }
  }), { threshold: 0.6 });
  $$('.short', wrap).forEach((s) => io.observe(s));
  cleanup = () => io.disconnect();
}

function vidTile(p) {
  return `<a class="vid-tile" href="#/watch/${p.id}"><div class="thumb"><img src="${media(p.cover)}" alt="" loading="lazy"><span class="dur">${fmtTime(p.duration)}</span></div>
    <div class="meta">${avatar(p.author)}<div><b>${esc(p.title)}</b><div class="muted" style="font-size:13px">${esc(p.author.display_name)} · ${ago(p.created_at)}</div></div></div></a>`;
}
async function watchView() {
  view.innerHTML = `<div class="page wide"><div class="page-head"><h1>Watch</h1><span class="muted">No ads. No paywalls. Ever.</span></div><div class="grid" id="grid"></div></div>`;
  const list = await api('/feed?kinds=video&limit=60');
  $('#grid').innerHTML = list.map(vidTile).join('') || '<div class="empty">No videos yet.</div>';
}
async function watchOne(id) {
  const [p, rest] = await Promise.all([api('/posts/' + id), api('/feed?kinds=video&limit=20')]);
  Player.pause();
  view.innerHTML = `<div class="page wide"><div class="watch-layout"><div>
      <video class="watch-player" src="${media(p.media)}" poster="${media(p.cover)}" controls autoplay playsinline></video>
      <h1 style="margin:14px 0 10px;font-size:21px">${esc(p.title)}</h1>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${avatar(p.author)}<a class="who" href="#/u/${esc(p.author.username)}"><b>${esc(p.author.display_name)}</b><div class="muted">@${esc(p.author.username)}</div></a>
        <span style="flex:1"></span>
        <button class="btn ${p.liked ? 'primary' : ''}" data-like>${p.liked ? '♥' : '♡'} ${p.likes}</button>
        <button class="btn" data-more style="color:var(--ok)">▲ More of this</button>
        <button class="btn" data-never>⊘ Never</button></div>
      <div class="card" style="margin-top:14px;padding:12px 14px;white-space:pre-wrap;line-height:1.5"><span class="muted">${ago(p.created_at)} ago · ${p.tags.map((t) => '#' + esc(t)).join(' ')}</span>\n${esc(p.body || '')}</div>
      <div class="card" id="cbox"><div class="comments" style="border:0;padding-top:8px"></div></div>
    </div><div class="up-next"><h2 style="margin-top:0">Up next</h2>${rest.filter((r) => r.id !== p.id).map(vidTile).join('')}</div></div></div>`;
  $('[data-like]').onclick = async (e) => { await toggleLike(p, e.currentTarget); e.currentTarget.className = 'btn ' + (p.liked ? 'primary' : ''); e.currentTarget.textContent = `${p.liked ? '♥' : '♡'} ${p.likes}`; };
  $('[data-more]').onclick = () => moreOfThis(p);
  $('[data-never]').onclick = () => neverShow(p, () => (location.hash = '#/watch'));
  const box = $('#cbox .comments'); box.hidden = true; toggleComments(p, box);
}

async function musicView() {
  const tracks = await api('/feed?kinds=track&limit=100');
  view.innerHTML = `<div class="page">
    <div class="music-hero"><div style="font-size:54px">♫</div><div><h1>Music</h1><div class="muted">Tracks from creators on Gallium, ranked by your taste. Upload yours from Create.</div>
      <button class="btn primary" style="margin-top:12px" id="playall">▶ Play all</button></div></div>
    <div id="tracks">${tracks.map((t, i) => `<div class="track" data-i="${i}" data-id="${t.id}"><img src="${media(t.cover)}" alt=""><div style="min-width:0"><b>${esc(t.title)}</b><div class="muted" style="font-size:13px">${esc(t.author.display_name)} · ${t.tags.map((x) => '#' + esc(x)).join(' ')}</div></div>
      <span class="muted">${fmtTime(t.duration)}</span><span><button class="icon-btn" data-more title="More of this" style="color:var(--ok)">▲</button><button class="icon-btn" data-never title="Never show">⊘</button></span></div>`).join('') || '<div class="empty">No tracks yet.</div>'}</div></div>`;
  $$('.track').forEach((row) => {
    const t = tracks[row.dataset.i];
    row.onclick = (e) => { if (e.target.closest('button')) return; Player.play(t, tracks); };
    $('[data-more]', row).onclick = () => moreOfThis(t);
    $('[data-never]', row).onclick = () => neverShow(t, () => row.remove());
  });
  if ($('#playall')) $('#playall').onclick = () => tracks.length && Player.play(tracks[0], tracks);
  Player.highlight();
}

async function messagesView(otherId) {
  const thread = otherId ? await api('/messages/' + otherId) : null; // loads first so it is marked read
  const convos = await api('/conversations');
  view.innerHTML = `<div class="dm-layout ${otherId ? 'in-chat' : ''}">
    <div class="dm-list"><div class="head"><h1>Messages</h1>
      <form id="newdm" style="margin-top:12px"><input name="q" placeholder="Start a chat: search people" autocomplete="off"></form><div id="dmsearch"></div></div>
      ${convos.map((c) => `<a class="dm-item ${String(c.user.id) === otherId ? 'active' : ''}" href="#/messages/${c.user.id}">${avatar(c.user)}<div class="who"><b>${esc(c.user.display_name)}</b><div class="preview">${c.last.sender_id === me.id ? 'You: ' : ''}${esc(c.last.body)}</div></div>${c.unread ? `<span class="badge">${c.unread}</span>` : ''}</a>`).join('') || '<div class="muted" style="padding:16px">No conversations yet.</div>'}
    </div>
    <div class="chat" id="chat">${otherId ? '' : '<div class="chat-empty">Pick a conversation, or search for someone to message.</div>'}</div></div>`;
  const q = $('#newdm input');
  q.oninput = async () => {
    if (!q.value.trim()) return ($('#dmsearch').innerHTML = '');
    const r = await api('/search?q=' + encodeURIComponent(q.value.trim()));
    $('#dmsearch').innerHTML = r.users.filter((u) => u.id !== me.id).map((u) => `<a class="dm-item" href="#/messages/${u.id}">${avatar(u)}<div class="who"><b>${esc(u.display_name)}</b><div class="preview">@${esc(u.username)}</div></div></a>`).join('');
  };
  $('#newdm').onsubmit = (e) => e.preventDefault();
  if (!otherId) return;
  const { user, messages } = thread;
  refreshUnread();
  $('#chat').innerHTML = `<div class="chat-head"><a href="#/messages" class="icon-btn mobile-top">←</a>${avatar(user)}<a class="who" href="#/u/${esc(user.username)}"><b>${esc(user.display_name)}</b><div class="muted">@${esc(user.username)}</div></a></div>
    <div class="chat-log" id="log"></div>
    <form class="chat-form" id="send"><input name="body" placeholder="Message @${esc(user.username)}" autocomplete="off"><button class="btn primary">Send</button></form>`;
  const log = $('#log');
  const addMsg = (m) => { const d = document.createElement('div'); d.className = 'bubble' + (m.sender_id === me.id ? ' mine' : ''); d.textContent = m.body; d.title = m.created_at; log.append(d); log.scrollTop = log.scrollHeight; };
  messages.forEach(addMsg);
  if (!messages.length) log.innerHTML = `<div class="chat-empty">Say hi to ${esc(user.display_name)}.</div>`;
  $('#send').onsubmit = async (e) => {
    e.preventDefault();
    const body = e.target.body.value.trim();
    if (!body) return;
    e.target.body.value = '';
    $('.chat-empty', log)?.remove();
    await api('/messages/' + otherId, { body: { body } });
  };
  activeChat = { otherId: Number(otherId), addMsg };
  $('#send input').focus();
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
  view.innerHTML = `<div class="page"><div class="page-head"><h1>Create</h1></div>
    <div class="kind-picker">${Object.entries(KIND).map(([k, [l, ic]]) => `<button data-k="${k}" class="${k === kind ? 'on' : ''}"><span>${ic}</span>${l}</button>`).join('')}</div>
    <form id="cform">
      <div class="field" data-f="title"><label>Title</label><input name="title" maxlength="140"></div>
      <div class="field" data-f="file"><label class="drop" id="drop"><input type="file" name="media"><span id="droptext"></span></label></div>
      <div class="field" data-f="cover"><label>Cover image (optional)</label><input type="file" name="cover" accept="image/*"></div>
      <div class="field"><label id="bodylabel">What's on your mind?</label><textarea name="body" rows="4" maxlength="5000"></textarea></div>
      <div class="field"><label>Tags (people can follow or block these)</label><input name="tags" placeholder="e.g. gaming, cooking, hiphop"></div>
      <div class="err" id="cerr"></div>
      <button class="btn primary" style="width:100%;padding:12px">Publish</button>
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
    try {
      if (file && kind !== 'photo') {
        const meta = await probeMedia(file, kind === 'track' ? 'audio' : 'video');
        fd.set('duration', meta.duration);
        if (kind !== 'track' && !form.cover.files[0] && meta.poster) fd.set('cover', meta.poster, 'cover.jpg');
      }
      $('button.primary', form).disabled = true;
      $('button.primary', form).textContent = 'Uploading…';
      await api('/posts', { body: fd });
      toast('Published');
      location.hash = { text: '#/', photo: '#/', short: '#/shorts', video: '#/watch', track: '#/music' }[kind];
    } catch (err) {
      $('#cerr').textContent = err.message;
      $('button.primary', form).disabled = false;
      $('button.primary', form).textContent = 'Publish';
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
    ${r.action === 'boost' ? `<input type="range" min="1" max="10" value="${r.weight}" title="How much more">` : ''}<button class="btn small danger" data-del>Remove</button></div>`;
  view.innerHTML = `<div class="page"><div class="page-head"><h1>Feed controls</h1></div>
    <div class="explainer">This is the whole algorithm. Your feed is ranked by <b>how new a post is</b>, <b>who you follow</b>, a little bit of <b>what's popular</b>, and <b>the rules below</b>. A <b>Never</b> rule is absolute: matching content is removed before ranking, on every tab. <b>More</b> rules push things up, and the slider sets how hard. Nothing else is hidden from you here.</div>
    <h2>Never show me</h2>${blocks.map(ruleRow).join('') || '<div class="muted">Nothing blocked. Tap ⊘ on anything to block it.</div>'}
    <h2>Show me more of</h2>${boosts.map(ruleRow).join('') || '<div class="muted">No boosts yet. Tap ▲ More of this on anything you like.</div>'}
    <h2>Add a rule</h2>
    <form class="add-rule" id="addrule">
      <select name="action"><option value="boost">More of</option><option value="block">Never show</option></select>
      <select name="target_type"><option value="tag">#topic</option><option value="creator">@creator</option><option value="kind">format</option></select>
      <input name="target" placeholder="e.g. cooking" required>
      <button class="btn primary">Add</button>
    </form><div class="err" id="rerr"></div>
    <h2>Hidden posts</h2><div class="rule"><span class="label">${hiddenCount} post${hiddenCount === 1 ? '' : 's'} hidden one by one</span>${hiddenCount ? '<button class="btn small" id="unhide">Unhide all</button>' : ''}</div></div>`;
  const form = $('#addrule');
  const syncTarget = () => {
    if (form.target_type.value === 'kind') form.target.outerHTML = `<select name="target">${Object.entries(KIND).map(([k, [l]]) => `<option value="${k}">${l}s</option>`).join('')}</select>`;
    else if (form.target.tagName === 'SELECT') form.target.outerHTML = `<input name="target" placeholder="${form.target_type.value === 'tag' ? 'e.g. cooking' : 'username'}" required>`;
    else form.target.placeholder = form.target_type.value === 'tag' ? 'e.g. cooking' : 'username';
  };
  form.target_type.onchange = syncTarget;
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
  view.innerHTML = `<div class="page"><div class="page-head"><h1>Roadmap</h1></div>
    <div class="explainer">Gallium gets built in the order you vote for. Suggest a feature or report something broken, and upvote what matters to you. The top of this list is what gets worked on next.</div>
    <form id="rmform" class="card" style="padding:14px;margin-top:16px">
      <div style="display:flex;gap:8px;margin-bottom:8px"><select name="kind" style="width:auto"><option value="idea">Idea</option><option value="fix">Fix</option></select><input name="title" placeholder="What should change?" maxlength="140" required></div>
      <textarea name="body" rows="2" placeholder="Details (optional)"></textarea>
      <div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn primary">Submit</button></div></form>
    ${items.map((i) => `<div class="rm-item"><button class="vote ${i.voted ? 'on' : ''}" data-id="${i.id}">▲<b>${i.votes}</b></button><div><span class="pill ${i.kind === 'fix' ? 'block' : 'boost'}">${i.kind}</span> <b>${esc(i.title)}</b><div class="muted" style="margin-top:4px;font-size:14px">${esc(i.body || '')}</div><div class="muted" style="font-size:12px;margin-top:6px">@${esc(i.username)} · ${ago(i.created_at)}</div></div></div>`).join('')}</div>`;
  $('#rmform').onsubmit = async (e) => { e.preventDefault(); await api('/roadmap', { body: Object.fromEntries(new FormData(e.target)) }); roadmapView(); };
  $$('.vote').forEach((b) => (b.onclick = async () => { await api(`/roadmap/${b.dataset.id}/vote`, { method: 'POST' }); roadmapView(); }));
}

async function profileView(username) {
  const d = await api('/users/' + encodeURIComponent(username));
  const mine = d.user.id === me.id;
  view.innerHTML = `<div class="page"><div class="profile-head">${avatar(d.user, 'lg')}<div style="flex:1;min-width:0"><h1>${esc(d.user.display_name)}</h1><div class="muted">@${esc(d.user.username)}</div>
      <div class="stats"><span><b>${d.posts.length}</b> posts</span><span><b>${d.followers}</b> followers</span><span><b>${d.following}</b> following</span></div></div></div>
    ${d.user.bio ? `<p style="line-height:1.5">${esc(d.user.bio)}</p>` : ''}
    <div style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap">${mine
      ? '<button class="btn" id="edit">Edit profile</button><a class="btn" href="#/controls">⚙ Feed controls</a><a class="btn" href="#/roadmap">★ Roadmap</a><button class="btn" id="logout">Sign out</button><button class="btn danger" id="reset">Reset demo</button>'
      : `<button class="btn ${d.isFollowing ? '' : 'primary'}" id="follow">${d.isFollowing ? 'Following' : 'Follow'}</button><a class="btn" href="#/messages/${d.user.id}">Message</a>`}</div>
    <div id="ppost"></div></div>`;
  d.posts.forEach((p) => $('#ppost').append(postCard(p)));
  if (!d.posts.length) $('#ppost').innerHTML = '<div class="empty">No posts yet.</div>';
  if (mine) {
    $('#logout').onclick = async () => { await api('/logout', { method: 'POST' }); me = null; location.hash = '#/'; renderAuth(); };
    $('#reset').onclick = () => { window.galliumReset(); toast('Demo reset'); location.hash = '#/'; boot(); };
    $('#edit').onclick = () => {
      openSheet(`<h3>Edit profile</h3><form id="pf" style="margin-top:12px"><div class="field"><label>Display name</label><input name="display_name" value="${esc(d.user.display_name)}"></div>
        <div class="field"><label>Bio</label><textarea name="bio" rows="3">${esc(d.user.bio)}</textarea></div><button class="btn primary" style="width:100%">Save</button></form>`);
      $('#pf').onsubmit = async (e) => { e.preventDefault(); await api('/me', { method: 'PATCH', body: Object.fromEntries(new FormData(e.target)) }); closeSheet(); profileView(username); };
    };
  } else {
    $('#follow').onclick = async () => { await api(`/users/${d.user.id}/follow`, { method: 'POST' }); profileView(username); };
  }
}

// ---------- music player (persists across pages) ----------
const Player = {
  audio: $('#audio'), queue: [], i: 0,
  play(track, queue) {
    this.queue = queue; this.i = Math.max(0, queue.findIndex((t) => t.id === track.id));
    this.load();
  },
  load() {
    const t = this.queue[this.i];
    if (!t) return;
    this.audio.src = media(t.media);
    this.audio.play();
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
Player.audio.onplay = () => ($('#player-toggle').textContent = '❚❚');
Player.audio.onpause = () => ($('#player-toggle').textContent = '▶');
Player.audio.ontimeupdate = () => { if (Player.audio.duration) $('#player-seek').value = (Player.audio.currentTime / Player.audio.duration) * 100; };
Player.audio.onended = () => { if (Player.i < Player.queue.length - 1) { Player.i++; Player.load(); } };
$('#player-seek').oninput = (e) => { if (Player.audio.duration) Player.audio.currentTime = (e.target.value / 100) * Player.audio.duration; };
$('#player-toggle').onclick = () => (Player.audio.paused ? Player.audio.play() : Player.audio.pause());
$('#player-close').onclick = () => { Player.audio.pause(); $('#player').hidden = true; document.body.classList.remove('has-player'); Player.highlight(); };

// ---------- auth screen ----------
function renderAuth() {
  $('#nav').hidden = true;
  view.style.marginLeft = '0';
  let mode = 'login';
  const draw = () => {
    view.innerHTML = `<div class="auth"><form class="auth-box" id="af"><div class="crown el big"><small>31</small>Ga</div><h1>Gallium</h1><p class="muted">Every kind of social, one app. No ads, no paywalls, and a feed you actually control.</p>
      ${mode === 'signup' ? '<div class="field"><label>Display name</label><input name="display_name" autocomplete="name"></div>' : ''}
      <div class="field"><label>Username</label><input name="username" autocomplete="username" required></div>
      <div class="field"><label>Password</label><input name="password" type="password" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" required></div>
      <div class="err" id="aerr"></div>
      <button class="btn primary">${mode === 'signup' ? 'Create account' : 'Sign in'}</button>
      <p class="muted" style="margin-top:14px;font-size:14px">${mode === 'signup' ? 'Already have an account?' : 'New here?'} <a href="#" id="swap" style="color:var(--gold)">${mode === 'signup' ? 'Sign in' : 'Create an account'}</a></p>
      ${mode === 'login' ? '<p class="muted" style="font-size:13px">Demo account: <b>demo</b> / <b>gallium123</b></p>' : ''}</form></div>`;
    $('#swap').onclick = (e) => { e.preventDefault(); mode = mode === 'login' ? 'signup' : 'login'; draw(); };
    $('#af').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/' + mode, { body: Object.fromEntries(new FormData(e.target)) }); boot(); } catch (err) { $('#aerr').textContent = err.message; }
    };
  };
  draw();
}

// ---------- live updates ----------
let streamHooked = false;
function connectStream() {
  if (streamHooked) return;
  streamHooked = true;
  window.galliumEvents.on((m) => {
    if (!me || (m.sender_id !== me.id && m.recipient_id !== me.id)) return;
    const other = m.sender_id === me.id ? m.recipient_id : m.sender_id;
    if (activeChat && activeChat.otherId === other && location.hash.startsWith('#/messages/')) {
      activeChat.addMsg(m);
      if (m.sender_id !== me.id) api('/messages/' + other); // marks read
    } else if (m.sender_id !== me.id) {
      toast(`💬 ${m.from?.display_name || 'New message'}: ${m.body.slice(0, 60)}`);
      refreshUnread();
    }
  });
}
async function refreshUnread() {
  const convos = await api('/conversations');
  const n = convos.reduce((a, c) => a + c.unread, 0);
  $('#unread').hidden = !n; $('#unread').textContent = n;
}

// ---------- router ----------
let cleanup = null;
async function route() {
  if (!me) return;
  cleanup?.(); cleanup = null; activeChat = null;
  closeSheet();
  const [pathPart, query] = location.hash.slice(1).split('?');
  const parts = (pathPart || '/').split('/').filter(Boolean);
  const params = new URLSearchParams(query || '');
  const section = parts[0] || 'home';
  $$('#nav a[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === (section === 'u' && parts[1] === me.username ? 'me' : section)));
  window.scrollTo(0, 0);
  try {
    if (section === 'home') await homeView(params);
    else if (section === 'shorts') await shortsView();
    else if (section === 'watch') parts[1] ? await watchOne(parts[1]) : await watchView();
    else if (section === 'music') await musicView();
    else if (section === 'messages') await messagesView(parts[1]);
    else if (section === 'create') createView();
    else if (section === 'controls') await controlsView();
    else if (section === 'roadmap') await roadmapView();
    else if (section === 'me') await profileView(me.username);
    else if (section === 'u') await profileView(parts[1]);
    else await homeView(params);
  } catch (err) { if (err.message !== 'signed out') view.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
}
window.addEventListener('hashchange', route);

async function boot() {
  try { me = await api('/me'); } catch { me = null; }
  if (!me) return renderAuth();
  $('#nav').hidden = false;
  view.style.marginLeft = '';
  $('#nav a[data-nav=me]').href = '#/me';
  connectStream();
  refreshUnread();
  route();
}
boot();
