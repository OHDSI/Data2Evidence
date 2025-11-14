<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

type Side = 'left' | 'right'

const props = withDefaults(
  defineProps<{
    side?: Side
    width?: string | number
    height?: string | number
    title?: string
    ariaLabel?: string
    lockScroll?: boolean
    closeOnBackdrop?: boolean
    dim?: boolean
  }>(),
  {
    side: 'right',
    width: 360,
    title: '',
    ariaLabel: 'Side drawer',
    lockScroll: true,
    closeOnBackdrop: true,
    dim: true,
  }
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'afterClose'): void
  (e: 'afterOpen'): void
}>()

const panelRef = ref<HTMLElement | null>(null)

// lock body scroll
onMounted(() => {
  if (props.lockScroll) lockBody()
})

// unlock body scroll
onUnmounted(() => {
  if (props.lockScroll) unlockBody()
})

function close() {
  emit('close')
}

/**
 * Backdrop click handler:
 * Only close if the click originated on the backdrop (not on children).
 */
function onBackdropClick(e: MouseEvent) {
  if (!props.closeOnBackdrop) return
  if (e.target === e.currentTarget) close()
}

// reference count for scroll lock
let bodyScrollLocked = 0
// If multiple drawers exist, only unlock when the last one closes.
function lockBody() {
  bodyScrollLocked++
  if (bodyScrollLocked === 1) {
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    // Add right padding equal to the scrollbar width to prevent layout shift.
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`
    }
  }
}

function unlockBody() {
  bodyScrollLocked = Math.max(0, bodyScrollLocked - 1)
  if (bodyScrollLocked === 0) {
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  }
}
</script>

<template>
  <Teleport to="body">
    <transition name="drawer-backdrop" appear>
      <div class="drawer-backdrop" :class="{ 'drawer-backdrop-dim': dim }" @click="onBackdropClick">
        <transition :name="side === 'left' ? 'drawer-left' : 'drawer-right'" appear>
          <section
            class="drawer-panel"
            :style="{
              [side === 'left' ? 'left' : 'right']: 0,
            }"
            role="dialog"
            :aria-label="ariaLabel || title || 'Drawer'"
            aria-modal="true"
            tabindex="-1"
            ref="panelRef"
          >
            <header class="drawer-header">
              <h2 v-if="title" class="drawer-title">{{ title }}</h2>
              <button class="drawer-close" type="button" aria-label="Close drawer" @click="close">×</button>
            </header>

            <transition name="drawer-content" appear>
              <div class="drawer-content">
                <slot />
              </div>
            </transition>
          </section>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.drawer-backdrop {
  z-index: 91;
  position: fixed;
  inset: 0;
  background: transparent;
  display: flex;
}

.drawer-backdrop-dim {
  background: rgba(0, 0, 0, 0.5);
}

.drawer-panel {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--color-table-row-bg, #edf2f7);
  outline: none;
  width: 85vw;
  max-width: 100vw;
  height: 100vh;
  max-height: 100vh;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}
.drawer-title {
  margin: 0;
  font-size: 18px;
  font-weight: normal;
}
.drawer-close {
  background: transparent;
  border: 0;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.drawer-content {
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
}

.drawer-backdrop-enter-active,
.drawer-backdrop-leave-active {
  transition: opacity 0.18s ease;
}
.drawer-backdrop-enter-from,
.drawer-backdrop-leave-to {
  opacity: 0;
}

.drawer-right-enter-active,
.drawer-right-leave-active,
.drawer-left-enter-active,
.drawer-left-leave-active {
  transition: transform 0.22s ease;
}
.drawer-right-enter-from,
.drawer-right-leave-to {
  transform: translateX(100%);
}
.drawer-left-enter-from,
.drawer-left-leave-to {
  transform: translateX(-100%);
}

.drawer-content-enter-active,
.drawer-content-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.drawer-content-enter-from,
.drawer-content-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>

