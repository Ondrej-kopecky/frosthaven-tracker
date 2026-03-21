import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
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

describe('campaignStore', () => {
  beforeEach(() => {
    localStorageMock.clear()
    setActivePinia(createPinia())
  })

  describe('createCampaign', () => {
    it('creates a new campaign with correct name', () => {
      const store = useCampaignStore()
      const campaign = store.createCampaign('My Campaign')
      expect(campaign.name).toBe('My Campaign')
    })

    it('generates a unique ID', () => {
      const store = useCampaignStore()
      const c1 = store.createCampaign('Campaign 1')
      const c2 = store.createCampaign('Campaign 2')
      expect(c1.id).not.toBe(c2.id)
    })

    it('sets default values', () => {
      const store = useCampaignStore()
      const campaign = store.createCampaign('Test')
      expect(campaign.morale).toBe(0)
      expect(campaign.prosperity).toBe(0)
      expect(campaign.soldiersLost).toBe(0)
      expect(campaign.hideSpoilers).toBe(true)
      expect(campaign.chapterId).toBe(1)
      expect(campaign.inspiration).toBe(0)
      expect(campaign.scenarios).toEqual({})
      expect(campaign.globalAchievements).toEqual({})
      expect(campaign.characters).toEqual([])
      expect(campaign.archivedCharacters).toEqual([])
      expect(campaign.party).toEqual({ name: '', notes: '' })
      expect(campaign.notes).toBe('')
    })

    it('sets default resource values to 0', () => {
      const store = useCampaignStore()
      const campaign = store.createCampaign('Test')
      expect(campaign.resources.lumber).toBe(0)
      expect(campaign.resources.metal).toBe(0)
      expect(campaign.resources.hide).toBe(0)
      expect(campaign.resources.gold).toBe(0)
      expect(campaign.resources.arrowvine).toBe(0)
      expect(campaign.resources.axenut).toBe(0)
      expect(campaign.resources.corpsecap).toBe(0)
      expect(campaign.resources.flamefruit).toBe(0)
      expect(campaign.resources.rockroot).toBe(0)
      expect(campaign.resources.snowthistle).toBe(0)
    })

    it('sets createdAt and lastPlayedAt timestamps', () => {
      const store = useCampaignStore()
      const campaign = store.createCampaign('Test')
      expect(campaign.createdAt).toBeDefined()
      expect(campaign.lastPlayedAt).toBeDefined()
    })

    it('adds campaign to the campaign list', () => {
      const store = useCampaignStore()
      store.createCampaign('Test')
      expect(store.campaigns).toHaveLength(1)
      expect(store.campaigns[0].name).toBe('Test')
    })

    it('sets campaign as active', () => {
      const store = useCampaignStore()
      const campaign = store.createCampaign('Test')
      expect(store.activeCampaignId).toBe(campaign.id)
      expect(store.currentCampaign).toStrictEqual(campaign)
    })

    it('hasCampaign becomes true', () => {
      const store = useCampaignStore()
      expect(store.hasCampaign).toBe(false)
      store.createCampaign('Test')
      expect(store.hasCampaign).toBe(true)
    })

    it('saves campaign to localStorage', () => {
      const store = useCampaignStore()
      store.createCampaign('Test')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('updateCampaign', () => {
    it('merges updates into current campaign', () => {
      const store = useCampaignStore()
      store.createCampaign('Test')
      store.updateCampaign({ morale: 5, prosperity: 3 })
      expect(store.currentCampaign!.morale).toBe(5)
      expect(store.currentCampaign!.prosperity).toBe(3)
    })

    it('does not overwrite other fields', () => {
      const store = useCampaignStore()
      store.createCampaign('Test')
      store.updateCampaign({ morale: 5 })
      expect(store.currentCampaign!.name).toBe('Test')
      expect(store.currentCampaign!.prosperity).toBe(0)
    })

    it('does nothing when no campaign is active', () => {
      const store = useCampaignStore()
      // Should not throw
      store.updateCampaign({ morale: 5 })
      expect(store.currentCampaign).toBeNull()
    })
  })

  describe('deleteCampaign', () => {
    it('removes campaign from list', () => {
      const store = useCampaignStore()
      const campaign = store.createCampaign('Test')
      expect(store.campaigns).toHaveLength(1)
      store.deleteCampaign(campaign.id)
      expect(store.campaigns).toHaveLength(0)
    })

    it('clears active campaign if deleted campaign was active', () => {
      const store = useCampaignStore()
      const campaign = store.createCampaign('Test')
      store.deleteCampaign(campaign.id)
      expect(store.activeCampaignId).toBeNull()
      expect(store.currentCampaign).toBeNull()
    })

    it('switches to another campaign if available', () => {
      const store = useCampaignStore()
      store.createCampaign('First')
      const second = store.createCampaign('Second')
      // second is now active
      store.deleteCampaign(second.id)
      // Should switch to first
      expect(store.activeCampaignId).toBeDefined()
      expect(store.campaigns).toHaveLength(1)
    })

    it('removes from localStorage', () => {
      const store = useCampaignStore()
      const campaign = store.createCampaign('Test')
      store.deleteCampaign(campaign.id)
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })
  })

  describe('exportCampaign', () => {
    it('returns JSON string of current campaign', () => {
      const store = useCampaignStore()
      store.createCampaign('Export Test')
      const json = store.exportCampaign()
      expect(json).toBeDefined()
      expect(typeof json).toBe('string')

      const parsed = JSON.parse(json!)
      expect(parsed.name).toBe('Export Test')
    })

    it('returns null when no campaign is active', () => {
      const store = useCampaignStore()
      expect(store.exportCampaign()).toBeNull()
    })

    it('returns formatted JSON with indentation', () => {
      const store = useCampaignStore()
      store.createCampaign('Test')
      const json = store.exportCampaign()!
      // JSON.stringify with null, 2 produces newlines
      expect(json).toContain('\n')
    })
  })

  describe('importCampaign', () => {
    it('parses and creates campaign from JSON', () => {
      const store = useCampaignStore()
      const json = JSON.stringify({
        id: 'old-id',
        name: 'Imported Campaign',
        createdAt: '2024-01-01T00:00:00Z',
        lastPlayedAt: '2024-01-01T00:00:00Z',
        morale: 10,
        prosperity: 5,
        soldiersLost: 0,
        hideSpoilers: false,
        chapterId: 3,
        inspiration: 0,
        resources: { lumber: 0, metal: 0, hide: 0, gold: 0, arrowvine: 0, axenut: 0, corpsecap: 0, flamefruit: 0, rockroot: 0, snowthistle: 0 },
        scenarios: {},
        globalAchievements: {},
        characters: [],
        archivedCharacters: [],
        party: { name: '', notes: '' },
        notes: '',
      })

      const result = store.importCampaign(json)
      expect(result).toBe(true)
      expect(store.currentCampaign).toBeDefined()
      expect(store.currentCampaign!.name).toBe('Imported Campaign')
      expect(store.currentCampaign!.morale).toBe(10)
    })

    it('generates new ID for imported campaign', () => {
      const store = useCampaignStore()
      const json = JSON.stringify({
        id: 'original-id',
        name: 'Imported',
        createdAt: '2024-01-01T00:00:00Z',
        lastPlayedAt: '2024-01-01T00:00:00Z',
        morale: 0, prosperity: 0, soldiersLost: 0, hideSpoilers: true,
        chapterId: 1, inspiration: 0,
        resources: { lumber: 0, metal: 0, hide: 0, gold: 0, arrowvine: 0, axenut: 0, corpsecap: 0, flamefruit: 0, rockroot: 0, snowthistle: 0 },
        scenarios: {}, globalAchievements: {}, characters: [], archivedCharacters: [],
        party: { name: '', notes: '' }, notes: '',
      })

      store.importCampaign(json)
      expect(store.currentCampaign!.id).not.toBe('original-id')
    })

    it('returns false for invalid JSON', () => {
      const store = useCampaignStore()
      expect(store.importCampaign('not json')).toBe(false)
    })

    it('returns false for JSON without id', () => {
      const store = useCampaignStore()
      expect(store.importCampaign(JSON.stringify({ name: 'test' }))).toBe(false)
    })

    it('returns false for JSON without name', () => {
      const store = useCampaignStore()
      expect(store.importCampaign(JSON.stringify({ id: 'test' }))).toBe(false)
    })

    it('adds imported campaign to campaign list', () => {
      const store = useCampaignStore()
      const json = JSON.stringify({
        id: 'x', name: 'Imported',
        createdAt: '2024-01-01', lastPlayedAt: '2024-01-01',
        morale: 0, prosperity: 0, soldiersLost: 0, hideSpoilers: true,
        chapterId: 1, inspiration: 0,
        resources: { lumber: 0, metal: 0, hide: 0, gold: 0, arrowvine: 0, axenut: 0, corpsecap: 0, flamefruit: 0, rockroot: 0, snowthistle: 0 },
        scenarios: {}, globalAchievements: {}, characters: [], archivedCharacters: [],
        party: { name: '', notes: '' }, notes: '',
      })

      store.importCampaign(json)
      expect(store.campaigns.some((c) => c.name === 'Imported')).toBe(true)
    })
  })

  describe('switchCampaign', () => {
    it('switches active campaign', () => {
      const store = useCampaignStore()
      const c1 = store.createCampaign('First')
      const c2 = store.createCampaign('Second')
      expect(store.activeCampaignId).toBe(c2.id)

      store.switchCampaign(c1.id)
      expect(store.activeCampaignId).toBe(c1.id)
    })
  })

  describe('syncStatus', () => {
    it('starts as idle', () => {
      const store = useCampaignStore()
      expect(store.syncStatus).toBe('idle')
    })
  })
})
