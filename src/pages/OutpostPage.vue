<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaignStore'
import townGuardData from '@/data/town-guard.json'

const router = useRouter()
const campaignStore = useCampaignStore()

onMounted(() => {
  if (!campaignStore.hasCampaign) {
    router.replace('/kampan')
  }
})

const campaign = computed(() => campaignStore.currentCampaign)

// Resources (read-only display, same as PartyPage)
const materials = [
  { key: 'lumber', label: 'Drevo', color: 'bg-amber-900/40 border-amber-700/30 text-amber-200' },
  { key: 'metal', label: 'Kov', color: 'bg-slate-700/40 border-slate-500/30 text-slate-200' },
  { key: 'hide', label: 'Kuze', color: 'bg-orange-900/40 border-orange-700/30 text-orange-200' },
] as const

const herbs = [
  { key: 'arrowvine', label: 'Sipobyl', color: 'bg-green-900/40 border-green-700/30 text-green-200' },
  { key: 'axenut', label: 'Sekericnik', color: 'bg-lime-900/40 border-lime-700/30 text-lime-200' },
  { key: 'corpsecap', label: 'Mrtvolnik', color: 'bg-emerald-900/40 border-emerald-700/30 text-emerald-200' },
  { key: 'flamefruit', label: 'Plamenoplod', color: 'bg-teal-900/40 border-teal-700/30 text-teal-200' },
  { key: 'rockroot', label: 'Skalokoren', color: 'bg-cyan-900/40 border-cyan-700/30 text-cyan-200' },
  { key: 'snowthistle', label: 'Snehobodlak', color: 'bg-sky-900/40 border-sky-700/30 text-sky-200' },
] as const

type ResourceKey = 'lumber' | 'metal' | 'hide' | 'gold' | 'arrowvine' | 'axenut' | 'corpsecap' | 'flamefruit' | 'rockroot' | 'snowthistle'

function getResource(key: ResourceKey): number {
  return campaign.value?.resources[key] ?? 0
}

// Soldiers lost
function adjustSoldiersLost(delta: number) {
  if (!campaign.value) return
  campaign.value.soldiersLost = Math.max(0, campaign.value.soldiersLost + delta)
  campaignStore.autoSave()
}

// Town guard perks
const townGuardPerks = computed(() => townGuardData.perks)

// Perk type badge
function perkTypeBadge(type: string): { label: string; class: string } {
  if (type === 'replace') return { label: 'Nahradit', class: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25' }
  return { label: 'Pridat', class: 'bg-fh-completed/15 text-fh-completed border border-fh-completed/25' }
}

// Clean up perk descriptions (remove {TAG} patterns for display)
function cleanPerkDesc(desc: string): string {
  return desc.replace(/\{[^}]+\}/g, (match) => {
    const tag = match.slice(1, -1)
    if (tag.includes('_WHITE')) {
      const val = tag.replace('_WHITE', '').replace('AGAIN', '')
      return val || ''
    }
    return tag
  })
}

// Seasonal events
const season = ref<'summer' | 'winter'>('summer')
</script>

<template>
  <div v-if="!campaign" />

  <div v-else>
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost">Zakladna</h1>
    </div>

    <!-- Campaign Resources (read-only) -->
    <div class="fh-divider mb-4">Suroviny kampane</div>

    <h3 class="text-xs text-gray-500 uppercase tracking-wider mb-2">Materialy</h3>
    <div class="grid grid-cols-3 gap-2 mb-3">
      <div
        v-for="res in materials"
        :key="res.key"
        class="rounded-xl border p-3 text-center"
        :class="res.color"
      >
        <div class="text-lg font-bold">{{ getResource(res.key) }}</div>
        <div class="text-[10px] uppercase tracking-wider opacity-75">{{ res.label }}</div>
      </div>
    </div>

    <h3 class="text-xs text-gray-500 uppercase tracking-wider mb-2">Byliny</h3>
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
      <div
        v-for="res in herbs"
        :key="res.key"
        class="rounded-xl border p-3 text-center"
        :class="res.color"
      >
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

    <!-- Soldiers Lost -->
    <div class="fh-divider mb-4">Padli vojaci</div>
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
    <div class="fh-divider mb-4">Perky mestske hlicky</div>
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
            <p class="text-sm text-gray-300 leading-relaxed">
              {{ cleanPerkDesc(perk.desc) }}
            </p>
            <div class="flex items-center gap-3 mt-2">
              <span class="text-[10px] text-gray-500">
                Pocet: {{ perk.count }}x
              </span>
              <span class="text-[10px] text-gray-600">
                Sekce: {{ perk.sections.join(', ') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Seasonal Events -->
    <div class="fh-divider mb-4">Sezonni udalosti</div>
    <div class="fh-card p-5 mb-6">
      <!-- Season toggle -->
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
            Leto
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
        <p class="text-sm text-gray-500">Sprava sezonnych udalosti — pripravuje se</p>
        <p class="text-xs text-gray-600 mt-1">
          {{ season === 'summer' ? 'Letni udalosti (Summer Road / Summer Outpost)' : 'Zimni udalosti (Winter Road / Winter Outpost)' }}
        </p>
      </div>
    </div>

    <!-- Buildings -->
    <div class="fh-divider mb-4">Budovy</div>
    <div class="fh-card p-8 text-center mb-6">
      <svg class="w-16 h-16 mx-auto mb-4 text-fh-primary-dim" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <p class="text-sm text-gray-500">Jiz brzy</p>
      <p class="text-xs text-gray-600 mt-1">Sprava budov, vylepseni a opravy</p>
    </div>
  </div>
</template>
