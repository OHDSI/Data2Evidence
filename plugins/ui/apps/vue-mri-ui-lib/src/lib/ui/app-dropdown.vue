<template>
  <div class="app-dropdown" v-bind:class="{ disabled: disabled }">
    <div
      class="app-dropdown-popover"
      ref="dropdownListMenu"
      v-if="dropdownVisible"
      :style="dropdownListStyle"
      tabindex="0"
      v-on:keyup="monitorKeyDropdownList"
      v-focus
    >
      <ul style="width: 100%; max-width: 100%" class="app-dropdown-list">
        <template v-for="(item, index) in nonEmptyDropdownItems" :key="item.value">
          <li
            v-on:mouseover="onItemHover(index)"
            class="app-dropdown-listItem"
            v-bind:class="{
              'hover-select': index === hoverIndex,
              'app-dropdown-listItemSelected': item.value === selected,
            }"
            @click="selectItem(item)"
          >
            {{ item.text }}
          </li>
        </template>
      </ul>
    </div>
    <div
      class="app-dropdown-container"
      ref="dropdownContainer"
      v-bind:class="{ 'dropdown-active': dropdownVisible }"
      @click="toggleList"
      tabindex="0"
      v-on:keyup="monitorKeyDropdownButton"
    >
      <label v-bind:class="{ placeholder: selectedText.placeholder }" class="app-dropdown-label">
        {{ selectedText.text }}</label
      >
      <button class="app-dropdown-arrow" v-bind:class="{ 'dropdown-active': dropdownVisible }" tabindex="-1"></button>
    </div>
  </div>
</template>
<script lang="ts">
export default {
  name: 'app-dropdown',
  data() {
    return {
      dropdownListStyle: {},
      dropdownVisible: false,
      selected: '',
      hoverIndex: -1,
    }
  },
  created() {
    this.selected = this.value
  },
  mounted() {
    this.$nextTick(() => {
      window.addEventListener('resize', this.repositionDropdownPopover)
      window.addEventListener('click', this.closeSelectionMenu)
    })
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.repositionDropdownPopover)
    window.removeEventListener('click', this.closeSelectionMenu)
  },
  watch: {
    selected() {
      this.$emit('input', this.selected)
    },
  },
  props: ['dropdownItems', 'value', 'onSelectedChange', 'emptyListText', 'emptySelectionText'],
  methods: {
    monitorKeyDropdownList(event) {
      const key = event.key
      if (key === 'Escape' || key === 'Esc') {
        this.dropdownVisible = false
        event.stopImmediatePropagation()
        this.$nextTick(() => {
          this.$refs.dropdownContainer.focus()
        })
      }
      if (key === 'Down' || key === 'ArrowDown') {
        this.hoverNextItem(1)
      }
      if (key === 'Up' || key === 'ArrowUp') {
        this.hoverNextItem(-1)
      }
      if (key === ' ' || key === 'Spacebar') {
        if (this.dropdownItems[this.hoverIndex]) {
          this.selectItem(this.dropdownItems[this.hoverIndex])
        }
      }
    },
    hoverNextItem(increment) {
      if (this.dropdownItems.length > 0) {
        if (this.hoverIndex >= this.dropdownItems.length) {
          this.hoverIndex = 0
        }
        if (this.hoverIndex < 0) {
          this.hoverIndex = this.dropdownItems.length - 1
        }
        this.hoverIndex += increment === 0 ? 1 : increment
        if (this.hoverIndex >= this.dropdownItems.length) {
          this.hoverIndex = 0
        }
        if (this.hoverIndex < 0) {
          this.hoverIndex = this.dropdownItems.length - 1
        }
      }
    },
    onItemHover(idx) {
      this.hoverIndex = idx
    },
    monitorKeyDropdownButton(event) {
      const key = event.key
      if (key === ' ' || key === 'Spacebar') {
        this.toggleList()
        this.hoverIndex = 0
      }
    },
    closeSelectionMenu(event) {
      if (
        this.dropdownVisible &&
        this.$refs.dropdownListMenu &&
        !this.$refs.dropdownListMenu.contains(event.target) &&
        !this.$refs.dropdownContainer.contains(event.target)
      ) {
        this.dropdownVisible = false
      }
    },
    repositionDropdownPopover() {
      const rightLocation = this.$refs.dropdownContainer.getBoundingClientRect().right
      const leftLocation = this.$refs.dropdownContainer.getBoundingClientRect().left
      const topLocation = this.$refs.dropdownContainer.getBoundingClientRect().top
      const bottomLocation = window.innerHeight - topLocation

      let dropdownListHeight = 40
      if (this.dropdownItems && this.dropdownItems.length > 0) {
        dropdownListHeight = 40 * this.dropdownItems.length
      }
      dropdownListHeight += 2

      if (dropdownListHeight > topLocation) {
        this.dropdownListStyle = {
          top: '8px',
          width: `${rightLocation - leftLocation}px`,
          height: `${topLocation - 8}px`,
        }
      } else {
        this.dropdownListStyle = {
          bottom: `${bottomLocation}px`,
          width: `${rightLocation - leftLocation}px`,
          height: `${dropdownListHeight}px`,
        }
      }
    },
    toggleList() {
      if (this.disabled) {
        return
      }
      this.dropdownVisible = !this.dropdownVisible
      if (this.dropdownVisible) {
        this.repositionDropdownPopover()
      }
    },
    selectItem(item) {
      this.selected = item.value
      this.dropdownVisible = false
      this.$emit('onSelectedChange')
      this.$nextTick(() => {
        this.$refs.dropdownContainer.focus()
      })
    },
  },
  computed: {
    nonEmptyDropdownItems() {
      if (this.dropdownItems && this.dropdownItems.length > 0) {
        return this.dropdownItems
      }
      return [{ text: '', value: '' }]
    },
    selectedText() {
      const displayText = {
        text: '',
        placeholder: true,
      }
      if (this.emptySelectionText) {
        displayText.text = this.emptySelectionText
      }
      const dropdownItems = this.dropdownItems
      const selectedKey = this.selected
      if (dropdownItems.length === 0) {
        if (this.emptyListText) {
          displayText.text = this.emptyListText
        }
        return displayText
      }
      for (let i = 0; i < dropdownItems.length; i += 1) {
        if (dropdownItems[i].value === selectedKey) {
          displayText.text = dropdownItems[i].text
          displayText.placeholder = false
          break
        }
      }
      return displayText
    },
  },
}
</script>
