"""Generates the demo photos, videos, music and app icons in seed-media/ and public/icons/.
Only needed if you want to regenerate them; the output is checked in. Needs Pillow, numpy and ffmpeg."""
import json, os, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'seed-media')
ICONS = os.path.join(ROOT, 'public', 'icons')
os.makedirs(OUT, exist_ok=True)
os.makedirs(ICONS, exist_ok=True)
BOLD = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'
REG = '/usr/share/fonts/opentype/inter/Inter-Regular.otf'


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def gradient(w, h, c1, c2, c3=None):
    x = np.linspace(0, 1, w)[None, :, None]
    y = np.linspace(0, 1, h)[:, None, None]
    t = (x * 0.6 + y * 0.4)
    a, b = np.array(c1)[None, None, :], np.array(c2)[None, None, :]
    img = a * (1 - t) + b * t
    if c3 is not None:
        r = np.sqrt((x - 0.75) ** 2 + (y - 0.25) ** 2)
        glow = np.clip(1 - r * 1.8, 0, 1) ** 2
        img = img * (1 - glow) + np.array(c3)[None, None, :] * glow
    return Image.fromarray(img.clip(0, 255).astype('uint8'))


def ff(*args):
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', *args], check=True)


# ---------- photos ----------
PHOTOS = [
    ('photo_sunset.jpg', (255, 120, 60), (90, 30, 120), (255, 220, 120), 'sunset'),
    ('photo_ocean.jpg', (10, 60, 120), (20, 180, 200), (200, 255, 255), 'ocean'),
    ('photo_forest.jpg', (20, 60, 30), (120, 180, 80), (240, 255, 200), 'forest'),
    ('photo_city.jpg', (20, 20, 40), (200, 60, 140), (255, 200, 80), 'city'),
    ('photo_food.jpg', (120, 40, 10), (240, 170, 60), (255, 240, 200), 'food'),
]
for name, c1, c2, c3, scene in PHOTOS:
    img = gradient(1080, 1080, c1, c2, c3)
    d = ImageDraw.Draw(img, 'RGBA')
    rng = np.random.default_rng(len(name))
    if scene in ('sunset', 'ocean'):
        d.ellipse((620, 220, 900, 500), fill=(255, 240, 200, 200))
        for i in range(8):
            yy = 700 + i * 45
            d.rectangle((0, yy, 1080, yy + 18), fill=(255, 255, 255, 25 + i * 6))
    if scene == 'forest':
        for _ in range(40):
            x = rng.integers(-50, 1080); hgt = rng.integers(300, 700)
            d.polygon([(x, 1080 - hgt), (x - 80, 1080), (x + 80, 1080)], fill=(10, 40 + rng.integers(0, 50), 20, 210))
    if scene == 'city':
        x = 0
        while x < 1080:
            w = rng.integers(60, 140); hgt = rng.integers(250, 750)
            d.rectangle((x, 1080 - hgt, x + w, 1080), fill=(15, 15, 30, 235))
            for wy in range(1080 - hgt + 20, 1060, 34):
                for wx in range(x + 10, x + w - 10, 24):
                    if rng.random() > 0.45:
                        d.rectangle((wx, wy, wx + 10, wy + 16), fill=(255, 210, 120, 200))
            x += w + 6
    if scene == 'food':
        d.ellipse((190, 190, 890, 890), fill=(250, 250, 245, 255))
        d.ellipse((260, 260, 820, 820), fill=(230, 120, 40, 255))
        for _ in range(16):
            cx, cy = rng.integers(330, 750, 2)
            d.ellipse((cx - 40, cy - 40, cx + 40, cy + 40), fill=(170, 30, 30, 255))
            d.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill=(60, 130, 50, 255))
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    img.save(os.path.join(OUT, name), quality=86)


def cover(name, title, sub, c1, c2, c3, size=(1280, 720), mark=None):
    img = gradient(size[0], size[1], c1, c2, c3)
    d = ImageDraw.Draw(img, 'RGBA')
    w, h = size
    if mark:
        d.text((w * 0.86, h * 0.32), mark, font=font('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(h * 0.4)), fill=(255, 255, 255, 70), anchor='mm')
    big = font(BOLD, int(h * 0.11))
    d.text((int(w * 0.06), int(h * 0.62)), title, font=big, fill=(255, 255, 255, 255))
    d.text((int(w * 0.06), int(h * 0.62 + h * 0.15)), sub, font=font(REG, int(h * 0.05)), fill=(255, 255, 255, 210))
    img.save(os.path.join(OUT, name), quality=85)


# ---------- long videos ----------
VIDEOS = [
    ('video_build.mp4', 'Building a PC in 2026', 'Full walkthrough', (30, 30, 70), (80, 40, 160), (120, 200, 255), '⚙', 'mandelbrot=s=1280x720:maxiter=200', 75),
    ('video_cook.mp4', 'One-pan pasta, 15 min', 'Weeknight dinner', (120, 40, 10), (240, 160, 50), (255, 240, 200), '♨', 'gradients=s=1280x720:c0=0xb4461a:c1=0xf2a93b:c2=0xffe9b0:speed=0.02', 62),
    ('video_space.mp4', 'Why the night sky is dark', 'Explained simply', (5, 5, 25), (40, 20, 90), (180, 120, 255), '✦', 'cellauto=s=1280x720:rule=110:random_fill_ratio=0.3', 90),
    ('video_skate.mp4', 'Street skating: full part', 'Shot on one phone', (20, 70, 60), (30, 160, 120), (220, 255, 120), '✶', 'life=s=640x360:mold=10:r=24:ratio=0.2:death_color=#0b3d2e:life_color=#5df2b0,scale=1280:720:flags=neighbor', 55),
]
for name, title, sub, c1, c2, c3, mark, src, dur in VIDEOS:
    cv = name.replace('.mp4', '.jpg')
    cover(cv, title, sub, c1, c2, c3, mark=mark)
    ff('-f', 'lavfi', '-i', src, '-f', 'lavfi', '-i', 'sine=frequency=220:sample_rate=44100,volume=0.05',
       '-vf', f"fps=24,format=yuv420p,drawtext=fontfile={BOLD}:text='{title}':fontcolor=white:fontsize=46:x=60:y=h-110:box=1:boxcolor=black@0.45:boxborderw=14",
       '-t', str(dur), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '32', '-maxrate', '350k', '-bufsize', '700k', '-pix_fmt', 'yuv420p',
       '-c:a', 'aac', '-b:a', '48k', '-movflags', '+faststart', os.path.join(OUT, name))

# ---------- shorts (vertical) ----------
SHORTS = [
    ('short_dance.mp4', 'mandelbrot=s=540x960:maxiter=120:start_scale=2', 'hue=h=t*40', 'POV: the beat drops', 12),
    ('short_trick.mp4', 'life=s=270x480:mold=20:r=20:ratio=0.15:death_color=#2b0a3d:life_color=#ff5dd2,scale=540:960:flags=neighbor', 'null', 'Day 47 of learning kickflips', 10),
    ('short_cat.mp4', 'gradients=s=540x960:c0=0xff7a59:c1=0x7c3aed:c2=0x14b8a6:speed=0.04', 'null', 'my cat discovered the printer', 9),
    ('short_tip.mp4', 'cellauto=s=540x960:rule=30:random_fill_ratio=0.5', 'hue=h=200:s=2', '3 keyboard shortcuts you need', 14),
    ('short_food.mp4', 'gradients=s=540x960:c0=0xb4461a:c1=0xf2a93b:c2=0xfff3c4:speed=0.03', 'null', 'midnight ramen upgrade', 11),
    ('short_beat.mp4', 'mandelbrot=s=540x960:maxiter=80:start_x=-0.743:start_y=0.131:start_scale=0.05', 'hue=h=t*25+180', 'made this beat on my phone', 13),
]
for name, src, fx, caption, dur in SHORTS:
    cap = caption.replace("'", "")
    ff('-f', 'lavfi', '-i', src, '-f', 'lavfi', '-i', 'sine=frequency=330:beep_factor=4:sample_rate=44100,volume=0.08',
       '-vf', f"fps=24,{fx},format=yuv420p,drawtext=fontfile={BOLD}:text='{cap}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=h*0.18:box=1:boxcolor=black@0.4:boxborderw=12",
       '-t', str(dur), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-maxrate', '300k', '-bufsize', '600k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '48k',
       '-movflags', '+faststart', os.path.join(OUT, name))
    ff('-ss', '1', '-i', os.path.join(OUT, name), '-frames:v', '1', '-q:v', '4', os.path.join(OUT, name.replace('.mp4', '.jpg')))

# ---------- music ----------
SR = 44100
NOTE = lambda n: 440 * 2 ** ((n - 69) / 12)


def synth(bpm, prog, scale, seconds, wave_kind, seed):
    rng = np.random.default_rng(seed)
    beat = 60 / bpm
    n = int(seconds * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    step = beat / 2
    for i in range(int(seconds / step)):
        start = int(i * step * SR)
        chord = prog[(i // 8) % len(prog)]
        note = chord + scale[rng.integers(0, len(scale))] + 12
        ln = int(step * SR * 0.9)
        tt = np.arange(min(ln, n - start)) / SR
        f = NOTE(note)
        osc = np.sin(2 * np.pi * f * tt) if wave_kind == 'sine' else np.sign(np.sin(2 * np.pi * f * tt)) * 0.4 + np.sin(2 * np.pi * f * 2 * tt) * 0.2
        env = np.exp(-tt * 6)
        out[start:start + len(tt)] += 0.18 * osc * env
    for i in range(int(seconds / beat)):
        start = int(i * beat * SR)
        chord = prog[(i // 4) % len(prog)]
        tt = np.arange(min(int(beat * SR), n - start)) / SR
        out[start:start + len(tt)] += 0.22 * np.sin(2 * np.pi * NOTE(chord - 12) * tt) * np.exp(-tt * 2.5)
        kick = np.sin(2 * np.pi * (50 + 120 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 9)
        out[start:start + len(tt)] += 0.5 * kick
        if i % 2 == 1:
            noise = rng.standard_normal(len(tt)) * np.exp(-tt * 25) * 0.15
            out[start:start + len(tt)] += noise
    fade = np.minimum(1, np.minimum(t / 1.5, (seconds - t) / 2))
    out = out * fade
    return (out / max(1e-9, np.abs(out).max()) * 0.85 * 32767).astype(np.int16)


TRACKS = [
    ('track_nightdrive', 'Night Drive', (12, 10, 50), (180, 40, 140), (255, 140, 60), 96, [57, 53, 60, 55], [0, 3, 7, 10], 'square', '◐'),
    ('track_sunrise', 'Sunrise Loop', (255, 140, 60), (255, 220, 120), (255, 255, 230), 84, [60, 67, 69, 65], [0, 4, 7, 11], 'sine', '☀'),
    ('track_rain', 'Rain on Glass', (20, 40, 70), (60, 90, 120), (160, 200, 230), 72, [62, 58, 65, 60], [0, 3, 7, 14], 'sine', '☂'),
    ('track_hype', 'Run It Up', (60, 0, 0), (220, 30, 60), (255, 200, 0), 140, [55, 55, 58, 53], [0, 3, 5, 7], 'square', '⚡'),
    ('track_lofi', 'Study Session', (40, 30, 60), (110, 80, 140), (250, 200, 150), 78, [64, 57, 62, 59], [0, 4, 7, 9], 'sine', '✎'),
]
for i, (name, title, c1, c2, c3, bpm, prog, scale, wk, mark) in enumerate(TRACKS):
    secs = 48
    pcm = synth(bpm, prog, scale, secs, wk, i)
    wav = os.path.join(OUT, name + '.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    ff('-i', wav, '-c:a', 'libmp3lame', '-b:a', '96k', os.path.join(OUT, name + '.mp3'))
    os.remove(wav)
    img = gradient(600, 600, c1, c2, c3)
    d = ImageDraw.Draw(img, 'RGBA')
    d.text((300, 270), mark, font=font('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 260), fill=(255, 255, 255, 90), anchor='mm')
    d.text((40, 500), title, font=font(BOLD, 50), fill=(255, 255, 255, 255))
    img.save(os.path.join(OUT, name + '.jpg'), quality=86)

# ---------- app icons ----------
for size in (192, 512):
    img = gradient(size, size, (40, 25, 5), (20, 15, 10), (245, 184, 61))
    d = ImageDraw.Draw(img)
    d.text((size / 2, size / 2), '♛', font=font('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(size * 0.62)), fill=(245, 184, 61), anchor='mm')
    img.save(os.path.join(ICONS, f'icon-{size}.png'))

print(json.dumps(sorted(os.listdir(OUT))))
