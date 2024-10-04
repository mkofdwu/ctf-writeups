<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import mdItAnchor from 'markdown-it-anchor'
import namedCodeBlocks from 'markdown-it-named-code-blocks'
import hljs from 'highlight.js'
import hljsDefineSolidity from 'highlightjs-solidity'
import theOtherObligatoryPyjail from '@/assets/writeups/the-other-obligatory-pyjail.md?raw'
import diskArchaeology from '@/assets/writeups/tisc23/disk-archaeology.md?raw'
import recklessMistake from '@/assets/writeups/tisc23/reckless-mistake.md?raw'
import kpa from '@/assets/writeups/tisc23/kpa.md?raw'
import rubg from '@/assets/writeups/tisc23/rubg.md?raw'
import palindromesInvitation from '@/assets/writeups/tisc23/palindromes-invitation.md?raw'
import theChosenOnes from '@/assets/writeups/tisc23/the-chosen-ones.md?raw'
import devSecMeow from '@/assets/writeups/tisc23/devsecmeow.md?raw'
import blindSqlInjection from '@/assets/writeups/tisc23/blind-sql-injection.md?raw'
import pushAndPickle from '@/assets/writeups/push-and-pickle.md?raw'
import hiDoggy from '@/assets/writeups/grey24/hi-doggy.md?raw'
import protoGrader from '@/assets/writeups/grey24/proto-grader.md?raw'
import navigatingTheDigitalLabyrinth from '@/assets/writeups/tisc24/navigating-the-digital-labyrinth.md?raw'
import languageLabyrinthAndGraphicsMagick from '@/assets/writeups/tisc24/language-labyrinth-and-graphicsmagick.md?raw'
import diggingUpHistory from '@/assets/writeups/tisc24/digging-up-history.md?raw'
import alligatorPay from '@/assets/writeups/tisc24/alligatorpay.md?raw'
import hardwareIsntThatHard from '@/assets/writeups/tisc24/hardware-isnt-that-hard.md?raw'
import noncevigator from '@/assets/writeups/tisc24/noncevigator.md?raw'
import babyFlagchecker from '@/assets/writeups/tisc24/baby-flagchecker.md?raw'
import wallfacer from '@/assets/writeups/tisc24/wallfacer.md?raw'
import imphash from '@/assets/writeups/tisc24/imphash.md?raw'
import diffuse from '@/assets/writeups/tisc24/diffuse.md?raw'
import ChalInfoCard from '@/components/ChalInfoCard.vue'
import SectionsBar from '@/components/SectionsBar.vue'
import { chals } from '@/data/writeups'
import { defaultWriteupSlug } from '@/data/sidebarList'

const writeups: { [slug: string]: { md: string; datePosted: string } } = {
  'the-other-obligatory-pyjail': { md: theOtherObligatoryPyjail, datePosted: '11 Sep 2023' },
  'disk-archaeology': { md: diskArchaeology, datePosted: '3 Oct 2023' },
  'reckless-mistake': { md: recklessMistake, datePosted: '3 Oct 2023' },
  kpa: { md: kpa, datePosted: '3 Oct 2023' },
  rubg: { md: rubg, datePosted: '3 Oct 2023' },
  'palindromes-invitation': { md: palindromesInvitation, datePosted: '3 Oct 2023' },
  'the-chosen-ones': { md: theChosenOnes, datePosted: '3 Oct 2023' },
  devsecmeow: { md: devSecMeow, datePosted: '3 Oct 2023' },
  'blind-sql-injection': { md: blindSqlInjection, datePosted: '3 Oct 2023' },
  'push-and-pickle': { md: pushAndPickle, datePosted: '7 Jul 2024' },
  'hi-doggy': { md: hiDoggy, datePosted: '29 Jul 2024' },
  'proto-grader': { md: protoGrader, datePosted: '12 Aug 2024' },
  'navigating-the-digital-labyrinth': {
    md: navigatingTheDigitalLabyrinth,
    datePosted: '30 Sep 2024'
  },
  'language-labyrinth-and-graphicsmagick': {
    md: languageLabyrinthAndGraphicsMagick,
    datePosted: '30 Sep 2024'
  },
  'digging-up-history': {
    md: diggingUpHistory,
    datePosted: '30 Sep 2024'
  },
  alligatorpay: {
    md: alligatorPay,
    datePosted: ''
  },
  'hardware-isnt-that-hard': {
    md: hardwareIsntThatHard,
    datePosted: ''
  },
  noncevigator: {
    md: noncevigator,
    datePosted: ''
  },
  'baby-flagchecker': {
    md: babyFlagchecker,
    datePosted: ''
  },
  wallfacer: {
    md: wallfacer,
    datePosted: ''
  },
  imphash: {
    md: imphash,
    datePosted: ''
  },
  diffuse: {
    md: diffuse,
    datePosted: ''
  }
}

const { slug } = useRoute().params
if (typeof slug !== 'string' || !(slug in chals)) {
  useRouter().push(defaultWriteupSlug)
}

const chalInfo = chals[slug as string]

const mdIt = new MarkdownIt().use(namedCodeBlocks).use(mdItAnchor)
const { md, datePosted } = writeups[slug as string]
let renderedMd = mdIt.render(md)

const sections = ref<{ label: string; id: string }[]>([])

hljsDefineSolidity(hljs)
nextTick(() => {
  hljs.highlightAll()
  const elements = document.getElementById('article')!.getElementsByTagName('h1')
  for (const el of elements) {
    sections.value.push({ label: el.textContent!, id: el.id })
  }
})
</script>

<template>
  <div class="relative flex flex-col items-center max-w-2xl mx-auto pt-24 pb-14">
    <chal-info-card :info="chalInfo" :date-posted="datePosted" />
    <div
      id="article"
      class="markdown w-full flex flex-col gap-y-3 px-4 max-md:mx-6 max-sm:mx-0"
      v-html="renderedMd"
    ></div>
    <div class="fixed w-[17.5rem] h-full top-0 right-0 pointer-events-none pr-8 max-[900px]:hidden">
      <sections-bar :sections="sections" />
    </div>
  </div>
</template>
