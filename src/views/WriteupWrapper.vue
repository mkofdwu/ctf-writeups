<script setup lang="ts">
import WriteupsSideBar from '@/components/WriteupsSideBar.vue'
import WriteupsTopBar from '@/components/WriteupsTopBar.vue'
import { RouterView } from 'vue-router'
</script>

<template>
  <transition name="fade" appear>
    <div>
      <writeups-top-bar />
      <writeups-side-bar />
      <router-view :key="$route.path" />
    </div>
  </transition>
</template>
