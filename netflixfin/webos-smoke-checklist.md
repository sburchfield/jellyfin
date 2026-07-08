# webOS Smoke Checklist

Run this after UI, navigation, bundle, playback, or deploy-script changes. The
goal is not exhaustive QA; it is a quick pass over the places this fork has
regressed before.

## Setup

- Deploy from a clean server clone:
  `~/netflixfin/jellyfin-web/netflixfin/redeploy.sh`
- Fully close and reopen the LG webOS app after deploy.
- Sign in as the normal viewing profile.
- Start from the Home screen at the top of the page.

## Pass Criteria

Use this table as the release gate. Every required row should pass before calling
the deploy good.

| Area | Steps | Expected result | Required |
| --- | --- | --- | --- |
| Home load | Open the app fresh to Home. | Top nav is visible over the first viewport with a transparent/dark fade. It is not sticky after scrolling down. | Yes |
| Top nav focus | Move focus across Home, Collections, Movies, Shows. | Active/focused state is a tight underline. No cyan pill/box and no stray dashed artifacts. | Yes |
| Home rows | Scroll through the first few Home rows. | Poster focus glow is visible, not clipped, and rows do not jump vertically. | Yes |
| Because you watched | Find the recommendation row. | Only one `Because you watched` row appears, with deduped movies. | Yes |
| Movies landing | Open Movies from the top nav. | Page lands with Movies selected and the poster grid visible without header overlap. | Yes |
| Movie subnav | Move focus across Movies, Suggestions, Favorites, Collections, Genres. | Subnav is centered across the screen and uses the same underline treatment. | Yes |
| Movie grid focus | Move across the first two rows of posters. | Focus state is responsive, labels remain readable, and poster glow is not clipped. | Yes |
| Alphabet rail | In Movies, move near the right side of the grid. | Alphabet rail is visible but does not cover poster titles or focused card controls. | Yes |
| Details page | Open a movie details page, then go back. | Details page loads cleanly, back returns to the same grid context, and nav state remains correct. | Yes |
| Playback start | Start direct playback for a known-compatible movie. | Playback starts without UI hang; overlay controls appear when requested. | Yes |
| Playback exit | Back out of playback to details/grid. | App returns without losing focus, nav state, or poster layout. | Yes |
| Search | Open Search from the header, search a known title, then back out. | Search is focusable with remote input and back navigation returns cleanly. | Yes |
| Profile/menu icons | Move focus to profile/search/group icons if visible. | Icon focus is visible and does not produce nav underline artifacts. | No |
| Browser spot check | Open the same server in Chrome or Firefox. | Desktop/browser header remains sticky, and webOS-only layout fixes do not leak into desktop. | No |

## Regression Notes

Record failures here before fixing, especially if a phone photo or exact focus
path would help reproduce it.

| Date | Build commit | Failure | Notes |
| --- | --- | --- | --- |
| | | | |
