<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaignStore'
import { useEventStore, type DeckId } from '@/stores/eventStore'
import EventCard from '@/components/EventCard.vue'
import TownSystems from '@/components/outpost/TownSystems.vue'
import townGuardData from '@/data/town-guard.json'
import buildingsData from '@/data/buildings.json'
import { computeTownGuardDeck, deckSize, cardLabel, type TownGuardCard } from '@/utils/townGuardDeck'

interface BuildingLevel {
  level: number
  operations?: string
  downtime?: string
  wrecked?: string
  passive?: string
  rewards?: string
}

interface BuildingDef {
  id: number
  name: string
  maxLevel: number
  levels: BuildingLevel[]
}

const router = useRouter()
const campaignStore = useCampaignStore()
const eventStore = useEventStore()
const buildings = buildingsData as BuildingDef[]

onMounted(() => {
  if (!campaignStore.hasCampaign) {
    router.replace('/kampan')
  }
})

const campaign = computed(() => campaignStore.currentCampaign)

// Resources
const materials = [
  { key: 'lumber', label: 'Dřevo', color: 'bg-amber-900/40 border-amber-700/30 text-amber-200' },
  { key: 'metal', label: 'Kov', color: 'bg-slate-700/40 border-slate-500/30 text-slate-200' },
  { key: 'hide', label: 'Kůže', color: 'bg-orange-900/40 border-orange-700/30 text-orange-200' },
] as const

const herbs = [
  { key: 'arrowvine', label: 'Šípobyl', color: 'bg-green-900/40 border-green-700/30 text-green-200' },
  { key: 'axenut', label: 'Sekeřičník', color: 'bg-lime-900/40 border-lime-700/30 text-lime-200' },
  { key: 'corpsecap', label: 'Mrtvolník', color: 'bg-emerald-900/40 border-emerald-700/30 text-emerald-200' },
  { key: 'flamefruit', label: 'Plamenoplod', color: 'bg-teal-900/40 border-teal-700/30 text-teal-200' },
  { key: 'rockroot', label: 'Skalokořen', color: 'bg-cyan-900/40 border-cyan-700/30 text-cyan-200' },
  { key: 'snowthistle', label: 'Sněhobodlák', color: 'bg-sky-900/40 border-sky-700/30 text-sky-200' },
] as const

type ResourceKey = 'lumber' | 'metal' | 'hide' | 'gold' | 'arrowvine' | 'axenut' | 'corpsecap' | 'flamefruit' | 'rockroot' | 'snowthistle'

function getResource(key: ResourceKey): number {
  return campaign.value?.resources[key] ?? 0
}

// Soldiers
function adjustSoldiers(delta: number) {
  if (!campaign.value) return
  campaign.value.soldiers = Math.max(0, (campaign.value.soldiers ?? 0) + delta)
  campaignStore.autoSave()
}

function adjustSoldiersLost(delta: number) {
  if (!campaign.value) return
  campaign.value.soldiersLost = Math.max(0, campaign.value.soldiersLost + delta)
  campaignStore.autoSave()
}

// Town guard perks
const townGuardPerks = computed(() => townGuardData.perks)

// ── Town Guard progrese: checkmarky → perk marky → použité perky ──
const PERK_MARKS = 15           // max perk marků
const CHECKS_PER_MARK = 3       // 3 checkmarky = 1 perk mark
const MAX_CHECKMARKS = PERK_MARKS * CHECKS_PER_MARK // 45

// Defenzivní přístup pro starší kampaně, kde townGuard ještě neexistuje.
function ensureTownGuard() {
  if (!campaign.value) return
  if (!campaign.value.townGuard) {
    campaign.value.townGuard = { checkmarks: 0, appliedPerks: {} }
  }
}

const checkmarks = computed(() => campaign.value?.townGuard?.checkmarks ?? 0)
const perkMarksEarned = computed(() => Math.floor(checkmarks.value / CHECKS_PER_MARK))
const perkMarksUsed = computed(() => {
  const applied = campaign.value?.townGuard?.appliedPerks ?? {}
  return Object.values(applied).reduce((sum, n) => sum + n, 0)
})
const perkMarksAvailable = computed(() => perkMarksEarned.value - perkMarksUsed.value)

// Kliknutí na políčko: nastaví počet checkmarků (toggle na posledním).
// Nedovolí snížit pod počet už použitých perků (perkMarksUsed × 3).
function setCheckmarks(target: number) {
  if (!campaign.value) return
  ensureTownGuard()
  const floor = perkMarksUsed.value * CHECKS_PER_MARK
  let next = target === campaign.value.townGuard.checkmarks ? target - 1 : target
  next = Math.max(floor, Math.min(MAX_CHECKMARKS, next))
  campaign.value.townGuard.checkmarks = next
  campaignStore.autoSave()
}

function perkAppliedCount(index: number): number {
  return campaign.value?.townGuard?.appliedPerks?.[index] ?? 0
}

function applyPerk(index: number) {
  if (!campaign.value) return
  ensureTownGuard()
  const perk = townGuardPerks.value[index]
  if (perkMarksAvailable.value <= 0) return
  if (perkAppliedCount(index) >= perk.count) return
  campaign.value.townGuard.appliedPerks[index] = perkAppliedCount(index) + 1
  campaignStore.autoSave()
}

function unapplyPerk(index: number) {
  if (!campaign.value) return
  ensureTownGuard()
  const current = perkAppliedCount(index)
  if (current <= 0) return
  campaign.value.townGuard.appliedPerks[index] = current - 1
  campaignStore.autoSave()
}

function perkTypeBadge(type: string): { label: string; class: string } {
  if (type === 'replace') return { label: 'Nahradit', class: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25' }
  return { label: 'Přidat', class: 'bg-fh-completed/15 text-fh-completed border border-fh-completed/25' }
}

function cleanPerkDesc(desc: string): string {
  return desc.replace(/\{[^}]+\}/g, (match) => {
    const tag = match.slice(1, -1)
    if (tag.includes('_WHITE')) return tag.replace('_WHITE', '').replace('AGAIN', '') || ''
    return tag
  })
}

// ── Town Guard modifier deck (base + aplikované perky) ──
const townGuardDeck = computed(() =>
  computeTownGuardDeck(campaign.value?.townGuard?.appliedPerks ?? {})
)
const townGuardDeckSize = computed(() => deckSize(townGuardDeck.value))

function cardClass(card: TownGuardCard): string {
  if (card.special === 'wreck') return 'bg-red-500/15 border-red-500/40 text-red-300'
  if (card.special === 'success') return 'bg-fh-completed/15 border-fh-completed/40 text-fh-completed'
  if (card.value > 0) return 'bg-fh-completed/10 border-fh-completed/30 text-fh-completed'
  if (card.value < 0) return 'bg-red-500/10 border-red-500/30 text-red-300'
  return 'bg-white/3 border-white/10 text-gray-300'
}

// ── Defense check (líznutí karty z Town Guard decku) ──
const drawWithAdvantage = ref(false)
const drawnCard = ref<TownGuardCard | null>(null)
const drawnSecondary = ref<TownGuardCard | null>(null)

// „Lepší" karta pro výhodu: success > vyšší hodnota > wreck.
function cardRank(c: TownGuardCard): number {
  if (c.special === 'success') return Infinity
  if (c.special === 'wreck') return -Infinity
  return c.value
}

function drawRandomCard(): TownGuardCard {
  const deck = townGuardDeck.value
  const total = townGuardDeckSize.value
  let roll = Math.floor(Math.random() * total)
  for (const entry of deck) {
    roll -= entry.count
    if (roll < 0) return entry.card
  }
  return deck[deck.length - 1].card
}

function drawDefenseCard() {
  const first = drawRandomCard()
  if (drawWithAdvantage.value) {
    const second = drawRandomCard()
    if (cardRank(second) > cardRank(first)) {
      drawnCard.value = second
      drawnSecondary.value = first
    } else {
      drawnCard.value = first
      drawnSecondary.value = second
    }
  } else {
    drawnCard.value = first
    drawnSecondary.value = null
  }
}

// Výsledek obrany = obrana města + hodnota karty (Wreck/Success řešeny zvlášť).
const defenseResult = computed(() => {
  if (!drawnCard.value || drawnCard.value.special) return null
  return (campaign.value?.totalDefense ?? 0) + drawnCard.value.value
})

// Season
const season = ref<'summer' | 'winter'>('summer')

// Event decks for current season
const seasonDecks = computed(() => eventStore.getDecksByType(season.value))

function handleDraw(deckId: DeckId) {
  eventStore.drawCard(deckId)
}

function handleResetDeck(deckId: DeckId) {
  if (confirm('Opravdu resetovat balíček na výchozí karty?')) {
    eventStore.resetDeck(deckId)
  }
}

// Add card modal
const showAddCard = ref<DeckId | null>(null)
const addCardNum = ref(1)

function handleAddCard() {
  if (showAddCard.value && addCardNum.value > 0) {
    eventStore.addCard(showAddCard.value, addCardNum.value)
    showAddCard.value = null
  }
}

// ── Buildings ──

function getBuildingLevel(id: number): number {
  return campaign.value?.buildingLevels?.[id] ?? 0
}

function setBuildingLevel(id: number, level: number) {
  if (!campaign.value) return
  if (!campaign.value.buildingLevels) campaign.value.buildingLevels = {}
  campaign.value.buildingLevels[id] = level
  campaignStore.autoSave()
}

function upgradeBuildingLevel(id: number, maxLevel: number) {
  const current = getBuildingLevel(id)
  if (current < maxLevel) setBuildingLevel(id, current + 1)
}

function downgradeBuildingLevel(id: number) {
  const current = getBuildingLevel(id)
  if (current > 0) setBuildingLevel(id, current - 1)
}

function getCurrentLevelData(building: BuildingDef): BuildingLevel | null {
  const level = getBuildingLevel(building.id)
  if (level === 0) return null
  return building.levels.find((l) => l.level === level) ?? null
}

interface UpgradeCost {
  prosperity: number
  lumber: number
  metal: number
  hide: number
  gold: number
}

function getNextUpgradeCost(building: BuildingDef): UpgradeCost | null {
  const currentLevel = getBuildingLevel(building.id)
  if (currentLevel >= building.maxLevel) return null
  const nextLvl = building.levels.find((l) => l.level === currentLevel + 1)
  return (nextLvl as any)?.upgradeCost ?? null
}

function hasEnough(resource: string, needed: number): boolean {
  const val = campaign.value?.resources[resource as keyof typeof campaign.value.resources] ?? 0
  return val >= needed
}

const expandedBuildingId = ref<number | null>(null)
function toggleBuilding(id: number) {
  expandedBuildingId.value = expandedBuildingId.value === id ? null : id
}

// Building card image for current level
function buildingImageUrl(id: number, level: number): string {
  return `/img/buildings/${id}-level-${level}.webp`
}

function buildingFrontUrl(id: number, level: number): string {
  return `/img/buildings/${id}-level-${level}-front.webp`
}

// Show building card modal
const cardModal = ref<{ id: number; level: number; side: 'main' | 'front' } | null>(null)

function showBuildingCard(id: number, level: number) {
  cardModal.value = { id, level, side: 'main' }
}

function toggleCardSide() {
  if (cardModal.value) {
    cardModal.value = {
      ...cardModal.value,
      side: cardModal.value.side === 'main' ? 'front' : 'main',
    }
  }
}

// Stats
const builtCount = computed(() => buildings.filter((b) => getBuildingLevel(b.id) > 0).length)
</script>

<template>
  <div v-if="!campaign" />

  <div v-else>
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost">Základna</h1>
    </div>

    <!-- Resources -->
    <div class="fh-divider mb-4">Suroviny kampaně</div>

    <h3 class="text-xs text-gray-500 uppercase tracking-wider mb-2">Materiály</h3>
    <div class="grid grid-cols-3 gap-2 mb-3">
      <div v-for="res in materials" :key="res.key" class="rounded-xl border p-3 text-center" :class="res.color">
        <div class="text-lg font-bold">{{ getResource(res.key) }}</div>
        <div class="text-[10px] uppercase tracking-wider opacity-75">{{ res.label }}</div>
      </div>
    </div>

    <h3 class="text-xs text-gray-500 uppercase tracking-wider mb-2">Byliny</h3>
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
      <div v-for="res in herbs" :key="res.key" class="rounded-xl border p-3 text-center" :class="res.color">
        <div class="text-lg font-bold">{{ getResource(res.key) }}</div>
        <div class="text-[10px] uppercase tracking-wider opacity-75">{{ res.label }}</div>
      </div>
    </div>

    <h3 class="text-xs text-gray-500 uppercase tracking-wider mb-2">Pokladna</h3>
    <div class="grid grid-cols-3 gap-2 mb-6">
      <div class="rounded-xl border p-3 text-center bg-yellow-900/40 border-yellow-600/30 text-yellow-200">
        <div class="text-lg font-bold">{{ getResource('gold') }}</div>
        <div class="text-[10px] uppercase tracking-wider opacity-75">Zlato</div>
      </div>
    </div>

    <!-- Buildings -->
    <div class="fh-divider mb-4">Budovy <span class="text-fh-primary ml-1">({{ builtCount }}/{{ buildings.length }})</span></div>
    <div class="space-y-2 mb-6">
      <div
        v-for="building in buildings"
        :key="building.id"
        class="fh-card overflow-hidden"
        :class="getBuildingLevel(building.id) > 0 ? 'border-fh-primary/20' : ''"
      >
        <!-- Building header -->
        <button
          class="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
          @click="toggleBuilding(building.id)"
        >
          <!-- Level circle -->
          <div
            class="w-10 h-10 rounded-lg border-2 flex items-center justify-center shrink-0 font-display font-bold text-sm transition-colors"
            :class="getBuildingLevel(building.id) > 0
              ? 'border-fh-primary bg-fh-primary/15 text-fh-primary'
              : 'border-fh-border bg-transparent text-gray-600'"
          >
            {{ getBuildingLevel(building.id) }}
          </div>

          <div class="flex-1 min-w-0">
            <h3 class="font-display text-sm font-semibold tracking-wide" :class="getBuildingLevel(building.id) > 0 ? 'text-gray-200' : 'text-gray-500'">
              {{ building.name }}
            </h3>
            <p class="text-[11px] text-gray-600">
              Level {{ getBuildingLevel(building.id) }} / {{ building.maxLevel }}
            </p>
          </div>

          <!-- Level bar -->
          <div class="w-16 h-1.5 bg-black/30 rounded-full overflow-hidden border border-fh-border/20 shrink-0">
            <div
              class="fh-progress-bar h-full transition-all duration-300"
              :style="{ width: (getBuildingLevel(building.id) / building.maxLevel * 100) + '%' }"
            />
          </div>

          <svg
            class="w-5 h-5 text-gray-600 shrink-0 transition-transform duration-200"
            :class="expandedBuildingId === building.id ? 'rotate-180' : ''"
            fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <!-- Expanded -->
        <div v-if="expandedBuildingId === building.id" class="border-t border-fh-border/30 p-4 space-y-3">
          <!-- Building card image -->
          <div class="flex justify-center">
            <img
              :src="buildingImageUrl(building.id, getBuildingLevel(building.id))"
              :alt="building.name + ' level ' + getBuildingLevel(building.id)"
              class="w-48 rounded-lg border border-fh-border/30 cursor-pointer hover:border-fh-primary/40 transition-all hover:shadow-lg hover:shadow-fh-primary/10"
              loading="lazy"
              @click="showBuildingCard(building.id, getBuildingLevel(building.id))"
              @error="($event.target as HTMLImageElement).style.display = 'none'"
            />
          </div>

          <!-- Level controls -->
          <div class="flex items-center justify-center gap-4">
            <button
              class="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-lg font-bold flex items-center justify-center disabled:opacity-30"
              :disabled="getBuildingLevel(building.id) === 0"
              @click="downgradeBuildingLevel(building.id)"
            >-</button>
            <div class="text-center w-20">
              <div class="font-display text-2xl font-bold text-fh-primary">{{ getBuildingLevel(building.id) }}</div>
              <div class="text-[10px] text-gray-600">/ {{ building.maxLevel }}</div>
            </div>
            <button
              class="w-9 h-9 rounded-lg bg-fh-primary/10 border border-fh-primary/20 text-fh-primary hover:bg-fh-primary/20 transition-colors text-lg font-bold flex items-center justify-center disabled:opacity-30"
              :disabled="getBuildingLevel(building.id) >= building.maxLevel"
              @click="upgradeBuildingLevel(building.id, building.maxLevel)"
            >+</button>
          </div>

          <!-- Next upgrade cost -->
          <div v-if="getNextUpgradeCost(building)" class="bg-white/[0.02] rounded-lg p-3 border border-fh-border/30">
            <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Cena vylepšení na level {{ getBuildingLevel(building.id) + 1 }}</div>
            <div class="flex flex-wrap gap-2">
              <span v-if="getNextUpgradeCost(building)!.prosperity" class="inline-flex items-center gap-1 text-xs text-yellow-400 bg-yellow-900/15 px-2 py-0.5 rounded border border-yellow-700/20">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2l2.5 5.5L18 8.5l-4 4 1 5.5L10 15.5 4.5 18l1-5.5-4-4 5.5-1z"/></svg>
                {{ getNextUpgradeCost(building)!.prosperity }}
              </span>
              <span v-if="getNextUpgradeCost(building)!.lumber" class="inline-flex items-center gap-1 text-xs text-amber-300 bg-amber-900/15 px-2 py-0.5 rounded border border-amber-700/20"
                :class="hasEnough('lumber', getNextUpgradeCost(building)!.lumber) ? '' : 'ring-1 ring-red-500/40'"
              >
                {{ getNextUpgradeCost(building)!.lumber }} dřevo
              </span>
              <span v-if="getNextUpgradeCost(building)!.metal" class="inline-flex items-center gap-1 text-xs text-slate-300 bg-slate-700/25 px-2 py-0.5 rounded border border-slate-500/20"
                :class="hasEnough('metal', getNextUpgradeCost(building)!.metal) ? '' : 'ring-1 ring-red-500/40'"
              >
                {{ getNextUpgradeCost(building)!.metal }} kov
              </span>
              <span v-if="getNextUpgradeCost(building)!.hide" class="inline-flex items-center gap-1 text-xs text-orange-300 bg-orange-900/15 px-2 py-0.5 rounded border border-orange-700/20"
                :class="hasEnough('hide', getNextUpgradeCost(building)!.hide) ? '' : 'ring-1 ring-red-500/40'"
              >
                {{ getNextUpgradeCost(building)!.hide }} kůže
              </span>
              <span v-if="getNextUpgradeCost(building)!.gold" class="inline-flex items-center gap-1 text-xs text-yellow-200 bg-yellow-900/15 px-2 py-0.5 rounded border border-yellow-600/20"
                :class="hasEnough('gold', getNextUpgradeCost(building)!.gold) ? '' : 'ring-1 ring-red-500/40'"
              >
                {{ getNextUpgradeCost(building)!.gold }} zl.
              </span>
            </div>
          </div>

          <!-- Current level info -->
          <template v-if="getCurrentLevelData(building)">
            <div class="space-y-2 text-sm">
              <div v-if="getCurrentLevelData(building)?.operations" class="flex gap-2">
                <span class="text-[11px] text-fh-primary font-medium shrink-0 mt-0.5">Operace:</span>
                <span class="text-gray-300">{{ getCurrentLevelData(building)?.operations }}</span>
              </div>
              <div v-if="getCurrentLevelData(building)?.downtime" class="flex gap-2">
                <span class="text-[11px] text-yellow-400 font-medium shrink-0 mt-0.5">Volný čas:</span>
                <span class="text-gray-300">{{ getCurrentLevelData(building)?.downtime }}</span>
              </div>
              <div v-if="getCurrentLevelData(building)?.passive" class="flex gap-2">
                <span class="text-[11px] text-green-400 font-medium shrink-0 mt-0.5">Pasivní:</span>
                <span class="text-gray-300">{{ getCurrentLevelData(building)?.passive }}</span>
              </div>
              <div v-if="getCurrentLevelData(building)?.wrecked" class="flex gap-2">
                <span class="text-[11px] text-red-400 font-medium shrink-0 mt-0.5">Zničeno:</span>
                <span class="text-gray-400">{{ getCurrentLevelData(building)?.wrecked }}</span>
              </div>
              <div v-if="getCurrentLevelData(building)?.rewards" class="flex gap-2">
                <span class="text-[11px] text-fh-frost font-medium shrink-0 mt-0.5">Odměny:</span>
                <span class="text-gray-300">{{ getCurrentLevelData(building)?.rewards }}</span>
              </div>
            </div>
          </template>
          <div v-else class="text-center text-sm text-gray-600 py-2">
            Budova zatím není postavená
          </div>

          <!-- All levels overview -->
          <details class="text-xs">
            <summary class="text-gray-600 cursor-pointer hover:text-gray-400 transition-colors">Všechny levely</summary>
            <div class="mt-2 space-y-1.5">
              <div
                v-for="lvl in building.levels"
                :key="lvl.level"
                class="flex items-start gap-2 p-1.5 rounded"
                :class="lvl.level === getBuildingLevel(building.id) ? 'bg-fh-primary/5' : ''"
              >
                <span class="font-display font-bold w-4 text-right shrink-0" :class="lvl.level <= getBuildingLevel(building.id) ? 'text-fh-primary' : 'text-gray-700'">{{ lvl.level }}</span>
                <div class="flex-1 min-w-0">
                  <span class="text-gray-500">
                    <template v-if="lvl.operations">{{ lvl.operations }}</template>
                    <template v-else-if="lvl.downtime">{{ lvl.downtime }}</template>
                    <template v-else-if="lvl.passive">{{ lvl.passive }}</template>
                    <template v-if="lvl.rewards"> — {{ lvl.rewards }}</template>
                  </span>
                  <div v-if="(lvl as any).upgradeCost" class="flex gap-1 mt-0.5 flex-wrap">
                    <span v-if="(lvl as any).upgradeCost.lumber" class="text-[9px] text-amber-400/70">{{ (lvl as any).upgradeCost.lumber }}D</span>
                    <span v-if="(lvl as any).upgradeCost.metal" class="text-[9px] text-slate-400/70">{{ (lvl as any).upgradeCost.metal }}K</span>
                    <span v-if="(lvl as any).upgradeCost.hide" class="text-[9px] text-orange-400/70">{{ (lvl as any).upgradeCost.hide }}Kž</span>
                    <span v-if="(lvl as any).upgradeCost.gold" class="text-[9px] text-yellow-400/70">{{ (lvl as any).upgradeCost.gold }}zl</span>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>

    <!-- Vojáci -->
    <div class="fh-divider mb-4">Vojáci</div>
    <div class="grid grid-cols-2 gap-3 mb-6">
      <!-- Aktuální vojáci -->
      <div class="fh-card p-5">
        <div class="flex items-center justify-center gap-3">
          <button
            class="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 transition-colors text-xl font-bold flex items-center justify-center"
            @click="adjustSoldiers(-1)"
          >-</button>
          <div class="text-center">
            <div class="font-display text-3xl font-bold text-fh-primary">{{ campaign.soldiers ?? 0 }}</div>
            <div class="text-[10px] text-gray-500 uppercase tracking-wider mt-1">k dispozici</div>
          </div>
          <button
            class="w-9 h-9 rounded-xl bg-fh-completed/15 border border-fh-completed/25 text-fh-completed hover:bg-fh-completed/25 transition-colors text-xl font-bold flex items-center justify-center"
            @click="adjustSoldiers(1)"
          >+</button>
        </div>
      </div>
      <!-- Padlí vojáci -->
      <div class="fh-card p-5">
        <div class="flex items-center justify-center gap-3">
          <button
            class="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 transition-colors text-xl font-bold flex items-center justify-center"
            @click="adjustSoldiersLost(-1)"
          >-</button>
          <div class="text-center">
            <div class="font-display text-3xl font-bold text-red-400">{{ campaign.soldiersLost }}</div>
            <div class="text-[10px] text-gray-500 uppercase tracking-wider mt-1">padlí</div>
          </div>
          <button
            class="w-9 h-9 rounded-xl bg-fh-completed/15 border border-fh-completed/25 text-fh-completed hover:bg-fh-completed/25 transition-colors text-xl font-bold flex items-center justify-center"
            @click="adjustSoldiersLost(1)"
          >+</button>
        </div>
      </div>
    </div>

    <!-- Town Guard Perks -->
    <div class="fh-divider mb-4">Perky městské hlídky</div>

    <!-- Souhrn perk marků + checkmark track -->
    <div class="fh-card p-5 mb-4">
      <div class="flex items-center justify-around text-center mb-4">
        <div>
          <div class="font-display text-3xl font-bold text-fh-primary">{{ perkMarksEarned }}</div>
          <div class="text-[10px] text-gray-500 uppercase tracking-wider mt-1">získané</div>
        </div>
        <div>
          <div class="font-display text-3xl font-bold text-gray-400">{{ perkMarksUsed }}</div>
          <div class="text-[10px] text-gray-500 uppercase tracking-wider mt-1">použité</div>
        </div>
        <div>
          <div
            class="font-display text-3xl font-bold"
            :class="perkMarksAvailable > 0 ? 'text-fh-completed' : 'text-gray-600'"
          >{{ perkMarksAvailable }}</div>
          <div class="text-[10px] text-gray-500 uppercase tracking-wider mt-1">k dispozici</div>
        </div>
      </div>

      <p class="text-[11px] text-gray-500 text-center mb-3">
        Každé 3 checkmarky = 1 perk mark (max {{ PERK_MARKS }})
      </p>

      <!-- Checkmark track: 15 skupin po 3 -->
      <div class="flex flex-wrap gap-x-3 gap-y-2 justify-center">
        <div
          v-for="g in PERK_MARKS"
          :key="g"
          class="flex items-center gap-1"
        >
          <button
            v-for="j in CHECKS_PER_MARK"
            :key="j"
            class="w-5 h-5 rounded-md border transition-colors flex items-center justify-center"
            :class="(g - 1) * CHECKS_PER_MARK + j <= checkmarks
              ? 'bg-fh-primary/25 border-fh-primary/50 text-fh-primary'
              : 'bg-white/3 border-white/10 text-transparent hover:border-fh-primary/30'"
            @click="setCheckmarks((g - 1) * CHECKS_PER_MARK + j)"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <!-- perk mark indikátor za každou trojicí -->
          <svg
            class="w-3.5 h-3.5 ml-0.5"
            :class="g <= perkMarksEarned ? 'text-fh-completed' : 'text-white/10'"
            fill="currentColor" viewBox="0 0 24 24"
          >
            <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7L12 2z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Seznam perků s aplikací -->
    <div class="space-y-2 mb-6">
      <div
        v-for="(perk, index) in townGuardPerks"
        :key="index"
        class="fh-card p-4 border-l-3 transition-colors"
        :class="perkAppliedCount(index) > 0 ? 'border-l-fh-completed/60' : 'border-l-fh-primary/30'"
      >
        <div class="flex items-start gap-3">
          <div class="shrink-0 mt-0.5">
            <span class="fh-badge text-[10px]" :class="perkTypeBadge(perk.type).class">
              {{ perkTypeBadge(perk.type).label }}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-300 leading-relaxed">{{ cleanPerkDesc(perk.desc) }}</p>
            <div class="flex items-center justify-between gap-3 mt-2.5">
              <span class="text-[10px] text-gray-600">Sekce: {{ perk.sections.join(', ') }}</span>
              <!-- Aplikační sloty -->
              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  v-for="p in perk.count"
                  :key="p"
                  class="w-6 h-6 rounded-md border transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="p <= perkAppliedCount(index)
                    ? 'bg-fh-completed/25 border-fh-completed/50 text-fh-completed'
                    : 'bg-white/3 border-white/10 text-gray-600 hover:border-fh-completed/30'"
                  :disabled="p > perkAppliedCount(index) && (perkMarksAvailable <= 0 || p !== perkAppliedCount(index) + 1)"
                  @click="p <= perkAppliedCount(index) ? unapplyPerk(index) : applyPerk(index)"
                >
                  <svg v-if="p <= perkAppliedCount(index)" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span v-else class="text-xs leading-none">+</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Town Guard Modifier Deck -->
    <div class="fh-divider mb-4">Balíček městské hlídky</div>
    <div class="fh-card p-5 mb-4">
      <div class="flex items-center justify-between mb-3">
        <p class="text-[11px] text-gray-500">
          Výsledné složení po aplikaci perků
        </p>
        <span class="fh-badge text-[10px] bg-fh-primary/15 text-fh-primary border border-fh-primary/25">
          {{ townGuardDeckSize }} karet
        </span>
      </div>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="(entry, i) in townGuardDeck"
          :key="i"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium"
          :class="cardClass(entry.card)"
        >
          <span class="font-display font-bold">{{ cardLabel(entry.card) }}</span>
          <span class="opacity-60 text-[10px]">×{{ entry.count }}</span>
        </div>
      </div>
    </div>

    <!-- Defense check -->
    <div class="fh-card p-5 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-display text-sm font-semibold text-gray-200">Obranný hod</h4>
        <label class="flex items-center gap-2 text-[11px] text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            v-model="drawWithAdvantage"
            class="w-4 h-4 rounded border-white/20 bg-white/5 accent-fh-primary"
          />
          Výhoda (voják)
        </label>
      </div>

      <div class="flex items-center gap-4">
        <button
          class="fh-btn-primary px-4 py-2.5 text-sm shrink-0"
          @click="drawDefenseCard"
        >Líznout kartu</button>

        <div v-if="drawnCard" class="flex items-center gap-3 flex-1 min-w-0">
          <div
            class="flex items-center justify-center px-3 py-2 rounded-lg border font-display font-bold"
            :class="cardClass(drawnCard)"
          >
            {{ cardLabel(drawnCard) }}
          </div>
          <div class="text-sm min-w-0">
            <template v-if="drawnCard.special === 'wreck'">
              <span class="text-red-400 font-semibold">Budova zničena</span>
            </template>
            <template v-else-if="drawnCard.special === 'success'">
              <span class="text-fh-completed font-semibold">Automatický úspěch</span>
            </template>
            <template v-else>
              <span class="text-gray-400">Obrana {{ campaign.totalDefense ?? 0 }} {{ drawnCard.value >= 0 ? '+' : '−' }} {{ Math.abs(drawnCard.value) }} = </span>
              <span class="font-display font-bold text-fh-primary text-base">{{ defenseResult }}</span>
            </template>
            <div v-if="drawnSecondary" class="text-[10px] text-gray-600 mt-0.5">
              (zahozeno: {{ cardLabel(drawnSecondary) }})
            </div>
          </div>
        </div>
        <p v-else class="text-[11px] text-gray-600 flex-1">
          Líznutá karta se přičte k obraně města ({{ campaign.totalDefense ?? 0 }}).
        </p>
      </div>
    </div>

    <!-- Seasonal Events -->
    <div class="fh-divider mb-4">Sezónní události</div>
    <div class="fh-card p-5 mb-6">
      <div class="flex gap-2 mb-4">
        <button
          class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
          :class="season === 'summer'
            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
            : 'bg-white/3 text-gray-500 border border-white/5 hover:text-gray-300'"
          @click="season = 'summer'"
        >
          <span class="flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 7a5 5 0 100 10 5 5 0 000-10zM12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            Léto
          </span>
        </button>
        <button
          class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
          :class="season === 'winter'
            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
            : 'bg-white/3 text-gray-500 border border-white/5 hover:text-gray-300'"
          @click="season = 'winter'"
        >
          <span class="flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
            Zima
          </span>
        </button>
      </div>
      <!-- Deck cards -->
      <div class="space-y-3">
        <div
          v-for="deck in seasonDecks"
          :key="deck.id"
          class="fh-card p-4"
        >
          <div class="flex items-center justify-between mb-3">
            <div>
              <h4 class="font-display text-sm font-semibold text-gray-200">{{ deck.def.name }}</h4>
              <p class="text-[11px] text-gray-500">
                {{ eventStore.availableCount(deck.id) }} karet v balíčku
                <span v-if="eventStore.removedCount(deck.id) > 0" class="text-gray-600">
                  · {{ eventStore.removedCount(deck.id) }} odebráno
                </span>
              </p>
            </div>
            <div class="flex items-center gap-1.5">
              <!-- Add card -->
              <button
                class="p-1.5 rounded-lg text-gray-600 hover:text-fh-primary hover:bg-fh-primary/10 transition-all"
                title="Přidat kartu"
                @click="showAddCard = deck.id"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
              <!-- Reset -->
              <button
                class="p-1.5 rounded-lg text-gray-600 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                title="Resetovat balíček"
                @click="handleResetDeck(deck.id)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Draw button -->
          <button
            class="w-full fh-btn-primary py-2.5 text-sm rounded-lg flex items-center justify-center gap-2 disabled:opacity-40"
            :disabled="eventStore.availableCount(deck.id) === 0"
            @click="handleDraw(deck.id)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v13.5a1.5 1.5 0 001.5 1.5z" />
            </svg>
            Lízni kartu
          </button>

          <!-- Progress bar -->
          <div class="mt-2 h-1 bg-black/30 rounded-full overflow-hidden border border-fh-border/20">
            <div
              class="fh-progress-bar h-full transition-all duration-300"
              :style="{ width: (eventStore.availableCount(deck.id) / Math.max(1, eventStore.availableCount(deck.id) + eventStore.removedCount(deck.id))) * 100 + '%' }"
            />
          </div>
        </div>
      </div>

      <!-- Add card modal -->
      <Teleport to="body">
        <transition name="modal">
          <div v-if="showAddCard" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/60" @click="showAddCard = null" />
            <div class="relative fh-card p-5 w-full max-w-xs space-y-4">
              <h3 class="font-display text-base font-semibold text-fh-frost">Přidat kartu</h3>
              <p class="text-xs text-gray-500">{{ eventStore.deckDefs[showAddCard]?.name }}</p>
              <div class="flex items-center gap-3">
                <label class="text-sm text-gray-400 shrink-0">Číslo:</label>
                <input
                  v-model.number="addCardNum"
                  type="number"
                  min="1"
                  :max="eventStore.deckDefs[showAddCard]?.totalCards ?? 99"
                  class="fh-input flex-1 text-center py-1.5"
                />
              </div>
              <div class="flex gap-2">
                <button class="flex-1 fh-btn-primary text-sm py-2 rounded-lg" @click="handleAddCard">Přidat</button>
                <button class="flex-1 fh-btn-ghost text-sm py-2 rounded-lg" @click="showAddCard = null">Zrušit</button>
              </div>
            </div>
          </div>
        </transition>
      </Teleport>
    </div>

    <!-- Odemykatelné městské systémy (zahrada, výzvy, zkoušky, mazlíčci) -->
    <TownSystems />

    <!-- EventCard overlay -->
    <EventCard />

    <!-- Building card modal -->
    <Teleport to="body">
      <transition name="modal">
        <div v-if="cardModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="cardModal = null" />
          <div class="relative z-10 w-full max-w-sm">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm text-gray-400 font-display">
                Level {{ cardModal.level }}
              </span>
              <div class="flex gap-2">
                <button
                  class="px-3 py-1 rounded-lg text-xs bg-fh-primary/10 text-fh-primary border border-fh-primary/20 hover:bg-fh-primary/20 transition-all"
                  @click="toggleCardSide"
                >
                  {{ cardModal.side === 'main' ? 'Detail →' : '← Budova' }}
                </button>
                <button class="text-gray-500 hover:text-gray-300 p-1" @click="cardModal = null">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <img
              v-if="cardModal.side === 'main'"
              :src="buildingImageUrl(cardModal.id, cardModal.level)"
              class="w-full rounded-xl shadow-2xl border border-fh-border"
              @click="toggleCardSide"
            />
            <img
              v-else
              :src="buildingFrontUrl(cardModal.id, cardModal.level)"
              class="w-full rounded-xl shadow-2xl border border-fh-border"
              @click="toggleCardSide"
            />
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>
