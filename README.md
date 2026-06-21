# 🎨 Doodle to Emoji

Hand-draw a simple doodle on a canvas and watch it turn into the matching **real**
emoji. Your scribble is sent to Claude's vision model, which identifies the closest
standard Unicode emoji, and the app then displays the actual high-quality
[Twemoji](https://github.com/twitter/twemoji) graphic next to your drawing.

- ✍️ Draw with mouse, trackpad, or finger (works great on a phone)
- 🪄 One tap to convert
- 🎯 Confidence rating + alternate suggestions when it's unsure
- 📥 Download the emoji, copy the character, or redraw
- 📒 A "sticker book" history of past conversions (saved in your browser)
- 📦 Export your whole history as a **sticker pack** (a `.zip` of PNGs)
- ↗️ **Share** the matched emoji image (Web Share API, on supported devices)
- 🔊 A little sound + sparkle burst on each successful match

The app uses **real emoji assets**, not AI-generated images — so results always look
polished and official.

---

## How it works

```
Browser (canvas PNG)
  └─> /.netlify/functions/analyze-doodle   (Netlify Function — Node)
        └─> Claude Messages API (vision)    ← API key lives ONLY here
              └─> { emoji, name, confidence, alternates }
  <─ JSON ──┘
Browser renders the Twemoji graphic for that emoji.
```

The Anthropic API key stays server-side inside the Netlify Function and is never
included in the browser bundle or any network response.

### Tech stack

- **React + Vite** frontend, **Tailwind CSS** for styling
- **Netlify Functions (Node)** for the backend
- **@anthropic-ai/sdk** with model `claude-sonnet-4-6`
- **Twemoji** CDN for the final emoji graphics

---

## Run it locally

You need [Node.js](https://nodejs.org/) 18+ and an
[Anthropic API key](https://console.anthropic.com/).

```bash
# 1. Install dependencies
npm install

# 2. Add your API key for local dev
cp .env.example .env
#   then edit .env and paste your real key:
#   ANTHROPIC_API_KEY=sk-ant-...

# 3. Install the Netlify CLI (once), then start everything together
npm install -g netlify-cli
netlify dev
```

`netlify dev` serves the Vite frontend **and** the serverless function together
(usually at http://localhost:8888), and reads `ANTHROPIC_API_KEY` from your `.env`.
Open that URL, draw something, and hit **Convert to Emoji**.

> Running plain `npm run dev` starts only the frontend — the `/convert` call will
> fail because the function isn't running. Use `netlify dev` for the full app.

---

## No API key? Three ways it runs

The backend picks a provider automatically, in this order:

1. **Anthropic Claude** — used if `ANTHROPIC_API_KEY` is set (best quality).
2. **Local Gemma (Ollama)** — if no key is set and a local vision model is
   reachable, it does real recognition **for free, offline**.
3. **Demo mode** — if neither is available, it returns a random, clearly-labeled
   emoji so the whole app (drawing, history, sticker pack, share, sound) still works.

### Run with a local model (Ollama)

Install [Ollama](https://ollama.com/) and pull a **vision-capable** Gemma model,
then just run the app with no key:

```bash
ollama pull gemma4:e2b-it-qat     # a small vision model (must support images)
netlify dev                       # no ANTHROPIC_API_KEY needed
```

The result card shows **"⚡ matched locally by Gemma"** when the local model is used.
First request is slow while the model loads; after that it stays warm.

Configure via env vars (all optional):

| Variable        | Default                  | Purpose                                   |
| --------------- | ------------------------ | ----------------------------------------- |
| `OLLAMA_MODEL`  | `gemma4:e2b-it-qat`      | Which Ollama model to use (needs vision)  |
| `OLLAMA_URL`    | `http://localhost:11434` | Where Ollama is listening                 |
| `USE_OLLAMA`    | `true`                   | Set to `false` to skip Ollama → demo mode |

> Note: the model **must** have vision/image support. Text-only models (e.g.
> `gemma2`) can't read the doodle and will fall back to demo mode.

## Deploy to Netlify

1. Push this project to a GitHub repo (see below), then in the
   [Netlify dashboard](https://app.netlify.com/) choose **Add new site → Import an
   existing project** and pick the repo. The build settings come from
   `netlify.toml` automatically (build `npm run build`, publish `dist`).

2. **Add your API key as an environment variable** (do *not* commit it):
   - In Netlify, go to **Site configuration → Environment variables → Add a
     variable**.
   - Key: `ANTHROPIC_API_KEY`
   - Value: your real key (`sk-ant-...`)
   - Scope: leave it available to **Functions** (the default "All" is fine).
   - Save, then trigger a redeploy (**Deploys → Trigger deploy → Deploy site**) so
     the function picks up the new variable.

That's it — the live site will draw doodles and return emoji.

---

## Push to a new GitHub repo (optional)

```bash
git init
git add -A
git commit -m "Initial commit: Doodle to Emoji"

# Create an empty repo on GitHub first, then:
git branch -M main
git remote add origin https://github.com/<your-username>/doodle-to-emoji.git
git push -u origin main
```

Your API key is never committed — `.env` is gitignored, and the key lives only in
the Netlify dashboard.

---

## Project layout

```
doodle-to-emoji/
├─ index.html
├─ netlify.toml                  # Netlify build + functions config
├─ netlify/functions/
│  └─ analyze-doodle.js          # serverless backend (calls Claude)
├─ src/
│  ├─ App.jsx                    # main app + state
│  ├─ components/
│  │  ├─ DrawCanvas.jsx          # the drawing surface + tools
│  │  ├─ ResultView.jsx          # doodle vs emoji result
│  │  ├─ EmojiImage.jsx          # Twemoji renderer with fallbacks
│  │  └─ History.jsx             # sticker-book gallery
│  └─ lib/
│     ├─ api.js                  # frontend → function call
│     ├─ twemoji.js              # emoji → asset codepoint
│     ├─ sound.js                # success chime (Web Audio, no files)
│     └─ stickerPack.js          # zip export of history as PNGs
└─ .env.example                  # template for your local key
```
