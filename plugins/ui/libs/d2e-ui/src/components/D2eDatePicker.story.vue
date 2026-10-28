<script setup lang="ts">
import { ref } from "vue";
import D2eDatePicker from "./D2eDatePicker.vue";

const empty = ref<Date | null>(null);
const withValue = ref<Date | null>(new Date(2026, 9, 12));
const small = ref<Date | null>(new Date(2026, 9, 12));
const prepend = ref<Date | null>(new Date(2026, 9, 12));
const disabled = ref<Date | null>(new Date(2026, 9, 12));
const minMax = ref<Date | null>(null);
const dateTime = ref<Date | null>(new Date(2026, 9, 12, 14, 30, 0));
const withError = ref<Date | null>(new Date(2026, 9, 12));
const from = ref<Date | null>(null);
const to = ref<Date | null>(null);
</script>

<template>
  <Story title="D2eDatePicker" group="components">
    <Variant title="empty">
      <D2eDatePicker
        v-model="empty"
        label="Date of birth"
        style="width: 280px"
      />
    </Variant>

    <Variant title="with value">
      <D2eDatePicker
        v-model="withValue"
        label="Date of birth"
        style="width: 280px"
      />
    </Variant>

    <Variant title="small">
      <D2eDatePicker
        v-model="small"
        label="Date of birth"
        size="sm"
        style="width: 280px"
      />
    </Variant>

    <Variant title="prepend icon">
      <D2eDatePicker
        v-model="prepend"
        label="Start date"
        icon-position="prepend"
        style="width: 280px"
      />
    </Variant>

    <Variant title="day/month/year format">
      <D2eDatePicker
        v-model="withValue"
        label="Date of birth"
        format="DD/MM/YYYY"
        style="width: 280px"
      />
    </Variant>

    <Variant title="date and time">
      <D2eDatePicker
        v-model="dateTime"
        label="Start"
        format="YYYY-MM-DD HH:mm:ss"
        style="width: 280px"
      />
    </Variant>

    <Variant title="disabled">
      <D2eDatePicker
        v-model="disabled"
        label="Date of birth"
        disabled
        style="width: 280px"
      />
    </Variant>

    <Variant title="error from the caller">
      <D2eDatePicker
        v-model="withError"
        label="Date of birth"
        error-messages="The end date is before the start date"
        style="width: 280px"
      />
    </Variant>

    <Variant title="with min and max">
      <D2eDatePicker
        v-model="minMax"
        label="Date in 2026"
        :min="new Date(2026, 0, 1)"
        :max="new Date(2026, 11, 31)"
        style="width: 280px"
      />
    </Variant>

    <Variant title="From / To pair">
      <div style="display: flex; gap: 16px">
        <D2eDatePicker
          v-model="from"
          label="From"
          clearable
          :max="to"
          style="width: 200px"
        />
        <D2eDatePicker
          v-model="to"
          label="To"
          clearable
          :min="from"
          style="width: 200px"
        />
      </div>
    </Variant>
  </Story>
</template>
