<template>
  <div class="axis-menu-button-wrapper">
    <button ref="binButton" class="binningButton" v-on:click="toggleBinningDialog">
      <span class="icon"></span>
    </button>
    <dialogBox
      v-if="binningDialogVisibility"
      @close="toggleBinningDialog"
      :position="binningDialogStyle"
      :arrow="'arrowDown'"
      :arrowPosition="binningArrowPosition"
    >
      <template v-slot:body>
        <div class="binning-dialog">
          <div ref="binDialog" class="body-container">
            <div class="content-container">
              <appLabel :text="getText('MRI_PA_BINNING_SIZE')"></appLabel>
            </div>
            <div class="content-container">
              <div class="input-container">
                <input
                  ref="binInput"
                  v-model="componentBinningValue"
                  v-on:keypress="inputCheck"
                  v-on:blur="updateBinValue"
                  :title="getText('MRI_PA_INPUT_BIN_SIZE')"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </dialogBox>
  </div>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'
import appLabel from '../lib/ui/app-label.vue'
import DialogBox from './DialogBox.vue'

export default {
  name: 'binningButton',
  props: ['binningValue', 'parentBottom', 'updateBinningEv'],
  data() {
    return {
      binningDialogVisibility: false,
      binningDialogStyle: {},
      binningArrowPosition: {},
      componentBinningValue: this.binningValue,
    }
  },
  computed: {
    ...mapGetters(['getText']),
  },
  methods: {
    // set the componentBinningvalue
    updateBinValue() {
      let newBinvalue = 1
      if (this.componentBinningValue && !isNaN(this.componentBinningValue)) {
        newBinvalue = parseInt(this.componentBinningValue, 10)
      }
      this.$emit('updateBinningEv', newBinvalue)
    },
    inputCheck(event) {
      const evt = event || window.event
      const code = evt.which ? evt.which : evt.keyCode
      if (code === 13) {
        this.updateBinValue()
        evt.preventDefault()
      } else if (
        !(
          (code >= 48 && code <= 57) ||
          (code >= 35 && code <= 40) ||
          code === 46 ||
          code === 69 ||
          code === 101 ||
          code === 8
        )
      ) {
        // Not 0-9, e, E, or . / backspace/delete
        evt.preventDefault()
      }
    },
    closeBinningDialog() {
      this.updateBinValue()
      this.binningDialogVisibility = false
    },
    toggleBinningDialog() {
      if (this.binningDialogVisibility) {
        this.closeBinningDialog()
      } else {
        this.componentBinningValue = `${this.binningValue}`
        this.binningDialogVisibility = true

        const bottomLocation = window.innerHeight - this.$el.getBoundingClientRect().top + 26
        const centerLocation = (this.$el.getBoundingClientRect().right + this.$el.getBoundingClientRect().left) / 2

        const binningDialogStyle = {
          bottom: `${bottomLocation}px`,
          left: `${centerLocation - 80}px`,
        }

        this.binningDialogStyle = binningDialogStyle

        this.$nextTick(() => {
          this.$refs.binInput.focus()
        })

        this.$nextTick(() => {
          const rightButton = this.$refs.binButton.getBoundingClientRect().right
          const leftDialog = this.$refs.binDialog.getBoundingClientRect().left
          this.binningArrowPosition = {
            left: `${rightButton - leftDialog + 15.5}px`,
          }
        })
      }
    },
  },
  components: {
    DialogBox,
    appLabel,
  },
}
</script>
