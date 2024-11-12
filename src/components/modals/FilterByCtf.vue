<script setup lang="ts">
import { sidebarList } from '@/data/sidebarList'

defineProps<{ selectedCtfs: string[] }>()
defineEmits(['toggleSelectCtf'])
</script>

<template>
  <div class="px-6 pt-5 pb-6">
    <span class="block opacity-60 mb-4">Filter by CTF</span>
    <div class="flex flex-wrap gap-3">
      <button
        v-for="{ name } in sidebarList"
        :key="name"
        class="h-9 border transition-colors rounded-full flex items-center px-4"
        :class="
          selectedCtfs.includes(name) ? 'bg-primary border-primary text-black' : 'border-[#525252]'
        "
        @click="$emit('toggleSelectCtf', name)"
      >
        {{ name }}
      </button>
    </div>
  </div>
</template>
