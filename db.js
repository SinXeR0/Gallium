const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

function openDb(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, display_name TEXT, bio TEXT DEFAULT '',
      password_hash TEXT NOT NULL, avatar_color TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL, title TEXT, body TEXT, media TEXT, cover TEXT, tags TEXT DEFAULT '', duration REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS posts_created ON posts(created_at);
    CREATE TABLE IF NOT EXISTS likes (post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY (post_id, user_id));
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY, post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS follows (follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE, followee_id INTEGER REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY (follower_id, followee_id));
    CREATE TABLE IF NOT EXISTS prefs (
      id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL, target TEXT NOT NULL, action TEXT NOT NULL, weight REAL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE (user_id, target_type, target, action));
    CREATE TABLE IF NOT EXISTS hidden (user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, PRIMARY KEY (user_id, post_id));
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY, sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE, recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, read_at TEXT);
    CREATE TABLE IF NOT EXISTS roadmap_items (
      id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, body TEXT,
      kind TEXT DEFAULT 'idea', status TEXT DEFAULT 'open', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS roadmap_votes (item_id INTEGER REFERENCES roadmap_items(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY (item_id, user_id));
  `);
  return db;
}

module.exports = { openDb };
