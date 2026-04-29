import sys
import json
import logging
import os
import getpass
# import requests
import pyodide.http
from typing import Optional
from pyqe.azure.msal_credentials import _MsalCredentials


class _PasswordCredential(_MsalCredentials):
    """Authenticate users through the password grant flow"""

    def __init__(self, client_id, username, **kwargs):
        self._username = username
        super(_PasswordCredential, self).__init__(client_id=client_id, **kwargs)

    def get_token(self, scopes: list, **kwargs):
        app = self._get_app()
        result = None

        # Check the cache to see if this end user has signed in before
        accounts = app.get_accounts(self._username)
        if accounts:
            result = app.acquire_token_silent(scopes, account=accounts[0])

        if not result:
            result = app.acquire_token_by_username_password(
                self._username,
                getpass.getpass(),
                scopes)

        if "id_token" not in result:
            self._handle_error(result, "Authentication failed")

        return result
