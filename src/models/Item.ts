import type { Resources } from './types'

export interface ItemData {
  id: number
  name: string
  count: number
  resources: Resources
  slot: string
  source: string
  desc: string
  spent?: boolean
  consumed?: boolean
  lost?: boolean
  minusOneCardsAdded?: number
  faq?: string
}
