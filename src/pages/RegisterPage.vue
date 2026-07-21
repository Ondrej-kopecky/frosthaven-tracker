<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { register, verify, resendCode } from '@/services/api/authApi'

const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  await authStore.waitForInit()
  if (authStore.isLoggedIn) router.replace('/prehled')
})

const phase = ref<'register' | 'verify'>('register')
const email = ref('')
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const code = ref('')
const error = ref<string | null>(null)
const isLoading = ref(false)
const resendSuccess = ref(false)
const consent = ref(false)

function handleCodeInput(e: Event) {
  const input = e.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '').slice(0, 6)
  code.value = digits
  input.value = digits
}

async function handleRegister() {
  if (!email.value.trim() || !username.value.trim() || !password.value) return
  if (password.value !== confirmPassword.value) {
    error.value = 'Hesla se neshoduji'
    return
  }
  if (password.value.length < 6) {
    error.value = 'Heslo musí mít alespoň 6 znaků'
    return
  }
  error.value = null
  isLoading.value = true
  const result = await register(email.value.trim(), username.value.trim(), password.value)
  isLoading.value = false
  if (result.error) {
    error.value = result.error
  } else {
    phase.value = 'verify'
  }
}

async function handleVerify() {
  if (!code.value.trim()) return
  error.value = null
  isLoading.value = true
  const result = await verify(email.value.trim(), code.value.trim())
  if (result.error) {
    error.value = result.error
    isLoading.value = false
    return
  }
  // Auto-login after verification
  const loginErr = await authStore.login(email.value.trim(), password.value)
  isLoading.value = false
  if (loginErr) {
    error.value = loginErr
  } else {
    router.push('/kampan')
  }
}

async function handleResend() {
  const result = await resendCode(email.value.trim())
  if (result.error) {
    error.value = result.error
  } else {
    resendSuccess.value = true
    setTimeout(() => (resendSuccess.value = false), 3000)
  }
}
</script>

<template>
  <div class="max-w-sm mx-auto pt-16">
    <div class="text-center mb-10">
      <div class="w-14 h-14 rounded-2xl bg-fh-primary/10 flex items-center justify-center mx-auto mb-4">
        <svg class="w-7 h-7 text-fh-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
        </svg>
      </div>
      <h1 class="font-display text-2xl font-bold text-fh-primary tracking-wide">
        {{ phase === 'register' ? 'Registrace' : 'Overeni emailu' }}
      </h1>
      <p class="text-sm text-gray-500 mt-2">
        {{ phase === 'register' ? 'Vytvořte si účet pro cloud sync' : 'Zadejte kod z emailu' }}
      </p>
    </div>

    <!-- Phase 1: Registration form -->
    <form v-if="phase === 'register'" @submit.prevent="handleRegister" class="space-y-4">
      <div>
        <label class="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Email</label>
        <input
          v-model="email"
          type="email"
          class="fh-input w-full"
          placeholder="vas@email.cz"
          autocomplete="email"
        />
      </div>
      <div>
        <label class="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Uzivatelske jmeno</label>
        <input
          v-model="username"
          type="text"
          class="fh-input w-full"
          placeholder="username"
          autocomplete="username"
        />
      </div>
      <div>
        <label class="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Heslo</label>
        <input
          v-model="password"
          type="password"
          class="fh-input w-full"
          placeholder="min. 6 znaku"
          autocomplete="new-password"
        />
      </div>
      <div>
        <label class="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Potvrzení hesla</label>
        <input
          v-model="confirmPassword"
          type="password"
          class="fh-input w-full"
          placeholder="heslo znovu"
          autocomplete="new-password"
        />
      </div>

      <label class="flex items-start gap-2 text-xs text-gray-400 cursor-pointer">
        <input v-model="consent" type="checkbox" class="mt-0.5 accent-fh-primary" />
        <span>
          Souhlasím se zpracováním e-mailu a dat kampaní pro provoz aplikace dle
          <router-link to="/ochrana-udaju" class="text-fh-primary hover:text-fh-primary-light underline" target="_blank">zásad ochrany údajů</router-link>.
        </span>
      </label>

      <p v-if="error" class="text-xs text-fh-blocked">{{ error }}</p>

      <button
        type="submit"
        class="fh-btn-primary w-full"
        :disabled="isLoading || !consent"
      >
        {{ isLoading ? 'Registruji...' : 'Zaregistrovat' }}
      </button>
    </form>

    <!-- Phase 2: Verification code -->
    <form v-else @submit.prevent="handleVerify" class="space-y-4">
      <div class="fh-card p-4 text-center">
        <p class="text-sm text-gray-400">
          Odeslali jsme ověřovací kód na
          <span class="text-gray-200 font-medium">{{ email }}</span>
        </p>
        <p class="text-[11px] text-gray-600 mt-1">Kód platí 15 minut</p>
      </div>

      <div>
        <label class="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Ověřovací kód</label>
        <input
          :value="code"
          type="text"
          class="fh-input w-full text-center text-2xl tracking-[0.3em] font-mono"
          placeholder="000000"
          maxlength="20"
          autocomplete="one-time-code"
          @input="handleCodeInput"
        />
      </div>

      <p v-if="error" class="text-xs text-fh-blocked">{{ error }}</p>

      <button
        type="submit"
        class="fh-btn-primary w-full"
        :disabled="isLoading"
      >
        {{ isLoading ? 'Overuji...' : 'Overit' }}
      </button>

      <div class="text-center">
        <button
          type="button"
          class="text-xs text-gray-500 hover:text-fh-primary transition-colors"
          @click="handleResend"
        >
          Odeslat kód znovu
        </button>
        <p v-if="resendSuccess" class="text-xs text-fh-completed mt-1">Kód odeslán!</p>
      </div>
    </form>

    <p class="text-center text-sm text-gray-500 mt-6">
      Máte účet?
      <router-link to="/prihlaseni" class="text-fh-primary hover:text-fh-primary-light transition-colors">
        Přihlaste se
      </router-link>
    </p>

    <p class="text-center mt-4">
      <router-link to="/kampan" class="text-xs text-gray-600 hover:text-gray-400 transition-colors">
        Pokracovat bez registrace
      </router-link>
    </p>
  </div>
</template>
