<script setup lang="ts">
import { usePortalPropsStore} from './stores/portalProps'

const portalProps = usePortalPropsStore();
</script>

<template>
  <div>Wizards (Vue): datasetId = {{ portalProps.props.datasetId }}</div>
</template>
