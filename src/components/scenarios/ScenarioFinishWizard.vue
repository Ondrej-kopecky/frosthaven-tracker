<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import Stepper from '@/components/ui/Stepper.vue'
import { useCampaignStore } from '@/stores/campaignStore'
import { useCharacterStore } from '@/stores/characterStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useToastStore } from '@/stores/toastStore'
import { inspirationGain, coinConversion, scenarioLevel } from '@/utils/campaignLoop'

const props = defineProps<{
  open: boolean
  scenarioId: number | null
}>()

const emit = defineEmits<{ close: []; finished: [] }>()

const campaignStore = useCampaignStore()
const characterStore = useCharacterStore()
const scenarioStore = useScenarioStore()
const toast = useToastStore()

const campaign = computed(() => campaignStore.currentCampaign)
const definition = computed(() =>
  props.scenarioId !== null ? scenarioStore.getDefinition(props.scenarioId) : null,
)

const chars = computed(() => characterStore.activeCharacters)

const level = computed(() => scenarioLevel(chars.value.map((c) => c.level)))
const conversion = computed(() => coinConversion(level.value))
const inspiration = computed(() => inspirationGain(chars.value.length))

// ── Stav průvodce ──
const step = ref(1)
const TOTAL_STEPS = 4

// Krok 1: loot — mince (na postavu) + suroviny do zásob
const coinsPerChar = ref<Record<string, number>>({})
type ResKey = 'lumber' | 'metal' | 'hide' | 'arrowvine' | 'axenut' | 'corpsecap' | 'flamefruit' | 'rockroot' | 'snowthistle'
const lootResources = ref<Record<ResKey, number>>({
  lumber: 0, metal: 0, hide: 0,
  arrowvine: 0, axenut: 0, corpsecap: 0, flamefruit: 0, rockroot: 0, snowthistle: 0,
})
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

// Krok 2: battle goals (0–2 checkmarky na postavu)
const checkmarksPerChar = ref<Record<string, number>>({})

// Krok 3: výzvy (challenges) — každá: +2 XP všem, +1 TG checkmark
const challengesCompleted = ref(0)

watch(
  () => props.open,
  (open) => {
    if (open) {
      step.value = 1
      coinsPerChar.value = {}
      checkmarksPerChar.value = {}
      challengesCompleted.value = 0
      lootResources.value = {
        lumber: 0, metal: 0, hide: 0,
        arrowvine: 0, axenut: 0, corpsecap: 0, flamefruit: 0, rockroot: 0, snowthistle: 0,
      }
    }
  },
)

function finish() {
  if (!campaign.value || props.scenarioId === null) return

  // 1. Loot: zlato postavám (mince × konverze), suroviny do zásob Frosthavenu
  for (const c of chars.value) {
    const coins = coinsPerChar.value[c.uuid] ?? 0
    c.gold += coins * conversion.value
  }
  for (const r of resDefs) {
    campaign.value.resources[r.key] += lootResources.value[r.key]
  }

  // 2. Battle goals: checkmarky (strop 18)
  for (const c of chars.value) {
    const marks = checkmarksPerChar.value[c.uuid] ?? 0
    c.checks = Math.min(18, (c.checks ?? 0) + marks)
  }

  // 3. Výzvy: +2 XP všem postavám a +1 TG checkmark za každou (strop 45)
  if (challengesCompleted.value > 0) {
    for (const c of chars.value) {
      c.xp += challengesCompleted.value * 2
    }
    campaign.value.townGuard.checkmarks = Math.min(
      45,
      campaign.value.townGuard.checkmarks + challengesCompleted.value,
    )
  }

  // 4. Inspirace
  campaign.value.inspiration += inspiration.value

  campaignStore.autoSave()
  toast.show(`Scénář uzavřen — +${inspiration.value} inspirace`)
  emit('finished')
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="`Dokončení scénáře ${scenarioId ?? ''}${definition?.name ? ' — ' + definition.name : ''}`"
    max-width="max-w-xl"
    @close="emit('close')"
  >
    <!-- Progress -->
    <div class="flex gap-1 mb-4">
      <div
        v-for="s in TOTAL_STEPS"
        :key="s"
        class="h-1 flex-1 rounded-full transition-colors"
        :class="s <= step ? 'bg-fh-primary' : 'bg-white/10'"
      />
    </div>

    <!-- Krok 1: Loot -->
    <div v-if="step === 1" class="space-y-4">
      <div>
        <h3 class="font-display text-base font-semibold text-fh-frost">1. Kořist z loot karet</h3>
        <p class="text-xs text-gray-500 mt-0.5">
          Mince se převádí kurzem <strong class="text-gray-300">1 mince = {{ conversion }} zlata</strong>
          (úroveň scénáře {{ level }}). Suroviny jdou do zásob.
        </p>
      </div>

      <div v-for="c in chars" :key="c.uuid" class="flex items-center justify-between gap-3">
        <span class="text-sm text-gray-300 flex-1 truncate">{{ c.playerName || 'Bezejmenný' }}</span>
        <div class="flex items-center gap-2">
          <Stepper
            small
            :model-value="coinsPerChar[c.uuid] ?? 0"
            :max="30"
            @update:model-value="(v) => (coinsPerChar[c.uuid] = v)"
          />
          <span class="text-[11px] text-yellow-400 w-16 text-right">
            +{{ (coinsPerChar[c.uuid] ?? 0) * conversion }} zl.
          </span>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 pt-2 border-t border-fh-border/40">
        <div v-for="r in resDefs" :key="r.key" class="text-center">
          <Stepper
            small
            :label="r.label"
            :model-value="lootResources[r.key]"
            :max="20"
            @update:model-value="(v) => (lootResources[r.key] = v)"
          />
        </div>
      </div>
    </div>

    <!-- Krok 2: Battle goals -->
    <div v-else-if="step === 2" class="space-y-4">
      <div>
        <h3 class="font-display text-base font-semibold text-fh-frost">2. Bojové cíle (battle goals)</h3>
        <p class="text-xs text-gray-500 mt-0.5">
          Kdo splnil svůj tajný cíl, získává checkmarky z karty (1–2).
          Každé 3 checkmarky = 1 perk mark (strop 18).
        </p>
      </div>
      <div v-for="c in chars" :key="c.uuid" class="flex items-center justify-between gap-3">
        <span class="text-sm text-gray-300 flex-1 truncate">
          {{ c.playerName || 'Bezejmenný' }}
          <span class="text-[10px] text-gray-600">({{ c.checks ?? 0 }}/18)</span>
        </span>
        <Stepper
          small
          :model-value="checkmarksPerChar[c.uuid] ?? 0"
          :max="2"
          @update:model-value="(v) => (checkmarksPerChar[c.uuid] = v)"
        />
      </div>
      <p class="text-[11px] text-gray-600 pt-2 border-t border-fh-border/40">
        Nezapomeňte i na <strong>mistrovství (masteries)</strong> — splněná mistrovství
        označte u postavy (každé dává 1 perk mark, jednou za život postavy).
      </p>
    </div>

    <!-- Krok 3: Výzvy -->
    <div v-else-if="step === 3" class="space-y-4">
      <div>
        <h3 class="font-display text-base font-semibold text-fh-frost">3. Výzvy (challenges)</h3>
        <p class="text-xs text-gray-500 mt-0.5">
          Pokud hrajete s Radnicí: za každou splněnou výzvu +2 XP každé postavě
          a +1 checkmark Town Guardu. (Bez Radnice nechte 0.)
        </p>
      </div>
      <div class="flex items-center justify-center">
        <Stepper
          label="Splněné výzvy"
          :model-value="challengesCompleted"
          :max="3"
          @update:model-value="(v) => (challengesCompleted = v)"
        />
      </div>
      <p v-if="challengesCompleted > 0" class="text-xs text-center text-fh-primary">
        → +{{ challengesCompleted * 2 }} XP všem postavám, +{{ challengesCompleted }} TG checkmark
      </p>
    </div>

    <!-- Krok 4: Souhrn -->
    <div v-else class="space-y-4">
      <div>
        <h3 class="font-display text-base font-semibold text-fh-frost">4. Odměny a závěr</h3>
        <p class="text-xs text-gray-500 mt-0.5">
          Přečtěte závěr scénáře v knize. Odměny scénáře (achievementy, odemčení) se aplikují automaticky.
        </p>
      </div>

      <div class="rounded-lg border border-fh-border bg-black/20 p-3 space-y-1.5 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-400">Inspirace (4 − {{ chars.length }} postavy)</span>
          <span class="text-fh-primary-light font-semibold">+{{ inspiration }}</span>
        </div>
        <div v-for="c in chars" :key="c.uuid" class="flex justify-between text-xs">
          <span class="text-gray-500">{{ c.playerName || 'Bezejmenný' }}</span>
          <span class="text-gray-400">
            +{{ (coinsPerChar[c.uuid] ?? 0) * conversion }} zl.
            · +{{ checkmarksPerChar[c.uuid] ?? 0 }} ✓
            <template v-if="challengesCompleted"> · +{{ challengesCompleted * 2 }} XP</template>
          </span>
        </div>
      </div>

      <p class="text-[11px] text-gray-600">
        Po potvrzení se scénář označí jako dokončený a na Přehledu se objeví výzva k outpost fázi.
        Pokud pokračujete <strong>propojeným (linked) scénářem</strong>, outpost fázi přeskočte.
      </p>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <button
          class="fh-btn-ghost text-sm"
          @click="step > 1 ? step-- : emit('close')"
        >
          {{ step > 1 ? '← Zpět' : 'Zrušit' }}
        </button>
        <button
          v-if="step < TOTAL_STEPS"
          class="fh-btn-primary text-sm"
          @click="step++"
        >
          Pokračovat →
        </button>
        <button
          v-else
          class="fh-btn-primary text-sm"
          @click="finish"
        >
          Dokončit scénář ✓
        </button>
      </div>
    </template>
  </BaseModal>
</template>
