import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useCampaignStore } from '@/stores/campaignStore'
import { useAchievementStore } from '@/stores/achievementStore'
import { SCENARIO_STATUSES } from '@/models/types'
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

// Mock the API client
vi.mock('@/services/api/apiClient', () => ({
  hasToken: () => false,
}))

vi.mock('@/services/api/campaignApi', () => ({
  upsertCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
  listCampaigns: vi.fn(),
  getCampaign: vi.fn(),
}))

describe('scenarioStore', () => {
  beforeEach(() => {
    localStorageMock.clear()
    setActivePinia(createPinia())
  })

  describe('loadScenarioData', () => {
    it('loads scenario definitions from JSON', async () => {
      const store = useScenarioStore()
      expect(store.isDataLoaded).toBe(false)
      await store.loadScenarioData()
      expect(store.isDataLoaded).toBe(true)
      expect(store.scenarioDefinitions.length).toBe(99)
    })

    it('does not reload if already loaded', async () => {
      const store = useScenarioStore()
      await store.loadScenarioData()
      const count = store.scenarioDefinitions.length
      await store.loadScenarioData()
      expect(store.scenarioDefinitions.length).toBe(count)
    })
  })

  describe('getState', () => {
    it('returns default locked state for unknown scenario', () => {
      const store = useScenarioStore()
      const state = store.getState(999)
      expect(state.id).toBe(999)
      expect(state.status).toBe(SCENARIO_STATUSES.LOCKED)
      expect(state.notes).toBe('')
      expect(state.treasuresLooted).toEqual([])
    })
  })

  describe('getDefinition', () => {
    it('returns undefined when data not loaded', () => {
      const store = useScenarioStore()
      expect(store.getDefinition(0)).toBeUndefined()
    })

    it('returns definition after data loaded', async () => {
      const store = useScenarioStore()
      await store.loadScenarioData()
      const def = store.getDefinition(0)
      expect(def).toBeDefined()
      expect(def!.id).toBe(0)
      expect(def!.root).toBe(true)
    })
  })

  describe('computedStatuses', () => {
    it('returns empty when no campaign active', async () => {
      const store = useScenarioStore()
      await store.loadScenarioData()
      expect(Object.keys(store.computedStatuses)).toHaveLength(0)
    })

    it('marks root scenario as AVAILABLE with active campaign', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test Campaign')

      const store = useScenarioStore()
      await store.loadScenarioData()

      expect(store.computedStatuses[0]).toBe(SCENARIO_STATUSES.AVAILABLE)
    })

    it('marks non-root non-linked scenarios as LOCKED', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test Campaign')

      const store = useScenarioStore()
      await store.loadScenarioData()

      // Find a scenario that is not root and whose parents are not completed
      // Scenario 2 is linked from 1, and 1 is root but not completed
      const scenario2 = store.getDefinition(2)
      if (scenario2 && !scenario2.root) {
        const status = store.computedStatuses[2]
        expect(status).toBe(SCENARIO_STATUSES.LOCKED)
      }
    })

    it('marks linked scenarios as AVAILABLE after parent completed', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test Campaign')

      const store = useScenarioStore()
      await store.loadScenarioData()

      // Complete scenario 0 which links_to scenario 1
      store.completeScenario(0)

      expect(store.computedStatuses[0]).toBe(SCENARIO_STATUSES.COMPLETED)
      expect(store.computedStatuses[1]).toBe(SCENARIO_STATUSES.AVAILABLE)
    })
  })

  describe('completeScenario', () => {
    it('changes scenario status to COMPLETED', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test Campaign')

      const store = useScenarioStore()
      await store.loadScenarioData()

      store.completeScenario(0)

      const state = campaignStore.currentCampaign!.scenarios['0']
      expect(state).toBeDefined()
      expect(state.status).toBe(SCENARIO_STATUSES.COMPLETED)
    })

    it('sets completedAt timestamp', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test Campaign')

      const store = useScenarioStore()
      await store.loadScenarioData()

      store.completeScenario(0)

      const state = campaignStore.currentCampaign!.scenarios['0']
      expect(state.completedAt).toBeDefined()
    })

    it('does nothing when no campaign', async () => {
      const store = useScenarioStore()
      await store.loadScenarioData()
      // Should not throw
      store.completeScenario(0)
    })

    it('awards achievements if scenario has them', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')

      const scenarioStore = useScenarioStore()
      await scenarioStore.loadScenarioData()

      // Find a scenario with achievements_awarded
      const withAch = scenarioStore.scenarioDefinitions.find(
        (s) => s.achievements_awarded && s.achievements_awarded.length > 0
      )

      if (withAch) {
        const achievementStore = useAchievementStore()
        scenarioStore.completeScenario(withAch.id)
        for (const achId of withAch.achievements_awarded!) {
          expect(achievementStore.isAchieved(achId)).toBe(true)
        }
      }
    })
  })

  describe('markAttempted', () => {
    it('changes scenario status to ATTEMPTED', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')

      const store = useScenarioStore()
      await store.loadScenarioData()

      store.markAttempted(0)
      const state = campaignStore.currentCampaign!.scenarios['0']
      expect(state.status).toBe(SCENARIO_STATUSES.ATTEMPTED)
    })
  })

  describe('unlockScenario', () => {
    it('changes scenario status to AVAILABLE', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')

      const store = useScenarioStore()
      await store.loadScenarioData()

      store.unlockScenario(5)
      const state = campaignStore.currentCampaign!.scenarios['5']
      expect(state.status).toBe(SCENARIO_STATUSES.AVAILABLE)
    })
  })

  describe('resetScenario', () => {
    it('removes scenario state', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')

      const store = useScenarioStore()
      await store.loadScenarioData()

      store.completeScenario(0)
      expect(campaignStore.currentCampaign!.scenarios['0']).toBeDefined()

      store.resetScenario(0)
      expect(campaignStore.currentCampaign!.scenarios['0']).toBeUndefined()
    })
  })

  describe('lootTreasure', () => {
    it('adds treasure to scenario state', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')

      const store = useScenarioStore()
      await store.loadScenarioData()

      store.lootTreasure(0, 47)
      const state = campaignStore.currentCampaign!.scenarios['0']
      expect(state.treasuresLooted).toContain(47)
    })

    it('does not add duplicate treasures', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')

      const store = useScenarioStore()
      await store.loadScenarioData()

      store.lootTreasure(0, 47)
      store.lootTreasure(0, 47)
      const state = campaignStore.currentCampaign!.scenarios['0']
      expect(state.treasuresLooted.filter((t) => t === 47)).toHaveLength(1)
    })
  })

  describe('setNotes', () => {
    it('sets notes on existing scenario state', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')

      const store = useScenarioStore()
      await store.loadScenarioData()

      store.completeScenario(0)
      store.setNotes(0, 'Test notes')
      expect(campaignStore.currentCampaign!.scenarios['0'].notes).toBe('Test notes')
    })

    it('creates new state with notes for unknown scenario', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')

      const store = useScenarioStore()
      await store.loadScenarioData()

      store.setNotes(50, 'My notes')
      const state = campaignStore.currentCampaign!.scenarios['50']
      expect(state).toBeDefined()
      expect(state.notes).toBe('My notes')
    })
  })

  describe('computed lists', () => {
    it('allScenarios returns all scenarios with state and computedStatus', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')

      const store = useScenarioStore()
      await store.loadScenarioData()

      expect(store.allScenarios.length).toBe(99)
      for (const s of store.allScenarios) {
        expect(s.computedStatus).toBeDefined()
        expect(s.state).toBeDefined()
      }
    })

    it('availableScenarios includes root scenario', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')

      const store = useScenarioStore()
      await store.loadScenarioData()

      const available = store.availableScenarios
      expect(available.some((s) => s.id === 0)).toBe(true)
    })

    it('completedCount starts at 0', async () => {
      const campaignStore = useCampaignStore()
      campaignStore.createCampaign('Test')

      const store = useScenarioStore()
      await store.loadScenarioData()

      expect(store.completedCount).toBe(0)
    })

    it('totalCount is 99', async () => {
      const store = useScenarioStore()
      await store.loadScenarioData()
      expect(store.totalCount).toBe(99)
    })
  })
})
