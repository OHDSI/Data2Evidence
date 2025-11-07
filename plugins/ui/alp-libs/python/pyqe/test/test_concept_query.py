import pytest
from pyqe.api.concept_query import ConceptQuery, ConceptSet, Concept
from pyqe.types.enum_types import Domain
from test.mock_object import MockResponse


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv('PYQE_URL', 'http://pyqe.url')
    monkeypatch.setenv('PYQE_TLS_CLIENT_CA_CERT_PATH', 'empty')
    monkeypatch.setattr(ConceptQuery, '_get', get_mock_response)


def test_get_standard_id(setup):
    # When
    concept_id_list = ConceptQuery().get_standard_concept_ids('12345', 'vocabulary_id')
    concept_id = concept_id_list[0]

    # Then
    assert concept_id['conceptId'] == 'standard-concept-id'
    assert concept_id['conceptCode'] == 'standard-concept-code'
    assert concept_id['conceptName'] == 'standard-concept-name'
    assert concept_id['domainId'] == 'standard-domain-id'
    assert concept_id['vocabularyId'] == 'standard-vocabulary-id'

# TODO test_get_standard_id_without_vocab


def test_get_standard_id_without_vocab_id(setup):
    # When
    concept_id_list = ConceptQuery().get_standard_concept_ids('12345')
    concept_id1 = concept_id_list[0]
    concept_id2 = concept_id_list[1]

    # Then
    assert concept_id1['conceptId'] == 'standard-concept-id1'
    assert concept_id1['conceptCode'] == 'standard-concept-code1'
    assert concept_id1['conceptName'] == 'standard-concept-name1'
    assert concept_id1['domainId'] == 'standard-domain-id1'
    assert concept_id1['vocabularyId'] == 'standard-vocabulary-id1'

    assert concept_id2['conceptId'] == 'standard-concept-id2'
    assert concept_id2['conceptCode'] == 'standard-concept-code2'
    assert concept_id2['conceptName'] == 'standard-concept-name2'
    assert concept_id2['domainId'] == 'standard-domain-id2'
    assert concept_id2['vocabularyId'] == 'standard-vocabulary-id2'


def test_get_descendant_codes(setup):

    # When
    concept_ids = ConceptQuery().get_descendant_concept_ids('12345')

    # Then
    assert len(concept_ids) == 2
    assert concept_ids[0] == 'descendant-concept-id1'
    assert concept_ids[1] == 'descendant-concept-id2'


def test_init_concept_set_with_concept_id():
    # When
    concept_set = ConceptSet('name', Domain.UNIT, ['id'])

    # Then
    assert concept_set.name == 'name'
    assert concept_set.domain == Domain.UNIT
    assert concept_set.concept_ids == ['id']


def test_init_concept_set_with_concept_with_descendant_code(setup):
    # When
    concept_set = ConceptSet('name', Domain.UNIT, concepts=[Concept('12345')])

    # Then
    assert concept_set.name == 'name'
    assert concept_set.domain == Domain.UNIT
    assert len(concept_set.concept_ids) == 3
    assert concept_set.concept_ids[0] == '12345'
    assert 'descendant-concept-id1' in concept_set.concept_ids
    assert 'descendant-concept-id2' in concept_set.concept_ids


def test_init_concept_set_with_concept_with_concept_code_and_descendant_code(setup):
    # When
    concept_set = ConceptSet('name', Domain.UNIT, ['code'], [Concept('12345')])

    # Then
    assert concept_set.name == 'name'
    assert concept_set.domain == Domain.UNIT
    assert len(concept_set.concept_ids) == 4
    assert concept_set.concept_ids[0] == 'code'
    assert concept_set.concept_ids[1] == '12345'
    assert 'descendant-concept-id1' in concept_set.concept_ids
    assert 'descendant-concept-id2' in concept_set.concept_ids


def test_add_concept_id_in_concept_set(setup):
    # Given
    concept_set = ConceptSet('name', Domain.VALUE_AS)

    # When
    concept_set.add_concept_id('added-code')

    # Then
    assert concept_set.name == 'name'
    assert concept_set.domain == Domain.VALUE_AS
    assert concept_set.concept_ids == ['added-code']


def test_raise_value_error_when_excluded_concept_code_is_added_in_concept_set(setup):
    # Given
    concept_set = ConceptSet('name', Domain.VALUE_AS)
    concept_set.exclude_concept_id('concept-id-A')

    # When & Then
    with pytest.raises(ValueError) as e:
        concept_set.add_concept_id('concept-id-A')


def test_add_concept_in_concept_set(setup):
    # Given
    concept_set = ConceptSet('name', Domain.VALUE_AS)

    # When
    concept_set.add_concept(Concept('12345'))

    # Then
    assert concept_set.name == 'name'
    assert concept_set.domain == Domain.VALUE_AS
    assert len(concept_set.concept_ids) == 3
    assert concept_set.concept_ids[0] == '12345'
    assert 'descendant-concept-id1' in concept_set.concept_ids
    assert 'descendant-concept-id2' in concept_set.concept_ids


def test_not_add_excluded_concept_code_when_concept_is_added_in_concept_set(setup):
    # Given
    concept_set = ConceptSet('name', Domain.VALUE_AS)
    concept_set.exclude_concept_id('descendant-concept-id2')

    # When
    concept_set.add_concept(Concept('12345'))

    # Then
    assert concept_set.name == 'name'
    assert concept_set.domain == Domain.VALUE_AS
    assert len(concept_set.concept_ids) == 2
    assert concept_set.concept_ids[0] == '12345'
    assert 'descendant-concept-id1' in concept_set.concept_ids
    assert 'descendant-concept-id2' not in concept_set.concept_ids
    assert len(concept_set.excluded_concept_ids) == 1
    assert 'descendant-concept-id2' in concept_set.excluded_concept_ids


def test_exclude_concept_id_in_concept_set(setup):
    # Given
    concept_set = ConceptSet('name', Domain.VALUE_AS)

    # When
    concept_set.exclude_concept_id('excluded-id')

    # Then
    assert concept_set.name == 'name'
    assert concept_set.domain == Domain.VALUE_AS
    assert concept_set.concept_ids == []
    assert concept_set.excluded_concept_ids == ['excluded-id']


def test_remove_added_id_when_it_is_excluded_in_concept_set(setup):
    # Given
    concept_set = ConceptSet('name', Domain.VALUE_AS, ['concept-id-A', 'concept-id-B'])

    # When
    concept_set.exclude_concept_id('concept-id-A')

    # Then
    assert concept_set.name == 'name'
    assert concept_set.domain == Domain.VALUE_AS
    assert concept_set.concept_ids == ['concept-id-B']
    assert concept_set.excluded_concept_ids == ['concept-id-A']


def test_exclude_concept_id_in_concept_set(setup):
    # Given
    concept_set = ConceptSet('name', Domain.VALUE_AS)

    # When
    concept_set.exclude_concept_ids(['excluded-id-1', 'excluded-id-2'])

    # Then
    assert concept_set.name == 'name'
    assert concept_set.domain == Domain.VALUE_AS
    assert concept_set.concept_ids == []
    assert len(concept_set.excluded_concept_ids) == 2
    assert 'excluded-id-1' in concept_set.excluded_concept_ids
    assert 'excluded-id-2' in concept_set.excluded_concept_ids


def test_remove_added_ids_when_they_are_excluded_in_concept_set(setup):
    # Given
    concept_set = ConceptSet('name', Domain.VALUE_AS, [
                             'concept-id-B', 'concept-id-C', 'concept-id-A'])

    # When
    concept_set.exclude_concept_ids(['concept-id-A', 'concept-id-B'])

    # Then
    assert concept_set.name == 'name'
    assert concept_set.domain == Domain.VALUE_AS
    assert concept_set.concept_ids == ['concept-id-C']
    assert len(concept_set.excluded_concept_ids) == 2
    assert 'concept-id-A' in concept_set.excluded_concept_ids
    assert 'concept-id-B' in concept_set.excluded_concept_ids


def test_init_concept():
    # When
    concept = Concept('concept_id')

    # Then
    assert concept.concept_id == 'concept_id'
    assert concept.include_descendants == True


def test_init_concept_without_including_descendants():
    # When
    concept = Concept('concept_id', include_descendants=False)

    # Then
    assert concept.concept_id == 'concept_id'
    assert concept.include_descendants == False


def get_mock_response(auth_api, path, params):
    if path == '/analytics-svc/api/services/standard-concept-ids' and \
            params == {'conceptCode': '12345', 'vocabularyId': 'vocabulary_id'}:
        standard_concept_payload = {
            'concept_id': [
                {'conceptId': 'standard-concept-id',
                 'conceptCode': 'standard-concept-code',
                 'conceptName': 'standard-concept-name',
                 'domainId': 'standard-domain-id',
                 'vocabularyId': 'standard-vocabulary-id'}
            ]
        }
        return MockResponse(200, standard_concept_payload)
    elif path == '/analytics-svc/api/services/standard-concept-ids' and \
            params == {'conceptCode': '12345', 'vocabularyId': None}:
        standard_concept_payload = {
            'concept_id': [
                {'conceptId': 'standard-concept-id1',
                 'conceptCode': 'standard-concept-code1',
                 'conceptName': 'standard-concept-name1',
                 'domainId': 'standard-domain-id1',
                 'vocabularyId': 'standard-vocabulary-id1'},
                {'conceptId': 'standard-concept-id2',
                 'conceptCode': 'standard-concept-code2',
                 'conceptName': 'standard-concept-name2',
                 'domainId': 'standard-domain-id2',
                 'vocabularyId': 'standard-vocabulary-id2'}
            ]
        }
        return MockResponse(200, standard_concept_payload)
    elif path == '/analytics-svc/api/services/descendant-concepts' and \
            params == {'conceptId': '12345'}:
        descendant_concepts_payload = {
            'descendants': [
                {
                    'conceptId': 'descendant-concept-id1'
                }, {
                    'conceptId': 'descendant-concept-id2'
                }
            ]
        }
        return MockResponse(200, descendant_concepts_payload)

    return MockResponse(404, None)
