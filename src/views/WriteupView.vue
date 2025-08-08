<script setup lang="ts">
import { nextTick, ref, h, render } from 'vue'
import MarkdownIt from 'markdown-it'
import mdItAnchor from 'markdown-it-anchor'
import namedCodeBlocks from 'markdown-it-named-code-blocks'
import hljs from 'highlight.js'
import hljsDefineSolidity from 'highlightjs-solidity'
import ChalInfoCard from '@/components/ChalInfoCard.vue'
import SectionsBar from '@/components/SectionsBar.vue'
import CodeBlockButtons from '@/components/CodeBlockButtons.vue'
import { chals } from '@/data/chals'
import { slugToMd } from '@/data/slugToMd'
import { useHead, useSeoMeta } from '@unhead/vue'

const { slug } = defineProps<{ slug: string }>()

const chalInfo = chals[slug as string]

const mdIt = new MarkdownIt().use(namedCodeBlocks).use(mdItAnchor)
const md = slugToMd[slug as string]
let renderedMd = mdIt.render(md)

const sections = ref<{ label: string; id: string }[]>([])

useHead({
  title: `${chalInfo.ctf} - ${chalInfo.title}`
})

useSeoMeta({
  title: `${chalInfo.ctf} - ${chalInfo.title}`,
  description: chalInfo.description,
  author: 'Jia Jie',
  articleTag: [chalInfo.ctf, ...chalInfo.cats]
})

hljsDefineSolidity(hljs)
nextTick(() => {
  if (typeof window === 'undefined') return // handle non-SSG aware code below

  hljs.highlightAll()
  const headers = document.getElementById('article')!.getElementsByTagName('h1')
  for (const el of headers) {
    sections.value.push({ label: el.textContent!, id: el.id })
  }

  // ugly solution but whatever :|
  const codeBlocks = document.getElementsByTagName('pre')
  for (const codeBlock of codeBlocks) {
    const vueComponent = h(CodeBlockButtons, {})
    render(vueComponent, codeBlock)
  }
})
</script>

<template>
  <div
    class="relative flex flex-col items-center break-words max-w-[89rem] mx-auto px-[20.5rem] pt-24 pb-14 max-xl:ml-0 max-xl:pl-12 max-lg:mr-0 max-lg:pr-12 max-md:px-8 max-sm:px-5"
  >
    <chal-info-card :info="chalInfo" />
    <div
      id="article"
      class="markdown w-full flex flex-col gap-y-3 px-4 max-md:px-0"
      v-html="renderedMd"
    ></div>
    <div class="fixed w-[17.5rem] h-full top-0 right-0 pointer-events-none pr-8 max-lg:hidden">
      <sections-bar :sections="sections" />
    </div>
  </div>
</template>
