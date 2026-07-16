# Judol Literature Search Log

Last updated: 2026-07-09

## Goal

Find papers about Indonesian online gambling promotion detection, with emphasis on how datasets were searched, collected, filtered, and labeled. Adjacent Indonesian hate speech, hoax, and sentiment papers were intentionally excluded from the accepted set.

## Tools and Sources

- OpenAlex MCP for discovery, metadata, DOI, venue, abstracts, and OA links.
- Publisher/DOI pages for method details when OpenAlex metadata was insufficient.
- Zotero Desktop skill for reference import.

Zotero import status: 10 screened papers were imported into the active Zotero target `My Library`. The Zotero skill does not expose collection creation, so items were tagged with `Skripsi - Judol Dataset Methods`, `judol`, and `dataset-method` instead of being placed in a new collection.

## Query Log

| Query | Useful Results | Notes |
| --- | ---: | --- |
| `Indonesian online gambling promotion detection` | 4 | Broad query was noisy; useful for Procedia and YouTube papers. |
| `online gambling promotion Indonesian YouTube comments` | 7 | Best query for YouTube comment detection papers. |
| `Indonesian online gambling social media comments` | 3 | Mixed quality; useful for discourse/social network papers. |
| `judi online detection Indonesian dataset` | 1 | Mostly legal/social impact papers, low dataset relevance. |
| `online gambling promotion` in title | 10+ | Best title-gated query for detection/promotion papers. |
| `online gambling comments` in title | 10+ | Best title-gated query for YouTube/comment datasets. |

## Accepted Papers Imported to Zotero

| Zotero Key | Paper | Platform / Source | Why Accepted |
| --- | --- | --- | --- |
| `5DYFDX3A` | Perdana et al. (2024), [Detecting Online Gambling Promotions on Indonesian Twitter Using Text Mining Algorithm](https://doi.org/10.14569/ijacsa.2024.0150893) | Twitter/X | Strongest dataset-method paper: query string, labeling criteria, annotators, Cohen's kappa, frequent terms, and 6,038 tweets. |
| `AQL2DL9V` | Santika et al. (2025), [Online Gambling Promotion Detection in Indonesian YouTube Comments Using Semi-Supervised IndoBERT Classification](https://doi.org/10.1016/j.procs.2025.09.068) | YouTube comments | Gives 10,101 comments, 10% manual labels, pseudo-labeling flow, and Indonesian-language promotion/non-promotion classes. |
| `ACI2T66J` | Kamdan et al. (2025), [Performance Analysis of IndoBERT for Detection of Online Gambling Promotion in YouTube Comments](https://doi.org/10.3390/engproc2025107066) | YouTube comments | States YouTube Data API collection and preprocessing for Indonesian online gambling spam. |
| `JRUTHJUT` | Manullang et al. (2025), [Comparative Analysis of CNN, Transformers, and Traditional ML for Classifying Online Gambling Spam Comments in Indonesian](https://doi.org/10.30871/jaic.v9i3.9468) | Indonesian comment sections | Accepted as Indonesian comment-spam benchmark paper; method details need full-text follow-up. |
| `PMVNB2PV` | Pratama et al. (2025), [Comparison of Online Gambling Promotion Detection Performance Using DistilBERT and DeBERTa Models](https://doi.org/10.30871/jaic.v9i6.11293) | YouTube comments | Balanced 6,350-comment dataset; focuses on ambiguous/disguised Indonesian promotion language. |
| `BN63T94I` | Ammar et al. (2025), [Deep Learning-Based Detection of Online Gambling Promotion Spam in Indonesian YouTube Comments](https://doi.org/10.30871/jaic.v9i6.11240) | YouTube comments | Useful for imbalance handling: original distribution, undersampling, oversampling, and class weighting. |
| `JDRGFXYF` | Angelo et al. (2025), [Comparative Performance of Machine Learning Algorithms for Detecting Online Gambling Promotional Comments on Youtube](https://doi.org/10.26905/jtmi.v11i2.16286) | YouTube comments | Highly relevant to thesis: Unicode, emoji, irregular spacing, pseudo-labeling from 1,648 to 9,111 comments, normalization, SMOTE. |
| `6L8K4MSX` | Prakoso et al. (2025), [Detecting Online Gambling Promotional Comments on YouTube Using Indonesian BERT and Multilingual BERT](https://doi.org/10.1109/icaitech66481.2025.11387329) | YouTube comments | Mentions finance/gaming/automotive videos, manual labels, obfuscation, symbols, spacing, and Unicode variants. |
| `26Z3Q7TB` | Anderson et al. (2026), [Detecting Online Gambling Promotion in Youtube Comments Using Transformer-Based Models](https://doi.org/10.1109/isiber68248.2026.11469786) | YouTube comments | Introduces IndoGambling-Comments, a labeled Indonesian YouTube comments dataset. |
| `IXXGJ6YQ` | Nurseno et al. (2024), [Detecting Hidden Illegal Online Gambling on .go.id Domains Using Web Scraping Algorithms](https://doi.org/10.30812/matrik.v23i2.3824) | `.go.id` websites | Not social-comment text, but useful for seed keywords and web scraping strategy: FOFA dataset, 450,000 domains, local-language keywords. |

## Screened but Not Imported

| Paper | Reason |
| --- | --- |
| Studies on online gambling law enforcement, impact, addiction, or Islamic law | Judol topic is present, but no reusable text-dataset search/collection method. |
| Non-Indonesian online gambling promotion papers | Useful background only, but outside current scope. |
| Broad spam/hate speech/sentiment Indonesian dataset papers | Excluded because scope was locked to judol-only. |

## Immediate Findings

- YouTube comment datasets dominate recent Indonesian judol detection work.
- Twitter/X work exists and gives the clearest reusable keyword query strategy.
- Dataset methods often start from manually chosen seed keywords, then collect comments/tweets, manually label a subset, and optionally expand labels using pseudo-labeling.
- Several recent papers explicitly mention obfuscation, Unicode variants, emojis, symbols, irregular spacing, or disguised language, which supports this thesis focus.
- Many 2025-2026 papers are new and low-citation; they are still methodologically useful but should be cited carefully.

## Follow-Up

- Read full text of the accepted YouTube papers to extract exact keyword seeds, video/channel selection criteria, and annotation instructions.
- Create a small PRISMA-style search note if the literature review chapter needs a formal search method.
- If Zotero collection support is needed, create the collection manually in Zotero and select it before the next import.
