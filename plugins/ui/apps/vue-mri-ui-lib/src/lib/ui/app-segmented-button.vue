<template>
  <div class="app-segmented-button" v-on:keyup="keymonitor">
    <ul ref="segmentedItemList" class="app-segmented-list" tabindex="-1">
      <template v-for="item in segmentedItems" :key="item.value">
        <li
          v-if="item.value === selected"
          tabindex="0"
          v-on:focus="setFocusItem(item)"
          class="app-segmented-listItem"
          v-bind:class="{
            'app-segmented-listItemSelected': item.value === selected,
            'app-segmented-listItemFocused': item.value === focusedItem.value,
          }"
          @click="selectItem(item)"
        >
          {{ item.text }}
        </li>
        <li
          v-if="item.value !== selected"
          tabindex="-1"
          v-on:focus="setFocusItem(item)"
          class="app-segmented-listItem"
          v-bind:class="{
            'app-segmented-listItemSelected': item.value === selected,
            'app-segmented-listItemFocused': item.value === focusedItem.value,
          }"
          @click="selectItem(item)"
        >
          {{ item.text }}
        </li>
      </template>
    </ul>
  </div>
</template>
<script lang="ts">
export default {
  name: 'app-segmented-button',
  data() {
    return {
      selected: '',
      focusedItem: {},
    }
  },
  watch: {
    selected() {
      this.$emit('input', this.selected)
    },
  },
  created() {
    this.selected = this.value
  },
  props: ['segmentedItems', 'value', 'onSelectedChange'],
  methods: {
    selectItem(item) {
      this.focusedItem = item
      this.selected = item.value
      this.$emit('onSelectedChange')
      for (let i = 0; i < this.segmentedItems.length; i += 1) {
        if (this.segmentedItems[i].value === item.value) {
          this.$nextTick(() => {
            this.setFocusIndex(i)
          })
          break
        }
      }
    },
    keymonitor(event) {
      const key = event.key
      if (key === ' ' || key === 'Spacebar') {
        this.selectItem(this.focusedItem)
      }
      if (key === 'Right' || key === 'ArrowRight') {
        for (let i = 0; i < this.segmentedItems.length; i += 1) {
          if (this.focusedItem.value && this.segmentedItems[i].value === this.focusedItem.value) {
            if (this.segmentedItems[i + 1]) {
              this.focusedItem = this.segmentedItems[i + 1]
              this.setFocusIndex(i + 1)
            }
            break
          }
          if (!this.focusedItem.value && this.segmentedItems[i].value === this.selected) {
            if (this.segmentedItems[i + 1]) {
              this.focusedItem = this.segmentedItems[i + 1]
              this.setFocusIndex(i + 1)
            }
            break
          }
        }
      }
      if (key === 'Left' || key === 'ArrowLeft') {
        for (let i = 0; i < this.segmentedItems.length; i += 1) {
          if (this.focusedItem.value && this.segmentedItems[i].value === this.focusedItem.value) {
            if (this.segmentedItems[i - 1]) {
              this.focusedItem = this.segmentedItems[i - 1]
              this.setFocusIndex(i - 1)
            }
            break
          }
          if (!this.focusedItem.value && this.segmentedItems[i].value === this.selected) {
            if (this.segmentedItems[i - 1]) {
              this.focusedItem = this.segmentedItems[i - 1]
              this.setFocusIndex(i - 1)
            }
            break
          }
        }
      }
    },
    setFocusIndex(index) {
      if (
        this.$refs.segmentedItemList &&
        this.$refs.segmentedItemList.children &&
        this.$refs.segmentedItemList.children[index] &&
        this.$refs.segmentedItemList.children[index].focus
      ) {
        this.$refs.segmentedItemList.children[index].focus()
      }
    },
    setFocusItem(item) {
      this.focusedItem = item
    },
  },
}
</script>
