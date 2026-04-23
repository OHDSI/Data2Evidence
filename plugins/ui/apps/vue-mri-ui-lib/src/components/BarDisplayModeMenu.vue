<template>
  <div class="bar-display-mode-menu" ref="rootEl">
    <chartButton
      @clickEv="toggleOpen"
      :name="chart.name"
      :icon="chart.icon"
      :iconGroup="chart.iconGroup"
      :title="title"
      :activeChart="activeChart"
    ></chartButton>
    <div v-if="opened" class="bar-display-mode-menu__popover" @click.stop>
      <component
        v-for="mode in modeOrder"
        :key="mode.id"
        :is="componentById[mode.id]"
        :active="getBarDisplayMode === mode.id"
        :showDistributionOverlay="mode.hasDistributionOverlay ? getShowDistributionOverlay : undefined"
        @select="onSelect(mode.id)"
        @update:showDistributionOverlay="onToggleOverlay"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import ChartButton from './ChartButton.vue'
import StackedMode from './StackBarModes/StackedMode.vue'
import OverlayMode from './StackBarModes/OverlayMode.vue'
import PartialOverlaySolidMode from './StackBarModes/PartialOverlaySolidMode.vue'
import DistributionCurvesMode from './StackBarModes/DistributionCurvesMode.vue'
import { modeOrder } from './StackBarModes/modes'

export default {
  name: 'barDisplayModeMenu',
  components: {
    ChartButton,
    StackedMode,
    OverlayMode,
    PartialOverlaySolidMode,
    DistributionCurvesMode,
  },
  props: {
    chart: { type: Object, required: true },
    activeChart: { type: String, default: '' },
    title: { type: String, default: '' },
  },
  emits: ['switch-chart'],
  data() {
    return {
      opened: false,
      modeOrder,
      componentById: {
        stack: 'StackedMode',
        overlay: 'OverlayMode',
        partialOverlaySolid: 'PartialOverlaySolidMode',
        distribution: 'DistributionCurvesMode',
      } as Record<string, string>,
    }
  },
  computed: {
    ...mapGetters(['getBarDisplayMode', 'getShowDistributionOverlay']),
  },
  mounted() {
    window.addEventListener('click', this.handleOutsideClick)
    window.addEventListener('keydown', this.handleKeydown)
  },
  beforeUnmount() {
    window.removeEventListener('click', this.handleOutsideClick)
    window.removeEventListener('keydown', this.handleKeydown)
  },
  methods: {
    ...mapActions(['setBarDisplayMode', 'setShowDistributionOverlay']),
    toggleOpen() {
      this.opened = !this.opened
    },
    onSelect(modeId: string) {
      this.setBarDisplayMode(modeId)
      if (this.activeChart !== this.chart.name) {
        this.$emit('switch-chart')
      }
      this.opened = false
    },
    onToggleOverlay(value: boolean) {
      this.setShowDistributionOverlay(value)
    },
    handleOutsideClick(event: MouseEvent) {
      if (!this.opened) return
      const root = this.$refs.rootEl as HTMLElement | undefined
      if (root && !root.contains(event.target as Node)) {
        this.opened = false
      }
    },
    handleKeydown(event: KeyboardEvent) {
      if (this.opened && event.key === 'Escape') {
        this.opened = false
      }
    },
  },
}
</script>

<style scoped>
.bar-display-mode-menu {
  position: relative;
  display: inline-block;
}
.bar-display-mode-menu__popover {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  min-width: 180px;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
}
</style>
