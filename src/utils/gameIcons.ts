// Herní ikony z Gloomhaven Secretariat (FH sada) — public/fh-icons/
// Překlad {TAG.fh} značek v popisech na <img> ikony jako na reálných kartách.
// Český název efektu je v title/alt (tooltip), text se nevypisuje.

const ICON_BASE = '/fh-icons'

export function iconUrl(category: string, name: string): string {
  return `${ICON_BASE}/${category}/${name}.svg`
}

// dark = černý glyf (jednobarevné ikony akcí/slotů na pergamenu)
function img(category: string, name: string, title: string, dark = false): string {
  const cls = dark ? 'fh-gicon fh-gicon-dark' : 'fh-gicon'
  return `<img src="${iconUrl(category, name)}" class="${cls}" alt="${title}" title="${title}">`
}

function action(name: string, title: string): string {
  return img('action', name, title, true)
}

function condition(name: string, title: string): string {
  return img('condition', name, title)
}

// Akce s číslem: ikona + hodnota (např. dostřel 3)
function actionValue(name: string, title: string, value: string): string {
  return `<span class="fh-keyword" title="${title}">${action(name, title)}<b>${value}</b></span>`
}

function element(name: string, title: string, consume = false): string {
  const base = img('element', name, title)
  if (!consume) return base
  return `<span class="fh-el-consume" title="${title} (spotřebuj)">${base}<img src="${iconUrl('element', 'consume')}" class="fh-el-x" alt="spotřebuj"></span>`
}

const ELEMENTS: Record<string, { file: string; label: string }> = {
  FIRE: { file: 'fire', label: 'Oheň' },
  ICE: { file: 'ice', label: 'Led' },
  WIND: { file: 'air', label: 'Vzduch' },
  EARTH: { file: 'earth', label: 'Země' },
  LIGHT: { file: 'light', label: 'Světlo' },
  DARK: { file: 'dark', label: 'Temnota' },
  ANY: { file: 'wild', label: 'Libovolný element' },
}

function el(key: string, consume = false): string {
  const e = ELEMENTS[key] ?? ELEMENTS.ANY!
  return element(e.file, e.label, consume)
}

// Akce: [regex tag, soubor, český název]
const ACTIONS: [string, string, string][] = [
  ['MOVE', 'move', 'Pohyb'],
  ['ATTACK', 'attack', 'Útok'],
  ['RANGE', 'range', 'Dostřel'],
  ['HEAL', 'heal', 'Léčení'],
  ['SHIELD', 'shield', 'Obrana'],
  ['PUSH', 'push', 'Odstrčení'],
  ['PULL', 'pull', 'Přitažení'],
  ['PIERCE', 'pierce', 'Průraznost'],
  ['RETALIATE', 'retaliate', 'Odplata'],
  ['TARGET', 'target', 'Cíl'],
  ['DAMAGE', 'damage', 'Zranění'],
  ['LOOT', 'loot', 'Lup'],
  ['JUMP', 'jump', 'Skok'],
  ['TELEPORT', 'teleport', 'Teleport'],
]

const CONDITIONS: [string, string, string][] = [
  ['POISON', 'poison', 'Otrava'],
  ['WOUND', 'wound', 'Zranění (stav)'],
  ['MUDDLE', 'muddle', 'Zmatení'],
  ['IMMOBILIZE', 'immobilize', 'Znehybnění'],
  ['DISARM', 'disarm', 'Odzbrojení'],
  ['STUN', 'stun', 'Omráčení'],
  ['BLESS', 'bless', 'Požehnání'],
  ['CURSE', 'curse', 'Prokletí'],
  ['INVISIBLE', 'invisible', 'Neviditelnost'],
  ['STRENGTHEN', 'strengthen', 'Posílení'],
  ['BRITTLE', 'brittle', 'Křehkost'],
  ['BANE', 'bane', 'Pohroma'],
  ['WARD', 'ward', 'Ochrana'],
  ['IMPAIR', 'impair', 'Oslabení'],
  ['REGENERATE', 'regenerate', 'Regenerace'],
]

export function translateDescription(desc: string): string {
  let result = desc

  // Akce s číslem ({RANGE.fh} 3 → ikona+3), pak bez čísla
  for (const [tag, file, label] of ACTIONS) {
    result = result
      .replace(new RegExp(`\\{${tag}\\.fh\\}\\s*(\\d+)`, 'g'), (_, n) => actionValue(file, label, n))
      .replace(new RegExp(`\\{${tag}\\.fh\\}`, 'g'), action(file, label))
  }
  result = result
    .replace(/\{FLY(?:ING)?\.fh\}/g, action('fly', 'Let'))
    .replace(/\{RECOVER\.fh\}/g, action('heal', 'Obnova'))

  // Stavy — jen ikona s tooltipem
  for (const [tag, file, label] of CONDITIONS) {
    result = result.replace(new RegExp(`\\{${tag}\\.fh\\}`, 'g'), condition(file, label))
  }

  result = result
    // Použití karty
    .replace(/\{CONSUMED\.fh\}/g, img('use', 'consumed', 'Spotřebované', true))
    .replace(/\{ROUND\}/g, img('use', 'round', 'Na jedno kolo', true))
    .replace(/\{PERSISTENT\}/g, img('use', 'persistent', 'Trvalé', true))
    // Modifikátory — text (ikony modifikátorů nemáme)
    .replace(/\{2X_MODIFIER\}/g, '<b>2× modifikátor</b>')
    .replace(/\{\+1_MODIFIER\}/g, '<b>+1 modifikátor</b>')
    .replace(/\{\+0_MODIFIER\}/g, '<b>+0 modifikátor</b>')
    .replace(/\{\+2_MODIFIER\}/g, '<b>+2 modifikátor</b>')
    .replace(/\{-1_MODIFIER\}/g, '<b>−1 modifikátor</b>')
    .replace(/\{NULL_MODIFIER\}/g, '<b>Nulový modifikátor</b>')
    .replace(/\{SMALL-ITEM\}/g, img('slot', 'small', 'Malý předmět', true))
    .replace(/\{CHECK\}/g, '✔')
    // Elementy — spotřeba (_X) dřív než čisté
    .replace(/\{(FIRE|ICE|WIND|EARTH|LIGHT|DARK|ANY)_X\}/g, (_, k) => el(k, true))
    .replace(/\{(FIRE|ICE|WIND|EARTH|LIGHT|DARK|ANY)_OR_(FIRE|ICE|WIND|EARTH|LIGHT|DARK|ANY)_X\}/g, (_, a, b) => `${el(a, true)}/${el(b, true)}`)
    .replace(/\{(FIRE|ICE|WIND|EARTH|LIGHT|DARK|ANY)_OR_(FIRE|ICE|WIND|EARTH|LIGHT|DARK|ANY)\}/g, (_, a, b) => `${el(a)}/${el(b)}`)
    .replace(/\{(FIRE|ICE|WIND|EARTH|LIGHT|DARK|ANY)\}/g, (_, k) => el(k))
    // FH speciální symboly (třídní mechaniky) — zatím unicode
    .replace(/\{INFUSION_ICON\}/g, '<span title="Infuze">&#9672;</span>')
    .replace(/\{RANGED_ICON\}/g, action('range', 'Na dálku'))
    .replace(/\{TRANSFER_ICON\}/g, '<span title="Transfer">&#8644;</span>')
    .replace(/\{PRESSURE_HIGH_ICON\}/g, '<span title="Vysoký tlak">&#9650;</span>')
    .replace(/\{PRESSURE_OVER_ICON\}/g, '<span title="Přetlak">&#9650;&#9650;</span>')
    .replace(/\{PRESSURE_LOW_ICON\}/g, '<span title="Nízký tlak">&#9660;</span>')
    .replace(/\{SHADOW_ICON\}/g, '<span title="Stín">&#9676;</span>')
    .replace(/\{RESONANCE_ICON\}/g, '<span title="Rezonance">&#8776;</span>')
    .replace(/\{TIDE_ICON\}/g, '<span title="Příliv">&#8767;</span>')
    .replace(/\{TIME_ICON\}/g, '<span title="Čas">&#9200;</span>')
    // AOE — zjednodušený text
    .replace(/\{AOE\.CONE_0_1\}/g, '<i>Kužel</i>')
    .replace(/\{AOE\.CONE_1_1\}/g, '<i>Kužel</i>')
    .replace(/\{AOE\.LINE_0_1_1\}/g, '<i>Linie</i>')

  return result
}

// Sloty vybavení
const SLOT_FILES: Record<string, string> = {
  Head: 'head',
  Body: 'body',
  Legs: 'legs',
  'One Hand': 'onehand',
  'Two Hands': 'twohand',
  'Small Item': 'small',
}

export function slotIconUrl(slot: string | undefined): string {
  return iconUrl('slot', SLOT_FILES[slot ?? ''] ?? 'small')
}

// Suroviny (loot ikony)
export const RESOURCES: Record<string, { label: string; url: string }> = {
  lumber: { label: 'dřevo', url: iconUrl('loot', 'lumber') },
  metal: { label: 'kov', url: iconUrl('loot', 'metal') },
  hide: { label: 'kůže', url: iconUrl('loot', 'hide') },
  arrowvine: { label: 'šípovník', url: iconUrl('loot', 'arrowvine') },
  axenut: { label: 'sekerník', url: iconUrl('loot', 'axenut') },
  corpsecap: { label: 'mrtvička', url: iconUrl('loot', 'corpsecap') },
  flamefruit: { label: 'plamplod', url: iconUrl('loot', 'flamefruit') },
  rockroot: { label: 'skalník', url: iconUrl('loot', 'rockroot') },
  snowthistle: { label: 'sněžobod', url: iconUrl('loot', 'snowthistle') },
}

export const MONEY_ICON = iconUrl('loot', 'money')
export const USE_ICONS = {
  spent: { label: 'Vyčerpané — po odpočinku se vrátí', url: iconUrl('use', 'spent') },
  consumed: { label: 'Spotřebované — po použití zmizí', url: iconUrl('use', 'consumed') },
}
