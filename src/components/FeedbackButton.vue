<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { sendFeedback, type FeedbackPayload } from '@/services/api/feedbackApi'

const authStore = useAuthStore()

const isOpen = ref(false)
const feedbackType = ref<FeedbackPayload['type']>('bug')
const message = ref('')
const email = ref('')
const isSending = ref(false)
const error = ref<string | null>(null)
const showSuccess = ref(false)

const prefillEmail = computed(() => authStore.user?.email ?? '')

function openModal() {
  isOpen.value = true
  error.value = null
  showSuccess.value = false
  feedbackType.value = 'bug'
  message.value = ''
  email.value = prefillEmail.value
}

function closeModal() {
  isOpen.value = false
}

async function handleSubmit() {
  if (!message.value.trim()) {
    error.value = 'Napiste zprávu'
    return
  }
  error.value = null
  isSending.value = true

  const payload: FeedbackPayload = {
    type: feedbackType.value,
    message: message.value.trim(),
    page: window.location.pathname,
    userAgent: navigator.userAgent,
  }
  if (email.value.trim()) {
    payload.email = email.value.trim()
  }

  const result = await sendFeedback(payload)
  isSending.value = false

  if (result.error) {
    error.value = result.error
    return
  }

  showSuccess.value = true
  setTimeout(() => {
    showSuccess.value = false
    isOpen.value = false
  }, 2000)
}
</script>

<template>
  <!-- Floating button -->
  <button
    @click="openModal"
    class="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-fh-primary text-white shadow-lg
           hover:bg-fh-primary-light transition-all duration-200 flex items-center justify-center
           hover:scale-110 active:scale-95"
    title="Zpetná vazba"
  >
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227
           1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133
           a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379
           c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228
           A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513
           C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  </button>

  <!-- Modal backdrop -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal"></div>

        <!-- Modal -->
        <div class="fh-card relative z-10 w-full max-w-md p-6 shadow-2xl border border-fh-border rounded-xl">
          <!-- Success state -->
          <div v-if="showSuccess" class="text-center py-8">
            <div class="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <svg class="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p class="text-lg font-semibold text-green-400">Odesláno, díky!</p>
          </div>

          <!-- Form state -->
          <template v-else>
            <div class="flex items-center justify-between mb-5">
              <h2 class="font-display text-lg font-bold text-fh-primary tracking-wide">Zpetná vazba</h2>
              <button @click="closeModal" class="text-gray-500 hover:text-gray-300 transition-colors">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-4">
              <div>
                <label class="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Typ</label>
                <select v-model="feedbackType" class="fh-input w-full">
                  <option value="bug">Bug</option>
                  <option value="navrh">Návrh</option>
                  <option value="jine">Jiné</option>
                </select>
              </div>

              <div>
                <label class="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">Zpráva</label>
                <textarea
                  v-model="message"
                  class="fh-input w-full min-h-[100px] resize-y"
                  placeholder="Popište problém nebo návrh..."
                  rows="4"
                ></textarea>
              </div>

              <div>
                <label class="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5 block">
                  Email <span class="text-gray-600 normal-case">(volitelné)</span>
                </label>
                <input
                  v-model="email"
                  type="email"
                  class="fh-input w-full"
                  placeholder="vas@email.cz"
                />
              </div>

              <p v-if="error" class="text-xs text-red-400">{{ error }}</p>

              <div class="flex gap-3 pt-1">
                <button type="button" @click="closeModal" class="fh-btn-ghost flex-1">
                  Zrušit
                </button>
                <button type="submit" class="fh-btn-primary flex-1" :disabled="isSending">
                  {{ isSending ? 'Odesílám...' : 'Odeslat' }}
                </button>
              </div>
            </form>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
