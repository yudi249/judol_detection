# Judol Keyword Baseline

Last updated: 2026-07-09

This baseline is derived from accepted Indonesian online gambling promotion papers. It is a starting point for dataset search, not a final detection dictionary.

## Core Judol Terms

- `judi`
- `judi online`
- `judol`
- `slot`
- `togel`
- `casino`
- `kasino`

Rationale: `slot`, `judi`, `gacor`, and `togel` appear as explicit collection or scraping terms in the accepted Twitter and `.go.id` studies.

## Promotion and Benefit Terms

- `gacor`
- `maxwin`
- `jackpot`
- `menang`
- `kemenangan`
- `untung`
- `cuan`
- `bonus`
- `bonus new member`
- `garansi kekalahan`
- `modal kecil`

Rationale: Perdana et al. report `prediksi`, `jackpot`, `maxwin`, and `togel` as frequent words, and their query uses `gacor`, `untung`, and `cuan`. Example promotional criteria include benefit framing, links, platform names, gambling results, and joining instructions.

## Transaction and Access Terms

- `deposit`
- `depo`
- `wd`
- `withdraw`
- `daftar`
- `claim`
- `link`
- `link alternatif`
- `situs`
- `login`
- `member`
- `wa`
- `whatsapp`

Rationale: Accepted papers repeatedly frame promotion content around joining, links/sites, and platform access. These terms should be used carefully because some have broad non-judol meanings.

## Platform or Game Terms

- `slot gacor`
- `slot online`
- `togel online`
- `casino online`
- `scatter`
- `mahjong`
- `pragmatic`
- `pg soft`
- `higgs domino`

Rationale: These terms are common in Indonesian judol promotion contexts and should be validated against newly collected samples. `higgs domino` also appears in Indonesian online gambling literature, though not necessarily in detection datasets.

## Obfuscation and Unicode Variants to Track

Do not use these only as search keywords. Use them as adversarial generation and normalization tests:

- Greek/Cyrillic homoglyphs inside terms, e.g. `slοt`, `bοnus`
- Irregular spacing, e.g. `s l o t`, `g a c o r`
- Punctuation insertion, e.g. `s.l.o.t`, `g@cor`
- Number substitution, e.g. `sl0t`, `b0nus`
- Emoji or symbol padding around links and calls to action
- Invisible characters or zero-width separators

Rationale: Recent YouTube comment papers explicitly mention obfuscation, Unicode characters, emojis, irregular spacing, symbols, and disguised language as moderation-evasion tactics.

## Initial Query Sets

### X / Twitter

Start conservative:

```text
(slot OR gacor OR untung OR cuan) lang:id
```

Then expand:

```text
(slot OR togel OR judi OR gacor OR maxwin OR jackpot OR "bonus new member" OR "link alternatif") lang:id
```

### YouTube Comments

Use videos likely to attract spam, then collect comments:

```text
slot gacor
judi online
Indonesia darurat judi online
game online penghasil uang
bonus new member
```

Also sample neutral videos in finance, gaming, automotive, education, and news to capture false positives and natural non-promotion comments.

### Telegram

Use the same seed families, but keep acquisition smaller and auditable:

```text
slot
gacor
togel
bonus new member
maxwin
deposit
```

Telegram search should record channel/group provenance separately and avoid storing private user identifiers.

## Annotation Guidelines Draft

Label as `judol_promotion` if the text does one or more of these:

- Invites users to join or play online gambling.
- Shows a gambling site, brand, link, or contact path.
- Promises bonus, win, jackpot, maxwin, or easy money in a gambling context.
- Shows proof/result of gambling activity as promotion.
- Gives instructions for registration, deposit, withdrawal, or claiming bonus.

Label as `non_judol` if:

- `slot` means time allocation, queue, or schedule.
- `bonus` means salary, school, game reward, or non-gambling promo.
- `deposit` means housing, banking, or non-gambling transaction.
- The text discusses the social/legal issue of judi online without promoting participation.

## Next Step

Before scraping at scale, build a small pilot dataset per platform:

- 200 X/Twitter posts
- 200 YouTube comments
- 100 Telegram messages, only from public channels/groups
- 100 intentionally clean false-positive samples

Review the pilot manually, update keywords, then scale collection.
