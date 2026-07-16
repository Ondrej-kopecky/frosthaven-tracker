<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useCampaignStore } from '@/stores/campaignStore'
import { useProfileStore } from '@/stores/profileStore'
import { useToastStore } from '@/stores/toastStore'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useRouter } from 'vue-router'

const campaignStore = useCampaignStore()
const profileStore = useProfileStore()
const toast = useToastStore()
const router = useRouter()
const newName = ref('')

// Profile management
const newProfileName = ref('')
const showNewProfile = ref(false)
const editingProfileName = ref(false)
const editedName = ref('')
const editInput = ref<HTMLInputElement | null>(null)

function create() {
  const name = newName.value.trim() || 'Nová kampaň'
  campaignStore.createCampaign(name)
  newName.value = ''
  router.push('/prehled')
}

function select(id: string) {
  campaignStore.switchCampaign(id)
  router.push('/prehled')
}

function onSwitchProfile(id: string) {
  profileStore.switchProfile(id)
  campaignStore.loadActiveCampaign()
}

function createProfile() {
  const name = newProfileName.value.trim()
  if (!name) return
  const profile = profileStore.createProfile(name)
  newProfileName.value = ''
  showNewProfile.value = false
  profileStore.switchProfile(profile.id)
  campaignStore.loadActiveCampaign()
}

function startRename() {
  editedName.value = profileStore.activeProfile?.name ?? ''
  editingProfileName.value = true
  nextTick(() => {
    editInput.value?.focus()
    editInput.value?.select()
  })
}

function finishRename() {
  const name = editedName.value.trim()
  if (name) {
    profileStore.renameProfile(name)
  }
  editingProfileName.value = false
}

// Mazání profilu s potvrzením
const profileToDelete = ref(false)

function deleteCurrentProfile() {
  const name = profileStore.activeProfile?.name ?? ''
  profileStore.deleteProfile(profileStore.activeProfileId)
  campaignStore.loadActiveCampaign()
  profileToDelete.value = false
  toast.show(`Profil „${name}" smazán`, 'info')
}

// Mazání kampaně s potvrzením
const campaignToDelete = ref<{ id: string; name: string } | null>(null)

function deleteCampaignConfirmed() {
  if (!campaignToDelete.value) return
  const { id, name } = campaignToDelete.value
  campaignStore.deleteCampaign(id)
  campaignToDelete.value = null
  toast.show(`Kampaň „${name}" smazána`, 'info')
}
</script>

<template>
  <div>
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost">Výběr kampaně</h1>
    </div>

    <!-- Profile switcher -->
    <div class="fh-card p-5 mb-6">
      <h2 class="font-display text-sm font-semibold text-fh-primary-light mb-3 uppercase tracking-wider">Profil hráče</h2>

      <div class="flex items-center gap-3 mb-3">
        <!-- Profile selector -->
        <select
          class="fh-input flex-1"
          :value="profileStore.activeProfileId"
          @change="onSwitchProfile(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="p in profileStore.profiles"
            :key="p.id"
            :value="p.id"
          >
            {{ p.name }}
          </option>
        </select>

        <!-- Rename button -->
        <button
          class="fh-btn-ghost text-xs px-2 py-1"
          title="Přejmenovat profil"
          @click="startRename"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>

        <!-- Delete button (only if more than 1 profile) -->
        <button
          v-if="profileStore.profiles.length > 1"
          class="fh-btn-ghost text-xs px-2 py-1 text-red-400 hover:text-red-300"
          title="Smazat profil"
          @click="profileToDelete = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <!-- Inline rename -->
      <div v-if="editingProfileName" class="flex gap-2 mb-3">
        <input
          ref="editInput"
          v-model="editedName"
          class="fh-input flex-1"
          placeholder="Nový název profilu..."
          @keyup.enter="finishRename"
          @keyup.escape="editingProfileName = false"
        />
        <button class="fh-btn-primary text-xs px-3" @click="finishRename">Uložit</button>
        <button class="fh-btn-ghost text-xs px-3" @click="editingProfileName = false">Zrušit</button>
      </div>

      <!-- New profile -->
      <div v-if="showNewProfile" class="flex gap-2">
        <input
          v-model="newProfileName"
          class="fh-input flex-1"
          placeholder="Název nového profilu..."
          @keyup.enter="createProfile"
          @keyup.escape="showNewProfile = false"
        />
        <button class="fh-btn-primary text-xs px-3" @click="createProfile">Vytvořit</button>
        <button class="fh-btn-ghost text-xs px-3" @click="showNewProfile = false">Zrušit</button>
      </div>
      <button
        v-else
        class="text-xs text-fh-primary hover:text-fh-primary-light transition-colors"
        @click="showNewProfile = true"
      >
        + Nový profil
      </button>
    </div>

    <!-- Create new campaign -->
    <div class="fh-card p-5 mb-6">
      <h2 class="font-display text-sm font-semibold text-fh-primary-light mb-3 uppercase tracking-wider">Nová kampaň</h2>
      <div class="flex gap-3">
        <input
          v-model="newName"
          class="fh-input flex-1"
          placeholder="Název kampaně..."
          @keyup.enter="create"
        />
        <button class="fh-btn-primary whitespace-nowrap" @click="create">Vytvořit</button>
      </div>
    </div>

    <!-- Existing campaigns -->
    <div v-if="campaignStore.campaigns.length > 0">
      <h2 class="font-display text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Existující kampaně</h2>
      <div class="flex flex-col gap-2">
        <div
          v-for="c in campaignStore.campaigns"
          :key="c.id"
          class="fh-card fh-card-interactive p-4 flex items-center justify-between gap-3 cursor-pointer"
          :class="{ 'border-fh-primary/30': c.id === campaignStore.activeCampaignId }"
          @click="select(c.id)"
        >
          <span class="text-sm font-medium text-gray-200 flex-1">{{ c.name }}</span>
          <span
            v-if="c.id === campaignStore.activeCampaignId"
            class="fh-badge bg-fh-primary/15 text-fh-primary"
          >
            Aktivní
          </span>
          <button
            class="w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
            title="Smazat kampaň"
            @click.stop="campaignToDelete = { id: c.id, name: c.name }"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      title="Zatím žádné kampaně"
      description="Vytvořte novou kampaň výše a vydejte se do mrazivého severu."
    />

    <ConfirmDialog
      :open="profileToDelete"
      title="Smazat profil?"
      :message="`Opravdu smazat profil „${profileStore.activeProfile?.name ?? ''}&quot;? Všechny kampaně tohoto profilu budou ztraceny.`"
      confirm-label="Smazat"
      danger
      @confirm="deleteCurrentProfile"
      @cancel="profileToDelete = false"
    />

    <ConfirmDialog
      :open="!!campaignToDelete"
      title="Smazat kampaň?"
      :message="`Opravdu smazat kampaň „${campaignToDelete?.name ?? ''}&quot;? Tato akce je nevratná — zvaž předchozí export v Nastavení.`"
      confirm-label="Smazat"
      danger
      @confirm="deleteCampaignConfirmed"
      @cancel="campaignToDelete = null"
    />
  </div>
</template>
