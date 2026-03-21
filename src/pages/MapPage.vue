<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaignStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { SCENARIO_STATUSES } from '@/models/types'
import panzoom from 'panzoom'
import type { PanZoom } from 'panzoom'

const router = useRouter()
const campaignStore = useCampaignStore()
const scenarioStore = useScenarioStore()

const mapContainer = ref<HTMLElement | null>(null)
const mapElement = ref<HTMLElement | null>(null)
let pz: PanZoom | null = null

const selectedId = ref<number | null>(null)

// FH map dimensions (portrait)
const MAP_WIDTH = 2500
const MAP_HEIGHT = 3179

// Sticker scale (adjust from reference)
const STICKER_SCALE = 0.75

onMounted(async () => {
  if (!campaignStore.hasCampaign) {
    router.push('/kampan')
    return
  }
  await scenarioStore.loadScenarioData()
  await nextTick()
  initPanzoom()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  pz?.dispose()
  pz = null
  window.removeEventListener('resize', handleResize)
})

function initPanzoom() {
  if (!mapElement.value) return
  const minZoom = getMinZoom()
  pz = panzoom(mapElement.value, {
    minZoom,
    maxZoom: 4,
    bounds: true,
    boundsPadding: 0.1,
  })
  centerMap()
}

function getMinZoom(): number {
  if (!mapContainer.value) return 0.2
  // For portrait map, fit width
  return mapContainer.value.clientWidth / MAP_WIDTH
}

function centerMap() {
  if (!pz || !mapContainer.value) return
  const scale = getMinZoom()
  const mapWidth = MAP_WIDTH * scale
  const x = (mapContainer.value.clientWidth - mapWidth) / 2
  pz.zoomTo(0, 0, scale)
  pz.moveTo(x, 0)
}

function handleResize() {
  if (!pz) return
  // Only update min zoom constraint, don't reset user's current view
  pz.setMinZoom(getMinZoom())
}

// Re-init when campaign changes
watch(() => campaignStore.activeCampaignId, async () => {
  await scenarioStore.loadScenarioData()
  selectedId.value = null
})

// Visible: completed, available, attempted, blocked, required — NOT locked
const visibleScenarios = computed(() =>
  scenarioStore.allScenarios.filter((s) => {
    return (
      s.coordinates.x > 0 &&
      s.coordinates.y > 0 &&
      s.computedStatus !== SCENARIO_STATUSES.LOCKED
    )
  })
)

const selectedScenario = computed(() => {
  if (selectedId.value === null) return null
  return scenarioStore.allScenarios.find((s) => s.id === selectedId.value) ?? null
})

function stickerSrc(id: number, status: string): string {
  const suffix = status === SCENARIO_STATUSES.COMPLETED ? '_c' : ''
  return `/img/stickers/${id}${suffix}.png?v=1`
}

function statusGlow(status: string): string {
  switch (status) {
    case SCENARIO_STATUSES.COMPLETED: return 'drop-shadow(0 0 6px rgba(34,197,94,0.6))'
    case SCENARIO_STATUSES.AVAILABLE: return 'drop-shadow(0 0 6px rgba(91,164,207,0.5))'
    case SCENARIO_STATUSES.ATTEMPTED: return 'drop-shadow(0 0 6px rgba(245,158,11,0.5))'
    case SCENARIO_STATUSES.BLOCKED: return 'drop-shadow(0 0 6px rgba(239,68,68,0.5))'
    case SCENARIO_STATUSES.REQUIRED: return 'drop-shadow(0 0 6px rgba(168,85,247,0.5))'
    default: return ''
  }
}

function markerColor(status: string): string {
  switch (status) {
    case SCENARIO_STATUSES.COMPLETED: return '#22c55e'
    case SCENARIO_STATUSES.AVAILABLE: return '#5ba4cf'
    case SCENARIO_STATUSES.ATTEMPTED: return '#f59e0b'
    case SCENARIO_STATUSES.BLOCKED: return '#ef4444'
    case SCENARIO_STATUSES.REQUIRED: return '#a855f7'
    default: return '#6b7280'
  }
}

const statusLabels: Record<string, string> = {
  [SCENARIO_STATUSES.COMPLETED]: 'Dokončeno',
  [SCENARIO_STATUSES.AVAILABLE]: 'Dostupné',
  [SCENARIO_STATUSES.ATTEMPTED]: 'Pokus',
  [SCENARIO_STATUSES.BLOCKED]: 'Blokováno',
  [SCENARIO_STATUSES.REQUIRED]: 'Vyžadováno',
  [SCENARIO_STATUSES.LOCKED]: 'Zamčeno',
}

function onMarkerClick(id: number) {
  selectedId.value = selectedId.value === id ? null : id
}

function goToScenarios(id: number) {
  router.push({ path: '/scenare', query: { open: String(id) } })
}
</script>

<template>
  <div
    v-if="campaignStore.hasCampaign"
    ref="mapContainer"
    class="relative w-full overflow-hidden bg-fh-dark map-height"
    @click="selectedId = null"
  >
    <!-- Pan-zoom map -->
    <div
      ref="mapElement"
      class="relative"
      :style="{ width: MAP_WIDTH + 'px', height: MAP_HEIGHT + 'px' }"
    >
      <!-- Map image -->
      <img
        src="/img/maps/fh-map.webp"
        alt="Mapa Frosthavenu"
        class="absolute left-0 top-0 pointer-events-none select-none"
        draggable="false"
        :style="{ width: '100%', height: '100%' }"
      />

      <!-- Scenario stickers -->
      <img
        v-for="s in visibleScenarios"
        :key="s.id"
        :src="stickerSrc(s.id, s.computedStatus)"
        :alt="s.name"
        class="absolute cursor-pointer transition-transform duration-150 hover:scale-110"
        :style="{
          left: s.coordinates.x + '%',
          top: s.coordinates.y + '%',
          transform: 'scale(' + STICKER_SCALE + ')',
          filter: statusGlow(s.computedStatus),
          zIndex: selectedId === s.id ? 30 : 10,
        }"
        @click.stop="onMarkerClick(s.id)"
        @touchend.stop.prevent="onMarkerClick(s.id)"
      />
    </div>

    <!-- Tooltip popup -->
    <Teleport to="body">
      <transition name="popup">
        <div
          v-if="selectedScenario"
          class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[min(360px,calc(100vw-2rem))]"
          @click.stop
        >
          <div class="fh-card p-4 relative overflow-hidden shadow-2xl border border-white/[0.08]">
            <!-- Status accent -->
            <div
              class="absolute left-0 top-0 bottom-0 w-[3px]"
              :style="{ backgroundColor: markerColor(selectedScenario.computedStatus) }"
            />

            <!-- Header -->
            <div class="flex items-start justify-between gap-3 mb-2">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-display text-fh-primary text-lg font-bold">#{{ selectedScenario.id }}</span>
                  <span
                    class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    :style="{
                      backgroundColor: markerColor(selectedScenario.computedStatus) + '20',
                      color: markerColor(selectedScenario.computedStatus),
                    }"
                  >
                    {{ statusLabels[selectedScenario.computedStatus] ?? selectedScenario.computedStatus }}
                  </span>
                </div>
                <h3 class="text-sm font-semibold text-gray-200">{{ selectedScenario.name }}</h3>
                <span class="text-[11px] text-gray-500">{{ selectedScenario.coordinates.name }}</span>
              </div>
              <button
                class="p-1 text-gray-600 hover:text-gray-300 transition-colors shrink-0"
                @click="selectedId = null"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Info badges -->
            <div class="flex flex-wrap gap-1.5 mb-3">
              <span v-if="selectedScenario.has_boss" class="text-[10px] text-red-400 bg-red-900/20 px-2 py-0.5 rounded border border-red-800/30">boss</span>
              <span class="text-[10px] text-gray-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">kapitola {{ selectedScenario.chapter_id }}</span>
              <span class="text-[10px] text-gray-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">obtížnost {{ selectedScenario.complexity }}</span>
            </div>

            <!-- Action -->
            <button
              class="w-full text-xs text-fh-primary hover:text-fh-frost py-2 rounded-lg bg-fh-primary/10 hover:bg-fh-primary/15 transition-all font-medium"
              @click="goToScenarios(selectedScenario?.id ?? 0)"
            >
              Zobrazit detail
            </button>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Legend -->
    <div class="absolute top-3 right-3 bg-fh-dark/90 backdrop-blur-sm rounded-xl p-3 border border-white/[0.06] z-20">
      <div class="text-[9px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Legenda</div>
      <div class="space-y-1.5">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-green-500" />
          <span class="text-[10px] text-gray-400">Dokončeno</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-fh-primary" />
          <span class="text-[10px] text-gray-400">Dostupné</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-orange-500" />
          <span class="text-[10px] text-gray-400">Pokus</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-red-500" />
          <span class="text-[10px] text-gray-400">Blokováno</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-height {
  height: calc(100dvh - 4rem);
}

.popup-enter-active,
.popup-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}
</style>
