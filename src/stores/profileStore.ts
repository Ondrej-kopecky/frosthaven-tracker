import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateId } from '@/utils/uuid'

export interface ProfileState {
  id: string
  name: string
  createdAt: string
}

const PROFILES_KEY = 'fh_tracker_profiles'
const ACTIVE_KEY = 'fh_tracker_active_profile'
const DEFAULT_PROFILE_ID = 'default'

function loadProfiles(): ProfileState[] {
  const raw = localStorage.getItem(PROFILES_KEY)
  if (!raw) return []
  return JSON.parse(raw) as ProfileState[]
}

function saveProfiles(profiles: ProfileState[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
}

export const useProfileStore = defineStore('profile', () => {
  const profiles = ref<ProfileState[]>([])
  const activeProfileId = ref<string>(DEFAULT_PROFILE_ID)

  const activeProfile = computed(() =>
    profiles.value.find((p) => p.id === activeProfileId.value) ?? null
  )

  function init() {
    profiles.value = loadProfiles()

    if (profiles.value.length === 0) {
      const defaultProfile: ProfileState = {
        id: DEFAULT_PROFILE_ID,
        name: 'Hráč',
        createdAt: new Date().toISOString(),
      }
      profiles.value = [defaultProfile]
      saveProfiles(profiles.value)
      migrateExistingData()
    }

    const savedActive = localStorage.getItem(ACTIVE_KEY)
    if (savedActive && profiles.value.some((p) => p.id === savedActive)) {
      activeProfileId.value = savedActive
    } else {
      activeProfileId.value = profiles.value[0].id
    }
    localStorage.setItem(ACTIVE_KEY, activeProfileId.value)
  }

  function migrateExistingData() {
    // Migrate pre-profile data (fh_tracker_campaigns) to default profile namespace
    const oldIndex = localStorage.getItem('fh_tracker_campaigns')
    if (!oldIndex) return

    localStorage.setItem(`fh_tracker_${DEFAULT_PROFILE_ID}_campaigns`, oldIndex)

    const campaigns = JSON.parse(oldIndex) as { id: string }[]
    for (const c of campaigns) {
      const data = localStorage.getItem(`fh_tracker_campaign_${c.id}`)
      if (data) {
        localStorage.setItem(`fh_tracker_${DEFAULT_PROFILE_ID}_campaign_${c.id}`, data)
      }
    }

    // Clean old keys
    localStorage.removeItem('fh_tracker_campaigns')
    localStorage.removeItem('fh_tracker_active_campaign')
    for (const c of campaigns) {
      localStorage.removeItem(`fh_tracker_campaign_${c.id}`)
    }
  }

  function getStoragePrefix(): string {
    return `fh_tracker_${activeProfileId.value}_`
  }

  function createProfile(name: string): ProfileState {
    const profile: ProfileState = {
      id: generateId(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    }
    profiles.value.push(profile)
    saveProfiles(profiles.value)
    return profile
  }

  function switchProfile(id: string) {
    if (!profiles.value.some((p) => p.id === id)) return
    activeProfileId.value = id
    localStorage.setItem(ACTIVE_KEY, id)
  }

  function renameProfile(name: string) {
    const profile = profiles.value.find((p) => p.id === activeProfileId.value)
    if (!profile) return
    profile.name = name.trim()
    saveProfiles(profiles.value)
  }

  function deleteProfile(id: string): boolean {
    if (profiles.value.length <= 1) return false
    const idx = profiles.value.findIndex((p) => p.id === id)
    if (idx < 0) return false

    const prefix = `fh_tracker_${id}_`
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) keysToRemove.push(key)
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))

    profiles.value.splice(idx, 1)
    saveProfiles(profiles.value)

    if (activeProfileId.value === id) {
      switchProfile(profiles.value[0].id)
    }
    return true
  }

  return {
    profiles,
    activeProfileId,
    activeProfile,
    init,
    getStoragePrefix,
    createProfile,
    switchProfile,
    renameProfile,
    deleteProfile,
  }
})
