import type { CharacterState } from './Character'

export interface ScenarioState {
  id: number
  status: string
  notes: string
  treasuresLooted: number[]
  choice?: number
  completedAt?: string
}

export interface PartyState {
  name: string
  notes: string
}

export interface CampaignState {
  id: string
  name: string
  createdAt: string
  lastPlayedAt: string
  morale: number
  prosperity: number
  soldiersLost: number
  hideSpoilers: boolean
  chapterId: number
  inspiration: number
  resources: {
    lumber: number
    metal: number
    hide: number
    gold: number
    arrowvine: number
    axenut: number
    corpsecap: number
    flamefruit: number
    rockroot: number
    snowthistle: number
  }
  scenarios: Record<string, ScenarioState>
  globalAchievements: Record<string, boolean>
  buildingLevels: Record<number, number>
  eventDecks?: Record<string, { available: number[]; removed: number[] }>
  characters: CharacterState[]
  archivedCharacters: CharacterState[]
  party: PartyState
  notes: string
}

export interface CampaignSummary {
  id: string
  name: string
  createdAt: string
  lastPlayedAt: string
}

export function createDefaultCampaign(id: string, name: string): CampaignState {
  return {
    id,
    name,
    createdAt: new Date().toISOString(),
    lastPlayedAt: new Date().toISOString(),
    morale: 0,
    prosperity: 0,
    soldiersLost: 0,
    hideSpoilers: true,
    chapterId: 1,
    inspiration: 0,
    resources: {
      lumber: 0, metal: 0, hide: 0, gold: 0,
      arrowvine: 0, axenut: 0, corpsecap: 0,
      flamefruit: 0, rockroot: 0, snowthistle: 0,
    },
    scenarios: {},
    globalAchievements: {},
    buildingLevels: {},
    characters: [],
    archivedCharacters: [],
    party: { name: '', notes: '' },
    notes: '',
  }
}
