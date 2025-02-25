<template>
  <div class="axis-menu-button-wrapper kmInteractionList-wrapper kmControlComponent">
    <div class="buttonWrapper">
      <button
        class="kmInteractionButton"
        v-on:click="toggleListView"
        :title="getText('MRI_PA_KAPLAN_VIEW_INTERACTIONS_LIST_TOOLTIP')"
      >
        {{ getText('MRI_PA_KAPLAN_VIEW_INTERACTIONS_LIST_BUTTON') }}
      </button>
    </div>
    <dialogBox
      v-if="showInteractionListDialog"
      @close="toggleListView"
      :position="dialogPosition"
      :arrow="'arrowUp'"
      :arrowPosition="arrowPosition"
    >
      <template v-slot:header>
        <span class="interactionListHeader">{{ getText('MRI_PA_KAPLAN_INTERACTIONS_LIST') }}</span>
      </template>
      <template v-slot:body>
        <div class="interactionListContent">
          <ul class="censoringInteractionList">
            <template v-for="interaction in interactionList" :key="interaction.name">
              <li class="censoringInteractionListitem">
                <div class="censoringInteractionListText">{{ interaction.name }}</div>
              </li>
            </template>
          </ul>
        </div>
      </template>
    </dialogBox>
  </div>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'
import DialogBox from './DialogBox.vue'

export default {
  name: 'kmInteractionList',
  props: ['censoringInteractions'],
  data() {
    return {
      showInteractionListDialog: false,
      dialogPosition: {},
      arrowPosition: {},
    }
  },
  computed: {
    ...mapGetters(['getText', 'getKMSeries']),
    interactionList() {
      if (this.getKMSeries && this.getKMSeries.length > 0) {
        return this.getKMSeries[0].censoringInteractions
      }

      return []
    },
  },
  methods: {
    toggleListView() {
      if (this.censoringInteractions && this.censoringInteractions.length === 0) {
        this.showInteractionListDialog = !this.showInteractionListDialog
      }

      if (this.showInteractionListDialog) {
        const bottomPosition = 0
        const leftPost = this.$el.getBoundingClientRect().left
        const topPost = this.$el.getBoundingClientRect().bottom + 10
        const arrowPosition = this.$el.getBoundingClientRect().top

        this.dialogPosition = {
          left: `${leftPost}px`,
          top: `${topPost}px`,
        }
        this.arrowPosition = {
          bottom: `${arrowPosition}px`,
          left: '25%',
        }
      }
    },
  },
  components: {
    DialogBox,
  },
}
</script>
