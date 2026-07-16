<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCampaignStore } from '@/stores/campaignStore'
import { useCharacterStore } from '@/stores/characterStore'
import { useToastStore } from '@/stores/toastStore'
import buildingsData from '@/data/buildings.json'

/**
 * Odemykatelné městské systémy (progressive disclosure):
 * sekce se zobrazí až po postavení příslušné budovy.
 * 24 Zahrada · 81 Síň zábavy (zkoušky/přízně) · 88 Stáje (mazlíčci) · 90 Radnice (výzvy)
 */

interface BuildingDef {
  id: number
  name: string
  maxLevel: number
  levels: { level: number; passive?: string; operations?: string }[]
}

const campaignStore = useCampaignStore()
const characterStore = useCharacterStore()
const toast = useToastStore()
const buildings = buildingsData as BuildingDef[]

const campaign = computed(() => campaignStore.currentCampaign)

function buildingLevel(id: number): number {
  return campaign.value?.buildingLevels?.[id] ?? 0
}

function buildingPassive(id: number): string {
  const b = buildings.find((x) => x.id === id)
  const lvl = b?.levels.find((l) => l.level === buildingLevel(id))
  return lvl?.passive ?? lvl?.operations ?? ''
}

// ── Zahrada (24) ──
const HERBS = [
  { key: 'arrowvine', label: 'Šípobyl' },
  { key: 'axenut', label: 'Sekeřičník' },
  { key: 'corpsecap', label: 'Mrtvolník' },
  { key: 'flamefruit', label: 'Plamenoplod' },
  { key: 'rockroot', label: 'Skalokořen' },
  { key: 'snowthistle', label: 'Sněhobodlák' },
] as const

// Počet záhonů dle úrovně zahrady (L1: 3, L2: 4, L3: 5, L4: 6)
const gardenPlots = computed(() => Math.min(6, 2 + buildingLevel(24)))
const newPlantHerb = ref('arrowvine')

function plantHerb() {
  if (!campaign.value) return
  if (campaign.value.garden.length >= gardenPlots.value) return
  campaign.value.garden.push(newPlantHerb.value)
  campaignStore.autoSave()
}

function unplant(index: number) {
  if (!campaign.value) return
  campaign.value.garden.splice(index, 1)
  campaignStore.autoSave()
}

function harvest() {
  if (!campaign.value) return
  for (const herb of campaign.value.garden) {
    const key = herb as keyof typeof campaign.value.resources
    campaign.value.resources[key] += 1
  }
  campaignStore.autoSave()
  toast.show(`Sklizeno: +1 z každého z ${campaign.value.garden.length} záhonů`)
}

function herbLabel(key: string): string {
  return HERBS.find((h) => h.key === key)?.label ?? key
}

// ── Výzvy — Radnice (90) ──
const newChallenge = ref('')

function addChallenge() {
  if (!campaign.value || !newChallenge.value.trim()) return
  campaign.value.challengesActive.push(newChallenge.value.trim())
  newChallenge.value = ''
  campaignStore.autoSave()
}

function removeChallenge(index: number) {
  if (!campaign.value) return
  campaign.value.challengesActive.splice(index, 1)
  campaignStore.autoSave()
}

// ── Zkoušky a přízně — Síň zábavy (81) ──
const activeChars = computed(() => characterStore.activeCharacters)

function trialFor(uuid: string): { card: string; completed: number } {
  const c = campaign.value!
  if (!c.trials[uuid]) c.trials[uuid] = { card: '', completed: 0 }
  return c.trials[uuid]
}

function setTrialCard(uuid: string, value: string) {
  trialFor(uuid).card = value
  campaignStore.autoSave()
}

function completeTrial(uuid: string) {
  const t = trialFor(uuid)
  t.completed += 1
  t.card = ''
  campaignStore.autoSave()
  toast.show('Zkouška splněna — lízni novou kartu zkoušky')
}

// ── Mazlíčci — Stáje (88) ──
const petCapacity = computed(() => buildingLevel(88) * 4)
const newPetName = ref('')

function addPet() {
  if (!campaign.value || !newPetName.value.trim()) return
  campaign.value.pets.push({ name: newPetName.value.trim(), active: false })
  newPetName.value = ''
  campaignStore.autoSave()
}

function togglePetActive(index: number) {
  if (!campaign.value) return
  const pet = campaign.value.pets[index]
  // Do scénáře jde jen 1 mazlíček
  if (!pet.active) campaign.value.pets.forEach((p) => (p.active = false))
  pet.active = !pet.active
  campaignStore.autoSave()
}

function removePet(index: number) {
  if (!campaign.value) return
  campaign.value.pets.splice(index, 1)
  campaignStore.autoSave()
}
</script>

<template>
  <div v-if="campaign">
    <!-- Zahrada (24) -->
    <template v-if="buildingLevel(24) > 0">
      <div class="fh-divider mb-4 mt-8">Zahrada</div>
      <div class="fh-card p-5 mb-6">
        <p class="text-xs text-gray-500 mb-3">
          {{ buildingPassive(24) }} · Záhony: {{ campaign.garden.length }}/{{ gardenPlots }}
        </p>
        <div class="flex flex-wrap gap-1.5 mb-3">
          <span
            v-for="(herb, i) in campaign.garden"
            :key="i"
            class="inline-flex items-center gap-1.5 text-xs bg-green-900/25 border border-green-700/30 text-green-200 rounded-md px-2 py-1"
          >
            🌱 {{ herbLabel(herb) }}
            <button class="text-green-400/50 hover:text-red-400 transition-colors" title="Vykopat" @click="unplant(i)">×</button>
          </span>
          <span v-if="campaign.garden.length === 0" class="text-xs text-gray-600">Nic není zasazeno.</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <select v-model="newPlantHerb" class="fh-input text-sm py-1.5">
            <option v-for="h in HERBS" :key="h.key" :value="h.key">{{ h.label }}</option>
          </select>
          <button
            class="fh-btn-secondary text-xs"
            :disabled="campaign.garden.length >= gardenPlots"
            @click="plantHerb"
          >
            Zasadit
          </button>
          <button
            class="fh-btn-primary text-xs"
            :disabled="campaign.garden.length === 0"
            @click="harvest"
          >
            Sklidit (+1 z každého záhonu)
          </button>
        </div>
      </div>
    </template>

    <!-- Výzvy — Radnice (90) -->
    <template v-if="buildingLevel(90) > 0">
      <div class="fh-divider mb-4 mt-8">Výzvy (Radnice)</div>
      <div class="fh-card p-5 mb-6">
        <p class="text-xs text-gray-500 mb-3">
          {{ buildingPassive(90) }} — na začátku scénáře. Za splněnou výzvu: +2 XP každé postavě
          a +1 checkmark městské hlídce (řeší průvodce dokončením scénáře).
        </p>
        <div class="flex flex-wrap gap-1.5 mb-3">
          <span
            v-for="(ch, i) in campaign.challengesActive"
            :key="i"
            class="inline-flex items-center gap-1.5 text-xs bg-fh-primary/10 border border-fh-primary/30 text-fh-primary rounded-md px-2 py-1"
          >
            ⚔ Výzva {{ ch }}
            <button class="text-fh-primary/50 hover:text-red-400 transition-colors" title="Odebrat" @click="removeChallenge(i)">×</button>
          </span>
          <span v-if="campaign.challengesActive.length === 0" class="text-xs text-gray-600">Žádná aktivní výzva.</span>
        </div>
        <div class="flex gap-2">
          <input
            v-model="newChallenge"
            class="fh-input flex-1 text-sm py-1.5"
            placeholder="Číslo karty výzvy…"
            @keyup.enter="addChallenge"
          />
          <button class="fh-btn-secondary text-xs" @click="addChallenge">Přidat</button>
        </div>
      </div>
    </template>

    <!-- Zkoušky a přízně — Síň zábavy (81) -->
    <template v-if="buildingLevel(81) > 0">
      <div class="fh-divider mb-4 mt-8">Zkoušky{{ buildingLevel(81) >= 2 ? ' & přízně' : '' }} (Síň zábavy)</div>
      <div class="fh-card p-5 mb-6">
        <p class="text-xs text-gray-500 mb-3">{{ buildingPassive(81) }}</p>
        <div v-for="c in activeChars" :key="c.uuid" class="flex items-center gap-2 mb-2">
          <span class="text-sm text-gray-300 w-32 truncate shrink-0">{{ c.playerName || 'Bezejmenný' }}</span>
          <input
            class="fh-input flex-1 text-sm py-1"
            placeholder="Karta zkoušky…"
            :value="campaign.trials[c.uuid]?.card ?? ''"
            @change="(e) => setTrialCard(c.uuid, (e.target as HTMLInputElement).value)"
          />
          <span class="text-[10px] text-gray-600 shrink-0">splněno: {{ campaign.trials[c.uuid]?.completed ?? 0 }}</span>
          <button
            class="fh-btn-secondary text-xs shrink-0"
            :disabled="!campaign.trials[c.uuid]?.card"
            @click="completeTrial(c.uuid)"
          >
            Splněna ✓
          </button>
        </div>
        <p v-if="buildingLevel(81) >= 2" class="text-[11px] text-fh-primary/80 mt-3">
          ✨ Přízně (Favors): na začátku scénáře můžete utratit až 7 bodů přízně
          (Wealth stojí 2 — errata). Body čerpáte dle pravidel Síně zábavy.
        </p>
      </div>
    </template>

    <!-- Mazlíčci — Stáje (88) -->
    <template v-if="buildingLevel(88) > 0">
      <div class="fh-divider mb-4 mt-8">Mazlíčci (Stáje)</div>
      <div class="fh-card p-5 mb-6">
        <p class="text-xs text-gray-500 mb-3">
          {{ buildingPassive(88) }} · Chováno: {{ campaign.pets.length }}/{{ petCapacity }}
          · Do scénáře jde max 1 (hvězdička).
        </p>
        <div class="space-y-1.5 mb-3">
          <div
            v-for="(pet, i) in campaign.pets"
            :key="i"
            class="flex items-center gap-2 rounded-lg border px-3 py-1.5"
            :class="pet.active ? 'border-fh-primary/40 bg-fh-primary/5' : 'border-fh-border bg-black/15'"
          >
            <button
              class="text-lg leading-none transition-colors"
              :class="pet.active ? 'text-fh-required' : 'text-gray-700 hover:text-gray-400'"
              title="Vzít do dalšího scénáře"
              @click="togglePetActive(i)"
            >★</button>
            <span class="text-sm text-gray-300 flex-1">{{ pet.name }}</span>
            <button class="text-xs text-gray-600 hover:text-red-400 transition-colors" @click="removePet(i)">×</button>
          </div>
          <p v-if="campaign.pets.length === 0" class="text-xs text-gray-600">Zatím žádný mazlíček.</p>
        </div>
        <div class="flex gap-2">
          <input
            v-model="newPetName"
            class="fh-input flex-1 text-sm py-1.5"
            placeholder="Jméno/druh mazlíčka…"
            :disabled="campaign.pets.length >= petCapacity"
            @keyup.enter="addPet"
          />
          <button
            class="fh-btn-secondary text-xs"
            :disabled="campaign.pets.length >= petCapacity"
            @click="addPet"
          >
            Chytit
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
