<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaignStore'
import { useCharacterStore } from '@/stores/characterStore'
import { useEventStore, type DeckId } from '@/stores/eventStore'
import { useToastStore } from '@/stores/toastStore'
import Stepper from '@/components/ui/Stepper.vue'
import {
  seasonForWeek,
  seasonLabel,
  moraleDefenseModifier,
} from '@/utils/campaignLoop'
import { computeTownGuardDeck, cardLabel, type TownGuardCard } from '@/utils/townGuardDeck'
import buildingsData from '@/data/buildings.json'

interface BuildingLevel {
  level: number
  operations?: string
  downtime?: string
  wrecked?: string
  passive?: string
  rewards?: string
  upgradeCost?: Record<string, number>
}
interface Building {
  id: number
  name: string
  maxLevel: number
  levels: BuildingLevel[]
}

const router = useRouter()
const campaignStore = useCampaignStore()
const characterStore = useCharacterStore()
const eventStore = useEventStore()
const toast = useToastStore()

const campaign = computed(() => campaignStore.currentCampaign)
const buildings = buildingsData as Building[]

onMounted(() => {
  if (!campaignStore.hasCampaign) router.replace('/kampan')
})

// ── Kroky průvodce ──
const STEPS = [
  { n: 1, label: 'Čas' },
  { n: 2, label: 'Událost' },
  { n: 3, label: 'Provoz budov' },
  { n: 4, label: 'Odpočinek' },
  { n: 5, label: 'Stavba' },
] as const

const step = ref(1)

// ── Krok 1: Passage of Time ──
const weekAdvanced = ref(false)
const seasonChanged = ref(false)

const currentWeek = computed(() => campaign.value?.calendarWeek ?? 1)
const currentSeason = computed(() => seasonForWeek(currentWeek.value))

const triggeredSections = computed(() => campaign.value?.calendarSections?.[currentWeek.value] ?? [])

function advanceWeek() {
  if (!campaign.value || weekAdvanced.value) return
  const oldSeason = seasonForWeek(campaign.value.calendarWeek)
  campaign.value.calendarWeek = Math.min(80, campaign.value.calendarWeek + 1)
  seasonChanged.value = seasonForWeek(campaign.value.calendarWeek) !== oldSeason
  weekAdvanced.value = true
  campaignStore.autoSave()
}

function markSectionRead(index: number) {
  if (!campaign.value) return
  const w = currentWeek.value
  campaign.value.calendarSections[w]?.splice(index, 1)
  if (campaign.value.calendarSections[w]?.length === 0) delete campaign.value.calendarSections[w]
  campaignStore.autoSave()
}

const availablePerkMarks = computed(() => {
  const tg = campaign.value?.townGuard
  if (!tg) return 0
  const earned = Math.floor(tg.checkmarks / 3)
  const used = Object.values(tg.appliedPerks).reduce((s, n) => s + (n ?? 0), 0)
  return Math.max(0, earned - used)
})

// ── Krok 2: Outpost event ──
const outpostDeckId = computed<DeckId>(() =>
  currentSeason.value === 'summer' ? 'summerOutpost' : 'winterOutpost',
)
const drawnEvent = computed(() => eventStore.drawnCard)
const isAttack = ref(false)

function drawEvent() {
  const num = eventStore.drawCard(outpostDeckId.value)
  if (num === null) toast.show('Balíček je prázdný', 'error')
  isAttack.value = false
}

// Defense check
const tgDeck = computed(() => computeTownGuardDeck(campaign.value?.townGuard?.appliedPerks ?? {}))
const defenseDraw = ref<{ cards: TownGuardCard[]; chosen: TownGuardCard } | null>(null)
const useAdvantage = ref(false)

const moraleDefense = computed(() => moraleDefenseModifier(campaign.value?.morale ?? 0))
const totalDefenseWithMorale = computed(() => (campaign.value?.totalDefense ?? 0) + moraleDefense.value)

function expandDeck(): TownGuardCard[] {
  return tgDeck.value.flatMap((e) => Array(e.count).fill(e.card) as TownGuardCard[])
}

function cardRank(c: TownGuardCard): number {
  if (c.special === 'success') return 1000
  if (c.special === 'wreck') return -1000
  return c.value
}

function drawDefense() {
  const pool = expandDeck()
  if (pool.length === 0) return
  const draw = () => pool[Math.floor(Math.random() * pool.length)]
  if (useAdvantage.value && campaign.value && campaign.value.soldiers > 0) {
    campaign.value.soldiers -= 1
    campaignStore.autoSave()
    const a = draw()
    const b = draw()
    defenseDraw.value = { cards: [a, b], chosen: cardRank(a) >= cardRank(b) ? a : b }
  } else {
    const c = draw()
    defenseDraw.value = { cards: [c], chosen: c }
  }
}

const defenseResult = computed(() => {
  const d = defenseDraw.value
  if (!d) return null
  if (d.chosen.special === 'success') return { label: 'Automatická obrana!', value: null }
  if (d.chosen.special === 'wreck') return { label: 'Budova je automaticky zničena (Wreck)!', value: null }
  return { label: null, value: totalDefenseWithMorale.value + d.chosen.value }
})

function resolveEvent(action: 'remove' | 'return') {
  if (!drawnEvent.value) return
  if (action === 'remove') {
    eventStore.removeCard(drawnEvent.value.deckId, drawnEvent.value.cardNum)
    toast.show('Karta odstraněna ze hry')
  } else {
    eventStore.returnCard()
    toast.show('Karta vrácena do balíčku')
  }
  defenseDraw.value = null
  isAttack.value = false
}

// ── Krok 3: Provoz budov ──
const builtBuildings = computed(() => {
  const levels = campaign.value?.buildingLevels ?? {}
  return buildings
    .filter((b) => (levels[b.id] ?? 0) > 0)
    .sort((a, b) => a.id - b.id)
    .map((b) => {
      const level = levels[b.id] ?? 0
      const levelData = b.levels.find((l) => l.level === level)
      return { ...b, level, levelData, isWrecked: isWrecked(b.id) }
    })
})

function isWrecked(id: number): boolean {
  return campaign.value?.wreckedBuildings?.includes(id) ?? false
}

function toggleWrecked(id: number) {
  if (!campaign.value) return
  const list = campaign.value.wreckedBuildings
  const idx = list.indexOf(id)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(id)
  campaignStore.autoSave()
}

// Rychlé přičtení surovin (produkce kempů / zahrady)
type ResKey = 'lumber' | 'metal' | 'hide' | 'arrowvine' | 'axenut' | 'corpsecap' | 'flamefruit' | 'rockroot' | 'snowthistle'
const resDefs: { key: ResKey; label: string }[] = [
  { key: 'lumber', label: 'Dřevo' },
  { key: 'metal', label: 'Kov' },
  { key: 'hide', label: 'Kůže' },
  { key: 'arrowvine', label: 'Šípobyl' },
  { key: 'axenut', label: 'Sekeřičník' },
  { key: 'corpsecap', label: 'Mrtvolník' },
  { key: 'flamefruit', label: 'Plamenoplod' },
  { key: 'rockroot', label: 'Skalokořen' },
  { key: 'snowthistle', label: 'Sněhobodlák' },
]

function setResource(key: ResKey, value: number) {
  if (!campaign.value) return
  campaign.value.resources[key] = Math.max(0, value)
  campaignStore.autoSave()
}

// ── Krok 4: Downtime ──
const XP_THRESHOLDS = [0, 45, 95, 150, 210, 275, 345, 420, 500]

const downtimeCharacters = computed(() =>
  characterStore.activeCharacters.map((c) => ({
    ...c,
    canLevelUp: c.level < 9 && c.xp >= XP_THRESHOLDS[c.level],
    prosperityLevel: Math.ceil((campaign.value?.prosperity ?? 0) / 2),
  })),
)

const tradingPost = computed(() => {
  const b = buildings.find((x) => x.name === 'Obchodní stanice')
  if (!b) return null
  const level = campaign.value?.buildingLevels?.[b.id] ?? 0
  return { ...b, level }
})

// ── Krok 5: Construction ──
const buildsUsed = ref(0)
const secondBuildMoraleCost = computed(() => {
  const carpenter = buildings.find((x) => x.name === 'Tesař')
  const level = carpenter ? (campaign.value?.buildingLevels?.[carpenter.id] ?? 0) : 0
  return level >= 2 ? 1 : 2
})

function registerBuild() {
  if (!campaign.value) return
  buildsUsed.value += 1
  if (buildsUsed.value > 1) {
    campaign.value.morale = Math.max(0, campaign.value.morale - secondBuildMoraleCost.value)
    campaignStore.autoSave()
    toast.show(`Druhá stavba: −${secondBuildMoraleCost.value} morálka`, 'info', () => {
      if (!campaign.value) return
      campaign.value.morale += secondBuildMoraleCost.value
      buildsUsed.value -= 1
      campaignStore.autoSave()
    })
  }
}

const wreckedList = computed(() =>
  (campaign.value?.wreckedBuildings ?? [])
    .map((id) => buildings.find((b) => b.id === id))
    .filter((b): b is Building => !!b),
)

// ── Dokončení ──
function finishPhase() {
  if (!campaign.value) return
  campaign.value.pendingPhase = 'scenario'
  campaignStore.autoSave()
  toast.show('Outpost fáze dokončena — vyberte další scénář')
  router.push('/scenare')
}
</script>

<template>
  <div v-if="campaign" class="max-w-3xl mx-auto">
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost tracking-wide">Outpost fáze</h1>
      <p class="text-sm text-gray-500 mt-1">Průvodce fází mezi scénáři — 5 kroků dle pravidel</p>
    </div>

    <!-- Step indicator -->
    <div class="flex items-center gap-1 mb-6 overflow-x-auto scrollbar-hide">
      <button
        v-for="s in STEPS"
        :key="s.n"
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
        :class="step === s.n
          ? 'bg-fh-primary/20 text-fh-primary border border-fh-primary/40'
          : step > s.n
            ? 'text-fh-completed'
            : 'text-gray-600'"
        @click="step = s.n"
      >
        <span
          class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border"
          :class="step > s.n
            ? 'bg-fh-completed/20 border-fh-completed/40'
            : step === s.n
              ? 'border-fh-primary/60'
              : 'border-gray-700'"
        >
          <template v-if="step > s.n">✓</template>
          <template v-else>{{ s.n }}</template>
        </span>
        {{ s.label }}
      </button>
    </div>

    <!-- ═══ Krok 1: Passage of Time ═══ -->
    <div v-if="step === 1" class="space-y-4 fh-animate-in">
      <div class="fh-card p-5">
        <h2 class="font-display text-lg font-semibold text-fh-frost mb-1">1. Běh času</h2>
        <p class="text-xs text-gray-500 mb-4">Označ další týden v kalendáři. Pokud box obsahuje čísla sekcí, ihned je přečti.</p>

        <div class="flex items-center justify-between mb-4">
          <div>
            <div class="fh-stat-label">Týden</div>
            <div class="font-display text-4xl font-bold text-fh-frost">{{ currentWeek }}<span class="text-lg text-gray-600">/80</span></div>
          </div>
          <div class="text-right">
            <div class="fh-stat-label">Sezóna</div>
            <div
              class="font-display text-2xl font-bold"
              :class="currentSeason === 'summer' ? 'text-amber-300' : 'text-sky-300'"
            >
              {{ currentSeason === 'summer' ? '☀' : '❄' }} {{ seasonLabel(currentSeason) }}
            </div>
          </div>
        </div>

        <button
          class="fh-btn-primary w-full py-3"
          :disabled="weekAdvanced"
          @click="advanceWeek"
        >
          {{ weekAdvanced ? 'Týden označen ✓' : 'Posunout čas o 1 týden' }}
        </button>

        <div v-if="weekAdvanced && seasonChanged" class="mt-3 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs text-sky-300">
          Sezóna se změnila na {{ seasonLabel(currentSeason).toLowerCase() }} — od teď se používají
          {{ currentSeason === 'summer' ? 'letní' : 'zimní' }} balíčky událostí.
        </div>

        <div v-if="weekAdvanced && triggeredSections.length" class="mt-3 rounded-lg border border-fh-required/40 bg-fh-required/10 p-3">
          <div class="text-xs font-semibold text-fh-required uppercase tracking-wide mb-2">⚠ Přečtěte sekce zapsané u tohoto týdne:</div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="(sec, i) in triggeredSections"
              :key="i"
              class="text-sm bg-black/30 border border-fh-required/40 text-fh-required rounded-md px-2.5 py-1 hover:bg-fh-required/20 transition-colors"
              title="Kliknutím označíte jako přečtené"
              @click="markSectionRead(i)"
            >
              {{ sec }} ✓
            </button>
          </div>
        </div>

        <div v-if="availablePerkMarks > 0" class="mt-3 rounded-lg border border-fh-primary/30 bg-fh-primary/5 px-3 py-2 text-xs text-fh-primary">
          Town Guard má {{ availablePerkMarks }} nevyužitých perk marků — můžete aplikovat perky na
          <router-link to="/outpost" class="underline">Základně</router-link>.
        </div>
      </div>
      <div class="flex justify-end">
        <button class="fh-btn-primary" @click="step = 2">Pokračovat →</button>
      </div>
    </div>

    <!-- ═══ Krok 2: Outpost event ═══ -->
    <div v-else-if="step === 2" class="space-y-4 fh-animate-in">
      <div class="fh-card p-5">
        <h2 class="font-display text-lg font-semibold text-fh-frost mb-1">2. Událost základny</h2>
        <p class="text-xs text-gray-500 mb-4">
          Lízni kartu z balíčku
          <strong>{{ eventStore.deckDefs[outpostDeckId].name }}</strong>
          ({{ eventStore.availableCount(outpostDeckId) }} karet).
          Pokud scénář/sekce řekly „tento týden událost přeskočte", pokračuj dál.
        </p>

        <button v-if="!drawnEvent" class="fh-btn-primary w-full py-3" @click="drawEvent">
          Líznout kartu události
        </button>

        <template v-else>
          <div class="rounded-xl overflow-hidden border border-fh-border mb-3 max-w-sm mx-auto">
            <img
              :src="eventStore.cardImageUrl(drawnEvent.deckId, drawnEvent.cardNum, drawnEvent.flipped ? 'b' : 'f')"
              :alt="`Událost ${drawnEvent.cardNum}`"
              class="w-full"
            />
          </div>
          <div class="flex flex-wrap gap-2 justify-center mb-4">
            <button class="fh-btn-secondary text-sm" @click="eventStore.flipCard()">
              Otočit kartu
            </button>
            <button
              class="fh-btn-ghost text-sm"
              :class="{ 'border-red-500/50 text-red-400': isAttack }"
              @click="isAttack = !isAttack"
            >
              {{ isAttack ? '⚔ Útok na základnu' : 'Je to útok?' }}
            </button>
          </div>

          <!-- Defense check -->
          <div v-if="isAttack" class="rounded-xl border border-red-500/30 bg-red-500/[0.04] p-4 mb-4">
            <h3 class="text-sm font-semibold text-red-300 mb-2">Obranný hod (za každou napadenou budovu jeden)</h3>
            <div class="grid grid-cols-3 gap-2 text-center mb-3">
              <div>
                <div class="fh-stat-label">Obrana</div>
                <div class="font-display text-xl font-bold text-gray-200">{{ campaign.totalDefense }}</div>
              </div>
              <div>
                <div class="fh-stat-label">Morálka</div>
                <div class="font-display text-xl font-bold" :class="moraleDefense >= 0 ? 'text-emerald-400' : 'text-red-400'">
                  {{ moraleDefense >= 0 ? '+' : '' }}{{ moraleDefense }}
                </div>
              </div>
              <div>
                <div class="fh-stat-label">Celkem</div>
                <div class="font-display text-xl font-bold text-fh-primary">{{ totalDefenseWithMorale }}</div>
              </div>
            </div>

            <label class="flex items-center gap-2 text-xs text-gray-400 mb-3 cursor-pointer">
              <input v-model="useAdvantage" type="checkbox" class="accent-[#5ba4cf]" :disabled="(campaign.soldiers ?? 0) === 0" />
              Utratit vojáka za výhodu (2 karty, lepší platí) — k dispozici: {{ campaign.soldiers ?? 0 }}
            </label>

            <button class="fh-btn-primary w-full text-sm py-2.5" @click="drawDefense">
              Líznout kartu Town Guard decku
            </button>

            <div v-if="defenseDraw" class="mt-3 text-center">
              <div class="flex justify-center gap-2 mb-2">
                <span
                  v-for="(c, i) in defenseDraw.cards"
                  :key="i"
                  class="fh-badge text-sm px-3 py-1.5"
                  :class="c === defenseDraw.chosen ? 'bg-fh-primary/25 text-fh-primary border border-fh-primary/50' : 'bg-black/30 text-gray-500 line-through'"
                >
                  {{ cardLabel(c) }}
                </span>
              </div>
              <div v-if="defenseResult" class="font-display text-lg font-bold" :class="defenseResult.value === null ? 'text-fh-required' : 'text-fh-frost'">
                <template v-if="defenseResult.label">{{ defenseResult.label }}</template>
                <template v-else>Výsledek obrany: {{ defenseResult.value }}</template>
              </div>
              <p v-if="defenseResult?.value !== null" class="text-[11px] text-gray-500 mt-1">
                ≥ hodnota útoku = ubráněno · jinak budova poškozena/zničena (označ v kroku 3)
              </p>
            </div>
          </div>

          <div class="flex gap-2">
            <button class="fh-btn-secondary flex-1 text-sm" @click="resolveEvent('remove')">
              Vyřešeno — odstranit ze hry
            </button>
            <button class="fh-btn-ghost flex-1 text-sm" @click="resolveEvent('return')">
              Vrátit do balíčku (ikona vrácení)
            </button>
          </div>
        </template>
      </div>
      <div class="flex justify-between">
        <button class="fh-btn-ghost" @click="step = 1">← Zpět</button>
        <button class="fh-btn-primary" @click="step = 3">Pokračovat →</button>
      </div>
    </div>

    <!-- ═══ Krok 3: Provoz budov ═══ -->
    <div v-else-if="step === 3" class="space-y-4 fh-animate-in">
      <div class="fh-card p-5">
        <h2 class="font-display text-lg font-semibold text-fh-frost mb-1">3. Provoz budov</h2>
        <p class="text-xs text-gray-500 mb-4">
          Projděte budovy v pořadí čísel a proveďte jejich efekty (kempy produkují suroviny,
          zahrada se sklízí…). Zničené budovy mají místo toho svůj „wrecked" efekt.
        </p>

        <div v-if="builtBuildings.length === 0" class="text-center text-sm text-gray-500 py-6">
          Zatím žádné postavené budovy — spravovat je můžete na <router-link to="/outpost" class="text-fh-primary underline">Základně</router-link>.
        </div>

        <div v-for="b in builtBuildings" :key="b.id" class="rounded-lg border p-3 mb-2"
          :class="b.isWrecked ? 'border-red-500/40 bg-red-500/[0.04]' : 'border-fh-border bg-black/15'"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="text-sm font-semibold" :class="b.isWrecked ? 'text-red-300' : 'text-gray-200'">
              {{ b.id }}. {{ b.name }} <span class="text-[10px] text-gray-500">lvl {{ b.level }}</span>
            </div>
            <button
              class="text-[10px] px-2 py-1 rounded-md border transition-colors"
              :class="b.isWrecked
                ? 'border-red-500/50 text-red-400 bg-red-500/10'
                : 'border-fh-border text-gray-500 hover:text-red-400 hover:border-red-500/40'"
              @click="toggleWrecked(b.id)"
            >
              {{ b.isWrecked ? 'Zničená ⚠' : 'Označit zničení' }}
            </button>
          </div>
          <p v-if="b.isWrecked && b.levelData?.wrecked" class="text-xs text-red-300/80 mt-1">
            Wrecked: {{ b.levelData.wrecked }}
          </p>
          <p v-else-if="b.levelData?.operations" class="text-xs text-gray-400 mt-1">
            {{ b.levelData.operations }}
          </p>
        </div>

        <!-- Quick resource entry -->
        <div class="mt-4 pt-4 border-t border-fh-border/40">
          <div class="text-xs text-gray-500 uppercase tracking-wider mb-3">Rychlý zápis vyprodukovaných surovin</div>
          <div class="grid grid-cols-3 gap-3">
            <div v-for="r in resDefs" :key="r.key" class="text-center">
              <Stepper
                small
                :model-value="campaign.resources[r.key]"
                :label="r.label"
                @update:model-value="(v) => setResource(r.key, v)"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="flex justify-between">
        <button class="fh-btn-ghost" @click="step = 2">← Zpět</button>
        <button class="fh-btn-primary" @click="step = 4">Pokračovat →</button>
      </div>
    </div>

    <!-- ═══ Krok 4: Downtime ═══ -->
    <div v-else-if="step === 4" class="space-y-4 fh-animate-in">
      <div class="fh-card p-5">
        <h2 class="font-display text-lg font-semibold text-fh-frost mb-1">4. Odpočinek (downtime)</h2>
        <p class="text-xs text-gray-500 mb-4">
          Postavy v libovolném pořadí: level up (povinný při dosažení XP), odchod do důchodu,
          výroba, vaření lektvarů, prodej a nákup předmětů.
        </p>

        <div v-for="c in downtimeCharacters" :key="c.uuid" class="rounded-lg border border-fh-border bg-black/15 p-3 mb-2">
          <div class="flex items-center justify-between">
            <div class="text-sm font-semibold text-gray-200">{{ c.playerName || 'Bezejmenný' }}</div>
            <div class="text-[11px] text-gray-500">lvl {{ c.level }} · {{ c.xp }} XP</div>
          </div>
          <div v-if="c.canLevelUp" class="mt-1 text-xs text-fh-completed font-semibold">
            ↑ Může (musí) levelovat! Nezapomeň: nová karta schopností, HP, perk mark.
          </div>
          <div v-else-if="c.level < c.prosperityLevel" class="mt-1 text-xs text-fh-primary">
            Prosperity leveling: může zdarma levelovat až na {{ c.prosperityLevel }}.
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <router-link to="/postavy" class="fh-btn-secondary text-xs text-center py-2 no-underline">Postavy</router-link>
          <router-link to="/crafting" class="fh-btn-secondary text-xs text-center py-2 no-underline">Výroba &amp; alchymie</router-link>
          <router-link to="/predmety" class="fh-btn-secondary text-xs text-center py-2 no-underline">Předměty</router-link>
          <router-link to="/osobni-ukoly" class="fh-btn-secondary text-xs text-center py-2 no-underline">Osobní úkoly</router-link>
        </div>

        <div v-if="tradingPost" class="mt-3 text-[11px] text-gray-500">
          <template v-if="tradingPost.level > 0">
            Nákup předmětů: max <strong class="text-gray-300">{{ tradingPost.level }}</strong> ks tuto fázi (level Obchodní stanice).
          </template>
          <template v-else>
            Nákup předmětů je zamčený, dokud nestojí Obchodní stanice (výjimka: startovní zlato nové postavy).
          </template>
        </div>
      </div>
      <div class="flex justify-between">
        <button class="fh-btn-ghost" @click="step = 3">← Zpět</button>
        <button class="fh-btn-primary" @click="step = 5">Pokračovat →</button>
      </div>
    </div>

    <!-- ═══ Krok 5: Stavba ═══ -->
    <div v-else class="space-y-4 fh-animate-in">
      <div class="fh-card p-5">
        <h2 class="font-display text-lg font-semibold text-fh-frost mb-1">5. Stavba</h2>
        <p class="text-xs text-gray-500 mb-4">
          Standardně <strong>1 stavba nebo vylepšení</strong>; druhá stojí
          {{ secondBuildMoraleCost }} morálky. Suroviny se platí ze zásob Frosthavenu
          (inspirace nahrazuje materiál 1:1). Nakonec můžete opravit libovolný počet zničených budov.
          Samotné levely spravujete na <router-link to="/outpost" class="text-fh-primary underline">Základně</router-link>.
        </p>

        <div class="flex items-center justify-between rounded-lg border border-fh-border bg-black/15 p-3 mb-3">
          <div class="text-sm text-gray-300">Staveb/vylepšení tuto fázi: <strong class="font-display text-fh-frost">{{ buildsUsed }}</strong></div>
          <button class="fh-btn-secondary text-xs" @click="registerBuild">
            + Zaznamenat stavbu{{ buildsUsed >= 1 ? ` (−${secondBuildMoraleCost} morálka)` : '' }}
          </button>
        </div>

        <div v-if="wreckedList.length" class="rounded-lg border border-red-500/30 bg-red-500/[0.04] p-3">
          <div class="text-xs font-semibold text-red-300 mb-2">Zničené budovy k opravě (po stavbě):</div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="b in wreckedList"
              :key="b.id"
              class="text-xs border border-red-500/40 text-red-300 rounded-md px-2 py-1 hover:bg-fh-completed/10 hover:border-fh-completed/40 hover:text-fh-completed transition-colors"
              title="Kliknutím označit jako opravenou"
              @click="toggleWrecked(b.id)"
            >
              {{ b.name }} — opravit ✓
            </button>
          </div>
        </div>
      </div>

      <div class="flex justify-between">
        <button class="fh-btn-ghost" @click="step = 4">← Zpět</button>
        <button class="fh-btn-primary py-3 px-6" @click="finishPhase">
          Dokončit outpost fázi ✓
        </button>
      </div>
    </div>
  </div>
</template>
