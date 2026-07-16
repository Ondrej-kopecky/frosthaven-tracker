<script setup lang="ts">
import BaseModal from './BaseModal.vue'

withDefaults(defineProps<{
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Červené potvrzovací tlačítko pro destruktivní akce */
  danger?: boolean
}>(), {
  confirmLabel: 'Potvrdit',
  cancelLabel: 'Zrušit',
  danger: false,
})

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <BaseModal :open="open" :title="title" max-width="max-w-sm" @close="emit('cancel')">
    <p v-if="message" class="text-sm text-gray-400 leading-relaxed">{{ message }}</p>
    <slot />
    <template #footer>
      <div class="flex gap-3 justify-end">
        <button class="fh-btn-ghost text-sm" @click="emit('cancel')">{{ cancelLabel }}</button>
        <button
          class="text-sm font-semibold rounded-[0.625rem] px-4 py-2 transition-all"
          :class="danger
            ? 'bg-gradient-to-br from-red-600 to-red-800 text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]'
            : 'fh-btn-primary'"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>
