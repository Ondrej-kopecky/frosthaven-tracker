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
        if (campaignStore.currentCampaign?.hideSpoilers) {
          el.style.display = 'none'
          hideEdgesFor(id)
          return
        }
        el.classList.add('blocked')
        break
      case SCENARIO_STATUSES.REQUIRED:
        el.classList.add('required')
        break
      default:
        // locked — hide if spoiler mode, otherwise dim
        if (campaignStore.currentCampaign?.hideSpoilers) {
          el.style.display = 'none'
          hideEdgesFor(id)
          return
        }
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

function linkedScenarioName(id: number): string {
  const def = scenarioStore.getDefinition(id)
  return def ? `#${id} ${def.name}` : `#${id}`
}

/* ── Choose dialog ── */
const showChooseDialog = ref(false)
const chooseScenarioId = ref<number | null>(null)
const chosenOptionId = ref<number | null>(null)

const chooseOptions = computed(() => {
  if (!chooseScenarioId.value) return []
  const def = scenarioStore.getDefinition(chooseScenarioId.value)
  if (!def?.choices) return []
  return def.choices.map((id) => ({
    id,
    name: linkedScenarioName(id),
  }))
})

function handleComplete(scenarioId: number) {
  const def = scenarioStore.getDefinition(scenarioId)
  if (def?.choices && def.choices.length > 1) {
    chooseScenarioId.value = scenarioId
    chosenOptionId.value = null
    showChooseDialog.value = true
  } else {
    scenarioStore.completeScenario(scenarioId)
  }
}

function confirmChoice() {
  if (!chooseScenarioId.value || !chosenOptionId.value) return
  scenarioStore.completeScenario(chooseScenarioId.value)
  scenarioStore.setChoice(chooseScenarioId.value, chosenOptionId.value)
  showChooseDialog.value = false
}

function cancelChoice() {
  showChooseDialog.value = false
}

function inputValue(e: Event): string {
  return (e.target as HTMLTextAreaElement).value
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
    case SCENARIO_STATUSES.COMPLETED: return '#22c55e'
    case SCENARIO_STATUSES.AVAILABLE: return '#5ba4cf'
    case SCENARIO_STATUSES.BLOCKED: return '#ef4444'
    case SCENARIO_STATUSES.REQUIRED: return '#eab308'
    case SCENARIO_STATUSES.ATTEMPTED: return '#f97316'
    default: return '#5a6577'
  }
}

function statusBg(status: string): string {
  switch (status) {
    case SCENARIO_STATUSES.COMPLETED: return 'rgba(34,197,94,0.15)'
    case SCENARIO_STATUSES.AVAILABLE: return 'rgba(91,164,207,0.15)'
    case SCENARIO_STATUSES.BLOCKED: return 'rgba(239,68,68,0.15)'
    case SCENARIO_STATUSES.REQUIRED: return 'rgba(234,179,8,0.15)'
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
  { label: 'Dostupné', color: '#5ba4cf' },
  { label: 'Dokončeno', color: '#22c55e', filled: true },
  { label: 'Zamčeno', color: '#ef4444' },
  { label: 'Vyžadováno', color: '#eab308' },
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
          <div class="fh-card h-full overflow-y-auto flex flex-col">
            <!-- Header -->
            <div class="p-4 pb-3 border-b border-fh-border shrink-0">
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="font-display font-bold text-lg" :style="{ color: statusColor(selectedScenario.computedStatus) }">#{{ selectedScenario.id }}</span>
                    <span
                      class="fh-badge text-[10px]"
                      :style="{ backgroundColor: statusBg(selectedScenario.computedStatus), color: statusColor(selectedScenario.computedStatus), border: '1px solid ' + statusColor(selectedScenario.computedStatus) + '40' }"
                    >
                      {{ statusLabel(selectedScenario.computedStatus) }}
                    </span>
                  </div>
                  <h3 class="font-display text-base font-semibold text-gray-200">{{ selectedScenario.name }}</h3>
                  <div class="flex items-center gap-2 mt-1 flex-wrap">
                    <span v-if="selectedScenario.coordinates?.name" class="text-xs text-gray-500">{{ selectedScenario.coordinates.name }}</span>
                    <span v-if="selectedScenario.chapter_id" class="text-xs text-gray-500">Kap. {{ selectedScenario.chapter_id }}</span>
                    <span v-if="selectedScenario.has_boss" class="text-[10px] text-red-400/70 bg-red-900/15 px-1.5 py-0.5 rounded border border-red-800/20">boss</span>
                  </div>
                </div>
                <button class="text-gray-500 hover:text-gray-300 p-1" @click="closeDetail">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto p-4 space-y-3">
              <!-- Prompt -->
              <p v-if="selectedScenario.prompt" class="text-sm text-gray-400 italic leading-relaxed p-3 rounded-lg bg-white/[0.02] border-l-2 border-fh-primary/30">
                {{ selectedScenario.prompt }}
              </p>

              <!-- Choices: parent scenario with branching -->
              <div v-if="selectedScenario.choices?.length && selectedScenario.choices.length > 1">
                <p class="text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                   :class="selectedScenario.computedStatus === SCENARIO_STATUSES.COMPLETED ? 'text-gray-500' : 'text-amber-400'">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>
                  {{ selectedScenario.computedStatus === SCENARIO_STATUSES.COMPLETED ? 'Volba scénáře' : 'Rozcestí — výběr 1 z ' + selectedScenario.choices.length }}
                </p>
                <p v-if="selectedScenario.computedStatus !== SCENARIO_STATUSES.COMPLETED" class="text-xs text-amber-400/70 mb-2">
                  Po dokončení odemkneš pouze jeden:
                </p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="choiceId in selectedScenario.choices"
                    :key="choiceId"
                    class="text-xs px-2 py-0.5 rounded-md border transition-colors cursor-pointer"
                    :class="selectedScenario.state.choice === choiceId
                      ? 'bg-fh-primary/15 text-fh-primary border-fh-primary/30'
                      : 'bg-amber-900/10 text-amber-300/80 border-amber-700/25 hover:bg-amber-900/20'"
                    @click="onNodeClick(choiceId)"
                  >
                    {{ linkedScenarioName(choiceId) }}
                  </button>
                </div>
              </div>

              <!-- Exclusive siblings -->
              <div v-if="scenarioStore.getChoiceGroup(selectedScenario.id)" class="bg-amber-900/10 rounded-lg p-2.5 border border-amber-700/20">
                <p class="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/></svg>
                  Výběr 1 z {{ scenarioStore.getChoiceGroup(selectedScenario.id)!.total }}
                </p>
                <p class="text-[11px] text-amber-300/60 mb-1.5">Výlučný s:</p>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="sibId in scenarioStore.getChoiceGroup(selectedScenario.id)!.siblings"
                    :key="sibId"
                    class="text-[11px] bg-amber-900/15 text-amber-300/80 px-2 py-0.5 rounded border border-amber-700/25 hover:bg-amber-900/25 transition-colors cursor-pointer"
                    @click="onNodeClick(sibId)"
                  >
                    #{{ sibId }} {{ scenarioStore.getDefinition(sibId)?.name }}
                  </button>
                </div>
              </div>

              <!-- Links -->
              <div v-if="selectedScenario.links_to.length">
                <p class="text-xs text-gray-500 font-medium mb-1.5">Odemyká:</p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="linkId in selectedScenario.links_to"
                    :key="linkId"
                    class="px-2 py-0.5 text-xs rounded-md bg-fh-primary/10 text-fh-primary border border-fh-primary/20 hover:bg-fh-primary/20 transition-colors"
                    @click="onNodeClick(linkId)"
                  >
                    #{{ linkId }} {{ scenarioStore.getDefinition(linkId)?.name }}
                  </button>
                </div>
              </div>

              <!-- Linked from -->
              <div v-if="selectedScenario.linked_from.length">
                <p class="text-xs text-gray-500 font-medium mb-1.5">Odemčen z:</p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="linkId in selectedScenario.linked_from"
                    :key="linkId"
                    class="px-2 py-0.5 text-xs rounded-md bg-white/5 text-gray-400 border border-fh-border hover:bg-white/10 transition-colors"
                    @click="onNodeClick(linkId)"
                  >
                    #{{ linkId }} {{ scenarioStore.getDefinition(linkId)?.name }}
                  </button>
                </div>
              </div>

              <!-- Achievements -->
              <div v-if="selectedScenario.achievements_awarded?.length">
                <p class="text-xs text-gray-500 font-medium mb-1.5">Udělené úspěchy:</p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="ach in selectedScenario.achievements_awarded"
                    :key="ach"
                    class="px-2 py-0.5 text-[11px] rounded-full bg-fh-completed/10 text-fh-completed/80 border border-fh-completed/20"
                  >
                    {{ ach }}
                  </span>
                </div>
              </div>

              <!-- Notes -->
              <div>
                <p class="text-xs text-gray-500 font-medium mb-1.5">Poznámky:</p>
                <textarea
                  :value="selectedScenario.state.notes"
                  placeholder="Poznámky ke scénáři..."
                  rows="2"
                  class="fh-input w-full text-xs resize-none"
                  @input="scenarioStore.setNotes(selectedScenario?.id ?? 0, inputValue($event))"
                ></textarea>
              </div>
            </div>

            <!-- Actions -->
            <div class="p-4 pt-3 border-t border-fh-border shrink-0 space-y-2">
              <button
                v-if="selectedScenario.computedStatus === SCENARIO_STATUSES.AVAILABLE || selectedScenario.computedStatus === SCENARIO_STATUSES.ATTEMPTED || selectedScenario.computedStatus === SCENARIO_STATUSES.REQUIRED"
                class="w-full py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:shadow-[0_0_15px_rgba(34,197,94,0.25)] transition-all text-sm"
                @click="handleComplete(selectedScenario.id)"
              >
                Označit jako dokončené
              </button>
              <button
                v-if="selectedScenario.computedStatus === SCENARIO_STATUSES.AVAILABLE || selectedScenario.computedStatus === SCENARIO_STATUSES.REQUIRED"
                class="w-full py-1.5 bg-fh-attempted/15 text-fh-attempted border border-fh-attempted/30 rounded-lg font-medium hover:bg-fh-attempted/25 transition-colors text-sm"
                @click="scenarioStore.markAttempted(selectedScenario.id)"
              >
                Označit jako pokus
              </button>
              <button
                v-if="selectedScenario.computedStatus === SCENARIO_STATUSES.LOCKED || selectedScenario.computedStatus === SCENARIO_STATUSES.BLOCKED"
                class="w-full py-1.5 bg-fh-primary/10 text-fh-primary border border-fh-primary/20 rounded-lg font-medium hover:bg-fh-primary/20 transition-colors text-sm"
                @click="scenarioStore.unlockScenario(selectedScenario.id)"
              >
                Odemknout scénář
              </button>
              <button
                v-if="selectedScenario.computedStatus === SCENARIO_STATUSES.COMPLETED || selectedScenario.computedStatus === SCENARIO_STATUSES.ATTEMPTED"
                class="w-full py-1.5 bg-white/[0.03] text-gray-500 rounded-lg text-xs hover:bg-white/[0.06] hover:text-gray-400 transition-colors border border-fh-border/40"
                @click="scenarioStore.resetScenario(selectedScenario.id)"
              >
                Resetovat
              </button>
              <router-link
                :to="`/scenare?open=${selectedScenario.id}`"
                class="block text-center text-xs text-gray-500 hover:text-fh-primary no-underline py-1.5 transition-colors"
              >
                Zobrazit plný detail
              </router-link>
            </div>
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
            <div class="flex-1 overflow-y-auto p-4 space-y-3">
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="font-display font-bold text-lg" :style="{ color: statusColor(selectedScenario.computedStatus) }">#{{ selectedScenario.id }}</span>
                    <span
                      class="fh-badge text-[10px]"
                      :style="{ backgroundColor: statusBg(selectedScenario.computedStatus), color: statusColor(selectedScenario.computedStatus), border: '1px solid ' + statusColor(selectedScenario.computedStatus) + '40' }"
                    >
                      {{ statusLabel(selectedScenario.computedStatus) }}
                    </span>
                  </div>
                  <h3 class="font-display text-base font-semibold text-gray-200">{{ selectedScenario.name }}</h3>
                  <div class="flex items-center gap-2 mt-1">
                    <span v-if="selectedScenario.coordinates?.name" class="text-xs text-gray-500">{{ selectedScenario.coordinates.name }}</span>
                    <span v-if="selectedScenario.has_boss" class="text-[10px] text-red-400/70 bg-red-900/15 px-1.5 py-0.5 rounded border border-red-800/20">boss</span>
                  </div>
                </div>
              </div>

              <p v-if="selectedScenario.prompt" class="text-sm text-gray-400 italic leading-relaxed p-3 rounded-lg bg-white/[0.02] border-l-2 border-fh-primary/30">
                {{ selectedScenario.prompt }}
              </p>

              <!-- Exclusive siblings -->
              <div v-if="scenarioStore.getChoiceGroup(selectedScenario.id)" class="bg-amber-900/10 rounded-lg p-2.5 border border-amber-700/20">
                <p class="text-xs font-semibold text-amber-400 mb-1">Výběr 1 z {{ scenarioStore.getChoiceGroup(selectedScenario.id)!.total }} — výlučný s:</p>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="sibId in scenarioStore.getChoiceGroup(selectedScenario.id)!.siblings"
                    :key="sibId"
                    class="text-[11px] text-amber-300/80 bg-amber-900/15 px-2 py-0.5 rounded border border-amber-700/25"
                  >
                    #{{ sibId }} {{ scenarioStore.getDefinition(sibId)?.name }}
                  </span>
                </div>
              </div>

              <!-- Actions -->
              <div class="space-y-2">
                <button
                  v-if="selectedScenario.computedStatus === SCENARIO_STATUSES.AVAILABLE || selectedScenario.computedStatus === SCENARIO_STATUSES.ATTEMPTED || selectedScenario.computedStatus === SCENARIO_STATUSES.REQUIRED"
                  class="w-full py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:shadow-[0_0_15px_rgba(34,197,94,0.25)] transition-all text-sm"
                  @click="handleComplete(selectedScenario.id)"
                >
                  Označit jako dokončené
                </button>
                <button
                  v-if="selectedScenario.computedStatus === SCENARIO_STATUSES.AVAILABLE || selectedScenario.computedStatus === SCENARIO_STATUSES.REQUIRED"
                  class="w-full py-2 bg-fh-attempted/15 text-fh-attempted border border-fh-attempted/30 rounded-lg font-medium hover:bg-fh-attempted/25 transition-colors text-sm"
                  @click="scenarioStore.markAttempted(selectedScenario.id)"
                >
                  Označit jako pokus
                </button>
                <button
                  v-if="selectedScenario.computedStatus === SCENARIO_STATUSES.LOCKED || selectedScenario.computedStatus === SCENARIO_STATUSES.BLOCKED"
                  class="w-full py-2 bg-fh-primary/10 text-fh-primary border border-fh-primary/20 rounded-lg font-medium hover:bg-fh-primary/20 transition-colors text-sm"
                  @click="scenarioStore.unlockScenario(selectedScenario.id)"
                >
                  Odemknout scénář
                </button>
                <button
                  v-if="selectedScenario.computedStatus === SCENARIO_STATUSES.COMPLETED || selectedScenario.computedStatus === SCENARIO_STATUSES.ATTEMPTED"
                  class="w-full py-1.5 bg-white/[0.03] text-gray-500 rounded-lg text-xs hover:bg-white/[0.06] transition-colors border border-fh-border/40"
                  @click="scenarioStore.resetScenario(selectedScenario.id)"
                >
                  Resetovat
                </button>
                <router-link
                  :to="`/scenare?open=${selectedScenario.id}`"
                  class="block text-center text-xs text-gray-500 hover:text-fh-primary no-underline py-1.5 transition-colors"
                  @click="closeDetail"
                >
                  Zobrazit plný detail
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Choose scenario dialog -->
    <Teleport to="body">
      <Transition name="modal-choose">
        <div
          v-if="showChooseDialog"
          class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="cancelChoice"></div>
          <div class="relative w-full max-w-sm bg-fh-card border border-amber-700/30 rounded-2xl shadow-2xl overflow-hidden">
            <div class="px-6 pt-5 pb-3 border-b border-amber-700/20">
              <div class="flex items-center gap-2 mb-1">
                <svg class="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>
                <h3 class="text-base font-semibold text-gray-200">Vyber scénář k odemčení</h3>
              </div>
              <p class="text-xs text-amber-400/70">Ostatní budou uzamčeny.</p>
            </div>
            <div class="px-6 py-4 space-y-2">
              <label
                v-for="opt in chooseOptions"
                :key="opt.id"
                class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                :class="chosenOptionId === opt.id
                  ? 'bg-fh-primary/10 border-fh-primary/30'
                  : 'bg-white/[0.02] border-fh-border hover:bg-white/[0.04]'"
              >
                <input type="radio" name="fc-choose" :value="opt.id" v-model="chosenOptionId" class="w-4 h-4 accent-[#5ba4cf]">
                <span class="text-sm text-gray-300">{{ opt.name }}</span>
              </label>
            </div>
            <div class="px-6 py-4 border-t border-fh-border flex justify-end gap-2">
              <button class="px-4 py-2 text-xs text-gray-400 hover:text-gray-300 transition-colors" @click="cancelChoice">Zrušit</button>
              <button
                class="px-4 py-2 text-xs font-medium rounded-lg transition-all"
                :class="chosenOptionId ? 'bg-gradient-to-r from-green-600 to-green-700 text-white' : 'bg-white/5 text-gray-600 cursor-not-allowed'"
                :disabled="!chosenOptionId"
                @click="confirmChoice"
              >Dokončit a odemknout</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-choose-enter-active,
.modal-choose-leave-active {
  transition: opacity 0.2s ease;
}
.modal-choose-enter-from,
.modal-choose-leave-to {
  opacity: 0;
}
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
  fill: #ef4444;
}

.storyline-container text.required {
  font-size: 12px;
  font-weight: bold;
  fill: #eab308;
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
  stroke: #5ba4cf;
  stroke-width: 2.5;
}

.storyline-container .scenario.complete .node {
  stroke: #22c55e;
  fill: #22c55e;
}

.storyline-container .scenario.complete text {
  fill: #0a0e17;
  font-weight: bold;
}

.storyline-container .scenario.blocked .node {
  stroke: #ef4444;
}

.storyline-container .scenario.blocked text.blocked {
  fill: #ef4444;
}

.storyline-container .scenario.required .node {
  stroke: #eab308;
}

.storyline-container .scenario.required text.required {
  fill: #eab308;
}

/* Dimmed = locked but still visible */
.storyline-container .scenario.dimmed {
  opacity: 0.3;
}

.storyline-container .scenario.dimmed .node {
  stroke: #5a6577;
}

/* Chapter containers */
.storyline-container .chapter rect,
.storyline-container .chapter path {
  fill-opacity: 0.4;
}

/* Chapter label text */
.storyline-container text.label {
  fill: #9ca3af;
  font-size: 11px;
  letter-spacing: 1px;
}
</style>
