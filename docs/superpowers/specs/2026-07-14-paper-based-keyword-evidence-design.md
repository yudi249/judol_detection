# Paper-Based Keyword Evidence Design

## Goal

Mengganti weak label keyword datar dengan evidence bertingkat yang diturunkan dari paper judol yang telah dianalisis. Tujuannya meningkatkan cakupan kandidat promosi tanpa menjadikan kata umum seperti `bonus` atau `link` sebagai positif otomatis.

## Evidence tiers

### Strong evidence

Satu kecocokan sudah memberi kandidat positif: `judi`, `judol`, `slot`, `togel`, `casino`, `kasino`, `gacor`, `maxwin`, `jackpot`, `jepe`, `freebet`, `scatter`, `pragmatic`, `pg soft`, `higgs domino`, `slot gacor`, `slot online`, `togel online`, `bonus deposit`, dan `bonus new member`.

### Supporting evidence

Tidak boleh memicu kandidat sendiri: `bonus`, `deposit`, `depo`, `wd`, `withdraw`, `daftar`, `claim`, `link`, `link alternatif`, `situs`, `login`, `member`, `menang`, `kemenangan`, `untung`, `cuan`, `mahjong`, `main`, dan `gratis`.

### Obfuscation evidence

Flag Unicode, zero-width, number substitution, punctuation insertion, atau spaced-word menambah evidence. Ia tidak menghasilkan label positif tanpa strong evidence atau sedikitnya dua supporting evidence.

## Decision rule

`weak_label=1` bila salah satu kondisi berikut terpenuhi:

1. terdapat strong evidence;
2. terdapat sedikitnya dua supporting evidence, salah satunya merupakan access/transaction term;
3. terdapat satu supporting evidence dan URL, Telegram/WhatsApp handle, atau domain/contact pattern;
4. terdapat obfuscation evidence dan satu strong evidence setelah normalisasi.

Selain itu `weak_label=0`. `matched_keywords` menyimpan semua match terurut; `weak_label_reason` menyimpan rule eksplisit, misalnya `strong:slot|maxwin` atau `supporting:bonus|deposit+contact`.

## Paper basis

Perdana 2024 mendukung `slot`, `gacor`, `untung`, dan `cuan` sebagai retrieval seed. Nurseno 2024 mendukung `slot`, `judi`, `gacor`, dan `togel`. Ammar 2025 mendukung brand, `slot`, `maxwin`, `bonus deposit`, serta URL/Telegram/WhatsApp pattern. Santika 2025 dan Angelo 2025 mendukung `jepe`, `jackpot`, Unicode, spacing, symbol, dan manipulated spelling. Pratama 2025 mendukung `freebet`, `gratis`, `bonus`, `deposit`, dan bentuk tersamar.

## Verification

Tests harus membuktikan: strong term tunggal positif; `bonus` tunggal negatif; `bonus deposit` positif; `deposit` plus URL positif; `untung` tunggal negatif; obfuscation tanpa keyword negatif; dan alasan evidence deterministik.
