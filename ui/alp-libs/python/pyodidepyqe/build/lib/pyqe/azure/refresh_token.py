from pyqe.azure.msal_credentials import _MsalCredentials


class _RefreshToken(_MsalCredentials):
    """Retrieve token via refresh token"""

    def __init__(self, client_id, **kwargs):
        super(_RefreshToken, self).__init__(client_id=client_id, **kwargs)

    def get_token(self, refresh_token: str, scopes: list, **kwargs):
        app = self._get_app()
        result = app.acquire_token_by_refresh_token(refresh_token, scopes)

        if 'id_token' not in result:
            error = result.get('error_description') or result.get('error')
            message = f'Refresh token failed: {error}'
            raise RuntimeError(message)

        return result
