<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import FeedbackButton from '@/components/FeedbackButton.vue'
import { useProfileStore } from '@/stores/profileStore'
import { useAuthStore } from '@/stores/authStore'

const route = useRoute()
const profileStore = useProfileStore()
const authStore = useAuthStore()

const isLanding = computed(() => route.name === 'landing')

onMounted(() => {
  profileStore.init()
  authStore.init()
})
</script>

<template>
  <div class="min-h-screen bg-fh-dark text-gray-100">
    <AppHeader v-if="!isLanding" />
    <main :class="isLanding ? '' : 'max-w-7xl mx-auto px-4 pb-8 pt-18'">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <FeedbackButton v-if="!isLanding" />
  </div>
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.15s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
