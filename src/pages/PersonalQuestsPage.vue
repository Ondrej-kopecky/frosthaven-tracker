<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaignStore'
import questsData from '@/data/personal-quests.json'

interface QuestProgress {
  type: 'checkbox' | 'number'
  name: string
  value: number[] | number
  target?: number
  scenario_unlock?: number
}

interface PersonalQuest {
  id: number
  name: string
  building_unlocks: number[]
  required_building_level?: [number, number]
  unlock?: string
  progress: QuestProgress[]
}

const router = useRouter()
const campaignStore = useCampaignStore()
const quests = questsData as PersonalQuest[]

onMounted(() => {
  if (!campaignStore.hasCampaign) {
    router.push('/kampan')
    return
  }
  loadQuestState()
})

// Quest state persisted in campaign
interface QuestState {
  assigned?: string // character name
  progress: Record<number, number[] | number> // progressIdx -> values
  completed: boolean
}

const questStates = ref<Record<number, QuestState>>({})

function loadQuestState() {
  const campaign = campaignStore.currentCampaign
  if (!campaign) return
  // Store quest state in campaign.notes as JSON prefix (or separate key)
  const raw = localStorage.getItem(`${storageKey()}_quests`)
  if (raw) {
    questStates.value = JSON.parse(raw)
  }
}

function storageKey(): string {
  const profileId = localStorage.getItem('fh_tracker_active_profile') ?? 'default'
  const campaignId = campaignStore.activeCampaignId ?? ''
  return `fh_tracker_${profileId}_campaign_${campaignId}`
}

function saveQuestState() {
  localStorage.setItem(`${storageKey()}_quests`, JSON.stringify(questStates.value))
}

function getState(questId: number): QuestState {
  if (!questStates.value[questId]) {
    questStates.value[questId] = { progress: {}, completed: false }
  }
  return questStates.value[questId]
}

function toggleCheckbox(questId: number, progressIdx: number, checkboxIdx: number) {
  const state = getState(questId)
  const quest = quests.find((q) => q.id === questId)
  if (!quest) return

  const prog = quest.progress[progressIdx]
  if (prog.type !== 'checkbox' || !Array.isArray(prog.value)) return

  if (!state.progress[progressIdx]) {
    state.progress[progressIdx] = [...prog.value]
  }
  const arr = state.progress[progressIdx] as number[]
  arr[checkboxIdx] = arr[checkboxIdx] ? 0 : 1
  saveQuestState()
}

function getCheckboxValues(questId: number, progressIdx: number, original: number[]): number[] {
  const state = questStates.value[questId]
  if (!state?.progress[progressIdx]) return original
  return state.progress[progressIdx] as number[]
}

function setNumberValue(questId: number, progressIdx: number, value: number) {
  const state = getState(questId)
  state.progress[progressIdx] = value
  saveQuestState()
}

function getNumberValue(questId: number, progressIdx: number): number {
  const state = questStates.value[questId]
  if (!state?.progress[progressIdx]) return 0
  return state.progress[progressIdx] as number
}

function toggleCompleted(questId: number) {
  const state = getState(questId)
  state.completed = !state.completed
  saveQuestState()
}

function setAssigned(questId: number, name: string) {
  const state = getState(questId)
  state.assigned = name || undefined
  saveQuestState()
}

// Filter
const filter = ref<'all' | 'assigned' | 'completed'>('all')
const search = ref('')

const filteredQuests = computed(() => {
  let result = quests
  if (filter.value === 'assigned') {
    result = result.filter((q) => questStates.value[q.id]?.assigned)
  } else if (filter.value === 'completed') {
    result = result.filter((q) => questStates.value[q.id]?.completed)
  }
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter((q) => q.name.toLowerCase().includes(s) || String(q.id).includes(s))
  }
  return result
})

// Active characters for assignment dropdown
const activeCharacters = computed(() => {
  return campaignStore.currentCampaign?.characters?.map((c) => c.name) ?? []
})

// Expand/collapse
const expandedId = ref<number | null>(null)
function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}
</script>

<template>
  <div v-if="campaignStore.hasCampaign" class="max-w-4xl mx-auto">
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost tracking-wide">Osobní úkoly</h1>
      <p class="text-sm text-gray-500 mt-1">{{ quests.length }} úkolů</p>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <div class="flex gap-0.5 bg-black/30 rounded-lg p-0.5 border border-fh-border">
        <button
          v-for="f in [{ label: 'Vše', value: 'all' }, { label: 'Přiřazené', value: 'assigned' }, { label: 'Splněné', value: 'completed' }] as const"
          :key="f.value"
          class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          :class="filter === f.value ? 'bg-fh-primary/20 text-fh-primary' : 'text-gray-500 hover:text-gray-300'"
          @click="filter = f.value"
        >
          {{ f.label }}
        </button>
      </div>

      <div class="relative flex-1 min-w-[180px] max-w-xs">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Hledat úkol..."
          class="fh-input w-full pl-9 py-1.5 text-sm"
        />
      </div>
    </div>

    <!-- Quest list -->
    <div v-if="filteredQuests.length === 0" class="text-center py-16">
      <p class="text-gray-500 text-lg font-display">Žádné úkoly</p>
    </div>

    <div class="space-y-3">
      <div
        v-for="quest in filteredQuests"
        :key="quest.id"
        class="fh-card overflow-hidden"
        :class="questStates[quest.id]?.completed ? 'border-green-800/30' : ''"
      >
        <!-- Header -->
        <button
          class="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
          @click="toggleExpand(quest.id)"
        >
          <!-- Completed indicator -->
          <div
            class="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
            :class="questStates[quest.id]?.completed
              ? 'border-green-500 bg-green-500/15 text-green-400'
              : 'border-fh-border bg-transparent text-gray-600'"
          >
            <svg v-if="questStates[quest.id]?.completed" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span v-else class="text-xs font-display font-bold">{{ quest.id }}</span>
          </div>

          <div class="flex-1 min-w-0">
            <h3 class="font-display text-sm font-semibold tracking-wide" :class="questStates[quest.id]?.completed ? 'text-green-400/80' : 'text-gray-200'">
              {{ quest.name }}
            </h3>
            <p v-if="questStates[quest.id]?.assigned" class="text-[11px] text-fh-primary mt-0.5">
              Přiřazeno: {{ questStates[quest.id]?.assigned }}
            </p>
          </div>

          <!-- Expand arrow -->
          <svg
            class="w-5 h-5 text-gray-600 shrink-0 transition-transform duration-200"
            :class="expandedId === quest.id ? 'rotate-180' : ''"
            fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <!-- Expanded content -->
        <transition name="expand">
          <div v-if="expandedId === quest.id" class="border-t border-fh-border/30 p-4 space-y-4">
            <!-- Assign to character -->
            <div class="flex items-center gap-3">
              <label class="text-xs text-gray-500 shrink-0">Přiřadit:</label>
              <select
                class="fh-input text-sm py-1 flex-1"
                :value="questStates[quest.id]?.assigned ?? ''"
                @change="setAssigned(quest.id, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">— nikdo —</option>
                <option v-for="name in activeCharacters" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>

            <!-- Progress items -->
            <div v-for="(prog, idx) in quest.progress" :key="idx" class="space-y-2">
              <p class="text-sm text-gray-300">{{ prog.name }}</p>

              <!-- Checkbox progress -->
              <div v-if="prog.type === 'checkbox' && Array.isArray(prog.value)" class="flex flex-wrap gap-1.5">
                <button
                  v-for="(_, cIdx) in prog.value"
                  :key="cIdx"
                  class="w-7 h-7 rounded-md border transition-all flex items-center justify-center"
                  :class="getCheckboxValues(quest.id, idx, prog.value as number[])[cIdx]
                    ? 'border-fh-primary bg-fh-primary/20 text-fh-primary'
                    : 'border-fh-border bg-black/20 text-transparent hover:border-gray-500'"
                  @click="toggleCheckbox(quest.id, idx, cIdx)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <span class="text-[11px] text-gray-500 self-center ml-1">
                  {{ getCheckboxValues(quest.id, idx, prog.value as number[]).filter(v => v).length }}/{{ (prog.value as number[]).length }}
                </span>
              </div>

              <!-- Number progress -->
              <div v-else-if="prog.type === 'number'" class="flex items-center gap-3">
                <input
                  type="number"
                  class="fh-input w-24 text-sm py-1 text-center"
                  :value="getNumberValue(quest.id, idx)"
                  :min="0"
                  :max="prog.target ?? 999"
                  @input="setNumberValue(quest.id, idx, Number(($event.target as HTMLInputElement).value))"
                />
                <span v-if="prog.target" class="text-xs text-gray-500">/ {{ prog.target }}</span>
                <!-- Progress bar -->
                <div v-if="prog.target" class="flex-1 h-2 bg-black/30 rounded-full overflow-hidden border border-fh-border/30">
                  <div
                    class="fh-progress-bar h-full transition-all duration-300"
                    :style="{ width: Math.min(100, (getNumberValue(quest.id, idx) / prog.target) * 100) + '%' }"
                  />
                </div>
              </div>
            </div>

            <!-- Building unlocks -->
            <div v-if="quest.building_unlocks?.length" class="pt-2 border-t border-fh-border/20">
              <p class="text-[11px] text-gray-600">
                Odemyká budovy: {{ quest.building_unlocks.join(', ') }}
              </p>
            </div>

            <!-- Unlock text -->
            <p v-if="quest.unlock" class="text-[11px] text-fh-primary/70 italic">
              {{ quest.unlock }}
            </p>

            <!-- Complete button -->
            <button
              class="w-full py-2 rounded-lg text-sm font-medium transition-all"
              :class="questStates[quest.id]?.completed
                ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                : 'fh-btn-primary'"
              @click="toggleCompleted(quest.id)"
            >
              {{ questStates[quest.id]?.completed ? 'Označit jako nedokončený' : 'Označit jako splněný' }}
            </button>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
