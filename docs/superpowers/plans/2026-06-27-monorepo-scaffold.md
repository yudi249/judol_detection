# Monorepo Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize a uv-based thesis monorepo for Unicode-robust Indonesian online gambling promotion detection.

**Architecture:** The repository is organized around research artifacts: dataset pipeline, reusable ML package, experiments, API, browser extension, tests, thesis writing, and documentation. Python code lives under `src/judol_detection/`; system demos live under `apps/`.

**Tech Stack:** uv, Python 3.12, future FastAPI backend, future Manifest V3 browser extension, future TensorFlow/Keras and PyTorch/Hugging Face model training.

---

### Task 1: Initialize uv Project

**Files:**
- Create: `pyproject.toml`
- Create: `.python-version`
- Create: `README.md`
- Create: `.gitignore`
- Create: `main.py`

- [x] **Step 1: Run uv init**

Run: `uv init --name judol-detection`

Expected: uv creates a Python project in the repository root.

- [x] **Step 2: Verify generated files**

Run: `Get-ChildItem -Force`

Expected: `pyproject.toml`, `.python-version`, `.gitignore`, `README.md`, and `main.py` exist.

### Task 2: Add Monorepo Skeleton

**Files:**
- Create: `data/README.md`
- Create: `notebooks/README.md`
- Create: `src/judol_detection/__init__.py`
- Create: `experiments/README.md`
- Create: `models/README.md`
- Create: `apps/README.md`
- Create: `tests/README.md`
- Create: `thesis/README.md`
- Create: `docs/architecture.md`
- Create: `scripts/README.md`

- [x] **Step 1: Create research, app, documentation, and test directories**

Create placeholder README and `.gitkeep` files for each planned area.

Expected: directory tree reflects the approved thesis monorepo structure.

### Task 3: Update Starter Metadata

**Files:**
- Modify: `README.md`
- Modify: `pyproject.toml`
- Modify: `.gitignore`
- Modify: `main.py`
- Create: `.env.example`

- [x] **Step 1: Update project description**

Set the project description to explain the Unicode-robust judol detection thesis scope.

- [x] **Step 2: Add ignore rules**

Ignore local datasets, generated model artifacts, experiment runs, virtual environments, notebook checkpoints, and caches.

- [x] **Step 3: Add environment example**

Create `.env.example` with model path and local API defaults.
