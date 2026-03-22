<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { SCENARIO_STATUSES } from '@/models/types'
import type { ScenarioData } from '@/models/Scenario'
import { useCampaignStore } from '@/stores/campaignStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useAchievementStore } from '@/stores/achievementStore'

const router = useRouter()
const route = useRoute()
const campaignStore = useCampaignStore()
const scenarioStore = useScenarioStore()
const achievementStore = useAchievementStore()

const search = ref('')

/* ── Loot resource translations ── */
const resourceNames: Record<string, string> = {
  coins: 'mince',
  lumber: 'dřevo',
  metal: 'kov',
  hide: 'kůže',
  arrowvine: 'šípobyl',
  axenut: 'sekeřičník',
  corpsecap: 'mrtvolník',
  flamefruit: 'plamenoplod',
  rockroot: 'skalokořen',
  snowthistle: 'sněhobodlák',
  'random-item-treasure': 'náhodný předmět',
}

const resourceIcons: Record<string, string> = {
  coins: '#f59e0b',
  lumber: '#92400e',
  metal: '#94a3b8',
  hide: '#a16207',
  arrowvine: '#16a34a',
  axenut: '#854d0e',
  corpsecap: '#7c3aed',
  flamefruit: '#ef4444',
  rockroot: '#78716c',
  snowthistle: '#06b6d4',
  'random-item-treasure': '#a855f7',
}

/* ── Modal ── */
const selectedScenarioId = ref<number | null>(null)
const selectedScenario = computed(() =>
  selectedScenarioId.value !== null
    ? scenarioStore.allScenarios.find(s => s.id === selectedScenarioId.value) ?? null
    : null
)

watch(selectedScenarioId, (val) => {
  document.body.style.overflow = val !== null ? 'hidden' : ''
})

function openModal(s: { id: number }) {
  selectedScenarioId.value = s.id
}
function closeModal() {
  selectedScenarioId.value = null
}
function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') closeModal()
}
onMounted(() => document.addEventListener('keydown', onEsc))
onUnmounted(() => {
  document.removeEventListener('keydown', onEsc)
  document.body.style.overflow = ''
})

function achievementName(id: string): string {
  return achievementStore.getName(id)
}

function linkedScenarioName(id: number): string {
  const def = scenarioStore.getDefinition(id)
  return def ? `#${id} ${def.name}` : `#${id}`
}

function openLinkedScenario(id: number) {
  closeModal()
  // Small delay to allow modal close transition
  setTimeout(() => {
    selectedScenarioId.value = id
  }, 50)
}

/* ── Filter tabs ── */
type FilterVal = 'all' | 'available' | 'completed' | 'attempted' | 'locked' | 'blocked'
const filterStatus = ref<FilterVal>('all')

const allFilterTabs: { key: FilterVal; label: string }[] = [
  { key: 'all', label: 'Vše' },
  { key: 'available', label: 'Dostupné' },
  { key: 'completed', label: 'Dokončeno' },
  { key: 'attempted', label: 'Pokus' },
  { key: 'locked', label: 'Zamčeno' },
  { key: 'blocked', label: 'Blokováno' },
]

const filterTabs = computed(() => {
  if (!campaignStore.currentCampaign?.hideSpoilers) return allFilterTabs
  return allFilterTabs.filter(t => t.key !== 'locked' && t.key !== 'blocked')
})

onMounted(async () => {
  if (!campaignStore.hasCampaign) {
    router.push('/kampan')
    return
  }
  await scenarioStore.loadScenarioData()

  const openId = route.query.open as string | undefined
  if (openId) {
    const numId = parseInt(openId, 10)
    if (!isNaN(numId)) {
      openModal({ id: numId })
    }
  }
})

const SPOILER_VISIBLE_STATUSES: Set<string> = new Set([
  SCENARIO_STATUSES.AVAILABLE, SCENARIO_STATUSES.COMPLETED,
  SCENARIO_STATUSES.ATTEMPTED, SCENARIO_STATUSES.REQUIRED,
])

const filteredScenarios = computed(() => {
  return scenarioStore.allScenarios.filter((s) => {
    if (campaignStore.currentCampaign?.hideSpoilers && !SPOILER_VISIBLE_STATUSES.has(s.computedStatus)) return false

    if (filterStatus.value !== 'all') {
      const statusMap: Record<string, string[]> = {
        available: [SCENARIO_STATUSES.AVAILABLE, SCENARIO_STATUSES.REQUIRED],
        completed: [SCENARIO_STATUSES.COMPLETED],
        attempted: [SCENARIO_STATUSES.ATTEMPTED],
        locked: [SCENARIO_STATUSES.LOCKED],
        blocked: [SCENARIO_STATUSES.BLOCKED],
      }
      const allowed = statusMap[filterStatus.value]
      if (allowed && !allowed.includes(s.computedStatus)) return false
    }
    if (search.value) {
      const q = search.value.toLowerCase()
      return s.name.toLowerCase().includes(q) || String(s.id).includes(q)
    }
    return true
  })
})

/* ── Status styling ── */
const statusLabels: Record<string, string> = {
  [SCENARIO_STATUSES.COMPLETED]: 'Dokončeno',
  [SCENARIO_STATUSES.AVAILABLE]: 'Dostupné',
  [SCENARIO_STATUSES.LOCKED]: 'Zamčeno',
  [SCENARIO_STATUSES.BLOCKED]: 'Blokováno',
  [SCENARIO_STATUSES.REQUIRED]: 'Vyžadováno',
  [SCENARIO_STATUSES.ATTEMPTED]: 'Pokus',
}

const statusAccentColors: Record<string, string> = {
  [SCENARIO_STATUSES.COMPLETED]: 'bg-green-500',
  [SCENARIO_STATUSES.AVAILABLE]: 'bg-fh-primary',
  [SCENARIO_STATUSES.LOCKED]: 'bg-gray-600',
  [SCENARIO_STATUSES.BLOCKED]: 'bg-red-500',
  [SCENARIO_STATUSES.REQUIRED]: 'bg-yellow-500',
  [SCENARIO_STATUSES.ATTEMPTED]: 'bg-orange-500',
}

const statusBadgeColors: Record<string, string> = {
  [SCENARIO_STATUSES.COMPLETED]: 'bg-green-900/25 text-green-400 border border-green-800/40',
  [SCENARIO_STATUSES.AVAILABLE]: 'bg-fh-primary/10 text-fh-primary border border-fh-primary/20',
  [SCENARIO_STATUSES.LOCKED]: 'bg-white/5 text-gray-500 border border-fh-border',
  [SCENARIO_STATUSES.BLOCKED]: 'bg-red-900/25 text-red-400 border border-red-800/40',
  [SCENARIO_STATUSES.REQUIRED]: 'bg-yellow-900/25 text-yellow-400 border border-yellow-800/40',
  [SCENARIO_STATUSES.ATTEMPTED]: 'bg-orange-900/25 text-orange-400 border border-orange-800/40',
}

const statusCardBorder: Record<string, string> = {
  [SCENARIO_STATUSES.COMPLETED]: 'border-green-800/30',
  [SCENARIO_STATUSES.AVAILABLE]: 'border-fh-primary/20',
  [SCENARIO_STATUSES.LOCKED]: 'border-fh-border',
  [SCENARIO_STATUSES.BLOCKED]: 'border-red-800/30',
  [SCENARIO_STATUSES.REQUIRED]: 'border-yellow-800/30',
  [SCENARIO_STATUSES.ATTEMPTED]: 'border-orange-800/30',
}

/* ── Helpers ── */
function pctBar(a: number, b: number): number {
  return b === 0 ? 0 : Math.round((a / b) * 100)
}

function inputValue(e: Event): string {
  return (e.target as HTMLTextAreaElement).value
}

function complexityStars(n: number): string {
  return '\u2605'.repeat(n) + '\u2606'.repeat(Math.max(0, 5 - n))
}

function hasLoot(loot: ScenarioData['loot']): boolean {
  return Object.keys(loot).length > 0
}

function lootEntries(loot: ScenarioData['loot']): { key: string; name: string; amount: number; color: string }[] {
  return Object.entries(loot)
    .filter(([, v]) => v !== undefined && v > 0)
    .map(([k, v]) => ({
      key: k,
      name: resourceNames[k] ?? k,
      amount: v as number,
      color: resourceIcons[k] ?? '#94a3b8',
    }))
}

type RewardGroup = { label: string; items: string[] }

function formatRewards(rewards: string[][] | string[]): RewardGroup[] {
  if (!rewards || rewards.length === 0) return []
  // Check if it's choice-based (array of arrays with multiple options)
  const isChoiceBased = rewards.length > 1 && Array.isArray(rewards[0])
  if (isChoiceBased) {
    return (rewards as string[][]).map((group, i) => ({
      label: `Varianta ${String.fromCharCode(65 + i)}`,
      items: group,
    }))
  }
  // Flat list or single array
  const items = rewards.map(r => Array.isArray(r) ? r.join(', ') : r)
  return [{ label: '', items }]
}

function formatDate(iso: string | undefined): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return '' }
}

function lootPreview(loot: ScenarioData['loot']): string {
  const entries = lootEntries(loot)
  if (entries.length === 0) return ''
  return entries.slice(0, 3).map(e => `${e.amount} ${e.name}`).join(', ')
}
</script>

<template>
  <div v-if="campaignStore.hasCampaign" class="max-w-4xl mx-auto">
    <!-- Page header -->
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost tracking-wide">Scénáře</h1>
    </div>

    <!-- Progress overview -->
    <div class="bg-fh-card border border-fh-border rounded-2xl p-5 mb-6">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm text-gray-400 font-medium">Postup kampaní</span>
        <span class="font-display text-fh-primary text-lg font-bold">
          {{ scenarioStore.completedScenarios.length }}<span class="text-gray-600">/{{ scenarioStore.allScenarios.length }}</span>
        </span>
      </div>
      <div class="w-full h-3 bg-white/[0.06] rounded-full overflow-hidden mb-4">
        <div
          class="h-full rounded-full transition-all duration-700 ease-out"
          :style="{ width: pctBar(scenarioStore.completedScenarios.length, scenarioStore.allScenarios.length) + '%', background: 'linear-gradient(90deg, #3a7a9e, #5ba4cf, #7dbde5)' }"
        ></div>
      </div>
      <div class="flex flex-wrap gap-x-6 gap-y-1">
        <div class="flex items-center gap-2">
          <div class="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          <span class="text-xs text-gray-500">Dokončeno <span class="text-green-400 font-medium">{{ scenarioStore.completedScenarios.length }}</span></span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-2.5 h-2.5 rounded-full bg-fh-primary"></div>
          <span class="text-xs text-gray-500">Dostupné <span class="text-fh-primary font-medium">{{ scenarioStore.availableScenarios.length }}</span></span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-2.5 h-2.5 rounded-full bg-gray-600"></div>
          <span class="text-xs text-gray-500">Zamčeno <span class="text-gray-400 font-medium">{{ scenarioStore.allScenarios.length - scenarioStore.completedScenarios.length - scenarioStore.availableScenarios.length }}</span></span>
        </div>
      </div>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Hledat scénář..."
          class="fh-input w-full !pl-10"
        />
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="flex overflow-x-auto scrollbar-hide gap-1.5 mb-6 bg-white/[0.03] rounded-xl p-1 w-fit">
      <button
        v-for="tab in filterTabs"
        :key="tab.key"
        class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 shrink-0"
        :class="filterStatus === tab.key
          ? 'bg-fh-primary/20 text-fh-primary'
          : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'"
        @click="filterStatus = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Scenario cards -->
    <div class="space-y-2.5">
      <div
        v-for="s in filteredScenarios"
        :key="s.id"
        class="group relative bg-fh-card border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:bg-white/[0.02] active:scale-[0.995]"
        :class="statusCardBorder[s.computedStatus] ?? 'border-fh-border'"
        @click="openModal(s)"
      >
        <!-- left accent -->
        <div
          class="absolute left-0 top-0 bottom-0 w-[3px]"
          :class="statusAccentColors[s.computedStatus] ?? 'bg-gray-700'"
        ></div>

        <div class="flex items-center gap-4 px-5 py-3.5">
          <!-- number -->
          <div class="font-display font-bold text-lg text-fh-primary/60 w-8 text-center shrink-0">
            {{ s.id }}
          </div>

          <!-- info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="text-sm font-medium text-gray-300 truncate">{{ s.name }}</span>
              <span v-if="s.complexity > 0" class="shrink-0 text-[10px] text-fh-primary/50" :title="`Složitost ${s.complexity}`">
                {{ complexityStars(s.complexity) }}
              </span>
            </div>
            <div class="flex items-center gap-3 text-[11px] text-gray-600">
              <span v-if="s.coordinates?.name" class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z"/></svg>
                {{ s.coordinates.name }}
              </span>
              <span v-if="s.chapter_id" class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/></svg>
                Kap. {{ s.chapter_id }}
              </span>
              <span v-if="hasLoot(s.loot)" class="truncate">{{ lootPreview(s.loot) }}</span>
            </div>
          </div>

          <!-- status badge -->
          <span
            class="fh-badge shrink-0"
            :class="statusBadgeColors[s.computedStatus] ?? 'bg-white/5 text-gray-500'"
          >
            {{ statusLabels[s.computedStatus] ?? s.computedStatus }}
          </span>

          <!-- arrow -->
          <svg class="w-4 h-4 text-gray-700 group-hover:text-fh-primary transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="filteredScenarios.length === 0" class="text-center py-16 text-gray-600">
      <svg class="w-12 h-12 mx-auto mb-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
      <p class="text-sm">Žádné scénáře nenalezeny</p>
    </div>

    <!-- Scenario detail modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="selectedScenario"
          class="fixed inset-0 z-50 flex items-center justify-center p-0 lg:p-4"
          @click.self="closeModal"
        >
          <!-- backdrop -->
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal"></div>

          <!-- modal panel -->
          <div class="relative w-full h-full rounded-none lg:max-w-lg lg:max-h-[85vh] lg:rounded-2xl bg-fh-card border border-fh-border shadow-2xl overflow-hidden flex flex-col">
            <!-- header -->
            <div class="relative px-6 pt-5 pb-4 border-b border-fh-border">
              <!-- left accent -->
              <div
                class="absolute left-0 top-0 bottom-0 w-1"
                :class="statusAccentColors[selectedScenario.computedStatus] ?? 'bg-gray-700'"
              ></div>

              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <span class="font-display text-fh-primary text-xl font-bold">#{{ selectedScenario.id }}</span>
                    <span
                      class="fh-badge text-[10px]"
                      :class="statusBadgeColors[selectedScenario.computedStatus] ?? 'bg-white/5 text-gray-500'"
                    >
                      {{ statusLabels[selectedScenario.computedStatus] ?? selectedScenario.computedStatus }}
                    </span>
                  </div>
                  <h2 class="text-lg font-semibold text-gray-200">{{ selectedScenario.name }}</h2>
                  <div class="flex items-center gap-2 mt-1 flex-wrap">
                    <span v-if="selectedScenario.coordinates?.name" class="text-xs text-gray-500 flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z"/></svg>
                      {{ selectedScenario.coordinates.name }}
                    </span>
                    <span v-if="selectedScenario.chapter_id" class="text-xs text-gray-500 flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/></svg>
                      Kapitola {{ selectedScenario.chapter_id }}
                    </span>
                    <span v-if="selectedScenario.complexity > 0" class="text-xs text-fh-primary/60">
                      {{ complexityStars(selectedScenario.complexity) }}
                    </span>
                    <span v-if="selectedScenario.has_boss" class="text-[10px] text-red-400/70 bg-red-900/15 px-1.5 py-0.5 rounded border border-red-800/20">boss</span>
                  </div>
                </div>
                <!-- close button -->
                <button
                  class="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
                  @click="closeModal"
                >
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- body (scrollable) -->
            <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4 modal-scroll">
              <!-- prompt / summary -->
              <div v-if="selectedScenario.prompt" class="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <p class="text-sm text-gray-300 leading-relaxed italic">{{ selectedScenario.prompt }}</p>
              </div>

              <!-- completed date -->
              <div v-if="selectedScenario.computedStatus === SCENARIO_STATUSES.COMPLETED && selectedScenario.state.completedAt" class="flex items-center gap-2 text-xs text-gray-500">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/></svg>
                Dokončeno {{ formatDate(selectedScenario.state.completedAt) }}
              </div>

              <!-- rewards -->
              <div v-if="formatRewards(selectedScenario.rewards).length > 0">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Odměny</h3>
                <div class="space-y-3">
                  <div v-for="(group, gi) in formatRewards(selectedScenario.rewards)" :key="gi">
                    <div v-if="group.label" class="text-[10px] font-semibold text-fh-primary/60 uppercase tracking-wider mb-1">{{ group.label }}</div>
                    <div class="space-y-1">
                      <div
                        v-for="(item, idx) in group.items"
                        :key="idx"
                        class="flex items-start gap-2 text-xs"
                      >
                        <span class="w-1.5 h-1.5 rounded-full bg-fh-primary/40 mt-1.5 shrink-0"></span>
                        <span class="text-gray-300">{{ item }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- loot -->
              <div v-if="hasLoot(selectedScenario.loot)">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Loot</h3>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="entry in lootEntries(selectedScenario.loot)"
                    :key="entry.key"
                    class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border"
                    :style="{
                      background: entry.color + '15',
                      borderColor: entry.color + '30',
                      color: entry.color,
                    }"
                  >
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7"/></svg>
                    {{ entry.amount }}&times; {{ entry.name }}
                  </span>
                </div>
              </div>

              <!-- achievements awarded -->
              <div v-if="selectedScenario.achievements_awarded?.length">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Udělené úspěchy</h3>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="achId in selectedScenario.achievements_awarded"
                    :key="achId"
                    class="inline-flex items-center gap-1 text-xs bg-green-900/20 text-green-400 px-2.5 py-1 rounded-lg border border-green-800/30"
                  >
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
                    {{ achievementName(achId) }}
                  </span>
                </div>
              </div>

              <!-- treasures -->
              <div v-if="selectedScenario.treasures?.length">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Poklady</h3>
                <div class="space-y-1.5">
                  <div
                    v-for="tid in selectedScenario.treasures"
                    :key="tid"
                    class="flex items-center gap-2 text-xs"
                  >
                    <span
                      class="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                      :class="selectedScenario.state.treasuresLooted.includes(tid)
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-700/30'
                        : 'bg-white/[0.04] text-gray-500 border border-white/[0.06]'"
                    >
                      {{ tid }}
                    </span>
                    <span class="text-gray-400">Poklad #{{ tid }}</span>
                    <button
                      v-if="!selectedScenario.state.treasuresLooted.includes(tid)"
                      class="text-[10px] text-fh-primary/60 hover:text-fh-primary transition-colors ml-auto"
                      @click="scenarioStore.lootTreasure(selectedScenario!.id, tid)"
                    >
                      vyzvednout
                    </button>
                    <span v-else class="text-yellow-500/60 text-[10px] ml-auto">vyzvednuto</span>
                  </div>
                </div>
              </div>

              <!-- linked scenarios (links_to) -->
              <div v-if="selectedScenario.links_to?.length">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Odemyká scénáře</h3>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="linkId in selectedScenario.links_to"
                    :key="linkId"
                    class="text-xs bg-white/[0.04] text-fh-primary px-2.5 py-1 rounded-lg border border-fh-primary/20 hover:bg-fh-primary/10 hover:border-fh-primary/30 transition-colors cursor-pointer"
                    @click="openLinkedScenario(linkId)"
                  >
                    {{ linkedScenarioName(linkId) }}
                  </button>
                </div>
              </div>

              <!-- linked from -->
              <div v-if="selectedScenario.linked_from?.length">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Odemčeno z</h3>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="linkId in selectedScenario.linked_from"
                    :key="linkId"
                    class="text-xs bg-white/[0.04] text-gray-400 px-2.5 py-1 rounded-lg border border-white/[0.06] hover:bg-white/[0.06] transition-colors cursor-pointer"
                    @click="openLinkedScenario(linkId)"
                  >
                    {{ linkedScenarioName(linkId) }}
                  </button>
                </div>
              </div>

              <!-- choices (if scenario has choice branching) -->
              <div v-if="selectedScenario.choices?.length && selectedScenario.computedStatus === SCENARIO_STATUSES.COMPLETED">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Volba scénáře</h3>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="choiceId in selectedScenario.choices"
                    :key="choiceId"
                    class="text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer"
                    :class="selectedScenario.state.choice === choiceId
                      ? 'bg-fh-primary/15 text-fh-primary border-fh-primary/30'
                      : 'bg-white/[0.04] text-gray-400 border-white/[0.06] hover:bg-white/[0.06]'"
                    @click="scenarioStore.setChoice(selectedScenario!.id, choiceId)"
                  >
                    {{ linkedScenarioName(choiceId) }}
                  </button>
                </div>
              </div>

              <!-- notes -->
              <div>
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Poznámky</h3>
                <textarea
                  :value="selectedScenario.state.notes"
                  placeholder="Poznámky ke scénáři..."
                  rows="3"
                  class="fh-input w-full text-sm resize-none"
                  @input="scenarioStore.setNotes(selectedScenario?.id ?? 0, inputValue($event))"
                ></textarea>
              </div>
            </div>

            <!-- actions -->
            <div class="px-6 py-4 border-t border-fh-border space-y-3">
              <div class="flex flex-col gap-2">
                <button
                  v-if="selectedScenario.computedStatus === SCENARIO_STATUSES.LOCKED || selectedScenario.computedStatus === SCENARIO_STATUSES.BLOCKED"
                  class="w-full py-2.5 bg-gradient-to-r from-fh-primary-dim to-fh-primary text-white rounded-lg font-medium hover:shadow-[0_0_20px_rgba(91,164,207,0.25)] transition-all text-sm"
                  @click="scenarioStore.unlockScenario(selectedScenario.id)"
                >
                  Odemknout scénář
                </button>
                <button
                  v-if="selectedScenario.computedStatus === SCENARIO_STATUSES.AVAILABLE || selectedScenario.computedStatus === SCENARIO_STATUSES.ATTEMPTED || selectedScenario.computedStatus === SCENARIO_STATUSES.REQUIRED"
                  class="w-full py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:shadow-[0_0_20px_rgba(34,197,94,0.25)] transition-all text-sm"
                  @click="scenarioStore.completeScenario(selectedScenario.id)"
                >
                  Označit jako dokončené
                </button>
                <button
                  v-if="selectedScenario.computedStatus === SCENARIO_STATUSES.AVAILABLE || selectedScenario.computedStatus === SCENARIO_STATUSES.REQUIRED"
                  class="w-full py-2 bg-orange-600/15 text-orange-400 border border-orange-600/30 rounded-lg font-medium hover:bg-orange-600/25 transition-colors text-sm"
                  @click="scenarioStore.markAttempted(selectedScenario.id)"
                >
                  Označit jako pokus
                </button>
                <button
                  v-if="selectedScenario.computedStatus === SCENARIO_STATUSES.COMPLETED || selectedScenario.computedStatus === SCENARIO_STATUSES.ATTEMPTED"
                  class="w-full py-1.5 bg-white/[0.03] text-gray-500 rounded-lg text-xs hover:bg-white/[0.06] hover:text-gray-400 transition-colors border border-fh-border/40"
                  @click="scenarioStore.resetScenario(selectedScenario.id)"
                >
                  Resetovat scénář
                </button>
              </div>
              <div class="flex items-center justify-end">
                <button
                  class="fh-btn-secondary text-xs px-4 py-2"
                  @click="closeModal"
                >
                  Zavřít
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .relative {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
.modal-leave-to .relative {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}

.modal-scroll::-webkit-scrollbar {
  width: 4px;
}
.modal-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.modal-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
</style>
