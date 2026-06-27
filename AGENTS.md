# Repository Guidelines

## Project Structure & Module Organization

This repository is a uv-based thesis monorepo for Unicode-robust Indonesian judol promotion detection.

- `src/judol_detection/`: reusable Python package for data loading, preprocessing, Unicode obfuscation, models, training, evaluation, and inference.
- `notebooks/`: SEMMA exploration notebooks. Keep reusable logic in `src/`, not inside notebooks.
- `data/`: raw, interim, processed, adversarial, and annotation datasets. Large or sensitive data is ignored by Git.
- `experiments/`: configs, local run outputs, and report-ready summaries.
- `models/`: local checkpoints and final exported models. Binaries are ignored by Git.
- `apps/api/`: FastAPI inference service.
- `apps/browser-extension/`: Manifest V3 browser extension prototype.
- `tests/`: unit, integration, and fixture tests.
- `docs/` and `thesis/`: engineering docs and thesis writing assets.

## Build, Test, and Development Commands

- `uv sync`: create/update the local `.venv` from `pyproject.toml` and `uv.lock`.
- `uv run python main.py`: run the current project entrypoint.
- `uv run python -m pytest`: run tests after pytest is added.
- `uv run python scripts/<script>.py`: run project scripts through the managed uv environment.

Add dependencies with `uv add <package>` and development tools with `uv add --dev <package>`.

## Coding Style & Naming Conventions

Use Python 3.12+. Prefer small modules under `src/judol_detection/`. Use 4-space indentation, `snake_case` for functions/modules, `PascalCase` for classes, and names such as `generate_unicode_variants.py` or `test_unicode_obfuscation.py`.

JavaScript for the extension should stay plain until a bundler is introduced. Use filenames matching MV3 roles, for example `content_script.js` and `background.js`.

## Testing Guidelines

Place fast function tests in `tests/unit/`, cross-component tests in `tests/integration/`, and small safe samples in `tests/fixtures/`. Name Python test files `test_*.py` and test functions `test_<behavior>()`.

Prioritize tests for Unicode manipulation, preprocessing, dataset splitting, inference contracts, and API response schemas. Do not commit private/raw scraped data as fixtures.

## Commit & Pull Request Guidelines

This repo has no commit history yet. Use Conventional Commits going forward, for example `feat: add unicode obfuscation helpers`, `test: cover dataset splitting`, or `docs: update methodology notes`.

Pull requests should include a short purpose statement, changed areas, verification commands run, and screenshots or recordings for browser extension UI changes. Link issues or thesis tasks when relevant.

## Security & Configuration Tips

Keep secrets and local paths in `.env`; use `.env.example` for documented defaults. Do not commit raw datasets, model checkpoints, browser logs, access tokens, or personal data collected from platforms. Document dataset provenance and annotation decisions in `docs/dataset.md` or `data/README.md`.
