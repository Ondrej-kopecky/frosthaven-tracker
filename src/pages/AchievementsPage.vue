<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaignStore'
import { useAchievementStore } from '@/stores/achievementStore'

const router = useRouter()
const campaignStore = useCampaignStore()
const achievementStore = useAchievementStore()

onMounted(() => {
  if (!campaignStore.hasCampaign) {
    router.replace('/kampan')
  }
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
        class="fh-card p-4 flex items-start gap-4 transition-all duration-200"
        :class="achievementStore.isAchieved(achievement.id) ? 'border-l-3 border-l-fh-completed' : 'border-l-3 border-l-transparent'"
      >
        <!-- Toggle checkbox -->
        <button
          class="mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200"
          :class="
            achievementStore.isAchieved(achievement.id)
              ? 'bg-fh-completed/20 border-fh-completed text-fh-completed'
              : 'border-gray-600 hover:border-gray-400 text-transparent hover:text-gray-500'
          "
          @click="achievementStore.toggle(achievement.id)"
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
  </div>
</template>
