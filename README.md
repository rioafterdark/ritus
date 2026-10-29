# Ritus

*The rites make the man.* A gamified daily-habit tracker in the SANCTVM style — an illustrated black-tie noir character sheet — suits, coats, hats and canes as loot — with levels and wax seals. Vanilla HTML/CSS/JS, no build step, no dependencies. Installable PWA, works offline.

## Deploy to GitHub Pages

1. Create a repo (e.g. `ritus`) and push these files to the root of `main`:
   ```
   index.html  style.css  art.js  app.js  sw.js  manifest.webmanifest  icons/
   ```
2. Repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / `(root)` → Save.
3. Open `https://<your-user>.github.io/ritus/` on your phone → *Add to Home Screen*.

**Shipping updates:** bump `VERSION` in `sw.js` (currently `ritus-v3` → `ritus-v4`) whenever you change files. The app serves the cached copy instantly and picks up the new one on the next launch.

## Data

Everything lives in the browser on that device (IndexedDB, mirrored to localStorage). Nothing is sent anywhere. Use **Settings → Export JSON** for backups and **Import JSON** to restore or move devices — clearing site data wipes progress.

## The rules

| Rite | Kept when | XP | Attribute |
|---|---|---|---|
| Workout (Exercitium) | marked done — or a rest day (½ XP, max 2/week) | 40 | Fortitudo |
| Protein (Caro) | ≥ 180 g | 30 | Fortitudo |
| Calories (Mensura) | 2415 ± 150 kcal (mode configurable) | 30 | Vigor |
| Water (Aqua) | ≥ 4 L | 25 | Vigor |
| Vacuums (Vacuum) | 4 sets of 15–30 s | 25 | Temperantia |
| Phone out by 23:00 (Silentium) | marked done | 30 | Temperantia |
| Sleep (Somnus) | ≥ 7h30 | 35 | Quies |
| Weight (Pondus) | logged | 15 | Prudentia |
| Bank balance (Aerarium) | logged (blurred by default) | 15 | Prudentia |

- **XP once per rite per day.** Un-keeping a rite takes its XP back. Per-rite streaks add +2 % per day (max +30 %).
- **Dies Perfectus** — all nine kept: +100 XP (+10 per prior perfect day, max +200) and a guaranteed rare-or-better tribute.
- **Levels** — XP to next level = `60·L^1.6 + 40`.
- **Loot** — each rite rolls once per day: 25 % drop chance, guaranteed by the 5th dry rite. Rarity weights 67 / 25 / 7 / 1 (Vulgaris / Rara / Sacra / Aurea).
  Pity: Epic+ guaranteed within 15 drops; Legendary chance ramps after 50 drops and is guaranteed at 90.
- **Fornax** — salvage items for Cinis (1 / 4 / 12 / 40); 60 Cinis forges a rare-or-better item.
- **Heri** — log yesterday from the Ritus tab (sleep, phone-out, late entries).

Tuning lives at the top of `app.js` (`RITES`, `LOOT`, `ACH`, `LEGENDS`). All illustration — the character, every piece of the wardrobe, the seven scenes, icons and wax seals — is hand-built SVG in `art.js`; no image files.
