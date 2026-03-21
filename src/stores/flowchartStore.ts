import { defineStore } from 'pinia'
import { ref } from 'vue'
import { SCENARIO_STATUSES } from '@/models/types'

export type StatusFilter = typeof SCENARIO_STATUSES[keyof typeof SCENARIO_STATUSES] | 'all'
export type StoryFilter = 'all' | 'main' | 'side'

export const useFlowchartStore = defineStore('flowchart', () => {
  const selectedNodeId = ref<number | null>(null)
  const filterStatus = ref<StatusFilter>('all')
  const storyFilter = ref<StoryFilter>('all')

  function selectNode(id: number | null) {
    selectedNodeId.value = id
  }

  function setFilter(status: StatusFilter) {
    filterStatus.value = status
  }

  function setStoryFilter(filter: StoryFilter) {
    storyFilter.value = filter
  }

  return {
    selectedNodeId,
    filterStatus,
    storyFilter,
    selectNode,
    setFilter,
    setStoryFilter,
  }
})
