# Custom Jellyfin Web (netflixfin)

A customized build of [jellyfin-web](https://github.com/jellyfin/jellyfin-web)
**v10.11.8** that brings Netflix/Hulu-style UX to a self-hosted Jellyfin server —
without leaning on any Netflix branding or trademarks. Just a cleaner, more
premium dark interface and a handful of quality-of-life features.

## Features

**Look & feel**
- **Muted-teal dark theme** ("Netflix" in Settings → Display → Theme; the default
  for new users). Near-black `#141414` background with a calm teal `#3fa7c4`
  accent. Refined typography and spacing.
- **Centered top nav** — `Home · <your libraries>` across the header. The
  redundant secondary "Home / Favorites" tab strip is hidden on the home page so
  there's a single nav.
- **Full-bleed billboard hero** on the home page: a rotating backdrop from your
  most recently added titles, with logo, `year · rating · runtime/seasons · genre`,
  a synopsis, and **Play / More Info** buttons. The nav floats transparently over
  it and gains a background as you scroll.
- The default **"My Media"** library-tiles row is removed (the nav covers it).
- Subtle card focus/hover scale.

**Features**
- **Shuffle Block** — treat a Collection like a TV network block. Plays **4
  in-order episodes per show**, switching shows in random order (never the same
  show twice in a row). A **▶ Shuffle Block** button appears on a collection's
  detail page, and in the right-click/⋯ menu.
- **Clear watch history** — a ⋯-menu action on any title that marks it unplayed
  (cascades across a whole series), removing it from Continue Watching / Next Up.
- **Are you still watching?** — a prompt backported from Jellyfin's dev branch
  that interrupts auto-advance after several consecutive episodes (or long idle).
- **Subtitle quick styles** — one-tap presets (Clean / Boxed / Large / Yellow) in
  the subtitle appearance settings, on top of Jellyfin's normal fine controls.

## Building

Requires **Node 20** and **npm ≥ 9.6.4 < 11** (matches jellyfin-web v10.11.8).

```bash
npm install
npm run build:production   # outputs to dist/
```

Then serve `dist/` as your Jellyfin web client (see Deployment).

## Deployment

This build is served from a **custom web directory** so Jellyfin package updates
can't overwrite it:

1. Build produces `dist/`.
2. `dist/` is rsynced to `/opt/jellyfin-custom-web` (owned by the deploy user).
3. Jellyfin is pointed there via `--webdir=/opt/jellyfin-custom-web` in
   `/etc/default/jellyfin`.

Because that directory is outside `/usr/share/jellyfin/web` (which the
`jellyfin-web` apt package owns), upgrades leave the custom UI untouched.

### Scripts (`netflixfin/`)

- **`setup-webdir.sh`** — one-time (run with `sudo`): creates the custom web dir,
  repoints `--webdir`, prunes old backups, restarts Jellyfin.
- **`redeploy.sh`** — rebuild + deploy + publish. No sudo, no Jellyfin restart
  (static files are served live). It commits, builds, rsyncs to the web dir, and
  pushes to GitHub. After it runs, just hard-refresh the browser / relaunch the
  TV app.

```bash
~/netflixfin/redeploy.sh   # the everyday command
```

## Notes

- Pin the build to roughly your **server version** (this is v10.11.8). A web
  client far ahead/behind the server can break due to API differences.
- The theme is registered in `src/themes/themes.ts` + `src/config.json` and lives
  in `src/themes/netflix/`. Most custom UI lives in `src/components/homesections/`
  (billboard), `src/components/shuffleBlock.js`, `src/plugins/stillWatching/`,
  `src/scripts/libraryMenu.js` (top nav), and `src/components/itemContextMenu.js`.
- Based on jellyfin-web, which is licensed under **MPL-2.0**.
