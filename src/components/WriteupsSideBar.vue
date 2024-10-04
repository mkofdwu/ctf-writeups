<script setup lang="ts">
import WriteupsList from './WriteupsList.vue'
</script>

<template>
  <div class="fixed w-[17.5rem] h-screen overflow-y-hidden flex max-xl:hidden">
    <writeups-list class="hide-scrollbar h-full overflow-y-auto pt-24 pr-8" />
    <div class="dotted-line-vert h-auto mb-10"></div>
  </div>
</template>
