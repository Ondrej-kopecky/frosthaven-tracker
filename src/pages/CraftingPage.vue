<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaignStore'
import alchemyData from '@/data/alchemy.json'
import itemsData from '@/data/items.json'

const router = useRouter()
const campaignStore = useCampaignStore()

onMounted(() => {
  if (!campaignStore.hasCampaign) {
    router.replace('/kampan')
  }
})

const campaign = computed(() => campaignStore.currentCampaign)

// Herb name translations
const herbNames: Record<string, string> = {
  arrowvine: 'Sipobyl',
  rockroot: 'Skalokoren',
  snowthistle: 'Snehobodlak',
  axenut: 'Sekericnik',
  corpsecap: 'Mrtvolnik',
  flamefruit: 'Plamenoplod',
}

// Herb colors for table headers
const herbColors: Record<string, string> = {
  arrowvine: 'bg-green-900/50 text-green-300 border-green-700/40',
  rockroot: 'bg-cyan-900/50 text-cyan-300 border-cyan-700/40',
  snowthistle: 'bg-sky-900/50 text-sky-300 border-sky-700/40',
  axenut: 'bg-lime-900/50 text-lime-300 border-lime-700/40',
  corpsecap: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40',
  flamefruit: 'bg-teal-900/50 text-teal-300 border-teal-700/40',
  any: 'bg-purple-900/50 text-purple-300 border-purple-700/40',
}

// Item lookup
function getItemName(itemId: number): string {
  const item = (itemsData as { id: number; name: string }[]).find((i) => i.id === itemId)
  return item?.name ?? `Predmet #${itemId}`
}

// Resource display
type HerbKey = 'arrowvine' | 'axenut' | 'corpsecap' | 'flamefruit' | 'rockroot' | 'snowthistle'

const herbResources: { key: HerbKey; label: string; color: string }[] = [
  { key: 'arrowvine', label: 'Sipobyl', color: 'bg-green-900/40 border-green-700/30 text-green-200' },
  { key: 'axenut', label: 'Sekericnik', color: 'bg-lime-900/40 border-lime-700/30 text-lime-200' },
  { key: 'corpsecap', label: 'Mrtvolnik', color: 'bg-emerald-900/40 border-emerald-700/30 text-emerald-200' },
  { key: 'flamefruit', label: 'Plamenoplod', color: 'bg-teal-900/40 border-teal-700/30 text-teal-200' },
  { key: 'rockroot', label: 'Skalokoren', color: 'bg-cyan-900/40 border-cyan-700/30 text-cyan-200' },
  { key: 'snowthistle', label: 'Snehobodlak', color: 'bg-sky-900/40 border-sky-700/30 text-sky-200' },
]

function getHerbCount(key: HerbKey): number {
  return campaign.value?.resources[key] ?? 0
}

// Item detail tooltip
const hoveredItem = ref<{ id: number; name: string } | null>(null)

function showItemTooltip(itemId: number) {
  hoveredItem.value = { id: itemId, name: getItemName(itemId) }
}

function hideItemTooltip() {
  hoveredItem.value = null
}

// Parse cell value — either a number (item ID), a recipe key, "any", or empty
function getCellContent(cell: string | number, chart: typeof alchemyData[0]): { type: 'item'; id: number; name: string } | { type: 'recipe'; label: string; itemId: number } | { type: 'any' } | { type: 'empty' } {
  if (cell === '' || cell === null || cell === undefined) return { type: 'empty' }
  if (cell === 'any') return { type: 'any' }
  if (typeof cell === 'number') return { type: 'item', id: cell, name: getItemName(cell) }
  if (typeof cell === 'string' && cell.startsWith(':')) {
    const recipe = (chart as { recipes?: Record<string, { ingredients: string; item: number }> }).recipes?.[cell]
    if (recipe) {
      return { type: 'recipe', label: herbNames[cell.replace(/^:/, '').replace(/-2x$/, '')] ?? cell, itemId: recipe.item }
    }
  }
  return { type: 'empty' }
}

// Chart title
function getChartTitle(chart: typeof alchemyData[0], index: number): string {
  if (chart.title) return `Uroven ${chart.level}: ${chart.title}`
  return `Uroven ${chart.level} (tabulka ${index + 1})`
}
</script>

<template>
  <div v-if="!campaign" />

  <div v-else>
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost">Vyroba</h1>
    </div>

    <!-- Herb inventory -->
    <div class="fh-divider mb-4">Zasoby bylin</div>
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
      <div
        v-for="herb in herbResources"
        :key="herb.key"
        class="rounded-xl border p-3 text-center"
        :class="herb.color"
      >
        <div class="text-lg font-bold">{{ getHerbCount(herb.key) }}</div>
        <div class="text-[10px] uppercase tracking-wider opacity-75">{{ herb.label }}</div>
      </div>
    </div>

    <!-- Alchemy charts -->
    <div class="fh-divider mb-4">Alchymisticke tabulky</div>

    <div class="space-y-6">
      <div
        v-for="(chart, chartIndex) in alchemyData"
        :key="chartIndex"
        class="fh-card p-4 sm:p-5"
      >
        <h3 class="font-display text-sm font-bold text-fh-frost mb-4">
          {{ getChartTitle(chart, chartIndex) }}
        </h3>

        <div class="overflow-x-auto -mx-2 px-2">
          <table class="w-full text-xs border-collapse min-w-[400px]">
            <thead>
              <tr>
                <th class="p-2 text-left text-gray-500 font-normal"></th>
                <th
                  v-for="(header, hIdx) in (chart.chart[0] as (string | number)[]).slice(0)"
                  :key="hIdx"
                  class="p-2 text-center font-semibold rounded-t-lg"
                  :class="typeof header === 'string' && header ? (herbColors[header] ?? 'text-gray-400') : 'text-gray-600'"
                >
                  <template v-if="typeof header === 'string' && header">
                    {{ herbNames[header] ?? header }}
                  </template>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, rIdx) in chart.chart.slice(1)"
                :key="rIdx"
                class="border-t border-fh-border/50"
              >
                <!-- Row header (herb name) -->
                <td
                  class="p-2 font-semibold whitespace-nowrap"
                  :class="typeof (row as (string | number)[])[0] === 'string' ? (herbColors[(row as (string | number)[])[0] as string] ?? 'text-gray-400') : 'text-gray-400'"
                >
                  {{ herbNames[(row as (string | number)[])[0] as string] ?? (row as (string | number)[])[0] }}
                </td>

                <!-- Data cells -->
                <td
                  v-for="(cell, cIdx) in (row as (string | number)[]).slice(1)"
                  :key="cIdx"
                  class="p-2 text-center"
                >
                  <template v-if="getCellContent(cell, chart).type === 'item'">
                    <button
                      class="inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg bg-fh-primary/10 border border-fh-primary/20 hover:bg-fh-primary/20 hover:border-fh-primary/40 transition-all text-fh-primary-light cursor-pointer"
                      @mouseenter="showItemTooltip((getCellContent(cell, chart) as { type: 'item'; id: number; name: string }).id)"
                      @mouseleave="hideItemTooltip"
                    >
                      <span class="font-bold text-xs">#{{ (getCellContent(cell, chart) as { type: 'item'; id: number }).id }}</span>
                      <span class="text-[9px] text-fh-primary-dim max-w-[5rem] truncate">
                        {{ (getCellContent(cell, chart) as { type: 'item'; id: number; name: string }).name }}
                      </span>
                    </button>
                  </template>
                  <template v-else-if="getCellContent(cell, chart).type === 'recipe'">
                    <span
                      class="inline-block px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-[10px]"
                    >
                      2x stejna
                    </span>
                  </template>
                  <template v-else-if="getCellContent(cell, chart).type === 'any'">
                    <span class="text-purple-400 text-[10px] font-medium">libovolna</span>
                  </template>
                  <template v-else>
                    <span class="text-gray-700">-</span>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Recipe legend for level 1 -->
        <div v-if="(chart as { recipes?: unknown }).recipes" class="mt-4 pt-3 border-t border-fh-border/30">
          <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Dvojite byliny</div>
          <div class="text-xs text-gray-400">
            Kombinace dvou stejnych bylin vytvori Predmet #98 ({{ getItemName(98) }}).
          </div>
        </div>
      </div>
    </div>

    <!-- Tooltip overlay -->
    <div
      v-if="hoveredItem"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-fh-card border border-fh-border shadow-2xl"
    >
      <span class="text-sm text-fh-frost font-medium">#{{ hoveredItem.id }}</span>
      <span class="text-sm text-gray-400 ml-2">{{ hoveredItem.name }}</span>
    </div>
  </div>
</template>
