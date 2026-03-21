import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAchievementStore } from '@/stores/achievementStore'
import { useCampaignStore } from '@/stores/campaignStore'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

vi.mock('@/services/api/apiClient', () => ({
  hasToken: () => false,
}))

vi.mock('@/services/api/campaignApi', () => ({
  upsertCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
  listCampaigns: vi.fn(),
  getCampaign: vi.fn(),
}))

describe('achievementStore', () => {
  beforeEach(() => {
    localStorageMock.clear()
    setActivePinia(createPinia())
  })

  describe('definitions', () => {
    it('loads achievement definitions', () => {
      const store = useAchievementStore()
      expect(store.definitions.length).toBeGreaterThan(0)
    })

    it('each definition has id and name', () => {
      const store = useAchievementStore()
      for (const def of store.definitions) {
        expect(typeof def.id).toBe('string')
        expect(typeof def.name).toBe('string')
      }
    })
  })

  describe('isAchieved', () => {
    it('returns false when no campaign', () => {
      const store = useAchievementStore()
      expect(store.isAchieved('CFIS')).toBe(false)
    })

    it('returns false for unawarded achievement', () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')
      const store = useAchievementStore()
      expect(store.isAchieved('CFIS')).toBe(false)
    })

    it('returns true after awarding', () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')
      const store = useAchievementStore()
      store.award('CFIS')
      expect(store.isAchieved('CFIS')).toBe(true)
    })
  })

  describe('award', () => {
    it('sets achievement to true', () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')
      const store = useAchievementStore()
      store.award('CFIS')
      expect(campaignStore.currentCampaign!.globalAchievements['CFIS']).toBe(true)
    })

    it('does nothing when no campaign', () => {
      const store = useAchievementStore()
      // Should not throw
      store.award('CFIS')
    })
  })

  describe('remove', () => {
    it('sets achievement to false', () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')
      const store = useAchievementStore()
      store.award('CFIS')
      expect(store.isAchieved('CFIS')).toBe(true)
      store.remove('CFIS')
      expect(store.isAchieved('CFIS')).toBe(false)
    })

    it('does nothing when no campaign', () => {
      const store = useAchievementStore()
      store.remove('CFIS')
    })
  })

  describe('toggle', () => {
    it('toggles achievement from false to true', () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')
      const store = useAchievementStore()
      store.toggle('CFIS')
      expect(store.isAchieved('CFIS')).toBe(true)
    })

    it('toggles achievement from true to false', () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')
      const store = useAchievementStore()
      store.toggle('CFIS')
      expect(store.isAchieved('CFIS')).toBe(true)
      store.toggle('CFIS')
      expect(store.isAchieved('CFIS')).toBe(false)
    })

    it('does nothing when no campaign', () => {
      const store = useAchievementStore()
      store.toggle('CFIS')
    })
  })

  describe('achievedCount', () => {
    it('starts at 0', () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')
      const store = useAchievementStore()
      expect(store.achievedCount).toBe(0)
    })

    it('increments when visible achievement is awarded', () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')
      const store = useAchievementStore()

      // Find a visible (non-hidden) achievement
      const visible = store.visibleDefinitions[0]
      expect(visible).toBeDefined()

      store.award(visible.id)
      expect(store.achievedCount).toBe(1)
    })

    it('does not count hidden achievements', () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')
      const store = useAchievementStore()

      const hidden = store.definitions.find((d) => d.hidden)
      if (hidden) {
        store.award(hidden.id)
        // achievedCount only counts visible definitions
        const visibleAwarded = store.visibleDefinitions.filter((d) => store.isAchieved(d.id)).length
        expect(store.achievedCount).toBe(visibleAwarded)
      }
    })
  })

  describe('getName', () => {
    it('returns name for known achievement', () => {
      const store = useAchievementStore()
      const first = store.definitions[0]
      expect(store.getName(first.id)).toBe(first.name)
    })

    it('returns id for unknown achievement', () => {
      const store = useAchievementStore()
      expect(store.getName('UNKNOWN_ACH')).toBe('UNKNOWN_ACH')
    })
  })

  describe('isDefined', () => {
    it('returns true for known achievement', () => {
      const store = useAchievementStore()
      expect(store.isDefined(store.definitions[0].id)).toBe(true)
    })

    it('returns false for unknown achievement', () => {
      const store = useAchievementStore()
      expect(store.isDefined('NOT_AN_ACHIEVEMENT')).toBe(false)
    })
  })

  describe('visibleDefinitions', () => {
    it('excludes hidden achievements', () => {
      const store = useAchievementStore()
      for (const def of store.visibleDefinitions) {
        expect(def.hidden).toBeFalsy()
      }
    })

    it('has fewer or equal items than all definitions', () => {
      const store = useAchievementStore()
      expect(store.visibleDefinitions.length).toBeLessThanOrEqual(store.definitions.length)
    })
  })
})
