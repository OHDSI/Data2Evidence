<template>
  <div class="root-layout">
    <header class="sticky-header">
      <NavBar />
    </header>
    
    <main>
      <div v-show="!isAppActive && !currentComponent" id="default-content">
        <App />
      </div>
      
      <!-- Dynamic container for components -->
      <div v-show="currentComponent && !isAppActive" id="component-content">
        <component :is="currentComponent" />
      </div>
      
      <!-- Dynamic containers for apps -->
      <div v-for="app in apps" :key="app.appName" 
            :id="`single-spa-application:${app.appName}`" 
            class="app-container"
            v-show="currentRoute === app.route"></div>
    </main>
  </div>
</template>

<script>
import App from './App.vue';
import NavBar from './components/NavBar.vue';
import { useNavigation } from './composables/useNavigation';

export default {
  name: 'RootLayout',
  components: {
    App,
    NavBar
  },
  setup() {
    const navigation = useNavigation();
    return navigation;
  }
};
</script>

<style scoped>
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 90;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-container {
  contain: style paint;
  display: flow-root;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-height: 500px;
  padding: 1rem;
}

#default-content, #component-content {
  min-height: 500px;
}
</style>