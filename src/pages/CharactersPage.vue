<template>
  <div>
    <div class="fh-page-header">
      <h1 class="font-display text-2xl font-bold text-fh-frost">Postavy</h1>
    </div>

    <!-- New character form -->
    <div class="fh-card p-5 mb-6">
      <h2 class="font-display text-sm uppercase tracking-widest text-fh-primary mb-4">Nová postava</h2>
      <div class="flex flex-col sm:flex-row gap-3">
        <!-- Custom class picker with icons -->
        <div class="relative flex-1 min-w-0" ref="dropdownRef">
          <button
            type="button"
            class="fh-input w-full text-left flex items-center gap-2"
            @click="showClassDropdown = !showClassDropdown"
          >
            <template v-if="newClassId">
              <ClassIcon :class-id="newClassId" :size="20" :color="getClassColor(newClassId)" />
              <span :style="{ color: getClassColor(newClassId) }">{{ getClassName(newClassId) }}</span>
            </template>
            <span v-else class="text-gray-500">Vyber třídu...</span>
            <svg class="w-4 h-4 ml-auto text-gray-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            v-if="showClassDropdown"
            class="absolute z-50 mt-1 w-full rounded-lg border border-fh-border bg-fh-dark shadow-xl max-h-64 overflow-y-auto"
          >
            <button
              v-for="def in availableClasses"
              :key="def.classId"
              type="button"
              class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
              @click="newClassId = def.classId; showClassDropdown = false"
            >
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                :style="{
                  background: `radial-gradient(circle, ${getClassColor(def.classId)}30, ${getClassColor(def.classId)}10)`,
                  border: `1.5px solid ${getClassColor(def.classId)}55`,
                }"
              >
                <ClassIcon :class-id="def.classId" :size="18" :color="getClassColor(def.classId)" />
              </div>
              <span class="text-sm" :style="{ color: getClassColor(def.classId) }">{{ def.name }}</span>
            </button>
          </div>
        </div>
        <input
          v-model="newPlayerName"
          type="text"
          class="fh-input flex-1 min-w-0"
          placeholder="Jméno hráče"
          @keydown.enter="handleCreate"
        />
        <button
          class="fh-btn-primary whitespace-nowrap"
          :disabled="!newClassId || !newPlayerName.trim()"
          @click="handleCreate"
        >
          Vytvořit
        </button>
      </div>
    </div>

    <!-- Active characters -->
    <div v-if="characterStore.activeCharacters.length === 0" class="fh-card p-8 text-center text-gray-500">
      <svg class="w-16 h-16 mx-auto mb-4 text-fh-primary-dim" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <p class="text-sm">Zatím nemáš žádné postavy</p>
      <p class="text-xs text-gray-600 mt-1">Vytvoř si první postavu pomocí formuláře výše</p>
    </div>

    <div class="space-y-4">
      <div
        v-for="char in characterStore.activeCharacters"
        :key="char.uuid"
        class="fh-card overflow-hidden"
      >
        <!-- Card header — Gloomhaven style with large class emblem -->
        <div
          class="flex items-center gap-5 p-5 cursor-pointer select-none"
          :style="{ borderLeft: `3px solid ${getClassColor(char.classId)}` }"
          @click="toggleSection(char.uuid, 'detail')"
        >
          <!-- Class emblem with level badge -->
          <div class="relative shrink-0">
            <div
              class="w-16 h-16 rounded-full flex items-center justify-center"
              :style="{
                background: `radial-gradient(circle, ${getClassColor(char.classId)}30, ${getClassColor(char.classId)}10)`,
                border: `2px solid ${getClassColor(char.classId)}66`,
              }"
            >
              <ClassIcon :class-id="char.classId" :size="36" :color="getClassColor(char.classId)" />
            </div>
            <!-- Level badge -->
            <div
              class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              :style="{
                background: getClassColor(char.classId),
                color: '#0f0f1a',
              }"
            >
              {{ char.level }}
            </div>
          </div>

          <!-- Character info -->
          <div class="flex-1 min-w-0">
            <div
              class="font-display text-lg font-bold uppercase tracking-wide"
              :style="{ color: getClassColor(char.classId) }"
            >
              {{ char.playerName }}
            </div>
            <div class="text-sm text-gray-400 mt-0.5">
              {{ getClassName(char.classId) }}
            </div>
          </div>

          <!-- XP + Gold -->
          <div class="text-right shrink-0">
            <div class="text-sm">
              <span class="text-yellow-400">&#9734;</span>
              <span class="text-fh-frost font-semibold ml-1">{{ char.xp }} ZK</span>
            </div>
            <div class="text-sm mt-1">
              <span class="text-yellow-500">&#9737;</span>
              <span class="text-gray-300 ml-1">{{ char.gold }} zl.</span>
            </div>
          </div>

          <!-- Expand chevron -->
          <svg
            class="w-5 h-5 text-gray-500 transition-transform shrink-0"
            :class="{ 'rotate-180': isSectionOpen(char.uuid, 'detail') }"
            fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <div v-if="isSectionOpen(char.uuid, 'detail')" class="p-5 space-y-5 border-t border-fh-border">
          <!-- Level + XP -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-gray-400">Úroveň {{ char.level }}</span>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500">XP</span>
                <input
                  type="number"
                  class="fh-input w-20 text-center text-sm py-1 px-2"
                  :value="char.xp"
                  min="0"
                  @change="(e) => characterStore.setXp(char.uuid, inputNumber(e))"
                />
                <span v-if="char.level < 9" class="text-xs text-gray-500">
                  / {{ XP_THRESHOLDS[char.level] }}
                </span>
              </div>
            </div>
            <!-- XP progress bar -->
            <div v-if="char.level < 9" class="h-2 rounded-full bg-black/30 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{
                  width: xpProgress(char) + '%',
                  background: `linear-gradient(90deg, ${getClassColor(char.classId)}88, ${getClassColor(char.classId)})`,
                }"
              />
            </div>
            <div v-else class="text-xs text-fh-frost text-center mt-1">Maximální úroveň</div>
          </div>

          <!-- Gold + Checks -->
          <div class="flex gap-4">
            <div class="flex items-center gap-2">
              <span class="text-sm text-yellow-500">Zlato</span>
              <button
                class="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-sm font-bold"
                @click="characterStore.setGold(char.uuid, char.gold - 1)"
              >
                -
              </button>
              <input
                type="number"
                class="fh-input w-16 text-center text-sm py-1 px-1"
                :value="char.gold"
                min="0"
                @change="(e) => characterStore.setGold(char.uuid, inputNumber(e))"
              />
              <button
                class="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-sm font-bold"
                @click="characterStore.setGold(char.uuid, char.gold + 1)"
              >
                +
              </button>
            </div>
          </div>

          <!-- Checkmark track: 18 políček = 6 perk marků -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm text-fh-primary">Checkmarky <span class="text-xs text-gray-600">{{ char.checks }}/18</span></span>
              <span class="text-xs text-gray-500">Perk marky: <strong class="text-fh-frost">{{ perkMarksEarned(char) }}</strong>/6</span>
            </div>
            <div class="flex flex-wrap gap-x-2 gap-y-1">
              <div v-for="group in 6" :key="group" class="flex gap-0.5 items-center">
                <button
                  v-for="i in 3"
                  :key="i"
                  class="w-5 h-5 rounded border transition-all flex items-center justify-center"
                  :class="char.checks >= (group - 1) * 3 + i
                    ? ((group - 1) * 3 + i) % 3 === 0
                      ? 'bg-fh-primary border-fh-primary text-fh-dark'
                      : 'bg-fh-primary/40 border-fh-primary/60 text-fh-dark'
                    : 'border-gray-600 hover:border-fh-primary-dim'"
                  @click="clickCheckTrack(char, (group - 1) * 3 + i - 1)"
                >
                  <svg v-if="char.checks >= (group - 1) * 3 + i" class="w-full h-full p-0.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </div>
            <p class="text-[10px] text-gray-600 mt-1">Každá dokončená trojice = 1 perk mark (battle goals apod.)</p>
          </div>

          <!-- Perks -->
          <div>
            <button
              class="flex items-center gap-2 text-sm text-gray-400 hover:text-fh-frost transition-colors mb-3"
              @click="toggleSection(char.uuid, 'perks')"
            >
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-90': isSectionOpen(char.uuid, 'perks') }"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Perky ({{ perkCount(char) }}/{{ perkTotal(char) }})
            </button>
            <div v-if="isSectionOpen(char.uuid, 'perks')" class="space-y-2 pl-2">
              <div
                v-for="perk in getPerks(char.classId)"
                :key="perk.id"
                class="flex items-start gap-2 group"
              >
                <div class="flex gap-1 mt-0.5 shrink-0">
                  <button
                    v-for="i in perk.maxCount"
                    :key="i"
                    class="w-5 h-5 rounded border transition-all"
                    :class="
                      (char.perksSelected[perk.id] ?? 0) >= i
                        ? 'bg-fh-primary border-fh-primary text-fh-dark'
                        : 'border-gray-600 hover:border-fh-primary-dim'
                    "
                    @click="characterStore.togglePerk(char.uuid, perk.id)"
                  >
                    <svg
                      v-if="(char.perksSelected[perk.id] ?? 0) >= i"
                      class="w-full h-full p-0.5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
                <span class="text-sm text-gray-300 group-hover:text-gray-100 transition-colors">
                  {{ perk.description }}
                </span>
              </div>
            </div>
          </div>

          <!-- Masteries -->
          <div v-if="getMasteries(char.classId).length">
            <button
              class="flex items-center gap-2 text-sm text-gray-400 hover:text-fh-frost transition-colors mb-3"
              @click="toggleSection(char.uuid, 'masteries')"
            >
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-90': isSectionOpen(char.uuid, 'masteries') }"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Mistrovství ({{ masteryCount(char) }}/{{ getMasteries(char.classId).length }})
            </button>
            <div v-if="isSectionOpen(char.uuid, 'masteries')" class="space-y-2 pl-2">
              <div
                v-for="(mastery, idx) in getMasteries(char.classId)"
                :key="idx"
                class="flex items-start gap-2 group"
              >
                <button
                  class="w-5 h-5 rounded border transition-all shrink-0 mt-0.5"
                  :class="
                    isMasteryCompleted(char, idx)
                      ? 'bg-yellow-500 border-yellow-500 text-fh-dark'
                      : 'border-gray-600 hover:border-yellow-600'
                  "
                  @click="toggleMastery(char.uuid, idx)"
                >
                  <svg
                    v-if="isMasteryCompleted(char, idx)"
                    class="w-full h-full p-0.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <span
                  class="text-sm transition-colors"
                  :class="isMasteryCompleted(char, idx) ? 'text-yellow-400/80 line-through' : 'text-gray-300 group-hover:text-gray-100'"
                >
                  {{ mastery }}
                </span>
              </div>
            </div>
          </div>

          <!-- Osobní zásoby -->
          <div>
            <button
              class="flex items-center gap-2 text-sm text-gray-400 hover:text-fh-frost transition-colors mb-3"
              @click="toggleSection(char.uuid, 'resources')"
            >
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-90': isSectionOpen(char.uuid, 'resources') }"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Osobní zásoby ({{ personalResourceTotal(char) }})
            </button>
            <div v-if="isSectionOpen(char.uuid, 'resources')" class="pl-6">
              <p class="text-[11px] text-gray-600 mb-2">
                Výroba předmětů jde jen z osobních materiálů. Převod do zásob Frosthavenu je nevratný (šipka).
              </p>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div
                  v-for="r in personalResourceDefs"
                  :key="r.key"
                  class="flex items-center justify-between gap-1 rounded-lg border border-fh-border bg-black/15 px-2 py-1.5"
                >
                  <div class="flex flex-col min-w-0">
                    <span class="text-[10px] text-gray-500 uppercase tracking-wide truncate">{{ r.label }}</span>
                    <Stepper
                      small
                      :model-value="char.resources?.[r.key] ?? 0"
                      @update:model-value="(v) => characterStore.setResource(char.uuid, r.key, v)"
                    />
                  </div>
                  <button
                    class="w-7 h-7 rounded-md text-fh-primary/60 hover:text-fh-primary hover:bg-fh-primary/10 transition-colors shrink-0 disabled:opacity-20"
                    :disabled="(char.resources?.[r.key] ?? 0) === 0"
                    title="Převést 1 ks do zásob Frosthavenu"
                    @click="characterStore.donateToSupply(char.uuid, r.key)"
                  >
                    <svg class="w-4 h-4 mx-auto" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Inventory -->
          <div>
            <button
              class="flex items-center gap-2 text-sm text-gray-400 hover:text-fh-frost transition-colors mb-3"
              @click="toggleSection(char.uuid, 'inventory')"
            >
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-90': isSectionOpen(char.uuid, 'inventory') }"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Inventář ({{ char.items.length }})
            </button>
            <div v-if="isSectionOpen(char.uuid, 'inventory')">
              <div v-if="char.items.length === 0" class="text-xs text-gray-600 pl-6 mb-2">
                Žádné předměty
              </div>
              <div v-else class="space-y-1 pl-6 mb-3">
                <div
                  v-for="(itemId, idx) in char.items"
                  :key="idx"
                  class="flex items-center justify-between py-1 px-2 rounded-md bg-white/3 group"
                >
                  <span class="text-sm text-gray-300">
                    <span class="text-gray-500 text-xs mr-1">#{{ itemId }}</span>
                    {{ getItemName(itemId) }}
                  </span>
                  <button
                    class="text-xs text-red-400/50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    @click="characterStore.removeItem(char.uuid, itemId)"
                  >
                    Odebrat
                  </button>
                </div>
              </div>
              <!-- Add item inline -->
              <div class="flex gap-2 pl-6">
                <input
                  type="text"
                  class="fh-input flex-1 text-sm py-1 px-2"
                  placeholder="ID předmětu"
                  :value="addItemInputs[char.uuid] ?? ''"
                  @input="(e) => setAddItemInput(char.uuid, inputValue(e))"
                  @keydown.enter="handleAddItem(char.uuid)"
                />
                <button
                  class="fh-btn-secondary text-xs py-1 px-3"
                  @click="handleAddItem(char.uuid)"
                >
                  Přidat
                </button>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <button
              class="flex items-center gap-2 text-sm text-gray-400 hover:text-fh-frost transition-colors mb-3"
              @click="toggleSection(char.uuid, 'notes')"
            >
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-90': isSectionOpen(char.uuid, 'notes') }"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Poznámky
            </button>
            <div v-if="isSectionOpen(char.uuid, 'notes')" class="pl-6">
              <textarea
                class="fh-input w-full text-sm resize-y min-h-[4rem]"
                :value="char.notes"
                placeholder="Poznámky k postavě..."
                @input="(e) => characterStore.setNotes(char.uuid, inputValue(e))"
              />
            </div>
          </div>

          <!-- Danger zone: Retire -->
          <div>
            <button
              class="flex items-center gap-2 text-sm text-gray-500 hover:text-red-400 transition-colors"
              @click="toggleSection(char.uuid, 'danger')"
            >
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-90': isSectionOpen(char.uuid, 'danger') }"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Nebezpečná zóna
            </button>
            <div v-if="isSectionOpen(char.uuid, 'danger')" class="pl-6 mt-3">
              <button
                class="text-sm px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                @click="retireWizardUuid = char.uuid"
              >
                Odchod do důchodu (retirement)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Archived characters -->
    <div v-if="characterStore.archivedCharacters.length > 0" class="mt-8">
      <button
        class="flex items-center gap-2 text-sm text-gray-500 hover:text-fh-frost transition-colors mb-4"
        @click="showArchived = !showArchived"
      >
        <svg
          class="w-4 h-4 transition-transform"
          :class="{ 'rotate-90': showArchived }"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span class="font-display uppercase tracking-widest text-xs">
          Ukončené postavy ({{ characterStore.archivedCharacters.length }})
        </span>
      </button>

      <div v-if="showArchived" class="space-y-3">
        <div
          v-for="char in characterStore.archivedCharacters"
          :key="char.uuid"
          class="fh-card p-4 opacity-60"
        >
          <div class="flex items-center gap-4">
            <div class="relative shrink-0">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center"
                :style="{
                  background: `radial-gradient(circle, ${getClassColor(char.classId)}20, ${getClassColor(char.classId)}08)`,
                  border: `2px solid ${getClassColor(char.classId)}44`,
                }"
              >
                <ClassIcon :class-id="char.classId" :size="24" :color="getClassColor(char.classId)" />
              </div>
              <div
                class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                :style="{ background: getClassColor(char.classId), color: '#0f0f1a' }"
              >
                {{ char.level }}
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <span class="font-display text-sm uppercase tracking-wide" :style="{ color: getClassColor(char.classId) }">
                {{ char.playerName }}
              </span>
              <div class="text-xs text-gray-500">{{ getClassName(char.classId) }}</div>
            </div>
            <div class="text-right text-xs text-gray-500">
              <div>{{ char.xp }} ZK · {{ char.gold }} zl.</div>
              <div v-if="char.retiredAt" class="mt-0.5">{{ formatDate(char.retiredAt) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <RetirementWizard
      :open="!!retireWizardUuid"
      :character-uuid="retireWizardUuid"
      @close="retireWizardUuid = null"
      @retired="retireWizardUuid = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacterStore } from '@/stores/characterStore'
import { useCampaignStore } from '@/stores/campaignStore'
import ClassIcon from '@/components/characters/ClassIcon.vue'
import RetirementWizard from '@/components/characters/RetirementWizard.vue'
import Stepper from '@/components/ui/Stepper.vue'
import type { CharacterResources, CharacterState, PerkDefinition } from '@/models/Character'

const router = useRouter()
const characterStore = useCharacterStore()
const campaignStore = useCampaignStore()

const XP_THRESHOLDS = characterStore.XP_THRESHOLDS

// Redirect if no campaign
onMounted(() => {
  if (!campaignStore.hasCampaign) {
    router.replace('/kampan')
  }
  document.addEventListener('click', onClickOutside)
})

// Class colors
const classColors: Record<string, string> = {
  df: '#8B7355', bb: '#C0C0C0', bn: '#CD853F', dw: '#4A0080',
  bo: '#2F4F4F', ge: '#FF6347', if: '#4169E1', py: '#FF4500',
  sh: '#DA70D6', ta: '#228B22', pc: '#8B0000', sd: '#87CEEB',
  ff: '#00CED1', hv: '#FFD700', me: '#708090', dt: '#191970',
  cr: '#20B2AA',
}

// New character form
const newClassId = ref('')
const newPlayerName = ref('')
const showClassDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

function onClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    showClassDropdown.value = false
  }
}

onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

// UI state
const retireWizardUuid = ref<string | null>(null)
const showArchived = ref(false)
const openSections = reactive<Record<string, Record<string, boolean>>>({})
const addItemInputs = reactive<Record<string, string>>({})

// Available classes (filtered by spoiler mode)
const availableClasses = computed(() => {
  const hideSpoilers = campaignStore.currentCampaign?.hideSpoilers ?? true
  const usedClassIds = characterStore.activeCharacters.map((c) => c.classId)
  return characterStore.definitions.filter((d) => {
    if (hideSpoilers && !d.isStarting) return false
    if (usedClassIds.includes(d.classId)) return false
    return true
  })
})

// Helpers
function getClassColor(classId: string): string {
  return classColors[classId] ?? '#5ba4cf'
}

function getClassName(classId: string): string {
  return characterStore.getDefinition(classId)?.name ?? classId
}

function getPerks(classId: string): PerkDefinition[] {
  return characterStore.getDefinition(classId)?.perks ?? []
}


function getItemName(itemId: string): string {
  const def = characterStore.getItemDef(itemId)
  return def?.name ?? 'Neznámý předmět'
}

// Osobní zásoby
const personalResourceDefs: { key: keyof CharacterResources; label: string }[] = [
  { key: 'lumber', label: 'Dřevo' },
  { key: 'metal', label: 'Kov' },
  { key: 'hide', label: 'Kůže' },
  { key: 'arrowvine', label: 'Šípobyl' },
  { key: 'axenut', label: 'Sekeřičník' },
  { key: 'corpsecap', label: 'Mrtvolník' },
  { key: 'flamefruit', label: 'Plamenoplod' },
  { key: 'rockroot', label: 'Skalokořen' },
  { key: 'snowthistle', label: 'Sněhobodlák' },
]

function personalResourceTotal(char: CharacterState): number {
  if (!char.resources) return 0
  return Object.values(char.resources).reduce((s, n) => s + n, 0)
}

// Checkmark track: 18 políček = 6 perk marků po 3
function perkMarksEarned(char: CharacterState): number {
  return Math.floor((char.checks ?? 0) / 3)
}

function clickCheckTrack(char: CharacterState, index: number) {
  // Klik na políčko: nastaví count na index+1; klik na poslední zaškrtnuté = ubrat
  const target = index + 1
  characterStore.setChecks(char.uuid, char.checks === target ? target - 1 : target)
}

function xpProgress(char: CharacterState): number {
  if (char.level >= 9) return 100
  const current = XP_THRESHOLDS[char.level - 1]
  const next = XP_THRESHOLDS[char.level]
  const range = next - current
  if (range <= 0) return 100
  return Math.min(100, Math.max(0, ((char.xp - current) / range) * 100))
}

function perkCount(char: CharacterState): number {
  return Object.values(char.perksSelected).reduce((sum, v) => sum + v, 0)
}

function perkTotal(char: CharacterState): number {
  const perks = getPerks(char.classId)
  return perks.reduce((sum, p) => sum + p.maxCount, 0)
}

function getMasteries(classId: string): string[] {
  return characterStore.getDefinition(classId)?.masteries ?? []
}

function isMasteryCompleted(char: CharacterState, idx: number): boolean {
  return char.masteriesCompleted?.[idx] ?? false
}

function masteryCount(char: CharacterState): number {
  return (char.masteriesCompleted ?? []).filter(Boolean).length
}

function toggleMastery(uuid: string, idx: number) {
  const char = characterStore.activeCharacters.find(c => c.uuid === uuid)
    ?? characterStore.archivedCharacters.find(c => c.uuid === uuid)
  if (!char) return
  if (!char.masteriesCompleted) {
    char.masteriesCompleted = []
  }
  // Ensure array is big enough
  while (char.masteriesCompleted.length <= idx) {
    char.masteriesCompleted.push(false)
  }
  char.masteriesCompleted[idx] = !char.masteriesCompleted[idx]
  campaignStore.autoSave()
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('cs-CZ')
  } catch {
    return ''
  }
}

// Section toggle
function toggleSection(uuid: string, section: string) {
  if (!openSections[uuid]) openSections[uuid] = {}
  openSections[uuid][section] = !openSections[uuid][section]
}

function isSectionOpen(uuid: string, section: string): boolean {
  return openSections[uuid]?.[section] ?? false
}

// Input helpers (avoid ! in templates)
function inputValue(e: Event): string {
  return (e.target as HTMLInputElement)?.value ?? ''
}

function inputNumber(e: Event): number {
  return Number((e.target as HTMLInputElement)?.value ?? 0)
}

function setAddItemInput(uuid: string, value: string) {
  addItemInputs[uuid] = value
}

// Actions
function handleCreate() {
  if (!newClassId.value || !newPlayerName.value.trim()) return
  characterStore.createCharacter(newClassId.value, newPlayerName.value.trim())
  newClassId.value = ''
  newPlayerName.value = ''
}

function handleAddItem(uuid: string) {
  const itemId = addItemInputs[uuid]?.trim()
  if (!itemId) return
  const success = characterStore.addItemFree(uuid, itemId)
  if (success) {
    addItemInputs[uuid] = ''
  }
}

</script>
