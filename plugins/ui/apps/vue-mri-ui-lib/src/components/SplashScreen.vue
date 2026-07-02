<template>
  <div class="splash-container" :class="{ 'splash-container--overlay': overlay }">
    <div class="loadingDialog">
      <d4l-spinner />
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'splashScreen',
  props: {
    overlay: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      splashDisplay: false,
    }
  },
}
</script>

<style scoped lang="scss">
.splash-container {
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.9 !important;
  background: #ffffff;
  height: 100%;

  .loadingDialog {
    z-index: 10;
  }
}

.splash-container--overlay {
  position: absolute;
  inset: 0;
}
</style>
