"""Every practice problem: well-formed, its solution passes its tests in CPython,
its demo runs, and the starter code does not already pass."""
from __future__ import annotations

import contextlib
import io
import tomllib
from pathlib import Path

import signal

import pytest


class TooSlow(Exception):
    pass


def _alarm(*_):
    raise TooSlow()


signal.signal(signal.SIGALRM, _alarm)

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
        signal.alarm(3)  # slow code (like a plain recursive starter) counts as a failure
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                exec(code, ns)
                if t.get("setup"):
                    exec(t["setup"], ns)
                got = repr(eval(t["call"], ns))
            results.append(got == t["expect"])
        except Exception:
            results.append(False)
        finally:
            signal.alarm(0)
    return results


def run_output(code: str, tests: list[dict]) -> list[bool]:
    """Output problems: run the whole program and compare what it prints."""
    norm = lambda t: "\n".join(line.rstrip() for line in t.strip("\n").split("\n"))
    results = []
    for t in tests:
        try:
            with contextlib.redirect_stdout(io.StringIO()) as out:
                exec(t.get("before", "") + "\n" + code, {"__name__": "__main__"})
            results.append(norm(out.getvalue()) == norm(t["output"]))
        except Exception:
            results.append(False)
    return results


LESSON_TOPIC = {}
for path in sorted((ROOT / "content" / "python").glob("*.toml")):
    data = tomllib.loads(path.read_text())
    for lesson in data.get("lesson", []):
        LESSON_TOPIC[lesson["id"]] = data["topic"]
LESSON_TOPIC.setdefault("alias", "05")  # the hand-built Lists lesson


def test_every_topic_has_problems():
    assert {t for t, _ in PROBLEMS} == TOPICS


def test_every_lesson_has_a_problem():
    assert {p["lesson"] for _, p in PROBLEMS} == set(LESSON_TOPIC)


def test_ids_unique():
    assert len(set(IDS)) == len(IDS)


@pytest.mark.parametrize("topic,p", PROBLEMS, ids=IDS)
def test_problem(topic, p, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)  # file problems write real files under CPython
    for key in ("id", "lesson", "title", "level", "kind", "story", "hints", "approach", "gfg", "starter", "solution", "tests"):
        assert p.get(key), f"missing {key}"
    assert p["level"] in {"Easy", "Medium", "Hard"}
    assert p["kind"] in {"output", "function"}
    assert LESSON_TOPIC[p["lesson"]] == topic, "problem is filed under the wrong topic"
    assert len(p["hints"]) >= 2
    if p["kind"] == "output":
        assert all(run_output(p["solution"], p["tests"])), "solution does not print the expected output"
        assert not all(run_output(p["starter"], p["tests"])), "starter already prints the expected output"
        return
    assert all(run_tests(p["solution"], p["tests"])), "solution fails its own tests"
    assert not all(run_tests(p["starter"], p["tests"])), "starter already passes"
