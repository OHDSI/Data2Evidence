import { createApp } from '@vue/compat';
import { createStore } from 'vuex';

// Import the demo component
import QueryFilterDemo from './components/QueryFilterDemo.vue';

// Import necessary styles
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';
import './styles/index.scss';
import './styles/queryFilterCard.scss';

// Create a minimal Vuex store (if needed by components)
const store = createStore({
  state: {},
  mutations: {},
  actions: {},
  modules: {}
});

// Create and mount the demo app
const app = createApp(QueryFilterDemo);

app.use(store);

// Mount to a simple div
app.mount('#app');

console.log('Query Filter Demo app mounted successfully');