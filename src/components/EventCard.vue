<script setup lang="ts">
import { computed } from 'vue'
import { useEventStore, type DeckId } from '@/stores/eventStore'

const eventStore = useEventStore()

const card = computed(() => eventStore.drawnCard)

const frontUrl = computed(() => {
  if (!card.value) return ''
  return eventStore.cardImageUrl(card.value.deckId, card.value.cardNum, 'f')
})

const backUrl = computed(() => {
  if (!card.value) return ''
  return eventStore.cardImageUrl(card.value.deckId, card.value.cardNum, 'b')
})

const deckName = computed(() => {
  if (!card.value) return ''
  return eventStore.deckDefs[card.value.deckId]?.name ?? ''
})

function handleFlip() {
  if (card.value && !card.value.flipped) {
    eventStore.flipCard()
  }
}

function handleReturn() {
  eventStore.returnCard()
}

function handleRemove() {
  if (!card.value) return
  eventStore.removeCard(card.value.deckId, card.value.cardNum)
}
</script>

<template>
  <Teleport to="body">
    <transition name="modal">
      <div v-if="card" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="handleReturn" />

        <!-- Card container -->
        <div class="relative z-10 w-full max-w-md">
          <!-- Header -->
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm text-gray-400">
              <span class="text-fh-primary font-display font-bold">{{ deckName }}</span>
              <span class="text-gray-600 ml-2">#{{ card.cardNum }}</span>
            </div>
            <button
              class="text-gray-500 hover:text-gray-300 p-1 transition-colors"
              @click="handleReturn"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Card with flip -->
          <div
            class="card-flip cursor-pointer"
            :class="{ 'is-flipped': card.flipped }"
            @click="handleFlip"
          >
            <div class="card-flip-inner">
              <!-- Front -->
              <div class="card-flip-front">
                <img
                  :src="frontUrl"
                  :alt="`${deckName} #${card.cardNum} - přední strana`"
                  class="w-full rounded-xl shadow-2xl border border-fh-border"
                  loading="eager"
                />
                <div v-if="!card.flipped" class="absolute inset-0 flex items-end justify-center pb-6">
                  <span class="px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full text-sm text-gray-300 border border-white/10">
                    Klikni pro otočení
                  </span>
                </div>
              </div>

              <!-- Back -->
              <div class="card-flip-back">
                <img
                  :src="backUrl"
                  :alt="`${deckName} #${card.cardNum} - zadní strana`"
                  class="w-full rounded-xl shadow-2xl border border-fh-border"
                  loading="eager"
                />
              </div>
            </div>
          </div>

          <!-- Action buttons (visible after flip) -->
          <transition name="fade">
            <div v-if="card.flipped" class="flex gap-3 mt-4">
              <button
                class="flex-1 fh-btn-ghost py-2.5 text-sm flex items-center justify-center gap-2 rounded-xl"
                @click="handleReturn"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
                Vrátit do balíčku
              </button>
              <button
                class="flex-1 py-2.5 text-sm flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                @click="handleRemove"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Odebrat z hry
              </button>
            </div>
          </transition>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.card-flip {
  perspective: 1000px;
  position: relative;
}

.card-flip-inner {
  position: relative;
  transition: transform 0.6s ease;
  transform-style: preserve-3d;
}

.card-flip.is-flipped .card-flip-inner {
  transform: rotateY(180deg);
}

.card-flip-front,
.card-flip-back {
  position: relative;
  backface-visibility: hidden;
}

.card-flip-back {
  position: absolute;
  inset: 0;
  transform: rotateY(180deg);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
