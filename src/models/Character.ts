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
  isStarting: boolean
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
    isRetired: false,
    createdAt: new Date().toISOString(),
  }
}
