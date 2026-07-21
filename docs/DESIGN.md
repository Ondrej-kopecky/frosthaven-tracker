# Frosthaven Tracker — Design System (redesign 2026-07)

Směr: **herní Frosthaven companion**. Tmavý ledový základ, pergamen pro herní obsah
(karty, itemy), oficiální herní ikony, JEDNA akcentní barva. Vzorová stránka:
`src/pages/ItemsPage.vue` (pergamenová karta itemu) + `src/style.css` (tokeny).

## Barevná disciplína — POVOLENÉ barvy

| Role | Třída / token | Použití |
|---|---|---|
| Akcent (interakce, odkazy, info) | `text-fh-primary`, `fh-primary` (#5ba4cf) | JEDINÁ ozdobná barva |
| Světlý akcent (nadpisy) | `text-fh-frost`, `text-fh-ice` | nadpisy, zvýrazněný text |
| Úspěch / hotovo | `text-fh-completed` (#22c55e) | POUZE stav „hotovo/úspěch" |
| Nebezpečí / blokováno | `text-fh-blocked` (#ef4444) | POUZE chyby, blokace, destruktivní akce |
| Varování / zlato | `text-fh-required` (#eab308), `text-amber-400` | varování; ceny ve zlatě |
| Neutrální / zamčeno | `text-fh-locked`, `text-gray-*` | sekundární text, disabled |

**ZAKÁZANÉ:** violet, purple, indigo, fuchsia, cyan, sky, teal, pink, rose, lime,
emerald, orange (mimo výše uvedené role). Mapování při refaktoru:
- violet/purple/indigo/fuchsia/cyan/sky/teal → `fh-primary` (nebo frost)
- orange → amber (varování) nebo red (nebezpečí) podle významu
- rose/pink → red · emerald/lime → `fh-completed`

Sémantika (zelená=úspěch, červená=nebezpečí, amber=varování) se NESMÍ používat
dekorativně — jen pro skutečný stav.

## Herní ikony — `src/utils/gameIcons.ts` + `public/fh-icons/`

- Popisy s `{TAG.fh}` značkami: `translateDescription()` → ikony s CZ tooltipem
  (jen ikona, žádný text — jako na reálných kartách).
- Suroviny: `RESOURCES[klíč].url` (loot ikony) — nikdy emoji.
- Zlato/cena: `MONEY_ICON` + `text-amber-400` číslo.
- Sloty vybavení: `slotIconUrl(slot)`.
- Jednobarevné glyfy: na pergamenu třída `fh-gicon fh-gicon-dark`, na tmavém
  pozadí `fh-gicon fh-gicon-light`. Plnobarevné (stavy, elementy, spent/consumed/lost)
  bez filtru. Velikost přes `!h-5`/`!h-6` utility, default 1.2em.

## Pergamen — kdy použít

`.fh-parchment` (tokeny `--color-fh-parchment*`, `--color-fh-ink*`) POUZE pro obsah,
který ve hře existuje jako fyzická karta/tisk: itemy, event karty, karty budov,
recepty, ability/quest karty. UI aplikace (filtry, statistiky, formuláře, navigace)
zůstává tmavé (`.fh-card`).

Vzor karty: tmavý rámeček `.item-card` → uvnitř pergamen s obsahem karty → app-info
(počty, tlačítka) v tmavém pruhu POD pergamenem, ne na něm.

## Komponentové vzory

- Karty: `.fh-card` / `.fh-card-interactive` — žádné vlastní bordery/gradienty navíc.
- Tlačítka: `.fh-btn-primary` / `-secondary` / `-ghost`. Destruktivní: ghost + červený text.
- Vstupy: `.fh-input`. Badge: `.fh-badge` + sémantická barva.
- Nadpisy: `font-display` (Cinzel) jen h1–h3 a čísla statistik; běžný text Inter.
- Glow efekty (`fh-glow-*`) střídmě — max 1 prvek na obrazovce.
