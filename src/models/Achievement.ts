export interface AchievementDefinition {
  id: string
  name: string
  type: string
  is_manual?: boolean
  group?: string
  upgrades?: string[]
  hidden?: boolean
  cards?: string[]
}
