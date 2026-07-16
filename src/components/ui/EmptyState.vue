<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description?: string
  /** Cesta SVG ikony (24×24 stroke). Výchozí: sněhová vločka. */
  iconPath?: string
}>(), {
  iconPath: 'M12 2v20M4.5 5.5l15 13M19.5 5.5l-15 13M6 12h12M8 4.5l4 3 4-3M8 19.5l4-3 4 3',
})
</script>

<template>
  <div class="text-center py-14 px-4">
    <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-fh-primary/[0.06] border border-fh-border flex items-center justify-center">
      <slot name="icon">
        <svg class="w-8 h-8 text-fh-primary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" :d="iconPath" />
        </svg>
      </slot>
    </div>
    <h3 class="font-display text-lg font-semibold text-gray-300">{{ title }}</h3>
    <p v-if="description" class="text-sm text-gray-500 mt-1.5 max-w-sm mx-auto leading-relaxed">{{ description }}</p>
    <div v-if="$slots.action" class="mt-5">
      <slot name="action" />
    </div>
  </div>
</template>
