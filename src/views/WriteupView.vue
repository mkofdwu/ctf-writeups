<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import mdItAnchor from 'markdown-it-anchor'
import namedCodeBlocks from 'markdown-it-named-code-blocks'
import hljs from 'highlight.js'
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
import hiDoggy from '@/assets/writeups/hi-doggy.md?raw'
import protoGrader from '@/assets/writeups/proto-grader.md?raw'
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
  useRouter().push('/writeups/disk-archaeology')
}

const chalInfo = chals[slug as string]

const mdIt = new MarkdownIt().use(namedCodeBlocks).use(mdItAnchor)
const { md } = writeups[slug as string]
let renderedMd = mdIt.render(md)

const sections = ref<{ label: string; id: string }[]>([])

nextTick(() => {
  hljs.highlightAll()
  const elements = document.getElementById('article')!.getElementsByTagName('h1')
  for (const el of elements) {
    sections.value.push({ label: el.textContent!, id: el.id })
  }
})
</script>

<template>
  <div
    class="writeup flex flex-col pl-[80px] pr-[360px] py-10 max-lg:pl-[60px] max-lg:pr-[340px] max-lg:pt-3 max-[900px]:pr-[60px] max-sm:px-5"
  >
    <chal-info-card :info="chalInfo" class="mb-9" />
    <div
      id="article"
      class="flex flex-col gap-y-3 max-md:mx-6 max-sm:mx-0"
      v-html="renderedMd"
    ></div>
    <div
      class="absolute w-[280px] h-full top-0 right-0 flex pointer-events-none max-xl:pt-16 max-[900px]:hidden"
    >
      <div class="wave mr-8"></div>
      <sections-bar :sections="sections" />
    </div>
  </div>
</template>

<style scoped>
#article :deep(::-webkit-scrollbar) {
  height: 8px;
}

#article :deep(::-webkit-scrollbar-thumb) {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

#article :deep(pre) {
  /* overflow: auto; */
  /* overflow: hidden; */
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  padding-left: 0.625rem;
  padding-right: 0.625rem;
  padding-bottom: 0.5rem;
  border-radius: 1.25rem;
  background-color: #121212;
}

#article :deep(code),
#article :deep(code *) {
  font-size: 0.8rem;
}

#article :deep(code) {
  padding: 2px 4px 2px 4px;
  border-radius: 4px;
  background-color: #323232;
}

#article :deep(pre > code) {
  padding: 1rem 0.375rem 0.5rem 0.375rem;
  background-color: transparent;
}

#article :deep(pre.named-fence-block > code) {
  padding-top: 3.5rem;
}

#article :deep(.named-fence-block) {
  position: relative;
}

#article :deep(.named-fence-filename) {
  position: absolute;
  top: 0.625rem;
  left: 0.625rem;
  color: #f2f2f2;
  font-family: 'Gabarito', sans-serif;
  padding: 4px 12px 4px 12px;
  background-color: #222;
  border-radius: 8px;
}

#article :deep(h1) {
  font-family: 'Gabarito', sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0.75rem;
}

#article :deep(img) {
  /* width: 100%; */
  margin-left: auto;
  margin-right: auto;
  margin-top: 1rem;
  margin-bottom: 1rem;
}

#article :deep(a) {
  color: #64a577;
  text-decoration: underline;
}

#article :deep(li) {
  /* temporary */
  list-style-type: circle;
}

/* Generated from https://css-generators.com/wavy-shapes/ */
.wave {
  background: #727272;
  width: 7px;
  height: calc(100%-72px);
  margin-top: 36px;
  margin-bottom: 36px;

  --mask: radial-gradient(
        6.58px at calc(100% + 3px) 50%,
        #0000 calc(99% - 1.5px),
        #000 calc(101% - 1.5px) 99%,
        #0000 101%
      )
      calc(50% - 3.25px + 0.5px) calc(50% - 10px) / 6.5px 20px repeat-y,
    radial-gradient(
        6.58px at -3px 50%,
        #0000 calc(99% - 1.5px),
        #000 calc(101% - 1.5px) 99%,
        #0000 101%
      )
      calc(50% + 3.25px) 50%/6.5px 20px repeat-y;
  -webkit-mask: var(--mask);
  mask: var(--mask);
}
</style>
