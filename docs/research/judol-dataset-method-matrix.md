# Judol Dataset Method Matrix

Last updated: 2026-07-09

| Paper | Dataset Source | Acquisition Method | Keyword / Seed Strategy | Size / Labels | Preprocessing | Thesis Relevance | Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Perdana et al. (2024) | Indonesian Twitter/X | Twitter search after keyword determination | Query string: `(slot OR gacor OR untung OR cuan) lang:id`; frequent terms include `link`, `situs`, `prediksi`, `jackpot`, `maxwin`, `togel` | 6,038 tweets; two annotators; Cohen's kappa; third expert for unresolved disagreements | Tokenization, normalization, noise removal, stemming | Best starting point for X keyword baseline and annotation criteria | Twitter/X API access is now harder; keyword-based retrieval may bias toward obvious promotions |
| Santika et al. (2025) | Indonesian YouTube comments | YouTube comment collection | Not specified in OpenAlex abstract; full text needed | 10,101 comments; 10% manually labeled; pseudo-labeling for unlabeled data | IndoBERT training pipeline | Strong model for semi-supervised expansion when manual labels are limited | Exact video/query selection must be extracted from full text |
| Kamdan et al. (2025) | YouTube comments | YouTube Data API | Not specified in OpenAlex abstract | Size not visible in metadata | Cleaning and tokenization | Confirms YouTube Data API as legitimate collection route | Needs full-text extraction for dataset size and seeds |
| Manullang et al. (2025) | Indonesian social media / comment sections | Not specified in OpenAlex abstract | Online gambling spam in Indonesian comment sections | Size not visible in metadata | Model-specific preprocessing for CNN, IndoBERT, Wordformer, SVM, RF | Useful benchmark for Indonesian comment spam modeling | Dataset acquisition details need full text |
| Pratama et al. (2025) | Indonesian YouTube comments | Not specified in OpenAlex abstract | Ambiguous and disguised social media promotion language | Balanced 6,350 comments | Transformer tokenization; DeBERTa BPE helps non-standard language | Useful for ambiguous-language and high-accuracy baselines | Exact collection and labeling protocol not visible in metadata |
| Ammar et al. (2025) | Indonesian YouTube comments | Not specified in OpenAlex abstract | Online gambling spam in YouTube comments | Imbalanced dataset; exact size not visible in metadata | Class weighting, under/oversampling, recurrent models | Useful for class imbalance strategy | Needs exact data source and label distribution from full text |
| Angelo et al. (2025) | YouTube comments | Initial labeled set plus semi-supervised pseudo-labeling | Targets obfuscation, Unicode characters, emojis, irregular spacing, and symbols | Labeled set expands from 1,648 to 9,111; 1,823-sample test set | Character normalization, selective cleaning, tokenization, stopword removal, Nazief-Adriani stemming, TF-IDF, SMOTE | Directly supports Unicode-robust thesis framing | Need full text for initial collection seed/video criteria |
| Prakoso et al. (2025) | Indonesian YouTube comments | Manual collection/labeling from selected video categories | Finance, gaming, and automotive videos; obfuscation with symbols, spacing, Unicode variants | Size not visible in metadata | Transformer tokenization | Useful for adversarial/obfuscated promotional style | Closed access in OpenAlex; details may require institutional access |
| Anderson et al. (2026) | Indonesian YouTube comments | Introduces IndoGambling-Comments dataset | Repetitive/templated YouTube promotional comments | Dataset size not visible in metadata | Font preprocessing improves transformer results | Useful as named dataset reference and preprocessing idea | Closed access in OpenAlex; new paper with no citation history |
| Nurseno et al. (2024) | `.go.id` websites | FOFA.info domain dataset plus Python web scraping | `slot`, `judi`, `gacor`, `togel` | 450,000 `.go.id` domains; 1,482 suspected; 958 confirmed compromised | Scraping and keyword matching against local-language gambling terms | Useful for keyword seeds and website scraping strategy | Domain/web-page task differs from social-comment text classification |

## Synthesis for Dataset Collection

The most defensible dataset strategy for this thesis is a hybrid of the accepted papers:

1. Start with narrow, evidence-backed seeds from Perdana et al. and Nurseno et al.: `slot`, `gacor`, `untung`, `cuan`, `judi`, `togel`.
2. Expand seeds using terms observed in collected samples: `link`, `situs`, `prediksi`, `jackpot`, `maxwin`, plus transaction and bonus terms.
3. Collect from platform-specific sources:
   - X/Twitter: keyword search with Indonesian language filtering where available.
   - YouTube: YouTube Data API comments from videos likely to attract spam.
   - Telegram: channel/group search should reuse the same baseline seeds but needs separate ethical and technical constraints.
4. Label a bounded manually reviewed subset before model training.
5. Use pseudo-labeling only after a baseline model reaches acceptable precision, and keep pseudo-labeled rows separate from human labels.
6. Keep Unicode-obfuscated samples as a special adversarial slice, not mixed invisibly into the raw positive class.

## Candidate Dataset Fields

- `platform`
- `source_id`
- `source_url_hash`
- `collection_query`
- `raw_text`
- `normalized_text`
- `unicode_flags`
- `label`
- `label_source`
- `annotator_id`
- `created_at`
- `collected_at`
- `notes`

Store URLs as hashes by default unless a research audit requires the original URL.
