// Gallium: one ad-free social app. Feed, shorts, long videos, posts, music, messaging.
const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { openDb } = require('./db');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// First run: load the demo content so there is something to look at.
if (!fs.existsSync(path.join(DATA_DIR, 'gallium.db')) && fs.existsSync(path.join(__dirname, 'seed-media'))) require('./seed');
const db = openDb(path.join(DATA_DIR, 'gallium.db'));
const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/media', express.static(UPLOAD_DIR, { maxAge: '7d' }));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
});

// ---------- auth ----------
function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  return salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex');
}
function checkPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(pw, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
}
function startSession(res, userId) {
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);
  res.cookie('gallium_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 * 90 });
}
function auth(req, res, next) {
  const token = req.cookies.gallium_session;
  const row = token && db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?').get(token);
  if (!row) return res.status(401).json({ error: 'Sign in first' });
  req.user = row;
  next();
}
const publicUser = (u) => u && ({ id: u.id, username: u.username, display_name: u.display_name, bio: u.bio, avatar_color: u.avatar_color });

app.post('/api/signup', (req, res) => {
  const { username, password, display_name } = req.body || {};
  if (!/^[a-z0-9_]{3,20}$/i.test(username || '')) return res.status(400).json({ error: 'Username: 3-20 letters, numbers or _' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password needs at least 6 characters' });
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username.toLowerCase())) return res.status(400).json({ error: 'That username is taken' });
  const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
  const info = db.prepare('INSERT INTO users (username, display_name, password_hash, avatar_color) VALUES (?, ?, ?, ?)')
    .run(username.toLowerCase(), display_name || username, hashPassword(password), colors[Math.floor(Math.random() * colors.length)]);
  startSession(res, info.lastInsertRowid);
  res.json({ ok: true });
});
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get((username || '').toLowerCase());
  if (!u || !checkPassword(password || '', u.password_hash)) return res.status(400).json({ error: 'Wrong username or password' });
  startSession(res, u.id);
  res.json({ ok: true });
});
app.post('/api/logout', (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.cookies.gallium_session || '');
  res.clearCookie('gallium_session');
  res.json({ ok: true });
});
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/me', auth, (req, res) => res.json(publicUser(req.user)));

// ---------- content ----------
const KINDS = ['text', 'photo', 'short', 'video', 'track'];
const parseTags = (s) => [...new Set(String(s || '').toLowerCase().match(/[a-z0-9_]+/g) || [])].slice(0, 8);

const count = (table, postId) => db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE post_id = ?`).get(postId).n;
const has = (table, postId, userId) => !!db.prepare(`SELECT 1 FROM ${table} WHERE post_id = ? AND user_id = ?`).get(postId, userId);

function hydrate(post, viewerId) {
  const author = db.prepare('SELECT * FROM users WHERE id = ?').get(post.user_id);
  return {
    ...post,
    tags: post.tags ? post.tags.split(',') : [],
    author: publicUser(author),
    likes: count('likes', post.id),
    liked: has('likes', post.id, viewerId),
    dislikes: count('dislikes', post.id),
    disliked: has('dislikes', post.id, viewerId),
    reposts: count('reposts', post.id),
    reposted: has('reposts', post.id, viewerId),
    comments: count('comments', post.id),
    saved: !!db.prepare('SELECT 1 FROM saves s JOIN folders f ON f.id = s.folder_id WHERE s.post_id = ? AND f.user_id = ?').get(post.id, viewerId),
  };
}

app.post('/api/posts', auth, upload.fields([{ name: 'media', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), (req, res) => {
  const { kind, title, body, tags, duration } = req.body;
  if (!KINDS.includes(kind)) return res.status(400).json({ error: 'Unknown post type' });
  const media = req.files?.media?.[0];
  if (kind !== 'text' && !media) return res.status(400).json({ error: 'Attach a file for this post type' });
  if (kind === 'text' && !String(body || '').trim()) return res.status(400).json({ error: 'Write something first' });
  const info = db.prepare(`INSERT INTO posts (user_id, kind, title, body, media, cover, tags, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(req.user.id, kind, title || null, body || null, media ? media.filename : null,
      req.files?.cover?.[0]?.filename || null, parseTags(tags).join(','), Number(duration) || null);
  res.json(hydrate(db.prepare('SELECT * FROM posts WHERE id = ?').get(info.lastInsertRowid), req.user.id));
});

app.delete('/api/posts/:id', auth, (req, res) => {
  db.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ---------- the feed: user-controlled ranking ----------
// Every rule lives in `prefs` and is visible/editable on the Feed Controls page.
//   target_type: tag | creator | kind     action: block | boost
// Blocks are absolute filters. Boosts add weight. Hidden posts never come back.
function loadPrefs(userId) {
  const rows = db.prepare('SELECT * FROM prefs WHERE user_id = ?').all(userId);
  const p = { block: { tag: new Set(), creator: new Set(), kind: new Set() }, boost: { tag: {}, creator: {}, kind: {} } };
  for (const r of rows) {
    if (r.action === 'block') p.block[r.target_type].add(String(r.target));
    else p.boost[r.target_type][String(r.target)] = r.weight;
  }
  p.hidden = new Set(db.prepare('SELECT post_id FROM hidden WHERE user_id = ?').all(userId).map((r) => r.post_id));
  p.following = new Set(db.prepare('SELECT followee_id FROM follows WHERE follower_id = ?').all(userId).map((r) => String(r.followee_id)));
  p.repostedBy = new Map(db.prepare(`SELECT r.post_id, u.username FROM reposts r JOIN follows f ON f.followee_id = r.user_id AND f.follower_id = ?
    JOIN users u ON u.id = r.user_id ORDER BY r.created_at`).all(userId).map((r) => [r.post_id, r.username]));
  return p;
}

function rank(posts, prefs, viewerId) {
  const now = Date.now();
  const out = [];
  for (const post of posts) {
    const tags = post.tags ? post.tags.split(',') : [];
    if (prefs.hidden.has(post.id)) continue;
    if (prefs.block.kind.has(post.kind)) continue;
    if (prefs.block.creator.has(String(post.user_id))) continue;
    if (tags.some((t) => prefs.block.tag.has(t))) continue;

    const reasons = [];
    const asked = [];
    const ageHours = (now - new Date(post.created_at + 'Z').getTime()) / 36e5;
    let score = 10 / Math.pow(ageHours + 2, 0.5); // freshness
    const likes = db.prepare('SELECT COUNT(*) n FROM likes WHERE post_id = ?').get(post.id).n;
    score += Math.log2(1 + likes) * 0.6;
    if (prefs.following.has(String(post.user_id))) { score += 3; reasons.push('You subscribe to this creator'); }
    const reposter = prefs.repostedBy.get(post.id);
    if (reposter && post.user_id !== viewerId) { score += 2; reasons.push(`Reposted by @${reposter}`); }
    const cw = prefs.boost.creator[String(post.user_id)];
    if (cw) { score += cw * 2; asked.push('this creator'); }
    const kw = prefs.boost.kind[post.kind];
    if (kw) { score += kw * 1.5; asked.push(kindLabel(post.kind)); }
    for (const t of tags) {
      const w = prefs.boost.tag[t];
      if (w) { score += w * 2; asked.push('#' + t); }
    }
    if (asked.length) reasons.push('You asked for more ' + asked.join(', '));
    if (post.user_id === viewerId) reasons.push('Your post');
    if (!reasons.length) reasons.push(likes > 2 ? 'Popular right now' : 'New on Gallium');
    out.push({ post, score, reasons });
  }
  return out.sort((a, b) => b.score - a.score);
}
const kindLabel = (k) => ({ text: 'text posts', photo: 'photos', short: 'shorts', video: 'videos', track: 'music' }[k]);

app.get('/api/feed', auth, (req, res) => {
  const kinds = String(req.query.kinds || '').split(',').filter((k) => KINDS.includes(k));
  let sql = 'SELECT * FROM posts';
  if (kinds.length) sql += ` WHERE kind IN (${kinds.map(() => '?').join(',')})`;
  sql += ' ORDER BY created_at DESC LIMIT 500';
  const prefs = loadPrefs(req.user.id);
  let ranked = rank(db.prepare(sql).all(...kinds), prefs, req.user.id);
  // Subscriptions: only creators you subscribe to, newest first, still respecting your Never rules.
  if (req.query.scope === 'subs') ranked = ranked.filter((r) => prefs.following.has(String(r.post.user_id))).sort((a, b) => b.post.created_at.localeCompare(a.post.created_at));
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  res.json(ranked.slice(0, limit).map((r) => ({ ...hydrate(r.post, req.user.id), why: r.reasons })));
});

app.get('/api/posts/:id', auth, (req, res) => {
  const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(hydrate(p, req.user.id));
});

// "More of this": boost the post's creator, its tags and its format.
app.post('/api/posts/:id/more', auth, (req, res) => {
  const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const bump = (type, target) => {
    db.prepare(`DELETE FROM prefs WHERE user_id = ? AND target_type = ? AND target = ? AND action = 'block'`).run(req.user.id, type, String(target));
    db.prepare(`INSERT INTO prefs (user_id, target_type, target, action, weight) VALUES (?, ?, ?, 'boost', 1)
      ON CONFLICT(user_id, target_type, target, action) DO UPDATE SET weight = MIN(weight + 1, 10)`).run(req.user.id, type, String(target));
  };
  bump('creator', p.user_id);
  bump('kind', p.kind);
  for (const t of (p.tags ? p.tags.split(',') : [])) bump('tag', t);
  res.json({ ok: true });
});

// "Never show me this": hide the post, or block the creator / tag / whole format.
app.post('/api/posts/:id/never', auth, (req, res) => {
  const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const { scope, target } = req.body || {};
  db.prepare('INSERT OR IGNORE INTO hidden (user_id, post_id) VALUES (?, ?)').run(req.user.id, p.id);
  const block = (type, t) => {
    db.prepare(`DELETE FROM prefs WHERE user_id = ? AND target_type = ? AND target = ?`).run(req.user.id, type, String(t));
    db.prepare(`INSERT INTO prefs (user_id, target_type, target, action, weight) VALUES (?, ?, ?, 'block', 0)`).run(req.user.id, type, String(t));
  };
  if (scope === 'creator') block('creator', p.user_id);
  if (scope === 'kind') block('kind', p.kind);
  if (scope === 'tag' && target) block('tag', String(target).toLowerCase());
  res.json({ ok: true });
});

app.get('/api/prefs', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM prefs WHERE user_id = ? ORDER BY action, weight DESC').all(req.user.id).map((r) => ({
    ...r,
    label: r.target_type === 'creator' ? '@' + (db.prepare('SELECT username FROM users WHERE id = ?').get(r.target)?.username || '?')
      : r.target_type === 'tag' ? '#' + r.target : kindLabel(r.target),
  }));
  const hiddenCount = db.prepare('SELECT COUNT(*) n FROM hidden WHERE user_id = ?').get(req.user.id).n;
  res.json({ rules: rows, hiddenCount });
});
app.post('/api/prefs', auth, (req, res) => {
  const { target_type, target, action } = req.body || {};
  if (!['tag', 'creator', 'kind'].includes(target_type) || !['block', 'boost'].includes(action) || !target) return res.status(400).json({ error: 'Bad rule' });
  let t = String(target).toLowerCase().replace(/^[#@]/, '');
  if (target_type === 'creator') {
    const u = db.prepare('SELECT id FROM users WHERE username = ?').get(t);
    if (!u) return res.status(400).json({ error: 'No user with that name' });
    t = String(u.id);
  }
  db.prepare('DELETE FROM prefs WHERE user_id = ? AND target_type = ? AND target = ?').run(req.user.id, target_type, t);
  db.prepare('INSERT INTO prefs (user_id, target_type, target, action, weight) VALUES (?, ?, ?, ?, ?)').run(req.user.id, target_type, t, action, action === 'boost' ? 2 : 0);
  res.json({ ok: true });
});
app.patch('/api/prefs/:id', auth, (req, res) => {
  const w = Math.max(1, Math.min(10, Number(req.body?.weight) || 1));
  db.prepare(`UPDATE prefs SET weight = ? WHERE id = ? AND user_id = ? AND action = 'boost'`).run(w, req.params.id, req.user.id);
  res.json({ ok: true });
});
app.delete('/api/prefs/:id', auth, (req, res) => {
  db.prepare('DELETE FROM prefs WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});
app.delete('/api/hidden', auth, (req, res) => {
  db.prepare('DELETE FROM hidden WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

// ---------- likes, comments, follows ----------
// Like and dislike are both public counts and cancel each other out.
function react(table, other) {
  return (req, res) => {
    const pid = Number(req.params.id), uid = req.user.id;
    const had = has(table, pid, uid);
    db.prepare(`DELETE FROM ${other} WHERE post_id = ? AND user_id = ?`).run(pid, uid);
    if (had) db.prepare(`DELETE FROM ${table} WHERE post_id = ? AND user_id = ?`).run(pid, uid);
    else db.prepare(`INSERT INTO ${table} (post_id, user_id) VALUES (?, ?)`).run(pid, uid);
    res.json({ likes: count('likes', pid), liked: has('likes', pid, uid), dislikes: count('dislikes', pid), disliked: has('dislikes', pid, uid) });
  };
}
app.post('/api/posts/:id/like', auth, react('likes', 'dislikes'));
app.post('/api/posts/:id/dislike', auth, react('dislikes', 'likes'));
app.post('/api/posts/:id/repost', auth, (req, res) => {
  const pid = Number(req.params.id), had = has('reposts', pid, req.user.id);
  if (had) db.prepare('DELETE FROM reposts WHERE post_id = ? AND user_id = ?').run(pid, req.user.id);
  else db.prepare('INSERT INTO reposts (post_id, user_id) VALUES (?, ?)').run(pid, req.user.id);
  res.json({ reposted: !had, reposts: count('reposts', pid) });
});
app.post('/api/posts/:id/report', auth, (req, res) => {
  const reason = String(req.body?.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Pick a reason' });
  db.prepare('INSERT INTO reports (post_id, user_id, reason) VALUES (?, ?, ?)').run(req.params.id, req.user.id, reason.slice(0, 500));
  res.json({ ok: true });
});
// Who interacted: likes and reposts are public, dislikes and saves are shown as counts only.
app.get('/api/posts/:id/interactions', auth, (req, res) => {
  const pid = Number(req.params.id);
  const people = (table) => db.prepare(`SELECT u.* FROM ${table} t JOIN users u ON u.id = t.user_id WHERE t.post_id = ?`).all(pid).map(publicUser);
  res.json({
    likers: people('likes'), reposters: people('reposts'), likes: count('likes', pid), dislikes: count('dislikes', pid),
    reposts: count('reposts', pid), comments: count('comments', pid), saves: count('saves', pid),
  });
});

// ---------- folders (saved posts) ----------
// Folders nest without limit. Each one has its own order, color (any hex), icon (any emoji, drawn as a
// vector, as the device's own emoji, or an uploaded picture), tile shape and layout for what's inside.
const FOLDER_STYLE = { layout: ['grid', 'list', 'large'], shape: ['rounded', 'square', 'circle'], icon_style: ['vector', 'native', 'image'] };
const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c);
const isIcon = (i) => typeof i === 'string' && i.length > 0 && i.length <= 32 && !/[<>&"']/.test(i);
function ensureFolders(userId) {
  if (!db.prepare('SELECT 1 FROM folders WHERE user_id = ?').get(userId)) db.prepare("INSERT INTO folders (user_id, name) VALUES (?, 'Watch later')").run(userId);
}
const ownFolder = (id, userId) => db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(id, userId);
const coverOf = (p) => (p ? p.cover || (p.kind === 'photo' ? p.media : null) : null);
// Everything below a folder, so counts and covers include sub-folders.
function subtreeIds(id) {
  const ids = [id];
  for (let i = 0; i < ids.length; i++) for (const c of db.prepare('SELECT id FROM folders WHERE parent_id = ?').all(ids[i])) ids.push(c.id);
  return ids;
}
function folderSummary(f, postId) {
  const tree = subtreeIds(f.id), marks = tree.map(() => '?').join(',');
  const latest = db.prepare(`SELECT p.* FROM saves s JOIN posts p ON p.id = s.post_id WHERE s.folder_id IN (${marks}) ORDER BY s.created_at DESC LIMIT 1`).get(...tree);
  return { ...f, count: db.prepare('SELECT COUNT(*) n FROM saves WHERE folder_id = ?').get(f.id).n,
    folders: db.prepare('SELECT COUNT(*) n FROM folders WHERE parent_id = ?').get(f.id).n,
    total: db.prepare(`SELECT COUNT(*) n FROM saves WHERE folder_id IN (${marks})`).get(...tree).n,
    cover: coverOf(latest), contains: postId ? !!db.prepare('SELECT 1 FROM saves WHERE folder_id = ? AND post_id = ?').get(f.id, postId) : false };
}
function cleanStyle(body) {
  const out = {};
  for (const k of Object.keys(FOLDER_STYLE)) if (FOLDER_STYLE[k].includes(body?.[k])) out[k] = body[k];
  if (isHex(body?.color)) out.color = body.color.toLowerCase();
  if (isIcon(body?.icon)) out.icon = body.icon;
  return out;
}
// Flat list of every folder (the app builds the tree). ?post= marks the folders that already hold that post.
app.get('/api/folders', auth, (req, res) => {
  ensureFolders(req.user.id);
  const postId = Number(req.query.post) || 0;
  res.json(db.prepare('SELECT * FROM folders WHERE user_id = ? ORDER BY position, id').all(req.user.id).map((f) => folderSummary(f, postId)));
});
app.post('/api/folders', auth, (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 60);
  if (!name) return res.status(400).json({ error: 'Name the folder' });
  const parent = req.body?.parent_id ? ownFolder(req.body.parent_id, req.user.id) : null;
  if (req.body?.parent_id && !parent) return res.status(404).json({ error: 'Folder not found' });
  const style = { color: '#7cfcfd', icon: '📁', icon_style: 'vector', layout: 'grid', shape: 'rounded', ...cleanStyle(req.body) };
  const pos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 n FROM folders WHERE user_id = ? AND parent_id IS ?').get(req.user.id, parent?.id ?? null).n;
  const info = db.prepare('INSERT INTO folders (user_id, name, parent_id, position, color, icon, icon_style, layout, shape) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.user.id, name, parent?.id ?? null, pos, style.color, style.icon, style.icon_style, style.layout, style.shape);
  res.json(ownFolder(info.lastInsertRowid, req.user.id));
});
// Rename, restyle or move a folder.
app.patch('/api/folders/:id', auth, (req, res) => {
  const f = ownFolder(req.params.id, req.user.id);
  if (!f) return res.status(404).json({ error: 'Not found' });
  const next = { ...f, ...cleanStyle(req.body) };
  if (req.body?.name !== undefined) next.name = String(req.body.name).trim().slice(0, 60) || f.name;
  if (req.body?.parent_id !== undefined) {
    const pid = req.body.parent_id ? Number(req.body.parent_id) : null;
    if (pid && (!ownFolder(pid, req.user.id) || subtreeIds(f.id).includes(pid))) return res.status(400).json({ error: "A folder can't go inside itself" });
    next.parent_id = pid;
  }
  db.prepare('UPDATE folders SET name = ?, parent_id = ?, color = ?, icon = ?, icon_style = ?, layout = ?, shape = ? WHERE id = ?')
    .run(next.name, next.parent_id, next.color, next.icon, next.icon_style, next.layout, next.shape, f.id);
  res.json(ownFolder(f.id, req.user.id));
});
// A folder's icon can be any picture; it's private to the owner.
app.post('/api/folders/:id/image', auth, upload.single('image'), (req, res) => {
  const f = ownFolder(req.params.id, req.user.id);
  const drop = () => req.file && fs.unlink(req.file.path, () => {});
  if (!f) { drop(); return res.status(404).json({ error: 'Not found' }); }
  if (!req.file || !req.file.mimetype.startsWith('image/')) { drop(); return res.status(400).json({ error: 'Pick an image' }); }
  if (req.file.size > 10 * 1024 * 1024) { drop(); return res.status(400).json({ error: 'Images up to 10 MB' }); }
  if (f.icon_image) fs.unlink(path.join(UPLOAD_DIR, path.basename(f.icon_image)), () => {});
  db.prepare("UPDATE folders SET icon_image = ?, icon_style = 'image' WHERE id = ?").run(req.file.filename, f.id);
  res.json(ownFolder(f.id, req.user.id));
});
app.delete('/api/folders/:id', auth, (req, res) => {
  if (!ownFolder(req.params.id, req.user.id)) return res.status(404).json({ error: 'Not found' });
  for (const id of subtreeIds(Number(req.params.id)).reverse()) db.prepare('DELETE FROM folders WHERE id = ?').run(id);
  res.json({ ok: true });
});
// Set the order of sibling folders: { ids: [folder ids in order] }.
app.post('/api/folders/reorder', auth, (req, res) => {
  (req.body?.ids || []).forEach((id, i) => db.prepare('UPDATE folders SET position = ? WHERE id = ? AND user_id = ?').run(i, id, req.user.id));
  res.json({ ok: true });
});
app.get('/api/folders/:id', auth, (req, res) => {
  const f = ownFolder(req.params.id, req.user.id);
  if (!f) return res.status(404).json({ error: 'Not found' });
  const path = [];
  for (let p = f.parent_id; p; ) { const up = ownFolder(p, req.user.id); if (!up) break; path.unshift({ id: up.id, name: up.name }); p = up.parent_id; }
  res.json({ ...folderSummary(f), path,
    children: db.prepare('SELECT * FROM folders WHERE parent_id = ? ORDER BY position, id').all(f.id).map((c) => folderSummary(c)),
    posts: db.prepare('SELECT p.* FROM saves s JOIN posts p ON p.id = s.post_id WHERE s.folder_id = ? ORDER BY s.position, s.created_at DESC').all(f.id).map((p) => hydrate(p, req.user.id)) });
});
// Set the order of the saved posts in a folder: { post_ids: [...] }.
app.post('/api/folders/:id/reorder', auth, (req, res) => {
  const f = ownFolder(req.params.id, req.user.id);
  if (!f) return res.status(404).json({ error: 'Not found' });
  (req.body?.post_ids || []).forEach((pid, i) => db.prepare('UPDATE saves SET position = ? WHERE folder_id = ? AND post_id = ?').run(i, f.id, pid));
  res.json({ ok: true });
});
app.post('/api/folders/:id/toggle', auth, (req, res) => {
  const f = ownFolder(req.params.id, req.user.id);
  if (!f) return res.status(404).json({ error: 'Not found' });
  const pid = Number(req.body?.post_id);
  const had = db.prepare('SELECT 1 FROM saves WHERE folder_id = ? AND post_id = ?').get(f.id, pid);
  if (had) db.prepare('DELETE FROM saves WHERE folder_id = ? AND post_id = ?').run(f.id, pid);
  else { // new saves go to the top
    const top = db.prepare('SELECT COALESCE(MIN(position), 1) - 1 n FROM saves WHERE folder_id = ?').get(f.id).n;
    db.prepare('INSERT INTO saves (folder_id, post_id, position) VALUES (?, ?, ?)').run(f.id, pid, top);
  }
  res.json({ saved: !had, folder: f.name });
});

app.get('/api/posts/:id/comments', auth, (req, res) => {
  res.json(db.prepare('SELECT c.*, u.username, u.display_name, u.avatar_color FROM comments c JOIN users u ON u.id = c.user_id WHERE post_id = ? ORDER BY c.created_at').all(req.params.id));
});
app.post('/api/posts/:id/comments', auth, (req, res) => {
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Empty comment' });
  db.prepare('INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)').run(req.params.id, req.user.id, body.slice(0, 2000));
  res.json({ ok: true });
});
app.get('/api/users/:username', auth, (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username.toLowerCase());
  if (!u) return res.status(404).json({ error: 'Not found' });
  const posts = db.prepare('SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC').all(u.id).map((p) => hydrate(p, req.user.id));
  res.json({
    user: publicUser(u), posts,
    followers: db.prepare('SELECT COUNT(*) n FROM follows WHERE followee_id = ?').get(u.id).n,
    following: db.prepare('SELECT COUNT(*) n FROM follows WHERE follower_id = ?').get(u.id).n,
    isFollowing: !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?').get(req.user.id, u.id),
    reposts: db.prepare('SELECT p.* FROM reposts r JOIN posts p ON p.id = r.post_id WHERE r.user_id = ? ORDER BY r.created_at DESC').all(u.id).map((p) => hydrate(p, req.user.id)),
  });
});
app.get('/api/subscriptions', auth, (req, res) => {
  res.json(db.prepare('SELECT u.* FROM follows f JOIN users u ON u.id = f.followee_id WHERE f.follower_id = ? ORDER BY u.display_name').all(req.user.id).map(publicUser));
});
app.post('/api/users/:id/follow', auth, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: "You can't subscribe to yourself" });
  const had = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?').get(req.user.id, id);
  if (had) db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').run(req.user.id, id);
  else db.prepare('INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)').run(req.user.id, id);
  res.json({ following: !had, followers: db.prepare('SELECT COUNT(*) n FROM follows WHERE followee_id = ?').get(id).n });
});
app.patch('/api/me', auth, (req, res) => {
  const { display_name, bio } = req.body || {};
  db.prepare('UPDATE users SET display_name = COALESCE(?, display_name), bio = COALESCE(?, bio) WHERE id = ?').run(display_name ?? null, bio ?? null, req.user.id);
  res.json({ ok: true });
});
app.get('/api/search', auth, (req, res) => {
  const q = '%' + String(req.query.q || '').toLowerCase() + '%';
  res.json({
    users: db.prepare('SELECT * FROM users WHERE username LIKE ? OR lower(display_name) LIKE ? LIMIT 10').all(q, q).map(publicUser),
  });
});

// ---------- messaging ----------
// Live delivery over Server-Sent Events, one stream per open tab.
const streams = new Map(); // userId -> Set(res)
app.get('/api/stream', auth, (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write(': connected\n\n');
  if (!streams.has(req.user.id)) streams.set(req.user.id, new Set());
  streams.get(req.user.id).add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); streams.get(req.user.id)?.delete(res); });
});
const push = (userId, event, data) => streams.get(userId)?.forEach((s) => s.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

app.get('/api/conversations', auth, (req, res) => {
  const me = req.user.id;
  const rows = db.prepare(`
    SELECT CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END AS other_id, MAX(id) AS last_id
    FROM messages WHERE sender_id = ? OR recipient_id = ? GROUP BY other_id ORDER BY last_id DESC`).all(me, me, me);
  res.json(rows.map((r) => {
    const last = db.prepare('SELECT * FROM messages WHERE id = ?').get(r.last_id);
    const unread = db.prepare('SELECT COUNT(*) n FROM messages WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL').get(r.other_id, me).n;
    return { user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(r.other_id)), last, unread };
  }));
});
app.get('/api/messages/:userId', auth, (req, res) => {
  const me = req.user.id, other = Number(req.params.userId);
  db.prepare('UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL').run(other, me);
  res.json({
    user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(other)),
    messages: db.prepare(`SELECT * FROM messages WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?) ORDER BY id`).all(me, other, other, me),
  });
});
app.post('/api/messages/:userId', auth, (req, res) => {
  const other = Number(req.params.userId);
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Empty message' });
  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(other)) return res.status(404).json({ error: 'No such user' });
  const info = db.prepare('INSERT INTO messages (sender_id, recipient_id, body) VALUES (?, ?, ?)').run(req.user.id, other, body.slice(0, 4000));
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
  push(other, 'message', { ...msg, from: publicUser(req.user) });
  push(req.user.id, 'message', msg);
  res.json(msg);
});

// ---------- community roadmap: users vote on what gets built or fixed next ----------
app.get('/api/roadmap', auth, (req, res) => {
  res.json(db.prepare(`
    SELECT i.*, u.username, (SELECT COUNT(*) FROM roadmap_votes v WHERE v.item_id = i.id) AS votes,
      EXISTS(SELECT 1 FROM roadmap_votes v WHERE v.item_id = i.id AND v.user_id = ?) AS voted
    FROM roadmap_items i JOIN users u ON u.id = i.user_id ORDER BY votes DESC, i.created_at DESC`).all(req.user.id));
});
app.post('/api/roadmap', auth, (req, res) => {
  const title = String(req.body?.title || '').trim();
  if (title.length < 4) return res.status(400).json({ error: 'Describe the idea or problem' });
  const info = db.prepare('INSERT INTO roadmap_items (user_id, title, body, kind) VALUES (?, ?, ?, ?)')
    .run(req.user.id, title.slice(0, 140), String(req.body?.body || '').slice(0, 2000), req.body?.kind === 'fix' ? 'fix' : 'idea');
  db.prepare('INSERT INTO roadmap_votes (item_id, user_id) VALUES (?, ?)').run(info.lastInsertRowid, req.user.id);
  res.json({ ok: true });
});
app.post('/api/roadmap/:id/vote', auth, (req, res) => {
  const had = db.prepare('SELECT 1 FROM roadmap_votes WHERE item_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (had) db.prepare('DELETE FROM roadmap_votes WHERE item_id = ? AND user_id = ?').run(req.params.id, req.user.id);
  else db.prepare('INSERT INTO roadmap_votes (item_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id);
  res.json({ voted: !had });
});

app.get(/^\/(?!api|media).*/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

function openBrowser(url) {
  const { exec } = require('child_process');
  const cmd = process.platform === 'darwin' ? `open "${url}"` : process.platform === 'win32' ? `start "" "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

if (require.main === module) {
  app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n  Gallium is running at ${url}\n  Sign in as demo / gallium123\n  Keep this window open while you use it. Close it to stop Gallium.\n`);
    if (process.env.OPEN_BROWSER) openBrowser(url);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') { console.log(`Gallium is already running. Opening http://localhost:${PORT}`); if (process.env.OPEN_BROWSER) openBrowser(`http://localhost:${PORT}`); }
    else throw err;
  });
}
module.exports = app;
