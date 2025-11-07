<template>
  <span class="app-icon" v-html="getUnicode()" />
</template>
<script lang="ts">
const icons = {
  drilldown: '&#xe1b8;',
  close: '&#xe03e;',
  sortDescending: '&#xe1fc;',
  sortAscending: '&#xe1fd;',
  slimArrowLeft: '&#xe1ee;',
  slimArrowDown: '&#xe1e2',
  slimArrowRight: '&#xe066',
  horizontalGrip: '&#xe1fb;',
  overflow: '&#xe1f2;',
  decline: '&#xe03e;',
  calendar: '&#xe0ae;',
  puzzle: '&#xe0c6',
  menu: '&#xe1de',
  addFilter: '&#xe056',
  fullScreen: '&#xe166',
  exitFullScreen: '&#xe1f5',
  synchronize: '&#xe00a',
  summaryDoc: '&#xe1b4',
  add: '&#xe058',
  help: '&#xe1c4',
  information: '&#xe202',
  lowerRightPencil: '&#x270E;',
}

export default {
  name: 'app-icon',
  props: {
    icon: {
      type: String,
      default: '',
      required: true,
    },
  },
  methods: {
    getUnicode() {
      return icons[this.icon]
    },
  },
}
</script>
