import { describe, it, expect } from 'vitest'
import personalQuests from '@/data/personal-quests.json'

describe('personal-quests.json', () => {
  it('is an array', () => {
    expect(Array.isArray(personalQuests)).toBe(true)
  })

  it('contains exactly 23 quests', () => {
    expect(personalQuests).toHaveLength(23)
  })

  it('each quest has required fields', () => {
    for (const quest of personalQuests) {
      expect(typeof quest.id).toBe('number')
      expect(typeof quest.name).toBe('string')
      expect(quest.name.length).toBeGreaterThan(0)
      expect(Array.isArray(quest.progress)).toBe(true)
    }
  })

  it('each quest has at least one progress item', () => {
    for (const quest of personalQuests) {
      expect(quest.progress.length).toBeGreaterThan(0)
    }
  })

  it('each progress item has type "checkbox" or "number"', () => {
    for (const quest of personalQuests) {
      for (const progress of quest.progress) {
        expect(['checkbox', 'number']).toContain(progress.type)
      }
    }
  })

  it('each progress item has a name', () => {
    for (const quest of personalQuests) {
      for (const progress of quest.progress) {
        expect(typeof progress.name).toBe('string')
        expect(progress.name.length).toBeGreaterThan(0)
      }
    }
  })

  it('has no duplicate IDs', () => {
    const ids = personalQuests.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('IDs are positive integers', () => {
    for (const quest of personalQuests) {
      expect(Number.isInteger(quest.id)).toBe(true)
      expect(quest.id).toBeGreaterThan(0)
    }
  })

  it('checkbox progress items have value arrays', () => {
    for (const quest of personalQuests) {
      for (const progress of quest.progress) {
        if (progress.type === 'checkbox') {
          expect(Array.isArray(progress.value)).toBe(true)
        }
      }
    }
  })
})
