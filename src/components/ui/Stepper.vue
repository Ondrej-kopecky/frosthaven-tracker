<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: number
  min?: number
  max?: number
  step?: number
  label?: string
  /** Kompaktní varianta (menší, pro husté seznamy) */
  small?: boolean
}>(), {
  min: 0,
  max: Infinity,
  step: 1,
})

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const canDec = computed(() => props.modelValue - props.step >= props.min)
const canInc = computed(() => props.modelValue + props.step <= props.max)

function set(value: number) {
  emit('update:modelValue', Math.min(props.max, Math.max(props.min, value)))
}

// Podržení tlačítka opakuje krok (po 400 ms, pak každých 90 ms)
let holdTimeout: ReturnType<typeof setTimeout> | null = null
let holdInterval: ReturnType<typeof setInterval> | null = null
let holdValue = 0

function startHold(dir: 1 | -1) {
  holdValue = props.modelValue + dir * props.step
  set(holdValue)
  holdTimeout = setTimeout(() => {
    holdInterval = setInterval(() => {
      holdValue += dir * props.step
      if (holdValue < props.min || holdValue > props.max) {
        stopHold()
        return
      }
      set(holdValue)
    }, 90)
  }, 400)
}

function stopHold() {
  if (holdTimeout) clearTimeout(holdTimeout)
  if (holdInterval) clearInterval(holdInterval)
  holdTimeout = null
  holdInterval = null
}

onBeforeUnmount(stopHold)
</script>

<template>
  <div class="inline-flex flex-col items-center gap-1">
    <span v-if="label" class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{{ label }}</span>
    <div
      class="inline-flex items-center rounded-xl border border-fh-border bg-black/25 overflow-hidden"
      :class="small ? 'h-9' : 'h-11'"
    >
      <button
        class="h-full flex items-center justify-center text-lg font-bold transition-colors select-none touch-none disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-fh-primary hover:bg-fh-primary/10 active:bg-fh-primary/20"
        :class="small ? 'w-9' : 'w-11'"
        :disabled="!canDec"
        aria-label="Snížit"
        @pointerdown="startHold(-1)"
        @pointerup="stopHold"
        @pointerleave="stopHold"
        @pointercancel="stopHold"
        @contextmenu.prevent
      >
        −
      </button>
      <span
        class="text-center font-display font-bold text-gray-100 tabular-nums select-none"
        :class="small ? 'min-w-9 text-sm px-1' : 'min-w-11 text-base px-1.5'"
      >
        {{ modelValue }}
      </span>
      <button
        class="h-full flex items-center justify-center text-lg font-bold transition-colors select-none touch-none disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-fh-primary hover:bg-fh-primary/10 active:bg-fh-primary/20"
        :class="small ? 'w-9' : 'w-11'"
        :disabled="!canInc"
        aria-label="Zvýšit"
        @pointerdown="startHold(1)"
        @pointerup="stopHold"
        @pointerleave="stopHold"
        @pointercancel="stopHold"
        @contextmenu.prevent
      >
        +
      </button>
    </div>
  </div>
</template>
