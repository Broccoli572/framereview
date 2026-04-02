import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import messages from './locales/zh-CN.json';
import App from './App.vue';

import './css/main.css';

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages,
});

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(i18n);
app.mount('#app');
