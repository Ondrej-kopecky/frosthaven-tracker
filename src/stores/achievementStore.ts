import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AchievementDefinition } from '@/models/Achievement'
import achievementsData from '@/data/achievements.json'
import { useCampaignStore } from './campaignStore'

export const useAchievementStore = defineStore('achievement', () => {
  const campaignStore = useCampaignStore()

  const definitions = ref<AchievementDefinition[]>(achievementsData as AchievementDefinition[])

  const achievements = computed(
    () => campaignStore.currentCampaign?.globalAchievements ?? {}
  )

  // Visible (non-hidden) definitions
  const visibleDefinitions = computed(() =>
    definitions.value.filter((a) => !a.hidden)
  )

  function isAchieved(id: string): boolean {
    return achievements.value[id] === true
  }

  function toggle(id: string) {
    if (!campaignStore.currentCampaign) return
    const current = campaignStore.currentCampaign.globalAchievements[id]
    campaignStore.currentCampaign.globalAchievements[id] = !current

    // Handle groups (mutually exclusive)
    const def = definitions.value.find((a) => a.id === id)
    if (def?.group && !current) {
      definitions.value
        .filter((a) => a.group === def.group && a.id !== id)
        .forEach((a) => {
          if (campaignStore.currentCampaign) {
            campaignStore.currentCampaign.globalAchievements[a.id] = false
          }
        })
    }

    campaignStore.autoSave()
  }

  function award(id: string) {
    if (!campaignStore.currentCampaign) return
    campaignStore.currentCampaign.globalAchievements[id] = true

    // Handle upgrades: if this achievement has an upgrade chain, auto-upgrade
    const def = definitions.value.find((a) => a.id === id)
    if (def?.upgrades?.length) {
      // Award the next upgrade if base is already achieved
      const currentLevel = def.upgrades.findIndex((uid) => !achievements.value[uid])
      if (currentLevel >= 0 && campaignStore.currentCampaign) {
        campaignStore.currentCampaign.globalAchievements[def.upgrades[currentLevel]] = true
      }
    }

    campaignStore.autoSave()
  }

  function remove(id: string) {
    if (!campaignStore.currentCampaign) return
    campaignStore.currentCampaign.globalAchievements[id] = false
    campaignStore.autoSave()
  }

  function getName(id: string): string {
    const def = definitions.value.find((a) => a.id === id)
    return def?.name ?? id
  }

  function isDefined(id: string): boolean {
    return definitions.value.some((a) => a.id === id)
  }

  const achievedCount = computed(() =>
    visibleDefinitions.value.filter((a) => isAchieved(a.id)).length
  )

  return {
    definitions,
    visibleDefinitions,
    achievements,
    isAchieved,
    toggle,
    award,
    remove,
    getName,
    isDefined,
    achievedCount,
  }
})
