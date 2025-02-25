<template>
  <div :class="pagerEnabled ? '' : 'pager-disabled'" style="padding-top: 20px">
    <div :class="v2 ? 'v2-pager-container' : 'pager-container'" v-if="pagerEnabled">
      <button v-if="!v2" :title="getText('MRI_PA_PAGER_FIRST_PAGE')" :class="pagerNavClass('ll')" @click="goPage(1)">
        <span>&nbsp;</span>
      </button>
      <button :title="getText('MRI_PA_PAGER_PREV_PAGE')" :class="pagerNavClass('l')" @click="goPage(currentPage - 1)">
        <span>{{ v2 ? getText('MRI_PA_PAGER_PREVIOUS') : '&nbsp;' }}</span>
      </button>
      <template v-for="page in visiblePages" :key="page">
        <button @click="goPage(page)" :class="['page-button', currentPage === page ? 'current-page-button' : '']">
          <span>{{ page }}</span>
        </button>
      </template>
      <button :title="getText('MRI_PA_PAGER_NEXT_PAGE')" :class="pagerNavClass('r')" @click="goPage(currentPage + 1)">
        <span>{{ v2 ? getText('MRI_PA_PAGER_NEXT') : '&nbsp;' }}</span>
      </button>
      <button
        v-if="!v2"
        :title="getText('MRI_PA_PAGER_LAST_PAGE')"
        :class="pagerNavClass('rr')"
        @click="goPage(totalPages)"
      >
        <span>&nbsp;</span>
      </button>
    </div>
  </div>
</template>
<script lang="ts">
import { mapGetters } from 'vuex'
import appButton from '../lib/ui/app-button.vue'

export default {
  name: 'pager',
  props: {
    currentPage: {
      type: Number,
      default: 1,
    },
    rowCount: {
      type: Number,
      default: 1,
    },
    pageSize: {
      type: Number,
      default: 20,
    },
    v2: Boolean,
  },
  computed: {
    ...mapGetters(['getText']),
    totalPages() {
      return Math.ceil(this.rowCount / this.pageSize)
    },
    pagerEnabled() {
      return this.totalPages > 1
    },
    visiblePages() {
      const tpages = this.totalPages
      const visible = Math.min(tpages, 5)

      if (tpages === 0) {
        return []
      }

      function calcPages(start) {
        const newStart = Math.max(start, 1)
        const end = Math.min(newStart + visible - 1, tpages)

        const list = []
        for (let i = newStart; i <= end; i++) {
          list.push(i)
        }
        return list
      }

      return calcPages(this.currentPage - Math.floor(visible / 2))
    },
  },
  methods: {
    goPage(page) {
      let returnpage = page || 1
      returnpage = returnpage > this.totalPages ? this.totalPages : returnpage
      this.$emit('goPage', returnpage)
    },
    pagerNavClass(action) {
      const classList = ['pager-nav']
      classList.push(`pager-${action}`)

      if (action.indexOf('l') > -1 && this.currentPage === 1) {
        classList.push('pager-disabled')
      }

      if (action.indexOf('r') > -1 && this.currentPage === this.totalPages) {
        classList.push('pager-disabled')
      }

      return classList
    },
  },
  components: {
    appButton,
  },
}
</script>
