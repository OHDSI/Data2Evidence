<script setup lang="ts">
import { ref } from "vue";
import D2eDialog from "./D2eDialog.vue";
import D2eButton from "./D2eButton.vue";
import D2eTextField from "./D2eTextField.vue";

const open = ref(true);
const renameOpen = ref(true);
const deleteOpen = ref(true);
const materializeOpen = ref(true);
const busyOpen = ref(true);
const persistentOpen = ref(true);
const name = ref("SNRI Users");
const description = ref("");
</script>

<template>
  <Story title="D2eDialog" group="components">
    <Variant title="default">
      <D2eDialog v-model="open" title="Dialog title">
        Dialog body content.
        <template #actions>
          <D2eButton variant="secondary"> Cancel </D2eButton>
          <D2eButton> Confirm </D2eButton>
        </template>
      </D2eDialog>
    </Variant>

    <Variant title="rename dialog (#3122)">
      <D2eDialog v-model="renameOpen" title="Rename exploration name">
        <D2eTextField
          v-model="name"
          label="Exploration name"
          required
          autofocus
        />
        <template #actions>
          <D2eButton variant="secondary"> Cancel </D2eButton>
          <D2eButton> Rename </D2eButton>
        </template>
      </D2eDialog>
    </Variant>

    <Variant title="delete dialog (#3124)">
      <D2eDialog v-model="deleteOpen" title="Delete filter?">
        Deleting this saved filter will delete any access point that you
        generated for it. This action cannot be undone.
        <template #actions>
          <D2eButton variant="secondary"> Cancel </D2eButton>
          <D2eButton variant="danger"> Yes, delete </D2eButton>
        </template>
      </D2eDialog>
    </Variant>

    <Variant title="materialize dialog (#3118)">
      <D2eDialog v-model="materializeOpen" title="Materialize cohort">
        <D2eTextField
          v-model="description"
          label="Cohort materialization description"
        />
        <template #actions>
          <D2eButton variant="secondary"> Cancel </D2eButton>
          <D2eButton> Materialize </D2eButton>
        </template>
      </D2eDialog>
    </Variant>

    <Variant title="busy">
      <D2eDialog v-model="busyOpen" title="Saving" busy>
        The dialog blocks every close path while busy.
        <template #actions>
          <D2eButton variant="secondary" disabled> Cancel </D2eButton>
          <D2eButton loading> Save </D2eButton>
        </template>
      </D2eDialog>
    </Variant>

    <Variant title="persistent (no scrim close)">
      <D2eDialog v-model="persistentOpen" title="Persistent" persistent>
        The scrim and Escape do not close this dialog.
        <template #actions>
          <D2eButton variant="secondary"> Cancel </D2eButton>
          <D2eButton> Confirm </D2eButton>
        </template>
      </D2eDialog>
    </Variant>
  </Story>
</template>
