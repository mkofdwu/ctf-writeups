import { defineStore } from 'pinia'

export const useSearchModalStore = defineStore('searchModal', {
  state: () => {
    return { isOpen: false }
  },
  actions: {
    open() {
      this.isOpen = true
    },
    close() {
      this.isOpen = false
    },
    toggle() {
      this.isOpen = !this.isOpen
    }
  }
})
