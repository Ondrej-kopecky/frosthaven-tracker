<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useCampaignStore } from '@/stores/campaignStore'
import { useCharacterStore } from '@/stores/characterStore'
import { useToastStore } from '@/stores/toastStore'
import questsData from '@/data/personal-quests.json'

const props = defineProps<{
  open: boolean
  characterUuid: string | null
}>()

const emit = defineEmits<{ close: []; retired: [] }>()

const campaignStore = useCampaignStore()
const characterStore = useCharacterStore()
const toast = useToastStore()

const campaign = computed(() => campaignStore.currentCampaign)
const character = computed(() =>
  props.characterUuid ? characterStore.getCharacter(props.characterUuid) : undefined,
)
const className = computed(() =>
  character.value ? characterStore.getDefinition(character.value.classId)?.name ?? '' : '',
)

/** PQ přiřazený této postavě (podle jména hráče) */
const assignedQuest = computed(() => {
  if (!campaign.value || !character.value) return null
  const entry = Object.entries(campaign.value.personalQuests ?? {}).find(
    ([, state]) => state.assigned === character.value?.playerName,
  )
  if (!entry) return null
  const quest = (questsData as { id: number; name: string; building_unlocks: number[] }[])
    .find((q) => q.id === Number(entry[0]))
  return quest ? { ...quest, completed: entry[1].completed } : null
})

const isFirstOfClass = computed(() => {
  if (!campaign.value || !character.value) return false
  return !campaign.value.archivedCharacters.some(
    (c) => c.classId === character.value?.classId,
  )
})

const totalResources = computed(() => {
  const r = character.value?.resources
  if (!r) return 0
  return Object.values(r).reduce((s, n) => s + n, 0)
})

const step = ref(1)
const secondQuest = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      step.value = 1
      secondQuest.value = false
    }
  },
)

const canAffordSecondQuest = computed(() => (campaign.value?.inspiration ?? 0) >= 15)

function finish() {
  if (!campaign.value || !character.value || !props.characterUuid) return
  const name = character.value.playerName || className.value

  if (secondQuest.value && canAffordSecondQuest.value) {
    campaign.value.inspiration -= 15
    campaign.value.prosperity += 2
  }

  characterStore.retireCharacter(props.characterUuid, { applyRewards: true })
  toast.show(`${name} odešel/a do důchodu — +${secondQuest.value ? 4 : 2} prosperita`)
  emit('retired')
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="`Odchod do důchodu — ${character?.playerName || className}`"
    max-width="max-w-lg"
    @close="emit('close')"
  >
    <div class="flex gap-1 mb-4">
      <div
        v-for="s in 3"
        :key="s"
        class="h-1 flex-1 rounded-full transition-colors"
        :class="s <= step ? 'bg-fh-primary' : 'bg-white/10'"
      />
    </div>

    <!-- Krok 1: Kontrola -->
    <div v-if="step === 1" class="space-y-3">
      <h3 class="font-display text-base font-semibold text-fh-frost">1. Než odejde…</h3>
      <p class="text-xs text-gray-500">
        Odchod je povinný po splnění osobního úkolu (jen během downtime).
        Před odchodem může postava ještě craftit, prodávat a nakupovat.
      </p>

      <div class="rounded-lg border border-fh-border bg-black/20 p-3 space-y-2 text-sm">
        <div v-if="assignedQuest" class="flex items-center justify-between">
          <span class="text-gray-400">Osobní úkol: {{ assignedQuest.name }}</span>
          <span
            class="fh-badge"
            :class="assignedQuest.completed
              ? 'bg-fh-completed/15 text-fh-completed'
              : 'bg-fh-required/15 text-fh-required'"
          >
            {{ assignedQuest.completed ? 'Splněn ✓' : 'Nesplněn!' }}
          </span>
        </div>
        <div v-else class="text-gray-500 text-xs">
          Postava nemá přiřazený osobní úkol (přiřazuje se na stránce Osobní úkoly).
        </div>
        <div class="flex justify-between text-xs">
          <span class="text-gray-500">Zlato (propadá)</span>
          <span class="text-yellow-400">{{ character?.gold ?? 0 }} zl.</span>
        </div>
        <div class="flex justify-between text-xs">
          <span class="text-gray-500">Suroviny (→ zásoby Frosthavenu)</span>
          <span class="text-gray-300">{{ totalResources }} ks</span>
        </div>
        <div class="flex justify-between text-xs">
          <span class="text-gray-500">Předměty</span>
          <span class="text-gray-300">{{ character?.items.length ?? 0 }} (vrátí se do nabídky)</span>
        </div>
      </div>
    </div>

    <!-- Krok 2: Odměny a odemčení -->
    <div v-else-if="step === 2" class="space-y-3">
      <h3 class="font-display text-base font-semibold text-fh-frost">2. Odměny a odemčení</h3>

      <div class="rounded-lg border border-fh-border bg-black/20 p-3 space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-400">Prosperita</span>
          <span class="text-yellow-400 font-semibold">+2</span>
        </div>
        <div v-if="assignedQuest?.building_unlocks?.length" class="text-xs text-gray-400">
          🏠 Otevřete obálku budovy z osobního úkolu:
          <strong class="text-fh-primary">{{ assignedQuest.building_unlocks.join(' / ') }}</strong>
          (pokud už je zabraná, vezměte alternativu; jsou-li obě, náhodný scénář + náhodný item blueprint).
        </div>
        <div v-if="isFirstOfClass" class="text-xs text-fh-primary">
          ✨ První odchod třídy {{ className }} — přečtěte sekci na zadní straně matu postavy
          (často odemyká novou třídu).
        </div>
        <div class="text-xs text-gray-500">
          📖 Zapište postavu do tabulky odchodů na kampaňovém listu. Nová postava hráče
          dostane bonusové perk marky (= počet jeho odchodů) a startovní zlato 10×prosperita+20.
        </div>
      </div>

      <label
        class="flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-colors"
        :class="secondQuest
          ? 'border-fh-primary/50 bg-fh-primary/5'
          : canAffordSecondQuest ? 'border-fh-border' : 'border-fh-border opacity-50 cursor-not-allowed'"
      >
        <input
          v-model="secondQuest"
          type="checkbox"
          class="mt-0.5 accent-[#5ba4cf]"
          :disabled="!canAffordSecondQuest"
        />
        <span class="text-xs text-gray-300">
          Utratit <strong>15 inspirace</strong> za okamžité splnění druhého osobního úkolu
          (+2 prosperita a další obálka).
          <span class="text-gray-500">K dispozici: {{ campaign?.inspiration ?? 0 }}</span>
        </span>
      </label>
    </div>

    <!-- Krok 3: Souhrn -->
    <div v-else class="space-y-3">
      <h3 class="font-display text-base font-semibold text-fh-frost">3. Potvrzení</h3>
      <div class="rounded-lg border border-fh-border bg-black/20 p-3 space-y-1.5 text-sm">
        <div class="flex justify-between"><span class="text-gray-400">Prosperita</span><span class="text-yellow-400">+{{ secondQuest ? 4 : 2 }}</span></div>
        <div v-if="secondQuest" class="flex justify-between"><span class="text-gray-400">Inspirace</span><span class="text-red-400">−15</span></div>
        <div class="flex justify-between text-xs"><span class="text-gray-500">Suroviny do zásob</span><span class="text-gray-300">+{{ totalResources }}</span></div>
        <div class="flex justify-between text-xs"><span class="text-gray-500">Zlato propadá</span><span class="text-gray-500">−{{ character?.gold ?? 0 }}</span></div>
      </div>
      <p class="text-[11px] text-gray-600">
        Postava se přesune do archivu (Síň slávy). Akce je nevratná.
      </p>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <button class="fh-btn-ghost text-sm" @click="step > 1 ? step-- : emit('close')">
          {{ step > 1 ? '← Zpět' : 'Zrušit' }}
        </button>
        <button v-if="step < 3" class="fh-btn-primary text-sm" @click="step++">Pokračovat →</button>
        <button
          v-else
          class="text-sm font-semibold rounded-[0.625rem] px-4 py-2 bg-gradient-to-br from-red-600 to-red-800 text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all"
          @click="finish"
        >
          Odejít do důchodu ✓
        </button>
      </div>
    </template>
  </BaseModal>
</template>
