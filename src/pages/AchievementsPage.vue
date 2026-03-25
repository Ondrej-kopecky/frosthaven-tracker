<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaignStore'
import { useAchievementStore } from '@/stores/achievementStore'
import { useScenarioStore } from '@/stores/scenarioStore'

const router = useRouter()
const campaignStore = useCampaignStore()
const achievementStore = useAchievementStore()
const scenarioStore = useScenarioStore()

// Detail modal
const selectedAchievement = ref<string | null>(null)

const selectedDef = computed(() => {
  if (!selectedAchievement.value) return null
  return achievementStore.definitions.find(a => a.id === selectedAchievement.value) ?? null
})

// Build scenario linkage map
const achievementScenarioMap = computed(() => {
  const map: Record<string, { awarded: number[]; lost: number[] }> = {}
  for (const s of scenarioStore.allScenarios) {
    if (s.achievements_awarded) {
      for (const a of s.achievements_awarded) {
        if (!map[a]) map[a] = { awarded: [], lost: [] }
        map[a].awarded.push(s.id)
      }
    }
    if (s.achievements_lost) {
      for (const a of s.achievements_lost) {
        if (!map[a]) map[a] = { awarded: [], lost: [] }
        map[a].lost.push(s.id)
      }
    }
  }
  return map
})

function scenarioName(id: number): string {
  const def = scenarioStore.getDefinition(id)
  return def ? `#${id} ${def.name}` : `#${id}`
}

function openDetail(id: string) {
  selectedAchievement.value = id
}

function closeDetail() {
  selectedAchievement.value = null
}

onMounted(async () => {
  if (!campaignStore.hasCampaign) {
    router.replace('/kampan')
    return
  }
  await scenarioStore.loadScenarioData()
})

type FilterTab = 'all' | 'campaign' | 'party' | 'achieved'
const activeFilter = ref<FilterTab>('all')

const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Vše' },
  { key: 'campaign', label: 'Kampaňové' },
  { key: 'party', label: 'Skupinové' },
  { key: 'achieved', label: 'Dosaženo' },
]

// All definitions: show non-hidden + achieved hidden ones
// Spoiler mode: hide only non-manual, non-achieved hidden achievements
const displayedDefinitions = computed(() => {
  return achievementStore.definitions.filter((a) => {
    if (a.hidden && !achievementStore.isAchieved(a.id)) return false
    if (campaignStore.currentCampaign?.hideSpoilers && !achievementStore.isAchieved(a.id) && !a.is_manual) return false
    return true
  })
})

const filteredAchievements = computed(() => {
  let list = displayedDefinitions.value

  if (activeFilter.value === 'campaign') {
    list = list.filter((a) => a.type === 'Campaign')
  } else if (activeFilter.value === 'party') {
    list = list.filter((a) => a.type === 'Party')
  } else if (activeFilter.value === 'achieved') {
    list = list.filter((a) => achievementStore.isAchieved(a.id))
  }

  return list
})

const totalVisible = computed(() => displayedDefinitions.value.length)
const progressPercent = computed(() => {
  if (totalVisible.value === 0) return 0
  return Math.round((achievementStore.achievedCount / totalVisible.value) * 100)
})

// Group helpers
function getGroupMembers(groupId: string) {
  return achievementStore.definitions.filter((a) => a.group === groupId)
}

// Upgrade chain helpers
function getUpgradeLevel(achievement: { id: string; upgrades?: string[] }): { current: number; total: number } | null {
  if (!achievement.upgrades?.length) return null
  const allIds = [achievement.id, ...achievement.upgrades]
  const total = allIds.length
  let current = 0
  for (const uid of allIds) {
    if (achievementStore.isAchieved(uid)) current++
    else break
  }
  return { current, total }
}

// Is this an upgrade sub-entry (not the root)
const upgradeSubIds = computed(() => {
  const ids = new Set<string>()
  for (const a of achievementStore.definitions) {
    if (a.upgrades?.length) {
      for (const uid of a.upgrades) {
        ids.add(uid)
      }
    }
  }
  return ids
})

// Filter out upgrade sub-entries from displayed list
const finalList = computed(() => {
  return filteredAchievements.value.filter((a) => !upgradeSubIds.value.has(a.id))
})

function typeBadgeClass(type: string): string {
  if (type === 'Campaign') return 'bg-fh-primary/15 text-fh-primary border border-fh-primary/25'
  return 'bg-purple-500/15 text-purple-400 border border-purple-500/25'
}

function typeLabel(type: string): string {
  if (type === 'Campaign') return 'Kampaňový'
  return 'Skupinový'
}
</script>

<template>
  <div v-if="!campaignStore.hasCampaign" />

  <div v-else>
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost">Úspěchy</h1>
    </div>

    <!-- Progress -->
    <div class="fh-card p-5 mb-6">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-400">Postup</span>
        <span class="text-sm font-semibold text-fh-frost">
          {{ achievementStore.achievedCount }} / {{ totalVisible }}
          <span class="text-gray-500 ml-1">({{ progressPercent }}%)</span>
        </span>
      </div>
      <div class="h-2.5 rounded-full bg-black/30 overflow-hidden">
        <div
          class="h-full fh-progress-bar transition-all duration-500"
          :style="{ width: progressPercent + '%' }"
        ></div>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="flex gap-1.5 mb-6 overflow-x-auto scrollbar-hide">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200"
        :class="
          activeFilter === tab.key
            ? 'bg-fh-primary/20 text-fh-primary border border-fh-primary/30'
            : 'bg-white/3 text-gray-500 border border-white/5 hover:text-gray-300 hover:bg-white/5'
        "
        @click="activeFilter = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Achievement list -->
    <div v-if="finalList.length === 0" class="fh-card p-8 text-center text-gray-500">
      <p class="text-sm">Žádné úspěchy k zobrazení.</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="achievement in finalList"
        :key="achievement.id"
        class="fh-card p-4 flex items-start gap-4 transition-all duration-200 cursor-pointer hover:bg-white/[0.02]"
        :class="achievementStore.isAchieved(achievement.id) ? 'border-l-3 border-l-fh-completed' : 'border-l-3 border-l-transparent'"
        @click="openDetail(achievement.id)"
      >
        <!-- Toggle checkbox -->
        <button
          class="mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200"
          :class="
            achievementStore.isAchieved(achievement.id)
              ? 'bg-fh-completed/20 border-fh-completed text-fh-completed'
              : 'border-gray-600 hover:border-gray-400 text-transparent hover:text-gray-500'
          "
          @click.stop="achievementStore.toggle(achievement.id)"
        >
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <span
              class="font-semibold text-sm"
              :class="achievementStore.isAchieved(achievement.id) ? 'text-fh-frost' : 'text-gray-300'"
            >
              {{ achievement.name }}
            </span>

            <!-- Type badge -->
            <span class="fh-badge text-[10px]" :class="typeBadgeClass(achievement.type)">
              {{ typeLabel(achievement.type) }}
            </span>

            <!-- Manual badge -->
            <span
              v-if="achievement.is_manual"
              class="fh-badge text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/25"
            >
              manuální
            </span>

            <!-- Hidden badge (only shown for achieved hidden ones) -->
            <span
              v-if="achievement.hidden"
              class="fh-badge text-[10px] bg-gray-500/15 text-gray-400 border border-gray-500/25"
            >
              skrytý
            </span>
          </div>

          <!-- Group indicator -->
          <div
            v-if="achievement.group"
            class="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>
              Skupina: {{ getGroupMembers(achievement.group).map((a) => a.name).join(' / ') }}
            </span>
          </div>

          <!-- Upgrade chain -->
          <div
            v-if="achievement.upgrades?.length"
            class="mt-2"
          >
            <div class="text-[11px] text-gray-500 mb-1.5">
              Úroveň {{ getUpgradeLevel(achievement)?.current ?? 0 }} / {{ getUpgradeLevel(achievement)?.total ?? 0 }}
            </div>
            <div class="flex gap-1">
              <div
                v-for="(uid, i) in [achievement.id, ...achievement.upgrades]"
                :key="uid"
                class="h-2 flex-1 rounded-full transition-all duration-300"
                :class="achievementStore.isAchieved(uid) ? 'fh-progress-bar' : 'bg-gray-700/50'"
                :title="'Úroveň ' + (i + 1)"
              ></div>
            </div>
          </div>
        </div>

        <!-- Achieved indicator -->
        <div v-if="achievementStore.isAchieved(achievement.id)" class="shrink-0">
          <svg class="w-5 h-5 text-fh-completed" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="selectedDef"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click="closeDetail"
        >
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            class="relative w-full max-w-md bg-fh-card border rounded-2xl shadow-2xl overflow-hidden"
            :class="achievementStore.isAchieved(selectedDef.id) ? 'border-fh-completed/30' : 'border-fh-border'"
            @click.stop
          >
            <!-- Header -->
            <div class="p-5 pb-3 border-b border-fh-border">
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-display text-lg font-semibold text-gray-200">{{ selectedDef.name }}</h3>
                    <svg v-if="achievementStore.isAchieved(selectedDef.id)" class="w-5 h-5 text-fh-completed shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="fh-badge text-[10px]" :class="typeBadgeClass(selectedDef.type)">
                      {{ typeLabel(selectedDef.type) }}
                    </span>
                    <span v-if="selectedDef.is_manual" class="fh-badge text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                      manuální
                    </span>
                    <span v-if="selectedDef.hidden" class="fh-badge text-[10px] bg-gray-500/15 text-gray-400 border border-gray-500/25">
                      skrytý
                    </span>
                  </div>
                </div>
                <button class="text-gray-500 hover:text-gray-300 p-1" @click="closeDetail">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Body -->
            <div class="p-5 space-y-4">
              <!-- Status -->
              <div class="flex items-center gap-3">
                <button
                  class="w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all"
                  :class="achievementStore.isAchieved(selectedDef.id)
                    ? 'bg-fh-completed/20 border-fh-completed text-fh-completed'
                    : 'border-gray-600 hover:border-gray-400 text-gray-600 hover:text-gray-400'"
                  @click="achievementStore.toggle(selectedDef.id)"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
                <span class="text-sm" :class="achievementStore.isAchieved(selectedDef.id) ? 'text-fh-completed font-semibold' : 'text-gray-400'">
                  {{ achievementStore.isAchieved(selectedDef.id) ? 'Dosaženo' : 'Nedosaženo' }}
                </span>
              </div>

              <!-- Upgrade chain -->
              <div v-if="selectedDef.upgrades?.length">
                <p class="text-xs text-gray-500 font-medium mb-2">Úrovně vylepšení:</p>
                <div class="space-y-1.5">
                  <div
                    v-for="(uid, i) in [selectedDef.id, ...selectedDef.upgrades]"
                    :key="uid"
                    class="flex items-center gap-2"
                  >
                    <div
                      class="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold"
                      :class="achievementStore.isAchieved(uid)
                        ? 'border-fh-completed bg-fh-completed/20 text-fh-completed'
                        : 'border-gray-600 text-gray-600'"
                    >
                      {{ i + 1 }}
                    </div>
                    <span class="text-sm" :class="achievementStore.isAchieved(uid) ? 'text-gray-300' : 'text-gray-600'">
                      {{ achievementStore.definitions.find(a => a.id === uid)?.name ?? uid }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Group -->
              <div v-if="selectedDef.group">
                <p class="text-xs text-gray-500 font-medium mb-1.5">Součást skupiny:</p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="member in getGroupMembers(selectedDef.group)"
                    :key="member.id"
                    class="text-xs px-2 py-0.5 rounded-md border cursor-pointer transition-colors"
                    :class="member.id === selectedDef.id
                      ? 'bg-fh-primary/15 text-fh-primary border-fh-primary/30'
                      : achievementStore.isAchieved(member.id)
                        ? 'bg-fh-completed/10 text-fh-completed border-fh-completed/20'
                        : 'bg-white/[0.03] text-gray-400 border-fh-border hover:bg-white/[0.06]'"
                    @click="openDetail(member.id)"
                  >
                    {{ member.name }}
                  </span>
                </div>
              </div>

              <!-- Awarded by scenarios -->
              <div v-if="achievementScenarioMap[selectedDef.name]?.awarded?.length">
                <p class="text-xs text-gray-500 font-medium mb-1.5">Získáno ze scénářů:</p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="sid in achievementScenarioMap[selectedDef.name].awarded"
                    :key="sid"
                    class="text-xs px-2 py-0.5 rounded-md bg-green-900/10 text-green-400/80 border border-green-800/20 hover:bg-green-900/20 transition-colors"
                    @click="closeDetail(); router.push({ path: '/scenare', query: { open: String(sid) } })"
                  >
                    {{ scenarioName(sid) }}
                  </button>
                </div>
              </div>

              <!-- Lost by scenarios -->
              <div v-if="achievementScenarioMap[selectedDef.name]?.lost?.length">
                <p class="text-xs text-gray-500 font-medium mb-1.5">Ztraceno v scénářích:</p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="sid in achievementScenarioMap[selectedDef.name].lost"
                    :key="sid"
                    class="text-xs px-2 py-0.5 rounded-md bg-red-900/10 text-red-400/80 border border-red-800/20 hover:bg-red-900/20 transition-colors"
                    @click="closeDetail(); router.push({ path: '/scenare', query: { open: String(sid) } })"
                  >
                    {{ scenarioName(sid) }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
