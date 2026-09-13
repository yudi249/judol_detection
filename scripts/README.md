# Scripts

Command-line script yang direncanakan:

- `make_dataset.py`
- `generate_unicode_variants.py`
- `train.py`
- `evaluate.py`
- `export_model.py`

## Sampling Excel per Sheet

Untuk mengambil maksimal 400 data acak dari setiap sheet dan menggabungkannya
ke satu CSV dengan provenance `source_sheet`:

```powershell
uv run --no-cache python scripts/sample_excel_sheets.py `
  --input data/processed/dataset.xlsx `
  --output data/processed/dataset_sampled_2384.csv `
  --n-per-sheet 400 `
  --seed 42
```

Sheet dengan kurang dari 400 data akan diambil seluruhnya. Seed `42` membuat
hasil sampling dapat direproduksi.
