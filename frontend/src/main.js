import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import store from './store/index.js';

const app = createApp(App);
app.use(store);
app.use(router);
app.mount('#app');

// 마운트 후 Firebase 인증 초기화
store.dispatch('initAuth').catch(err => {
  console.error('initAuth 실패:', err);
});