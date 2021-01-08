import Vue from 'vue'
import Router from 'vue-router'
import G2Map from '@/components/G2Map'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'G2Map',
      component: G2Map
    }
  ]
})
