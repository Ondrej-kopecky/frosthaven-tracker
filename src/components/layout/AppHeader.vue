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

const navItems = [
  { path: '/prehled', label: 'Domů', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/prehled-scenaru', label: 'Přehled', icon: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5' },
  { path: '/mapa', label: 'Mapa', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { path: '/scenare', label: 'Scénáře', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { path: '/outpost', label: 'Základna', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { path: '/druzina', label: 'Družina', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { path: '/postavy', label: 'Postavy', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { path: '/predmety', label: 'Předměty', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { path: '/crafting', label: 'Výroba', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { path: '/achievementy', label: 'Úspěchy', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  { path: '/osobni-ukoly', label: 'Úkoly', icon: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z' },
  { path: '/pribeh', label: 'Příběh', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
  { path: '/nastaveni', label: 'Nastavení', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
] as const

function isActive(path: string): boolean {
  return route.path === path
}
</script>

<template>
  <header class="fixed top-0 left-0 right-0 z-50 bg-fh-dark/95 backdrop-blur-sm border-b border-fh-border safe-area-top">
    <div class="max-w-7xl mx-auto px-3 h-14 flex items-center justify-between">
      <!-- Logo -->
      <router-link to="/" class="flex items-center gap-1.5 no-underline shrink-0">
        <span class="font-display text-fh-frost text-base font-bold tracking-wider">FH</span>
        <span class="text-fh-primary-dim text-[10px] font-medium tracking-widest uppercase hidden xl:block">Tracker</span>
      </router-link>

      <!-- Desktop nav: icon-only with tooltips to fit -->
      <nav class="hidden lg:flex items-center gap-0.5">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :title="item.label"
          class="relative flex items-center justify-center w-9 h-9 rounded-lg transition-all no-underline group"
          :class="isActive(item.path)
            ? 'bg-fh-primary/15 text-fh-primary-light'
            : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'"
        >
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          <!-- Tooltip -->
          <span class="absolute -bottom-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-fh-card border border-fh-border rounded text-[10px] text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {{ item.label }}
          </span>
        </router-link>

        <!-- Separator -->
        <div class="w-px h-5 bg-fh-border/50 mx-1"></div>

        <!-- User / Login button (desktop) -->
        <template v-if="authStore.isLoggedIn">
          <router-link
            to="/nastaveni"
            class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium no-underline bg-fh-primary/10 text-fh-primary hover:bg-fh-primary/20 transition-all"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ authStore.user?.username }}
          </router-link>
          <button
            class="px-1.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Odhlásit se"
            @click="handleLogout"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </template>
        <router-link
          v-else
          to="/prihlaseni"
          class="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium no-underline text-gray-400 hover:text-fh-primary hover:bg-white/5 transition-all"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Přihlásit
        </router-link>
      </nav>

      <!-- Mobile: user icon + hamburger -->
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
        <router-link
          v-else
          to="/prihlaseni"
          class="p-2 text-gray-400 hover:text-fh-primary no-underline transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
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

    <!-- Mobile slide-out menu — centered items -->
    <Transition name="slide">
      <div v-if="menuOpen" class="lg:hidden border-t border-fh-border bg-fh-dark/98 backdrop-blur-sm max-h-[80vh] overflow-y-auto">
        <nav class="px-6 py-4 grid grid-cols-2 gap-2">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-center transition-all no-underline"
            :class="isActive(item.path)
              ? 'bg-fh-primary/15 text-fh-primary-light'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'"
            @click="menuOpen = false"
          >
            <svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
            </svg>
            <span class="text-xs font-medium">{{ item.label }}</span>
          </router-link>
        </nav>

        <!-- Auth section -->
        <div class="px-6 pb-4 pt-2 border-t border-fh-border/30">
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
          <template v-else>
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

a {
  text-decoration: none;
}
</style>
