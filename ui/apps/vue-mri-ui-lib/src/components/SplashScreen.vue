<template>
  <div class="splash-container">
    <div class="loadingDialog">
      <d4l-spinner />
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'splashScreen',
  data() {
    return {
      splashDisplay: false,
    }
  },
}
</script>

<style scoped lang="scss">
@import '../styles/_mri-variables.scss';
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
</style>
