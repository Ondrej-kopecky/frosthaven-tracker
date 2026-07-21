<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaignStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useCharacterStore } from '@/stores/characterStore'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { changePassword, deleteAccount } from '@/services/api/authApi'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const router = useRouter()
const campaignStore = useCampaignStore()
const scenarioStore = useScenarioStore()
const characterStore = useCharacterStore()
const authStore = useAuthStore()
const toast = useToastStore()

const isSyncing = ref(false)

async function handleCloudSync() {
  isSyncing.value = true
  await campaignStore.pullFromCloud()
  isSyncing.value = false
  if (campaignStore.syncStatus === 'error') {
    toast.show(campaignStore.syncError ?? 'Synchronizace selhala', 'error')
  } else {
    toast.show('Kampaně staženy z cloudu')
  }
}

async function handleCloudPush() {
  isSyncing.value = true
  await campaignStore.syncToCloud()
  isSyncing.value = false
  if (campaignStore.syncStatus === 'error') {
    toast.show(campaignStore.syncError ?? 'Synchronizace selhala', 'error')
  } else {
    toast.show('Kampaň nahrána do cloudu')
  }
}

onMounted(async () => {
  if (!campaignStore.hasCampaign) {
    router.replace('/kampan')
    return
  }
  await scenarioStore.loadScenarioData()
  loadShareInfo()
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
  toast.show('Kampaň exportována')
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

// Change password
const cpCurrentPassword = ref('')
const cpNewPassword = ref('')
const cpConfirmPassword = ref('')
const cpError = ref('')
const cpSuccess = ref(false)
const cpLoading = ref(false)

async function handleChangePassword() {
  cpError.value = ''
  cpSuccess.value = false

  if (!cpCurrentPassword.value) {
    cpError.value = 'Zadejte aktuální heslo'
    return
  }
  if (cpNewPassword.value.length < 6) {
    cpError.value = 'Nové heslo musí mít alespoň 6 znaků'
    return
  }
  if (cpNewPassword.value !== cpConfirmPassword.value) {
    cpError.value = 'Nová hesla se neshodují'
    return
  }

  cpLoading.value = true
  try {
    await changePassword(cpCurrentPassword.value, cpNewPassword.value)
    cpSuccess.value = true
    cpCurrentPassword.value = ''
    cpNewPassword.value = ''
    cpConfirmPassword.value = ''
    setTimeout(() => { cpSuccess.value = false }, 5000)
  } catch (e: any) {
    cpError.value = e?.response?.data?.detail || e?.message || 'Nepodařilo se změnit heslo'
  } finally {
    cpLoading.value = false
  }
}

// Snapshots
const snapshotsVersion = ref(0)
const snapshots = computed(() => {
  void snapshotsVersion.value
  return campaign.value ? campaignStore.listSnapshots(campaign.value.id) : []
})
const snapshotToRestore = ref<string | null>(null)

function formatSnapshotDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('cs-CZ', {
      day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function createSnapshot() {
  campaignStore.takeSnapshot(false)
  snapshotsVersion.value++
  toast.show('Záloha vytvořena')
}

function handleRestoreSnapshot() {
  if (!snapshotToRestore.value) return
  const target = snapshotToRestore.value
  // Nejdřív zálohuj současný stav, ať je návrat možný oběma směry
  campaignStore.takeSnapshot(false)
  const ok = campaignStore.restoreSnapshot(target)
  snapshotToRestore.value = null
  snapshotsVersion.value++
  toast.show(ok ? 'Záloha obnovena' : 'Obnovení selhalo', ok ? 'success' : 'error')
}

// Sdílení kampaně
import {
  createShare, getShareInfo, revokeShare, leaveCampaign, kickMember,
  type ShareInfo,
} from '@/services/api/campaignApi'

const shareInfo = ref<ShareInfo | null>(null)
const shareLoading = ref(false)
const shareError = ref('')

const isOwnerOfCurrent = computed(() =>
  !shareInfo.value || shareInfo.value.ownerUsername === authStore.user?.username,
)

async function loadShareInfo() {
  if (!authStore.isLoggedIn || !campaign.value) return
  const result = await getShareInfo(campaign.value.id)
  if (result.data) shareInfo.value = result.data
}

async function handleCreateShare() {
  if (!campaign.value) return
  shareLoading.value = true
  shareError.value = ''
  // Kampaň musí být nejdřív v cloudu
  await campaignStore.syncToCloud()
  const result = await createShare(campaign.value.id)
  shareLoading.value = false
  if (result.error) {
    shareError.value = result.error
    return
  }
  await loadShareInfo()
  toast.show('Kód pro sdílení vytvořen')
}

function copyShareCode() {
  if (!shareInfo.value?.shareCode) return
  navigator.clipboard.writeText(shareInfo.value.shareCode)
  toast.show('Kód zkopírován do schránky')
}

async function handleRevokeShare() {
  if (!campaign.value) return
  await revokeShare(campaign.value.id)
  await loadShareInfo()
  toast.show('Sdílení zrušeno', 'info')
}

async function handleKick(userId: number) {
  if (!campaign.value) return
  await kickMember(campaign.value.id, userId)
  await loadShareInfo()
  toast.show('Člen odebrán', 'info')
}

async function handleLeave() {
  if (!campaign.value) return
  await leaveCampaign(campaign.value.id)
  campaignStore.deleteCampaign(campaign.value.id)
  toast.show('Kampaň opuštěna', 'info')
  router.replace('/kampan')
}

// Smazání účtu (GDPR)
const showDeleteAccount = ref(false)
const daPassword = ref('')
const daError = ref('')

async function handleDeleteAccount() {
  if (!daPassword.value) {
    daError.value = 'Zadejte heslo'
    return
  }
  daError.value = ''
  const result = await deleteAccount(daPassword.value)
  if (result.error) {
    daError.value = result.error
    return
  }
  showDeleteAccount.value = false
  daPassword.value = ''
  authStore.logout()
  toast.show('Účet byl trvale smazán', 'info')
  router.replace('/kampan')
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
      <h1 class="font-display text-2xl font-bold text-fh-frost">Nastavení</h1>
    </div>

    <!-- 1. Kampan -->
    <div class="fh-divider mb-4">Kampan</div>
    <div class="fh-card p-5 mb-6 space-y-4">
      <!-- Name -->
      <div>
        <label class="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Název kampaně</label>
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
          <button class="fh-btn-primary text-sm px-3 py-2" @click="saveName">Uložit</button>
          <button class="text-gray-500 hover:text-gray-300 text-sm" @click="isEditingName = false">Zrušit</button>
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
        <div class="fh-stat-value text-fh-frost">{{ campaign.prosperity }}</div>
        <div class="fh-stat-label">Prosperita</div>
      </div>
      <div class="fh-card fh-stat">
        <div class="fh-stat-value text-amber-400">{{ totalGold }}</div>
        <div class="fh-stat-label">Celkove zlato</div>
      </div>
      <div class="fh-card fh-stat">
        <div class="fh-stat-value text-fh-blocked">{{ campaign.soldiersLost }}</div>
        <div class="fh-stat-label">Padli vojaci</div>
      </div>
    </div>

    <!-- 3. Data -->
    <div class="fh-divider mb-4">Data</div>
    <div class="fh-card p-5 mb-6 space-y-4">
      <!-- Export -->
      <div>
        <div class="text-sm text-gray-200 mb-2">Export kampaně</div>
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
        <div class="text-sm text-gray-200 mb-2">Import kampaně</div>
        <label class="fh-btn-ghost text-sm cursor-pointer inline-flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Nahrat soubor
          <input type="file" accept=".json" class="hidden" @change="handleImport" />
        </label>
        <p v-if="importError" class="text-xs text-fh-blocked mt-2">{{ importError }}</p>
        <p v-if="importSuccess" class="text-xs text-fh-completed mt-2">Kampaň úspěšně importována!</p>
      </div>

      <!-- Snapshots -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm text-gray-200">Zálohy (snapshoty)</div>
          <button class="fh-btn-ghost text-xs" @click="createSnapshot">+ Vytvořit zálohu</button>
        </div>
        <p class="text-xs text-gray-500 mb-2">
          Automaticky se ukládají při otevření kampaně (max 5, po 6 hodinách).
        </p>
        <div v-if="snapshots.length === 0" class="text-xs text-gray-600">Zatím žádná záloha.</div>
        <div
          v-for="s in snapshots"
          :key="s.takenAt"
          class="flex items-center justify-between rounded-lg border border-fh-border bg-black/15 px-3 py-1.5 mb-1.5"
        >
          <span class="text-xs text-gray-400">{{ formatSnapshotDate(s.takenAt) }}</span>
          <button class="fh-btn-secondary text-xs" @click="snapshotToRestore = s.takenAt">Obnovit</button>
        </div>
      </div>

      <ConfirmDialog
        :open="!!snapshotToRestore"
        title="Obnovit zálohu?"
        :message="`Aktuální stav kampaně bude přepsán zálohou z ${snapshotToRestore ? formatSnapshotDate(snapshotToRestore) : ''}. Před obnovením se uloží záloha současného stavu.`"
        confirm-label="Obnovit"
        @confirm="handleRestoreSnapshot"
        @cancel="snapshotToRestore = null"
      />
    </div>

    <!-- 4. Cloud sync -->
    <div class="fh-divider mb-4">Cloud</div>
    <div class="fh-card p-5 mb-6 space-y-4">
      <template v-if="authStore.isLoggedIn">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-200">Synchronizace</div>
            <div class="text-xs text-gray-500">
              <template v-if="campaignStore.syncStatus === 'synced'">Synchronizovano</template>
              <template v-else-if="campaignStore.syncStatus === 'syncing'">Synchronizuji...</template>
              <template v-else-if="campaignStore.syncStatus === 'error'">Chyba: {{ campaignStore.syncError }}</template>
              <template v-else>Automaticky se synchronizuje pri zmenach</template>
            </div>
          </div>
          <div
            class="w-2.5 h-2.5 rounded-full"
            :class="{
              'bg-fh-completed': campaignStore.syncStatus === 'synced',
              'bg-fh-primary animate-pulse': campaignStore.syncStatus === 'syncing',
              'bg-fh-blocked': campaignStore.syncStatus === 'error',
              'bg-gray-600': campaignStore.syncStatus === 'idle',
            }"
          ></div>
        </div>
        <div class="flex gap-2">
          <button
            class="fh-btn-secondary text-sm flex items-center gap-2"
            :disabled="isSyncing"
            @click="handleCloudSync"
          >
            <svg class="w-4 h-4" :class="isSyncing ? 'animate-spin' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
            </svg>
            Synchronizovat
          </button>
          <button
            class="fh-btn-ghost text-sm flex items-center gap-2"
            :disabled="isSyncing"
            @click="handleCloudPush"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            Odeslat do cloudu
          </button>
        </div>
      </template>
      <template v-else>
        <div class="text-sm text-gray-400">
          Pro synchronizaci kampaně mezi zařízeními se
          <router-link to="/prihlaseni" class="text-fh-primary hover:text-fh-primary-light no-underline">přihlaste</router-link>.
        </div>
      </template>
    </div>

    <!-- 4b. Sdílení kampaně -->
    <template v-if="authStore.isLoggedIn">
      <div class="fh-divider mb-4">Sdílení kampaně</div>
      <div class="fh-card p-5 mb-6 space-y-4">
        <p class="text-xs text-gray-500">
          Sdílejte kampaň se spoluhráči — každý ji uvidí ve svém seznamu a změny se synchronizují.
        </p>

        <!-- Vlastník: kód -->
        <div v-if="shareInfo?.shareCode" class="flex items-center gap-3">
          <div class="font-display text-2xl font-bold tracking-[0.3em] text-fh-primary bg-black/30 border border-fh-primary/30 rounded-lg px-4 py-2">
            {{ shareInfo.shareCode }}
          </div>
          <button class="fh-btn-secondary text-xs" @click="copyShareCode">Kopírovat</button>
          <button class="fh-btn-ghost text-xs text-fh-blocked" @click="handleRevokeShare">Zrušit sdílení</button>
        </div>
        <button
          v-else-if="!shareInfo?.isShared || isOwnerOfCurrent"
          class="fh-btn-primary text-sm"
          :disabled="shareLoading"
          @click="handleCreateShare"
        >
          {{ shareLoading ? 'Generuji…' : 'Vygenerovat kód pro sdílení' }}
        </button>

        <p v-if="shareError" class="text-xs text-fh-blocked">{{ shareError }}</p>

        <!-- Členové -->
        <div v-if="shareInfo && (shareInfo.members.length > 0 || !isOwnerOfCurrent)">
          <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Členové · vlastník: {{ shareInfo.ownerUsername }}
          </div>
          <div
            v-for="m in shareInfo.members"
            :key="m.userId"
            class="flex items-center justify-between rounded-lg border border-fh-border bg-black/15 px-3 py-1.5 mb-1.5"
          >
            <span class="text-sm text-gray-300">{{ m.username }}</span>
            <button
              v-if="isOwnerOfCurrent"
              class="text-xs text-gray-600 hover:text-fh-blocked transition-colors"
              @click="handleKick(m.userId)"
            >
              Odebrat
            </button>
          </div>
          <button
            v-if="!isOwnerOfCurrent"
            class="fh-btn-ghost text-xs text-fh-blocked mt-1"
            @click="handleLeave"
          >
            Opustit sdílenou kampaň
          </button>
        </div>
      </div>
    </template>

    <!-- 5. Změna hesla -->
    <template v-if="authStore.isLoggedIn">
      <div class="fh-divider mb-4">Změna hesla</div>
      <div class="fh-card p-5 mb-6 space-y-4">
        <div>
          <label class="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Aktuální heslo</label>
          <input
            v-model="cpCurrentPassword"
            type="password"
            class="fh-input w-full sm:w-80"
            placeholder="Zadejte aktuální heslo"
          />
        </div>
        <div>
          <label class="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Nové heslo</label>
          <input
            v-model="cpNewPassword"
            type="password"
            class="fh-input w-full sm:w-80"
            placeholder="Minimálně 6 znaků"
          />
        </div>
        <div>
          <label class="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Potvrzení nového hesla</label>
          <input
            v-model="cpConfirmPassword"
            type="password"
            class="fh-input w-full sm:w-80"
            placeholder="Zadejte nové heslo znovu"
            @keyup.enter="handleChangePassword"
          />
        </div>
        <div>
          <button
            class="fh-btn-primary text-sm px-4 py-2"
            :disabled="cpLoading"
            @click="handleChangePassword"
          >
            {{ cpLoading ? 'Měním heslo...' : 'Změnit heslo' }}
          </button>
        </div>
        <p v-if="cpError" class="text-xs text-fh-blocked">{{ cpError }}</p>
        <p v-if="cpSuccess" class="text-xs text-fh-completed">Heslo bylo úspěšně změněno!</p>
      </div>

      <!-- Smazání účtu (GDPR) -->
      <div class="fh-divider mb-4">Smazání účtu</div>
      <div class="fh-card p-5 mb-6 border-fh-blocked/20">
        <p class="text-xs text-gray-500 mb-3">
          Trvale smaže účet i všechny kampaně uložené v cloudu. Lokální data v prohlížeči
          zůstanou. Akce je nevratná — zvažte předchozí export.
          Více v <router-link to="/ochrana-udaju" class="text-fh-primary underline">zásadách ochrany údajů</router-link>.
        </p>
        <button
          class="text-sm px-4 py-2 rounded-lg border border-fh-blocked/30 text-fh-blocked hover:bg-fh-blocked/10 transition-colors"
          @click="showDeleteAccount = true"
        >
          Smazat účet…
        </button>
      </div>

      <ConfirmDialog
        :open="showDeleteAccount"
        title="Trvale smazat účet?"
        confirm-label="Smazat účet"
        danger
        @confirm="handleDeleteAccount"
        @cancel="showDeleteAccount = false; daPassword = ''; daError = ''"
      >
        <p class="text-sm text-gray-400 mb-3">
          Smaže se účet <strong class="text-gray-200">{{ authStore.user?.email }}</strong>
          a všechny kampaně v cloudu. Pro potvrzení zadejte heslo.
        </p>
        <input
          v-model="daPassword"
          type="password"
          class="fh-input w-full"
          placeholder="Vaše heslo"
          autocomplete="current-password"
        />
        <p v-if="daError" class="text-xs text-fh-blocked mt-2">{{ daError }}</p>
      </ConfirmDialog>
    </template>

    <!-- 6. Podporte vyvoj -->
    <div class="fh-divider mb-4">Podporte vyvoj</div>
    <div class="fh-card p-5 mb-6">
      <p class="text-sm text-gray-400 leading-relaxed">
        Frosthaven Tracker je open-source projekt. Pokud se vam libi a chcete podporit dalsi vyvoj,
        budeme radi za jakoukoli formu podpory — sdílení, zpětnou vazbu, nebo příspěvek.
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
          <span class="text-gray-500">Data kampaně</span>
          <span class="text-gray-300">{{ campaignStore.campaigns.length }} kampan{{ campaignStore.campaigns.length === 1 ? '' : 'i' }}</span>
        </div>
      </div>
    </div>

    <!-- 6. Nebezpečná zóna -->
    <div class="fh-divider mb-4 text-fh-blocked/70">Nebezpečná zóna</div>
    <div class="fh-card p-5 mb-6 border-fh-blocked/20">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm text-gray-200">Smazat kampaň</div>
          <div class="text-xs text-gray-500">Trvale smaže kampaň "{{ campaign.name }}" a vsechna její data.</div>
        </div>
        <button
          v-if="!showDeleteConfirm"
          class="px-4 py-2 rounded-lg bg-fh-blocked/10 border border-fh-blocked/25 text-fh-blocked text-sm font-medium hover:bg-fh-blocked/20 transition-all"
          @click="showDeleteConfirm = true"
        >
          Smazat
        </button>
      </div>

      <!-- Confirmation -->
      <div v-if="showDeleteConfirm" class="mt-4 p-4 rounded-lg bg-fh-blocked/5 border border-fh-blocked/20">
        <p class="text-sm text-fh-blocked mb-3">Opravdu chceš smazat kampaň "{{ campaign.name }}"? Tuto akci nelze vzít zpět.</p>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 rounded-lg bg-fh-blocked text-white text-sm font-semibold hover:bg-red-600 transition-colors"
            @click="deleteCampaign"
          >
            Ano, smazat
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition-colors"
            @click="showDeleteConfirm = false"
          >
            Zrušit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
