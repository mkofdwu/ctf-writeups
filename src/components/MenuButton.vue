<script setup lang="ts">
defineProps<{ opened: boolean }>()
</script>

<template>
  <div class="w-10 h-10 flex flex-col items-center justify-center gap-y-1">
    <div class="bar b1" :class="{ opened }"></div>
    <div class="bar b2" :class="{ opened }"></div>
    <div class="bar b3" :class="{ opened }"></div>
  </div>
</template>

<style scoped>
.bar {
  width: 1.25rem;
  height: 0.11rem;
  background-color: #f2f2f2;
}

.b1,
.b3 {
  transition: transform 200ms;
  transform-origin: center;
}

.b2 {
  transition:
    transform 200ms,
    opacity 200ms;
}

.b1.opened {
  transform: translateY(0.36rem) rotate(45deg);
}

.b2.opened {
  transform: scaleX(0.5);
  opacity: 0;
}

.b3.opened {
  transform: translateY(-0.36rem) rotate(-45deg);
}
</style>
