import Vue from 'vue'
import App from './App.vue'
import VueRouter from 'vue-router'
import VuejsDialog from 'vuejs-dialog'
//import VuejsDialogMixin from 'vuejs-dialog/dist/vuejs-dialog-mixin.min.js'

import 'vuejs-dialog/dist/vuejs-dialog.min.css'

Vue.config.productionTip = false

//Vue.use(VueRouter)
Vue.use(VuejsDialog)

const router = new VueRouter({
  routes: [
    {
      path: '/',
      component: App
    },
  ]
})

new Vue({
  render: h => h(App),
  //router,
}).$mount('#app')
