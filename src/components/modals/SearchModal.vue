<script setup lang="ts">
// NOTE:
// this entire system of animating the moving parts is indeed very messy.
// perhaps if i find a better way to do this in the future i will refactor it
// but for now it works (mostly)

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import MiniSearch from 'minisearch'
import TextSearchInput from './TextSearchInput.vue'
import FilterByCat from './FilterByCat.vue'
import FilterByCtf from './FilterByCtf.vue'
import SearchResultsList from './SearchResultsList.vue'
import { useSearchModalStore } from '@/stores/searchModal'
import type { ChalCat, ChalInfo } from '@/types/ChalInfo'
import { chals } from '@/data/chals'
import { sidebarList } from '@/data/sidebarList'
import { slugToMd } from '@/data/slugToMd'
import MaterialIcon from '../MaterialIcon.vue'

type SearchMethod = 'none' | 'textSearch' | 'filterByCat' | 'filterByCtf'

// elements
const parentContainer = ref<HTMLDivElement>()
const textSearchInput = ref<typeof TextSearchInput>()
const filterByCat = ref<typeof FilterByCat>()
const filterByCtf = ref<typeof FilterByCtf>()

const searchMethod = ref<SearchMethod>('none')
const textQuery = ref('')
const selectedCats = ref<ChalCat[]>([])
const selectedCtfs = ref<string[]>([])
const results = ref<[string, ChalInfo][]>([])

const resultsListOffset = computed(() => {
  switch (searchMethod.value) {
    case 'textSearch':
      return textSearchInput.value!.$el.clientHeight + 'px'
    case 'filterByCat':
      return `calc(${filterByCat.value!.$el.clientHeight}px + 1.5rem)`
    case 'filterByCtf':
      return filterByCtf.value!.$el.clientHeight + 'px'
    default:
      return '0px'
  }
})

const searchModal = useSearchModalStore()

function checkClickOutside(event: MouseEvent) {
  if (!searchModal.isOpen) return

  const el = parentContainer.value!
  if (!(el === event.target || el.contains(event.target as Node | null))) {
    searchModal.close()
  }
}

function recalculateOffsets() {
  let currOffset = 0
  for (const child of [textSearchInput, filterByCat, filterByCtf]) {
    const el = child.value!.$el as HTMLElement
    el.style.top = currOffset + 'px'
    currOffset += el.clientHeight
  }
}

onMounted(() => {
  setTimeout(() => document.addEventListener('click', checkClickOutside), 1) // hack but whatever
  setTimeout(recalculateOffsets, 20) // idk why but filterByCat has the wrong height in the first few milliseconds
  window.addEventListener('resize', recalculateOffsets)
})

onUnmounted(() => {
  document.removeEventListener('click', checkClickOutside)
  window.removeEventListener('resize', recalculateOffsets)
})

const documents = []
for (const slug in chals) {
  documents.push({ ...chals[slug], id: slug, writeupMd: slugToMd[slug]! })
}

// NOTE: Tried using fuse.js, but fsr it couldn't search stuff in `writeupMd` properly,
// for example: searching for "android" returns 2-3 completely unrelated results. Actual
// android chals (with multiple occurrences of "android" in the text) don't show up.

// const fuse = new Fuse(fuseList, {
//   threshold: 0.4,
//   keys: ['ctf', 'title', 'description', 'writeupMd'],
//   fieldNormWeight: 0,
//   ignoreFieldNorm: true
// })

const miniSearch = new MiniSearch({
  fields: ['ctf', 'title', 'description', 'writeupMd'],
  searchOptions: { fuzzy: 0.2 }
})
miniSearch.addAll(documents)

watch([textQuery], () => {
  const miniSearchResults = miniSearch.search(textQuery.value)
  results.value = miniSearchResults.map((result) => [result.id, chals[result.id]])
})

function toggleSelectCat(cat: ChalCat) {
  const i = selectedCats.value.indexOf(cat)
  if (i === -1) {
    selectedCats.value.push(cat)
  } else {
    selectedCats.value.splice(i, 1)
  }

  if (selectedCats.value.length > 0) {
    searchMethod.value = 'filterByCat'
    moveToTop(filterByCat.value!.$el)
  } else {
    searchMethod.value = 'none'
    moveBack()
  }

  if (selectedCats.value.length > 0) {
    results.value = Object.entries(chals).filter(([, chal]) => {
      for (const cat of selectedCats.value) {
        if (chal.cats.includes(cat)) return true
      }
      return false
    })
  } else {
    results.value = []
  }
}

function toggleSelectCtf(ctf: string) {
  const i = selectedCtfs.value.indexOf(ctf)
  if (i === -1) {
    selectedCtfs.value.push(ctf)
  } else {
    selectedCtfs.value.splice(i, 1)
  }

  if (selectedCtfs.value.length > 0) {
    searchMethod.value = 'filterByCtf'
    moveToTop(filterByCtf.value!.$el)
  } else {
    searchMethod.value = 'none'
    moveBack()
  }

  if (selectedCtfs.value.length > 0) {
    results.value = []
    for (const ctf of sidebarList) {
      if (selectedCtfs.value.includes(ctf.name)) {
        for (const { slug } of ctf.chals) {
          results.value.push([slug, chals[slug]])
        }
      }
    }
  } else {
    results.value = []
  }
}

let savedOffset: number = -1
let movedEl: HTMLElement

function moveToTop(el: HTMLElement) {
  if (savedOffset !== -1) {
    // an element has already been moved to top
    return
  }
  savedOffset = el.offsetTop
  movedEl = el
  el.style.top = '0'
}

function moveBack() {
  if (savedOffset === -1) {
    // no element has been moved to top
    // this should never happen
    return
  }
  movedEl.style.top = savedOffset + 'px'
  savedOffset = -1
}
</script>

<template>
  <div
    ref="parentContainer"
    class="fixed z-30 w-[800px] h-3/4 left-1/2 bottom-0 -translate-x-1/2 bg-almost-black rounded-t-2.5xl max-[800px]:w-full max-[400px]:h-full max-[400px]:rounded-none"
  >
    <transition name="fade">
      <text-search-input
        ref="textSearchInput"
        v-show="searchMethod === 'none' || searchMethod === 'textSearch'"
        class="absolute w-full transition-all duration-300"
        v-model="textQuery"
        @focus-in="searchMethod = 'textSearch'"
        @focus-out="textQuery.length === 0 && (searchMethod = 'none')"
      />
    </transition>
    <transition name="fade">
      <filter-by-cat
        ref="filterByCat"
        v-show="searchMethod === 'none' || searchMethod === 'filterByCat'"
        class="absolute w-full transition-all duration-300"
        :selected-cats="selectedCats"
        @toggle-select-cat="toggleSelectCat"
      />
    </transition>
    <transition name="fade">
      <filter-by-ctf
        ref="filterByCtf"
        v-show="searchMethod === 'none' || searchMethod === 'filterByCtf'"
        class="absolute w-full transition-all duration-300"
        :selected-ctfs="selectedCtfs"
        @toggle-select-ctf="toggleSelectCtf"
      />
    </transition>
    <transition name="fade">
      <search-results-list
        v-if="searchMethod !== 'none' && results.length"
        :style="{ top: resultsListOffset }"
        :results="results"
      />
    </transition>
    <button
      class="group absolute top-3 right-3 w-10 h-10 rounded-full grid place-items-center"
      @click="searchModal.close()"
    >
      <material-icon name="close" class="transition-colors group-hover:text-primary" />
    </button>
  </div>
</template>
