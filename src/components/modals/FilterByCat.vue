<script setup lang="ts">
import MaterialIcon from '../MaterialIcon.vue'
import { catIcons } from '@/data/catIcons'
import type { ChalCat } from '@/types/ChalInfo'

defineProps<{ selectedCats: ChalCat[] }>()
defineEmits(['toggleSelectCat'])
</script>

<template>
  <div class="px-6 pt-5">
    <span class="block opacity-60 mb-4">Filter by category</span>
    <div class="flex flex-wrap gap-3">
      <button
        v-for="[cat, icon] in Object.entries(catIcons)"
        :key="cat"
        class="h-9 border transition-colors rounded-full flex items-center pl-3 pr-4"
        :class="
          selectedCats.includes(cat as ChalCat)
            ? 'bg-primary border-primary text-black'
            : 'border-[#525252] hover:bg-almost-black-lighter hover:border-[#626262]'
        "
        @click="$emit('toggleSelectCat', cat as ChalCat)"
      >
        <material-icon
          sm
          :name="icon"
          class="transition-colors mr-3"
          :class="selectedCats.includes(cat as ChalCat) ? 'text-black' : ''"
        />
        {{ cat }}
      </button>
    </div>
  </div>
</template>
