# D2eDialog

Modal dialog with a titled header, optional close button, body slot and
equal-width action buttons.

```vue
<D2eDialog v-model="open" title="Rename exploration name">
  <D2eTextField v-model="name" label="Exploration name" required />
  <template #actions>
    <D2eButton variant="secondary">Cancel</D2eButton>
    <D2eButton>Rename</D2eButton>
  </template>
</D2eDialog>
```

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `modelValue` | `boolean` | required | `v-model` |
| `title` | `string` | `undefined` | Header title; drives `aria-labelledby` |
| `maxWidth` | `number \| string` | `600` | Dialog max width |
| `persistent` | `boolean` | `false` | Blocks scrim/Escape close |
| `showClose` | `boolean` | `true` | Shows the header close button |
| `closeLabel` | `string` | `'Close dialog'` | Accessible name of the close button |
| `busy` | `boolean` | `false` | Shows a spinner overlay and blocks every close path |
| `attach` | `string \| boolean` | `'#app'` | Vuetify overlay attach target |

## Events

| Event | Payload | Notes |
| --- | --- | --- |
| `update:modelValue` | `boolean` | Fires on every open/close path unless busy |
| `close` | — | Fires on scrim, Escape and close-button closes |

## Slots

| Slot | Notes |
| --- | --- |
| default | Dialog body |
| `actions` | Footer; rendered with a divider above it |
