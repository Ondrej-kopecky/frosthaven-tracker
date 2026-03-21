import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useCampaignStore } from './campaignStore'
import eventsData from '@/data/events.json'

export type DeckId = 'summerRoad' | 'winterRoad' | 'summerOutpost' | 'winterOutpost' | 'boat'

export interface DeckDef {
  name: string
  code: string
  season: string
  type: string
  startCards: number[]
  totalCards: number
}

export interface DeckState {
  /** Cards currently in the draw pile */
  available: number[]
  /** Cards that have been removed from the game */
  removed: number[]
}

const deckDefs = eventsData.decks as Record<DeckId, DeckDef>

export const useEventStore = defineStore('events', () => {
  const campaignStore = useCampaignStore()

  // Current drawn card state
  const drawnCard = ref<{ deckId: DeckId; cardNum: number; flipped: boolean } | null>(null)

  // Get or initialize deck state from campaign
  function getDeckState(deckId: DeckId): DeckState {
    const campaign = campaignStore.currentCampaign as Record<string, unknown> | null
    if (!campaign) return { available: [...deckDefs[deckId].startCards], removed: [] }

    if (!campaign.eventDecks) campaign.eventDecks = {}
    const decks = campaign.eventDecks as Record<string, DeckState>

    if (!decks[deckId]) {
      decks[deckId] = {
        available: [...deckDefs[deckId].startCards],
        removed: [],
      }
    }
    return decks[deckId]
  }

  function saveDeckState(deckId: DeckId, state: DeckState) {
    const campaign = campaignStore.currentCampaign as Record<string, unknown> | null
    if (!campaign) return
    if (!campaign.eventDecks) campaign.eventDecks = {}
    ;(campaign.eventDecks as Record<string, DeckState>)[deckId] = state
    campaignStore.autoSave()
  }

  // Draw a random card from deck
  function drawCard(deckId: DeckId): number | null {
    const state = getDeckState(deckId)
    if (state.available.length === 0) return null

    const idx = Math.floor(Math.random() * state.available.length)
    const cardNum = state.available[idx]

    drawnCard.value = { deckId, cardNum, flipped: false }
    return cardNum
  }

  // Flip the drawn card
  function flipCard() {
    if (drawnCard.value) {
      drawnCard.value = { ...drawnCard.value, flipped: true }
    }
  }

  // Return card to deck (shuffle back)
  function returnCard() {
    drawnCard.value = null
  }

  // Remove card from game (after resolving)
  function removeCard(deckId: DeckId, cardNum: number) {
    const state = getDeckState(deckId)
    state.available = state.available.filter((c) => c !== cardNum)
    state.removed.push(cardNum)
    saveDeckState(deckId, state)
    drawnCard.value = null
  }

  // Add a card to a deck (from scenario reward)
  function addCard(deckId: DeckId, cardNum: number) {
    const state = getDeckState(deckId)
    if (!state.available.includes(cardNum) && !state.removed.includes(cardNum)) {
      state.available.push(cardNum)
      saveDeckState(deckId, state)
    }
  }

  // Remove all cards of a faction from all outpost decks
  function removeFactionCards(faction: string) {
    // This is a simplified version — in practice, specific card numbers
    // would be associated with factions. For now, just log it.
    console.log(`Remove ${faction} events from outpost decks`)
  }

  // Reset deck to starting cards
  function resetDeck(deckId: DeckId) {
    const state: DeckState = {
      available: [...deckDefs[deckId].startCards],
      removed: [],
    }
    saveDeckState(deckId, state)
    drawnCard.value = null
  }

  // Computed helpers
  function availableCount(deckId: DeckId): number {
    return getDeckState(deckId).available.length
  }

  function removedCount(deckId: DeckId): number {
    return getDeckState(deckId).removed.length
  }

  // Get decks filtered by season
  function getDecksByType(season: 'summer' | 'winter'): { id: DeckId; def: DeckDef }[] {
    return (Object.entries(deckDefs) as [DeckId, DeckDef][])
      .filter(([, def]) => def.season === season || def.season === 'both')
      .map(([id, def]) => ({ id, def }))
  }

  // Card image URL
  function cardImageUrl(deckId: DeckId, cardNum: number, side: 'f' | 'b'): string {
    return `/img/events/${deckId}/${cardNum}-${side}.webp`
  }

  return {
    deckDefs,
    drawnCard,
    getDeckState,
    drawCard,
    flipCard,
    returnCard,
    removeCard,
    addCard,
    removeFactionCards,
    resetDeck,
    availableCount,
    removedCount,
    getDecksByType,
    cardImageUrl,
  }
})
