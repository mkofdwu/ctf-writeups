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
        <div class="flex-1 overflow-x-hidden overflow-y-scroll bg-[#f6f6f6]">
          <router-view :key="$route.path" />
        </div>
      </div>
    </div>
  </transition>
</template>
