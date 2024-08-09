<script setup lang="ts">
import WriteupsList from './WriteupsList.vue'
</script>

<template>
  <div class="hide-scrollbar w-[280px] flex flex-col pt-7 overflow-y-auto max-lg:hidden">
    <span class="ml-9 mb-12 text-xl font-semibold">Jia Jie's writeups</span>
    <writeups-list />
  </div>
</template>
