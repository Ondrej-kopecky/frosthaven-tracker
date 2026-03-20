import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { type CampaignState, type CampaignSummary, createDefaultCampaign } from '@/models/Campaign'
import { generateId } from '@/utils/uuid'
import { useDebounceFn } from '@vueuse/core'

function getPrefix(): string {
  const profileId = localStorage.getItem('fh_tracker_active_profile') ?? 'default'
  return `fh_tracker_${profileId}_`
}

export const useCampaignStore = defineStore('campaign', () => {
  const campaigns = ref<CampaignSummary[]>(
    JSON.parse(localStorage.getItem(`${getPrefix()}campaigns`) ?? '[]')
  )
  const activeCampaignId = ref<string | null>(
    localStorage.getItem(`${getPrefix()}active_campaign`)
  )

  // Load current campaign into a reactive ref (not computed from localStorage)
  const currentCampaign = ref<CampaignState | null>(null)

  function loadActiveCampaign() {
    // Re-read campaign list with current prefix
    campaigns.value = JSON.parse(localStorage.getItem(`${getPrefix()}campaigns`) ?? '[]')
    activeCampaignId.value = localStorage.getItem(`${getPrefix()}active_campaign`)

    if (!activeCampaignId.value) {
      currentCampaign.value = null
      return
    }
    const raw = localStorage.getItem(`${getPrefix()}campaign_${activeCampaignId.value}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Migrate: ensure all new fields exist
      if (!parsed.scenarios) parsed.scenarios = {}
      if (!parsed.globalAchievements) parsed.globalAchievements = {}
      if (!parsed.characters) parsed.characters = []
      if (!parsed.archivedCharacters) parsed.archivedCharacters = []
      if (!parsed.party) parsed.party = { name: '', notes: '' }
      if (!parsed.notes) parsed.notes = ''
      if (parsed.prosperity === undefined) parsed.prosperity = 0
      if (parsed.inspiration === undefined) parsed.inspiration = 0
      if (parsed.lastPlayedAt === undefined) parsed.lastPlayedAt = parsed.createdAt
      currentCampaign.value = parsed
    } else {
      currentCampaign.value = null
    }
  }

  // Load on init
  loadActiveCampaign()

  const hasCampaign = computed(() => !!currentCampaign.value)

  // Debounced save
  const _save = useDebounceFn(() => {
    if (!currentCampaign.value) return
    currentCampaign.value.lastPlayedAt = new Date().toISOString()
    localStorage.setItem(
      `${getPrefix()}campaign_${currentCampaign.value.id}`,
      JSON.stringify(currentCampaign.value)
    )
  }, 300)

  function autoSave() {
    _save()
  }

  function saveCampaignList() {
    localStorage.setItem(`${getPrefix()}campaigns`, JSON.stringify(campaigns.value))
  }

  function createCampaign(name: string): CampaignState {
    const id = generateId()
    const campaign = createDefaultCampaign(id, name)
    campaigns.value.push({ id, name, createdAt: campaign.createdAt, lastPlayedAt: campaign.lastPlayedAt })
    saveCampaignList()
    localStorage.setItem(`${getPrefix()}campaign_${id}`, JSON.stringify(campaign))
    activeCampaignId.value = id
    localStorage.setItem(`${getPrefix()}active_campaign`, id)
    currentCampaign.value = campaign
    return campaign
  }

  function switchCampaign(id: string) {
    activeCampaignId.value = id
    localStorage.setItem(`${getPrefix()}active_campaign`, id)
    loadActiveCampaign()
  }

  function updateCampaign(updates: Partial<CampaignState>) {
    if (!currentCampaign.value) return
    Object.assign(currentCampaign.value, updates)
    autoSave()
  }

  function deleteCampaign(id: string) {
    campaigns.value = campaigns.value.filter((c) => c.id !== id)
    saveCampaignList()
    localStorage.removeItem(`${getPrefix()}campaign_${id}`)
    if (activeCampaignId.value === id) {
      activeCampaignId.value = campaigns.value[0]?.id ?? null
      if (activeCampaignId.value) {
        localStorage.setItem(`${getPrefix()}active_campaign`, activeCampaignId.value)
        loadActiveCampaign()
      } else {
        localStorage.removeItem(`${getPrefix()}active_campaign`)
        currentCampaign.value = null
      }
    }
  }

  function exportCampaign(): string | null {
    if (!currentCampaign.value) return null
    return JSON.stringify(currentCampaign.value, null, 2)
  }

  function importCampaign(json: string): boolean {
    try {
      const data = JSON.parse(json) as CampaignState
      if (!data.id || !data.name) return false
      // Generate new ID to avoid conflicts
      data.id = generateId()
      campaigns.value.push({ id: data.id, name: data.name, createdAt: data.createdAt, lastPlayedAt: data.lastPlayedAt ?? data.createdAt })
      saveCampaignList()
      localStorage.setItem(`${getPrefix()}campaign_${data.id}`, JSON.stringify(data))
      activeCampaignId.value = data.id
      localStorage.setItem(`${getPrefix()}active_campaign`, data.id)
      currentCampaign.value = data
      return true
    } catch {
      return false
    }
  }

  return {
    campaigns,
    activeCampaignId,
    currentCampaign,
    hasCampaign,
    createCampaign,
    switchCampaign,
    updateCampaign,
    deleteCampaign,
    autoSave,
    exportCampaign,
    importCampaign,
    loadActiveCampaign,
  }
})
