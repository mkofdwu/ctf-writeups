<script setup lang="ts">
const { fullWidth } = defineProps<{ fullWidth?: boolean }>()

const ctfs = [
  {
    name: 'TISC 2024',
    chals: [
      {
        name: 'Level 1',
        slug: 'navigating-the-digital-labyrinth'
      },
      {
        name: 'Level 2',
        slug: 'language-labyrinth-and-graphicsmagick'
      },
      {
        name: 'Level 3',
        slug: 'digging-up-history'
      },
      {
        name: 'Level 4',
        slug: 'alligatorpay'
      },
      {
        name: 'Level 5',
        slug: 'hardware-isnt-that-hard'
      },
      {
        name: 'Level 6',
        slug: 'noncevigator'
      },
      {
        name: 'Level 7',
        slug: 'baby-flagchecker'
      },
      {
        name: 'Level 8',
        slug: 'wallfacer'
      },
      {
        name: 'Level 9',
        slug: 'imphash'
      },
      {
        name: 'Level 10',
        slug: 'diffuse'
      }
    ]
  },
  {
    name: 'Greyhats 2024',
    chals: [
      {
        name: 'Proto Grader',
        slug: 'proto-grader'
      },
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
  <div v-for="ctf in ctfs" :key="ctf.name" class="flex flex-col mb-8">
    <span class="opacity-60 ml-9 mb-3">{{ ctf.name }}</span>
    <router-link
      v-for="(chal, i) in ctf.chals"
      :key="chal.slug"
      :to="`/writeups/${chal.slug}`"
      class="h-14 flex items-center pl-10 transition-colors"
      :class="
        ($route.path.includes(chal.slug)
          ? 'bg-primary text-black font-medium'
          : 'bg-almost-black hover:bg-almost-black-lighter') +
        ' ' +
        (fullWidth
          ? 'w-full'
          : 'w-[280px] ' +
            (i === 0 ? 'rounded-tr-2.5xl ' : '') +
            (i === ctf.chals.length - 1 ? 'rounded-br-2.5xl ' : ''))
      "
    >
      {{ chal.name }}
    </router-link>
  </div>
</template>
