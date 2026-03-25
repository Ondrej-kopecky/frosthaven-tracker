<script setup lang="ts">
import { computed } from 'vue'
import { useCampaignStore } from '@/stores/campaignStore'
import { useCharacterStore } from '@/stores/characterStore'
import ClassIcon from '@/components/characters/ClassIcon.vue'

const campaignStore = useCampaignStore()
const characterStore = useCharacterStore()

const campaign = computed(() => campaignStore.currentCampaign)
const activeMembers = computed(() => characterStore.activeCharacters)

// Resource definitions
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

const goldDef = { key: 'gold', label: 'Zlato', color: 'bg-yellow-900/40 border-yellow-600/30 text-yellow-200' } as const

type ResourceKey = 'lumber' | 'metal' | 'hide' | 'gold' | 'arrowvine' | 'axenut' | 'corpsecap' | 'flamefruit' | 'rockroot' | 'snowthistle'

function getResource(key: ResourceKey): number {
  return campaign.value?.resources[key] ?? 0
}

function adjustResource(key: ResourceKey, delta: number) {
  if (!campaign.value) return
  const val = campaign.value.resources[key] + delta
  campaign.value.resources[key] = Math.max(0, val)
  campaignStore.autoSave()
}

function adjustMorale(delta: number) {
  if (!campaign.value) return
  const val = Math.min(20, Math.max(-10, campaign.value.morale + delta))
  campaign.value.morale = val
  campaignStore.autoSave()
}

function adjustProsperity(delta: number) {
  if (!campaign.value) return
  campaign.value.prosperity = Math.max(0, campaign.value.prosperity + delta)
  campaignStore.autoSave()
}

function adjustInspiration(delta: number) {
  if (!campaign.value) return
  campaign.value.inspiration = Math.max(0, campaign.value.inspiration + delta)
  campaignStore.autoSave()
}

function adjustDefense(delta: number) {
  if (!campaign.value) return
  campaign.value.totalDefense = Math.max(0, (campaign.value.totalDefense ?? 0) + delta)
  campaignStore.autoSave()
}

function adjustWeek(delta: number) {
  if (!campaign.value) return
  campaign.value.calendarWeek = Math.max(1, Math.min(80, (campaign.value.calendarWeek ?? 1) + delta))
  campaignStore.autoSave()
}

// Season: weeks 1-20 summer, 21-40 winter, 41-60 summer, 61-80 winter
const currentSeason = computed(() => {
  const w = campaign.value?.calendarWeek ?? 1
  return ((Math.ceil(w / 20) - 1) % 2 === 0) ? 'summer' : 'winter'
})

const seasonLabel = computed(() => currentSeason.value === 'summer' ? 'Léto' : 'Zima')

const seasonSection = computed(() => {
  const w = campaign.value?.calendarWeek ?? 1
  return Math.ceil(w / 20) // 1-4
})

// Scenario level calculator
const scenarioLevel = computed(() => {
  const chars = activeMembers.value
  if (chars.length === 0) return 0
  const avgLevel = chars.reduce((sum, c) => sum + c.level, 0) / chars.length
  return Math.ceil(avgLevel / 2)
})

function updatePartyName(e: Event) {
  if (!campaign.value) return
  campaign.value.party.name = (e.target as HTMLInputElement).value
  campaignStore.autoSave()
}

function updatePartyNotes(e: Event) {
  if (!campaign.value) return
  campaign.value.party.notes = (e.target as HTMLTextAreaElement).value
  campaignStore.autoSave()
}

const classColors: Record<string, string> = {
  df: '#8B7355', bb: '#C0C0C0', bn: '#CD853F', dw: '#4A0080',
  bo: '#2F4F4F', ge: '#FF6347', if: '#4169E1', py: '#FF4500',
  sh: '#DA70D6', ta: '#228B22', pc: '#8B0000', sd: '#87CEEB',
  ff: '#00CED1', hv: '#FFD700', me: '#708090', dt: '#191970',
  cr: '#20B2AA',
}

function getClassName(classId: string): string {
  const def = characterStore.getDefinition(classId)
  return def?.name ?? classId
}

// Morale bar calculation
const moralePercent = computed(() => {
  const val = campaign.value?.morale ?? 0
  // Range -10 to +20, map to 0-100%
  return ((val + 10) / 30) * 100
})

const moraleColor = computed(() => {
  const val = campaign.value?.morale ?? 0
  if (val < -3) return 'bg-red-500'
  if (val < 3) return 'bg-yellow-500'
  if (val < 10) return 'bg-fh-primary'
  return 'bg-fh-completed'
})
</script>

<template>
  <div v-if="!campaign" class="fh-card p-8 text-center text-gray-500">
    <p class="text-sm">Nejprve vytvoř kampaň.</p>
  </div>

  <div v-else>
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost">Družina</h1>
    </div>

    <!-- Party name -->
    <div class="mb-6">
      <label class="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Název družiny</label>
      <input
        type="text"
        class="fh-input w-full sm:w-80"
        placeholder="Pojmenuj svou družinu..."
        :value="campaign.party.name"
        @input="updatePartyName"
      />
    </div>

    <!-- Active members -->
    <div class="fh-divider mb-4">Aktivní členové</div>

    <div v-if="activeMembers.length === 0" class="fh-card p-6 text-center text-gray-500 mb-6">
      <p class="text-sm">Žádné aktivní postavy. Přidej je na stránce Postavy.</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
      <div
        v-for="char in activeMembers"
        :key="char.uuid"
        class="fh-card p-4 flex items-center gap-4 border-l-3 border-l-fh-primary"
      >
        <div class="w-12 h-12 rounded-full bg-fh-primary/15 border border-fh-primary/30 flex items-center justify-center shrink-0">
          <span class="font-display text-fh-primary text-lg font-bold">{{ char.level }}</span>
        </div>
        <div class="min-w-0">
          <div class="text-sm font-semibold text-gray-200 truncate">{{ char.playerName || 'Bezejmenný' }}</div>
          <div class="flex items-center gap-1.5 text-xs text-fh-primary-dim">
            <ClassIcon :class-id="char.classId" :size="16" :color="classColors[char.classId] ?? '#5ba4cf'" />
            {{ getClassName(char.classId) }}
          </div>
          <div class="text-[10px] text-gray-500 mt-0.5">Level {{ char.level }} &middot; {{ char.xp }} XP &middot; {{ char.gold }} zl.</div>
        </div>
      </div>
    </div>

    <!-- Calendar + Season + Scenario Level -->
    <div class="fh-divider mb-4">Kalendář &amp; Sezóna</div>

    <div class="fh-card p-5 mb-6">
      <!-- Week counter -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Týden</div>
          <div class="flex items-center gap-3">
            <button
              class="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 transition-colors text-sm font-bold flex items-center justify-center"
              @click="adjustWeek(-1)"
            >-</button>
            <div class="font-display text-3xl font-bold text-fh-frost min-w-[3rem] text-center">
              {{ campaign.calendarWeek ?? 1 }}
            </div>
            <button
              class="w-7 h-7 rounded-lg bg-fh-completed/15 border border-fh-completed/25 text-fh-completed hover:bg-fh-completed/25 transition-colors text-sm font-bold flex items-center justify-center"
              @click="adjustWeek(1)"
            >+</button>
            <span class="text-xs text-gray-600">/ 80</span>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Sezóna</div>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold"
              :class="currentSeason === 'summer'
                ? 'bg-amber-900/30 border border-amber-600/30 text-amber-300'
                : 'bg-sky-900/30 border border-sky-600/30 text-sky-300'"
            >
              <svg v-if="currentSeason === 'summer'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>
              <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.34 2.02C6.59 1.82 2 6.42 2 12c0 5.52 4.48 10 10 10 3.71 0 6.93-2.02 8.66-5.02A7.95 7.95 0 0 1 12 20a8 8 0 0 1-8-8c0-3.72 2.56-6.83 6-7.73a9.3 9.3 0 0 1 2.34-2.25z"/></svg>
              {{ seasonLabel }}
            </span>
            <span class="text-[10px] text-gray-600">sekce {{ seasonSection }}/4</span>
          </div>
        </div>
      </div>

      <!-- Calendar grid -->
      <div class="grid gap-px" style="grid-template-columns: repeat(20, minmax(0, 1fr))">
        <div
          v-for="w in 80"
          :key="w"
          class="aspect-square rounded-sm text-[7px] flex items-center justify-center font-medium cursor-pointer transition-all"
          :class="[
            w === (campaign.calendarWeek ?? 1)
              ? 'ring-1 ring-fh-primary bg-fh-primary/30 text-white'
              : w < (campaign.calendarWeek ?? 1)
                ? 'bg-white/[0.06] text-gray-500'
                : 'bg-white/[0.02] text-gray-700',
            (Math.ceil(w / 20) - 1) % 2 === 0
              ? 'border-b border-amber-800/10'
              : 'border-b border-sky-800/10'
          ]"
          :title="`Týden ${w} — ${(Math.ceil(w / 20) - 1) % 2 === 0 ? 'Léto' : 'Zima'}`"
          @click="campaign.calendarWeek = w; campaignStore.autoSave()"
        >
          {{ w }}
        </div>
      </div>
      <div class="flex justify-between text-[9px] text-gray-600 mt-1">
        <span class="text-amber-400/50">Léto 1-20</span>
        <span class="text-sky-400/50">Zima 21-40</span>
        <span class="text-amber-400/50">Léto 41-60</span>
        <span class="text-sky-400/50">Zima 61-80</span>
      </div>
    </div>

    <!-- Scenario Level + Defense -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <!-- Scenario level calculator -->
      <div class="fh-card p-5">
        <div class="fh-stat-label mb-2">Úroveň scénáře</div>
        <div class="font-display text-3xl font-bold text-center" :class="scenarioLevel > 0 ? 'text-fh-primary' : 'text-gray-600'">
          {{ scenarioLevel }}
        </div>
        <p class="text-[10px] text-gray-600 text-center mt-1">
          {{ activeMembers.length > 0 ? `⌀ level ${(activeMembers.reduce((s, c) => s + c.level, 0) / activeMembers.length).toFixed(1)} / 2` : 'Žádné postavy' }}
        </p>
      </div>

      <!-- Total Defense -->
      <div class="fh-card p-5">
        <div class="fh-stat-label mb-2">Celková obrana</div>
        <div class="flex items-center justify-center gap-3">
          <button
            class="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 transition-colors text-sm font-bold flex items-center justify-center"
            @click="adjustDefense(-1)"
          >-</button>
          <div class="font-display text-3xl font-bold text-emerald-400">{{ campaign.totalDefense ?? 0 }}</div>
          <button
            class="w-7 h-7 rounded-lg bg-fh-completed/15 border border-fh-completed/25 text-fh-completed hover:bg-fh-completed/25 transition-colors text-sm font-bold flex items-center justify-center"
            @click="adjustDefense(1)"
          >+</button>
        </div>
      </div>
    </div>

    <!-- Morale -->
    <div class="fh-divider mb-4">Morálka</div>

    <div class="fh-card p-5 mb-6">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <button
            class="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 transition-colors text-lg font-bold flex items-center justify-center"
            @click="adjustMorale(-1)"
          >-</button>
          <div class="font-display text-3xl font-bold text-fh-frost min-w-[3rem] text-center">
            {{ campaign.morale }}
          </div>
          <button
            class="w-8 h-8 rounded-lg bg-fh-completed/15 border border-fh-completed/25 text-fh-completed hover:bg-fh-completed/25 transition-colors text-lg font-bold flex items-center justify-center"
            @click="adjustMorale(1)"
          >+</button>
        </div>
        <div class="text-xs text-gray-500">-10 / +20</div>
      </div>
      <div class="h-2.5 rounded-full bg-black/30 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="moraleColor"
          :style="{ width: moralePercent + '%' }"
        ></div>
      </div>
      <div class="flex justify-between text-[10px] text-gray-600 mt-1">
        <span>-10</span>
        <span>0</span>
        <span>+20</span>
      </div>
    </div>

    <!-- Prosperity & Inspiration -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="fh-card p-5">
        <div class="fh-stat-label mb-2">Prosperita</div>
        <div class="flex items-center justify-center gap-3">
          <button
            class="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 transition-colors text-sm font-bold flex items-center justify-center"
            @click="adjustProsperity(-1)"
          >-</button>
          <div class="font-display text-3xl font-bold text-yellow-400">{{ campaign.prosperity }}</div>
          <button
            class="w-7 h-7 rounded-lg bg-fh-completed/15 border border-fh-completed/25 text-fh-completed hover:bg-fh-completed/25 transition-colors text-sm font-bold flex items-center justify-center"
            @click="adjustProsperity(1)"
          >+</button>
        </div>
      </div>

      <div class="fh-card p-5">
        <div class="fh-stat-label mb-2">Inspirace</div>
        <div class="flex items-center justify-center gap-3">
          <button
            class="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 transition-colors text-sm font-bold flex items-center justify-center"
            @click="adjustInspiration(-1)"
          >-</button>
          <div class="font-display text-3xl font-bold text-fh-primary-light">{{ campaign.inspiration }}</div>
          <button
            class="w-7 h-7 rounded-lg bg-fh-completed/15 border border-fh-completed/25 text-fh-completed hover:bg-fh-completed/25 transition-colors text-sm font-bold flex items-center justify-center"
            @click="adjustInspiration(1)"
          >+</button>
        </div>
      </div>
    </div>

    <!-- Campaign Resources -->
    <div class="fh-divider mb-4">Suroviny</div>

    <!-- Materials -->
    <h3 class="text-xs text-gray-500 uppercase tracking-wider mb-2">Materiály</h3>
    <div class="grid grid-cols-3 gap-2 mb-4">
      <div
        v-for="res in materials"
        :key="res.key"
        class="rounded-xl border p-3 text-center"
        :class="res.color"
      >
        <div class="text-lg font-bold">{{ getResource(res.key) }}</div>
        <div class="text-[10px] uppercase tracking-wider opacity-75 mb-2">{{ res.label }}</div>
        <div class="flex justify-center gap-1.5">
          <button
            class="w-6 h-6 rounded bg-black/25 text-xs font-bold hover:bg-black/40 transition-colors flex items-center justify-center"
            @click="adjustResource(res.key, -1)"
          >-</button>
          <button
            class="w-6 h-6 rounded bg-black/25 text-xs font-bold hover:bg-black/40 transition-colors flex items-center justify-center"
            @click="adjustResource(res.key, 1)"
          >+</button>
        </div>
      </div>
    </div>

    <!-- Herbs -->
    <h3 class="text-xs text-gray-500 uppercase tracking-wider mb-2">Byliny</h3>
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
      <div
        v-for="res in herbs"
        :key="res.key"
        class="rounded-xl border p-3 text-center"
        :class="res.color"
      >
        <div class="text-lg font-bold">{{ getResource(res.key) }}</div>
        <div class="text-[10px] uppercase tracking-wider opacity-75 mb-2">{{ res.label }}</div>
        <div class="flex justify-center gap-1.5">
          <button
            class="w-6 h-6 rounded bg-black/25 text-xs font-bold hover:bg-black/40 transition-colors flex items-center justify-center"
            @click="adjustResource(res.key, -1)"
          >-</button>
          <button
            class="w-6 h-6 rounded bg-black/25 text-xs font-bold hover:bg-black/40 transition-colors flex items-center justify-center"
            @click="adjustResource(res.key, 1)"
          >+</button>
        </div>
      </div>
    </div>

    <!-- Gold -->
    <h3 class="text-xs text-gray-500 uppercase tracking-wider mb-2">Pokladna</h3>
    <div class="grid grid-cols-3 gap-2 mb-6">
      <div
        class="rounded-xl border p-3 text-center"
        :class="goldDef.color"
      >
        <div class="text-lg font-bold">{{ getResource('gold') }}</div>
        <div class="text-[10px] uppercase tracking-wider opacity-75 mb-2">{{ goldDef.label }}</div>
        <div class="flex justify-center gap-1.5">
          <button
            class="w-6 h-6 rounded bg-black/25 text-xs font-bold hover:bg-black/40 transition-colors flex items-center justify-center"
            @click="adjustResource('gold', -1)"
          >-</button>
          <button
            class="w-6 h-6 rounded bg-black/25 text-xs font-bold hover:bg-black/40 transition-colors flex items-center justify-center"
            @click="adjustResource('gold', 1)"
          >+</button>
        </div>
      </div>
    </div>

    <!-- Party Notes -->
    <div class="fh-divider mb-4">Poznámky</div>

    <div class="mb-6">
      <textarea
        class="fh-input w-full min-h-[6rem] resize-y"
        placeholder="Poznámky k družině..."
        :value="campaign.party.notes"
        @input="updatePartyNotes"
      ></textarea>
    </div>
  </div>
</template>
