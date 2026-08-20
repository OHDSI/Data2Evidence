# D2eButton

Vuetify button wrapper with the D2E palette and type ramp.

```vue
<D2eButton variant="danger" @click="onDelete">Yes, delete</D2eButton>
```

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'ghost'` | `'primary'` | Maps to Vuetify variant/color |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Maps to Vuetify size |
| `loading` | `boolean` | `false` | Passed to Vuetify |
| `disabled` | `boolean` | `false` | Passed to Vuetify |
| `block` | `boolean` | `false` | Full-width button for equal-width footers |
| `icon` | `string` | `undefined` | MDI icon name passed to Vuetify |

## Events

Inherits Vuetify `v-btn` click behavior; emits native `click`.

## Slots

| Slot | Notes |
| --- | --- |
| default | Button label |
