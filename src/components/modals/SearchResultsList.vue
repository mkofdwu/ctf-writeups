<script setup lang="ts">
import type { ChalInfo } from '@/types/ChalInfo'
import { useSearchModalStore } from '@/stores/searchModal'

defineProps<{ results: [string, ChalInfo][] }>()

const searchModal = useSearchModalStore()
</script>

<template>
  <div class="absolute w-full bottom-0 h-auto overflow-y-auto">
    <div class="dotted-line-hori w-full fixed -translate-y-[1.5px]"></div>
    <div v-for="[slug, chal] in results" :key="slug">
      <router-link
        :to="`/${slug}`"
        class="h-24 px-6 flex items-center justify-between transition-colors hover:bg-almost-black-lighter"
        @click="searchModal.close()"
      >
        <div>
          <span class="block opacity-60">{{ chal.ctf }}</span>
          <span class="block font-semibold">{{ chal.title }}</span>
        </div>
        <span class="text-primary">{{ chal.cats.join(', ') }}</span>
      </router-link>
      <div class="dotted-line-hori"></div>
    </div>
  </div>
</template>
