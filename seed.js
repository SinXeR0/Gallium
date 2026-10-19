// Resets the database and fills it with demo creators, posts, videos, music, messages and roadmap items.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { openDb } = require('./db');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const SEED = path.join(__dirname, 'seed-media');
fs.rmSync(path.join(DATA_DIR, 'gallium.db'), { force: true });
fs.rmSync(path.join(DATA_DIR, 'gallium.db-wal'), { force: true });
fs.rmSync(path.join(DATA_DIR, 'gallium.db-shm'), { force: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
for (const f of fs.readdirSync(SEED)) fs.copyFileSync(path.join(SEED, f), path.join(UPLOAD_DIR, f));

const db = openDb(path.join(DATA_DIR, 'gallium.db'));
const hash = (pw) => { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex'); };

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
for (const [u, n, bio, c] of users) {
  ids[u] = db.prepare('INSERT INTO users (username, display_name, bio, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)').run(u, n, bio, hash('gallium123'), c).lastInsertRowid;
}

let minutesAgo = 0;
const post = (user, kind, o = {}) => {
  minutesAgo += 17 + Math.floor(Math.random() * 40);
  const ts = new Date(Date.now() - minutesAgo * 60000).toISOString().replace('T', ' ').slice(0, 19);
  return db.prepare('INSERT INTO posts (user_id, kind, title, body, media, cover, tags, duration, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(ids[user], kind, o.title || null, o.body || null, o.media || null, o.cover || null, (o.tags || []).join(','), o.duration || null, ts).lastInsertRowid;
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

for (const pid of P) {
  for (const u of Object.keys(ids)) if (u !== 'demo' && Math.random() < 0.45) db.prepare('INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)').run(pid, ids[u]);
}
const comment = (pid, u, body) => db.prepare('INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)').run(pid, ids[u], body);
comment(P[0], 'jaylen', 'Where is this?!');
comment(P[0], 'astro_lee', 'Those colors are unreal.');
comment(P[3], 'jaylen', 'No sponsor segment is a breath of fresh air');
comment(P[6], 'maya', 'Made this tonight, so good.');

for (const [a, b] of [['demo', 'maya'], ['demo', 'nova'], ['maya', 'jaylen'], ['jaylen', 'maya'], ['nova', 'maya'], ['techtom', 'astro_lee']]) {
  db.prepare('INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)').run(ids[a], ids[b]);
}

const dm = (from, to, body) => db.prepare('INSERT INTO messages (sender_id, recipient_id, body, read_at) VALUES (?, ?, ?, ?)').run(ids[from], ids[to], body, from === 'demo' ? new Date().toISOString() : null);
dm('maya', 'demo', 'Hey! Welcome to Gallium 👋');
dm('demo', 'maya', 'Thanks! Loving the sunset pic.');
dm('maya', 'demo', 'Try tapping "More of this" on stuff you like, the feed changes right away.');
dm('nova', 'demo', 'New track dropping Friday, want an early listen?');

const rm = (u, kind, title, body, voters) => {
  const id = db.prepare('INSERT INTO roadmap_items (user_id, title, body, kind) VALUES (?, ?, ?, ?)').run(ids[u], title, body, kind).lastInsertRowid;
  for (const v of voters) db.prepare('INSERT INTO roadmap_votes (item_id, user_id) VALUES (?, ?)').run(id, ids[v]);
};
rm('jaylen', 'idea', 'Live streaming', 'Go live from your phone with chat.', ['jaylen', 'maya', 'nova', 'techtom', 'astro_lee']);
rm('maya', 'idea', 'Group chats', 'Messaging with more than one person.', ['maya', 'jaylen', 'chefkai', 'nova']);
rm('nova', 'idea', 'Playlists and albums', 'Group tracks together and let listeners save them.', ['nova', 'maya', 'techtom']);
rm('techtom', 'fix', 'Video quality picker', 'Let me choose 480p on mobile data.', ['techtom', 'astro_lee']);
rm('chefkai', 'idea', 'Creator tips and memberships', 'A way for fans to support creators directly, no ads needed.', ['chefkai', 'nova']);

db.close();
console.log(`Seeded ${users.length} users and ${P.length} posts. Sign in as demo / gallium123`);
