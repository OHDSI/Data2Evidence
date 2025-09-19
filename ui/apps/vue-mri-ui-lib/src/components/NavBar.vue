<template>
  <header class="nav-bar">
    <div class="nav-bar__container">
      <div class="nav-bar__logo" @click="handleLogoClick" role="button" tabindex="0">
        <img :src="logoSrc" alt="ATLAS" height="20px" />
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
      <div class="nav-bar__right" @click="handleOhdsiClick" role="button" tabindex="0">
        <img :src="logoOhdsiSrc" alt="OHDSI" height="30px" />
      </div>
    </div>
  </header>
</template>

<script>
import logoSvg from '@/assets/atlas-text.svg'
import logoOhdsiSvg from '@/assets/ohdsi.png'
import { getNavigationItems } from '../utils/config'
import { navigateToRoute } from '../utils/AppRegistry'

export default {
  name: 'NavBar',
  data() {
    const navigationItems = getNavigationItems();

    return {
      logoSrc: logoSvg,
      logoOhdsiSrc: logoOhdsiSvg,
      navigationItems
    }
  },
  mounted() {
    this.updateActiveNavFromRoute();
    window.addEventListener('single-spa:routing-event', this.updateActiveNavFromRoute);
  },
  beforeUnmount() {
    window.removeEventListener('single-spa:routing-event', this.updateActiveNavFromRoute);
  },
  methods: {
    handleLogoClick() {
      navigateToRoute('/', { type: 'component', component: 'Landing' });
    },
    handleOhdsiClick() {
      window.open('https://ohdsi.org', '_blank');
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
      } else if (item.route) {
        navigateToRoute(item.route);
      } else {
        navigateToRoute('/');
      }
    },
    updateActiveNavFromRoute() {
      const currentPath = window.location.pathname;
      
      this.navigationItems.forEach(item => {
        item.active = item.route === currentPath;
      });
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
}

.nav-bar__logo {
  display: block;
  padding: 0.5rem 0;
  margin-left: 2rem;
  cursor: pointer;
}

.nav-bar__right {
  flex: 1;
  text-align: right;
  padding-right: 2rem;

  > img {
    padding: 0.5rem 0;
    cursor: pointer;
  }
}

.nav-bar__nav {
  padding-left: 2rem;
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
  padding: 18px;
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