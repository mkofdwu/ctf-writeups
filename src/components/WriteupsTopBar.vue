<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import MenuButton from './MenuButton.vue'
import WriteupsList from './WriteupsList.vue'
import MaterialIcon from './MaterialIcon.vue'
import GithubIcon from './icons/GithubIcon.vue'

let prevScrollOffset: number

const opened = ref(false)
const showTopBar = ref(true)

watch(useRoute(), () => {
  opened.value = false
})

nextTick(() => {
  prevScrollOffset = window.scrollY

  window.addEventListener('scroll', () => {
    showTopBar.value = window.scrollY < prevScrollOffset
    prevScrollOffset = window.scrollY
  })
})
</script>

<template>
  <div
    class="w-full fixed z-20 bg-[#1e1e1e] flex flex-col items-center transition-transform duration-500"
    :class="showTopBar ? '' : '-translate-y-full'"
  >
    <div
      class="w-full h-16 flex-shrink-0 flex items-center justify-between px-10 max-sm:px-5 max-sm:h-14"
    >
      <span class="text-xl font-semibold">Jia Jie's writeups</span>
      <div class="flex-1"></div>
      <button class="w-10 h-10 rounded-full grid place-items-center">
        <material-icon name="search" />
      </button>
      <a
        href="https://github.com/mkofdwu/ctf-writeups"
        target="_blank"
        class="w-10 h-10 rounded-full grid place-items-center mr-3"
      >
        <github-icon />
      </a>
      <a
        href="https://jiajie.surge.sh"
        target="_blank"
        class="h-10 pl-4 pr-2 flex items-center font-semibold rounded-full border"
      >
        main website
        <material-icon name="arrow_outward" class="ml-3" />
      </a>
      <!-- <menu-button class="cursor-pointer" :opened="opened" @click="opened = !opened" />
      <div
        class="hide-scrollbar fixed left-0 top-14 z-10 w-full bg-black overflow-y-auto origin-top duration-300 transition-all"
        :class="opened ? 'menu-opened' : 'h-0'"
      >
        <div
          class="pt-10 duration-300 transition-opacity"
          :class="opened ? 'opacity-100' : 'opacity-0'"
        >
          <writeups-list :full-width="true" />
        </div>
      </div> -->
    </div>
    <div class="line w-[calc(100vw-5rem)] max-sm:w-screen"></div>
  </div>
</template>

<style scoped>
.menu-opened {
  height: calc(100vh - 4rem);
}

.line {
  height: 1.5px;
  z-index: 10;
  background-image: linear-gradient(to right, #525252 33%, rgba(82, 82, 82, 0) 0%);
  background-size: 12px;
}
</style>
