# RADIO·SIM — Emergency, Aviation & Space Radio Simulator

Realistic police, fire, EMS, air-traffic-control, aircraft-carrier and space-station radios.
Live public scanner feeds (Broadcastify, LiveATC), NASA air-to-ground recordings, and
neural "over-the-air" simulated voices with RF signal-loss modelling.

## Local development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/index.html (single self-contained file)
npm run preview   # serve the production build locally
```

Requires Node **20.19+** or **22.12+** (see `.nvmrc`).

## Deploy to Netlify

The repo includes `netlify.toml`, so no dashboard configuration is needed.

| Setting           | Value           |
| ----------------- | --------------- |
| Build command     | `npm run build` |
| Publish directory | `dist`          |
| Node version      | 22              |

### Option A: Git (recommended, auto-deploys on every push)
1. Push this folder to a GitHub / GitLab / Bitbucket repository.
2. In Netlify: **Add new site → Import an existing project**, then pick the repo.
3. Netlify reads `netlify.toml` automatically. Click **Deploy**.

### Option B: Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify init            # or: netlify link (existing site)
netlify deploy --build          # draft/preview URL
netlify deploy --build --prod   # production
```

### Option C: Drag & drop (no Git)
```bash
npm install && npm run build
```
Then drag the generated **`dist/`** folder onto <https://app.netlify.com/drop>.

## Notes for hosting

- **HTTPS required.** Netlify serves HTTPS by default. Web Audio, speech, Cache Storage and the
  neural voice worker all need a secure context.
- **No server code.** Everything runs in the browser. Audio streams, NASA archives, the ISS
  position API and the voice model are fetched directly from their public CDNs (all CORS-enabled).
- **Don't enable cross-origin isolation** (COOP/COEP headers). It would block the third-party
  audio streams and model downloads.
- **Neural voices** download about 97 MB once per browser (cached in Cache Storage) the first
  time a radio is powered on. Users on data-saver mode get browser speech until they enable it
  from the header.
- **Live feeds** belong to their volunteer providers and may go offline or be geo-restricted.
  When that happens, the radio automatically falls back to simulated traffic.
