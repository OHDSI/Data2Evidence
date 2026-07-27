from cohort_discovery_plugin.types import (
    CohortDiscoveryOptions, ChildResult, ArtifactEnvelope,
)

def test_options_parse():
    o = CohortDiscoveryOptions(datasetId="ds1", databaseCode="pg1", schemaName="cdm")
    assert o.cacheId is None

def test_child_result_roundtrip():
    payload = {"results": [{"analysis": None, "count": 42, "files": [], "raw": {}}]}
    cr = ChildResult(**payload)
    assert cr.results[0].count == 42
    assert cr.results[0].code is None

def test_child_result_defaults_are_not_shared():
    """Mutable defaults must come from default_factory, not a shared instance."""
    a, b = ChildResult(), ChildResult()
    a.results.append(None)
    assert b.results == []

def test_envelope_shape():
    env = ArtifactEnvelope(
        availability={"count": 42, "obfuscation": {"suppression": 10, "rounding": 10}},
        distributions={"DEMOGRAPHICS": []},
        metadata={"datasetId": "ds1", "cohortName": "c", "generatedAt": "t"},
    )
    assert env.availability["count"] == 42
