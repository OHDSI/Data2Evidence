<template>
  <div class="bs-collapse">
    <div
      ref="contentRef"
      class="bs-collapse__content"
      :class="{ 'bs-collapse__content--open': modelValue }"
      :style="contentStyle"
      :role="role"
      :aria-hidden="!modelValue"
    >
      <div class="bs-collapse__inner">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  compatConfig: {
    MODE: 3,
  },
}
</script>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'

const TRANSITION_DURATION = 300 // milliseconds - matches CSS transition duration

interface Props {
  modelValue?: boolean
  role?: string
  appear?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  role: undefined,
  appear: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  show: []
  shown: []
  hide: []
  hidden: []
}>()

const contentRef = ref<HTMLElement>()
const isTransitioning = ref(false)
const contentHeight = ref<number | null>(null)

// Computed style for the content wrapper
const contentStyle = computed(() => {
  if (!isTransitioning.value) {
    return {
      height: props.modelValue ? undefined : '0',
      overflow: 'hidden',
    }
  }

  return {
    height: contentHeight.value !== null ? `${contentHeight.value}px` : '0',
    overflow: 'hidden',
  }
})

// Get the natural height of the content
const getContentHeight = (): number => {
  if (!contentRef.value) return 0

  const element = contentRef.value
  const currentHeight = element.style.height
  const currentOverflow = element.style.overflow

  // Temporarily set height to auto to measure
  element.style.height = 'auto'
  element.style.overflow = 'visible'

  const height = element.scrollHeight

  // Restore original styles
  element.style.height = currentHeight
  element.style.overflow = currentOverflow

  return height
}

// Handle the collapse animation
const handleTransition = async (show: boolean) => {
  if (!contentRef.value) return

  isTransitioning.value = true

  if (show) {
    emit('show')
    contentHeight.value = 0

    await nextTick()

    // Use requestAnimationFrame to ensure the initial state is rendered
    requestAnimationFrame(() => {
      // Measure the content height
      const targetHeight = getContentHeight()
      contentHeight.value = targetHeight
    })

    // Wait for the transition to complete
    setTimeout(() => {
      isTransitioning.value = false
      contentHeight.value = null
      emit('shown')
    }, TRANSITION_DURATION)
  } else {
    emit('hide')

    // First set explicit height
    contentHeight.value = getContentHeight()

    await nextTick()

    // Use requestAnimationFrame to ensure the browser has time to register the initial height
    requestAnimationFrame(() => {
      // Then collapse to 0
      contentHeight.value = 0
    })

    // Wait for the transition to complete
    setTimeout(() => {
      isTransitioning.value = false
      contentHeight.value = null
      emit('hidden')
    }, TRANSITION_DURATION)
  }
}

// Watch for model value changes
watch(
  () => props.modelValue,
  newValue => {
    handleTransition(newValue)
  }
)

// Handle initial state if appear prop is true
onMounted(() => {
  if (props.appear && props.modelValue) {
    handleTransition(true)
  }
})
</script>

<style lang="scss" scoped>
.bs-collapse {
  &__content {
    transition: height 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    overflow: hidden;
  }
}

// Respect user's motion preferences
@media (prefers-reduced-motion: reduce) {
  .bs-collapse__content {
    transition: none;
  }
}
</style>
