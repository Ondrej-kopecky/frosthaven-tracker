<script setup lang="ts">
const props = withDefaults(defineProps<{
  classId: string
  size?: number
  color?: string
}>(), {
  size: 24,
  color: 'currentColor',
})

// Import all FH class SVGs (Vite 8: use query + import instead of 'as')
const svgModules = import.meta.glob('@/assets/characters/*.svg', { query: '?raw', import: 'default', eager: true })

function getSvg(): string {
  for (const [path, content] of Object.entries(svgModules)) {
    if (path.endsWith(`/${props.classId.toUpperCase()}.svg`)) {
      return content as string
    }
  }
  return ''
}
</script>

<template>
  <span
    class="inline-flex items-center justify-center shrink-0"
    :style="{ width: size + 'px', height: size + 'px', color }"
    v-html="getSvg()"
  ></span>
</template>

<style scoped>
span :deep(svg) {
  width: 100%;
  height: 100%;
  fill: currentColor;
}
</style>
