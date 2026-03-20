<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCampaignStore } from '@/stores/campaignStore'
import { useCharacterStore } from '@/stores/characterStore'
import type { ItemData } from '@/models/Item'
import itemsData from '@/data/items.json'

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

// --- Resource labels ---
const resourceLabels: Record<string, { label: string; icon: string; color: string }> = {
  lumber: { label: 'dřevo', icon: '🪵', color: '#a0845c' },
  metal: { label: 'kov', icon: '⚙️', color: '#8a9aaf' },
  hide: { label: 'kůže', icon: '🧶', color: '#b08050' },
  arrowvine: { label: 'šípovník', icon: '🌿', color: '#5a9e4a' },
  axenut: { label: 'sekerník', icon: '🥜', color: '#c89040' },
  corpsecap: { label: 'mrtvička', icon: '🍄', color: '#8a5a8a' },
  flamefruit: { label: 'plamplod', icon: '🔥', color: '#e25822' },
  rockroot: { label: 'skalník', icon: '🪨', color: '#7a7a6a' },
  snowthistle: { label: 'sněžobod', icon: '❄️', color: '#7dbde5' },
}

function formatResources(resources: Record<string, number>): string {
  return Object.entries(resources)
    .map(([key, count]) => {
      const r = resourceLabels[key]
      if (!r) return `${count}× ${key}`
      return `${count}× ${r.icon}`
    })
    .join('  ')
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

// --- Element dots (inline HTML) ---
const elementColors: Record<string, string> = {
  FIRE: '#e25822',
  ICE: '#5bc0de',
  WIND: '#8fbc8f',
  EARTH: '#8b6914',
  LIGHT: '#f0c040',
  DARK: '#4a4a6a',
  ANY: 'linear-gradient(135deg, #e25822, #5bc0de, #8fbc8f, #8b6914)',
}

function elDot(key: string, consume = false): string {
  const c = elementColors[key] ?? '#888'
  const bg = `background:${c}`
  const x = consume ? '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:8px;font-weight:700;">✕</span>' : ''
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;${bg};vertical-align:middle;position:relative;margin:0 1px;">${x}</span>`
}

// --- Tag translation ---
function translateDescription(desc: string): string {
  let result = desc
    // FH-specific action tags with number capture: {TAG.fh}N → Czech N
    .replace(/\{MOVE\.fh\}\s*(\d+)/g, '<b style="color:#5ba4cf">Pohyb $1</b>')
    .replace(/\{ATTACK\.fh\}\s*(\d+)/g, '<b style="color:#ef4444">Útok $1</b>')
    .replace(/\{RANGE\.fh\}\s*(\d+)/g, '<b style="color:#a78bfa">Dostřel $1</b>')
    .replace(/\{HEAL\.fh\}\s*(\d+)/g, '<b style="color:#22c55e">Léčení $1</b>')
    .replace(/\{SHIELD\.fh\}\s*(\d+)/g, '<b style="color:#60a5fa">Obrana $1</b>')
    .replace(/\{PUSH\.fh\}\s*(\d+)/g, '<b style="color:#f97316">Odstrčení $1</b>')
    .replace(/\{PULL\.fh\}\s*(\d+)/g, '<b style="color:#f97316">Přitažení $1</b>')
    .replace(/\{PIERCE\.fh\}\s*(\d+)/g, '<b style="color:#dc2626">Průraznost $1</b>')
    .replace(/\{RETALIATE\.fh\}\s*(\d+)/g, '<b style="color:#ef4444">Odplata $1</b>')
    .replace(/\{TARGET\.fh\}\s*(\d+)/g, '<b style="color:#a78bfa">Cíl $1</b>')
    .replace(/\{DAMAGE\.fh\}\s*(\d+)/g, '<b style="color:#ef4444">Zranění $1</b>')
    .replace(/\{LOOT\.fh\}\s*(\d+)/g, '<b style="color:#eab308">Lup $1</b>')
    // FH action tags without number
    .replace(/\{MOVE\.fh\}/g, '<b style="color:#5ba4cf">Pohyb</b>')
    .replace(/\{ATTACK\.fh\}/g, '<b style="color:#ef4444">Útok</b>')
    .replace(/\{RANGE\.fh\}/g, '<b style="color:#a78bfa">Dostřel</b>')
    .replace(/\{HEAL\.fh\}/g, '<b style="color:#22c55e">Léčení</b>')
    .replace(/\{SHIELD\.fh\}/g, '<b style="color:#60a5fa">Obrana</b>')
    .replace(/\{PUSH\.fh\}/g, '<b style="color:#f97316">Odstrčení</b>')
    .replace(/\{PULL\.fh\}/g, '<b style="color:#f97316">Přitažení</b>')
    .replace(/\{JUMP\.fh\}/g, '<b style="color:#5ba4cf">Skok</b>')
    .replace(/\{FLY(?:ING)?\.fh\}/g, '<b style="color:#a8d8ea">Let</b>')
    .replace(/\{PIERCE\.fh\}/g, '<b style="color:#dc2626">Průraznost</b>')
    .replace(/\{RETALIATE\.fh\}/g, '<b style="color:#ef4444">Odplata</b>')
    .replace(/\{TARGET\.fh\}/g, '<b style="color:#a78bfa">Cíl</b>')
    .replace(/\{DAMAGE\.fh\}/g, '<b style="color:#ef4444">Zranění</b>')
    .replace(/\{LOOT\.fh\}/g, '<b style="color:#eab308">Lup</b>')
    .replace(/\{TELEPORT\.fh\}/g, '<b style="color:#a78bfa">Teleport</b>')
    .replace(/\{RECOVER\.fh\}/g, '<b style="color:#22c55e">Obnova</b>')
    .replace(/\{REGENERATE\.fh\}/g, '<b style="color:#22c55e">Regenerace</b>')
    // Status effects
    .replace(/\{POISON\.fh\}/g, '<span style="color:#22c55e;font-weight:600">Otrava</span>')
    .replace(/\{WOUND\.fh\}/g, '<span style="color:#ef4444;font-weight:600">Zranění</span>')
    .replace(/\{MUDDLE\.fh\}/g, '<span style="color:#a78bfa;font-weight:600">Zmatení</span>')
    .replace(/\{IMMOBILIZE\.fh\}/g, '<span style="color:#8b6914;font-weight:600">Znehybnění</span>')
    .replace(/\{DISARM\.fh\}/g, '<span style="color:#f97316;font-weight:600">Odzbrojení</span>')
    .replace(/\{STUN\.fh\}/g, '<span style="color:#eab308;font-weight:600">Omráčení</span>')
    .replace(/\{BLESS\.fh\}/g, '<span style="color:#f0c040;font-weight:600">Požehnání</span>')
    .replace(/\{CURSE\.fh\}/g, '<span style="color:#8a5a8a;font-weight:600">Prokletí</span>')
    .replace(/\{INVISIBLE\.fh\}/g, '<span style="color:#c0c0c0;font-weight:600">Neviditelnost</span>')
    .replace(/\{STRENGTHEN\.fh\}/g, '<span style="color:#5ba4cf;font-weight:600">Posílení</span>')
    .replace(/\{BRITTLE\.fh\}/g, '<span style="color:#7dbde5;font-weight:600">Křehkost</span>')
    .replace(/\{BANE\.fh\}/g, '<span style="color:#ef4444;font-weight:600">Pohroma</span>')
    .replace(/\{WARD\.fh\}/g, '<span style="color:#60a5fa;font-weight:600">Ochrana</span>')
    .replace(/\{IMPAIR\.fh\}/g, '<span style="color:#f97316;font-weight:600">Oslabení</span>')
    // Special usage
    .replace(/\{CONSUMED\.fh\}/g, '<span style="color:#ef4444;font-weight:600">Spotřebované</span>')
    .replace(/\{ROUND\}/g, '<span style="color:#5ba4cf;font-style:italic">Na jedno kolo</span>')
    .replace(/\{PERSISTENT\}/g, '<span style="color:#22c55e;font-style:italic">Trvalé</span>')
    // Modifiers
    .replace(/\{2X_MODIFIER\}/g, '<b style="color:#eab308">2\u00d7 modifik\u00e1tor</b>')
    .replace(/\{\+1_MODIFIER\}/g, '<b style="color:#22c55e">+1 modifik\u00e1tor</b>')
    .replace(/\{\+0_MODIFIER\}/g, '<b>+0 modifik\u00e1tor</b>')
    .replace(/\{\+2_MODIFIER\}/g, '<b style="color:#22c55e">+2 modifik\u00e1tor</b>')
    .replace(/\{-1_MODIFIER\}/g, '<b style="color:#ef4444">\u22121 modifik\u00e1tor</b>')
    .replace(/\{NULL_MODIFIER\}/g, '<b style="color:#ef4444">Nulov\u00fd modifik\u00e1tor</b>')
    .replace(/\{SMALL-ITEM\}/g, 'Mal\u00fd p\u0159edm\u011bt')
    .replace(/\{CHECK\}/g, '\u2714')
    // Element consume (X suffix) — must come before plain elements
    .replace(/\{FIRE_X\}/g, elDot('FIRE', true))
    .replace(/\{ICE_X\}/g, elDot('ICE', true))
    .replace(/\{WIND_X\}/g, elDot('WIND', true))
    .replace(/\{EARTH_X\}/g, elDot('EARTH', true))
    .replace(/\{LIGHT_X\}/g, elDot('LIGHT', true))
    .replace(/\{DARK_X\}/g, elDot('DARK', true))
    .replace(/\{ANY_X\}/g, elDot('ANY', true))
    // Compound elements (consume)
    .replace(/\{FIRE_OR_LIGHT_X\}/g, elDot('FIRE', true) + '/' + elDot('LIGHT', true))
    .replace(/\{ICE_OR_WIND_X\}/g, elDot('ICE', true) + '/' + elDot('WIND', true))
    .replace(/\{EARTH_OR_DARK_X\}/g, elDot('EARTH', true) + '/' + elDot('DARK', true))
    // Compound elements (create)
    .replace(/\{FIRE_OR_EARTH\}/g, elDot('FIRE') + '/' + elDot('EARTH'))
    .replace(/\{EARTH_OR_DARK\}/g, elDot('EARTH') + '/' + elDot('DARK'))
    .replace(/\{ICE_OR_WIND\}/g, elDot('ICE') + '/' + elDot('WIND'))
    .replace(/\{WIND_OR_EARTH\}/g, elDot('WIND') + '/' + elDot('EARTH'))
    .replace(/\{LIGHT_OR_DARK\}/g, elDot('LIGHT') + '/' + elDot('DARK'))
    // Plain elements
    .replace(/\{FIRE\}/g, elDot('FIRE'))
    .replace(/\{ICE\}/g, elDot('ICE'))
    .replace(/\{WIND\}/g, elDot('WIND'))
    .replace(/\{EARTH\}/g, elDot('EARTH'))
    .replace(/\{LIGHT\}/g, elDot('LIGHT'))
    .replace(/\{DARK\}/g, elDot('DARK'))
    .replace(/\{ANY\}/g, elDot('ANY'))
    // FH-specific icons — render as styled text
    .replace(/\{INFUSION_ICON\}/g, '<span style="color:#a78bfa" title="Infuze">&#9672;</span>')
    .replace(/\{RANGED_ICON\}/g, '<span style="color:#a78bfa" title="Na dálku">&#10148;</span>')
    .replace(/\{TRANSFER_ICON\}/g, '<span style="color:#5ba4cf" title="Transfer">&#8644;</span>')
    .replace(/\{PRESSURE_HIGH_ICON\}/g, '<span style="color:#ef4444" title="Vysoký tlak">&#9650;</span>')
    .replace(/\{PRESSURE_OVER_ICON\}/g, '<span style="color:#ef4444" title="Přetlak">&#9650;&#9650;</span>')
    .replace(/\{PRESSURE_LOW_ICON\}/g, '<span style="color:#5ba4cf" title="Nízký tlak">&#9660;</span>')
    .replace(/\{SHADOW_ICON\}/g, '<span style="color:#4a4a6a" title="Stín">&#9676;</span>')
    .replace(/\{RESONANCE_ICON\}/g, '<span style="color:#a78bfa" title="Rezonance">&#8776;</span>')
    .replace(/\{TIDE_ICON\}/g, '<span style="color:#5bc0de" title="Příliv">&#8767;</span>')
    .replace(/\{TIME_ICON\}/g, '<span style="color:#eab308" title="Čas">&#9200;</span>')
    // AOE patterns — simplified text
    .replace(/\{AOE\.CONE_0_1\}/g, '<span style="color:#a78bfa;font-style:italic">Kužel</span>')
    .replace(/\{AOE\.CONE_1_1\}/g, '<span style="color:#a78bfa;font-style:italic">Kužel</span>')
    .replace(/\{AOE\.LINE_0_1_1\}/g, '<span style="color:#a78bfa;font-style:italic">Linie</span>')

  return result
}

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

// --- Filtering ---
const filteredItems = computed(() => {
  return allItems.filter((item) => {
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

// --- Slot icon SVGs (inline, no external component needed) ---
const slotIcons: Record<string, string> = {
  Head: 'M12 2a5 5 0 0 0-5 5v1a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h.17A5 5 0 0 0 12 16a5 5 0 0 0 4.83-4H18a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1V7a5 5 0 0 0-5-5Z',
  Body: 'M12 2a3 3 0 0 0-3 3v1H6l-2 5v4h2v7h12v-7h2v-4l-2-5h-3V5a3 3 0 0 0-3-3Z',
  Legs: 'M8 2v6l-3 8v6h4v-6l3-4 3 4v6h4v-6l-3-8V2H8Z',
  'One Hand': 'M12 2C8.69 2 6 4.69 6 8c0 2.22 1.21 4.15 3 5.19V22h6v-8.81c1.79-1.04 3-2.97 3-5.19 0-3.31-2.69-6-6-6Z',
  'Two Hands': 'M7 2C4.79 2 3 3.79 3 6v4c0 1.86 1.28 3.41 3 3.86V22h4v-8.14c1.72-.45 3-2 3-3.86V6c0-2.21-1.79-4-4-4Zm10 0c-2.21 0-4 1.79-4 4v4c0 1.86 1.28 3.41 3 3.86V22h4v-8.14c1.72-.45 3-2 3-3.86V6c0-2.21-1.79-4-4-4Z',
  'Small Item': 'M12 2l3 6h6l-5 4 2 6-6-4-6 4 2-6-5-4h6Z',
}

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
        <!-- Card header -->
        <div class="item-card-header">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="font-display text-base font-bold text-fh-primary/80">{{ item.id }}</span>
              <div v-if="item.slot" class="flex items-center gap-1.5" :title="slotLabel(item.slot)">
                <svg class="w-4 h-4 text-fh-primary-dim" fill="currentColor" viewBox="0 0 24 24">
                  <path :d="slotIcons[item.slot] ?? slotIcons['Small Item']" />
                </svg>
                <span class="text-[10px] text-gray-500">{{ slotLabel(item.slot) }}</span>
              </div>
            </div>
            <!-- Cost -->
            <div class="item-cost">
              <span v-if="hasCraftingCost(item)" class="text-[10px] text-gray-400" v-html="formatResources(item.resources)"></span>
              <span v-else-if="(item as any).cost > 0" class="text-[11px] font-display font-bold text-amber-400">{{ (item as any).cost }} zl.</span>
              <span v-else-if="(item as any).cost === 0" class="text-[10px] text-gray-500">Zdarma</span>
            </div>
          </div>

          <!-- Item name -->
          <h3 class="font-display text-[13px] font-bold text-fh-frost tracking-wide leading-snug">
            {{ item.name }}
          </h3>
        </div>

        <!-- Card body - description -->
        <div class="item-card-body">
          <p class="text-[12px] text-gray-300 leading-relaxed" v-html="truncateDesc(item.desc)"></p>
        </div>

        <!-- Card footer -->
        <div class="item-card-footer">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] text-gray-500 truncate max-w-[70%]">{{ primarySource(item.source) }}</span>
            <span class="text-[10px] text-gray-500 shrink-0">{{ item.count }}× ve hře</span>
          </div>
          <!-- Usage type icons -->
          <div v-if="item.spent || item.consumed || item.lost" class="flex items-center gap-3 mt-1">
            <div v-if="item.spent" class="flex items-center gap-1" title="Vyčerpané — po odpočinku se vrátí">
              <svg class="w-3.5 h-3.5 text-fh-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183" />
              </svg>
              <span class="text-[10px] text-fh-primary/60">Obnova</span>
            </div>
            <div v-if="item.consumed" class="flex items-center gap-1" title="Spotřebované — po použití zmizí">
              <svg class="w-3.5 h-3.5 text-red-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span class="text-[10px] text-red-400/60">Spotřeba</span>
            </div>
            <div v-if="item.lost" class="flex items-center gap-1" title="Ztracené — nelze obnovit">
              <svg class="w-3.5 h-3.5 text-amber-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <span class="text-[10px] text-amber-400/60">Ztráta</span>
            </div>
          </div>
          <!-- Available count + owners -->
          <div v-if="campaignStore.hasCampaign" class="flex items-center justify-between mt-1.5">
            <span class="text-[9px] text-gray-600">
              {{ characterStore.getAvailableCount(String(item.id)) }}/{{ item.count }} volných
            </span>
            <button
              v-if="characterStore.activeCharacters.length > 0 && characterStore.getAvailableCount(String(item.id)) > 0"
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

            <!-- Header -->
            <div class="detail-header">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <span class="font-display text-2xl font-bold text-fh-primary/80">{{ detailItem.id }}</span>
                  <div v-if="detailItem.slot" class="flex items-center gap-2">
                    <svg class="w-5 h-5 text-fh-primary-dim" fill="currentColor" viewBox="0 0 24 24">
                      <path :d="slotIcons[detailItem.slot] ?? slotIcons['Small Item']" />
                    </svg>
                    <span class="text-sm text-gray-400">{{ slotLabel(detailItem.slot) }}</span>
                  </div>
                </div>
                <button
                  class="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.15] transition-all"
                  @click="detailItem = null"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <h2 class="font-display text-xl font-bold text-fh-frost tracking-wide">
                {{ detailItem.name }}
              </h2>
            </div>

            <!-- Description -->
            <div class="detail-body">
              <p class="text-sm text-gray-200 leading-relaxed" v-html="translateDescription(detailItem.desc)"></p>
              <!-- Back side description for flip items -->
              <div v-if="(detailItem as any).backDesc" class="mt-3 pt-3 border-t border-fh-border/50">
                <p class="text-[10px] text-fh-primary-dim uppercase tracking-wider mb-1">Druhá strana</p>
                <p class="text-sm text-gray-300 leading-relaxed" v-html="translateDescription((detailItem as any).backDesc)"></p>
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
                      <span>{{ resourceLabels[resource as string]?.icon ?? resource }}</span>
                      <span class="text-xs text-gray-500">{{ resourceLabels[resource as string]?.label ?? resource }}</span>
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
                    <svg class="w-4 h-4 text-fh-primary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183" />
                    </svg>
                    <span class="text-sm text-fh-primary/70">Vyčerpané</span>
                  </div>
                  <div v-if="detailItem.consumed" class="flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-red-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span class="text-sm text-red-400/70">Spotřebované</span>
                  </div>
                  <div v-if="detailItem.lost" class="flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <span class="text-sm text-amber-400/70">Ztracené</span>
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
/* Item card */
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

.item-card-header {
  padding: 0.875rem 1rem 0.5rem;
  border-bottom: 1px solid rgba(26, 39, 68, 0.4);
  background: linear-gradient(180deg, rgba(91, 164, 207, 0.04) 0%, transparent 100%);
}

.item-card-body {
  padding: 0.75rem 1rem;
  flex: 1;
  min-height: 3.5rem;
}

.item-card-footer {
  padding: 0.5rem 1rem 0.75rem;
  border-top: 1px solid rgba(26, 39, 68, 0.3);
  background: rgba(0, 0, 0, 0.15);
}

.item-cost {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Detail modal */
.detail-modal {
  background: linear-gradient(180deg, #0d1528 0%, #0a1020 100%);
  border: 1px solid rgba(91, 164, 207, 0.2);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(91, 164, 207, 0.08);
}

.detail-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(26, 39, 68, 0.5);
  background: linear-gradient(180deg, rgba(91, 164, 207, 0.05) 0%, transparent 100%);
}

.detail-body {
  padding: 1.25rem 1.5rem;
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
