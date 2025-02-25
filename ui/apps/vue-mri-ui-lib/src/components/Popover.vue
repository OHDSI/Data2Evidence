<template>
  <popper :target="target" placement="top" boundary="viewport" @show="$emit('show')" @hide="$emit('hide')">
    <div class="popover-container">
      <header>
        <div>
          <span>{{ headerText }}</span>
        </div>
      </header>
      <div class="popover-body">
        <slot />
      </div>
    </div>
  </popper>
</template>
<script lang="ts">
import Popper from './Popper.vue'

export default {
  name: 'popover',
  props: {
    headerText: String,
    target: HTMLElement,
    placement: { type: String, default: 'top' },
  },
  components: {
    Popper,
  },
}
</script>
