<script setup lang="ts">
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
  <div class="flex flex-col">
    <div v-for="ctf in ctfs" :key="ctf.name" class="w-full flex flex-col mb-5">
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
          class="self-center"
          :class="
            $route.path.includes(chal.slug)
              ? 'text-primary font-medium'
              : 'group-hover:text-primary'
          "
          >{{ chal.name }}</span
        >
      </router-link>
    </div>
  </div>
</template>
