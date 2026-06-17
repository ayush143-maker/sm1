![Chain](assets/logo.png)

# Chain — a habit tracker PWA

No backend, no build step, no npm install. `index.html`,
`css/styles.css`, `js/app.js`, a manifest, and a service worker. Data
lives in `localStorage` on the device — nothing is sent anywhere.

## What makes this an actual PWA, not just a webpage with a manifest

- **Installable** on Android, desktop Chrome/Edge, and iOS (via Safari's
  Share sheet) — backed by `manifest.json` and three correctly-sized icons.
- **Works fully offline.** `service-worker.js` precaches the app shell.
  I verified this for real — not by inspection, by running it
  headless: loaded the app, added a habit, killed all network access,
  reloaded, and confirmed the UI and the habit were both still there
  with zero successful network requests.
- **Splash screen on launch.** Android already auto-generates one from
  the manifest; iOS Safari doesn't, so there's a small in-app splash
  that only appears when launched from the home-screen icon
  (`display-mode: standalone`) — never when opened as a normal browser
  tab.
- **No external runtime dependencies.** Fonts are system stacks, not a
  Google Fonts fetch that fails the moment you're offline.

## Deploy: GitHub → Vercel → install via browser

1. **Push to GitHub.**
   ```bash
   cd habit-tracker-pwa
   git init
   git add .
   git commit -m "Chain habit tracker"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import into Vercel.** New Project → Import the GitHub repo → no
   framework preset needed (it's static, Vercel serves it as-is) →
   Deploy. You'll get an `https://your-app.vercel.app` URL — HTTPS is
   non-negotiable for installability; Vercel gives it to you for free.

   `vercel.json` is already in the repo and does one specific job: it
   tells Vercel never to HTTP-cache `service-worker.js`. Without that,
   Vercel's default static-asset caching can pin visitors to an old
   service worker after you ship updates, and they'll never see the
   new version. This is the single most common "my PWA update didn't
   show up" bug, so it's handled up front rather than waiting for you
   to hit it.

3. **Install via browser, on your phone:**
   - **Android (Chrome):** open the Vercel URL → tap the install icon
     in the address bar, or menu (⋮) → "Install app."
   - **iOS (Safari):** open the URL → Share icon → "Add to Home Screen."
     Safari doesn't support the in-browser install prompt the way
     Chrome does — this is an Apple platform restriction, not something
     fixable from the web app side.
   - **Desktop (Chrome/Edge):** install icon appears in the address bar.

## What I tested before handing this off

- Offline reload with previously-saved data — confirmed via headless
  browser, not assumed.
- Chain/streak math against a seeded multi-day pattern (mixed hits and
  misses, not just all-done or all-missed) — dot states, link states,
  and the streak number all matched expected output.
- Splash appears only in standalone mode, never in a normal tab —
  confirmed both ways.
- Manifest icon files match their declared pixel dimensions exactly
  (a mismatch here silently fails Chrome's installability check).
- Empty-habit-name submission is blocked by the native `required`
  attribute — no custom JS needed, and none added.
- Zero console or page errors across every flow above.

What I have **not** tested, because I can't from here: real
`beforeinstallprompt` behavior on an actual Android device, and iOS
Safari's "Add to Home Screen" rendering. Headless Chrome doesn't fully
replicate either. Check both after your Vercel deploy is live.

## Known limitations

- **One device, one browser profile** — no sync. This is a
  `localStorage`-only app by design; cross-device sync would mean a
  real backend, which is a different project than "simple habit
  tracker."
- **`localStorage`, not IndexedDB** — fine for normal use; if you ever
  want bulk export of years of history, IndexedDB is the more honest
  choice at that point.
- **iOS install UX is rougher than Android's** — Apple's platform
  decision, not this app's.

## File map

```
habit-tracker-pwa/
├── index.html               app shell, markup, splash screen
├── manifest.json            installability metadata
├── service-worker.js        offline caching
├── vercel.json               cache headers (fixes stale-SW bug on Vercel)
├── css/styles.css           all styling
├── js/app.js                 state, streak math, rendering, install prompt, splash logic
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-512-maskable.png
└── assets/
    ├── logo.svg              README/branding logo (not loaded by the app)
    └── logo.png
```
