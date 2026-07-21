<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaignStore'
import alchemyData from '@/data/alchemy.json'
import itemsData from '@/data/items.json'
import { RESOURCES } from '@/utils/gameIcons'

const router = useRouter()
const campaignStore = useCampaignStore()

onMounted(() => {
  if (!campaignStore.hasCampaign) {
    router.replace('/kampan')
  }
})

const campaign = computed(() => campaignStore.currentCampaign)

// Alchemist building ID = 35
const ALCHEMIST_ID = 35
const alchemistLevel = computed(() => campaign.value?.buildingLevels?.[ALCHEMIST_ID] ?? 0)

// Discovered recipes (item IDs that player has brewed/revealed)
const discoveredRecipes = computed(() => new Set(campaign.value?.discoveredRecipes ?? []))

function discoverRecipe(itemId: number) {
  if (!campaign.value) return
  if (!campaign.value.discoveredRecipes) campaign.value.discoveredRecipes = []
  if (!campaign.value.discoveredRecipes.includes(itemId)) {
    campaign.value.discoveredRecipes.push(itemId)
    campaignStore.autoSave()
  }
}

// Available charts based on alchemist level
const availableCharts = computed(() => {
  return alchemyData.filter(c => c.level <= alchemistLevel.value)
})

// Herb names (ikony bylin = herní loot ikony z RESOURCES)
const herbs: Record<string, { name: string }> = {
  arrowvine:   { name: 'Šípobyl' },
  axenut:      { name: 'Sekeřičník' },
  corpsecap:   { name: 'Mrtvolník' },
  flamefruit:  { name: 'Plamenoplod' },
  rockroot:    { name: 'Skalokořen' },
  snowthistle: { name: 'Sněhobodlák' },
}

type HerbKey = keyof typeof herbs
const herbKeys: HerbKey[] = ['arrowvine', 'axenut', 'corpsecap', 'flamefruit', 'rockroot', 'snowthistle']

function getHerbCount(key: HerbKey): number {
  return campaign.value?.resources[key as keyof typeof campaign.value.resources] ?? 0
}

function herbName(key: string): string {
  return herbs[key]?.name ?? key
}

function herbIconUrl(key: string): string {
  return RESOURCES[key]?.url ?? ''
}

// Item lookup
function getItemName(itemId: number): string {
  const item = (itemsData as { id: number; name: string }[]).find((i) => i.id === itemId)
  return item?.name ?? `Předmět #${itemId}`
}

// Selected item for detail
const selectedItem = ref<{ id: number; name: string; herbs: string[] } | null>(null)

function openItem(itemId: number, rowHerb: string, colHerb: string) {
  const herbList = [rowHerb, colHerb].filter(h => h && herbs[h])
  selectedItem.value = { id: itemId, name: getItemName(itemId), herbs: herbList }
}

function closeItem() {
  selectedItem.value = null
}

// Parse cell
type CellInfo =
  | { type: 'item'; id: number; name: string }
  | { type: 'double'; herbKey: string }
  | { type: 'any' }
  | { type: 'empty' }
  | { type: 'header'; herbKey: string }

function parseCell(cell: string | number): CellInfo {
  if (cell === '' || cell === null || cell === undefined) return { type: 'empty' }
  if (cell === 'any') return { type: 'any' }
  if (typeof cell === 'number') return { type: 'item', id: cell, name: getItemName(cell) }
  if (typeof cell === 'string' && cell.startsWith(':')) {
    const herbKey = cell.replace(/^:/, '').replace(/-2x$/, '')
    return { type: 'double', herbKey }
  }
  if (typeof cell === 'string' && herbs[cell]) return { type: 'header', herbKey: cell }
  return { type: 'empty' }
}

function chartTitle(chart: typeof alchemyData[0], idx: number): string {
  if (chart.title === '2 Herbs') return 'Kombinace 2 bylin'
  if (chart.title === '3 Herbs') return 'Kombinace 3 bylin'
  if (chart.title) return chart.title
  return `Tabulka ${idx + 1}`
}

// Confirm dialog for discovering recipe
const confirmDiscover = ref<{ id: number; name: string; rowHerb: string; colHerb: string } | null>(null)

function askDiscover(itemId: number, rowHerb: string, colHerb: string) {
  confirmDiscover.value = { id: itemId, name: getItemName(itemId), rowHerb, colHerb }
}

function doDiscover() {
  if (!confirmDiscover.value) return
  discoverRecipe(confirmDiscover.value.id)
  openItem(confirmDiscover.value.id, confirmDiscover.value.rowHerb, confirmDiscover.value.colHerb)
  confirmDiscover.value = null
}
</script>

<template>
  <div v-if="!campaign" />

  <div v-else class="max-w-4xl mx-auto">
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost">Výroba</h1>
    </div>

    <!-- Alchemist status -->
    <div v-if="alchemistLevel === 0" class="fh-card p-5 mb-6 border-fh-required/25">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-lg bg-fh-required/10 border border-fh-required/25 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-fh-required" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-fh-required mb-1">Alchymista není postaven</h3>
          <p class="text-xs text-gray-400">Pro výrobu lektvarů musíš nejdříve postavit budovu Alchymista v základně. Přejdi na stránku Základna a postav ji.</p>
          <router-link to="/outpost" class="inline-block mt-2 text-xs text-fh-primary hover:text-fh-primary-light no-underline">
            Přejít na Základnu &rarr;
          </router-link>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Alchemist level indicator -->
      <div class="flex items-center gap-3 mb-4">
        <div class="flex items-center gap-2 text-xs text-gray-400">
          <svg class="w-4 h-4 text-fh-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 0 0-1.022-.547l-2.387-.477a6 6 0 0 0-3.86.517l-.318.158a6 6 0 0 1-3.86.517L6.05 15.21a2 2 0 0 0-1.806.547M8 4h8l-1 1v5.172a2 2 0 0 0 .586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 0 0 9 10.172V5L8 4z" />
          </svg>
          Alchymista úroveň {{ alchemistLevel }}
        </div>
        <div class="flex gap-1">
          <div
            v-for="i in 3"
            :key="i"
            class="w-2 h-2 rounded-full"
            :class="i <= alchemistLevel ? 'bg-fh-primary' : 'bg-white/10'"
          />
        </div>
        <span class="text-[10px] text-gray-600">
          {{ alchemistLevel >= 3 ? '2- i 3-bylinné lektvary' : '2-bylinné lektvary' }}
        </span>
      </div>

      <!-- Herb inventory -->
      <div class="fh-card p-5 mb-6">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Zásoby bylin</h2>
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <div
            v-for="key in herbKeys"
            :key="key"
            class="rounded-xl border border-fh-border bg-black/20 p-3 text-center"
          >
            <img :src="herbIconUrl(key)" class="fh-gicon fh-gicon-light !h-5" :alt="herbs[key].name" :title="herbs[key].name">
            <div class="text-xl font-bold font-display text-fh-frost">
              {{ getHerbCount(key) }}
            </div>
            <div class="text-[10px] font-medium mt-0.5 text-gray-500">
              {{ herbs[key].name }}
            </div>
          </div>
        </div>
      </div>

      <!-- Alchemy charts -->
      <div class="space-y-6">
        <div
          v-for="(chart, chartIndex) in availableCharts"
          :key="chartIndex"
          class="fh-card p-4 sm:p-5"
        >
          <div class="flex items-center gap-3 mb-4">
            <h3 class="font-display text-sm font-bold text-fh-frost">
              {{ chartTitle(chart, chartIndex) }}
            </h3>
            <span class="text-[10px] text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded-full border border-fh-border">
              Úroveň {{ chart.level }}
            </span>
          </div>

          <div class="overflow-x-auto -mx-2 px-2">
            <table class="w-full text-xs border-collapse min-w-[420px]">
              <thead>
                <tr>
                  <th
                    v-for="(header, hIdx) in (chart.chart[0] as (string | number)[])"
                    :key="hIdx"
                    class="p-1.5 text-center"
                  >
                    <template v-if="parseCell(header).type === 'header'">
                      <div class="flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg bg-white/[0.04]">
                        <img
                          :src="herbIconUrl((parseCell(header) as { type: 'header'; herbKey: string }).herbKey)"
                          class="fh-gicon fh-gicon-light"
                          :alt="herbName((parseCell(header) as { type: 'header'; herbKey: string }).herbKey)"
                          :title="herbName((parseCell(header) as { type: 'header'; herbKey: string }).herbKey)"
                        >
                        <span class="text-[8px] font-semibold leading-none text-gray-400">
                          {{ herbName((parseCell(header) as { type: 'header'; herbKey: string }).herbKey).slice(0, 4) }}
                        </span>
                      </div>
                    </template>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, rIdx) in chart.chart.slice(1)"
                  :key="rIdx"
                >
                  <td
                    v-for="(cell, cIdx) in (row as (string | number)[])"
                    :key="cIdx"
                    class="p-1"
                  >
                    <!-- Row header -->
                    <template v-if="parseCell(cell).type === 'header'">
                      <div class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg whitespace-nowrap bg-white/[0.04]">
                        <img
                          :src="herbIconUrl((parseCell(cell) as { type: 'header'; herbKey: string }).herbKey)"
                          class="fh-gicon fh-gicon-light shrink-0"
                          :alt="herbName((parseCell(cell) as { type: 'header'; herbKey: string }).herbKey)"
                          :title="herbName((parseCell(cell) as { type: 'header'; herbKey: string }).herbKey)"
                        >
                        <span class="text-[10px] font-semibold text-gray-300">
                          {{ herbName((parseCell(cell) as { type: 'header'; herbKey: string }).herbKey) }}
                        </span>
                      </div>
                    </template>

                    <!-- Item: discovered → show name -->
                    <template v-else-if="parseCell(cell).type === 'item' && discoveredRecipes.has((parseCell(cell) as { id: number }).id)">
                      <button
                        class="w-full flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-lg bg-fh-primary/8 border border-fh-primary/15 hover:bg-fh-primary/15 hover:border-fh-primary/30 transition-all cursor-pointer group"
                        @click="openItem(
                          (parseCell(cell) as { id: number }).id,
                          (row as (string | number)[])[0] as string,
                          (chart.chart[0] as (string | number)[])[cIdx] as string
                        )"
                      >
                        <span class="font-bold text-[11px] text-fh-primary group-hover:text-fh-primary-light">
                          #{{ (parseCell(cell) as { id: number }).id }}
                        </span>
                        <span class="text-[8px] text-gray-500 max-w-[4.5rem] truncate leading-none">
                          {{ (parseCell(cell) as { id: number; name: string }).name }}
                        </span>
                      </button>
                    </template>

                    <!-- Item: NOT discovered → show ? -->
                    <template v-else-if="parseCell(cell).type === 'item'">
                      <button
                        class="w-full flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all cursor-pointer group"
                        @click="askDiscover(
                          (parseCell(cell) as { id: number }).id,
                          (row as (string | number)[])[0] as string,
                          (chart.chart[0] as (string | number)[])[cIdx] as string
                        )"
                      >
                        <span class="text-lg text-gray-600 group-hover:text-gray-400 transition-colors">?</span>
                      </button>
                    </template>

                    <!-- Double herb -->
                    <template v-else-if="parseCell(cell).type === 'double'">
                      <div class="flex items-center justify-center gap-1 px-1.5 py-2 rounded-lg border border-dashed border-fh-border-light bg-white/[0.03]">
                        <span class="text-[10px] font-medium text-gray-400">
                          2&times;
                        </span>
                        <img
                          :src="herbIconUrl((parseCell(cell) as { herbKey: string }).herbKey)"
                          class="fh-gicon fh-gicon-light"
                          :alt="herbName((parseCell(cell) as { herbKey: string }).herbKey)"
                          :title="herbName((parseCell(cell) as { herbKey: string }).herbKey)"
                        >
                      </div>
                    </template>

                    <!-- Any herb -->
                    <template v-else-if="parseCell(cell).type === 'any'">
                      <div class="flex items-center justify-center px-1.5 py-2 rounded-lg bg-fh-primary/8 border border-fh-primary/15">
                        <span class="text-[10px] text-fh-primary font-medium">jakákoli</span>
                      </div>
                    </template>

                    <!-- Empty -->
                    <template v-else>
                      <div class="p-2 text-center text-gray-800">&mdash;</div>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Legend -->
          <div v-if="(chart as { recipes?: unknown }).recipes" class="mt-4 pt-3 border-t border-fh-border/30">
            <p class="text-[11px] text-gray-500">
              <span class="font-medium text-gray-400">2&times;</span> — kombinace dvou stejných bylin vytvoří {{ getItemName(98) }} (#98)
            </p>
          </div>
        </div>

        <!-- Locked charts hint -->
        <div v-if="alchemistLevel < 3" class="fh-card p-4 border-dashed border-fh-border/50">
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <svg class="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Vylepši Alchymistu na úroveň 3 pro odemčení 3-bylinných kombinací
          </div>
        </div>
      </div>
    </template>

    <!-- Item detail popup -->
    <Teleport to="body">
      <Transition name="popup">
        <div
          v-if="selectedItem"
          class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[min(340px,calc(100vw-2rem))]"
          @click.stop
        >
          <div class="fh-card p-4 shadow-2xl border border-fh-primary/20">
            <div class="flex items-start justify-between gap-3 mb-2">
              <div>
                <span class="font-display text-fh-primary text-lg font-bold">#{{ selectedItem.id }}</span>
                <h3 class="text-sm font-semibold text-gray-200">{{ selectedItem.name }}</h3>
              </div>
              <button class="p-1 text-gray-600 hover:text-gray-300 transition-colors" @click="closeItem">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div v-if="selectedItem.herbs.length" class="flex items-center gap-2">
              <span class="text-[10px] text-gray-500">Ingredience:</span>
              <div class="flex gap-1">
                <span
                  v-for="h in selectedItem.herbs"
                  :key="h"
                  class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-fh-border text-gray-300"
                >
                  <img :src="herbIconUrl(h)" class="fh-gicon fh-gicon-light" :alt="herbName(h)">
                  {{ herbName(h) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Discover confirmation dialog -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="confirmDiscover"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="confirmDiscover = null" />
          <div class="relative fh-card p-6 max-w-sm w-full shadow-2xl border border-fh-border">
            <h3 class="font-display text-lg font-bold text-fh-frost mb-2">Uvařit lektvar?</h3>
            <p class="text-sm text-gray-400 mb-4">
              Chceš odhalit tento recept? Tím se ukáže jaký předmět tato kombinace bylin vytvoří.
            </p>
            <div class="flex items-center gap-2 mb-4">
              <span
                v-for="h in [confirmDiscover.rowHerb, confirmDiscover.colHerb].filter(k => herbs[k])"
                :key="h"
                class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/[0.05] border border-fh-border text-gray-300"
              >
                <img :src="herbIconUrl(h)" class="fh-gicon fh-gicon-light" :alt="herbName(h)">
                {{ herbName(h) }}
              </span>
              <span class="text-gray-600">&rarr;</span>
              <span class="text-gray-400 text-sm">???</span>
            </div>
            <div class="flex gap-2">
              <button
                class="fh-btn-primary flex-1 text-sm"
                @click="doDiscover"
              >
                Odhalit recept
              </button>
              <button
                class="fh-btn-ghost text-sm"
                @click="confirmDiscover = null"
              >
                Zrušit
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.popup-enter-active,
.popup-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
