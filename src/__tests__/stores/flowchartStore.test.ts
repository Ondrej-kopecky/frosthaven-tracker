import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFlowchartStore } from '@/stores/flowchartStore'

describe('flowchartStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('selectNode', () => {
    it('sets selectedNodeId', () => {
      const store = useFlowchartStore()
      expect(store.selectedNodeId).toBeNull()
      store.selectNode(5)
      expect(store.selectedNodeId).toBe(5)
    })

    it('can set to null to deselect', () => {
      const store = useFlowchartStore()
      store.selectNode(5)
      expect(store.selectedNodeId).toBe(5)
      store.selectNode(null)
      expect(store.selectedNodeId).toBeNull()
    })

    it('can change selection', () => {
      const store = useFlowchartStore()
      store.selectNode(1)
      store.selectNode(2)
      expect(store.selectedNodeId).toBe(2)
    })
  })

  describe('setFilter', () => {
    it('defaults to all', () => {
      const store = useFlowchartStore()
      expect(store.filterStatus).toBe('all')
    })

    it('sets filter to a status value', () => {
      const store = useFlowchartStore()
      store.setFilter('completed')
      expect(store.filterStatus).toBe('completed')
    })

    it('sets filter to locked', () => {
      const store = useFlowchartStore()
      store.setFilter('locked')
      expect(store.filterStatus).toBe('locked')
    })

    it('can reset to all', () => {
      const store = useFlowchartStore()
      store.setFilter('available')
      store.setFilter('all')
      expect(store.filterStatus).toBe('all')
    })
  })

  describe('setStoryFilter', () => {
    it('defaults to all', () => {
      const store = useFlowchartStore()
      expect(store.storyFilter).toBe('all')
    })

    it('sets to main', () => {
      const store = useFlowchartStore()
      store.setStoryFilter('main')
      expect(store.storyFilter).toBe('main')
    })

    it('sets to side', () => {
      const store = useFlowchartStore()
      store.setStoryFilter('side')
      expect(store.storyFilter).toBe('side')
    })

    it('can reset to all', () => {
      const store = useFlowchartStore()
      store.setStoryFilter('main')
      store.setStoryFilter('all')
      expect(store.storyFilter).toBe('all')
    })
  })
})
