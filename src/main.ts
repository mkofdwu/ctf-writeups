import './assets/main.css'
import 'highlight.js/styles/a11y-dark.css'

import { ViteSSG } from 'vite-ssg'

import App from './App.vue'
import WriteupWrapper from './views/WriteupWrapper.vue'
import WriteupView from './views/WriteupView.vue'
import { defaultWriteupSlug } from '@/data/sidebarList'
import { chals } from '@/data/writeups'

const writeupRoutes = Object.keys(chals).map((slug) => ({
  path: slug,
  component: WriteupView,
  props: { slug }
}))

export const createApp = ViteSSG(App, {
  base: '/ctf-writeups/',
  routes: [
    {
      path: '/',
      redirect: '/writeups/' + defaultWriteupSlug
    },
    {
      path: '/writeups',
      redirect: '/writeups/' + defaultWriteupSlug,
      component: WriteupWrapper,
      children: writeupRoutes
    }
  ],
  scrollBehavior() {
    return { top: 0 }
  }
})
