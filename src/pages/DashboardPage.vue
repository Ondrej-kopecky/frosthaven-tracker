<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useCampaignStore } from '@/stores/campaignStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useCharacterStore } from '@/stores/characterStore'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'

const campaignStore = useCampaignStore()
const scenarioStore = useScenarioStore()
const characterStore = useCharacterStore()
const authStore = useAuthStore()
const router = useRouter()

onMounted(async () => {
  await scenarioStore.loadScenarioData()
})

const pendingOutpost = computed(() => campaignStore.currentCampaign?.pendingPhase === 'outpost')

function startNewCampaign() {
  campaignStore.createCampaign('Nová kampaň')
  router.push('/scenare')
}

type ResourceKey = 'lumber' | 'metal' | 'hide' | 'gold' | 'arrowvine' | 'axenut' | 'corpsecap' | 'flamefruit' | 'rockroot' | 'snowthistle'

const resourceLabels: Record<ResourceKey, string> = {
  lumber: 'Dřevo',
  metal: 'Kov',
  hide: 'Kůže',
  arrowvine: 'Šípobyl',
  axenut: 'Sekeřičník',
  corpsecap: 'Mrtvolník',
  flamefruit: 'Plamenoplod',
  rockroot: 'Skalokořen',
  snowthistle: 'Sněhobodlák',
  gold: 'Zlato',
}

const resourceKeys: ResourceKey[] = ['lumber', 'metal', 'hide', 'arrowvine', 'axenut', 'corpsecap', 'flamefruit', 'rockroot', 'snowthistle', 'gold']

function getResourceValue(key: ResourceKey): number {
  return campaignStore.currentCampaign?.resources[key] ?? 0
}

const quickLinks = [
  { to: '/scenare', label: 'Scénáře', desc: 'Přehled a stav scénářů', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { to: '/postavy', label: 'Postavy', desc: 'Správa postav a inventáře', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { to: '/predmety', label: 'Předměty', desc: 'Katalog předmětů', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { to: '/druzina', label: 'Družina', desc: 'Morálka, suroviny, členové', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { to: '/crafting', label: 'Výroba', desc: 'Craftění a alchymie', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { to: '/outpost', label: 'Základna', desc: 'Budovy a vylepšení', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/mapa', label: 'Mapa', desc: 'Mapa světa', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { to: '/nastaveni', label: 'Nastavení', desc: 'Kampaň, data, export', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]
</script>

<template>
  <!-- No campaign: welcome screen -->
  <div v-if="!campaignStore.hasCampaign" class="flex flex-col items-center justify-center min-h-[70vh] text-center">
    <div class="relative mb-6">
      <div class="w-20 h-20 rounded-full bg-fh-primary/10 border border-fh-primary/20 flex items-center justify-center">
        <svg class="w-10 h-10 text-fh-frost" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18m0-18l-3 3m3-3l3 3m-3 15l-3-3m3 3l3-3M3 12h18M3 12l3-3m-3 3l3 3m15-3l-3-3m3 3l-3 3" />
        </svg>
      </div>
      <div class="absolute inset-0 rounded-full bg-fh-primary/5 blur-2xl"></div>
    </div>

    <h1 class="font-display text-3xl sm:text-4xl font-bold text-fh-frost mb-2 tracking-wide">
      Frosthaven Tracker
    </h1>
    <p class="text-gray-400 max-w-md mb-8 text-sm">
      Sleduj průběh své kampaně ve Frosthavenu — scénáře, postavy, předměty a základna.
    </p>

    <!-- Two main paths -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-6">
      <!-- Start playing -->
      <div class="fh-card p-6 text-center space-y-4">
        <div class="w-12 h-12 mx-auto rounded-xl bg-fh-primary/15 border border-fh-primary/25 flex items-center justify-center">
          <svg class="w-6 h-6 text-fh-primary" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
          </svg>
        </div>
        <h2 class="font-display text-lg font-semibold text-fh-frost">Hrát</h2>
        <p class="text-xs text-gray-500">Začni novou kampaň nebo pokračuj v existující</p>
        <div class="space-y-2">
          <button
            class="fh-btn-primary w-full text-sm py-2.5 rounded-lg"
            @click="startNewCampaign"
          >
            Nová kampaň
          </button>
          <router-link
            to="/kampan"
            class="block w-full fh-btn-ghost text-sm py-2 rounded-lg no-underline text-center"
          >
            Načíst existující
          </router-link>
        </div>
      </div>

      <!-- Login / Account -->
      <div class="fh-card p-6 text-center space-y-4">
        <div class="w-12 h-12 mx-auto rounded-xl bg-fh-primary/15 border border-fh-primary/25 flex items-center justify-center">
          <svg class="w-6 h-6 text-fh-primary" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </div>
        <template v-if="authStore.isLoggedIn">
          <h2 class="font-display text-lg font-semibold text-fh-frost">{{ authStore.user?.username }}</h2>
          <p class="text-xs text-gray-500">Přihlášen/a — kampaně se synchronizují</p>
          <div class="fh-badge bg-green-900/20 text-green-400 border border-green-800/30 inline-flex items-center gap-1.5 px-3 py-1">
            <span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>
            Synchronizováno
          </div>
        </template>
        <template v-else>
          <h2 class="font-display text-lg font-semibold text-fh-frost">Účet</h2>
          <p class="text-xs text-gray-500">Přihlas se pro synchronizaci kampaně mezi zařízeními</p>
          <div class="space-y-2">
            <router-link
              to="/prihlaseni"
              class="block w-full fh-btn-secondary text-sm py-2.5 rounded-lg no-underline text-center"
            >
              Přihlásit se
            </router-link>
            <router-link
              to="/registrace"
              class="block w-full fh-btn-ghost text-sm py-2 rounded-lg no-underline text-center"
            >
              Vytvořit účet
            </router-link>
          </div>
        </template>
      </div>
    </div>

    <p class="text-gray-600 text-[11px]">
      Zimní dobrodružství začíná tady.
    </p>
  </div>

  <!-- Has campaign: dashboard -->
  <div v-else>
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost">
        {{ campaignStore.currentCampaign?.name ?? 'Kampaň' }}
      </h1>
    </div>

    <!-- Kde v herní smyčce jsme -->
    <div
      class="fh-card p-5 mb-6 border-l-4"
      :class="pendingOutpost ? 'border-l-fh-required' : 'border-l-fh-primary'"
    >
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <div class="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Další krok</div>
          <div class="font-display text-lg font-bold" :class="pendingOutpost ? 'text-fh-required' : 'text-fh-frost'">
            {{ pendingOutpost ? 'Čeká vás outpost fáze' : 'Vyberte a odehrajte scénář' }}
          </div>
          <p class="text-xs text-gray-500 mt-0.5">
            {{ pendingOutpost
              ? 'Po dokončeném scénáři: běh času, událost, provoz budov, odpočinek a stavba.'
              : `Týden ${campaignStore.currentCampaign?.calendarWeek ?? 1}/80 · nezapomeňte na road event cestou.` }}
          </p>
        </div>
        <router-link
          :to="pendingOutpost ? '/outpost-faze' : '/scenare'"
          class="fh-btn-primary no-underline text-center whitespace-nowrap shrink-0"
        >
          {{ pendingOutpost ? 'Spustit outpost fázi →' : 'Přehled scénářů →' }}
        </router-link>
      </div>
    </div>

    <!-- Key stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="fh-card fh-stat">
        <div class="fh-stat-value text-fh-primary text-2xl">{{ campaignStore.currentCampaign?.morale ?? 0 }}</div>
        <div class="fh-stat-label">Morálka</div>
      </div>
      <div class="fh-card fh-stat">
        <div class="fh-stat-value text-yellow-400 text-2xl">{{ campaignStore.currentCampaign?.prosperity ?? 0 }}</div>
        <div class="fh-stat-label">Prosperita</div>
      </div>
      <div class="fh-card fh-stat">
        <div class="fh-stat-value text-fh-frost text-2xl">{{ campaignStore.currentCampaign?.chapterId ?? 1 }}</div>
        <div class="fh-stat-label">Kapitola</div>
      </div>
      <div class="fh-card fh-stat">
        <div class="fh-stat-value text-fh-primary-light text-2xl">{{ campaignStore.currentCampaign?.inspiration ?? 0 }}</div>
        <div class="fh-stat-label">Inspirace</div>
      </div>
    </div>

    <!-- Quick stats row -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="fh-card p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-fh-completed/15 border border-fh-completed/25 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-fh-completed" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <div class="text-lg font-bold text-gray-200">{{ scenarioStore.completedCount }}</div>
          <div class="text-[10px] text-gray-500 uppercase tracking-wider">Hotových scénářů</div>
        </div>
      </div>
      <div class="fh-card p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-fh-primary/15 border border-fh-primary/25 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-fh-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <div class="text-lg font-bold text-gray-200">{{ characterStore.activeCharacters.length }}</div>
          <div class="text-[10px] text-gray-500 uppercase tracking-wider">Aktivních postav</div>
        </div>
      </div>
    </div>

    <!-- Resources overview -->
    <div class="fh-divider mb-4">Suroviny</div>
    <div class="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-6">
      <div
        v-for="key in resourceKeys"
        :key="key"
        class="fh-card p-2 text-center"
      >
        <div class="text-base font-bold" :class="key === 'gold' ? 'text-yellow-400' : 'text-gray-200'">
          {{ getResourceValue(key) }}
        </div>
        <div class="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5 leading-tight">
          {{ resourceLabels[key] }}
        </div>
      </div>
    </div>

    <!-- Quick links -->
    <div class="fh-divider mb-4">Rychlé odkazy</div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <router-link
        v-for="link in quickLinks"
        :key="link.to"
        :to="link.to"
        class="fh-card fh-card-interactive p-4 no-underline flex items-start gap-3"
      >
        <div class="w-8 h-8 rounded-lg bg-fh-primary/10 border border-fh-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <svg class="w-4 h-4 text-fh-primary-dim" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" :d="link.icon" />
          </svg>
        </div>
        <div>
          <div class="text-sm font-semibold text-fh-primary-light mb-0.5">{{ link.label }}</div>
          <div class="text-[11px] text-gray-500 leading-tight">{{ link.desc }}</div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
a {
  text-decoration: none;
}
</style>
