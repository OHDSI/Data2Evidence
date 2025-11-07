import { Can, inject } from '@prefecthq/prefect-ui-library'
import { Permission, canKey } from '@/utils/permissions'

export function useCan(): Can<Permission> {
  return inject(canKey)
}
