# Judol Dataset-Method Paper PDFs

This folder stores local PDF copies for screened papers used to understand how
Indonesian judol datasets are collected, filtered, and labeled.

PDFs are grouped under:

- `judol-dataset-methods/`: papers relevant to dataset acquisition methods,
  including keyword search, platform scraping, semi-supervised labeling, and
  web crawling.

The papers are also present in Zotero as metadata records. The current Zotero
skill can inspect attachments and import BibTeX/RIS records, but it does not
expose a safe command to attach a local PDF file to an existing Zotero item.

## Zotero Items Checked

All 10 imported Zotero items were checked with `zotero.py children <itemKey>`.
Each returned an empty child list, so none had attached PDFs at check time.

## PDF Inventory

| Zotero key | Paper focus | Local PDF |
| --- | --- | --- |
| `5DYFDX3A` | Indonesian Twitter keyword dataset | `judol-dataset-methods/5DYFDX3A-perdana-2024-twitter-keyword-dataset.pdf` |
| `AQL2DL9V` | YouTube semi-supervised dataset | `judol-dataset-methods/AQL2DL9V-santika-2025-youtube-semisupervised-dataset.pdf` |
| `ACI2T66J` | YouTube IndoBERT dataset | `judol-dataset-methods/ACI2T66J-kamdan-2025-youtube-indobert-dataset.pdf` |
| `JRUTHJUT` | YouTube spam dataset comparison | `judol-dataset-methods/JRUTHJUT-manullang-2025-youtube-spam-dataset.pdf` |
| `PMVNB2PV` | YouTube transformer dataset | `judol-dataset-methods/PMVNB2PV-pratama-2025-youtube-transformer-dataset.pdf` |
| `BN63T94I` | YouTube spam dataset | `judol-dataset-methods/BN63T94I-ammar-2025-youtube-spam-dataset.pdf` |
| `JDRGFXYF` | YouTube ML dataset comparison | `judol-dataset-methods/JDRGFXYF-angelo-2025-youtube-ml-dataset.pdf` |
| `6L8K4MSX` | YouTube IndoBERT/mBERT dataset | Missing local PDF |
| `26Z3Q7TB` | YouTube transformer dataset | Missing local PDF |
| `IXXGJ6YQ` | `.go.id` web scraping dataset | `judol-dataset-methods/IXXGJ6YQ-nurseno-2024-goid-webscraping-dataset.pdf` |

## Zotero Attachment Checklist

Attach these files manually to the matching Zotero items:

| Attach? | Zotero key | File to attach |
| --- | --- | --- |
| Yes | `5DYFDX3A` | `judol-dataset-methods/5DYFDX3A-perdana-2024-twitter-keyword-dataset.pdf` |
| Yes | `AQL2DL9V` | `judol-dataset-methods/AQL2DL9V-santika-2025-youtube-semisupervised-dataset.pdf` |
| Yes | `ACI2T66J` | `judol-dataset-methods/ACI2T66J-kamdan-2025-youtube-indobert-dataset.pdf` |
| Yes | `JRUTHJUT` | `judol-dataset-methods/JRUTHJUT-manullang-2025-youtube-spam-dataset.pdf` |
| Yes | `PMVNB2PV` | `judol-dataset-methods/PMVNB2PV-pratama-2025-youtube-transformer-dataset.pdf` |
| Yes | `BN63T94I` | `judol-dataset-methods/BN63T94I-ammar-2025-youtube-spam-dataset.pdf` |
| Yes | `JDRGFXYF` | `judol-dataset-methods/JDRGFXYF-angelo-2025-youtube-ml-dataset.pdf` |
| Missing | `6L8K4MSX` | No local PDF |
| Missing | `26Z3Q7TB` | No local PDF |
| Yes | `IXXGJ6YQ` | `judol-dataset-methods/IXXGJ6YQ-nurseno-2024-goid-webscraping-dataset.pdf` |

## Manual Attachment Steps

1. Open the matching Zotero item.
2. Right-click the item.
3. Choose `Add Attachment` -> `Attach Stored Copy of File`.
4. Select the matching file from `docs/research/papers/judol-dataset-methods/`.

Avoid importing these PDFs as new references unless duplicate Zotero items are
intentionally acceptable.
