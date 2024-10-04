<script setup lang="ts">
import { sidebarList } from '@/data/sidebarList'
</script>

<template>
  <div class="flex flex-col">
    <div v-for="ctf in sidebarList" :key="ctf.name" class="w-full flex flex-col mb-5">
      <span class="opacity-60 ml-9 mb-3">{{ ctf.name }}</span>
      <router-link
        v-for="chal in ctf.chals"
        :key="chal.slug"
        :to="`/writeups/${chal.slug}`"
        class="group h-12 flex pl-10"
      >
        <svg
          width="20"
          height="16"
          viewBox="0 0 20 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="mt-[12px] mr-3"
        >
          <path
            d="M1 0V3C1 9.62742 6.37258 15 13 15H20"
            class="transition-colors"
            :stroke="$route.path.includes(chal.slug) ? '#64A577' : '#424242'"
            stroke-width="2"
          />
        </svg>
        <span
          class="self-center font-semibold"
          :class="$route.path.includes(chal.slug) ? 'text-primary' : 'group-hover:text-primary'"
          >{{ chal.name }}</span
        >
      </router-link>
    </div>
  </div>
</template>
