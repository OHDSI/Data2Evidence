<template>
  <div class="app-tab-button" v-on:keyup="keymonitor">
    <ul ref="tabItemList" class="app-list" tabindex="-1">
      <template v-for="item in tabItems" :key="item.value">
        <li
          v-if="item.value === selected"
          tabindex="0"
          v-on:focus="setFocusItem(item)"
          class="app-listItem"
          v-bind:class="{ 'app-listItemSelected': item.value === selected, disabled: item.disabled }"
          @click="selectItem(item)"
        >
          {{ item.text }}
        </li>
        <li
          v-if="item.value !== selected"
          tabindex="-1"
          v-on:focus="setFocusItem(item)"
          class="app-listItem"
          v-bind:class="{ 'app-listItemSelected': item.value === selected, disabled: item.disabled }"
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
  name: 'app-tab-button',
  props: ['tabItems', 'value', 'onSelectedChange'],
  data() {
    return {
      selected: '',
      focusedItem: {},
    }
  },
  watch: {
    selected() {
      this.$emit('onSelectedChange', this.selected)
    },
  },
  created() {
    this.selected = this.value
  },
  methods: {
    selectItem(item) {
      if (item.disabled) {
        // do not perform the click action if the button is disabled
        return
      }
      this.focusedItem = item
      this.selected = item.value
      this.$emit('onSelectedChange', this.selected)
      for (let i = 0; i < this.tabItems.length; i += 1) {
        if (this.tabItems[i].value === item.value) {
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
        for (let i = 0; i < this.tabItems.length; i += 1) {
          if (this.focusedItem.value && this.tabItems[i].value === this.focusedItem.value) {
            if (this.tabItems[i + 1]) {
              this.focusedItem = this.tabItems[i + 1]
              this.setFocusIndex(i + 1)
            }
            break
          }
          if (!this.focusedItem.value && this.tabItems[i].value === this.selected) {
            if (this.tabItems[i + 1]) {
              this.focusedItem = this.tabItems[i + 1]
              this.setFocusIndex(i + 1)
            }
            break
          }
        }
      }
      if (key === 'Left' || key === 'ArrowLeft') {
        for (let i = 0; i < this.tabItems.length; i += 1) {
          if (this.focusedItem.value && this.tabItems[i].value === this.focusedItem.value) {
            if (this.tabItems[i - 1]) {
              this.focusedItem = this.tabItems[i - 1]
              this.setFocusIndex(i - 1)
            }
            break
          }
          if (!this.focusedItem.value && this.tabItems[i].value === this.selected) {
            if (this.tabItems[i - 1]) {
              this.focusedItem = this.tabItems[i - 1]
              this.setFocusIndex(i - 1)
            }
            break
          }
        }
      }
    },
    setFocusIndex(index) {
      if (
        this.$refs.tabItemList &&
        this.$refs.tabItemList.children &&
        this.$refs.tabItemList.children[index] &&
        this.$refs.tabItemList.children[index].focus
      ) {
        this.$refs.tabItemList.children[index].focus()
      }
    },
    setFocusItem(item) {
      this.focusedItem = item
    },
  },
}
</script>
