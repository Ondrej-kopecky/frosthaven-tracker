<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import panzoom from 'panzoom'
import type { PanZoom } from 'panzoom'
import { useCampaignStore } from '@/stores/campaignStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useFlowchartStore, type StatusFilter } from '@/stores/flowchartStore'
import { SCENARIO_STATUSES } from '@/models/types'

const router = useRouter()
const campaignStore = useCampaignStore()
const scenarioStore = useScenarioStore()
const flowchartStore = useFlowchartStore()

const svgContainer = ref<HTMLDivElement | null>(null)
let pzInstance: PanZoom | null = null
let svgElement: SVGSVGElement | null = null

onMounted(async () => {
  if (!campaignStore.hasCampaign) {
    router.push('/kampan')
    return
  }
  document.body.style.overflow = 'hidden'
  await scenarioStore.loadScenarioData()
  await loadSvg()
})

onUnmounted(() => {
  document.body.style.overflow = ''
  pzInstance?.dispose()
})

// Load SVG inline and set up interactivity
async function loadSvg() {
  if (!svgContainer.value) return
  try {
    const resp = await fetch('/img/fh-storyline.svg')
    const text = await resp.text()
    svgContainer.value.innerHTML = text
    svgElement = svgContainer.value.querySelector('svg')
    if (!svgElement) return

    // Remove all embedded SVG styles (we provide our own via CSS)
    const styleEl = svgElement.querySelector('style')
    if (styleEl) styleEl.remove()

    // Attach click handlers
    svgElement.querySelectorAll('.scenario').forEach((node) => {
      node.addEventListener('click', (e) => {
        e.stopPropagation()
        const id = parseInt(node.id.replace('node', ''))
        if (!isNaN(id)) onNodeClick(id)
      })
    })

    await nextTick()
    applyStates()
    initPanZoom()
  } catch (e) {
    console.error('Failed to load storyline SVG', e)
  }
}

// Apply scenario states to SVG nodes
function applyStates() {
  if (!svgElement) return
  const statuses = scenarioStore.computedStatuses
  const { filterStatus } = flowchartStore

  // First: show all edges and nodes
  svgElement.querySelectorAll('.edge').forEach((e) => {
    ;(e as SVGGElement).style.display = ''
    ;(e as SVGGElement).style.opacity = ''
  })

  svgElement.querySelectorAll('.scenario').forEach((node) => {
    const el = node as SVGGElement
    const id = parseInt(el.id.replace('node', ''))
    const status = statuses[id] ?? 'locked'

    // Remove old state classes
    el.classList.remove('incomplete', 'complete', 'blocked', 'required', 'dimmed')
    el.style.display = ''
    el.style.opacity = ''

    // Filter: hide non-matching
    if (filterStatus !== 'all' && status !== filterStatus) {
      el.style.display = 'none'
      hideEdgesFor(id)
      return
    }

    // Apply state class
    switch (status) {
      case SCENARIO_STATUSES.COMPLETED:
        el.classList.add('complete')
        break
      case SCENARIO_STATUSES.AVAILABLE:
      case SCENARIO_STATUSES.ATTEMPTED:
        el.classList.add('incomplete')
        break
      case SCENARIO_STATUSES.BLOCKED:
        el.classList.add('blocked')
        break
      case SCENARIO_STATUSES.REQUIRED:
        el.classList.add('required')
        break
      default:
        // locked — show dimmed, not hidden
        el.classList.add('dimmed')
        break
    }

    // Show/hide status indicator icons based on SVG's own class names
    el.querySelectorAll('text.blocked').forEach((icon) => {
      ;(icon as SVGElement).style.display = (status === SCENARIO_STATUSES.BLOCKED || status === SCENARIO_STATUSES.LOCKED) ? '' : 'none'
    })
    el.querySelectorAll('text.required').forEach((icon) => {
      ;(icon as SVGElement).style.display = status === SCENARIO_STATUSES.REQUIRED ? '' : 'none'
    })
  })

  // Handle edge visibility for filter mode
  if (filterStatus !== 'all') {
    svgElement.querySelectorAll('.edge').forEach((edge) => {
      const edgeEl = edge as SVGGElement
      const match = edgeEl.id.match(/edge(\d+)-(\d+)/)
      if (!match) return
      const fromId = parseInt(match[1])
      const toId = parseInt(match[2])
      const fromStatus = statuses[fromId] ?? 'locked'
      const toStatus = statuses[toId] ?? 'locked'
      edgeEl.style.display = (fromStatus === filterStatus && toStatus === filterStatus) ? '' : 'none'
    })
  }

  // Show chapters
  svgElement.querySelectorAll('.chapter').forEach((ch) => {
    (ch as SVGGElement).style.display = ''
  })
}

function hideEdgesFor(id: number) {
  if (!svgElement) return
  svgElement.querySelectorAll(`.edge`).forEach((edge) => {
    const match = edge.id.match(/edge(\d+)-(\d+)/)
    if (!match) return
    if (parseInt(match[1]) === id || parseInt(match[2]) === id) {
      ;(edge as SVGGElement).style.display = 'none'
    }
  })
}


function initPanZoom() {
  if (!svgElement || !svgContainer.value) return
  pzInstance = panzoom(svgElement, {
    minZoom: 0.3,
    maxZoom: 5,
    bounds: true,
    boundsPadding: 0.1,
    smoothScroll: false,
  })
  fitView()
}

function fitView() {
  if (!pzInstance || !svgElement || !svgContainer.value) return
  const container = svgContainer.value
  const svgW = 678
  const svgH = 651
  const cW = container.clientWidth
  const cH = container.clientHeight
  // Scale to fit with padding
  const scale = Math.min(cW / svgW, cH / svgH) * 0.9
  const x = (cW - svgW * scale) / 2
  const y = (cH - svgH * scale) / 2
  pzInstance.zoomAbs(0, 0, scale)
  pzInstance.moveTo(x, y)
}

function onNodeClick(id: number) {
  flowchartStore.selectNode(flowchartStore.selectedNodeId === id ? null : id)
}

function closeDetail() {
  flowchartStore.selectNode(null)
}

// Re-apply states when data changes
watch(() => [scenarioStore.computedStatuses, flowchartStore.filterStatus, campaignStore.currentCampaign?.hideSpoilers], () => {
  applyStates()
}, { deep: true })

// Selected scenario detail
const selectedScenario = computed(() => {
  if (!flowchartStore.selectedNodeId) return null
  return scenarioStore.allScenarios.find((s) => s.id === flowchartStore.selectedNodeId) ?? null
})

function statusColor(status: string): string {
  switch (status) {
    case SCENARIO_STATUSES.COMPLETED: return '#3B8585'
    case SCENARIO_STATUSES.AVAILABLE: return '#3B8585'
    case SCENARIO_STATUSES.BLOCKED: return '#A13C2F'
    case SCENARIO_STATUSES.REQUIRED: return '#E9A678'
    case SCENARIO_STATUSES.ATTEMPTED: return '#f97316'
    default: return '#5a6577'
  }
}

function statusBg(status: string): string {
  switch (status) {
    case SCENARIO_STATUSES.COMPLETED: return 'rgba(59,133,133,0.15)'
    case SCENARIO_STATUSES.AVAILABLE: return 'rgba(59,133,133,0.15)'
    case SCENARIO_STATUSES.BLOCKED: return 'rgba(161,60,47,0.15)'
    case SCENARIO_STATUSES.REQUIRED: return 'rgba(233,166,120,0.15)'
    case SCENARIO_STATUSES.ATTEMPTED: return 'rgba(249,115,22,0.15)'
    default: return 'rgba(90,101,119,0.12)'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case SCENARIO_STATUSES.COMPLETED: return 'Dokončeno'
    case SCENARIO_STATUSES.AVAILABLE: return 'Dostupné'
    case SCENARIO_STATUSES.BLOCKED: return 'Blokováno'
    case SCENARIO_STATUSES.REQUIRED: return 'Vyžadováno'
    case SCENARIO_STATUSES.ATTEMPTED: return 'Pokus'
    case SCENARIO_STATUSES.LOCKED: return 'Zamčeno'
    default: return status
  }
}

const statusFilters: { label: string; value: StatusFilter }[] = [
  { label: 'Vše', value: 'all' },
  { label: 'Dostupné', value: SCENARIO_STATUSES.AVAILABLE },
  { label: 'Dokončené', value: SCENARIO_STATUSES.COMPLETED },
  { label: 'Zamčené', value: SCENARIO_STATUSES.LOCKED },
  { label: 'Blokované', value: SCENARIO_STATUSES.BLOCKED },
]

const legendItems = [
  { label: 'Dostupné', color: '#3B8585' },
  { label: 'Dokončeno', color: '#3B8585', filled: true },
  { label: 'Zamčeno', color: '#A13C2F' },
  { label: 'Vyžadováno', color: '#E9A678' },
]
</script>

<template>
  <div v-if="campaignStore.hasCampaign" class="fixed inset-0 top-14 z-40 flex flex-col bg-fh-dark">
    <!-- Toolbar -->
    <div class="px-2 py-1.5 border-b border-fh-border bg-fh-dark shrink-0">
      <div class="flex flex-wrap items-center gap-2">
        <!-- Status filter -->
        <div class="flex gap-0.5 bg-black/30 rounded-lg p-0.5 border border-fh-border shrink-0">
          <button
            v-for="f in statusFilters"
            :key="f.value"
            class="px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200"
            :class="flowchartStore.filterStatus === f.value
              ? 'bg-white/10 text-gray-200 shadow-sm'
              : 'text-gray-500 hover:text-gray-300'"
            @click="flowchartStore.setFilter(f.value)"
          >
            {{ f.label }}
          </button>
        </div>

        <button
          class="px-2.5 py-1 bg-black/30 border border-fh-border rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-all"
          @click="fitView"
        >
          Reset
        </button>

        <!-- Legend -->
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400 ml-auto">
          <div v-for="item in legendItems" :key="item.label" class="flex items-center gap-1.5">
            <span
              class="w-3 h-3 rounded-full border-2"
              :style="{
                borderColor: item.color,
                backgroundColor: item.filled ? item.color : 'transparent',
              }"
            />
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="flex-1 flex relative overflow-hidden">
      <!-- SVG container -->
      <div
        ref="svgContainer"
        class="flex-1 overflow-hidden storyline-container"
        @click="flowchartStore.selectNode(null)"
      />

      <!-- Detail panel (desktop) -->
      <transition
        enter-active-class="transition-all duration-200"
        leave-active-class="transition-all duration-200"
        enter-from-class="translate-x-full"
        leave-to-class="translate-x-full"
      >
        <div
          v-if="selectedScenario"
          class="absolute right-0 top-0 bottom-0 z-10 p-2 hidden lg:block w-80"
        >
          <div class="fh-card p-4 h-full overflow-y-auto">
            <div class="flex items-start justify-between mb-3">
              <div>
                <span class="font-display font-bold text-sm" :style="{ color: statusColor(selectedScenario.computedStatus) }">#{{ selectedScenario.id }}</span>
                <h3 class="font-display text-lg font-semibold text-gray-200">{{ selectedScenario.name }}</h3>
                <p v-if="selectedScenario.coordinates?.name" class="text-xs text-gray-500 mt-0.5">{{ selectedScenario.coordinates.name }}</p>
              </div>
              <button class="text-gray-500 hover:text-gray-300 p-1" @click="closeDetail">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Status -->
            <div class="mb-3">
              <span
                class="fh-badge"
                :style="{ backgroundColor: statusBg(selectedScenario.computedStatus), color: statusColor(selectedScenario.computedStatus), border: '1px solid ' + statusColor(selectedScenario.computedStatus) + '40' }"
              >
                {{ statusLabel(selectedScenario.computedStatus) }}
              </span>
            </div>

            <!-- Prompt -->
            <p v-if="selectedScenario.prompt" class="text-sm text-gray-400 italic leading-relaxed p-3 rounded-lg bg-white/[0.02] border-l-2 border-fh-primary/30 mb-3">
              {{ selectedScenario.prompt }}
            </p>

            <!-- Links -->
            <div v-if="selectedScenario.links_to.length" class="mb-3">
              <p class="text-xs text-gray-500 font-medium mb-1.5">Odemyká:</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="linkId in selectedScenario.links_to"
                  :key="linkId"
                  class="px-2 py-0.5 text-xs rounded-md bg-fh-primary/10 text-fh-primary border border-fh-primary/20 hover:bg-fh-primary/20 transition-colors"
                  @click="onNodeClick(linkId)"
                >
                  #{{ linkId }}
                </button>
              </div>
            </div>

            <!-- Linked from -->
            <div v-if="selectedScenario.linked_from.length" class="mb-3">
              <p class="text-xs text-gray-500 font-medium mb-1.5">Odemčen z:</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="linkId in selectedScenario.linked_from"
                  :key="linkId"
                  class="px-2 py-0.5 text-xs rounded-md bg-white/5 text-gray-400 border border-fh-border hover:bg-white/10 transition-colors"
                  @click="onNodeClick(linkId)"
                >
                  #{{ linkId }}
                </button>
              </div>
            </div>

            <!-- Achievements -->
            <div v-if="selectedScenario.achievements_awarded?.length" class="mb-3">
              <p class="text-xs text-gray-500 font-medium mb-1.5">Uděluje úspěchy:</p>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="ach in selectedScenario.achievements_awarded"
                  :key="ach"
                  class="px-2 py-0.5 text-[11px] rounded-full bg-green-900/15 text-green-400/80 border border-green-800/20"
                >
                  {{ ach }}
                </span>
              </div>
            </div>

            <!-- Go to scenarios page -->
            <router-link
              :to="`/scenare?open=${selectedScenario.id}`"
              class="mt-4 block text-center text-xs text-fh-primary hover:text-fh-primary-light no-underline fh-btn-secondary py-2"
            >
              Otevřít ve Scénářích
            </router-link>
          </div>
        </div>
      </transition>
    </div>

    <!-- Mobile detail: bottom sheet -->
    <Teleport to="body">
      <transition name="sheet">
        <div
          v-if="selectedScenario"
          class="fixed inset-0 z-50 flex flex-col lg:hidden"
        >
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeDetail" />
          <div class="relative flex-1 flex flex-col mt-20 bg-fh-card rounded-t-2xl border-t border-fh-border overflow-hidden safe-area-bottom">
            <div class="flex justify-center pt-3 pb-1 shrink-0" @click="closeDetail">
              <div class="w-10 h-1 rounded-full bg-white/20"></div>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <span class="font-display font-bold text-sm" :style="{ color: statusColor(selectedScenario.computedStatus) }">#{{ selectedScenario.id }}</span>
                  <h3 class="font-display text-lg font-semibold text-gray-200">{{ selectedScenario.name }}</h3>
                </div>
                <span
                  class="fh-badge shrink-0"
                  :style="{ backgroundColor: statusBg(selectedScenario.computedStatus), color: statusColor(selectedScenario.computedStatus), border: '1px solid ' + statusColor(selectedScenario.computedStatus) + '40' }"
                >
                  {{ statusLabel(selectedScenario.computedStatus) }}
                </span>
              </div>
              <p v-if="selectedScenario.prompt" class="text-sm text-gray-400 italic leading-relaxed p-3 rounded-lg bg-white/[0.02] border-l-2 border-fh-primary/30 mb-3">
                {{ selectedScenario.prompt }}
              </p>
              <router-link
                :to="`/scenare?open=${selectedScenario.id}`"
                class="block text-center text-sm text-fh-primary no-underline fh-btn-secondary py-2.5"
                @click="closeDetail"
              >
                Otevřít ve Scénářích
              </router-link>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s ease;
}
.sheet-enter-active > :last-child,
.sheet-leave-active > :last-child {
  transition: transform 0.25s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from > :last-child,
.sheet-leave-to > :last-child {
  transform: translateY(100%);
}
</style>

<style>
/* Storyline SVG global styles (not scoped — applied to inline SVG) */
.storyline-container {
  background: #060a12;
}

.storyline-container svg {
  background: transparent !important;
}

.storyline-container text {
  fill: white;
  font-family: 'Cinzel', 'Georgia', serif;
  font-size: 12px;
  text-anchor: middle;
  dominant-baseline: central;
}

/* Status indicator icons — positioned relative to node center */
.storyline-container text.blocked {
  font-size: 20px;
  fill: #A13C2F;
}

.storyline-container text.required {
  font-size: 12px;
  font-weight: bold;
  fill: #E9A678;
}

.storyline-container text.label {
  fill: #6b7280;
  font-size: 10px;
}

.storyline-container .node {
  fill: #0a0e17;
  stroke: #374151;
  stroke-width: 2;
  transition: stroke 0.2s, fill 0.2s;
}

.storyline-container .line {
  fill: none;
  stroke: #1a2744;
  stroke-width: 1.5;
  transition: stroke 0.2s;
}

.storyline-container .arrow {
  fill: #1a2744;
  stroke: #1a2744;
  transition: fill 0.2s;
}

/* Scenario states */
.storyline-container .scenario {
  cursor: pointer;
}

.storyline-container .scenario:hover .node {
  filter: brightness(1.3);
}

.storyline-container .scenario.incomplete .node {
  stroke: #3B8585;
  stroke-width: 2.5;
}

.storyline-container .scenario.complete .node {
  stroke: #3B8585;
  fill: #3B8585;
}

.storyline-container .scenario.complete text {
  fill: #0a0e17;
  font-weight: bold;
}

.storyline-container .scenario.blocked .node {
  stroke: #A13C2F;
}

.storyline-container .scenario.blocked text.blocked {
  fill: #A13C2F;
}

.storyline-container .scenario.required .node {
  stroke: #E9A678;
}

.storyline-container .scenario.required text.required {
  fill: #E9A678;
}

/* Dimmed = locked but still visible */
.storyline-container .scenario.dimmed {
  opacity: 0.3;
}

.storyline-container .scenario.dimmed .node {
  stroke: #374151;
}

/* Chapter containers */
.storyline-container .chapter rect,
.storyline-container .chapter path {
  fill-opacity: 0.4;
}

/* Chapter label text */
.storyline-container text.label {
  fill: #4a5568;
  font-size: 11px;
  letter-spacing: 1px;
}
</style>
