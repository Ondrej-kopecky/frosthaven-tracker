<script setup lang="ts">
import { onMounted } from 'vue'
import { useCampaignStore } from '@/stores/campaignStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useCharacterStore } from '@/stores/characterStore'
import { useRouter } from 'vue-router'

const campaignStore = useCampaignStore()
const scenarioStore = useScenarioStore()
const characterStore = useCharacterStore()
const router = useRouter()

onMounted(async () => {
  await scenarioStore.loadScenarioData()
})

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
    <div class="relative mb-8">
      <!-- Frost crystal icon -->
      <div class="w-24 h-24 rounded-full bg-fh-primary/10 border border-fh-primary/20 flex items-center justify-center">
        <svg class="w-12 h-12 text-fh-frost" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18m0-18l-3 3m3-3l3 3m-3 15l-3-3m3 3l3-3M3 12h18M3 12l3-3m-3 3l3 3m15-3l-3-3m3 3l-3 3" />
        </svg>
      </div>
      <div class="absolute inset-0 rounded-full bg-fh-primary/5 blur-2xl"></div>
    </div>

    <h1 class="font-display text-3xl sm:text-4xl font-bold text-fh-frost mb-3 tracking-wide">
      Frosthaven Tracker
    </h1>
    <p class="text-gray-400 max-w-md mb-2 text-sm sm:text-base">
      Sleduj průběh své kampaně ve Frosthavenu. Scénáře, postavy, předměty, výroba a základna — vše na jednom místě.
    </p>
    <p class="text-gray-500 text-xs mb-8">
      Zimní dobrodružství začíná tady.
    </p>

    <button
      class="fh-btn-primary text-base px-8 py-3 rounded-xl"
      @click="startNewCampaign"
    >
      Začít kampaň
    </button>

    <router-link
      to="/kampan"
      class="mt-4 text-fh-primary-dim text-sm hover:text-fh-primary transition-colors no-underline"
    >
      Nebo načíst existující kampaň
    </router-link>

    <!-- Login/Register section -->
    <div class="mt-10 pt-6 border-t border-fh-border/30 flex flex-col items-center gap-3">
      <p class="text-xs text-gray-600">Přihlas se pro synchronizaci kampaně mezi zařízeními</p>
      <div class="flex gap-3">
        <router-link
          to="/prihlaseni"
          class="fh-btn-secondary text-sm px-5 py-2 no-underline flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Přihlásit se
        </router-link>
        <router-link
          to="/registrace"
          class="fh-btn-ghost text-sm px-5 py-2 no-underline flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
          </svg>
          Registrace
        </router-link>
      </div>
    </div>
  </div>

  <!-- Has campaign: dashboard -->
  <div v-else>
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost">
        {{ campaignStore.currentCampaign?.name ?? 'Kampaň' }}
      </h1>
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
