export const SCENARIO_STATUSES = {
  LOCKED: 'locked',
  AVAILABLE: 'available',
  ATTEMPTED: 'attempted',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
  REQUIRED: 'required',
} as const

export type ScenarioStatus = (typeof SCENARIO_STATUSES)[keyof typeof SCENARIO_STATUSES]

export const ITEM_SLOTS = {
  HEAD: 'Head',
  BODY: 'Body',
  LEGS: 'Legs',
  ONE_HAND: 'One Hand',
  TWO_HANDS: 'Two Hands',
  SMALL: 'Small Item',
} as const

export type ItemSlot = (typeof ITEM_SLOTS)[keyof typeof ITEM_SLOTS]

export const RESOURCE_TYPES = {
  LUMBER: 'lumber',
  METAL: 'metal',
  HIDE: 'hide',
  ARROWVINE: 'arrowvine',
  AXENUT: 'axenut',
  CORPSECAP: 'corpsecap',
  FLAMEFRUIT: 'flamefruit',
  ROCKROOT: 'rockroot',
  SNOWTHISTLE: 'snowthistle',
} as const

export type ResourceType = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES]

export type Resources = Partial<Record<ResourceType, number>>
