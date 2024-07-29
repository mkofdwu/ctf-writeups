<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import MenuButton from './MenuButton.vue'
import WriteupsList from './WriteupsList.vue'

const opened = ref(false)

watch(useRoute(), () => {
  opened.value = false
})
</script>

<template>
  <div class="w-full h-16 bg-white flex-shrink-0 flex items-center justify-between px-8 lg:hidden">
    <h1 class="text-lg font-bold">jiajie's writeups</h1>
    <menu-button class="cursor-pointer" :opened="opened" @click="opened = !opened" />
    <div
      class="menu fixed left-0 top-16 z-10 w-full bg-white overflow-y-auto origin-top duration-300 transition-all"
      :class="opened ? 'menu-opened' : 'h-0'"
    >
      <div
        class="pt-10 duration-300 transition-opacity"
        :class="opened ? 'opacity-100' : 'opacity-0'"
      >
        <writeups-list :full-width="true" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-opened {
  height: calc(100vh - 4rem);
}
</style>
