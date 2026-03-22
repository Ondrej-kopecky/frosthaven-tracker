<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const menuOpen = ref(false)

function handleLogout() {
  authStore.logout()
  menuOpen.value = false
  router.push('/prihlaseni')
}

// Primary nav (always visible on desktop)
const primaryNav = [
  { path: '/prehled', label: 'Domů', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/prehled-scenaru', label: 'Přehled', icon: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5' },
  { path: '/mapa', label: 'Mapa', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { path: '/scenare', label: 'Scénáře', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { path: '/outpost', label: 'Základna', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { path: '/druzina', label: 'Družina', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
] as const

// Secondary nav (visible in dropdown/hamburger)
const secondaryNav = [
  { path: '/postavy', label: 'Postavy', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { path: '/predmety', label: 'Předměty', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { path: '/crafting', label: 'Výroba', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { path: '/achievementy', label: 'Úspěchy', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  { path: '/osobni-ukoly', label: 'Úkoly', icon: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z' },
  { path: '/pribeh', label: 'Příběh', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
] as const

// Desktop: more dropdown open state
const moreOpen = ref(false)

function closeMoreDelayed() {
  window.setTimeout(() => { moreOpen.value = false }, 150)
}

function isActive(path: string): boolean {
  return route.path === path
}

function isSecondaryActive(): boolean {
  return secondaryNav.some((item) => route.path === item.path)
}
</script>

<template>
  <header class="fixed top-0 left-0 right-0 z-50 bg-fh-dark/95 backdrop-blur-sm border-b border-fh-border safe-area-top">
    <div class="max-w-7xl mx-auto px-3 h-14 flex items-center justify-between">
      <!-- Logo -->
      <router-link to="/" class="flex items-center gap-2 no-underline shrink-0 group">
        <!-- Snowflake icon -->
        <svg class="w-7 h-7 shrink-0 transition-transform duration-300 group-hover:rotate-30" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="hdr-ice" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#a8d8ea"/>
              <stop offset="50%" stop-color="#5ba4cf"/>
              <stop offset="100%" stop-color="#3a7a9e"/>
            </linearGradient>
            <linearGradient id="hdr-glow" x1="24" y1="4" x2="24" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#cce7f0"/>
              <stop offset="100%" stop-color="#5ba4cf"/>
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="3.5" fill="url(#hdr-glow)" opacity="0.9"/>
          <g stroke="url(#hdr-ice)" stroke-width="2.5" stroke-linecap="round">
            <line x1="24" y1="5" x2="24" y2="43"/>
            <line x1="24" y1="24" x2="40.5" y2="14.5"/>
            <line x1="24" y1="24" x2="7.5" y2="33.5"/>
            <line x1="24" y1="24" x2="40.5" y2="33.5"/>
            <line x1="24" y1="24" x2="7.5" y2="14.5"/>
          </g>
          <g stroke="url(#hdr-glow)" stroke-width="1.6" stroke-linecap="round" opacity="0.85">
            <line x1="24" y1="11" x2="28" y2="14"/>
            <line x1="24" y1="11" x2="20" y2="14"/>
            <line x1="24" y1="37" x2="28" y2="34"/>
            <line x1="24" y1="37" x2="20" y2="34"/>
            <line x1="34.5" y1="18" x2="33.5" y2="22"/>
            <line x1="13.5" y1="30" x2="14.5" y2="26"/>
            <line x1="13.5" y1="18" x2="14.5" y2="22"/>
            <line x1="34.5" y1="30" x2="33.5" y2="26"/>
          </g>
          <g fill="url(#hdr-glow)" opacity="0.9">
            <circle cx="24" cy="5" r="1.8"/>
            <circle cx="24" cy="43" r="1.8"/>
            <circle cx="40.5" cy="14.5" r="1.8"/>
            <circle cx="7.5" cy="33.5" r="1.8"/>
            <circle cx="40.5" cy="33.5" r="1.8"/>
            <circle cx="7.5" cy="14.5" r="1.8"/>
          </g>
        </svg>
        <span class="font-display text-fh-frost text-sm font-bold tracking-widest hidden sm:inline">FROSTHAVEN</span>
        <span class="font-display text-fh-frost text-xs font-bold tracking-wider sm:hidden">FH Tracker</span>
        <span class="text-fh-primary-dim text-[10px] font-semibold tracking-widest uppercase hidden sm:block">Tracker</span>
      </router-link>

      <!-- Desktop nav -->
      <nav class="hidden lg:flex items-center gap-0.5">
        <!-- Primary: icon + short label -->
        <router-link
          v-for="item in primaryNav"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all no-underline"
          :class="isActive(item.path)
            ? 'bg-fh-primary/15 text-fh-primary-light'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          {{ item.label }}
        </router-link>

        <!-- More dropdown -->
        <div class="relative">
          <button
            class="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
            :class="isSecondaryActive()
              ? 'bg-fh-primary/15 text-fh-primary-light'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'"
            @click="moreOpen = !moreOpen"
            @blur="closeMoreDelayed"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            Více
            <svg class="w-3 h-3 transition-transform" :class="moreOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          <Transition name="dropdown">
            <div v-if="moreOpen" class="absolute right-0 top-full mt-1 w-48 bg-fh-card border border-fh-border rounded-xl shadow-xl py-1 z-50">
              <router-link
                v-for="item in secondaryNav"
                :key="item.path"
                :to="item.path"
                class="flex items-center gap-2.5 px-3 py-2 text-sm no-underline transition-colors"
                :class="isActive(item.path)
                  ? 'text-fh-primary-light bg-fh-primary/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'"
                @click="moreOpen = false"
              >
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
                </svg>
                {{ item.label }}
              </router-link>
            </div>
          </Transition>
        </div>

        <!-- Separator -->
        <div class="w-px h-5 bg-fh-border/50 mx-1.5"></div>

        <!-- Settings — distinct amber/warm color -->
        <router-link
          to="/nastaveni"
          title="Nastavení"
          class="flex items-center justify-center w-8 h-8 rounded-lg transition-all no-underline"
          :class="isActive('/nastaveni')
            ? 'bg-amber-500/15 text-amber-400'
            : 'text-gray-500 hover:text-amber-400 hover:bg-amber-500/10'"
        >
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </router-link>

        <!-- User / Login -->
        <template v-if="authStore.isLoggedIn">
          <button
            class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-fh-primary/10 text-fh-primary hover:bg-fh-primary/20 transition-all"
            :title="authStore.user?.username"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ authStore.user?.username }}
          </button>
          <button
            class="px-1.5 py-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Odhlásit se"
            @click="handleLogout"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </template>
        <router-link
          v-else-if="authStore.isInitialized"
          to="/prihlaseni"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium no-underline bg-fh-primary/8 text-fh-primary-dim border border-fh-primary/15 hover:text-fh-primary hover:bg-fh-primary/15 transition-all"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Přihlásit
        </router-link>
      </nav>

      <!-- Mobile: hamburger -->
      <div class="lg:hidden flex items-center gap-2">
        <router-link
          v-if="authStore.isLoggedIn"
          to="/nastaveni"
          class="p-2 text-fh-primary no-underline"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </router-link>

        <button
          class="p-2 text-gray-400 hover:text-gray-200 transition-colors"
          @click="menuOpen = !menuOpen"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path v-if="!menuOpen" stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <Transition name="slide">
      <div v-if="menuOpen" class="lg:hidden border-t border-fh-border bg-fh-dark/98 backdrop-blur-sm max-h-[80vh] overflow-y-auto">
        <!-- Primary nav -->
        <nav class="px-4 pt-3 pb-2">
          <div class="text-[10px] text-gray-600 uppercase tracking-widest px-2 mb-2">Hlavní</div>
          <div class="grid grid-cols-3 gap-1.5">
            <router-link
              v-for="item in primaryNav"
              :key="item.path"
              :to="item.path"
              class="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-center transition-all no-underline"
              :class="isActive(item.path)
                ? 'bg-fh-primary/15 text-fh-primary-light'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'"
              @click="menuOpen = false"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span class="text-[11px] font-medium">{{ item.label }}</span>
            </router-link>
          </div>
        </nav>

        <!-- Secondary nav -->
        <nav class="px-4 pb-2">
          <div class="text-[10px] text-gray-600 uppercase tracking-widest px-2 mb-2">Správa</div>
          <div class="grid grid-cols-3 gap-1.5">
            <router-link
              v-for="item in secondaryNav"
              :key="item.path"
              :to="item.path"
              class="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-center transition-all no-underline"
              :class="isActive(item.path)
                ? 'bg-fh-primary/15 text-fh-primary-light'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'"
              @click="menuOpen = false"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
              </svg>
              <span class="text-[11px] font-medium">{{ item.label }}</span>
            </router-link>
          </div>
        </nav>

        <!-- Settings + Auth -->
        <div class="px-4 pb-4 pt-2 border-t border-fh-border/30">
          <div class="flex gap-2 mb-3">
            <router-link
              to="/nastaveni"
              class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium no-underline transition-all"
              :class="isActive('/nastaveni')
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                : 'text-gray-400 bg-white/3 border border-fh-border hover:text-amber-400 hover:bg-amber-500/10'"
              @click="menuOpen = false"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Nastavení
            </router-link>
          </div>

          <template v-if="authStore.isLoggedIn">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm text-fh-primary">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {{ authStore.user?.username }}
              </div>
              <button
                class="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                @click="handleLogout"
              >
                Odhlásit
              </button>
            </div>
          </template>
          <template v-else-if="authStore.isInitialized">
            <div class="flex gap-2">
              <router-link
                to="/prihlaseni"
                class="flex-1 text-center py-2.5 rounded-lg text-sm font-medium text-fh-primary bg-fh-primary/10 border border-fh-primary/20 no-underline hover:bg-fh-primary/20 transition-all"
                @click="menuOpen = false"
              >
                Přihlásit se
              </router-link>
              <router-link
                to="/registrace"
                class="flex-1 text-center py-2.5 rounded-lg text-sm font-medium text-gray-400 bg-white/5 border border-fh-border no-underline hover:bg-white/10 transition-all"
                @click="menuOpen = false"
              >
                Registrace
              </router-link>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

a {
  text-decoration: none;
}
</style>
