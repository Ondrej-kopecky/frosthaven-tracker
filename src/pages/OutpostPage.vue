<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaignStore'
import townGuardData from '@/data/town-guard.json'
import buildingsData from '@/data/buildings.json'

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
function adjustSoldiersLost(delta: number) {
  if (!campaign.value) return
  campaign.value.soldiersLost = Math.max(0, campaign.value.soldiersLost + delta)
  campaignStore.autoSave()
}

// Town guard perks
const townGuardPerks = computed(() => townGuardData.perks)

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

// Season
const season = ref<'summer' | 'winter'>('summer')

// ── Buildings ──

// Building levels stored in campaign (buildingLevels: Record<number, number>)
function getBuildingLevel(id: number): number {
  const levels = (campaign.value as Record<string, unknown>)?.buildingLevels as Record<number, number> | undefined
  return levels?.[id] ?? 0
}

function setBuildingLevel(id: number, level: number) {
  if (!campaign.value) return
  const c = campaign.value as Record<string, unknown>
  if (!c.buildingLevels) c.buildingLevels = {}
  ;(c.buildingLevels as Record<number, number>)[id] = level
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

const expandedBuildingId = ref<number | null>(null)
function toggleBuilding(id: number) {
  expandedBuildingId.value = expandedBuildingId.value === id ? null : id
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
                <span class="text-gray-500">
                  <template v-if="lvl.operations">{{ lvl.operations }}</template>
                  <template v-else-if="lvl.downtime">{{ lvl.downtime }}</template>
                  <template v-else-if="lvl.passive">{{ lvl.passive }}</template>
                  <template v-if="lvl.rewards"> — {{ lvl.rewards }}</template>
                </span>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>

    <!-- Soldiers Lost -->
    <div class="fh-divider mb-4">Padlí vojáci</div>
    <div class="fh-card p-5 mb-6">
      <div class="flex items-center justify-center gap-4">
        <button
          class="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 transition-colors text-xl font-bold flex items-center justify-center"
          @click="adjustSoldiersLost(-1)"
        >-</button>
        <div class="text-center">
          <div class="font-display text-4xl font-bold text-red-400">{{ campaign.soldiersLost }}</div>
          <div class="text-[10px] text-gray-500 uppercase tracking-wider mt-1">ztraceno</div>
        </div>
        <button
          class="w-10 h-10 rounded-xl bg-fh-completed/15 border border-fh-completed/25 text-fh-completed hover:bg-fh-completed/25 transition-colors text-xl font-bold flex items-center justify-center"
          @click="adjustSoldiersLost(1)"
        >+</button>
      </div>
    </div>

    <!-- Town Guard Perks -->
    <div class="fh-divider mb-4">Perky městské hlídky</div>
    <div class="space-y-2 mb-6">
      <div
        v-for="(perk, index) in townGuardPerks"
        :key="index"
        class="fh-card p-4 border-l-3 border-l-fh-primary/30"
      >
        <div class="flex items-start gap-3">
          <div class="shrink-0 mt-0.5">
            <span class="fh-badge text-[10px]" :class="perkTypeBadge(perk.type).class">
              {{ perkTypeBadge(perk.type).label }}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-300 leading-relaxed">{{ cleanPerkDesc(perk.desc) }}</p>
            <div class="flex items-center gap-3 mt-2">
              <span class="text-[10px] text-gray-500">Počet: {{ perk.count }}x</span>
              <span class="text-[10px] text-gray-600">Sekce: {{ perk.sections.join(', ') }}</span>
            </div>
          </div>
        </div>
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
      <div class="text-center py-6">
        <svg class="w-12 h-12 mx-auto mb-3 text-fh-primary-dim" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p class="text-sm text-gray-500">Správa sezónních událostí — připravuje se</p>
        <p class="text-xs text-gray-600 mt-1">
          {{ season === 'summer' ? 'Letní události (Summer Road / Summer Outpost)' : 'Zimní události (Winter Road / Winter Outpost)' }}
        </p>
      </div>
    </div>
  </div>
</template>
