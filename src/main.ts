import './assets/main.css'
import 'highlight.js/styles/a11y-dark.css'

import { ViteSSG } from 'vite-ssg'
import { createPinia } from 'pinia'

import App from './App.vue'
import WriteupWrapper from './views/WriteupWrapper.vue'
import WriteupView from './views/WriteupView.vue'
import { defaultWriteupSlug } from '@/data/sidebarList'
import { chals } from '@/data/chals'

const writeupRoutes = Object.keys(chals).map((slug) => ({
  path: slug,
  component: WriteupView,
  props: { slug }
}))

export const createApp = ViteSSG(
  App,
  {
    base: '/ctf-writeups/',
    routes: [
      {
        path: '/',
        redirect: '/' + defaultWriteupSlug,
        component: WriteupWrapper,
        children: writeupRoutes
      }
    ],
    scrollBehavior() {
      return { top: 0 }
    }
  },
  ({ app }) => {
    const pinia = createPinia()
    app.use(pinia)
  }
)
