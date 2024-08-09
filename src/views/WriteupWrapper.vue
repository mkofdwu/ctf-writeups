<script setup lang="ts">
import WriteupsSideBar from '@/components/WriteupsSideBar.vue'
import WriteupsMobileAppBar from '@/components/WriteupsMobileAppBar.vue'
import { RouterView } from 'vue-router'
</script>

<template>
  <transition name="fade" appear>
    <div class="w-screen h-screen flex flex-col overflow-hidden">
      <writeups-mobile-app-bar />
      <div class="flex overflow-hidden">
        <writeups-side-bar />
        <div id="scroll-container" class="flex-1 overflow-x-hidden overflow-y-scroll">
          <router-view :key="$route.path" />
        </div>
      </div>
    </div>
  </transition>
</template>
