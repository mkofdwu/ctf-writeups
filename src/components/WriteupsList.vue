<script setup lang="ts">
const { fullWidth } = defineProps<{ fullWidth?: boolean }>()

const ctfs = [
  {
    name: 'Greyhats 2024',
    chals: [
      {
        name: 'Hi Doggy',
        slug: 'hi-doggy'
      }
    ]
  },
  {
    name: 'UIUCTF 2024',
    chals: [
      {
        name: 'Push and Pickle',
        slug: 'push-and-pickle'
      }
    ]
  },
  {
    name: 'TISC 2023',
    chals: [
      { name: 'Level 1', slug: 'disk-archaeology' },
      { name: 'Level 2', slug: 'reckless-mistake' },
      { name: 'Level 3', slug: 'kpa' },
      { name: 'Level 4', slug: 'rubg' },
      { name: 'Level 5', slug: 'palindromes-invitation' },
      { name: 'Level 6', slug: 'the-chosen-ones' },
      { name: 'Level 7', slug: 'devsecmeow' },
      { name: 'Level 8', slug: 'blind-sql-injection' }
    ]
  },
  {
    name: 'LITCTF 2023',
    chals: [{ name: 'the other obligatory pyjail', slug: 'the-other-obligatory-pyjail' }]
  }
]
</script>

<template>
  <div v-for="ctf in ctfs" :key="ctf.name" class="flex flex-col mb-10">
    <span class="text-sm font-bold opacity-40 uppercase ml-10 mb-3">{{ ctf.name }}</span>
    <router-link
      v-for="chal in ctf.chals"
      :key="chal.slug"
      :to="`/writeups/${chal.slug}`"
      class="h-12 flex items-center pl-10 transition-colors"
      :class="
        ($route.path.includes(chal.slug)
          ? 'bg-primary bg-opacity-10 text-primary font-medium'
          : 'hover:bg-black hover:bg-opacity-5') +
        ' ' +
        (fullWidth ? 'w-full' : 'w-72 rounded-r-full')
      "
    >
      {{ chal.name }}
    </router-link>
  </div>
</template>
