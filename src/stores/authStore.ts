import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { setToken, clearToken, hasToken } from '@/services/api/apiClient'
import { login as apiLogin, getMe, type AuthUser } from '@/services/api/authApi'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const isLoading = ref(false)

  const isLoggedIn = computed(() => !!user.value)
  const isVerified = computed(() => user.value?.is_verified ?? false)

  async function init() {
    if (!hasToken()) return
    isLoading.value = true
    const result = await getMe()
    if (result.data) {
      user.value = result.data
    } else {
      clearToken()
    }
    isLoading.value = false
  }

  async function login(email: string, password: string): Promise<string | null> {
    const result = await apiLogin(email, password)
    if (result.error) return result.error
    if (result.data) {
      setToken(result.data.access_token)
      const me = await getMe()
      if (me.data) user.value = me.data
      return null
    }
    return 'Neznama chyba'
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
    init,
    login,
    logout,
  }
})
