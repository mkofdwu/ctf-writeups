<script setup lang="ts">
import WriteupsSideBar from '@/components/WriteupsSideBar.vue'
import WriteupsTopBar from '@/components/WriteupsTopBar.vue'
import SearchModal from '@/components/modals/SearchModal.vue'
import { useSearchModalStore } from '@/stores/searchModal'

const searchModal = useSearchModalStore()
</script>

<template>
  <div>
    <writeups-top-bar />
    <writeups-side-bar />
    <router-view :key="$route.path" />
    <transition name="slide-fade">
      <search-modal v-if="searchModal.isOpen" />
    </transition>
  </div>
</template>

<style>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 150ms ease-out;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  bottom: -20px;
  opacity: 0;
}
</style>
