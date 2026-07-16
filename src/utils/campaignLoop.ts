/**
 * Pravidlové výpočty herní smyčky Frosthavenu (kalendář, morálka, inspirace).
 * Ověřeno proti rulebooku (Outpost Phase, str. 59–68) a kampaňovému listu.
 */

export type Season = 'summer' | 'winter'

/** Sezóny se střídají po 10 týdnech: 1–10 léto, 11–20 zima, 21–30 léto… */
export function seasonForWeek(week: number): Season {
  return ((week - 1) % 20) < 10 ? 'summer' : 'winter'
}

export function seasonLabel(season: Season): string {
  return season === 'summer' ? 'Léto' : 'Zima'
}

export const MORALE_MIN = 0
export const MORALE_MAX = 20

/**
 * Modifikátor celkové obrany podle morálky (tabulka na kampaňovém listu):
 * 0–2 → −10, 3–4 → −5, 5–7 → 0, 8–10 → +5, 11–13 → +10, 14–20 → +15.
 */
export function moraleDefenseModifier(morale: number): number {
  if (morale < 3) return -10
  if (morale < 5) return -5
  if (morale < 8) return 0
  if (morale < 11) return 5
  if (morale < 14) return 10
  return 15
}

/** Při dosažení 0 nebo 20 morálky se čte sekce z knihy sekcí. */
export function moraleSectionTrigger(morale: number): 'low' | 'high' | null {
  if (morale <= MORALE_MIN) return 'low'
  if (morale >= MORALE_MAX) return 'high'
  return null
}

/** Inspirace za dokončený scénář = 4 − počet postav (min 0). */
export function inspirationGain(characterCount: number): number {
  return Math.max(0, 4 - characterCount)
}

/** Konverze mincí z loot karet na zlato podle úrovně scénáře (0–7). */
export function coinConversion(scenarioLevel: number): number {
  const table = [2, 2, 3, 3, 4, 4, 5, 6]
  return table[Math.min(Math.max(scenarioLevel, 0), 7)]
}

/** Doporučená úroveň scénáře = ⌈průměrná úroveň postav / 2⌉. */
export function scenarioLevel(levels: number[]): number {
  if (levels.length === 0) return 0
  const avg = levels.reduce((s, l) => s + l, 0) / levels.length
  return Math.ceil(avg / 2)
}
