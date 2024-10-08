<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MaterialIcon from './MaterialIcon.vue'

let codeElement: HTMLElement
const el = ref<HTMLDivElement>()
const isCopied = ref(false)
const isWrapped = ref(false)

onMounted(() => {
  codeElement = el.value!.parentElement!.getElementsByTagName('code')[0]
})

function copyText() {
  if (isCopied.value) return
  navigator.clipboard.writeText(codeElement.textContent!)
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 1500)
}

function toggleWrap() {
  // @ts-ignore
  if (codeElement.style.textWrap === 'wrap') {
    // @ts-ignore
    codeElement.style.textWrap = 'nowrap'
    isWrapped.value = false
  } else {
    // @ts-ignore
    codeElement.style.textWrap = 'wrap'
    isWrapped.value = true
  }
}
</script>

<template>
  <div ref="el" class="absolute top-3 right-3 flex" style="font-family: Gabarito, sans-serif">
    <button
      class="w-8 h-8 bg-almost-black rounded-lg grid place-items-center mr-2 transition-colors"
      :class="isCopied ? '' : 'hover:bg-almost-black-lighter'"
      @click="copyText"
    >
      <material-icon
        name="content_copy"
        class="text-lg transition-opacity"
        :class="isCopied ? 'opacity-0' : ''"
      />
      <material-icon
        name="check"
        class="absolute text-lg text-primary transition-opacity"
        :class="isCopied ? '' : 'opacity-0'"
      />
    </button>
    <button
      class="w-8 h-8 rounded-lg grid place-items-center transition-colors"
      :class="isWrapped ? 'bg-primary text-black' : 'bg-almost-black hover:bg-almost-black-lighter'"
      @click="toggleWrap"
    >
      <material-icon name="wrap_text" class="text-lg" :class="isWrapped ? 'text-black' : ''" />
    </button>
  </div>
</template>
