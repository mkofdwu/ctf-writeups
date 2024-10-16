<script setup lang="ts">
import WriteupsSideBar from '@/components/WriteupsSideBar.vue'
import WriteupsTopBar from '@/components/WriteupsTopBar.vue'
</script>

<template>
  <div>
    <writeups-top-bar />
    <writeups-side-bar />
    <router-view :key="$route.path" />
  </div>
</template>
