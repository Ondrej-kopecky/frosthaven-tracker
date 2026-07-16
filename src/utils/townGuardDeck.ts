import townGuardData from '@/data/town-guard.json'

/**
 * Town Guard attack modifier deck — výpočet výsledného složení balíčku
 * z výchozího decku + trvale aplikovaných Town Guard perků.
 *
 * Základní deck (20 karet) je převzatý z pravidel Frosthaven / dat Gloomhaven
 * Secretariat: 6×(+0), 5×(+10), 1×(+20), 5×(−10), 1×(−20), 1×Wreck, 1×Success.
 *
 * Perky:
 *  - "add"     → všechny uvedené karty se PŘIDAJÍ do decku
 *  - "replace" → PRVNÍ uvedená karta se ODEBERE, zbývající se PŘIDAJÍ
 */

export interface TownGuardCard {
  /** Číselná hodnota modifikátoru (např. 10, 0, -20). U wreck/success se ignoruje. */
  value: number
  /** Speciální karta (zničení / automatický úspěch). */
  special?: 'wreck' | 'success'
  /** Karta je „rolling" (líznou se další karty). */
  rolling?: boolean
  /** Vedlejší efekt karty (zdroj / výhoda) — pro popisek. */
  effect?: string
}

export interface DeckEntry {
  card: TownGuardCard
  count: number
}

interface RawAttackModifier {
  type: string
  rolling?: boolean
  effects?: { type: string; value: string }[]
}

interface RawPerkCard {
  count: number
  rolling?: boolean
  attackModifier: RawAttackModifier
}

interface RawPerk {
  type: 'add' | 'replace' | string
  desc: string
  count: number
  sections: number[]
  cards: RawPerkCard[]
}

/** Výchozí Town Guard deck (před perky). */
export const BASE_TOWN_GUARD_DECK: DeckEntry[] = [
  { card: { value: 0 }, count: 6 },
  { card: { value: 10 }, count: 5 },
  { card: { value: 20 }, count: 1 },
  { card: { value: -10 }, count: 5 },
  { card: { value: -20 }, count: 1 },
  { card: { value: 0, special: 'wreck' }, count: 1 },
  { card: { value: 0, special: 'success' }, count: 1 },
]

function modifierTypeToValue(type: string): number {
  // plus0, plus10, plus20, plus30, minus10, minus20, …
  if (type.startsWith('plus')) return Number(type.slice(4))
  if (type.startsWith('minus')) return -Number(type.slice(5))
  return 0
}

function effectLabel(am: RawAttackModifier): string | undefined {
  const eff = am.effects?.[0]
  if (!eff) return undefined
  if (eff.type === 'advantage') return 'výhoda'
  if (eff.type === 'resource') {
    const map: Record<string, string> = {
      any: 'zdroj', any2: '2 zdroje',
      lumber: 'dřevo', metal: 'kov', hide: 'kůže',
    }
    return map[eff.value] ?? 'zdroj'
  }
  return undefined
}

function toCard(raw: RawPerkCard): TownGuardCard {
  const am = raw.attackModifier
  return {
    value: modifierTypeToValue(am.type),
    rolling: raw.rolling || am.rolling || undefined,
    effect: effectLabel(am),
  }
}

/** Stabilní klíč pro slučování stejných karet. */
function cardKey(c: TownGuardCard): string {
  return [c.special ?? 'num', c.value, c.rolling ? 'r' : '', c.effect ?? ''].join('|')
}

function addCard(map: Map<string, DeckEntry>, card: TownGuardCard, n: number) {
  const key = cardKey(card)
  const existing = map.get(key)
  if (existing) existing.count += n
  else map.set(key, { card, count: n })
}

function removeCard(map: Map<string, DeckEntry>, card: TownGuardCard, n: number) {
  const key = cardKey(card)
  const existing = map.get(key)
  if (!existing) return
  existing.count -= n
  if (existing.count <= 0) map.delete(key)
}

/**
 * Spočítá výsledný Town Guard deck z aplikovaných perků.
 * @param appliedPerks mapa index perku → kolikrát byl použit
 */
export function computeTownGuardDeck(appliedPerks: Record<number, number> = {}): DeckEntry[] {
  const map = new Map<string, DeckEntry>()
  for (const entry of BASE_TOWN_GUARD_DECK) {
    addCard(map, entry.card, entry.count)
  }

  const perks = townGuardData.perks as RawPerk[]
  for (const [indexStr, timesRaw] of Object.entries(appliedPerks)) {
    const index = Number(indexStr)
    const times = timesRaw ?? 0
    const perk = perks[index]
    if (!perk || times <= 0) continue

    for (let t = 0; t < times; t++) {
      if (perk.type === 'replace') {
        const [first, ...rest] = perk.cards
        if (first) removeCard(map, toCard(first), first.count)
        for (const c of rest) addCard(map, toCard(c), c.count)
      } else {
        // "add" — přidej všechny karty
        for (const c of perk.cards) addCard(map, toCard(c), c.count)
      }
    }
  }

  // Seřaď: speciální karty na konec, jinak podle hodnoty sestupně.
  return [...map.values()].sort((a, b) => {
    if (a.card.special && !b.card.special) return 1
    if (!a.card.special && b.card.special) return -1
    return b.card.value - a.card.value
  })
}

/** Celkový počet karet v decku. */
export function deckSize(deck: DeckEntry[]): number {
  return deck.reduce((sum, e) => sum + e.count, 0)
}

/** Lidsky čitelný popisek karty (např. „+10", „−20", „Wreck", „+0 (dřevo)"). */
export function cardLabel(c: TownGuardCard): string {
  if (c.special === 'wreck') return 'Wreck'
  if (c.special === 'success') return 'Success'
  const sign = c.value > 0 ? '+' : c.value < 0 ? '−' : '±'
  const num = Math.abs(c.value)
  let label = `${sign}${num}`
  const tags: string[] = []
  if (c.rolling) tags.push('rolling')
  if (c.effect) tags.push(c.effect)
  if (tags.length) label += ` (${tags.join(', ')})`
  return label
}
