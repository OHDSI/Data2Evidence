import os
from typing import Any, Union
from enterprise_gateway.services.kernels.remotemanager import RemoteMappingKernelManager


class CustomKernelManager(RemoteMappingKernelManager):
    async def start_kernel(self, **kwargs: Union[dict[str, Any], None]):
        env = kwargs.get("env", {})
        username = env.get("KERNEL_USERNAME", "unknown")
        env["TREX__ENDPOINT_URL"] = os.getenv("TREX__ENDPOINT_URL", "")
        kwargs["env"] = env

        kernel_id = await super().start_kernel(**kwargs)
        self._kernels[kernel_id].username = username
        return kernel_id

    def list_kernels(self):
        kernels = super().list_kernels()
        for k in kernels:
            kernel_obj = self.get_kernel(k['id'])
            k['username'] = getattr(kernel_obj, 'username', 'unknown')
        return kernels
