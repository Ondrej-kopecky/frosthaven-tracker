<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  /** Tailwind max-width třída obsahu, např. 'max-w-lg' */
  maxWidth?: string
}>(), {
  maxWidth: 'max-w-lg',
})

const emit = defineEmits<{ close: [] }>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      window.addEventListener('keydown', onKeydown)
      document.body.style.overflow = 'hidden'
    } else {
      window.removeEventListener('keydown', onKeydown)
      document.body.style.overflow = ''
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4"
        @click.self="emit('close')"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />
        <div
          class="modal-panel relative w-full fh-card border-fh-border-light rounded-b-none rounded-t-2xl sm:rounded-2xl max-h-[90dvh] flex flex-col shadow-2xl shadow-black/60"
          :class="maxWidth"
        >
          <div v-if="title || $slots.header" class="flex items-center justify-between gap-3 px-5 pt-5 pb-3 shrink-0">
            <slot name="header">
              <h2 class="font-display text-lg font-bold text-fh-frost tracking-wide">{{ title }}</h2>
            </slot>
            <button
              class="w-9 h-9 -mr-2 -mt-1 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors shrink-0"
              aria-label="Zavřít"
              @click="emit('close')"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="px-5 pb-5 overflow-y-auto">
            <slot />
          </div>
          <div v-if="$slots.footer" class="px-5 py-4 border-t border-fh-border/40 shrink-0">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  transform: translateY(24px) scale(0.97);
  opacity: 0;
}
</style>
