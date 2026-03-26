<script setup lang="ts">
const features = [
  { icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', title: 'Mapa & diagram scénářů', desc: 'Interaktivní mapa světa a přehledný diagram všech scénářů s větvením příběhu.' },
  { icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z', title: 'Správa postav', desc: 'Sledujte úroveň, zkušenosti, zlato, perky a schopnosti každé postavy.' },
  { icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', title: 'Předměty & výroba', desc: 'Kompletní katalog předmětů s cenami a crafting systém s recepty.' },
  { icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25', title: 'Příběh & questy', desc: 'Sledujte storyline, globální achievementy a osobní úkoly postav.' },
  { icon: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z', title: 'Základna & budovy', desc: '22 budov s upgrady, sezónní události a správa surovin.' },
  { icon: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3', title: 'Offline & PWA', desc: 'Funguje i bez internetu. Nainstalujte si jako appku na mobil nebo PC.' },
]
</script>

<template>
  <div class="min-h-screen bg-gray-950">
    <!-- Hero -->
    <div class="relative overflow-hidden">
      <!-- Top glow -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(91,164,207,0.1),transparent_70%)]" />

      <div class="relative max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <!-- Ice crystal icon -->
        <div class="mb-8">
          <svg class="w-16 h-16 mx-auto text-fh-primary opacity-80" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18m0-18l-3 3m3-3l3 3m-3 15l-3-3m3 3l3-3M3 12h18M3 12l3-3m-3 3l3 3m15-3l-3-3m3 3l-3 3" />
          </svg>
        </div>

        <h1 class="font-display text-5xl sm:text-6xl font-bold text-fh-frost tracking-wide mb-6">
          Frosthaven Tracker
        </h1>

        <!-- Decorative divider -->
        <div class="flex items-center justify-center gap-3 mb-8">
          <div class="w-16 h-px bg-gradient-to-r from-transparent to-fh-primary/40" />
          <div class="w-1.5 h-1.5 rotate-45 bg-fh-primary/60" />
          <div class="w-16 h-px bg-gradient-to-l from-transparent to-fh-primary/40" />
        </div>

        <p class="text-lg text-gray-400 max-w-xl mx-auto mb-4 leading-relaxed">
          Kompletní správa kampaně Frosthaven v češtině. Scénáře, postavy,
          předměty, mapa a příběh — vše na jednom místě.
        </p>

        <p class="text-sm text-gray-600 mb-10">
          Cloud synchronizace &bull; Zdarma &bull; Offline
        </p>

        <!-- CTA buttons -->
        <div class="flex flex-col items-center gap-3 max-w-sm mx-auto">
          <router-link
            to="/registrace"
            class="w-full fh-btn-primary text-base font-display uppercase tracking-widest px-8 py-3.5 rounded-lg text-center"
          >
            Vytvořit účet
          </router-link>
          <router-link
            to="/prihlaseni"
            class="w-full text-base font-display uppercase tracking-widest px-8 py-3.5 rounded-lg text-center border border-fh-primary/50 hover:border-fh-primary text-fh-primary hover:text-fh-primary-light transition-colors"
          >
            Přihlásit se
          </router-link>
          <router-link
            to="/kampan"
            class="w-full text-base font-display uppercase tracking-widest px-8 py-3.5 rounded-lg text-center border border-gray-800 hover:border-gray-600 text-gray-600 hover:text-gray-400 transition-colors"
          >
            Pokračovat bez účtu
          </router-link>
        </div>
      </div>
    </div>

    <!-- Features grid -->
    <div class="max-w-5xl mx-auto px-6 pt-8 pb-24">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="f in features"
          :key="f.title"
          class="rounded-xl border border-fh-border/60 bg-fh-card/50 p-6 hover:border-fh-primary/25 transition-colors text-center sm:text-left"
        >
          <div class="mb-5 flex justify-center sm:justify-start">
            <svg class="w-8 h-8 text-fh-primary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" :d="f.icon" />
            </svg>
          </div>
          <h3 class="font-display text-sm font-semibold uppercase tracking-wider text-fh-primary mb-3">{{ f.title }}</h3>
          <p class="text-sm text-gray-500 leading-relaxed">{{ f.desc }}</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="border-t border-fh-border/30 py-8 text-center">
      <p class="text-xs text-gray-600">
        Frosthaven Tracker &copy; 2026&ensp;
        <a href="https://ongy.cz" class="text-fh-primary/50 hover:text-fh-primary/70 transition-colors">ongy.cz</a>
      </p>
      <p class="text-xs text-gray-700 mt-1">
        Frosthaven je desková hra od
        <a href="https://cephalofair.com" target="_blank" rel="noopener" class="text-fh-primary/40 hover:text-fh-primary/60 transition-colors">Cephalofair Games</a>
      </p>
    </div>
  </div>
</template>
