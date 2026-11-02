<script setup lang="ts">
import { ref } from "vue";
import D2eDateTimePicker from "./D2eDateTimePicker.vue";

const empty = ref<Date | null>(null);
const withValue = ref<Date | null>(new Date(2026, 9, 12, 15, 30));
const offStep = ref<Date | null>(new Date(2026, 9, 12, 14, 32));
const small = ref<Date | null>(new Date(2026, 9, 12, 15, 30));
const disabled = ref<Date | null>(new Date(2026, 9, 12, 15, 30));
const withError = ref<Date | null>(new Date(2026, 9, 12, 15, 30));
const from = ref<Date | null>(null);
const to = ref<Date | null>(null);
</script>

<template>
  <Story title="D2eDateTimePicker" group="components">
    <Variant title="empty">
      <D2eDateTimePicker
        v-model="empty"
        label="Appointment"
        style="width: 280px"
      />
    </Variant>

    <Variant title="with value">
      <D2eDateTimePicker
        v-model="withValue"
        label="Appointment"
        format="MM/DD/YYYY HH:mm"
        style="width: 280px"
      />
    </Variant>

    <Variant title="minute that is not a step">
      <D2eDateTimePicker
        v-model="offStep"
        label="Appointment"
        style="width: 280px"
      />
    </Variant>

    <Variant title="small">
      <D2eDateTimePicker
        v-model="small"
        label="Appointment"
        size="sm"
        style="width: 280px"
      />
    </Variant>

    <Variant title="disabled">
      <D2eDateTimePicker
        v-model="disabled"
        label="Appointment"
        disabled
        style="width: 280px"
      />
    </Variant>

    <Variant title="error from the caller">
      <D2eDateTimePicker
        v-model="withError"
        label="Appointment"
        error-messages="The end is before the start"
        style="width: 280px"
      />
    </Variant>

    <Variant title="From / To pair">
      <div style="display: flex; gap: 16px">
        <D2eDateTimePicker
          v-model="from"
          label="From"
          clearable
          style="width: 220px"
        />
        <D2eDateTimePicker
          v-model="to"
          label="To"
          clearable
          style="width: 220px"
        />
      </div>
    </Variant>
  </Story>
</template>
