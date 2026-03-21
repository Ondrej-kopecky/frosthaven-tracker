<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import panzoom from 'panzoom'
import type { PanZoom } from 'panzoom'
import { useCampaignStore } from '@/stores/campaignStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useFlowchartStore, type StatusFilter, type StoryFilter } from '@/stores/flowchartStore'
import { layoutFlowchart } from '@/composables/useFlowchartLayout'
import { SCENARIO_STATUSES } from '@/models/types'

const router = useRouter()
const campaignStore = useCampaignStore()
const scenarioStore = useScenarioStore()
const flowchartStore = useFlowchartStore()

const svgRef = ref<SVGSVGElement | null>(null)
let pzInstance: PanZoom | null = null

onMounted(async () => {
  if (!campaignStore.hasCampaign) {
    router.push('/kampan')
    return
  }
  document.body.style.overflow = 'hidden'
  await scenarioStore.loadScenarioData()
  nextTick(() => initPanZoom())
})

onUnmounted(() => {
  document.body.style.overflow = ''
  pzInstance?.dispose()
})

const layout = computed(() => {
  if (!scenarioStore.isDataLoaded) return { nodes: [], edges: [], width: 0, height: 0 }
  return layoutFlowchart(
    scenarioStore.scenarioDefinitions,
    scenarioStore.computedStatuses,
    flowchartStore.storyFilter
  )
})

const SPOILER_VISIBLE = new Set(['completed', 'available', 'attempted', 'required'])

const filteredNodes = computed(() => {
  let nodes = layout.value.nodes
  // Hide locked/blocked when spoilers are on
  if (campaignStore.currentCampaign?.hideSpoilers) {
    nodes = nodes.filter((n) => SPOILER_VISIBLE.has(n.status))
  }
  const { filterStatus } = flowchartStore
  if (filterStatus === 'all') return nodes
  return nodes.filter((n) => n.status === filterStatus)
})

const filteredNodeIds = computed(() => new Set(filteredNodes.value.map((n) => n.id)))

const hasMainNodes = computed(() => filteredNodes.value.some((n) => !n.isSide))
const hasSideNodes = computed(() => filteredNodes.value.some((n) => n.isSide))
const sideStartY = computed(() => {
  const sideNodes = filteredNodes.value.filter((n) => n.isSide)
  return sideNodes.length ? Math.min(...sideNodes.map((n) => n.y)) : 0
})

const filteredEdges = computed(() => {
  return layout.value.edges.filter(
    (e) => filteredNodeIds.value.has(e.from) && filteredNodeIds.value.has(e.to)
  )
})

// Selected scenario detail
const selectedScenario = computed(() => {
  if (!flowchartStore.selectedNodeId) return null
  return scenarioStore.allScenarios.find((s) => s.id === flowchartStore.selectedNodeId) ?? null
})

function initPanZoom() {
  if (!svgRef.value) return
  pzInstance = panzoom(svgRef.value, {
    minZoom: 0.3,
    maxZoom: 4,
    bounds: true,
    boundsPadding: 0.1,
    smoothScroll: false,
  })
}

function fitView() {
  pzInstance?.moveTo(0, 0)
  pzInstance?.zoomAbs(0, 0, 1)
}

function onNodeClick(id: number) {
  flowchartStore.selectNode(flowchartStore.selectedNodeId === id ? null : id)
}

function closeDetail() {
  flowchartStore.selectNode(null)
}

// Status colors
function statusColor(status: string): string {
  switch (status) {
    case SCENARIO_STATUSES.COMPLETED: return '#22c55e'
    case SCENARIO_STATUSES.AVAILABLE: return '#5ba4cf'
    case SCENARIO_STATUSES.BLOCKED: return '#ef4444'
    case SCENARIO_STATUSES.REQUIRED: return '#eab308'
    case SCENARIO_STATUSES.ATTEMPTED: return '#f97316'
    default: return '#374151'
  }
}

function statusBg(status: string): string {
  switch (status) {
    case SCENARIO_STATUSES.COMPLETED: return 'rgba(34,197,94,0.12)'
    case SCENARIO_STATUSES.AVAILABLE: return 'rgba(91,164,207,0.12)'
    case SCENARIO_STATUSES.BLOCKED: return 'rgba(239,68,68,0.12)'
    case SCENARIO_STATUSES.REQUIRED: return 'rgba(234,179,8,0.12)'
    case SCENARIO_STATUSES.ATTEMPTED: return 'rgba(249,115,22,0.12)'
    default: return 'rgba(55,65,81,0.08)'
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

const storyFilters: { label: string; value: StoryFilter }[] = [
  { label: 'Hlavní', value: 'main' },
  { label: 'Vedlejší', value: 'side' },
  { label: 'Vše', value: 'all' },
]

const legendItems = [
  { label: 'Dokončeno', color: '#22c55e' },
  { label: 'Dostupné', color: '#5ba4cf' },
  { label: 'Zamčeno', color: '#374151' },
  { label: 'Blokováno', color: '#ef4444' },
  { label: 'Vyžadováno', color: '#eab308' },
  { label: 'Pokus', color: '#f97316' },
]
</script>

<template>
  <div v-if="campaignStore.hasCampaign" class="fixed inset-0 top-14 z-40 flex flex-col bg-fh-dark">
    <!-- Toolbar -->
    <div class="px-2 py-1.5 border-b border-fh-border bg-fh-dark shrink-0">
      <div class="flex flex-wrap items-center gap-2">
        <!-- Story filter -->
        <div class="flex gap-0.5 bg-black/30 rounded-lg p-0.5 border border-fh-border shrink-0">
          <button
            v-for="f in storyFilters"
            :key="f.value"
            class="px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200"
            :class="flowchartStore.storyFilter === f.value
              ? 'bg-fh-primary/20 text-fh-primary shadow-sm'
              : 'text-gray-500 hover:text-gray-300'"
            @click="flowchartStore.setStoryFilter(f.value)"
          >
            {{ f.label }}
          </button>
        </div>

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
          Přizpůsobit
        </button>

        <!-- Legend -->
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400 ml-auto">
          <div v-for="item in legendItems" :key="item.label" class="flex items-center gap-1">
            <span
              class="w-2.5 h-2.5 rounded-full border"
              :style="{ backgroundColor: item.color + '30', borderColor: item.color }"
            />
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="flex-1 flex relative overflow-hidden">
      <!-- Flowchart SVG -->
      <div class="flex-1 overflow-hidden" style="background: #060a12;">
        <svg
          ref="svgRef"
          :viewBox="`-20 -20 ${layout.width + 40} ${layout.height + 40}`"
          :width="layout.width + 40"
          :height="layout.height + 40"
          class="w-full h-full"
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#374151" />
            </marker>
          </defs>

          <!-- Side separator label -->
          <g v-if="hasSideNodes && hasMainNodes">
            <line
              :x1="0" :y1="sideStartY - 50"
              :x2="layout.width" :y2="sideStartY - 50"
              stroke="#1a2744" stroke-width="1" stroke-dasharray="6,4"
            />
            <text
              :x="layout.width / 2" :y="sideStartY - 30"
              text-anchor="middle" fill="#4a5568" font-size="11"
              font-family="Cinzel, Georgia, serif" letter-spacing="2"
            >
              VEDLEJŠÍ SCÉNÁŘE
            </text>
          </g>

          <!-- Edges -->
          <g>
            <path
              v-for="edge in filteredEdges"
              :key="`${edge.from}-${edge.to}`"
              :d="`M ${edge.x1} ${edge.y1} C ${edge.x1} ${edge.y1 + 25}, ${edge.x2} ${edge.y2 - 25}, ${edge.x2} ${edge.y2}`"
              fill="none"
              stroke="#1a2744"
              stroke-width="1.5"
              marker-end="url(#arrowhead)"
              class="transition-all duration-300"
            />
          </g>

          <!-- Nodes -->
          <g
            v-for="node in filteredNodes"
            :key="node.id"
            class="cursor-pointer"
            @click="onNodeClick(node.id)"
          >
            <rect
              :x="node.x"
              :y="node.y"
              width="120"
              height="40"
              rx="8"
              :fill="statusBg(node.status)"
              :stroke="flowchartStore.selectedNodeId === node.id ? '#5ba4cf' : statusColor(node.status)"
              :stroke-width="flowchartStore.selectedNodeId === node.id ? 2.5 : 1.5"
              class="transition-all duration-200"
            />
            <text
              :x="node.x + 60"
              :y="node.y + 16"
              text-anchor="middle"
              :fill="statusColor(node.status)"
              font-size="11"
              font-weight="bold"
              font-family="Cinzel, Georgia, serif"
            >
              #{{ node.id }}
            </text>
            <text
              :x="node.x + 60"
              :y="node.y + 30"
              text-anchor="middle"
              fill="#94a3b8"
              font-size="8"
            >
              {{ node.name.length > 18 ? node.name.slice(0, 16) + '…' : node.name }}
            </text>
          </g>
        </svg>
      </div>

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
                <span class="text-fh-primary font-display font-bold text-sm">#{{ selectedScenario.id }}</span>
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
              <p class="text-xs text-gray-500 font-medium mb-1.5">Odemyká scénáře:</p>
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

            <!-- Notes -->
            <div v-if="selectedScenario.state.notes" class="mt-3 pt-3 border-t border-fh-border/30">
              <p class="text-xs text-gray-500">{{ selectedScenario.state.notes }}</p>
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
                  <span class="text-fh-primary font-display font-bold text-sm">#{{ selectedScenario.id }}</span>
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
