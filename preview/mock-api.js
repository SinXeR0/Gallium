// Browser-only stand-in for Gallium's server, so the app runs from a link with nothing installed.
// Same routes and the same feed ranking as server.js; data lives in this browser.
(function () {
  const KEY = 'gallium-demo-v4';
  const KINDS = ['text', 'photo', 'short', 'video', 'track'];
  const kindLabel = (k) => ({ text: 'text posts', photo: 'photos', short: 'shorts', video: 'videos', track: 'music' }[k]);
  const stamp = (d = new Date()) => d.toISOString().replace('T', ' ').slice(0, 19);
  const parseTags = (s) => [...new Set(String(s || '').toLowerCase().match(/[a-z0-9_]+/g) || [])].slice(0, 8);
  let S;

  // ---------- persistence ----------
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
  const nextId = (table) => (S.seq[table] = (S.seq[table] || 0) + 1);

  // Uploaded files: kept as object URLs, and stored in IndexedDB when the browser allows it.
  const blobUrls = {};
  let idb = null;
  const idbReady = new Promise((resolve) => {
    try {
      const req = indexedDB.open('gallium-uploads', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('files');
      req.onsuccess = () => {
        idb = req.result;
        const all = idb.transaction('files').objectStore('files').openCursor();
        all.onsuccess = () => { const c = all.result; if (c) { blobUrls[c.key] = URL.createObjectURL(c.value); c.continue(); } else resolve(); };
        all.onerror = () => resolve();
      };
      req.onerror = () => resolve();
    } catch { resolve(); }
  });
  function storeFile(file) {
    const id = 'upl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    blobUrls[id] = URL.createObjectURL(file);
    try { idb?.transaction('files', 'readwrite').objectStore('files').put(file, id); } catch {}
    return id;
  }
  window.galliumMedia = (f) => (!f ? '' : f.startsWith('upl_') ? blobUrls[f] || '' : 'media/' + encodeURIComponent(f));

  // ---------- seed ----------
  function seed() {
    S = { seq: {}, users: [], posts: [], likes: [], dislikes: [], reposts: [], folders: [], saves: [], reports: [], comments: [], follows: [], prefs: [], hidden: [], messages: [], roadmap: [], votes: [], session: null };
    const users = [
      ['demo', 'You (Demo)', 'Trying out Gallium.', '#f5b83d'],
      ['maya', 'Maya Torres', 'Food, travel, too much coffee.', '#ec4899'],
      ['jaylen', 'Jaylen Brooks', 'Skater. I film everything on my phone.', '#10b981'],
      ['nova', 'Nova Beats', 'Producer. New loop every week.', '#8b5cf6'],
      ['techtom', 'Tom Okafor', 'PC builds and tech that is actually worth it.', '#3b82f6'],
      ['astro_lee', 'Lee Park', 'Space nerd explaining the universe in plain words.', '#14b8a6'],
      ['chefkai', 'Kai Nakamura', 'Fast food that is actually good for you.', '#ef4444'],
    ];
    const ids = {};
    for (const [username, display_name, bio, avatar_color] of users) {
      const id = nextId('users');
      ids[username] = id;
      S.users.push({ id, username, display_name, bio, avatar_color, password: 'gallium123' });
    }
    let minutesAgo = 0;
    const post = (u, kind, o = {}) => {
      minutesAgo += 17 + Math.floor(Math.random() * 40);
      const id = nextId('posts');
      S.posts.push({ id, user_id: ids[u], kind, title: o.title || null, body: o.body || null, media: o.media || null, cover: o.cover || null, tags: (o.tags || []).join(','), duration: o.duration || null, created_at: stamp(new Date(Date.now() - minutesAgo * 60000)) });
      return id;
    };
    const P = [];
    P.push(post('maya', 'photo', { body: 'Caught the last ten minutes of light tonight. No filter, I promise.', media: 'photo_sunset.jpg', tags: ['sunset', 'travel', 'photography'] }));
    P.push(post('jaylen', 'short', { title: 'Day 47 of learning kickflips', media: 'short_trick.mp4', cover: 'short_trick.jpg', tags: ['skate', 'progress'], duration: 10 }));
    P.push(post('nova', 'track', { title: 'Night Drive', body: 'Windows down, city lights.', media: 'track_nightdrive.mp3', cover: 'track_nightdrive.jpg', tags: ['synthwave', 'chill'], duration: 48 }));
    P.push(post('techtom', 'video', { title: 'Building a PC in 2026', body: 'Every part, every cable, no sponsor segments.\n\n0:00 Parts\n0:20 Motherboard\n0:45 Cable management', media: 'video_build.mp4', cover: 'video_build.jpg', tags: ['tech', 'pcbuild'], duration: 75 }));
    P.push(post('astro_lee', 'text', { body: 'Hot take: the best part of a social app with no ads is that nobody is trying to keep you scrolling. You can just close it when you are done.', tags: ['gallium', 'meta'] }));
    P.push(post('maya', 'short', { title: 'my cat discovered the printer', media: 'short_cat.mp4', cover: 'short_cat.jpg', tags: ['cats', 'funny'], duration: 9 }));
    P.push(post('chefkai', 'video', { title: 'One-pan pasta, 15 min', body: 'Pasta, garlic, cherry tomatoes, spinach, one pan. That is it.', media: 'video_cook.mp4', cover: 'video_cook.jpg', tags: ['cooking', 'food', 'recipes'], duration: 62 }));
    P.push(post('nova', 'short', { title: 'made this beat on my phone', media: 'short_beat.mp4', cover: 'short_beat.jpg', tags: ['music', 'producer'], duration: 13 }));
    P.push(post('chefkai', 'photo', { body: 'Homemade margherita. 72 hour dough. Worth it.', media: 'photo_food.jpg', tags: ['food', 'pizza'] }));
    P.push(post('nova', 'track', { title: 'Sunrise Loop', media: 'track_sunrise.mp3', cover: 'track_sunrise.jpg', tags: ['chill', 'morning'], duration: 48 }));
    P.push(post('astro_lee', 'video', { title: 'Why the night sky is dark', body: "If the universe is infinite and full of stars, why isn't the sky bright? Olbers' paradox in 90 seconds.", media: 'video_space.mp4', cover: 'video_space.jpg', tags: ['space', 'science'], duration: 90 }));
    P.push(post('techtom', 'short', { title: '3 keyboard shortcuts you need', media: 'short_tip.mp4', cover: 'short_tip.jpg', tags: ['tech', 'tips'], duration: 14 }));
    P.push(post('jaylen', 'text', { body: 'Anyone in the city want to skate the new park Saturday morning? Bringing extra boards.', tags: ['skate', 'meetup'] }));
    P.push(post('maya', 'photo', { body: 'Water this clear should be illegal.', media: 'photo_ocean.jpg', tags: ['travel', 'ocean'] }));
    P.push(post('nova', 'track', { title: 'Rain on Glass', media: 'track_rain.mp3', cover: 'track_rain.jpg', tags: ['lofi', 'chill'], duration: 48 }));
    P.push(post('jaylen', 'video', { title: 'Street skating: full part', body: 'Six months of footage, one phone.', media: 'video_skate.mp4', cover: 'video_skate.jpg', tags: ['skate'], duration: 55 }));
    P.push(post('chefkai', 'short', { title: 'midnight ramen upgrade', media: 'short_food.mp4', cover: 'short_food.jpg', tags: ['food', 'cooking'], duration: 11 }));
    P.push(post('astro_lee', 'photo', { body: 'Hiked up for the stars, stayed for the trees.', media: 'photo_forest.jpg', tags: ['nature', 'photography'] }));
    P.push(post('nova', 'track', { title: 'Run It Up', body: 'Gym playlist material.', media: 'track_hype.mp3', cover: 'track_hype.jpg', tags: ['hiphop', 'workout'], duration: 48 }));
    P.push(post('maya', 'short', { title: 'POV: the beat drops', media: 'short_dance.mp4', cover: 'short_dance.jpg', tags: ['dance', 'music'], duration: 12 }));
    P.push(post('techtom', 'text', { body: 'Reminder that you can turn off any whole format in Feed controls. Hate shorts? One tap and they are gone everywhere.', tags: ['gallium', 'tips'] }));
    P.push(post('maya', 'photo', { body: 'City at night from the 40th floor.', media: 'photo_city.jpg', tags: ['city', 'photography'] }));
    P.push(post('nova', 'track', { title: 'Study Session', media: 'track_lofi.mp3', cover: 'track_lofi.jpg', tags: ['lofi', 'study'], duration: 48 }));
    for (const pid of P) for (const u of Object.keys(ids)) {
      if (u === 'demo') continue;
      const r = Math.random();
      if (r < 0.45) S.likes.push({ post_id: pid, user_id: ids[u] });
      else if (r < 0.55) S.dislikes.push({ post_id: pid, user_id: ids[u] });
    }
    S.reposts.push({ post_id: P[10], user_id: ids.maya, created_at: stamp() }, { post_id: P[3], user_id: ids.nova, created_at: stamp() });
    const folder = (name, style, parent, posts) => {
      const id = nextId('folders');
      S.folders.push({ id, user_id: ids.demo, name, parent_id: parent, position: style.pos, color: style.color, icon: style.icon, icon_style: style.icon_style || 'vector', icon_image: null, layout: style.layout || 'grid', shape: style.shape || 'rounded', created_at: stamp() });
      posts.forEach((pid, i) => S.saves.push({ folder_id: id, post_id: pid, position: i, created_at: stamp() }));
      return id;
    };
    folder('Watch later', { pos: 0, color: '#7cfcfd', icon: '🔖' }, null, [P[3], P[10]]);
    const food = folder('Food', { pos: 1, color: '#fd9efc', icon: '🍳', icon_style: 'native' }, null, [P[8]]);
    const quick = folder('Quick meals', { pos: 0, color: '#8ff0b0', icon: '⚡' }, food, [P[6]]);
    folder('Late night', { pos: 0, color: '#b9a2ff', icon: '🌙', shape: 'circle' }, quick, [P[16]]);
    folder('Study music', { pos: 2, color: '#ffb36b', icon: '🎧', layout: 'list' }, null, [P[22], P[14], P[9]]);
    const comment = (pid, u, body) => S.comments.push({ id: nextId('comments'), post_id: pid, user_id: ids[u], body, created_at: stamp() });
    comment(P[0], 'jaylen', 'Where is this?!');
    comment(P[0], 'astro_lee', 'Those colors are unreal.');
    comment(P[3], 'jaylen', 'No sponsor segment is a breath of fresh air');
    comment(P[6], 'maya', 'Made this tonight, so good.');
    for (const [a, b] of [['demo', 'maya'], ['demo', 'nova'], ['maya', 'jaylen'], ['jaylen', 'maya'], ['nova', 'maya'], ['techtom', 'astro_lee']]) S.follows.push({ follower_id: ids[a], followee_id: ids[b] });
    const dm = (from, to, body) => S.messages.push({ id: nextId('messages'), sender_id: ids[from], recipient_id: ids[to], body, created_at: stamp(), read_at: from === 'demo' ? stamp() : null });
    dm('maya', 'demo', 'Hey! Welcome to Gallium 👋');
    dm('demo', 'maya', 'Thanks! Loving the sunset pic.');
    dm('maya', 'demo', 'Try tapping "More of this" on stuff you like, the feed changes right away.');
    dm('nova', 'demo', 'New track dropping Friday, want an early listen?');
    const rm = (u, kind, title, body, voters) => {
      const id = nextId('roadmap');
      S.roadmap.push({ id, user_id: ids[u], title, body, kind, created_at: stamp() });
      for (const v of voters) S.votes.push({ item_id: id, user_id: ids[v] });
    };
    rm('jaylen', 'idea', 'Live streaming', 'Go live from your phone with chat.', ['jaylen', 'maya', 'nova', 'techtom', 'astro_lee']);
    rm('maya', 'idea', 'Group chats', 'Messaging with more than one person.', ['maya', 'jaylen', 'chefkai', 'nova']);
    rm('nova', 'idea', 'Playlists and albums', 'Group tracks together and let listeners save them.', ['nova', 'maya', 'techtom']);
    rm('techtom', 'fix', 'Video quality picker', 'Let me choose 480p on mobile data.', ['techtom', 'astro_lee']);
    rm('chefkai', 'idea', 'Creator tips and memberships', 'A way for fans to support creators directly, no ads needed.', ['chefkai', 'nova']);
    S.session = ids.demo; // open signed in, so the first screen is the feed
    save();
  }
  S = load();
  if (!S || !S.users) seed();

  // ---------- helpers ----------
  class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
  const fail = (status, msg) => { throw new HttpError(status, msg); };
  const userById = (id) => S.users.find((u) => u.id === Number(id));
  const publicUser = (u) => u && ({ id: u.id, username: u.username, display_name: u.display_name, bio: u.bio, avatar_color: u.avatar_color });
  const count = (table, pid) => S[table].filter((l) => l.post_id === pid).length;
  const has = (table, pid, uid) => S[table].some((l) => l.post_id === pid && l.user_id === uid);
  const likeCount = (pid) => count('likes', pid);
  const myFolderIds = (uid) => new Set(S.folders.filter((f) => f.user_id === uid).map((f) => f.id));
  function hydrate(p, viewerId) {
    const mine = myFolderIds(viewerId);
    return {
      ...p, tags: p.tags ? p.tags.split(',') : [], author: publicUser(userById(p.user_id)),
      likes: count('likes', p.id), liked: has('likes', p.id, viewerId), dislikes: count('dislikes', p.id), disliked: has('dislikes', p.id, viewerId),
      reposts: count('reposts', p.id), reposted: has('reposts', p.id, viewerId), comments: count('comments', p.id),
      saved: S.saves.some((s) => s.post_id === p.id && mine.has(s.folder_id)),
    };
  }
  function loadPrefs(userId) {
    const p = { block: { tag: new Set(), creator: new Set(), kind: new Set() }, boost: { tag: {}, creator: {}, kind: {} } };
    for (const r of S.prefs.filter((r) => r.user_id === userId)) {
      if (r.action === 'block') p.block[r.target_type].add(String(r.target));
      else p.boost[r.target_type][String(r.target)] = r.weight;
    }
    p.hidden = new Set(S.hidden.filter((h) => h.user_id === userId).map((h) => h.post_id));
    p.following = new Set(S.follows.filter((f) => f.follower_id === userId).map((f) => String(f.followee_id)));
    p.repostedBy = new Map(S.reposts.filter((r) => p.following.has(String(r.user_id))).map((r) => [r.post_id, userById(r.user_id)?.username]));
    return p;
  }
  // Same ranking as server.js rank(): Never rules filter first, then freshness, follows, popularity and boosts.
  function rank(posts, prefs, viewerId) {
    const now = Date.now(), out = [];
    for (const post of posts) {
      const tags = post.tags ? post.tags.split(',') : [];
      if (prefs.hidden.has(post.id) || prefs.block.kind.has(post.kind) || prefs.block.creator.has(String(post.user_id)) || tags.some((t) => prefs.block.tag.has(t))) continue;
      const reasons = [], asked = [];
      const ageHours = (now - new Date(post.created_at + 'Z').getTime()) / 36e5;
      let score = 10 / Math.pow(ageHours + 2, 0.5);
      const likes = likeCount(post.id);
      score += Math.log2(1 + likes) * 0.6;
      if (prefs.following.has(String(post.user_id))) { score += 3; reasons.push('You subscribe to this creator'); }
      const reposter = prefs.repostedBy.get(post.id);
      if (reposter && post.user_id !== viewerId) { score += 2; reasons.push(`Reposted by @${reposter}`); }
      const cw = prefs.boost.creator[String(post.user_id)];
      if (cw) { score += cw * 2; asked.push('this creator'); }
      const kw = prefs.boost.kind[post.kind];
      if (kw) { score += kw * 1.5; asked.push(kindLabel(post.kind)); }
      for (const t of tags) { const w = prefs.boost.tag[t]; if (w) { score += w * 2; asked.push('#' + t); } }
      if (asked.length) reasons.push('You asked for more ' + asked.join(', '));
      if (post.user_id === viewerId) reasons.push('Your post');
      if (!reasons.length) reasons.push(likes > 2 ? 'Popular right now' : 'New on Gallium');
      out.push({ post, score, reasons });
    }
    return out.sort((a, b) => b.score - a.score);
  }
  const setPref = (uid, type, target, action, weight) => {
    S.prefs = S.prefs.filter((r) => !(r.user_id === uid && r.target_type === type && r.target === String(target)));
    S.prefs.push({ id: nextId('prefs'), user_id: uid, target_type: type, target: String(target), action, weight, created_at: stamp() });
  };

  // Live events, standing in for the server's event stream.
  const listeners = [];
  window.galliumEvents = { on: (fn) => listeners.push(fn) };
  const emit = (msg) => listeners.forEach((fn) => fn(msg));
  const REPLIES = ['Haha love that 😂', 'For real, no ads is a game changer', 'Sending you my new track later 🎧', 'Did you try blocking a whole format yet? Feels so good', 'Yo that’s fire 🔥', 'Bet, talk soon!'];

  // ---------- routes ----------
  const routes = [];
  const on = (method, pattern, fn, open = false) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/?]+)') + '(?:\\?.*)?$'), fn, open });

  on('POST', '/signup', ({ body }) => {
    const { username, password, display_name } = body || {};
    if (!/^[a-z0-9_]{3,20}$/i.test(username || '')) fail(400, 'Username: 3-20 letters, numbers or _');
    if (!password || password.length < 6) fail(400, 'Password needs at least 6 characters');
    if (S.users.some((u) => u.username === username.toLowerCase())) fail(400, 'That username is taken');
    const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
    const id = nextId('users');
    S.users.push({ id, username: username.toLowerCase(), display_name: display_name || username, bio: '', avatar_color: colors[id % colors.length], password });
    S.session = id;
    return { ok: true };
  }, true);
  on('POST', '/login', ({ body }) => {
    const u = S.users.find((x) => x.username === String(body?.username || '').toLowerCase());
    if (!u || u.password !== body?.password) fail(400, 'Wrong username or password');
    S.session = u.id;
    return { ok: true };
  }, true);
  on('POST', '/logout', () => { S.session = null; return { ok: true }; }, true);
  on('GET', '/me', ({ me }) => publicUser(me));
  on('PATCH', '/me', ({ me, body }) => { if (body.display_name != null) me.display_name = body.display_name; if (body.bio != null) me.bio = body.bio; return { ok: true }; });

  on('POST', '/posts', ({ me, body }) => {
    const fd = body;
    const kind = fd.get('kind'), media = fd.get('media'), cover = fd.get('cover');
    if (!KINDS.includes(kind)) fail(400, 'Unknown post type');
    if (kind !== 'text' && !(media instanceof Blob)) fail(400, 'Attach a file for this post type');
    if (kind === 'text' && !String(fd.get('body') || '').trim()) fail(400, 'Write something first');
    const id = nextId('posts');
    const p = { id, user_id: me.id, kind, title: fd.get('title') || null, body: fd.get('body') || null,
      media: media instanceof Blob ? storeFile(media) : null, cover: cover instanceof Blob ? storeFile(cover) : null,
      tags: parseTags(fd.get('tags')).join(','), duration: Number(fd.get('duration')) || null, created_at: stamp() };
    S.posts.push(p);
    return hydrate(p, me.id);
  });
  on('DELETE', '/posts/:id', ({ me, params }) => { S.posts = S.posts.filter((p) => !(p.id === +params.id && p.user_id === me.id)); return { ok: true }; });
  on('GET', '/feed', ({ me, query }) => {
    const kinds = String(query.get('kinds') || '').split(',').filter((k) => KINDS.includes(k));
    const posts = S.posts.filter((p) => !kinds.length || kinds.includes(p.kind));
    const limit = Math.min(Number(query.get('limit')) || 30, 100);
    const prefs = loadPrefs(me.id);
    let ranked = rank(posts, prefs, me.id);
    if (query.get('scope') === 'subs') ranked = ranked.filter((r) => prefs.following.has(String(r.post.user_id))).sort((a, b) => b.post.created_at.localeCompare(a.post.created_at));
    return ranked.slice(0, limit).map((r) => ({ ...hydrate(r.post, me.id), why: r.reasons }));
  });
  on('GET', '/posts/:id', ({ me, params }) => { const p = S.posts.find((x) => x.id === +params.id); if (!p) fail(404, 'Not found'); return hydrate(p, me.id); });
  on('POST', '/posts/:id/more', ({ me, params }) => {
    const p = S.posts.find((x) => x.id === +params.id); if (!p) fail(404, 'Not found');
    const bump = (type, target) => {
      const r = S.prefs.find((x) => x.user_id === me.id && x.target_type === type && x.target === String(target) && x.action === 'boost');
      if (r) r.weight = Math.min(r.weight + 1, 10); else setPref(me.id, type, target, 'boost', 1);
    };
    bump('creator', p.user_id); bump('kind', p.kind);
    for (const t of (p.tags ? p.tags.split(',') : [])) bump('tag', t);
    return { ok: true };
  });
  on('POST', '/posts/:id/never', ({ me, params, body }) => {
    const p = S.posts.find((x) => x.id === +params.id); if (!p) fail(404, 'Not found');
    if (!S.hidden.some((h) => h.user_id === me.id && h.post_id === p.id)) S.hidden.push({ user_id: me.id, post_id: p.id });
    const { scope, target } = body || {};
    if (scope === 'creator') setPref(me.id, 'creator', p.user_id, 'block', 0);
    if (scope === 'kind') setPref(me.id, 'kind', p.kind, 'block', 0);
    if (scope === 'tag' && target) setPref(me.id, 'tag', String(target).toLowerCase(), 'block', 0);
    return { ok: true };
  });
  on('GET', '/prefs', ({ me }) => ({
    rules: S.prefs.filter((r) => r.user_id === me.id).sort((a, b) => a.action.localeCompare(b.action) || b.weight - a.weight).map((r) => ({
      ...r, label: r.target_type === 'creator' ? '@' + (userById(r.target)?.username || '?') : r.target_type === 'tag' ? '#' + r.target : kindLabel(r.target),
    })),
    hiddenCount: S.hidden.filter((h) => h.user_id === me.id).length,
  }));
  on('POST', '/prefs', ({ me, body }) => {
    const { target_type, target, action } = body || {};
    if (!['tag', 'creator', 'kind'].includes(target_type) || !['block', 'boost'].includes(action) || !target) fail(400, 'Bad rule');
    let t = String(target).toLowerCase().replace(/^[#@]/, '');
    if (target_type === 'creator') { const u = S.users.find((x) => x.username === t); if (!u) fail(400, 'No user with that name'); t = String(u.id); }
    setPref(me.id, target_type, t, action, action === 'boost' ? 2 : 0);
    return { ok: true };
  });
  on('PATCH', '/prefs/:id', ({ me, params, body }) => { const r = S.prefs.find((x) => x.id === +params.id && x.user_id === me.id && x.action === 'boost'); if (r) r.weight = Math.max(1, Math.min(10, Number(body?.weight) || 1)); return { ok: true }; });
  on('DELETE', '/prefs/:id', ({ me, params }) => { S.prefs = S.prefs.filter((r) => !(r.id === +params.id && r.user_id === me.id)); return { ok: true }; });
  on('DELETE', '/hidden', ({ me }) => { S.hidden = S.hidden.filter((h) => h.user_id !== me.id); return { ok: true }; });

  const react = (table, other) => ({ me, params }) => {
    const pid = +params.id, had = has(table, pid, me.id);
    S[other] = S[other].filter((l) => !(l.post_id === pid && l.user_id === me.id));
    if (had) S[table] = S[table].filter((l) => !(l.post_id === pid && l.user_id === me.id)); else S[table].push({ post_id: pid, user_id: me.id });
    return { likes: count('likes', pid), liked: has('likes', pid, me.id), dislikes: count('dislikes', pid), disliked: has('dislikes', pid, me.id) };
  };
  on('POST', '/posts/:id/like', react('likes', 'dislikes'));
  on('POST', '/posts/:id/dislike', react('dislikes', 'likes'));
  on('POST', '/posts/:id/repost', ({ me, params }) => {
    const pid = +params.id, had = has('reposts', pid, me.id);
    if (had) S.reposts = S.reposts.filter((r) => !(r.post_id === pid && r.user_id === me.id)); else S.reposts.push({ post_id: pid, user_id: me.id, created_at: stamp() });
    return { reposted: !had, reposts: count('reposts', pid) };
  });
  on('POST', '/posts/:id/report', ({ me, params, body }) => {
    const reason = String(body?.reason || '').trim(); if (!reason) fail(400, 'Pick a reason');
    S.reports.push({ id: nextId('reports'), post_id: +params.id, user_id: me.id, reason, created_at: stamp() });
    return { ok: true };
  });
  on('GET', '/posts/:id/interactions', ({ params }) => {
    const pid = +params.id, people = (t) => S[t].filter((x) => x.post_id === pid).map((x) => publicUser(userById(x.user_id)));
    return { likers: people('likes'), reposters: people('reposts'), likes: count('likes', pid), dislikes: count('dislikes', pid), reposts: count('reposts', pid), comments: count('comments', pid), saves: S.saves.filter((s) => s.post_id === pid).length };
  });
  // Folders nest without limit; mirrors the folder routes in server.js.
  const FOLDER_STYLE = { layout: ['grid', 'list', 'large'], shape: ['rounded', 'square', 'circle'], icon_style: ['vector', 'native', 'image'] };
  const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c);
  const isIcon = (i) => typeof i === 'string' && i.length > 0 && i.length <= 32 && !/[<>&"']/.test(i);
  const newFolder = (uid, name, parent_id = null, style = {}) => {
    const position = S.folders.filter((f) => f.user_id === uid && (f.parent_id ?? null) === parent_id).reduce((m, f) => Math.max(m, f.position ?? 0), -1) + 1;
    const f = { id: nextId('folders'), user_id: uid, name, parent_id, position, color: '#7cfcfd', icon: '📁', icon_style: 'vector', icon_image: null, layout: 'grid', shape: 'rounded', ...style, created_at: stamp() };
    S.folders.push(f); return f;
  };
  const ensureFolders = (uid) => { if (!S.folders.some((f) => f.user_id === uid)) newFolder(uid, 'Watch later'); };
  const postById = (id) => S.posts.find((p) => p.id === id);
  const ownFolder = (id, uid) => S.folders.find((x) => x.id === Number(id) && x.user_id === uid);
  const bySpot = (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id;
  const subtreeIds = (id) => { const ids = [id]; for (let i = 0; i < ids.length; i++) S.folders.forEach((f) => f.parent_id === ids[i] && ids.push(f.id)); return ids; };
  const cleanStyle = (body) => {
    const out = Object.fromEntries(Object.keys(FOLDER_STYLE).filter((k) => FOLDER_STYLE[k].includes(body?.[k])).map((k) => [k, body[k]]));
    if (isHex(body?.color)) out.color = body.color.toLowerCase();
    if (isIcon(body?.icon)) out.icon = body.icon;
    return out;
  };
  const folderSummary = (f, pid) => {
    const tree = new Set(subtreeIds(f.id)), all = S.saves.filter((s) => tree.has(s.folder_id)).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const latest = all[0] && postById(all[0].post_id);
    return { ...f, parent_id: f.parent_id ?? null, count: S.saves.filter((s) => s.folder_id === f.id).length, folders: S.folders.filter((c) => c.parent_id === f.id).length, total: all.length,
      cover: latest ? (latest.cover || (latest.kind === 'photo' ? latest.media : null)) : null, contains: !!pid && S.saves.some((s) => s.folder_id === f.id && s.post_id === pid) };
  };
  on('GET', '/folders', ({ me, query }) => {
    ensureFolders(me.id);
    const pid = Number(query.get('post')) || 0;
    return S.folders.filter((f) => f.user_id === me.id).sort(bySpot).map((f) => folderSummary(f, pid));
  });
  on('POST', '/folders/reorder', ({ me, body }) => { (body?.ids || []).forEach((id, i) => { const f = ownFolder(id, me.id); if (f) f.position = i; }); return { ok: true }; });
  on('POST', '/folders', ({ me, body }) => {
    const name = String(body?.name || '').trim().slice(0, 60); if (!name) fail(400, 'Name the folder');
    const parent = body?.parent_id ? ownFolder(body.parent_id, me.id) : null;
    if (body?.parent_id && !parent) fail(404, 'Folder not found');
    return newFolder(me.id, name, parent ? parent.id : null, cleanStyle(body));
  });
  on('PATCH', '/folders/:id', ({ me, params, body }) => {
    const f = ownFolder(params.id, me.id); if (!f) fail(404, 'Not found');
    if (body?.parent_id !== undefined) {
      const pid = body.parent_id ? Number(body.parent_id) : null;
      if (pid && (!ownFolder(pid, me.id) || subtreeIds(f.id).includes(pid))) fail(400, "A folder can't go inside itself");
      f.parent_id = pid;
    }
    if (body?.name !== undefined) f.name = String(body.name).trim().slice(0, 60) || f.name;
    Object.assign(f, cleanStyle(body));
    return f;
  });
  on('DELETE', '/folders/:id', ({ me, params }) => {
    if (!ownFolder(params.id, me.id)) fail(404, 'Not found');
    const gone = new Set(subtreeIds(+params.id));
    S.folders = S.folders.filter((f) => !gone.has(f.id));
    S.saves = S.saves.filter((s) => !gone.has(s.folder_id));
    return { ok: true };
  });
  on('GET', '/folders/:id', ({ me, params }) => {
    const f = ownFolder(params.id, me.id); if (!f) fail(404, 'Not found');
    const path = [];
    for (let p = f.parent_id; p; ) { const up = ownFolder(p, me.id); if (!up) break; path.unshift({ id: up.id, name: up.name }); p = up.parent_id; }
    return { ...folderSummary(f), path, children: S.folders.filter((c) => c.parent_id === f.id).sort(bySpot).map((c) => folderSummary(c)),
      posts: S.saves.filter((s) => s.folder_id === f.id).sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || b.created_at.localeCompare(a.created_at))
        .map((s) => postById(s.post_id)).filter(Boolean).map((p) => hydrate(p, me.id)) };
  });
  on('POST', '/folders/:id/image', ({ me, params, body }) => {
    const f = ownFolder(params.id, me.id); if (!f) fail(404, 'Not found');
    const file = body?.get?.('image');
    if (!(file instanceof Blob) || !file.type.startsWith('image/')) fail(400, 'Pick an image');
    if (file.size > 10 * 1024 * 1024) fail(400, 'Images up to 10 MB');
    f.icon_image = storeFile(file); f.icon_style = 'image';
    return f;
  });
  on('POST', '/folders/:id/reorder', ({ me, params, body }) => {
    const f = ownFolder(params.id, me.id); if (!f) fail(404, 'Not found');
    (body?.post_ids || []).forEach((pid, i) => { const s = S.saves.find((x) => x.folder_id === f.id && x.post_id === Number(pid)); if (s) s.position = i; });
    return { ok: true };
  });
  on('POST', '/folders/:id/toggle', ({ me, params, body }) => {
    const f = ownFolder(params.id, me.id); if (!f) fail(404, 'Not found');
    const pid = Number(body?.post_id), had = S.saves.some((s) => s.folder_id === f.id && s.post_id === pid);
    if (had) S.saves = S.saves.filter((s) => !(s.folder_id === f.id && s.post_id === pid));
    else S.saves.push({ folder_id: f.id, post_id: pid, position: S.saves.filter((s) => s.folder_id === f.id).reduce((m, s) => Math.min(m, s.position ?? 0), 1) - 1, created_at: stamp() });
    return { saved: !had, folder: f.name };
  });
  on('GET', '/subscriptions', ({ me }) => S.follows.filter((f) => f.follower_id === me.id).map((f) => publicUser(userById(f.followee_id))).sort((a, b) => a.display_name.localeCompare(b.display_name)));
  on('GET', '/posts/:id/comments', ({ params }) => S.comments.filter((c) => c.post_id === +params.id).map((c) => { const u = userById(c.user_id); return { ...c, username: u.username, display_name: u.display_name, avatar_color: u.avatar_color }; }));
  on('POST', '/posts/:id/comments', ({ me, params, body }) => {
    const text = String(body?.body || '').trim(); if (!text) fail(400, 'Empty comment');
    S.comments.push({ id: nextId('comments'), post_id: +params.id, user_id: me.id, body: text.slice(0, 2000), created_at: stamp() });
    return { ok: true };
  });
  on('GET', '/users/:username', ({ me, params }) => {
    const u = S.users.find((x) => x.username === decodeURIComponent(params.username).toLowerCase()); if (!u) fail(404, 'Not found');
    return {
      user: publicUser(u), posts: S.posts.filter((p) => p.user_id === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((p) => hydrate(p, me.id)),
      followers: S.follows.filter((f) => f.followee_id === u.id).length, following: S.follows.filter((f) => f.follower_id === u.id).length,
      isFollowing: S.follows.some((f) => f.follower_id === me.id && f.followee_id === u.id),
      reposts: S.reposts.filter((r) => r.user_id === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((r) => postById(r.post_id)).filter(Boolean).map((p) => hydrate(p, me.id)),
    };
  });
  on('POST', '/users/:id/follow', ({ me, params }) => {
    const id = +params.id; if (id === me.id) fail(400, "You can't subscribe to yourself");
    const had = S.follows.some((f) => f.follower_id === me.id && f.followee_id === id);
    if (had) S.follows = S.follows.filter((f) => !(f.follower_id === me.id && f.followee_id === id)); else S.follows.push({ follower_id: me.id, followee_id: id });
    return { following: !had, followers: S.follows.filter((f) => f.followee_id === id).length };
  });
  on('GET', '/search', ({ query }) => {
    const q = String(query.get('q') || '').toLowerCase();
    return { users: S.users.filter((u) => u.username.includes(q) || u.display_name.toLowerCase().includes(q)).slice(0, 10).map(publicUser) };
  });

  on('GET', '/conversations', ({ me }) => {
    const latest = new Map();
    for (const m of S.messages) if (m.sender_id === me.id || m.recipient_id === me.id) latest.set(m.sender_id === me.id ? m.recipient_id : m.sender_id, m);
    return [...latest.entries()].sort((a, b) => b[1].id - a[1].id).map(([other, last]) => ({
      user: publicUser(userById(other)), last,
      unread: S.messages.filter((m) => m.sender_id === other && m.recipient_id === me.id && !m.read_at).length,
    }));
  });
  on('GET', '/messages/:userId', ({ me, params }) => {
    const other = +params.userId;
    S.messages.forEach((m) => { if (m.sender_id === other && m.recipient_id === me.id && !m.read_at) m.read_at = stamp(); });
    return { user: publicUser(userById(other)), messages: S.messages.filter((m) => (m.sender_id === me.id && m.recipient_id === other) || (m.sender_id === other && m.recipient_id === me.id)) };
  });
  on('POST', '/messages/:userId', ({ me, params, body }) => {
    const other = +params.userId, text = String(body?.body || '').trim();
    if (!text) fail(400, 'Empty message');
    const them = userById(other); if (!them) fail(404, 'No such user');
    const msg = { id: nextId('messages'), sender_id: me.id, recipient_id: other, body: text.slice(0, 4000), created_at: stamp(), read_at: null };
    S.messages.push(msg);
    setTimeout(() => emit(msg), 0);
    // Demo creators write back, so the chat feels alive in a one-person preview.
    if (them.password === 'gallium123' && them.username !== 'demo') {
      setTimeout(() => {
        const reply = { id: nextId('messages'), sender_id: other, recipient_id: me.id, body: REPLIES[Math.floor(Math.random() * REPLIES.length)], created_at: stamp(), read_at: null };
        S.messages.push(reply); save();
        emit({ ...reply, from: publicUser(them) });
      }, 1400 + Math.random() * 1200);
    }
    return msg;
  });

  on('GET', '/roadmap', ({ me }) => S.roadmap.map((i) => ({
    ...i, username: userById(i.user_id)?.username, votes: S.votes.filter((v) => v.item_id === i.id).length, voted: S.votes.some((v) => v.item_id === i.id && v.user_id === me.id),
  })).sort((a, b) => b.votes - a.votes || b.created_at.localeCompare(a.created_at)));
  on('POST', '/roadmap', ({ me, body }) => {
    const title = String(body?.title || '').trim(); if (title.length < 4) fail(400, 'Describe the idea or problem');
    const id = nextId('roadmap');
    S.roadmap.push({ id, user_id: me.id, title: title.slice(0, 140), body: String(body?.body || '').slice(0, 2000), kind: body?.kind === 'fix' ? 'fix' : 'idea', created_at: stamp() });
    S.votes.push({ item_id: id, user_id: me.id });
    return { ok: true };
  });
  on('POST', '/roadmap/:id/vote', ({ me, params }) => {
    const id = +params.id, had = S.votes.some((v) => v.item_id === id && v.user_id === me.id);
    if (had) S.votes = S.votes.filter((v) => !(v.item_id === id && v.user_id === me.id)); else S.votes.push({ item_id: id, user_id: me.id });
    return { voted: !had };
  });

  window.galliumApi = async function (method, path, body) {
    await idbReady;
    const route = routes.find((r) => r.method === method && r.re.test(path));
    if (!route) throw new HttpError(404, 'Not found');
    const me = userById(S.session);
    if (!route.open && !me) throw new HttpError(401, 'Sign in first');
    const result = route.fn({ me, body, params: path.match(route.re).groups || {}, query: new URLSearchParams(path.split('?')[1] || '') });
    if (method !== 'GET' || path.startsWith('/messages/')) save();
    return JSON.parse(JSON.stringify(result ?? {}));
  };
  window.galliumReset = () => { try { localStorage.removeItem(KEY); } catch {} seed(); };
})();
