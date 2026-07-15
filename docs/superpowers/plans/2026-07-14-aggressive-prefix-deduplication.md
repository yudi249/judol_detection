# Aggressive Prefix Deduplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove repeated promotion templates whose long identical prefix is followed only by a variable username tail.

**Architecture:** Keep all source-independent comparisons in `collection/deduplication.py`. `CollectionStorage` continues calling `is_near_duplicate`, which becomes true when Jaccard, containment, or the long shared-prefix policy detects a duplicate.

**Tech Stack:** Python 3.12, standard-library regular expressions, pytest, SQLite storage integration.

---

### Task 1: Add shared-prefix regression coverage

**Files:**
- Modify: `tests/unit/test_collection_deduplication.py`

- [x] **Step 1: Write the failing test**

```python
def test_shared_prefix_catches_template_with_variable_username_tail() -> None:
    core = "mimin rekomendasi situs paling gacor tahun ini wananda inasultan minimal deposit bisa cuan ratusan ribu jutaan bonus menarik daftar member sekarang"
    left = f"{core} ardi bima caca dino"
    right = f"{core} kiki lina mario nanda"

    assert is_near_duplicate(left, right, threshold=0.95)
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run --no-cache python -m pytest --basetemp=.pytest-prefix-red tests/unit/test_collection_deduplication.py`

Expected: FAIL because neither Jaccard nor containment reaches its threshold.

- [x] **Step 3: Write minimal implementation**

```python
def shared_prefix_similarity(left: str, right: str) -> tuple[int, float]:
    left_tokens = canonicalize_for_deduplication(left).split()
    right_tokens = canonicalize_for_deduplication(right).split()
    shared = 0
    for left_token, right_token in zip(left_tokens, right_tokens):
        if left_token != right_token:
            break
        shared += 1
    return shared, shared / min(len(left_tokens), len(right_tokens))
```

Stop counting at the first mismatch and return `(0, 0.0)` when either canonical token list is empty. Make `is_near_duplicate` return true when shared tokens are at least 20 and the ratio is at least 0.80.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run --no-cache python -m pytest --basetemp=.pytest-prefix-green tests/unit/test_collection_deduplication.py`

Expected: PASS.

### Task 2: Verify reusable storage behavior and record evidence

**Files:**
- Modify: `tests/integration/test_collection_storage.py`
- Modify: `claude-progress.md`
- Modify: `feature_list.json`

- [x] **Step 1: Add storage regression test**

Store two candidate documents sharing more than 20 initial canonical tokens but with different tails under a Jaccard threshold of `0.95`; assert the second result has `skip_reason == "near_duplicate"`.

- [x] **Step 2: Run full verification**

Run: `uv run --no-cache python -m pytest --basetemp=.pytest-prefix-final; uv run --no-cache python main.py`

Expected: all tests pass and the project smoke output is `Judol Detection monorepo is ready.`

- [x] **Step 3: Record result**

Add the threshold policy, commands, result, and the requirement to use a fresh collection database to the progress and feature evidence files.
