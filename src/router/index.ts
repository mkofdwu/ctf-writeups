import { createRouter, createWebHistory } from 'vue-router'
import WriteupWrapper from '@/views/WriteupWrapper.vue'
import WriteupView from '@/views/WriteupView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/writeups/proto-grader' // latest writeup
    },
    {
      path: '/writeups',
      redirect: '/writeups/proto-grader' // latest writeup
    },
    {
      path: '/writeups/:slug',
      component: WriteupWrapper,
      children: [
        {
          path: '',
          name: 'writeup',
          component: WriteupView
        }
      ]
    }
  ]
})

export default router
