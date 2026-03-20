<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaignStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useCharacterStore } from '@/stores/characterStore'

const router = useRouter()
const campaignStore = useCampaignStore()
const scenarioStore = useScenarioStore()
const characterStore = useCharacterStore()

onMounted(async () => {
  if (!campaignStore.hasCampaign) {
    router.replace('/kampan')
    return
  }
  await scenarioStore.loadScenarioData()
})

const campaign = computed(() => campaignStore.currentCampaign)

// Editable campaign name
const isEditingName = ref(false)
const editName = ref('')

function startEditName() {
  editName.value = campaign.value?.name ?? ''
  isEditingName.value = true
}

function saveName() {
  if (!campaign.value || !editName.value.trim()) return
  campaignStore.updateCampaign({ name: editName.value.trim() })
  // Also update the summary list
  const summary = campaignStore.campaigns.find((c) => c.id === campaign.value?.id)
  if (summary) summary.name = editName.value.trim()
  isEditingName.value = false
}

// Chapter selector
const chapters = [
  { id: 1, label: 'Kapitola 1' },
  { id: 2, label: 'Kapitola 2' },
  { id: 3, label: 'Kapitola 3' },
  { id: 4, label: 'Kapitola 4' },
  { id: 5, label: 'Kapitola 5' },
]

function setChapter(e: Event) {
  const value = Number((e.target as HTMLSelectElement).value)
  campaignStore.updateCampaign({ chapterId: value })
}

function toggleSpoilers() {
  if (!campaign.value) return
  campaignStore.updateCampaign({ hideSpoilers: !campaign.value.hideSpoilers })
}

// Statistics
const totalGold = computed(() => {
  return characterStore.activeCharacters.reduce((sum, c) => sum + c.gold, 0)
})

// Format date
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

// Export
function exportCampaign() {
  const json = campaignStore.exportCampaign()
  if (!json) return
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `frosthaven-${campaign.value?.name ?? 'kampan'}-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Import
const importError = ref('')
const importSuccess = ref(false)

function handleImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  importError.value = ''
  importSuccess.value = false

  const reader = new FileReader()
  reader.onload = () => {
    const result = campaignStore.importCampaign(reader.result as string)
    if (result) {
      importSuccess.value = true
      setTimeout(() => { importSuccess.value = false }, 3000)
    } else {
      importError.value = 'Neplatny format souboru.'
    }
  }
  reader.readAsText(file)
  input.value = ''
}

// Delete campaign
const showDeleteConfirm = ref(false)

function deleteCampaign() {
  if (!campaign.value) return
  campaignStore.deleteCampaign(campaign.value.id)
  showDeleteConfirm.value = false
  router.replace('/kampan')
}
</script>

<template>
  <div v-if="!campaign" />

  <div v-else>
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost">Nastaveni</h1>
    </div>

    <!-- 1. Kampan -->
    <div class="fh-divider mb-4">Kampan</div>
    <div class="fh-card p-5 mb-6 space-y-4">
      <!-- Name -->
      <div>
        <label class="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Nazev kampane</label>
        <div v-if="!isEditingName" class="flex items-center gap-3">
          <span class="text-gray-200 font-medium">{{ campaign.name }}</span>
          <button
            class="text-fh-primary-dim hover:text-fh-primary text-xs transition-colors"
            @click="startEditName"
          >
            Upravit
          </button>
        </div>
        <div v-else class="flex items-center gap-2">
          <input
            v-model="editName"
            class="fh-input flex-1"
            @keyup.enter="saveName"
          />
          <button class="fh-btn-primary text-sm px-3 py-2" @click="saveName">Ulozit</button>
          <button class="text-gray-500 hover:text-gray-300 text-sm" @click="isEditingName = false">Zrusit</button>
        </div>
      </div>

      <!-- Created date -->
      <div>
        <label class="block text-xs text-gray-500 uppercase tracking-wider mb-1">Vytvoreno</label>
        <span class="text-sm text-gray-400">{{ formatDate(campaign.createdAt) }}</span>
      </div>

      <!-- Chapter selector -->
      <div>
        <label class="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Kapitola</label>
        <select
          class="fh-input w-full sm:w-60"
          :value="campaign.chapterId"
          @change="setChapter"
        >
          <option v-for="ch in chapters" :key="ch.id" :value="ch.id">{{ ch.label }}</option>
        </select>
      </div>

      <!-- Spoiler toggle -->
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm text-gray-200">Skryt spoilery</div>
          <div class="text-xs text-gray-500">Schovej nezamcene scenare a predmety</div>
        </div>
        <button
          class="w-12 h-7 rounded-full transition-all duration-200 relative"
          :class="campaign.hideSpoilers ? 'bg-fh-primary' : 'bg-gray-700'"
          @click="toggleSpoilers"
        >
          <div
            class="w-5 h-5 rounded-full bg-white shadow-md absolute top-1 transition-all duration-200"
            :class="campaign.hideSpoilers ? 'left-6' : 'left-1'"
          ></div>
        </button>
      </div>
    </div>

    <!-- 2. Statistiky -->
    <div class="fh-divider mb-4">Statistiky</div>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
      <div class="fh-card fh-stat">
        <div class="fh-stat-value text-fh-primary">{{ scenarioStore.completedCount }}</div>
        <div class="fh-stat-label">Scenare</div>
      </div>
      <div class="fh-card fh-stat">
        <div class="fh-stat-value text-fh-primary-light">
          {{ characterStore.characters.length + characterStore.archivedCharacters.length }}
        </div>
        <div class="fh-stat-label">Postavy</div>
      </div>
      <div class="fh-card fh-stat">
        <div class="fh-stat-value text-fh-frost">{{ campaign.morale }}</div>
        <div class="fh-stat-label">Moralka</div>
      </div>
      <div class="fh-card fh-stat">
        <div class="fh-stat-value text-yellow-400">{{ campaign.prosperity }}</div>
        <div class="fh-stat-label">Prosperita</div>
      </div>
      <div class="fh-card fh-stat">
        <div class="fh-stat-value text-yellow-300">{{ totalGold }}</div>
        <div class="fh-stat-label">Celkove zlato</div>
      </div>
      <div class="fh-card fh-stat">
        <div class="fh-stat-value text-red-400">{{ campaign.soldiersLost }}</div>
        <div class="fh-stat-label">Padli vojaci</div>
      </div>
    </div>

    <!-- 3. Data -->
    <div class="fh-divider mb-4">Data</div>
    <div class="fh-card p-5 mb-6 space-y-4">
      <!-- Export -->
      <div>
        <div class="text-sm text-gray-200 mb-2">Export kampane</div>
        <button class="fh-btn-secondary text-sm" @click="exportCampaign">
          <span class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Stahnout JSON
          </span>
        </button>
      </div>

      <!-- Import -->
      <div>
        <div class="text-sm text-gray-200 mb-2">Import kampane</div>
        <label class="fh-btn-ghost text-sm cursor-pointer inline-flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Nahrat soubor
          <input type="file" accept=".json" class="hidden" @change="handleImport" />
        </label>
        <p v-if="importError" class="text-xs text-red-400 mt-2">{{ importError }}</p>
        <p v-if="importSuccess" class="text-xs text-fh-completed mt-2">Kampan uspesne importovana!</p>
      </div>
    </div>

    <!-- 4. Podporte vyvoj -->
    <div class="fh-divider mb-4">Podporte vyvoj</div>
    <div class="fh-card p-5 mb-6">
      <p class="text-sm text-gray-400 leading-relaxed">
        Frosthaven Tracker je open-source projekt. Pokud se vam libi a chcete podporit dalsi vyvoj,
        budeme radi za jakoukoli formu podpory — sdileni, zpetnou vazbu, nebo prispevek.
      </p>
    </div>

    <!-- 5. O aplikaci -->
    <div class="fh-divider mb-4">O aplikaci</div>
    <div class="fh-card p-5 mb-6">
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500">Verze</span>
          <span class="text-gray-300">0.1.0 beta</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Tech stack</span>
          <span class="text-gray-300">Vue 3, TypeScript, Tailwind CSS, Pinia</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Uloziste</span>
          <span class="text-gray-300">localStorage</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Data kampane</span>
          <span class="text-gray-300">{{ campaignStore.campaigns.length }} kampan{{ campaignStore.campaigns.length === 1 ? '' : 'i' }}</span>
        </div>
      </div>
    </div>

    <!-- 6. Nebezpecna zona -->
    <div class="fh-divider mb-4 text-red-500/70">Nebezpecna zona</div>
    <div class="fh-card p-5 mb-6 border-red-500/20">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm text-gray-200">Smazat kampan</div>
          <div class="text-xs text-gray-500">Trvale smaze kampan "{{ campaign.name }}" a vsechna jeji data.</div>
        </div>
        <button
          v-if="!showDeleteConfirm"
          class="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all"
          @click="showDeleteConfirm = true"
        >
          Smazat
        </button>
      </div>

      <!-- Confirmation -->
      <div v-if="showDeleteConfirm" class="mt-4 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
        <p class="text-sm text-red-300 mb-3">Opravdu chces smazat kampan "{{ campaign.name }}"? Tuto akci nelze vzit zpet.</p>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
            @click="deleteCampaign"
          >
            Ano, smazat
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition-colors"
            @click="showDeleteConfirm = false"
          >
            Zrusit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
