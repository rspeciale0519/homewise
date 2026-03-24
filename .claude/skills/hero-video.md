---
name: hero-video
description: Create or update the Homewise homepage hero section with a looping aerial video background made from multiple stock clips with crossfade transitions
---

# Hero Video Skill — Homewise

Use this skill whenever the user wants to update or create a video hero background on the homepage.

## Overview

The hero section at `src/components/home/hero-section.tsx` uses a looping `<video>` tag as its background. The source video is `public/videos/hero.mp4`, produced by combining multiple aerial/drone clips with 2-second crossfade dissolves using FFmpeg.

---

## Step 1 — Check for Existing Clips First

Before searching online, check whether source clips are already in `public/videos/`:

```bash
powershell.exe -Command "Get-ChildItem 'C:\Users\rob\documents\software\real-estate\homewise\public\videos\' | Where-Object { \$_.Name -ne 'hero.mp4' } | Select-Object Name, Length"
```

- **If 3+ clips are present**: skip to Step 2 (verify) and ask the user if they want to use them or find new ones.
- **If 1–2 clips are present**: ask the user if they want to keep them and find additional clips, or start fresh.
- **If the folder is empty or only has `hero.mp4`**: proceed to find new footage online.

---

## Step 2 — Find Aerial Footage Online

Search for free aerial neighborhood/Florida drone clips. Best sources:

- **Pexels** (free, no attribution): `pexels.com/search/videos/florida drone/`
- **Pixabay** (free, no attribution): `pixabay.com/videos/search/aerial neighborhood/`
- **Videezy** (free with attribution): `videezy.com/free-video/florida`
- **Coverr** (free, hero-optimized): `coverr.co`

Good search terms for this project:
- `florida aerial drone`
- `orlando neighborhood aerial`
- `residential neighborhood drone`
- `aerial housing development`
- `suburban aerial flyover`

Use `WebSearch` with `site:pexels.com/video` to find individual video page URLs, not just category pages.

**Note:** All stock sites block automated downloads. Present the user with 3–5 specific video page URLs and ask them to manually download and drop the files into `public/videos/` before proceeding.

---

## Step 3 — Verify Files

```bash
powershell.exe -Command "Get-ChildItem 'C:\Users\rob\documents\software\real-estate\homewise\public\videos\' | Where-Object { \$_.Name -ne 'hero.mp4' } | Select-Object Name, Length"
```

Check resolutions and durations:

```bash
powershell.exe -Command "
\$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
\$dir = 'C:\Users\rob\documents\software\real-estate\homewise\public\videos'
Get-ChildItem \"\$dir\*.mp4\" | Where-Object { \$_.Name -ne 'hero.mp4' } | ForEach-Object {
  \$info = ffprobe -v quiet -print_format json -show_streams -show_format \$_.FullName 2>&1 | ConvertFrom-Json
  \$dur = [math]::Round([double]\$info.format.duration, 2)
  \$stream = \$info.streams | Where-Object { \$_.codec_type -eq 'video' } | Select-Object -First 1
  Write-Output \"\$(\$_.Name): \${dur}s, \$(\$stream.width)x\$(\$stream.height)\"
}
"
```

---

## Step 4 — Combine with FFmpeg

### Prerequisites

If FFmpeg is not installed:
```bash
winget install Gyan.FFmpeg --silent --accept-package-agreements --accept-source-agreements
```

### Parameters

- **Clip trim**: 15 seconds per clip (adjust if a clip is shorter — trim to `clip_duration - 1`)
- **Crossfade duration**: 2 seconds
- **Output**: 1920×1080, 30fps, H.264, yuv420p, no audio

### Offset formula (for N clips, trim=T, fade=D):
- offset[1] = T − D
- offset[2] = 2×(T−D) + D = 2T − D
- offset[n] = n×(T−D) + (n−1)×D ... simplified: offset[n] = n×T − n×D

For 3 clips at T=15, D=2: offset1=13, offset2=26

### FFmpeg command (3 clips)

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
$dir = 'C:\Users\rob\documents\software\real-estate\homewise\public\videos'
$files = Get-ChildItem "$dir\*.mp4" | Where-Object { $_.Name -ne 'hero.mp4' } | Sort-Object Name
$c1 = $files[0].FullName
$c2 = $files[1].FullName
$c3 = $files[2].FullName
$out = "$dir\hero.mp4"

$filter = '[0:v]trim=0:15,setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30[v0];[1:v]trim=0:15,setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30[v1];[2:v]trim=0:15,setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30[v2];[v0][v1]xfade=transition=fade:duration=2:offset=13[v01];[v01][v2]xfade=transition=fade:duration=2:offset=26,format=yuv420p[out]'

ffmpeg -y -i $c1 -i $c2 -i $c3 -filter_complex $filter -map '[out]' -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -profile:v high -level 4.0 -an -movflags +faststart $out
```

### Adapting for different clip counts or trim lengths

**2 clips (T=15, D=2):**
```
[0:v]...[v0];[1:v]...[v1];[v0][v1]xfade=transition=fade:duration=2:offset=13,format=yuv420p[out]
```

**4 clips (T=15, D=2):** offsets = 13, 26, 39
```
...[v0][v1]xfade=...:offset=13[v01];[v01][v2]xfade=...:offset=26[v012];[v012][v3]xfade=...:offset=39,format=yuv420p[out]
```

**Shorter clip (e.g. clip is only 12s):** use `trim=0:11` and recalculate offsets with T=11.

---

## Step 5 — Update hero-section.tsx

The component is at `src/components/home/hero-section.tsx`. The video block should look like this:

```tsx
{/* Background video */}
<div className="absolute inset-0">
  <video
    autoPlay
    muted
    loop
    playsInline
    className="absolute inset-0 w-full h-full object-cover object-center"
    poster="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80"
  >
    <source src="/videos/hero.mp4" type="video/mp4" />
  </video>
  {/* Layered gradient: vignette + bottom darkening */}
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(46,39,109,0.35)_0%,rgba(20,18,47,0.78)_100%)]" />
  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-transparent to-navy-950/20" />
</div>
```

Key attributes:
- `autoPlay muted loop playsInline` — required for silent autoplay across all browsers
- `poster` — fallback image shown while video loads (keep the Unsplash URL or use a local screenshot)
- `object-cover object-center` — fills the section, crops to fit

---

## Important Notes

- **Do not** commit raw source clips (they're large). Only commit `hero.mp4`.
- Add source clips to `.gitignore` if needed: `public/videos/*.mp4` except `hero.mp4`.
- The `public/videos/` folder is served statically — `hero.mp4` is available at `/videos/hero.mp4`.
- `movflags +faststart` ensures the video begins playing before fully downloaded (critical for hero UX).
- Always encode with `-pix_fmt yuv420p` for broad browser compatibility — without it FFmpeg may output yuv444p which Safari rejects.
- The poster image prevents a black flash on first load.
