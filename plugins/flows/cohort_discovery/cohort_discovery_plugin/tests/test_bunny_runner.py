import json, sys, types

def _install_fakes(monkeypatch, captured):
    class RQ:
        def __init__(self, count): self._c = count
        def to_dict(self): return {"count": self._c, "distributions": {}}
    def execute_query(task, modifiers, db_client, settings=None, encode_result=True):
        return RQ(7)
    class Client:
        def __init__(self, settings=None): pass
        def send_results(self, result): captured.append(result)
    class Polling:
        def __init__(self, client, handler, settings): self.handler = handler
        def poll_for_tasks(self, max_iterations=None): self.handler({"uuid": "t1"})
    monkeypatch.setitem(sys.modules, "hutch_bunny.core.settings",
        types.SimpleNamespace(DaemonSettings=lambda: types.SimpleNamespace(
            LOW_NUMBER_SUPPRESSION_THRESHOLD=10, ROUNDING_TARGET=10)))
    monkeypatch.setitem(sys.modules, "hutch_bunny.core.db",
        types.SimpleNamespace(get_db_client=lambda: object()))
    monkeypatch.setitem(sys.modules, "hutch_bunny.core.execute_query",
        types.SimpleNamespace(execute_query=execute_query))
    monkeypatch.setitem(sys.modules, "hutch_bunny.core.upstream.task_api_client",
        types.SimpleNamespace(TaskApiClient=Client))
    monkeypatch.setitem(sys.modules, "hutch_bunny.core.upstream.polling_service",
        types.SimpleNamespace(PollingService=Polling))

def test_runner_emits_child_result(monkeypatch, capsys):
    captured = []
    _install_fakes(monkeypatch, captured)
    from cohort_discovery_plugin import bunny_runner
    bunny_runner.run()
    out = json.loads(capsys.readouterr().out.strip().splitlines()[-1])
    assert out["results"][0]["count"] == 7
    assert out["error"] is None
    assert len(captured) == 1  # send_results called
