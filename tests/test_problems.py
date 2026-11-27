"""Every practice problem: well-formed, its solution passes its tests in CPython,
its demo runs, and the starter code does not already pass."""
from __future__ import annotations

import contextlib
import io
import tomllib
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
PROBLEM_FILES = sorted((ROOT / "content" / "problems").glob("*.toml"))
CURRICULUM = tomllib.loads((ROOT / "content" / "curriculum.toml").read_text())
TOPICS = {t["n"] for t in CURRICULUM["py"]}


def load():
    out = []
    for path in PROBLEM_FILES:
        data = tomllib.loads(path.read_text())
        for p in data["problem"]:
            out.append((data["topic"], p))
    return out


PROBLEMS = load()
IDS = [f"{t}-{p['id']}" for t, p in PROBLEMS]


def run_tests(code: str, tests: list[dict]) -> list[bool]:
    results = []
    for t in tests:
        ns: dict = {"__name__": "__main__"}
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                exec(code, ns)
                if t.get("setup"):
                    exec(t["setup"], ns)
                got = repr(eval(t["call"], ns))
            results.append(got == t["expect"])
        except Exception:
            results.append(False)
    return results


def test_every_topic_has_problems():
    assert {t for t, _ in PROBLEMS} == TOPICS


def test_ids_unique():
    assert len(set(IDS)) == len(IDS)


@pytest.mark.parametrize("topic,p", PROBLEMS, ids=IDS)
def test_problem(topic, p, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)  # file problems write real files under CPython
    for key in ("id", "title", "level", "story", "hint", "starter", "solution", "demo", "tests"):
        assert p.get(key), f"missing {key}"
    assert p["level"] in {"Easy", "Medium", "Hard"}
    assert topic in TOPICS
    assert all(run_tests(p["solution"], p["tests"])), "solution fails its own tests"
    assert not all(run_tests(p["starter"], p["tests"])), "starter already passes"
    with contextlib.redirect_stdout(io.StringIO()) as out:
        exec(p["solution"] + "\n" + p["demo"], {"__name__": "__main__"})
    assert out.getvalue().strip(), "demo prints nothing"
