import type { Resources } from './types'

export interface ScenarioCondition {
  complete?: (number | string)[]
  incomplete?: (number | string)[]
}

export interface ScenarioData {
  id: number
  name: string
  game: string
  coordinates: { name: string; x: number; y: number }
  chapter_id: number
  complexity: number
  root: boolean
  treasures: number[]
  links_to: number[]
  linked_from: number[]
  blocks_on: ScenarioCondition[]
  choices: number[]
  rewards: string[][] | string[]
  loot: Resources & { coins?: number; 'random-item-treasure'?: number }
  has_boss: boolean
  prompt?: string
  required_by?: ScenarioCondition[]
  achievements_awarded?: string[]
}
