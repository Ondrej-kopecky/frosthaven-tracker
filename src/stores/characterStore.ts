import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CharacterDefinition, CharacterResources, CharacterState } from '@/models/Character'
import { createDefaultCharacter, emptyCharacterResources } from '@/models/Character'
import type { ItemData } from '@/models/Item'
import charactersData from '@/data/characters.json'
import itemsData from '@/data/items.json'
import { useCampaignStore } from './campaignStore'
import { generateId } from '@/utils/uuid'

// XP thresholds for levels 1-9
const XP_THRESHOLDS = [0, 45, 95, 150, 210, 275, 345, 420, 500] as const

function getLevelFromXp(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1
  }
  return 1
}

export const useCharacterStore = defineStore('character', () => {
  const campaignStore = useCampaignStore()

  const definitions = ref<CharacterDefinition[]>(charactersData as CharacterDefinition[])
  const allItemDefs = itemsData as ItemData[]

  const characters = computed(
    () => campaignStore.currentCampaign?.characters ?? []
  )
  const archivedCharacters = computed(
    () => campaignStore.currentCampaign?.archivedCharacters ?? []
  )
  const activeCharacters = computed(
    () => characters.value.filter((c) => !c.isRetired)
  )
  const averageLevel = computed(() => {
    const active = activeCharacters.value
    if (active.length === 0) return 1
    const sum = active.reduce((acc, c) => acc + c.level, 0)
    return Math.round(sum / active.length)
  })

  function getDefinition(classId: string): CharacterDefinition | undefined {
    return definitions.value.find((d) => d.classId === classId)
  }

  function createCharacter(classId: string, playerName: string) {
    const campaign = campaignStore.currentCampaign
    if (!campaign) return
    const char = createDefaultCharacter(generateId(), classId, playerName)
    // Startovní zlato dle pravidel: 10 × prosperita + 20 (utratit hned za předměty)
    char.gold = 10 * (campaign.prosperity ?? 0) + 20
    campaign.characters.push(char)
    campaignStore.autoSave()
  }

  function getCharacter(uuid: string): CharacterState | undefined {
    return campaignStore.currentCampaign?.characters.find((c) => c.uuid === uuid)
  }

  function setXp(uuid: string, value: number) {
    const char = getCharacter(uuid)
    if (!char) return
    char.xp = Math.max(0, value)
    char.level = getLevelFromXp(char.xp)
    campaignStore.autoSave()
  }

  function setGold(uuid: string, value: number) {
    const char = getCharacter(uuid)
    if (!char) return
    char.gold = Math.max(0, value)
    campaignStore.autoSave()
  }

  /** Checkmark track má strop 18 (6 perk marků po 3). */
  function setChecks(uuid: string, value: number) {
    const char = getCharacter(uuid)
    if (!char) return
    char.checks = Math.min(18, Math.max(0, value))
    campaignStore.autoSave()
  }

  // ── Osobní zásoby (crafting jde jen z osobních materiálů) ──

  function setResource(uuid: string, key: keyof CharacterResources, value: number) {
    const char = getCharacter(uuid)
    if (!char) return
    if (!char.resources) char.resources = emptyCharacterResources()
    char.resources[key] = Math.max(0, value)
    campaignStore.autoSave()
  }

  /** Jednosměrný převod suroviny do zásob Frosthavenu (zpět to dle pravidel nejde). */
  function donateToSupply(uuid: string, key: keyof CharacterResources, amount = 1): boolean {
    const char = getCharacter(uuid)
    const campaign = campaignStore.currentCampaign
    if (!char || !campaign) return false
    if (!char.resources) char.resources = emptyCharacterResources()
    if (char.resources[key] < amount) return false
    char.resources[key] -= amount
    campaign.resources[key] += amount
    campaignStore.autoSave()
    return true
  }

  function togglePerk(uuid: string, perkId: string) {
    const char = getCharacter(uuid)
    if (!char) return
    const current = char.perksSelected[perkId] ?? 0
    const def = getDefinition(char.classId)
    const perkDef = def?.perks.find((p) => p.id === perkId)
    const max = perkDef?.maxCount ?? 1

    if (current < max) {
      char.perksSelected[perkId] = current + 1
    } else {
      char.perksSelected[perkId] = 0
    }
    campaignStore.autoSave()
  }

  /**
   * Odchod postavy do důchodu dle pravidel: suroviny → zásoby Frosthavenu,
   * zlato propadá, +2 prosperita (další efekty řeší průvodce odchodem).
   */
  function retireCharacter(uuid: string, options?: { applyRewards?: boolean }) {
    const campaign = campaignStore.currentCampaign
    if (!campaign) return
    const idx = campaign.characters.findIndex((c) => c.uuid === uuid)
    if (idx < 0) return

    const char = campaign.characters[idx]

    if (options?.applyRewards !== false) {
      // Suroviny do společných zásob
      if (char.resources) {
        for (const key of Object.keys(char.resources) as (keyof CharacterResources)[]) {
          campaign.resources[key] += char.resources[key]
          char.resources[key] = 0
        }
      }
      char.gold = 0
      campaign.prosperity += 2
    }

    char.isRetired = true
    char.retiredAt = new Date().toISOString()
    campaign.archivedCharacters.push(char)
    campaign.characters.splice(idx, 1)
    campaignStore.autoSave()
  }

  function setNotes(uuid: string, notes: string) {
    const char = getCharacter(uuid)
    if (!char) return
    char.notes = notes
    campaignStore.autoSave()
  }

  // Item management
  function getItemDef(itemId: string): ItemData | undefined {
    return allItemDefs.find((d) => d.id === Number(itemId))
  }

  function getAvailableCount(itemId: string): number {
    const def = getItemDef(itemId)
    if (!def) return 0
    const owned = activeCharacters.value.filter((c) => c.items.includes(itemId)).length
    return def.count - owned
  }

  function addItemFree(uuid: string, itemId: string): boolean {
    const char = getCharacter(uuid)
    if (!char) return false
    if (getAvailableCount(itemId) <= 0) return false
    char.items.push(itemId)
    campaignStore.autoSave()
    return true
  }

  function removeItem(uuid: string, itemId: string): boolean {
    const char = getCharacter(uuid)
    if (!char) return false
    const idx = char.items.indexOf(itemId)
    if (idx < 0) return false
    char.items.splice(idx, 1)
    campaignStore.autoSave()
    return true
  }

  return {
    definitions,
    characters,
    archivedCharacters,
    activeCharacters,
    averageLevel,
    getDefinition,
    createCharacter,
    getCharacter,
    setXp,
    setGold,
    setChecks,
    setResource,
    donateToSupply,
    togglePerk,
    retireCharacter,
    setNotes,
    getItemDef,
    getAvailableCount,
    addItemFree,
    removeItem,
    getLevelFromXp,
    XP_THRESHOLDS,
  }
})
