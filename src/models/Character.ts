export interface PerkDefinition {
  id: string
  description: string
  maxCount: number
}

export interface CharacterDefinition {
  classId: string
  name: string
  maxHp: number[]
  handSize: number
  perks: PerkDefinition[]
  masteries?: string[]
  isStarting: boolean
}

/** Osobní zásoby postavy — crafting jde dle pravidel jen z osobních materiálů. */
export interface CharacterResources {
  lumber: number
  metal: number
  hide: number
  arrowvine: number
  axenut: number
  corpsecap: number
  flamefruit: number
  rockroot: number
  snowthistle: number
}

export function emptyCharacterResources(): CharacterResources {
  return {
    lumber: 0, metal: 0, hide: 0,
    arrowvine: 0, axenut: 0, corpsecap: 0,
    flamefruit: 0, rockroot: 0, snowthistle: 0,
  }
}

export interface CharacterState {
  uuid: string
  classId: string
  playerName: string
  level: number
  xp: number
  gold: number
  notes: string
  perksSelected: Record<string, number>
  items: string[]
  checks: number
  resources: CharacterResources
  masteriesCompleted?: boolean[]
  isRetired: boolean
  retiredAt?: string
  createdAt: string
}

export function createDefaultCharacter(uuid: string, classId: string, playerName: string): CharacterState {
  return {
    uuid,
    classId,
    playerName,
    level: 1,
    xp: 0,
    gold: 0,
    notes: '',
    perksSelected: {},
    items: [],
    checks: 0,
    resources: emptyCharacterResources(),
    isRetired: false,
    createdAt: new Date().toISOString(),
  }
}
