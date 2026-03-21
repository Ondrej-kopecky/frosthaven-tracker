import { describe, it, expect } from 'vitest'
import scenarios from '@/data/scenarios.json'

describe('scenarios.json', () => {
  it('is an array', () => {
    expect(Array.isArray(scenarios)).toBe(true)
  })

  it('contains exactly 99 scenarios', () => {
    expect(scenarios).toHaveLength(99)
  })

  it('each scenario has required fields', () => {
    for (const scenario of scenarios) {
      expect(typeof scenario.id).toBe('number')
      expect(typeof scenario.name).toBe('string')
      expect(scenario.name.length).toBeGreaterThan(0)
      expect(Array.isArray(scenario.links_to)).toBe(true)
      expect(Array.isArray(scenario.linked_from)).toBe(true)
      expect(typeof scenario.root).toBe('boolean')
    }
  })

  it('each scenario has an id field that is a number', () => {
    for (const scenario of scenarios) {
      expect(Number.isInteger(scenario.id)).toBe(true)
    }
  })

  it('scenario 0 is root', () => {
    const root = scenarios.find((s) => s.id === 0)
    expect(root).toBeDefined()
    expect(root!.root).toBe(true)
  })

  it('scenario 0 has empty linked_from', () => {
    const root = scenarios.find((s) => s.id === 0)
    expect(root!.linked_from).toHaveLength(0)
  })

  it('has no duplicate IDs', () => {
    const ids = scenarios.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all links_to reference valid scenario IDs', () => {
    const validIds = new Set(scenarios.map((s) => s.id))
    for (const scenario of scenarios) {
      for (const linkId of scenario.links_to) {
        expect(validIds.has(linkId)).toBe(true)
      }
    }
  })

  it('all linked_from reference valid scenario IDs', () => {
    const validIds = new Set(scenarios.map((s) => s.id))
    for (const scenario of scenarios) {
      for (const linkId of scenario.linked_from) {
        expect(validIds.has(linkId)).toBe(true)
      }
    }
  })

  it('links_to and linked_from are consistent (bidirectional)', () => {
    const byId = new Map(scenarios.map((s) => [s.id, s]))
    for (const scenario of scenarios) {
      for (const targetId of scenario.links_to) {
        const target = byId.get(targetId)!
        expect(target.linked_from).toContain(scenario.id)
      }
    }
  })

  it('each scenario has chapter_id field', () => {
    for (const scenario of scenarios) {
      expect(typeof scenario.chapter_id).toBe('number')
    }
  })

  it('each scenario has complexity field', () => {
    for (const scenario of scenarios) {
      expect(typeof scenario.complexity).toBe('number')
    }
  })

  it('each scenario has treasures array', () => {
    for (const scenario of scenarios) {
      expect(Array.isArray(scenario.treasures)).toBe(true)
    }
  })

  it('has exactly 2 root scenarios (id 0 and 1)', () => {
    const roots = scenarios.filter((s) => s.root)
    expect(roots).toHaveLength(2)
    expect(roots.map((r) => r.id).sort()).toEqual([0, 1])
  })
})
