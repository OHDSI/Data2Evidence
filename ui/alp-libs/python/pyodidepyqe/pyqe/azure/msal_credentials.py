import msal


class _MsalCredentials():
    """Provide common functions used for MSAL credentials"""

    def __init__(self, client_id, **kwargs):
        self._client_id = client_id
        self._authority = kwargs.pop('authority', None)
        self._timeout = kwargs.pop('timeout', None)
        self._msal_app = None

    def _get_app(self) -> msal.PublicClientApplication:
        if not self._msal_app:
            self._msal_app = msal.PublicClientApplication(
                client_id=self._client_id,
                authority=self._authority,
                timeout=self._timeout
            )

        return self._msal_app

    def _handle_error(self, result, error_prefix):
        if result.get('error') == 'authorization_pending':
            message = 'Timed out waiting for user to authenticate'
        else:
            error = result.get('error_description') or result.get('error')
            message = f'{error_prefix}: {error}'
        raise RuntimeError(message)
