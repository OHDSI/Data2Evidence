import pytest
from unittest.mock import Mock, patch, MagicMock
import requests

from _shared_flow_utils.api.PortalUserArtifactAPI import PortalUserArtifactAPI


@pytest.fixture
def mock_prefect_dependencies():
    """Mock Prefect Variable and Secret dependencies for BaseAPI"""
    with patch('_shared_flow_utils.api.BaseAPI.Variable') as mock_var, \
         patch('_shared_flow_utils.api.BaseAPI.Secret') as mock_secret:

        # Configure Variable.get() to return expected values
        def variable_get_side_effect(key):
            values = {
                'python_verify_ssl': 'false',
                'is_dev_env': True,
                'service_routes': {
                    'portalServer': 'http://portal-server.local'
                }
            }
            return values.get(key)

        mock_var.get.side_effect = variable_get_side_effect

        # Configure Secret.load() for TLS cert
        mock_secret_instance = MagicMock()
        mock_secret.load.return_value = mock_secret_instance

        yield {
            'variable': mock_var,
            'secret': mock_secret
        }


@pytest.fixture
def api_client(mock_prefect_dependencies):
    """Create PortalUserArtifactAPI instance with mocked dependencies"""
    return PortalUserArtifactAPI()


class TestPortalUserArtifactAPIInit:
    """Test initialization and URL construction"""

    def test_init_constructs_correct_url(self, api_client):
        """Test that URL is constructed correctly with trailing slash handling"""
        # get_service_route returns 'http://portal-server.local/'
        # Should result in 'http://portal-server.local/system-portal/user-artifact'
        assert api_client.url == 'http://portal-server.local/'
        assert api_client.user_artifact_url == 'http://portal-server.local/system-portal/user-artifact'
        # Ensure no double slashes
        assert '//' not in api_client.user_artifact_url.replace('http://', '')


class TestPatchArtifact:
    """Test patch_artifact method"""

    def test_patch_artifact_success(self, api_client):
        """Test successful artifact patch request"""
        # Arrange
        service_name = 'concept_sets'
        artifact_id = 123
        update_data = {'shared': True}
        expected_response = {
            'id': 123,
            'name': 'Test Concept Set',
            'shared': True
        }

        with patch('requests.patch') as mock_patch:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = expected_response
            mock_patch.return_value = mock_response

            # Act
            result = api_client.patch_artifact(service_name, artifact_id, update_data)

            # Assert
            assert result == expected_response
            mock_patch.assert_called_once_with(
                'http://portal-server.local/system-portal/user-artifact/concept_sets/123',
                headers=api_client.headers,
                verify=False,
                json=update_data
            )

    def test_patch_artifact_404_error(self, api_client):
        """Test patch_artifact handles 404 Not Found error"""
        # Arrange
        service_name = 'concept_sets'
        artifact_id = 999
        update_data = {'shared': True}

        with patch('requests.patch') as mock_patch:
            mock_response = Mock()
            mock_response.status_code = 404
            mock_response.text = 'Artifact not found'
            mock_patch.return_value = mock_response

            # Act & Assert
            with pytest.raises(Exception) as exc_info:
                api_client.patch_artifact(service_name, artifact_id, update_data)

            assert '[404]' in str(exc_info.value)
            assert 'concept_sets/999' in str(exc_info.value)
            assert 'Artifact not found' in str(exc_info.value)

    def test_patch_artifact_500_error(self, api_client):
        """Test patch_artifact handles 500 Internal Server Error"""
        # Arrange
        service_name = 'bookmarks'
        artifact_id = 456
        update_data = {'shared': False}

        with patch('requests.patch') as mock_patch:
            mock_response = Mock()
            mock_response.status_code = 500
            mock_response.text = 'Internal server error'
            mock_patch.return_value = mock_response

            # Act & Assert
            with pytest.raises(Exception) as exc_info:
                api_client.patch_artifact(service_name, artifact_id, update_data)

            assert '[500]' in str(exc_info.value)
            assert 'bookmarks/456' in str(exc_info.value)
            assert 'Internal server error' in str(exc_info.value)

    def test_patch_artifact_with_string_id(self, api_client):
        """Test patch_artifact accepts string artifact IDs"""
        # Arrange
        service_name = 'concept_sets'
        artifact_id = '789'  # String ID
        update_data = {'shared': True}
        expected_response = {'id': '789', 'shared': True}

        with patch('requests.patch') as mock_patch:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = expected_response
            mock_patch.return_value = mock_response

            # Act
            result = api_client.patch_artifact(service_name, artifact_id, update_data)

            # Assert
            assert result == expected_response
            # Verify URL includes string ID correctly
            called_url = mock_patch.call_args[0][0]
            assert '/789' in called_url

    def test_patch_artifact_with_integer_id(self, api_client):
        """Test patch_artifact accepts integer artifact IDs"""
        # Arrange
        service_name = 'bookmarks'
        artifact_id = 101  # Integer ID
        update_data = {'shared': False}
        expected_response = {'id': 101, 'shared': False}

        with patch('requests.patch') as mock_patch:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = expected_response
            mock_patch.return_value = mock_response

            # Act
            result = api_client.patch_artifact(service_name, artifact_id, update_data)

            # Assert
            assert result == expected_response
            # Verify URL includes integer ID correctly
            called_url = mock_patch.call_args[0][0]
            assert '/101' in called_url


class TestShareArtifact:
    """Test share_artifact convenience method"""

    def test_share_artifact_delegates_to_patch_with_shared_true(self, api_client):
        """Test share_artifact calls patch_artifact with shared=True"""
        # Arrange
        service_name = 'concept_sets'
        artifact_id = 555
        expected_response = {'id': 555, 'shared': True}

        with patch.object(api_client, 'patch_artifact', return_value=expected_response) as mock_patch:
            # Act
            result = api_client.share_artifact(service_name, artifact_id, shared=True)

            # Assert
            assert result == expected_response
            mock_patch.assert_called_once_with(service_name, artifact_id, {'shared': True})

    def test_share_artifact_delegates_to_patch_with_shared_false(self, api_client):
        """Test share_artifact calls patch_artifact with shared=False"""
        # Arrange
        service_name = 'bookmarks'
        artifact_id = 666
        expected_response = {'id': 666, 'shared': False}

        with patch.object(api_client, 'patch_artifact', return_value=expected_response) as mock_patch:
            # Act
            result = api_client.share_artifact(service_name, artifact_id, shared=False)

            # Assert
            assert result == expected_response
            mock_patch.assert_called_once_with(service_name, artifact_id, {'shared': False})

    def test_share_artifact_default_shared_true(self, api_client):
        """Test share_artifact defaults to shared=True when not specified"""
        # Arrange
        service_name = 'concept_sets'
        artifact_id = 777
        expected_response = {'id': 777, 'shared': True}

        with patch.object(api_client, 'patch_artifact', return_value=expected_response) as mock_patch:
            # Act - not passing shared parameter
            result = api_client.share_artifact(service_name, artifact_id)

            # Assert
            assert result == expected_response
            mock_patch.assert_called_once_with(service_name, artifact_id, {'shared': True})

    def test_share_artifact_with_string_id(self, api_client):
        """Test share_artifact handles string artifact IDs"""
        # Arrange
        service_name = 'bookmarks'
        artifact_id = 'abc-123'
        expected_response = {'id': 'abc-123', 'shared': True}

        with patch.object(api_client, 'patch_artifact', return_value=expected_response) as mock_patch:
            # Act
            result = api_client.share_artifact(service_name, artifact_id)

            # Assert
            assert result == expected_response
            mock_patch.assert_called_once_with(service_name, artifact_id, {'shared': True})

    def test_share_artifact_propagates_exceptions(self, api_client):
        """Test share_artifact propagates exceptions from patch_artifact"""
        # Arrange
        service_name = 'concept_sets'
        artifact_id = 888
        error_message = '[404] Artifact not found'

        with patch.object(api_client, 'patch_artifact', side_effect=Exception(error_message)):
            # Act & Assert
            with pytest.raises(Exception) as exc_info:
                api_client.share_artifact(service_name, artifact_id)

            assert error_message in str(exc_info.value)
