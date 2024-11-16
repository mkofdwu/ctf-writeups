<script setup lang="ts">
import type { ChalInfo, ChalCat } from '@/types/ChalInfo'
import MaterialIcon from './MaterialIcon.vue'
import MarkdownIt from 'markdown-it'
import { catIcons } from '@/data/catIcons'

const { info } = defineProps<{ info: ChalInfo }>()

const mdIt = new MarkdownIt()
const descriptionRendered = mdIt.render(info.description)

function downloadAll() {
  for (const attachment of info.attachments) {
    window.open(attachment.url)
  }
}
</script>

<template>
  <div class="w-full flex flex-col items-start">
    <span class="text-xl opacity-60 mb-1">{{ info.datePosted }}</span>
    <h1 class="mb-7">{{ info.title }}</h1>
    <div class="markdown mb-7 flex flex-col gap-y-3" v-html="descriptionRendered"></div>
    <div class="flex flex-wrap gap-3">
      <div
        v-for="(cat, i) in info.cats"
        :key="i"
        class="h-9 bg-white rounded-full flex items-center"
      >
        <material-icon sm :name="catIcons[cat as ChalCat]!" class="ml-3 mr-2 text-black" />
        <span class="mr-4 text-black font-semibold">{{ cat }}</span>
      </div>
      <div class="h-9 bg-almost-black rounded-full px-5 flex items-center">
        <span class="mr-4">{{ info.numSolves }} solves</span>
        <span class="opacity-60">{{ info.numPoints }} points</span>
      </div>
      <div class="h-9 bg-almost-black rounded-full flex items-center">
        <material-icon sm name="person" class="ml-3 mr-3" />
        <span class="mr-4">by {{ info.author }}</span>
      </div>
    </div>
    <div
      v-if="info.attachments.length"
      class="w-full flex border border-almost-black-lighter rounded-2.5xl mt-7 mb-9 max-sm:flex-col"
    >
      <div class="flex-1 flex flex-col gap-y-2 px-6 pt-4 pb-5">
        <span>Attachments</span>
        <a
          v-for="attachment in info.attachments"
          :key="attachment.url"
          :href="attachment.url"
          class="underline"
        >
          {{ attachment.name }}
        </a>
      </div>
      <button
        class="pl-9 pr-10 font-semibold flex items-center border-l border-almost-black-lighter rounded-tr-2.5xl rounded-br-2.5xl transition-colors hover:bg-almost-black active:bg-almost-black-lighter max-sm:border-l-0 max-sm:border-t max-sm:pl-6 max-sm:py-4 max-sm:rounded-tr-none max-sm:rounded-bl-2.5xl"
        @click="downloadAll"
      >
        <material-icon name="download" class="mr-4" />
        Download all
      </button>
    </div>
    <div v-else class="dotted-line-hori self-stretch w-auto mx-4 mt-10 mb-7 max-md:mx-0"></div>
  </div>
</template>
