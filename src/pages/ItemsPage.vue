<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCampaignStore } from '@/stores/campaignStore'
import { useCharacterStore } from '@/stores/characterStore'
import type { ItemData } from '@/models/Item'
import itemsData from '@/data/items.json'
import { translateDescription, slotIconUrl, RESOURCES, MONEY_ICON } from '@/utils/gameIcons'

const campaignStore = useCampaignStore()
const characterStore = useCharacterStore()

const allItems = itemsData as ItemData[]

const search = ref('')
const filterSlot = ref<string>('all')
const filterSource = ref<string>('all')

// --- Slot labels ---
const slotLabels: Record<string, string> = {
  Head: 'Hlava',
  Body: 'Tělo',
  Legs: 'Nohy',
  'One Hand': 'Jedna ruka',
  'Two Hands': 'Dvě ruce',
  'Small Item': 'Malý předmět',
}

function slotLabel(slot: string | undefined): string {
  if (!slot) return 'Ostatní'
  return slotLabels[slot] ?? slot
}

// --- Resources (herní loot ikony) ---
function formatResources(resources: Record<string, number>): string {
  return Object.entries(resources)
    .map(([key, count]) => {
      const r = RESOURCES[key]
      if (!r) return `${count}× ${key}`
      return `${count}×<img src="${r.url}" class="fh-gicon" alt="${r.label}" title="${r.label}">`
    })
    .join(' ')
}

// --- Source helpers ---
function primarySource(source: string): string {
  return source.split('\n')[0]!.trim()
}

// Grouped sources for dropdown
const sourceGroups = computed(() => {
  const groups: Record<string, string[]> = {}
  const seen = new Set<string>()
  for (const item of allItems) {
    const ps = primarySource(item.source)
    if (seen.has(ps)) continue
    seen.add(ps)
    // Determine group
    let group = 'Ostatní'
    if (ps.startsWith('Řemeslník')) group = 'Řemeslník'
    else if (ps.startsWith('Klenotník')) group = 'Klenotník'
    else if (ps.startsWith('Obchodní stanice')) group = 'Obchodní stanice'
    else if (ps.startsWith('Poklad')) group = 'Poklad'
    else if (ps.startsWith('Scénář')) group = 'Scénář'
    else if (ps.includes('sólo scénář')) group = 'Sólo scénář'
    else if (ps === 'Počáteční nabídka') group = 'Počáteční nabídka'
    else if (ps === 'Alchymie') group = 'Alchymie'
    else if (ps === 'Náhodná kořist' || ps === 'Náhodný návrh předmětu') group = 'Náhodné'

    if (!groups[group]) groups[group] = []
    groups[group].push(ps)
  }
  // Sort within groups
  for (const g of Object.keys(groups)) {
    groups[g].sort()
  }
  return groups
})

const sourceList = computed(() => {
  const order = ['Řemeslník', 'Klenotník', 'Obchodní stanice', 'Počáteční nabídka', 'Alchymie', 'Poklad', 'Scénář', 'Sólo scénář', 'Náhodné', 'Ostatní']
  const result: { group: string; sources: string[] }[] = []
  for (const g of order) {
    if (sourceGroups.value[g]?.length) {
      result.push({ group: g, sources: sourceGroups.value[g] })
    }
  }
  return result
})


// Truncate description text (strip HTML for length check, show raw truncated)
function truncateDesc(desc: string, maxLen = 80): string {
  const translated = translateDescription(desc)
  // Strip HTML to check actual text length
  const plain = translated.replace(/<[^>]+>/g, '')
  if (plain.length <= maxLen) return translated
  // Find a good cut point in the original desc
  if (desc.length <= maxLen) return translated
  return translateDescription(desc.slice(0, maxLen) + '...')
}

// --- Spoiler-safe sources (visible even with hideSpoilers on) ---
const SPOILER_SAFE_SOURCES = new Set(['Počáteční nabídka', 'Řemeslník', 'Alchymie'])

function isItemSpoilerSafe(item: ItemData): boolean {
  const ps = primarySource(item.source)
  if (SPOILER_SAFE_SOURCES.has(ps)) return true
  // Items from crafting levels up to current prosperity
  if (ps.startsWith('Řemeslník') || ps.startsWith('Klenotník')) return true
  // Items owned by characters are always visible
  const characters = campaignStore.currentCampaign?.characters ?? []
  for (const c of characters) {
    if (c.items?.includes(String(item.id)) || c.items?.includes(item.name)) return true
  }
  return false
}

// --- Filtering ---
const filteredItems = computed(() => {
  return allItems.filter((item) => {
    // Spoiler filter
    if (campaignStore.currentCampaign?.hideSpoilers && !isItemSpoilerSafe(item)) return false
    if (filterSlot.value !== 'all' && item.slot !== filterSlot.value) return false
    if (filterSource.value !== 'all' && primarySource(item.source) !== filterSource.value) return false
    if (search.value) {
      const q = search.value.toLowerCase()
      return (
        item.name.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        String(item.id).includes(q)
      )
    }
    return true
  })
})

const stats = computed(() => ({
  total: allItems.length,
  shown: filteredItems.value.length,
}))


// --- Detail modal ---
const detailItem = ref<ItemData | null>(null)

watch(detailItem, (val) => {
  document.body.style.overflow = val ? 'hidden' : ''
})

function openDetail(item: ItemData) {
  detailItem.value = item
}

// --- Add item flow ---
const addingItem = ref<ItemData | null>(null)
const addForCharacter = ref('')

watch(addingItem, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else if (!detailItem.value) {
    document.body.style.overflow = ''
  }
})

function openAdd(item: ItemData) {
  addingItem.value = item
  addForCharacter.value = ''
}

function confirmAdd() {
  if (!addingItem.value || !addForCharacter.value) return
  const itemId = String(addingItem.value.id)
  const ok = characterStore.addItemFree(addForCharacter.value, itemId)
  if (ok) {
    addingItem.value = null
    addForCharacter.value = ''
  }
}

// Cost display: resources or gold
function hasCraftingCost(item: ItemData): boolean {
  return !!(item.resources && Object.keys(item.resources).length > 0)
}
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost tracking-wide">Předměty</h1>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 mb-5">
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Hledat předmět (název, popis, číslo)..."
          class="fh-input w-full !pl-10"
        />
      </div>
      <select v-model="filterSlot" class="fh-input min-w-[140px]">
        <option value="all">Všechny sloty</option>
        <option value="Head">Hlava</option>
        <option value="Body">Tělo</option>
        <option value="Legs">Nohy</option>
        <option value="One Hand">Jedna ruka</option>
        <option value="Two Hands">Dvě ruce</option>
        <option value="Small Item">Malý předmět</option>
      </select>
      <select v-model="filterSource" class="fh-input min-w-[160px]">
        <option value="all">Všechny zdroje</option>
        <optgroup v-for="sg in sourceList" :key="sg.group" :label="sg.group">
          <option v-for="s in sg.sources" :key="s" :value="s">{{ s }}</option>
        </optgroup>
      </select>
    </div>

    <!-- Stats -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex gap-5 text-sm">
        <span class="text-gray-600">Celkem: <span class="text-gray-400">{{ stats.total }}</span></span>
        <span v-if="stats.shown !== stats.total" class="text-fh-primary-dim">Zobrazeno: <span class="text-fh-primary">{{ stats.shown }}</span></span>
      </div>
    </div>

    <!-- Items Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="item-card group cursor-pointer"
        @click="openDetail(item)"
      >
        <!-- Pergamenová karta jako ve hře -->
        <div class="item-parchment fh-parchment">
          <div class="flex items-center justify-between gap-2">
            <span v-if="hasCraftingCost(item)" class="item-cost-line" v-html="formatResources(item.resources)"></span>
            <span v-else-if="(item as any).cost > 0" class="item-cost-line">
              <img :src="MONEY_ICON" class="fh-gicon" alt="zlato" title="Cena ve zlatě"><b>{{ (item as any).cost }}</b>
            </span>
            <span v-else class="item-cost-line opacity-60 text-[11px]">Zdarma</span>
            <img
              v-if="item.slot"
              :src="slotIconUrl(item.slot)"
              class="fh-gicon fh-gicon-dark !h-5"
              :alt="slotLabel(item.slot)"
              :title="slotLabel(item.slot)"
            >
          </div>

          <h3 class="item-name font-display">{{ item.name }}</h3>

          <p class="item-desc" v-html="truncateDesc(item.desc)"></p>

          <div class="item-parch-bottom">
            <span class="font-display font-bold">{{ String(item.id).padStart(3, '0') }}</span>
            <span class="flex items-center gap-1">
              <img v-if="item.spent" src="/fh-icons/use/spent.svg" class="fh-gicon" alt="Vyčerpané" title="Vyčerpané — po odpočinku se vrátí">
              <img v-if="item.consumed" src="/fh-icons/use/consumed.svg" class="fh-gicon" alt="Spotřebované" title="Spotřebované — po použití zmizí">
              <img v-if="item.lost" src="/fh-icons/use/lost.svg" class="fh-gicon" alt="Ztracené" title="Ztracené — nelze obnovit">
            </span>
            <span class="font-display font-bold">×{{ item.count }}</span>
          </div>
        </div>

        <!-- Info aplikace pod kartou -->
        <div class="item-meta">
          <span class="text-[10px] text-gray-500 truncate">{{ primarySource(item.source) }}</span>
          <div class="flex items-center gap-2 shrink-0">
            <span v-if="campaignStore.hasCampaign" class="text-[10px] text-gray-500">
              {{ characterStore.getAvailableCount(String(item.id)) }}/{{ item.count }} volných
            </span>
            <button
              v-if="campaignStore.hasCampaign && characterStore.activeCharacters.length > 0 && characterStore.getAvailableCount(String(item.id)) > 0"
              class="text-[10px] py-0.5 px-2 rounded-md transition-all text-gray-500 hover:text-fh-frost hover:bg-fh-primary/10 border border-fh-border"
              @click.stop="openAdd(item)"
              title="Přidat předmět postavě"
            >
              + Přidat
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="filteredItems.length === 0" class="text-center py-16">
      <div class="inline-block p-4 rounded-2xl bg-white/[0.02] mb-4">
        <svg class="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      <p class="text-gray-500 font-display tracking-wide">Žádné předměty neodpovídají filtru</p>
    </div>

    <!-- Detail modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="detailItem" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" @click.self="detailItem = null" @keydown.escape="detailItem = null">
          <div class="detail-modal w-full max-h-[85vh] rounded-t-2xl sm:rounded-2xl sm:max-w-lg mx-0 sm:mx-4 overflow-y-auto overscroll-contain">
            <!-- Swipe indicator (mobile) -->
            <div class="flex justify-center pt-3 pb-1 sm:hidden" @click="detailItem = null">
              <div class="w-10 h-1 rounded-full bg-white/20"></div>
            </div>

            <!-- Pergamenová karta v detailu -->
            <div class="detail-parch fh-parchment">
              <div class="flex items-center justify-between mb-1">
                <span class="item-cost-line">
                  <template v-if="hasCraftingCost(detailItem)"><span v-html="formatResources(detailItem.resources)"></span></template>
                  <template v-else-if="(detailItem as any).cost > 0">
                    <img :src="MONEY_ICON" class="fh-gicon" alt="zlato" title="Cena ve zlatě"><b>{{ (detailItem as any).cost }}</b>
                  </template>
                  <template v-else><span class="opacity-60 text-xs">Zdarma</span></template>
                </span>
                <div class="flex items-center gap-2">
                  <img
                    v-if="detailItem.slot"
                    :src="slotIconUrl(detailItem.slot)"
                    class="fh-gicon fh-gicon-dark !h-6"
                    :alt="slotLabel(detailItem.slot)"
                    :title="slotLabel(detailItem.slot)"
                  >
                  <button
                    class="w-8 h-8 flex items-center justify-center rounded-full bg-black/[0.08] text-fh-ink-soft hover:bg-black/[0.18] transition-all"
                    @click="detailItem = null"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <h2 class="font-display text-xl font-bold text-center tracking-wide mb-3">
                {{ detailItem.name }}
              </h2>
              <p class="text-sm leading-relaxed text-center detail-parch-desc" v-html="translateDescription(detailItem.desc)"></p>
              <!-- Back side description for flip items -->
              <div v-if="(detailItem as any).backDesc" class="mt-3 pt-3 border-t border-black/20">
                <p class="text-[10px] uppercase tracking-wider mb-1 opacity-60">Druhá strana</p>
                <p class="text-sm leading-relaxed text-center detail-parch-desc" v-html="translateDescription((detailItem as any).backDesc)"></p>
              </div>
              <div class="item-parch-bottom mt-4">
                <span class="font-display font-bold">{{ String(detailItem.id).padStart(3, '0') }}</span>
                <span class="flex items-center gap-1">
                  <img v-if="detailItem.spent" src="/fh-icons/use/spent.svg" class="fh-gicon" alt="Vyčerpané" title="Vyčerpané — po odpočinku se vrátí">
                  <img v-if="detailItem.consumed" src="/fh-icons/use/consumed.svg" class="fh-gicon" alt="Spotřebované" title="Spotřebované — po použití zmizí">
                  <img v-if="detailItem.lost" src="/fh-icons/use/lost.svg" class="fh-gicon" alt="Ztracené" title="Ztracené — nelze obnovit">
                </span>
                <span class="font-display font-bold">×{{ detailItem.count }}</span>
              </div>
            </div>

            <!-- FAQ -->
            <div v-if="detailItem.faq" class="detail-faq">
              <div class="flex items-start gap-2">
                <svg class="w-4 h-4 text-fh-primary/50 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
                <p class="text-xs text-fh-primary/50 italic leading-relaxed">{{ detailItem.faq }}</p>
              </div>
            </div>

            <!-- Info rows -->
            <div class="detail-info">
              <!-- Crafting cost / Price -->
              <div class="detail-row">
                <span class="detail-label">Cena</span>
                <span class="detail-value">
                  <template v-if="hasCraftingCost(detailItem)">
                    <span v-for="(count, resource) in detailItem.resources" :key="resource" class="inline-flex items-center gap-1 mr-3">
                      <span>{{ count }}×</span>
                      <img :src="RESOURCES[resource as string]?.url" class="fh-gicon fh-gicon-light" :alt="RESOURCES[resource as string]?.label ?? resource" :title="RESOURCES[resource as string]?.label ?? resource">
                      <span class="text-xs text-gray-500">{{ RESOURCES[resource as string]?.label ?? resource }}</span>
                    </span>
                  </template>
                  <template v-else-if="(detailItem as any).cost > 0">
                    <span class="font-display font-bold text-amber-400">{{ (detailItem as any).cost }} zl.</span>
                  </template>
                  <template v-else>
                    <span class="text-gray-500">Zdarma</span>
                  </template>
                </span>
              </div>

              <!-- Source -->
              <div class="detail-row">
                <span class="detail-label">Zdroj</span>
                <span class="detail-value">{{ detailItem.source }}</span>
              </div>

              <!-- Count -->
              <div class="detail-row">
                <span class="detail-label">Ve hře</span>
                <span class="detail-value">
                  {{ detailItem.count }}×
                  <span v-if="campaignStore.hasCampaign" class="text-gray-500">
                    ({{ characterStore.getAvailableCount(String(detailItem.id)) }} volných)
                  </span>
                </span>
              </div>

              <!-- Usage type -->
              <div v-if="detailItem.spent || detailItem.consumed || detailItem.lost" class="detail-row">
                <span class="detail-label">Typ použití</span>
                <div class="flex items-center gap-3">
                  <div v-if="detailItem.spent" class="flex items-center gap-1.5">
                    <img src="/fh-icons/use/spent.svg" class="fh-gicon" alt="Vyčerpané">
                    <span class="text-sm text-gray-300">Vyčerpané</span>
                  </div>
                  <div v-if="detailItem.consumed" class="flex items-center gap-1.5">
                    <img src="/fh-icons/use/consumed.svg" class="fh-gicon" alt="Spotřebované">
                    <span class="text-sm text-gray-300">Spotřebované</span>
                  </div>
                  <div v-if="detailItem.lost" class="flex items-center gap-1.5">
                    <img src="/fh-icons/use/lost.svg" class="fh-gicon" alt="Ztracené">
                    <span class="text-sm text-gray-300">Ztracené</span>
                  </div>
                </div>
              </div>

              <!-- Minus one cards -->
              <div v-if="detailItem.minusOneCardsAdded" class="detail-row">
                <span class="detail-label">Postih</span>
                <span class="detail-value text-red-400">+{{ detailItem.minusOneCardsAdded }} karta −1 do balíčku</span>
              </div>
            </div>

            <!-- Actions -->
            <div v-if="campaignStore.hasCampaign && characterStore.activeCharacters.length > 0 && characterStore.getAvailableCount(String(detailItem.id)) > 0" class="detail-actions">
              <button
                class="fh-btn-primary text-sm flex-1"
                @click="openAdd(detailItem); detailItem = null"
              >
                Přidat postavě
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Add to character modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="addingItem" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" @click.self="addingItem = null">
          <div class="fh-card p-6 max-w-sm w-full mx-4 border border-fh-primary/20">
            <h3 class="font-display text-lg text-fh-frost mb-1">Přidat předmět</h3>
            <p class="font-display text-sm text-gray-300 mb-4">{{ addingItem.name }}</p>

            <p class="text-xs text-gray-500 mb-4">
              Odměna ze scénáře, eventu nebo jiného zdroje
            </p>

            <select v-model="addForCharacter" class="fh-input w-full mb-3">
              <option value="" disabled>Vyberte postavu...</option>
              <option
                v-for="c in characterStore.activeCharacters"
                :key="c.uuid"
                :value="c.uuid"
              >
                {{ c.playerName }}
              </option>
            </select>

            <div class="flex gap-2 mt-4">
              <button
                class="fh-btn-primary flex-1 text-sm"
                :disabled="!addForCharacter"
                :class="{ 'opacity-40 cursor-not-allowed': !addForCharacter }"
                @click="confirmAdd"
              >
                Přidat
              </button>
              <button class="fh-btn-ghost text-sm" @click="addingItem = null">
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
/* Karta předmětu: tmavý rámeček + pergamen uvnitř (jako reálná karta) */
.item-card {
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(26, 39, 68, 0.6);
  background: linear-gradient(180deg, #0d1528 0%, #0a1020 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.item-card:hover {
  border-color: rgba(91, 164, 207, 0.35);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 25px rgba(91, 164, 207, 0.07);
  transform: translateY(-2px);
}

.item-parchment {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0.5rem 0.5rem 0;
  padding: 0.625rem 0.75rem 0.4rem;
  border-radius: 0.5rem;
}

.item-name {
  text-align: center;
  font-weight: 700;
  font-size: 0.875rem;
  line-height: 1.25;
  margin: 0.4rem 0 0.45rem;
}

.item-desc {
  flex: 1;
  text-align: center;
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--color-fh-ink-soft);
}

.item-parch-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;
  padding-top: 0.35rem;
  border-top: 1px solid rgba(90, 74, 45, 0.35);
  font-size: 0.7rem;
  color: var(--color-fh-ink-soft);
}

.item-cost-line {
  display: inline-flex;
  align-items: center;
  gap: 0.2em;
  font-size: 0.8rem;
  font-weight: 600;
}

.item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.875rem 0.55rem;
}

/* Detail modal */
.detail-modal {
  background: linear-gradient(180deg, #0d1528 0%, #0a1020 100%);
  border: 1px solid rgba(91, 164, 207, 0.2);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(91, 164, 207, 0.08);
}

.detail-parch {
  margin: 0.75rem;
  padding: 1rem 1.25rem 0.75rem;
  border-radius: 0.625rem;
}

.detail-parch-desc {
  color: var(--color-fh-ink);
}

.text-fh-ink-soft {
  color: var(--color-fh-ink-soft);
}

.detail-faq {
  padding: 0 1.5rem 1rem;
}

.detail-info {
  padding: 0 1.5rem 1rem;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0.625rem 0;
  border-bottom: 1px solid rgba(26, 39, 68, 0.3);
}
.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-width: 5rem;
  flex-shrink: 0;
}

.detail-value {
  font-size: 0.875rem;
  color: #cbd5e1;
  text-align: right;
}

.detail-actions {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(26, 39, 68, 0.5);
  display: flex;
  gap: 0.5rem;
}

/* Modal transitions */
.modal-enter-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .detail-modal,
.modal-enter-active .fh-card {
  transition: transform 0.25s ease, opacity 0.2s ease;
}
.modal-leave-active {
  transition: opacity 0.15s ease;
}
.modal-leave-active .detail-modal,
.modal-leave-active .fh-card {
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.modal-enter-from {
  opacity: 0;
}
.modal-enter-from .detail-modal {
  transform: translateY(20px);
  opacity: 0;
}
.modal-enter-from .fh-card {
  transform: scale(0.95);
  opacity: 0;
}
.modal-leave-to {
  opacity: 0;
}
.modal-leave-to .detail-modal {
  transform: translateY(10px);
  opacity: 0;
}
.modal-leave-to .fh-card {
  transform: scale(0.95);
  opacity: 0;
}
</style>
