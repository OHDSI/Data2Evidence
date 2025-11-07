<template>
  <div class="help-popover-container">
    <div class="help-icon" ref="helpDialog" :tabindex="showIcon ? 0 : -1">
      <appIcon v-show="showIcon" icon="help" />
    </div>
    <popover
      :target="getTarget"
      :headerText="dialogContent.header"
      @show="popoverVisible = true"
      @hide="popoverVisible = false"
    >
      <span>{{ dialogContent.title }}</span>
      <ul class="popover-list">
        <li v-html="dialogContent.text1"></li>
        <li v-html="dialogContent.text2"></li>
        <li v-html="dialogContent.text3"></li>
        <li v-html="dialogContent.text4"></li>
      </ul>
    </popover>
  </div>
</template>
<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import appIcon from '../lib/ui/app-icon.vue'
import popover from './Popover.vue'

export default {
  name: 'help-popover',
  props: ['isHelpVisible', 'helpType'],
  data() {
    return {
      popoverVisible: false,
    }
  },
  computed: {
    ...mapGetters(['getText']),
    showIcon() {
      return this.isHelpVisible || this.popoverVisible
    },
    dialogContent() {
      let dialogContent = {
        header: '',
        title: '',
        text1: '',
        text2: '',
        text3: '',
        text4: '',
      }

      if (this.helpType === 'variantNum') {
        // genetic variant
        dialogContent = {
          header: this.getText('MRI_PA_RANGE_CONSTRAINT_HELP_HEADER'),
          title: this.getText('MRI_PA_VARIANT_CONSTRAINT_HELP_TEXT'),
          text1: this.getText('MRI_PA_VARIANT_CONSTRAINT_HELP_CHROM', this.hiliteText('ch3:1822-1938')),
          text2: this.getText('MRI_PA_VARIANT_CONSTRAINT_HELP_GENE', this.hiliteText('TP53')),
          text3: '',
          text4: '',
        }
      } else if (this.helpType === 'num') {
        // range values

        dialogContent = {
          header: this.getText('MRI_PA_RANGE_CONSTRAINT_HELP_HEADER'),
          title: this.getText('MRI_PA_RANGE_CONSTRAINT_HELP_VALUE'),
          text1: this.getText('MRI_PA_RANGE_CONSTRAINT_HELP_GT_LT', [this.hiliteText('>'), this.hiliteText('<')]),
          text2: this.getText('MRI_PA_RANGE_CONSTRAINT_HELP_GEQ_LEQ', [this.hiliteText('>='), this.hiliteText('<=')]),
          text3: this.getText('MRI_PA_RANGE_CONSTRAINT_HELP_INTERVAL', [
            this.hiliteText('[x-y]'),
            this.hiliteText(']x-y['),
          ]),
          text4: this.getText('MRI_PA_RANGE_CONSTRAINT_HELP_NEGATIVE', this.hiliteText('(-x)')),
        }
      } else {
        dialogContent = {
          header: '',
          title: '',
          text1: '',
          text2: '',
          text3: '',
          text4: '',
        }
      }

      return dialogContent
    },
  },
  methods: {
    hiliteText(text: string) {
      return `<span class='MriPaHelpTextHighlight'>${text}</span>`
    },
    getTarget() {
      return this.$refs.helpDialog
    },
  },
  components: {
    appIcon,
    popover,
  },
}
</script>
