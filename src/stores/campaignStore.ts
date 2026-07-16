import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { type CampaignState, type CampaignSummary, createDefaultCampaign } from '@/models/Campaign'
import { generateId } from '@/utils/uuid'
import { useDebounceFn } from '@vueuse/core'
import { hasToken } from '@/services/api/apiClient'
import { upsertCampaign as apiUpsert, deleteCampaign as apiDeleteCampaign, listCampaigns as apiListCampaigns, getCampaign as apiGetCampaign } from '@/services/api/campaignApi'

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

  const currentCampaign = ref<CampaignState | null>(null)
  const syncStatus = ref<'idle' | 'syncing' | 'synced' | 'error'>('idle')
  const syncError = ref<string | null>(null)

  function loadActiveCampaign() {
    campaigns.value = JSON.parse(localStorage.getItem(`${getPrefix()}campaigns`) ?? '[]')
    activeCampaignId.value = localStorage.getItem(`${getPrefix()}active_campaign`)

    if (!activeCampaignId.value) {
      currentCampaign.value = null
      return
    }
    const raw = localStorage.getItem(`${getPrefix()}campaign_${activeCampaignId.value}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      migrateCampaign(parsed)
      currentCampaign.value = parsed
    } else {
      currentCampaign.value = null
    }
  }

  function migrateCampaign(parsed: Record<string, unknown>) {
    if (!parsed.scenarios) parsed.scenarios = {}
    if (!parsed.globalAchievements) parsed.globalAchievements = {}
    if (!parsed.characters) parsed.characters = []
    if (!parsed.archivedCharacters) parsed.archivedCharacters = []
    if (!parsed.party) parsed.party = { name: '', notes: '' }
    if (!parsed.notes) parsed.notes = ''
    if (parsed.prosperity === undefined) parsed.prosperity = 0
    if (parsed.inspiration === undefined) parsed.inspiration = 0
    if (parsed.lastPlayedAt === undefined) parsed.lastPlayedAt = parsed.createdAt
    if (!parsed.buildingLevels) parsed.buildingLevels = {}
    if (!parsed.townGuard) parsed.townGuard = { checkmarks: 0, appliedPerks: {} }
    if (parsed.soldiers === undefined) parsed.soldiers = 0
  }

  // Load on init
  loadActiveCampaign()

  const hasCampaign = computed(() => !!currentCampaign.value)

  // ── Save (local + cloud) ──

  function saveToLocalStorage() {
    if (!currentCampaign.value) return
    currentCampaign.value.lastPlayedAt = new Date().toISOString()
    localStorage.setItem(
      `${getPrefix()}campaign_${currentCampaign.value.id}`,
      JSON.stringify(currentCampaign.value)
    )
  }

  async function syncToCloud() {
    if (!currentCampaign.value || !hasToken()) return
    syncStatus.value = 'syncing'
    syncError.value = null
    const result = await apiUpsert(currentCampaign.value)
    if (result.error) {
      syncStatus.value = 'error'
      syncError.value = result.error
    } else {
      syncStatus.value = 'synced'
    }
  }

  // Debounced: save local immediately, then sync to cloud with longer debounce
  const _saveLocal = useDebounceFn(() => {
    saveToLocalStorage()
  }, 300)

  const _syncCloud = useDebounceFn(() => {
    syncToCloud()
  }, 2000) // 2s debounce for cloud sync

  function autoSave() {
    _saveLocal()
    _syncCloud()
  }

  function saveCampaignList() {
    localStorage.setItem(`${getPrefix()}campaigns`, JSON.stringify(campaigns.value))
  }

  // ── Cloud sync: pull from server ──

  async function pullFromCloud(): Promise<boolean> {
    if (!hasToken()) return false

    syncStatus.value = 'syncing'
    const result = await apiListCampaigns()
    if (result.error || !result.data) {
      syncStatus.value = 'error'
      syncError.value = result.error
      return false
    }

    // Merge: for each cloud campaign, check if local is newer or cloud is newer
    for (const cloudSummary of result.data) {
      const localRaw = localStorage.getItem(`${getPrefix()}campaign_${cloudSummary.id}`)
      const localCampaign = localRaw ? JSON.parse(localRaw) as CampaignState : null

      if (!localCampaign) {
        // Campaign only on cloud — download it
        const full = await apiGetCampaign(cloudSummary.id)
        if (full.data) {
          migrateCampaign(full.data as unknown as Record<string, unknown>)
          localStorage.setItem(`${getPrefix()}campaign_${cloudSummary.id}`, JSON.stringify(full.data))
          // Add to campaign list if not there
          if (!campaigns.value.find((c) => c.id === cloudSummary.id)) {
            campaigns.value.push(cloudSummary)
          }
        }
      } else {
        // Both exist — use whichever is newer
        const localTime = new Date(localCampaign.lastPlayedAt ?? 0).getTime()
        const cloudTime = new Date(cloudSummary.lastPlayedAt ?? 0).getTime()

        if (cloudTime > localTime) {
          // Cloud is newer — download
          const full = await apiGetCampaign(cloudSummary.id)
          if (full.data) {
            migrateCampaign(full.data as unknown as Record<string, unknown>)
            localStorage.setItem(`${getPrefix()}campaign_${cloudSummary.id}`, JSON.stringify(full.data))
          }
        } else if (localTime > cloudTime) {
          // Local is newer — upload
          await apiUpsert(localCampaign)
        }
      }
    }

    // Push local-only campaigns to cloud
    for (const localSummary of campaigns.value) {
      const onCloud = result.data.find((c) => c.id === localSummary.id)
      if (!onCloud) {
        const localRaw = localStorage.getItem(`${getPrefix()}campaign_${localSummary.id}`)
        if (localRaw) {
          await apiUpsert(JSON.parse(localRaw))
        }
      }
    }

    saveCampaignList()

    // Reload active campaign (may have been updated from cloud)
    if (activeCampaignId.value) {
      const raw = localStorage.getItem(`${getPrefix()}campaign_${activeCampaignId.value}`)
      if (raw) {
        const parsed = JSON.parse(raw)
        migrateCampaign(parsed)
        currentCampaign.value = parsed
      }
    }

    syncStatus.value = 'synced'
    return true
  }

  // ── CRUD ──

  function createCampaign(name: string): CampaignState {
    const id = generateId()
    const campaign = createDefaultCampaign(id, name)
    campaigns.value.push({ id, name, createdAt: campaign.createdAt, lastPlayedAt: campaign.lastPlayedAt })
    saveCampaignList()
    localStorage.setItem(`${getPrefix()}campaign_${id}`, JSON.stringify(campaign))
    activeCampaignId.value = id
    localStorage.setItem(`${getPrefix()}active_campaign`, id)
    currentCampaign.value = campaign

    // Sync new campaign to cloud
    if (hasToken()) syncToCloud()

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

    // Delete from cloud too
    if (hasToken()) apiDeleteCampaign(id)

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
      data.id = generateId()
      campaigns.value.push({ id: data.id, name: data.name, createdAt: data.createdAt, lastPlayedAt: data.lastPlayedAt ?? data.createdAt })
      saveCampaignList()
      localStorage.setItem(`${getPrefix()}campaign_${data.id}`, JSON.stringify(data))
      activeCampaignId.value = data.id
      localStorage.setItem(`${getPrefix()}active_campaign`, data.id)
      currentCampaign.value = data
      if (hasToken()) syncToCloud()
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
    syncStatus,
    syncError,
    createCampaign,
    switchCampaign,
    updateCampaign,
    deleteCampaign,
    autoSave,
    exportCampaign,
    importCampaign,
    loadActiveCampaign,
    pullFromCloud,
    syncToCloud,
  }
})
