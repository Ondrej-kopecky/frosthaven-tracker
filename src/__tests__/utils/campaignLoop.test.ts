import { describe, it, expect } from 'vitest'
import {
  seasonForWeek,
  moraleDefenseModifier,
  moraleSectionTrigger,
  inspirationGain,
  coinConversion,
  scenarioLevel,
} from '@/utils/campaignLoop'

describe('seasonForWeek', () => {
  it('střídá sezóny po 10 týdnech', () => {
    expect(seasonForWeek(1)).toBe('summer')
    expect(seasonForWeek(10)).toBe('summer')
    expect(seasonForWeek(11)).toBe('winter')
    expect(seasonForWeek(20)).toBe('winter')
    expect(seasonForWeek(21)).toBe('summer')
    expect(seasonForWeek(31)).toBe('winter')
    expect(seasonForWeek(41)).toBe('summer')
    expect(seasonForWeek(80)).toBe('winter')
  })
})

describe('moraleDefenseModifier', () => {
  it('odpovídá tabulce kampaňového listu', () => {
    expect(moraleDefenseModifier(0)).toBe(-10)
    expect(moraleDefenseModifier(2)).toBe(-10)
    expect(moraleDefenseModifier(3)).toBe(-5)
    expect(moraleDefenseModifier(4)).toBe(-5)
    expect(moraleDefenseModifier(5)).toBe(0)
    expect(moraleDefenseModifier(7)).toBe(0)
    expect(moraleDefenseModifier(8)).toBe(5)
    expect(moraleDefenseModifier(10)).toBe(5)
    expect(moraleDefenseModifier(11)).toBe(10)
    expect(moraleDefenseModifier(13)).toBe(10)
    expect(moraleDefenseModifier(14)).toBe(15)
    expect(moraleDefenseModifier(20)).toBe(15)
  })
})

describe('moraleSectionTrigger', () => {
  it('spouští sekce na krajích tracku', () => {
    expect(moraleSectionTrigger(0)).toBe('low')
    expect(moraleSectionTrigger(20)).toBe('high')
    expect(moraleSectionTrigger(10)).toBeNull()
  })
})

describe('inspirationGain', () => {
  it('4 minus počet postav, min 0', () => {
    expect(inspirationGain(2)).toBe(2)
    expect(inspirationGain(3)).toBe(1)
    expect(inspirationGain(4)).toBe(0)
    expect(inspirationGain(5)).toBe(0)
  })
})

describe('coinConversion', () => {
  it('tabulka 2/2/3/3/4/4/5/6 pro úrovně 0–7', () => {
    expect(coinConversion(0)).toBe(2)
    expect(coinConversion(1)).toBe(2)
    expect(coinConversion(2)).toBe(3)
    expect(coinConversion(4)).toBe(4)
    expect(coinConversion(7)).toBe(6)
    expect(coinConversion(9)).toBe(6)
  })
})

describe('scenarioLevel', () => {
  it('zaokrouhluje průměr / 2 nahoru', () => {
    expect(scenarioLevel([])).toBe(0)
    expect(scenarioLevel([1, 1, 1])).toBe(1)
    expect(scenarioLevel([3, 4])).toBe(2)
    expect(scenarioLevel([9, 9, 9, 9])).toBe(5)
  })
})
