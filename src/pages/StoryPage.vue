<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaignStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { SCENARIO_STATUSES } from '@/models/types'

const router = useRouter()
const campaignStore = useCampaignStore()
const scenarioStore = useScenarioStore()

onMounted(async () => {
  if (!campaignStore.hasCampaign) {
    router.push('/kampan')
    return
  }
  await scenarioStore.loadScenarioData()
})

// Sort order toggle
const sortNewestFirst = ref(true)

// Include completed + attempted scenarios (full campaign log)
const timelineEvents = computed(() => {
  const events = scenarioStore.allScenarios
    .filter((s) => {
      const status = s.computedStatus
      return status === SCENARIO_STATUSES.COMPLETED || status === SCENARIO_STATUSES.ATTEMPTED
    })
    .filter((s) => s.state.completedAt)
    .map((s) => ({
      ...s,
      eventType: s.computedStatus as string,
    }))

  events.sort((a, b) => {
    const dateA = a.state.completedAt ?? ''
    const dateB = b.state.completedAt ?? ''
    return sortNewestFirst.value
      ? dateB.localeCompare(dateA)
      : dateA.localeCompare(dateB)
  })

  return events
})

const completedCount = computed(() =>
  timelineEvents.value.filter((e) => e.eventType === SCENARIO_STATUSES.COMPLETED).length
)
const attemptedCount = computed(() =>
  timelineEvents.value.filter((e) => e.eventType === SCENARIO_STATUSES.ATTEMPTED).length
)

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function eventColor(type: string): string {
  return type === SCENARIO_STATUSES.COMPLETED ? '#22c55e' : '#f97316'
}

function eventLabel(type: string): string {
  return type === SCENARIO_STATUSES.COMPLETED ? 'Dokončeno' : 'Pokus'
}
</script>

<template>
  <div v-if="campaignStore.hasCampaign" class="max-w-3xl mx-auto">
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost tracking-wide">Příběh</h1>
      <div class="flex items-center gap-3 mt-2">
        <span class="text-xs text-green-400/80">{{ completedCount }} dokončených</span>
        <span v-if="attemptedCount > 0" class="text-xs text-orange-400/80">{{ attemptedCount }} pokusů</span>
      </div>
    </div>

    <!-- Sort toggle -->
    <div class="flex items-center justify-end mb-4">
      <button
        class="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        @click="sortNewestFirst = !sortNewestFirst"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
        </svg>
        {{ sortNewestFirst ? 'Nejnovější první' : 'Nejstarší první' }}
      </button>
    </div>

    <div v-if="timelineEvents.length === 0" class="text-center py-20">
      <div class="inline-block p-4 rounded-2xl bg-white/[0.02] mb-4">
        <svg class="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      </div>
      <p class="text-gray-500 text-lg font-display tracking-wide">Zatím žádné události</p>
      <p class="text-gray-600 text-sm mt-2">Dokončete nebo zkuste první scénář a příběh se začne vytvářet.</p>
    </div>

    <!-- Timeline -->
    <div v-else class="relative">
      <!-- Vertical line -->
      <div class="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-fh-primary/40 via-fh-border to-transparent" />

      <div
        v-for="(s, idx) in timelineEvents"
        :key="`${s.id}-${s.eventType}`"
        class="relative pl-14 pb-8"
      >
        <!-- Timeline dot -->
        <div
          class="absolute left-3 w-5 h-5 rounded-full border-2 bg-fh-dark flex items-center justify-center"
          :style="{ borderColor: eventColor(s.eventType) + '90' }"
        >
          <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: eventColor(s.eventType) }" />
        </div>

        <!-- Counter badge -->
        <span class="absolute left-0 -top-1 text-[9px] text-gray-600 font-display">{{ idx + 1 }}</span>

        <!-- Card -->
        <div
          class="fh-card p-5"
          :class="s.eventType === SCENARIO_STATUSES.ATTEMPTED ? 'border-orange-800/20' : ''"
        >
          <div class="flex items-start justify-between mb-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-fh-primary font-display font-bold text-sm">#{{ s.id }}</span>
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  :style="{
                    backgroundColor: eventColor(s.eventType) + '20',
                    color: eventColor(s.eventType),
                  }"
                >
                  {{ eventLabel(s.eventType) }}
                </span>
              </div>
              <h3 class="font-display text-lg font-semibold text-gray-200 tracking-wide">{{ s.name }}</h3>
              <p v-if="s.coordinates?.name" class="text-xs text-gray-600 mt-0.5">{{ s.coordinates.name }}</p>
            </div>
            <span v-if="s.state.completedAt" class="text-[10px] text-gray-600 shrink-0 mt-1">
              {{ formatDate(s.state.completedAt) }}
            </span>
          </div>

          <p v-if="s.prompt" class="text-sm text-gray-400 italic leading-relaxed mt-3 p-3 rounded-lg bg-white/[0.02] border-l-2 border-fh-primary/30">
            {{ s.prompt }}
          </p>

          <!-- Achievements awarded -->
          <div v-if="s.achievements_awarded?.length" class="flex flex-wrap gap-2 mt-3">
            <span
              v-for="ach in s.achievements_awarded"
              :key="ach"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-fh-primary/10 text-fh-primary-light border border-fh-primary/20"
            >
              {{ ach }}
            </span>
          </div>

          <!-- Notes -->
          <div v-if="s.state.notes" class="mt-3 pt-3 border-t border-fh-border/30">
            <p class="text-xs text-gray-500">{{ s.state.notes }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
