"""Static checks for every lesson file in content/.

Run with:  python -m pytest
These catch the mistakes that are easy to make when writing a lesson by hand:
a pseudocode list that does not line up with the code, an explanation attached
to a blank line, a variant whose replacement text is not in the code, and so on.
Whether each prediction's answer is actually right is checked by running the
code in a browser: see tests/e2e/check_answers.mjs.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import build  # noqa: E402

LESSONS, TOPICS = build.load_lessons()
CURRICULUM = build.load_toml(ROOT / "content" / "curriculum.toml")
IDS = sorted(LESSONS)


def code_lines(lesson: dict) -> list[str]:
    return lesson["code"].rstrip("\n").split("\n")


def variant_code(lesson: dict, variant: dict) -> str:
    return lesson["code"].replace(variant["from"], variant["to"]) if "from" in variant else lesson["code"]


@pytest.mark.parametrize("lesson_id", IDS)
def test_required_fields(lesson_id):
    lesson = LESSONS[lesson_id]
    for field in ("title", "code", "pseudo", "lines", "predict", "variants", "recap", "check"):
        assert field in lesson, f"{lesson_id} is missing {field}"
    assert lesson["variants"], "needs at least one variant (the original input)"


@pytest.mark.parametrize("lesson_id", IDS)
def test_pseudocode_lines_up_with_code(lesson_id):
    lesson = LESSONS[lesson_id]
    lines = code_lines(lesson)
    assert len(lesson["pseudo"]) == len(lines), "pseudo needs one entry per code line, '(blank)' for blank lines"
    for n, (code, pseudo) in enumerate(zip(lines, lesson["pseudo"]), 1):
        if not code.strip():
            assert pseudo.startswith("("), f"line {n} is blank, so its pseudo entry should be '(blank)' or a note in brackets"


@pytest.mark.parametrize("lesson_id", IDS)
def test_explanations_point_at_real_lines(lesson_id):
    lesson = LESSONS[lesson_id]
    lines = code_lines(lesson)
    for n, text in lesson["lines"].items():
        n = int(n)
        assert 1 <= n <= len(lines) and lines[n - 1].strip(), f"lines.{n} is attached to a blank or missing line"
        assert text.get("t") and text.get("b") is not None


@pytest.mark.parametrize("lesson_id", IDS)
def test_prediction(lesson_id):
    lesson = LESSONS[lesson_id]
    predict = lesson["predict"]
    lines = code_lines(lesson)
    assert lines[predict["line"] - 1].strip(), "predict.line points at a blank line"
    assert ("v" in predict["target"]) != bool(predict["target"].get("out")), "target needs either v or out"
    assert len(predict["opts"]) >= 2
    assert set(predict.get("fb", {})) <= set(predict["opts"]), "feedback given for an option that does not exist"


@pytest.mark.parametrize("lesson_id", IDS)
def test_variants(lesson_id):
    lesson = LESSONS[lesson_id]
    for variant in lesson["variants"]:
        assert variant.get("label")
        if "from" in variant:
            assert lesson["code"].count(variant["from"]) == 1, f"variant {variant['label']!r}: 'from' must appear exactly once"
        if "pline" in variant:
            changed = variant_code(lesson, variant).rstrip("\n").split("\n")
            assert changed[variant["pline"] - 1].strip(), f"variant {variant['label']!r}: pline points at a blank line"
        if "opts" in variant:
            assert len(variant["opts"]) >= 2


@pytest.mark.parametrize("lesson_id", IDS)
def test_final_check(lesson_id):
    check = LESSONS[lesson_id]["check"]
    assert 0 <= check["right"] < len(check["opts"])
    assert len(check["fb"]) == len(check["opts"]), "one feedback line per option"


def test_every_topic_is_in_the_curriculum():
    numbers = {t["n"] for t in CURRICULUM["py"]}
    assert set(TOPICS) <= numbers


def test_lesson_ids_are_listed_once():
    listed = [i for ids in TOPICS.values() for i in ids]
    assert len(listed) == len(set(listed))
    assert set(LESSONS) <= set(listed)


def test_built_page_is_up_to_date():
    assert (ROOT / "index.html").read_text() == build.build(), "run  python build.py  and commit index.html"
