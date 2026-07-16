import { describe, it, expect } from 'vitest'
import {
  BASE_TOWN_GUARD_DECK,
  computeTownGuardDeck,
  deckSize,
  cardLabel,
} from '@/utils/townGuardDeck'

function countOf(deck: ReturnType<typeof computeTownGuardDeck>, value: number, special?: 'wreck' | 'success') {
  return deck
    .filter((e) => e.card.value === value && e.card.special === special && !e.card.effect && !e.card.rolling)
    .reduce((s, e) => s + e.count, 0)
}

describe('townGuardDeck', () => {
  it('základní deck má 20 karet ve správném složení', () => {
    expect(deckSize(BASE_TOWN_GUARD_DECK)).toBe(20)
    const deck = computeTownGuardDeck({})
    expect(deckSize(deck)).toBe(20)
    expect(countOf(deck, 0)).toBe(6)
    expect(countOf(deck, 10)).toBe(5)
    expect(countOf(deck, 20)).toBe(1)
    expect(countOf(deck, -10)).toBe(5)
    expect(countOf(deck, -20)).toBe(1)
    expect(countOf(deck, 0, 'wreck')).toBe(1)
    expect(countOf(deck, 0, 'success')).toBe(1)
  })

  it('replace perk (index 2: odeber 1×−10, přidej 1×+10) zachová velikost a změní složení', () => {
    const deck = computeTownGuardDeck({ 2: 1 })
    expect(deckSize(deck)).toBe(20) // replace nemění počet karet
    expect(countOf(deck, -10)).toBe(4) // 5 − 1
    expect(countOf(deck, 10)).toBe(6) // 5 + 1
  })

  it('add perk (index 5: přidej 1×+30) zvětší deck o 1', () => {
    const deck = computeTownGuardDeck({ 5: 1 })
    expect(deckSize(deck)).toBe(21)
    expect(countOf(deck, 30)).toBe(1)
  })

  it('vícenásobná aplikace stejného perku se sčítá', () => {
    const deck = computeTownGuardDeck({ 2: 2 })
    expect(countOf(deck, -10)).toBe(3) // 5 − 2
    expect(countOf(deck, 10)).toBe(7) // 5 + 2
    expect(deckSize(deck)).toBe(20)
  })

  it('replace perk se zdrojovým efektem (index 0) přidá kartu s effect a rolling-free −20', () => {
    const deck = computeTownGuardDeck({ 0: 1 })
    // odeber 1×−10 → 4
    expect(countOf(deck, -10)).toBe(4)
    // přidá +30 (bez efektu) a −20 se zdrojovým efektem
    expect(countOf(deck, 30)).toBe(1)
    const resourceMinus20 = deck.find((e) => e.card.value === -20 && e.card.effect)
    expect(resourceMinus20?.count).toBe(1)
    // velikost: −1 +2 = +1
    expect(deckSize(deck)).toBe(21)
  })

  it('neznámý index perku nebo nula použití nic nezmění', () => {
    expect(deckSize(computeTownGuardDeck({ 999: 3 }))).toBe(20)
    expect(deckSize(computeTownGuardDeck({ 2: 0 }))).toBe(20)
  })

  it('cardLabel formátuje hodnoty a speciální karty', () => {
    expect(cardLabel({ value: 10 })).toBe('+10')
    expect(cardLabel({ value: -20 })).toBe('−20')
    expect(cardLabel({ value: 0 })).toBe('±0')
    expect(cardLabel({ value: 0, special: 'wreck' })).toBe('Wreck')
    expect(cardLabel({ value: 0, special: 'success' })).toBe('Success')
    expect(cardLabel({ value: 0, rolling: true, effect: 'dřevo' })).toBe('±0 (rolling, dřevo)')
  })
})
