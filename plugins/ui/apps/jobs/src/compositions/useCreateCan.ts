import { Can, createCan, workspacePermissions } from '@prefecthq/prefect-ui-library'
import { useSubscription } from '@prefecthq/vue-compositions'
import { computed, Ref, ref } from 'vue'
import { uiSettings } from '@/api/uiSettings'
import { Permission } from '@/utils/permissions'

type UseCreateCan = {
  can: Can<Permission>
  pending: Ref<boolean>
}

export function useCreateCan(): UseCreateCan {
  const flagsSubscription = useSubscription(uiSettings.getFeatureFlags, [])

  const permissions = computed<Permission[]>(() => [
    ...workspacePermissions,
    ...(flagsSubscription.response ?? [])
  ])

  const can = createCan(permissions)
  //   const pending = computed(() => flagsSubscription.loading)
  const pending = ref(true)

  return {
    can,
    pending
  }
}
