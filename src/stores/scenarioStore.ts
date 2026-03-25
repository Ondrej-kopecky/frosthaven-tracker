import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SCENARIO_STATUSES } from '@/models/types'
import type { ScenarioData, ScenarioCondition } from '@/models/Scenario'
import type { ScenarioState } from '@/models/Campaign'
import { useCampaignStore } from './campaignStore'
import { useAchievementStore } from './achievementStore'
import { useEventStore } from './eventStore'
import type { DeckId } from './eventStore'
import scenarioEvents from '@/data/scenario-events.json'

interface ScenarioEventAction {
  action: 'add' | 'removeFaction'
  deck?: string
  cards?: number[]
  faction?: string
}

export const useScenarioStore = defineStore('scenario', () => {
  const campaignStore = useCampaignStore()
  const achievementStore = useAchievementStore()
  const eventStore = useEventStore()

  const scenarioDefinitions = ref<ScenarioData[]>([])
  const isDataLoaded = ref(false)

  async function loadScenarioData() {
    if (isDataLoaded.value) return
    const data = await import('@/data/scenarios.json')
    scenarioDefinitions.value = data.default as ScenarioData[]
    isDataLoaded.value = true
  }

  const scenarioStates = computed(
    () => campaignStore.currentCampaign?.scenarios ?? {}
  )

  const scenarioMap = computed(() => {
    const map = new Map<number, ScenarioData>()
    for (const s of scenarioDefinitions.value) {
      map.set(s.id, s)
    }
    return map
  })

  function getState(id: number): ScenarioState {
    return scenarioStates.value[String(id)] ?? {
      id,
      status: SCENARIO_STATUSES.LOCKED,
      notes: '',
      treasuresLooted: [],
    }
  }

  function getDefinition(id: number): ScenarioData | undefined {
    return scenarioMap.value.get(id)
  }

  // Multi-pass status computation
  const computedStatuses = computed(() => {
    const statuses: Record<number, string> = {}
    const campaign = campaignStore.currentCampaign
    if (!campaign) return statuses

    // Pass 1: Set completed, attempted, manually unlocked
    for (const scenario of scenarioDefinitions.value) {
      const state = campaign.scenarios[String(scenario.id)]
      if (state?.status === SCENARIO_STATUSES.COMPLETED) {
        statuses[scenario.id] = SCENARIO_STATUSES.COMPLETED
      } else if (state?.status === SCENARIO_STATUSES.ATTEMPTED) {
        statuses[scenario.id] = SCENARIO_STATUSES.ATTEMPTED
      } else if (state?.status === SCENARIO_STATUSES.AVAILABLE) {
        statuses[scenario.id] = SCENARIO_STATUSES.AVAILABLE
      }
    }

    // Pass 2: Visibility - root + linked from completed
    for (const scenario of scenarioDefinitions.value) {
      if (statuses[scenario.id]) continue

      if (scenario.root) {
        statuses[scenario.id] = SCENARIO_STATUSES.AVAILABLE
        continue
      }

      const isUnlocked = scenario.linked_from.some((parentId) => {
        const parentDef = getDefinition(parentId)
        const parentStatus = statuses[parentId]

        // If parent has choices, only unlock if this scenario was chosen
        if (parentDef?.choices?.length) {
          const parentState = campaign.scenarios[String(parentId)]
          return parentStatus === SCENARIO_STATUSES.COMPLETED &&
            parentState?.choice === scenario.id
        }

        return parentStatus === SCENARIO_STATUSES.COMPLETED
      })

      if (isUnlocked) {
        statuses[scenario.id] = SCENARIO_STATUSES.AVAILABLE
      }
    }

    // Pass 3: blocks_on
    for (const scenario of scenarioDefinitions.value) {
      if (statuses[scenario.id] !== SCENARIO_STATUSES.AVAILABLE) continue
      if (!scenario.blocks_on?.length) continue

      if (checkAnyConditionMet(scenario.blocks_on)) {
        statuses[scenario.id] = SCENARIO_STATUSES.BLOCKED
      }
    }

    // Pass 4: required_by
    for (const scenario of scenarioDefinitions.value) {
      if (statuses[scenario.id] !== SCENARIO_STATUSES.AVAILABLE) continue
      if (!scenario.required_by?.length) continue

      if (!checkAnyConditionMet(scenario.required_by)) {
        statuses[scenario.id] = SCENARIO_STATUSES.REQUIRED
      }
    }

    // Fill remaining as locked
    for (const scenario of scenarioDefinitions.value) {
      if (!statuses[scenario.id]) {
        statuses[scenario.id] = SCENARIO_STATUSES.LOCKED
      }
    }

    return statuses
  })

  function checkAnyConditionMet(conditions: ScenarioCondition[]): boolean {
    return conditions.some((condition) => {
      const completeOk = (condition.complete ?? []).every((id) => isConditionItemComplete(id))
      const incompleteOk = (condition.incomplete ?? []).every((id) => !isConditionItemComplete(id))
      return completeOk && incompleteOk
    })
  }

  function isConditionItemComplete(id: number | string): boolean {
    if (typeof id === 'number') {
      const state = scenarioStates.value[String(id)]
      return state?.status === SCENARIO_STATUSES.COMPLETED
    }
    // String = achievement ID
    return achievementStore.isAchieved(String(id))
  }

  function getScenarioStatus(id: number): string {
    return computedStatuses.value[id] ?? SCENARIO_STATUSES.LOCKED
  }

  // Computed lists
  const allScenarios = computed(() =>
    scenarioDefinitions.value.map((def) => ({
      ...def,
      state: getState(def.id),
      computedStatus: computedStatuses.value[def.id] ?? SCENARIO_STATUSES.LOCKED,
    }))
  )

  const availableScenarios = computed(() =>
    allScenarios.value.filter((s) => s.computedStatus === SCENARIO_STATUSES.AVAILABLE)
  )

  const completedScenarios = computed(() =>
    allScenarios.value.filter((s) => s.computedStatus === SCENARIO_STATUSES.COMPLETED)
  )

  const completedCount = computed(() => completedScenarios.value.length)
  const totalCount = computed(() => scenarioDefinitions.value.length)

  // Actions
  function completeScenario(id: number) {
    if (!campaignStore.currentCampaign) return
    const def = getDefinition(id)
    if (!def) return

    const existing = campaignStore.currentCampaign.scenarios[String(id)]
    campaignStore.currentCampaign.scenarios[String(id)] = {
      id,
      status: SCENARIO_STATUSES.COMPLETED,
      notes: existing?.notes ?? '',
      treasuresLooted: existing?.treasuresLooted ?? [],
      completedAt: new Date().toISOString(),
    }

    // Award achievements
    if (def.achievements_awarded) {
      for (const achId of def.achievements_awarded) {
        achievementStore.award(achId)
      }
    }

    // Apply event deck modifications
    const eventActions = (scenarioEvents as Record<string, ScenarioEventAction[]>)[String(id)]
    if (eventActions) {
      for (const ev of eventActions) {
        if (ev.action === 'removeFaction' && ev.faction) {
          eventStore.removeFactionCards(ev.faction)
        } else if (ev.action === 'add' && ev.deck && ev.cards) {
          for (const cardNum of ev.cards) {
            eventStore.addCard(ev.deck as DeckId, cardNum)
          }
        }
      }
    }

    campaignStore.autoSave()
  }

  function markAttempted(id: number) {
    if (!campaignStore.currentCampaign) return
    const existing = campaignStore.currentCampaign.scenarios[String(id)]
    campaignStore.currentCampaign.scenarios[String(id)] = {
      id,
      status: SCENARIO_STATUSES.ATTEMPTED,
      notes: existing?.notes ?? '',
      treasuresLooted: existing?.treasuresLooted ?? [],
    }
    campaignStore.autoSave()
  }

  function unlockScenario(id: number) {
    if (!campaignStore.currentCampaign) return
    const existing = campaignStore.currentCampaign.scenarios[String(id)]
    campaignStore.currentCampaign.scenarios[String(id)] = {
      id,
      status: SCENARIO_STATUSES.AVAILABLE,
      notes: existing?.notes ?? '',
      treasuresLooted: existing?.treasuresLooted ?? [],
    }
    campaignStore.autoSave()
  }

  function resetScenario(id: number) {
    if (!campaignStore.currentCampaign) return
    delete campaignStore.currentCampaign.scenarios[String(id)]
    campaignStore.autoSave()
  }

  function setChoice(scenarioId: number, chosenScenarioId: number) {
    if (!campaignStore.currentCampaign) return
    const state = campaignStore.currentCampaign.scenarios[String(scenarioId)]
    if (state) {
      state.choice = chosenScenarioId
      campaignStore.autoSave()
    }
  }

  function lootTreasure(scenarioId: number, treasureId: number) {
    if (!campaignStore.currentCampaign) return
    const key = String(scenarioId)
    if (!campaignStore.currentCampaign.scenarios[key]) {
      campaignStore.currentCampaign.scenarios[key] = {
        id: scenarioId,
        status: SCENARIO_STATUSES.LOCKED,
        notes: '',
        treasuresLooted: [],
      }
    }
    const state = campaignStore.currentCampaign.scenarios[key]
    if (!state.treasuresLooted.includes(treasureId)) {
      state.treasuresLooted.push(treasureId)
      campaignStore.autoSave()
    }
  }

  function setNotes(id: number, notes: string) {
    if (!campaignStore.currentCampaign) return
    const key = String(id)
    if (!campaignStore.currentCampaign.scenarios[key]) {
      campaignStore.currentCampaign.scenarios[key] = {
        id,
        status: SCENARIO_STATUSES.LOCKED,
        notes,
        treasuresLooted: [],
      }
    } else {
      campaignStore.currentCampaign.scenarios[key].notes = notes
    }
    campaignStore.autoSave()
  }

  /** Map: scenarioId → array of sibling choice IDs (excluding self) */
  const choiceGroupMap = computed(() => {
    const map = new Map<number, { parentId: number; siblings: number[] }>()
    for (const def of scenarioDefinitions.value) {
      if (def.choices && def.choices.length > 1) {
        for (const cid of def.choices) {
          map.set(cid, {
            parentId: def.id,
            siblings: def.choices.filter((x) => x !== cid),
          })
        }
      }
    }
    return map
  })

  function isChoiceScenario(id: number): boolean {
    return choiceGroupMap.value.has(id)
  }

  function getChoiceGroup(id: number): { parentId: number; siblings: number[]; total: number } | null {
    const entry = choiceGroupMap.value.get(id)
    if (!entry) return null
    return { ...entry, total: entry.siblings.length + 1 }
  }

  /** Does a parent scenario have choices? */
  function hasChoices(id: number): boolean {
    const def = getDefinition(id)
    return (def?.choices?.length ?? 0) > 1
  }

  function getLinksFrom(id: number): ScenarioData[] {
    const def = getDefinition(id)
    if (!def) return []
    return def.links_to
      .map((targetId) => getDefinition(targetId))
      .filter(Boolean) as ScenarioData[]
  }

  function getLinksTo(id: number): ScenarioData[] {
    const def = getDefinition(id)
    if (!def) return []
    return def.linked_from
      .map((sourceId) => getDefinition(sourceId))
      .filter(Boolean) as ScenarioData[]
  }

  return {
    scenarioDefinitions,
    isDataLoaded,
    scenarioStates,
    scenarioMap,
    computedStatuses,
    allScenarios,
    availableScenarios,
    completedScenarios,
    completedCount,
    totalCount,
    loadScenarioData,
    getState,
    getDefinition,
    getScenarioStatus,
    completeScenario,
    markAttempted,
    unlockScenario,
    resetScenario,
    setChoice,
    lootTreasure,
    setNotes,
    choiceGroupMap,
    isChoiceScenario,
    getChoiceGroup,
    hasChoices,
    getLinksFrom,
    getLinksTo,
  }
})
