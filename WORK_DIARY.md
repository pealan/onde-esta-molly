# Work Diary — "Onde está o Molly?" extraction

Project: preserve & make offline-playable the HumorTadela "Onde está o Molly?"
hidden-object games (Brazilian "Where's Wally?" parody).

Workspace: `/home/pealan/molly-games/` (the session CWD `/fun` is read-only).

---

## 2026-05-18/19 — Iterations 1 & 2 (DONE)

**Investigation**
- Original site (`humortadela2.uol.com.br/h/jogo/inc/moll/`, 2000–2007):
  PHP image-map games with a per-character gag popup. Scene art **and** the
  174 gag popups survive in Wayback only as status-400 error pages — lost.
- Revived site (`humortadela.bol.uol.com.br` 2013–16 / `www.humortadela.com.br`
  2012): clean HTML + jQuery image-map games. **Fully archived.** This is the
  source we extracted from.
- 13 games exist (numbered 1–8, 10–14; game 9 was never republished).

**Delivered**
- `bundle/` — 13 offline-playable games + `index.html` + `LEIA-ME.txt`.
  Wayback wrapper, `<base href>`, UOL ad-bar and Facebook SDK stripped;
  `FB` stubbed; every asset (scenes, 193 icons, jQuery/jQuery-UI, theme
  images) pulled from intact status-200 captures. 0 unresolved refs.
- `onde-esta-o-molly.zip` — the bundle, 254 files, ~6.9 MB.

**Reference data kept** (for the next steps): `cdx_moll.txt`, `im_allcaps.txt`,
`sweep_*.txt`, `rv_*.txt` (Wayback CDX dumps); `maps/view_*.html` (the 13
*original* image-map pages — they carry old hotspot coords + `tipo=` names);
`revived/game_*.html` (untouched revived sources); `game_info.json`.

---

## 2026-05-19 — Iteration 3: popup events (DONE)

Goal was: clicking a character pops up an event, like the original game.
- Confirmed the authentic 2000s gags are unrecoverable (all 400s) and the
  2009 `c/achou*.html` popups were never archived either (only `c/_aux/`).
- Built `bundle/js/molly-extras.js` (shared, injected into all 13 pages):
  it wraps each page's inline `mollyAchou()` and, on a *new* find, shows a
  toast with the character's icon + name + a punchy phrase, and pulses a
  ring at the spot on the scene. Molly himself gets a longer golden toast.
  Original counter / "já achou" / "you won" logic untouched.
- Verified: `node --check` passes; `areaCenter()` geometry validated over
  all 187 hotspots; 350 refs resolve; re-zipped.
- Note: content is a *recreation* (icon+name), not the lost original gag.
  If real gag text is ever authored, drop it in a `dados/jogo-N.json`
  keyed by `ordem`/`alt` and have `molly-extras.js` prefer it.

## NEXT STEPS

### 1. Help overlay showing the answer locations
Goal: a "Ajuda" toggle that reveals where every character is hidden.
- The answers are already in each page: `<map>` → `<area class="mollyArea"
  coords="..." alt="...">` (shapes: rect / poly / circle).
- Build a toggle button that overlays markers/outlines on the scene `<img>`
  at those coords. Images render at natural size, so coords map 1:1 — an
  absolutely-positioned SVG or `<canvas>` sized to the image works.
- Make it a shared `js/molly-extras.js` injected into all 13 pages so the
  popup wiring (step 1) and the help overlay ship together.

### Open item
- Per-game proper titles: the revived site renumbered the editions, so
  "Jogo N" ≠ old edition N. Real titles can be recovered by matching each
  revived game's character set against `maps/view_*.html` (`tipo=` names)
  and the 2005 index names. Currently games are labelled "Jogo N" and the
  `apresentacao` banner image carries the real name.
