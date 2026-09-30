<template>
  <footer class="ds-footer">
    <span
      class="ds-footer__version"
      data-testid="footer-version"
    >Data2Evidence {{ version }}</span>
    <nav class="ds-footer__links">
      <template
        v-for="(link, i) in LINKS"
        :key="link.label"
      >
        <span
          v-if="i > 0"
          class="ds-footer__sep"
          aria-hidden="true"
        >•</span>
        <a
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          :data-testid="`footer-link-${link.label.toLowerCase()}`"
        >{{ link.label }}</a>
      </template>
    </nav>
  </footer>
</template>

<script setup lang="ts">
// D2E product version shown in the footer. No public config endpoint exposes
// it yet, so it's a prop with a sensible default — wire it to a real source
// (build define / config endpoint) when one exists.
withDefaults(defineProps<{ version?: string }>(), { version: 'v0.19' })

const LINKS = [
  { label: 'Documentation', url: 'https://data2evidence.org/docs/getting_started/' },
  { label: 'Slack', url: 'https://data2evidence.slack.com/ssb/redirect' },
  { label: 'Github', url: 'https://github.com/OHDSI/Data2Evidence' },
]
</script>

<style scoped>
.ds-footer {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  width: 100%;
  min-height: 56px;
  padding: 16px 32px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  color: #595757;
}
.ds-footer__links {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ds-footer__sep {
  color: #acaba8;
  font-size: 18px;
  line-height: 1;
}
.ds-footer__links a {
  color: #595757;
  text-decoration: none;
}
.ds-footer__links a:hover {
  color: #000080;
  text-decoration: underline;
}
</style>
