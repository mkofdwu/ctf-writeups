<script setup lang="ts">
import { nextTick, ref } from 'vue'

const { sections } = defineProps<{ sections: { label: string; id: string }[] }>()

const currentSection = ref('')

nextTick(() => {
  const scrollContainer = document.getElementById('scroll-container')!

  scrollContainer.onscroll = () => {
    const sectionsReversed = ([] as any[]).concat(sections).reverse()
    let isUnderSection = false

    for (const section of sectionsReversed) {
      const sectionOffset = document.getElementById(section.id)!.offsetTop
      if (scrollContainer.scrollTop + window.innerHeight / 2 > sectionOffset) {
        currentSection.value = section.id
        isUnderSection = true
        break
      }
    }

    if (!isUnderSection) {
      currentSection.value = ''
    }
  }
})
</script>

<template>
  <div class="flex flex-col">
    <span class="mt-7 mb-8 opacity-60">Sections</span>
    <a
      v-for="{ label, id } in sections"
      :key="id"
      class="font-semibold mb-5 transition-colors pointer-events-auto"
      :class="id === currentSection ? 'text-primary' : ''"
      :href="$route.path + '#' + id"
    >
      {{ label }}
    </a>
  </div>
</template>
