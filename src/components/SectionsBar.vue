<script setup lang="ts">
import { nextTick, ref, computed } from 'vue'

const thisUrl = location.href // account for gh pages prefix ($route.fullPath doesnt work...)

const { sections } = defineProps<{ sections: { label: string; id: string }[] }>()

let sectionLinks: HTMLCollectionOf<Element>
const currentSection = ref('')

nextTick(() => {
  if (typeof window === 'undefined') return // handle non-SSG aware code below

  sectionLinks = document.getElementsByClassName('section-link')

  window.addEventListener('scroll', () => {
    const sectionsReversed = ([] as any[]).concat(sections).reverse()
    let isUnderSection = false

    for (const section of sectionsReversed) {
      const sectionOffset = document.getElementById(section.id)!.offsetTop
      if (window.scrollY + window.innerHeight / 4 > sectionOffset) {
        currentSection.value = section.id
        isUnderSection = true
        break
      }
    }

    if (!isUnderSection) {
      currentSection.value = ''
    }
  })
})

const markerTop = computed(() => {
  if (currentSection.value == '') {
    return ''
  }
  const i = sections.findIndex((section) => section.id === currentSection.value)
  const bbox = sectionLinks.item(i)!.getBoundingClientRect()
  return `calc(${bbox.top}px + 0.5rem)`
})
</script>

<template>
  <div class="relative h-full flex">
    <div class="dotted-line-vert h-auto mb-10 mr-9"></div>
    <transition name="fade">
      <div
        v-if="currentSection"
        class="w-1 h-8 rounded-sm bg-primary absolute -left-0.5 transition-all"
        :style="{ top: markerTop }"
      ></div
    ></transition>
    <div class="flex flex-col pt-16">
      <span class="mt-6 mb-4 opacity-60">Sections</span>
      <a
        v-for="{ label, id } in sections"
        :key="id"
        class="section-link h-12 flex items-center font-semibold transition-colors pointer-events-auto"
        :class="id === currentSection ? 'text-primary' : 'hover:text-primary'"
        :href="thisUrl + '#' + id"
      >
        {{ label }}
      </a>
    </div>
    <div class="absolute bottom-"></div>
  </div>
</template>
