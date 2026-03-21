import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { setToken, clearToken, hasToken } from '@/services/api/apiClient'
import { login as apiLogin, getMe, type AuthUser } from '@/services/api/authApi'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)
  let _initPromise: Promise<void> | null = null

  const isLoggedIn = computed(() => !!user.value)
  const isVerified = computed(() => user.value?.is_verified ?? false)

  async function init() {
    if (_initPromise) return _initPromise
    _initPromise = _doInit()
    return _initPromise
  }

  async function _doInit() {
    if (!hasToken()) {
      isInitialized.value = true
      return
    }
    isLoading.value = true
    const result = await getMe()
    if (result.data) {
      user.value = result.data
    } else {
      clearToken()
    }
    isLoading.value = false
    isInitialized.value = true
  }

  /** Wait until init() has completed (useful for pages that need auth state) */
  async function waitForInit() {
    if (isInitialized.value) return
    if (_initPromise) await _initPromise
  }

  async function login(email: string, password: string): Promise<string | null> {
    const result = await apiLogin(email, password)
    if (result.error) return result.error
    if (result.data) {
      setToken(result.data.access_token)
      const me = await getMe()
      if (me.data) {
        user.value = me.data
        // Auto-sync campaigns from cloud after login
        try {
          const { useCampaignStore } = await import('./campaignStore')
          const campaignStore = useCampaignStore()
          campaignStore.pullFromCloud()
        } catch { /* ignore sync errors on login */ }
      }
      return null
    }
    return 'Neznámá chyba'
  }

  function logout() {
    clearToken()
    user.value = null
  }

  return {
    user,
    isLoading,
    isLoggedIn,
    isVerified,
    isInitialized,
    init,
    waitForInit,
    login,
    logout,
  }
})
