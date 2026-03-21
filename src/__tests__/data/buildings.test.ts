import { describe, it, expect } from 'vitest'
import buildings from '@/data/buildings.json'

describe('buildings.json', () => {
  it('is an array', () => {
    expect(Array.isArray(buildings)).toBe(true)
  })

  it('contains exactly 22 buildings', () => {
    expect(buildings).toHaveLength(22)
  })

  it('each building has required fields', () => {
    for (const building of buildings) {
      expect(typeof building.id).toBe('number')
      expect(typeof building.name).toBe('string')
      expect(building.name.length).toBeGreaterThan(0)
      expect(typeof building.maxLevel).toBe('number')
      expect(Array.isArray(building.levels)).toBe(true)
    }
  })

  it('each building has levels array matching maxLevel', () => {
    for (const building of buildings) {
      expect(building.levels).toHaveLength(building.maxLevel)
    }
  })

  it('levels are sequential starting from 1', () => {
    for (const building of buildings) {
      for (let i = 0; i < building.levels.length; i++) {
        expect(building.levels[i].level).toBe(i + 1)
      }
    }
  })

  it('has no duplicate IDs', () => {
    const ids = buildings.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each level has a level number', () => {
    for (const building of buildings) {
      for (const level of building.levels) {
        expect(typeof level.level).toBe('number')
        expect(level.level).toBeGreaterThan(0)
      }
    }
  })

  it('maxLevel is at least 1', () => {
    for (const building of buildings) {
      expect(building.maxLevel).toBeGreaterThanOrEqual(1)
    }
  })

  it('each building has a positive id', () => {
    for (const building of buildings) {
      expect(building.id).toBeGreaterThan(0)
    }
  })
})
