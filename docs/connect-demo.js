// Linking other platforms. Used by the app, server.js and the browser-only preview alike.
// Until Gallium has its own developer keys for each platform, sign-in is simulated and each linked
// channel gets a made-up (but stable) set of stats and uploads, built from the handle.
(function (root) {
  const PLATFORMS = {
    youtube: { name: 'YouTube', unit: 'subscriber', kinds: ['video', 'short', 'video'], color: '#ff4d5e' },
    tiktok: { name: 'TikTok', unit: 'follower', kinds: ['short'], color: '#7cfcfd' },
    instagram: { name: 'Instagram', unit: 'follower', kinds: ['photo', 'short'], color: '#fd9efc' },
    x: { name: 'X', unit: 'follower', kinds: ['text'], color: '#ecfbfb' },
    twitch: { name: 'Twitch', unit: 'follower', kinds: ['video'], color: '#b9a2ff' },
    soundcloud: { name: 'SoundCloud', unit: 'follower', kinds: ['track'], color: '#ffb36b' },
  };
  // The demo files have their titles drawn on the cover, so each upload is named after its cover.
  const MEDIA = {
    video: [['video_build.mp4', 'video_build.jpg', 75, 'Building a PC in 2026'], ['video_cook.mp4', 'video_cook.jpg', 62, 'One-pan pasta'], ['video_skate.mp4', 'video_skate.jpg', 55, 'Street skating'], ['video_space.mp4', 'video_space.jpg', 90, 'Why the night sky is dark']],
    short: [['short_beat.mp4', 'short_beat.jpg', 13, 'made this beat on my phone'], ['short_cat.mp4', 'short_cat.jpg', 9, 'my cat discovered the printer'], ['short_dance.mp4', 'short_dance.jpg', 12, 'POV: the beat drops'], ['short_food.mp4', 'short_food.jpg', 11, 'midnight ramen upgrade'], ['short_tip.mp4', 'short_tip.jpg', 14, '3 keyboard shortcuts'], ['short_trick.mp4', 'short_trick.jpg', 10, 'kickflip progress']],
    photo: [['photo_city.jpg', null, 0, 'City at night.'], ['photo_food.jpg', null, 0, 'Made this tonight.'], ['photo_forest.jpg', null, 0, 'Out in the trees.'], ['photo_ocean.jpg', null, 0, 'Water this clear.'], ['photo_sunset.jpg', null, 0, 'Golden hour.']],
    track: [['track_hype.mp3', 'track_hype.jpg', 48, 'Run It Up'], ['track_lofi.mp3', 'track_lofi.jpg', 48, 'Lofi Study'], ['track_nightdrive.mp3', 'track_nightdrive.jpg', 48, 'Night Drive'], ['track_rain.mp3', 'track_rain.jpg', 48, 'Rain on Glass'], ['track_sunrise.mp3', 'track_sunrise.jpg', 48, 'Sunrise Loop']],
    text: [[null, null, 0, '']],
  };
  const TEXTS = ['New stuff dropping this week.', 'Thank you for 100 posts.', 'What should I make next?', 'Working on something big.', 'Taking a short break, back soon.'];
  // A tiny seeded random generator, so the same handle always gets the same channel.
  function rng(seed) {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const cleanHandle = (h) => String(h || '').trim().replace(/^@/, '').replace(/[^a-z0-9._-]/gi, '').slice(0, 40);
  // The linked channel's own numbers, exactly as that platform would report them.
  function channel(platform, handle) {
    const r = rng(platform + ':' + handle.toLowerCase());
    const followers = Math.floor(1000 + r() * r() * 900000);
    const uploads = 14 + Math.floor(r() * 40);
    const views = Math.floor(followers * (20 + r() * 80));
    return { followers, uploads, views, likes: Math.floor(views * (0.03 + r() * 0.05)), comments: Math.floor(views * (0.002 + r() * 0.004)) };
  }
  // Every upload on the linked channel, newest first.
  function uploads(platform, handle) {
    const p = PLATFORMS[platform], r = rng('uploads:' + platform + ':' + handle.toLowerCase()), ch = channel(platform, handle);
    const out = [];
    let day = 2 + Math.floor(r() * 5);
    for (let i = 0; i < ch.uploads; i++) {
      const kind = p.kinds[Math.floor(r() * p.kinds.length)];
      const pick = (list) => list[Math.floor(r() * list.length)];
      const [media, cover, duration, name] = pick(MEDIA[kind]);
      const part = 1 + Math.floor(r() * 9);
      const views = Math.floor((ch.views / ch.uploads) * (0.2 + r() * 1.6));
      out.push({
        source_id: `${platform}-${handle.toLowerCase()}-${i + 1}`, kind,
        title: kind === 'text' || kind === 'photo' ? null : part > 1 ? `${name}, part ${part}` : name,
        body: kind === 'text' ? pick(TEXTS) : kind === 'photo' ? name : null,
        media, cover, duration,
        date: new Date(Date.now() - day * 864e5).toISOString().slice(0, 10),
        views, likes: Math.floor(views * (0.03 + r() * 0.06)), comments: Math.floor(views * (0.001 + r() * 0.005)),
      });
      day += 1 + Math.floor(r() * 12);
    }
    return out;
  }
  const api = { PLATFORMS, cleanHandle, channel, uploads };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GalliumConnect = api;
})(this);
