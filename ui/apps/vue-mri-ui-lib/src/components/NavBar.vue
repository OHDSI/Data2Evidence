<template>
  <header class="nav-bar">
    <div class="nav-bar__container">
      <div class="nav-bar__logo" @click="handleLogoClick" role="button" tabindex="0">
        <img :src="logoSrc" alt="Data2Evidence" height="40px" />
      </div>
      <nav class="nav-bar__nav">
        <ul class="nav-bar__nav-list">
          <template v-for="item in navigationItems" :key="item.id">
            <li
              v-if="item.visible"
              class="nav-bar__nav-item"
              :class="{ 'nav-bar__nav-item--active': item.active }"
            >
              <a
                href="#"
                class="nav-bar__nav-link"
                @click.prevent="handleNavClick(item)"
              >
                {{ item.title }}
              </a>
            </li>
          </template>
        </ul>
      </nav>
    </div>
  </header>
</template>

<script>
import logoSvg from '@/assets/d2e.svg'
import { getNavigationItems } from '../utils/config.ts'
import { navigateToRoute } from '../utils/AppRegistry.ts'

export default {
  name: 'NavBar',
  data() {
    const navigationItems = getNavigationItems();

    return {
      logoSrc: logoSvg,
      navigationItems
    }
  },
  methods: {
    handleLogoClick() {
      navigateToRoute('/');
    },
    handleNavClick(item) {
      this.navigationItems.forEach(navItem => {
        navItem.active = navItem.id === item.id;
      });
      
      if (item.type === 'app' && item.route) {
        navigateToRoute(item.route);
      } else if (item.type === 'component' && item.component) {
        const route = item.route || '/';
        navigateToRoute(route, item);
      } else {
        navigateToRoute('/');
      }
    }
  }
}
</script>

<style scoped>
.nav-bar {
  width: 100%;
  height: 56px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-bar__container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-bar__logo {
  display: block;
  padding: 0.5rem 0;
  margin-left: 2rem;
  cursor: pointer;
}

.nav-bar__nav {
  padding-right: 2rem;
}

.nav-bar__nav-list {
  display: flex;
  align-items: center;
  gap: 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-bar__nav-item {
  position: relative;
  margin-bottom: 0;
}

.nav-bar__nav-link {
  display: inline-block;
  padding: 18px 18px 19px 18px;
  color: #000080;
  font-weight: 400;
  text-decoration: none;
  transition: color 0.15s ease-in-out;
}

.nav-bar__nav-link:hover {
  color: #3a52a8;
}

.nav-bar__nav-item--active {
  font-weight: 500;
}

.nav-bar__nav-item--active::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  height: 0.5rem;
  width: 100%;
  background-color: #000080;
  border-radius: 0.5rem 0.5rem 0 0;
}
</style>