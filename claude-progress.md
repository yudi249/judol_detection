# Progress Log

## Session 081

- Date: 2026-09-14
- Goal: complete and verify the contract-first FastAPI/extension API transport, then decide the real-artifact verification path.
- Completed:
  - Added the canonical OpenAPI 3.1 contract at `contracts/judollens-api.openapi.yaml`; FastAPI request/response models and the generated extension client share that wire contract.
  - Pinned the upstream IndoBERT checkpoint to Hugging Face revision `c2cd0b51ddce6580eb35263b39b0a1e5fb0a39e2` for both tokenizer/model downloads and artifact manifest provenance; source URLs now validate as URI values to match the canonical OpenAPI contract.
  - Routed API-mode prediction exclusively through the extension background; content scripts and React pages retain their existing internal camelCase contract and remain transport-agnostic.
  - Added terminal API-failure handling so an unavailable service is surfaced as an extension error without a false `non_judol` result or clean detection log.
  - Corrected the extension API/manual-analysis regression and installed the Trainer runtime dependency required by the actual training path.
  - Ran the standard `init.ps1` path successfully with an explicit absolute script path; it completed `uv sync --no-cache` and `uv run --no-cache python main.py`.
- Verification run:
  - `uv run --no-cache python -m pytest --basetemp=.pytest-tmp tests/unit/test_openapi_contract.py tests/unit/test_model_manifest.py tests/unit/test_unicode_evidence.py tests/unit/test_indobert_baseline.py tests/unit/test_inference_service.py apps/api/tests -q`: **39 passed** (one upstream Starlette deprecation warning).
  - `pnpm --dir apps/browser-extension check:api`: generated client has no drift from the canonical OpenAPI YAML.
  - Focused API transport/coordinator suite: **77 passed**; `pnpm --dir apps/browser-extension compile` passed.
  - Existing extension surface regression: **5 Playwright tests passed**. This covered mock-mode overlay, dynamic content, selection trigger, and simulation—not API mode.
- Notebook training setup: `notebooks/02_train_baseline.ipynb` now downloads `indobenchmark/indobert-base-p1` at revision `c2cd0b51ddce6580eb35263b39b0a1e5fb0a39e2` once into `OUTPUT_DIR/pretrained_indobert`, verifies required local checkpoint files, records source/revision/path metadata, and uses `local_files_only=True` for fine-tuning.
- Notebook setup verification: JSON parsed; all 15 Python notebook cells excluding the intentional `%pip` cell compiled; `tests/unit/test_indobert_baseline.py tests/unit/test_model_manifest.py` passed (**17 tests**). No checkpoint download or fine-tuning was run locally.
- Packaged the imported Colab model as `models/checkpoints/indobert-sampled-baseline-v0.1.0` with the unchanged 474.7 MiB `model.safetensors`, API binary label metadata (`non_judol: 0`, `judol: 1`), converted `split-manifest.json`, and a manifest tied to `data/annotation/dataset_sampled_2384_labeled.xlsx`. `artifact-provenance.json` explicitly identifies it as `sampled_notebook_baseline`; it is not the final human-annotation artifact.
- Real local FastAPI verification with `JUDOLLENS_MODEL_ARTIFACT=models/checkpoints/indobert-sampled-baseline-v0.1.0`: `/health`, `/predict`, and `/predict/batch` returned HTTP 200 with `is_mock: false`; batch preserved IDs and classified `bonus slot` as `judol` (0.999353) and `saya menonton berita hari ini` as `non_judol` (0.000490).
- Packager/API regression: `uv run --no-cache python -m pytest --basetemp=.pytest-tmp tests/unit/test_package_sampled_indobert_artifact.py tests/unit/test_model_manifest.py tests/unit/test_inference_service.py apps/api/tests -q`: **24 passed** (one upstream Starlette deprecation warning).
- Artifact training decision:
  - The default clean-model training reached 12 of 618 steps in the first epoch on CPU-only hardware, measuring roughly 24–39 seconds per step. Default Trainer behavior would take approximately 12–20 hours for three epochs.
- Known risk or unresolved issue:
  - The sampled artifact is now runnable locally, but `API-001` remains blocked for final acceptance because it is trained from `dataset_sampled_2384_labeled.xlsx`, not a final human annotation dataset. The API-mode browser extension/overlay/screenshot has not yet been verified with this real server.
  - The clean baseline deliberately sends raw text to the tokenizer and provides Unicode spans only as evidence; Unicode-normalization/adversarial robustness needs the separate experiment plan.
- Next best step:
  - Start FastAPI with the sampled artifact, configure the extension API endpoint, and execute its actual API-mode manual/DOM batch surface checks. Use `dataset_final.xlsx` for the final artifact when human annotation is complete.


## Session 082

- Date: 2026-09-14
- Goal: repair the browser extension's invalid local simulation match pattern before API-mode UI verification.
- Root cause:
  - `entrypoints/content.ts` declared `http://localhost:*/*` and `http://127.0.0.1:*/*`. Chrome match patterns already cover every port when the pattern omits the port; a port in the hostname is invalid. WXT emitted those entries into the content-script manifest, and the background runtime's matcher rejected them.
- Completed:
  - Removed the two invalid port-bearing content-script patterns; retained valid `http://localhost/*` and `http://127.0.0.1/*` entries, which match local simulation pages on any port.
  - Added a regression that builds/reads the generated manifest and rejects any content-script match pattern whose hostname contains a port.
- Verification run:
  - RED: focused regression failed against the generated manifest because it contained the two invalid patterns.
  - GREEN: `pnpm --dir apps/browser-extension build && pnpm --dir apps/browser-extension exec vitest run src/background/background-coordinator.test.ts`: build succeeded; **14 passed**.
  - `pnpm --dir apps/browser-extension compile`: passed.
  - `pnpm --dir apps/browser-extension test:run`: **78 passed**.
  - `pnpm --dir apps/browser-extension test:e2e`: **9 passed**; rebuilt extension injected overlays in the local simulation flow.
  - `graphify update .`: passed; graph updated to 1,981 nodes, 3,653 edges, and 149 communities.
- Known risk or unresolved issue:
  - The API server launch attempted during this repair exited with WinError 10048 because another process was already listening on `127.0.0.1:8000`; the original server remained the port owner. This is a port collision, not an artifact-loading failure.
  - The real-server API-mode overlay, non-mock metadata, latency, 503 behavior, and screenshot remain separate API-001 acceptance work.
- Next best step:
  - Reload the rebuilt extension from `apps/browser-extension/.output/chrome-mv3`, then run its API-mode simulation against the already-running local server.
## Session 080

- Date: 2026-09-13
- Goal: menyiapkan seluruh perubahan kerja yang belum tercommit menjadi commit
  terstruktur dan aman dari artefak data X mentah.
- Completed:
  - Menambahkan pengecualian `.gitignore` untuk semua capture `SearchTimeline`
    lokal: `configs/query_x_*.js`, `configs/scraping_x/`, dan
    `configs/x-search-timeline-*.json`; payload mentah tidak akan masuk staging.
  - Mengabaikan backup lokal `configs/telegram_seeds copy.json`; registry
    `configs/telegram_seeds.json` tetap menjadi satu-satunya konfigurasi seed
    Telegram yang versioned.
  - Memperbaiki lifecycle `chrome.debugger` collector X GraphQL: **Clear** dan
    kegagalan `Network.enable` sekarang membuang response pending lalu melepas
    debugger, sehingga indikator debugger dan callback terlambat tidak tertinggal.
  - Menambahkan dua regresi lifecycle dan memperbarui panduan Clear serta
    evidence `COL-004`.
  - Membagi perubahan menjadi delapan Conventional Commits untuk dependensi,
    annotation, collection, collector X Camoufox, dataset tools, collector
    GraphQL, research, dan hygiene Git.
- Verification run:
  - Focused Python suite untuk annotation, collection, deduplication, importer,
    balanced/Excel sampling, dan integrasi: **141 passed**.
  - `pnpm test && pnpm compile` pada `apps/x-graphql-collector`: **18 tests
    passed** dan TypeScript lulus.
  - RED lifecycle: dua test baru gagal terhadap implementasi lama karena
    `chrome.debugger` tidak terlepas.
  - GREEN lifecycle: `pnpm vitest run src/monitor/debugger-monitor.test.ts`
    **7 passed**; `pnpm compile` lulus.
  - `git check-ignore -v` mengonfirmasi seluruh pola capture X mentah ditutup
    oleh `.gitignore`.
- Known risk or unresolved issue:
  - `COL-004` masih membutuhkan pilot manual pada tab X yang dikelola peneliti;
    tidak ada kredensial atau raw response yang dikomit.
  - `init.ps1` tidak dapat dijalankan karena file tersebut tidak ada di worktree;
    ini adalah kondisi repository saat ini, bukan kegagalan perubahan.
- Next best step:
  - Commit perubahan siap-commit menurut batas fitur; simpan raw capture X tetap
    lokal dan ter-ignore.


## Session 079

- Date: 2026-08-19
- Goal: memperbaiki `PermissionError [WinError 5]` saat anotasi menyimpan checkpoint di Windows.
- Root-cause investigation:
  - Error terjadi pada `os.replace(temporary_name, self.path)` di
    `src/judol_detection/annotation/state.py`, setelah baris cache berhasil
    diproses; bukan error provider/API.
  - Percobaan dengan path absolut tetap gagal, sehingga path relatif bukan akar
    masalah.
  - Checkpoint tidak read-only, ACL folder/file mengizinkan modify, dan operasi
    `os.replace()` terhadap file aktual berhasil setelah proses berhenti.
  - PID Python yang ditemukan adalah worker service `odoo-server-18.0`, bukan
    proses anotasi kedua.
  - Bukti konsisten dengan lock transien Windows Defender/indexer atau file
    filter driver saat replace berjalan.
- Completed:
  - Menambahkan retry 8 kali dengan jeda 250 ms hanya ketika `os.replace()`
    checkpoint mendapat `PermissionError`; atomic temporary-file write dan
    cleanup tetap dipertahankan.
  - Menambahkan regresi yang mensimulasikan satu kegagalan permission transien
    lalu memastikan replace kedua berhasil.
- Verification run:
  - Tes regresi awal RED: satu `PermissionError` langsung menggagalkan
    `CheckpointStore.initialize()` sebelum retry tersedia.
  - Focused state/pipeline/CLI tests passed **22 tests**.
  - Full `uv run --no-cache python -m pytest --basetemp=.pytest-tmp` passed
    **162 tests**.
  - Compileall dan `git diff --check` untuk file perubahan passed.
- Known risk or unresolved issue:
  - Jika lock Windows berlangsung lebih dari 1,75 detik atau merupakan lock
    permanen, retry tetap akan gagal dan proses berhenti tanpa merusak checkpoint
    final; temporary file dibersihkan.
- Next best step:
  - Ulangi command resume yang sama dari root repo; checkpoint yang sudah ada
    tidak perlu dihapus.

## Session 078

- Date: 2026-08-19
- Goal: membuat CSV gabungan dari sampling acak setiap sheet pada workbook dataset.
- Completed:
  - Menambahkan `scripts/sample_excel_sheets.py` dengan input/output CLI,
    sampling maksimal per sheet, seed lokal reproducible, pengabaian baris kosong,
    union header, provenance `source_sheet`, dan atomic CSV replacement.
  - Menambahkan 11 focused unit tests untuk quota sheet, sheet pendek,
    reproducibility, validasi parameter, collision header, preservasi output saat
    gagal, missing input, union header, Unicode, dan CLI CSV output.
  - Mendokumentasikan command pada `scripts/README.md`; desain dan rencana lokal
    disimpan di `docs/superpowers/`.
- Verification run:
  - Tes RED sebelum implementasi gagal karena modul `scripts.sample_excel_sheets`
    belum tersedia.
  - Focused `uv run --no-cache python -m pytest --basetemp=.pytest-tmp tests/unit/test_sample_excel_sheets.py`
    passed **11 tests**.
  - Compileall untuk script dan test passed.
  - Command aktual dengan `data/processed/dataset.xlsx`, `--n-per-sheet 400`,
    dan `--seed 42` menghasilkan `data/processed/dataset_sampled_2384.csv`
    dengan **2.384 rows**: `tele_positif=400`, `x_negatif=384`,
    `yt_negatif=400`, `yt_positif=400`, `tele_negatif=400`, dan `x_positif=400`.
  - Full suite final `uv run --no-cache python -m pytest --basetemp=.pytest-tmp`
    passed **161 tests**; focused suite final passed **11 tests**.
  - Compileall, `uv run --no-cache python main.py`, dan validasi JSON
    `feature_list.json` passed.
  - `graphify update .` passed on retry after a first 5-minute timeout; graph
    diperbarui menjadi 1.680 nodes, 2.981 edges, dan 130 communities.
  - `git diff --check` menunggu pemeriksaan penutupan sesi.
- Known risk or unresolved issue:
  - CSV generated bersifat local/ignored dan perlu dibuat ulang jika workbook
    input berubah.
  - Kolom input bernama `source_sheet` ditolak karena nama tersebut dicadangkan
    untuk provenance output.
- Next best step:
  - Jalankan full suite final, `main.py`, `graphify update .`, lalu review diff.

## Session 077

- Date: 2026-08-18
- Goal: menambahkan quota dokumen baru per channel pada collector Telegram.
- Completed:
  - Menambahkan flag `--target-documents-per-channel N` tanpa mengubah perilaku default collector.
  - Quota dihitung dari row yang benar-benar inserted setelah filtering dan deduplikasi; collector membaca tanpa batas pesan tetap sampai quota tercapai atau channel habis.
  - Quota berlaku pada discovery/snowball, targeted multi-query, incremental, full-history, dan control mode; `--max-channels` tetap menjadi batas total channel.
  - Menolak quota non-positif dan kombinasi quota dengan `--max-messages-per-channel`, termasuk bentuk `--max-messages-per-channel=...`.
  - Menambahkan quota ke progress event, dry-run output, dan `collection_runs.config_json`.
  - Menambahkan focused tests untuk quota tercapai, channel habis, CLI acceptance, dan konflik flag.
- Verification run:
  - Red focused tests sebelum implementasi menangkap argument collector dan CLI yang belum tersedia.
  - Focused Telegram collector/CLI tests passed **14 tests**.
  - `uv run --no-cache python scripts/collect_telegram.py --help` menampilkan `--target-documents-per-channel`.
  - Dry-run quota 100 passed dengan `max_messages_per_channel=None target_documents_per_channel=100`.
  - Konflik quota + message limit ditolak dengan error actionable.
  - Compileall dan `git diff --check` dijalankan; tidak ada whitespace error selain warning line-ending existing.
- Known risk or unresolved issue:
  - Full repository suite tidak diulang pada feature ini sesuai permintaan untuk menghindari proses panjang; focused verification lulus.
  - Live Telegram quota collection belum dijalankan pada akun/session nyata.
- Next best step:
  - Jalankan pilot live dengan `--target-documents-per-channel 100` ke database baru dan audit progress per channel.

## Session 076

- Date: 2026-08-18
- Goal: mengamankan short-template URL deduplication agar tidak menghapus pesan non-promosi dan memperbaiki snapshot SQLite WAL.
- Completed:
  - Menemukan bahwa aturan URL-prefix awal terlalu luas: URL generik bersama dan 8 token boilerplate dapat dianggap duplicate.
  - Membatasi aturan baru dengan evidence promosi pada kedua pesan melalui weak-label evidence.
  - Menormalkan URL untuk perbandingan dengan lowercase hostname, penghapusan trailing slash/punctuation, dan pengabaian fragment; variasi scheme `http`/`https` tetap setara.
  - Mengganti `shutil.copy2()` pada cleanup dengan SQLite backup API agar row committed di `-wal` ikut tersnapshot.
  - Menambahkan regresi untuk URL generik, URL promotion variants, cleanup false-positive, dan database WAL.
- Verification run:
  - Red tests menangkap 4 kegagalan: URL generik salah dianggap duplicate, URL promotion variants terlewat, cleanup false-positive, dan snapshot WAL kosong.
  - Focused deduplication/cleanup tests passed **19 tests** setelah implementasi final.
  - Direct behavior check passed: short `byn88` template returns `True`; generic/news URL pair returns `False`.
  - Cleanup aktual ke output temporary final: input `869`, removed `817`, output `52`; source tetap `869`, dan `byn88link` + `neweravip` turun dari `819` menjadi `2`.
  - Full `uv run --no-cache python -m pytest --basetemp=.pytest-tmp` started with **146 collected tests** but the tool timeout interrupted it around 67% without a test failure; this is incomplete verification, not a red test result.
  - `graphify update .` also exceeded the tool timeout after AST extraction; no code failure was reported.
- Known risk or unresolved issue:
  - Output `data/interim/telegram_full_history_dedup.sqlite` yang dibuat sebelum perbaikan tetap merupakan snapshot lama dan harus dihapus/rename atau diganti dengan path output baru sebelum cleanup ulang.
  - Aturan short-template memakai ambang 8 token plus evidence promosi; audit manual tetap diperlukan untuk dataset final.
  - Full-suite verification must be rerun separately with a longer timeout before marking the repository-wide gate green.
- Next best step:
  - Jalankan full test suite, cleanup ulang `telegram_full_history.sqlite` ke output baru, lalu audit row yang dipertahankan.

## Session 075

- Date: 2026-08-18
- Goal: memperbaiki cleanup database Telegram untuk template pendek dengan URL promosi yang sama.
- Completed:
  - Menemukan akar masalah pada `telegram_full_history.sqlite`: 819 row `byn88link`/`neweravip` hanya memiliki 9 token prefix bersama setelah URL dibuang, sementara shared-prefix lama mensyaratkan minimal 20 token.
  - Menambahkan aturan konservatif: URL promosi yang sama dan minimal 8 token prefix bersama dianggap near-duplicate; URL sama tanpa prefix template tidak cukup.
  - Menambahkan regresi unit untuk template `jam segini dyon...` dan regresi integrasi cleanup database.
- Verification run:
  - Red tests mereproduksi kasus: `is_near_duplicate()` false dan cleanup menghapus 0 row pada fixture dengan template 9-token.
  - Focused deduplication/cleanup tests passed **12 tests** setelah implementasi.
  - Cleanup verifikasi terhadap source aktual memakai output temporary: input `869`, removed `817`, output `52`; row `byn88link` + `neweravip` turun dari `819` menjadi `2`.
  - Dua row yang dipertahankan berbeda secara struktur: satu template daftar nama dan satu pesan `gacor2` pendek dengan `panggilan selesai`; pasangan tersebut tidak lagi near-duplicate.
- Known risk or unresolved issue:
  - `data/interim/telegram_full_history_dedup.sqlite` yang dibuat sebelum perbaikan tetap berisi 869 row; cleanup harus dijalankan ulang ke output baru atau setelah output lama diaudit/dihapus.
  - Aturan URL-prefix sengaja memakai ambang 8 token untuk template pendek; audit manual tetap diperlukan sebelum menjadikan salinan sebagai dataset final.
- Next best step:
  - Jalankan full test suite dan gunakan output database baru untuk audit manual sebelum mengganti artifact dedup lama.

## Session 074

- Date: 2026-08-18
- Goal: memperbaiki near-duplicate Telegram untuk template Unicode dan statistik duplicate run.
- Completed:
  - Canonicalizer deduplikasi sekarang melakukan NFKC normalization dan menghapus Unicode format/invisible characters sebelum tokenisasi.
  - `is_near_duplicate()` tidak lagi menganggap dua pesan tanpa canonical token sebagai duplicate, sehingga URL-only yang berbeda tidak runtuh menjadi satu record.
  - Near-duplicate yang ditolak sekarang menambah `fetched_count` dan `duplicate_count` pada `collection_runs`, konsisten dengan exact duplicate.
  - Menambahkan regresi unit/integrasi untuk Mathematical Bold template, URL-only variants termasuk seluruh posisi invisible character pada bare `t.me`, counter run, candidate/control mode, empty document, dan template dengan variable tail.
- Verification run:
  - Red focused tests sebelum implementasi menangkap 4 kegagalan: Mathematical Bold tidak terdeteksi, URL-only salah dianggap duplicate, dan counter near-duplicate tidak bertambah.
  - Focused deduplication/storage tests passed **21 tests**, termasuk bare Telegram URL dengan invisible character di path/hostname, candidate-mode default, dan empty document guard.
  - Full `uv run --no-cache python -m pytest --basetemp=.pytest-tmp` passed **136 tests**.
  - `uv run --no-cache python -m compileall -q ...` untuk modul dan test deduplikasi passed; `git diff --check` tidak menemukan whitespace error selain warning line-ending existing.
  - Cleanup ke output sementara memakai implementasi baru: `telegram_snowball.sqlite` tetap 177 dokumen; salinan output menghapus 91 near-duplicate dan menyisakan 86 dokumen. Row dengan template `owlmemberclickhere` turun dari 91 menjadi 2 pada salinan.
- Known risk or unresolved issue:
  - Cleanup database lama harus dijalankan eksplisit ke output baru; collector tidak memutasi record yang sudah tersimpan.
  - Perbandingan live masih memindai seluruh dokumen tersimpan, sehingga biaya deduplikasi bertumbuh kuadratik pada database besar.
  - Registry candidate/control sebaiknya dipisah karena CLI mengambil semua entry yang aktif dari file registry yang diberikan; storage API kini tetap memaksa candidate mode candidate-only.
  - URL zero-width variants are covered for `t.\u200bme`, `t\u200b.me`, `t.m\u200be`, and `t.me\u200b` positions; empty control messages are rejected before weak labeling.
- Next best step:
  - Audit manual dua row `owlmemberclickhere` yang dipertahankan pada salinan dan jalankan `graphify update .` setelah perubahan kode.

## Session 073

- Date: 2026-08-18
- Goal: menambahkan command untuk membersihkan near-duplicate dari database collection yang sudah ada tanpa mengubah database sumber.
- Completed:
  - Menambahkan `scripts/deduplicate_database.py` dengan input/output SQLite terpisah, default threshold `0.75`, validasi path, koneksi source read-only, dan cleanup berbasis `is_near_duplicate()` yang sudah ada.
  - Dokumen diproses berdasarkan `document_id`; dokumen pertama dipertahankan sebagai canonical record dan anotasi pada dokumen yang dihapus dipindahkan ke canonical record.
  - Menambahkan test integrasi untuk source preservation, penghapusan near-duplicate, pemindahan anotasi, dan penolakan input/output path yang sama.
  - Mendokumentasikan workflow cleanup pada `docs/collection/telegram-collector.md` serta menyimpan desain dan implementation plan di `docs/superpowers/`.
  - Membuat artifact lokal `data/interim/telegram_full_history_dedup075.sqlite` dari `telegram_full_history.sqlite`.
- Verification run:
  - Red test sebelum implementasi: import `scripts.deduplicate_database` gagal karena command belum ada.
  - Focused cleanup dan deduplication tests passed **6 tests**.
  - Full `uv run --no-cache python -m pytest --basetemp=.pytest-tmp` passed **130 tests**.
  - `uv run --no-cache python -m compileall -q scripts/deduplicate_database.py tests/integration/test_deduplicate_database.py` passed.
  - `uv run --no-cache python scripts/deduplicate_database.py --help` menampilkan opsi `--database`, `--output`, dan `--threshold`.
  - `git diff --check` selesai tanpa whitespace error; hanya warning line-ending existing.
  - Cleanup nyata threshold `0.75`: 869 dokumen input, 15 near-duplicate dihapus, 854 dokumen output; source tetap 869 dokumen, 3 collection runs tetap ada, dan 0 orphan annotations.
  - `graphify update .` passed; graph menjadi 1.622 nodes, 2.840 edges, dan 132 communities. Graphify memberi warning non-blocking untuk 22 file JSON yang menghasilkan zero AST nodes dan mempertahankan 16 node dari file yang keluar dari scan corpus.
- Known risk or unresolved issue:
  - Cleanup mempertahankan record dengan `document_id` terkecil, bukan memilih record paling lengkap atau paling representatif.
  - Artifact output belum diekspor ulang ke CSV/Parquet; audit manual tetap perlu dilakukan sebelum anotasi final.
- Next best step:
  - Audit sampel 15 record yang dihapus dan bandingkan export output sebelum menggunakan database deduplicated sebagai dataset anotasi.

## Session 072

- Date: 2026-08-18
- Goal: menambahkan log progress real-time pada pipeline anotasi AI concurrent.
- Completed:
  - Menambahkan `PipelineProgress` dan callback counter-only pada `AnnotationPipeline`.
  - Menambahkan flag CLI `--progress-every N` dengan default `10`; `0` menonaktifkan log berkala dan progress final tetap dicetak saat selesai/pause.
  - Log menampilkan completed/total, persentase, API request, cache hit, pending, retry/error, dan distribusi label tanpa mencetak teks mentah atau credential.
  - Memperbarui `docs/annotation-agent-quickstart.md` dengan opsi progress dan contoh penggunaan.
- Verification run:
  - Red test sebelum implementasi: import `PipelineProgress` gagal karena kontrak belum ada.
  - Red regression tests menangkap queued request setelah provider quota, completed event sebelum output write, dan callback exception yang menggagalkan output.
  - Focused annotation tests passed **15 tests** setelah hardening tersebut.
  - Full `uv run --no-cache python -m pytest --basetemp=.pytest-tmp` passed **128 tests**.
  - `uv run --no-cache python -m compileall -q src/judol_detection/annotation scripts/annotate_judol.py tests/unit/test_annotation_pipeline.py tests/integration/test_annotate_judol_cli.py` passed.
  - `uv run --no-cache python scripts/annotate_judol.py --help` menampilkan `--progress-every`.
  - `git diff --check` passed untuk file feature; `graphify update .` passed dan graph menjadi 1.608 nodes, 2.815 edges, 130 communities.
- Known risk or unresolved issue:
  - Progress dicetak setelah row menjadi terminal/checkpoint; request yang sedang menunggu provider belum memiliki heartbeat per detik.
- Next best step:
  - Jalankan resume annotation dengan `--progress-every 10`, lalu verifikasi log `Progress [...]` dan full test suite.

## Session 071

- Date: 2026-08-17
- Goal: mendeteksi bahasa utama sebelum klasifikasi promosi judol.
- Completed:
  - Menambahkan label terminal keempat `not_indonesian` ke enum, JSON Schema, parser, cache, checkpoint, pipeline summary, dan preflight CLI.
  - Memperbarui skill Bahasa Indonesia: mayoritas bahasa asing menghasilkan `{"label":"not_indonesian"}`; teks campuran mengikuti bahasa mayoritas; bahasa Indonesia dengan URL, brand, slang, atau beberapa kata asing tetap diproses; teks kosong tetap `perlu_review`.
  - Memastikan label existing `not_indonesian` tidak dikirim ulang ke API.
  - Memperbarui `docs/agent-annotation-prd.md` dan `docs/annotation-agent-quickstart.md` dengan aturan language-first dan enum keempat.
  - Menambahkan regresi test untuk schema empat label, cache/checkpoint, pipeline, dan existing label.
- Verification run:
  - Test anotasi fokus: **23 passed**.
  - `not_indonesian` diterima sebagai hasil terminal dan masuk summary label.
  - Existing `not_indonesian` tidak menghasilkan request API tambahan.
  - Full `uv run --no-cache python -m pytest --basetemp=.pytest-tmp` passed **124 tests**.
  - `uv run --no-cache python -m compileall -q src/judol_detection/annotation scripts/annotate_judol.py` passed.
  - `uv run --no-cache python scripts/annotate_judol.py --help` passed; `feature_list.json` valid; `git diff --check` passed.
- Known risk or unresolved issue:
  - Deteksi bahasa dilakukan oleh LLM melalui skill, bukan classifier bahasa lokal; kualitas bergantung pada model provider.
  - Belum ada gold set manusia untuk mengukur akurasi deteksi bahasa atau distribusi false `not_indonesian`.
- Next best step:
  - Jalankan full `uv run --no-cache python -m pytest --basetemp=.pytest-tmp`, compileall, dan pilot endpoint nyata dengan teks Indonesia, Inggris, serta campuran.

## Session 070

- Date: 2026-08-17
- Goal: membuat snapshot dataset balanced reproducible dari enam database canonical tanpa mengubah database sumber.
- Completed:
  - Menambahkan `scripts/sample_balanced_dataset.py` dengan source mapping X/YouTube/Telegram, quota per strata, seed reproducible, deduplikasi hash konflik positif-negatif per platform, dan provenance per dokumen.
  - Menambahkan output CSV, Parquet, SQLite, dan manifest JSON di `data/processed/`; SQLite output memiliki tabel `documents`, `annotations` kosong yang kompatibel dengan schema anotasi, dan satu `sampling_manifest`.
  - Memperbarui `docs/dataset.md` dan plan sampling dengan command, lokasi artifact, batasan weak label/pool label, serta provenance.
  - Menambahkan feature `COL-007` sebagai passing setelah verifikasi.
- Verification run:
  - Red focused run sebelum implementasi: import sampler gagal karena script belum ada.
  - Focused sampler tests setelah implementasi awal: 4 passed.
  - Focused sampler tests setelah hardening reproducibility/provenance/output: 5 passed.
  - `uv run --no-cache python scripts/sample_balanced_dataset.py --quota 384 --seed 42 --output-dir data/processed` berhasil; `SELECTED: 2304`.
  - Output SQLite: 2.304 rows; masing-masing `platform × pool_label` berisi 384; pool positive 1.152 dan negative 1.152; duplicate hash global 0; cross-platform hash overlap 0; conflict hash YouTube yang dibuang 4.
  - Full `uv run --no-cache python -m pytest --basetemp=.pytest-tmp` passed 121 tests.
  - `uv run --no-cache python -m compileall -q scripts/sample_balanced_dataset.py tests/unit/test_sample_balanced_dataset.py` passed; `git diff --check` completed without whitespace errors (existing line-ending warnings only).
  - `init.ps1` passed and printed `Judol Detection monorepo is ready.`; `graphify update .` passed and reported 1.591 nodes, 2.745 edges, and 137 communities.
- Known risk or unresolved issue:
  - `positive` dan `negative` adalah provenance collection pool, bukan label ground truth; tabel annotations output masih kosong dan anotasi manusia tetap diperlukan.
  - Artifact dataset dan database interim bersifat local/generated dan di-ignore Git; manifest JSON adalah bukti reproducibility yang dipertahankan bersama worktree lokal.
- Next best step:
  - Anotasi human pada snapshot balanced dan audit khusus terhadap pool natural/hard sebelum menetapkan label ground truth final; jangan menganggap `pool_label` atau `weak_label` sebagai label anotasi.

## Session 069

- Date: 2026-08-17
- Goal: menyederhanakan importer X control agar tidak memerlukan `sample_type`.
- Completed:
  - Menghapus flag `--sample-type` dari `scripts/import_x_files.py`.
  - `--sample-mode control` sekarang dapat mengimpor file natural dan hard negative bersama-sama ke satu database.
  - Default `candidate` tetap dipertahankan untuk import positif lama.
  - Dokumentasi X diperbarui; provenance tetap dapat diaudit melalui file input, `raw_payload_path`, dan `collection_runs`.
- Verification run:
  - `tests/unit/test_import_x_files_cli.py` passed **3 tests**.
  - `uv run --no-cache python -m compileall -q scripts/import_x_files.py` passed.
  - Tidak ada referensi `sample-type` tersisa pada script/dokumentasi.
- Known risk or unresolved issue:
  - Kategori natural/hard tidak disimpan sebagai kolom terpisah pada importer X; gunakan provenance file dan run saat sampling/anotasi.
- Next best step:
  - Jalankan import seluruh file extension X terpilih dengan satu command `--sample-mode control` ke `data/interim/x_negative.sqlite`.

## Session 067

- Date: 2026-08-17
- Goal: menyamakan import hasil extension X dengan mode control dan memastikan YouTube Data API control menyimpan hasil tanpa keyword.
- Completed:
  - `scripts/import_x_files.py` menerima `--sample-mode candidate|control`; control tidak memerlukan `sample_type`.
  - Default importer tetap `candidate`; mode control menyimpan item extension dengan `weak_label=0` dan tetap menjalankan filter bahasa serta deduplikasi.
  - `scripts/collect_youtube_api.py` mendukung `--sample-mode control`, memakai database control default, dan tidak membuang metadata tanpa keyword.
  - Dokumentasi X dan YouTube diperbarui dengan command control.
- Verification run:
  - Importer fixture control passed: `parsed=2`, `inserted=2`, `non_candidate=0`.
  - `tests/unit/test_import_x_files_cli.py` passed **3 tests**.
  - YouTube Data API negative registry dry-run passed dengan `sample_mode=control`.
  - `uv run --no-cache python -m compileall -q scripts/import_x_files.py scripts/collect_youtube_api.py` passed.
- Known risk or unresolved issue:
  - Live import semua file pada folder `configs/x` dan live YouTube Data API control belum dijalankan pada sesi ini.
- Next best step:
  - Jalankan importer control dengan seluruh file extension X yang dipilih, lalu audit jumlah row dan provenance pada database negatif X.

## Session 066

- Date: 2026-08-17
- Goal: menambahkan konfigurasi dan jalur collection terpisah untuk natural negative serta hard negative dari X, YouTube, dan Telegram tanpa menimpa konfigurasi positif.
- Completed:
  - Menambahkan `configs/x_negative_queries.json` dan `configs/youtube_negative_queries.json` dengan kelompok `natural` dan `hard`.
  - Menambahkan `configs/telegram_control_seeds.json` terpisah dari `configs/telegram_seeds.json`, dengan seed publik bertopik berita, bisnis, dan hukum.
  - Menambahkan flag `--sample-mode candidate|control` ke collector X, YouTube metadata/API, dan Telegram; default lama tetap `candidate`.
  - Mode `control` menyimpan natural document `weak_label=0` serta hard negative yang memiliki keyword evidence untuk anotasi manual, dan tidak melakukan snowball dari seed kontrol Telegram.
  - Memperbarui panduan X, YouTube, Telegram, dan dataset agar membedakan provenance sampling dari label final.
- Verification run:
  - `init.ps1` berhasil; baseline mencetak `Judol Detection monorepo is ready.`
  - Focused control-mode/storage tests passed **29 tests**.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-tmp` passed **115 tests**.
  - Dry-run registry positif dan registry negative/control untuk X, YouTube, serta Telegram berhasil.
  - Seluruh enam file config JSON valid.
  - `uv run --no-cache python -m compileall -q ...` untuk modul collector/storage dan CLI berubah berhasil.
  - `git diff --check` selesai dengan warning line-ending yang sudah ada pada working tree, tanpa error whitespace.
  - Live Telegram control collection selesai ke `data/interim/telegram_negative.sqlite`: run discovery menyimpan 386 dokumen dan run targeted menyimpan 71 dokumen, total 457 dokumen setelah deduplikasi.
  - Run targeted membaca 77 hasil pesan dari empat channel kontrol dan menyimpan 71 dokumen; `bbcindonesia` tidak mengembalikan hasil untuk enam query targeted.
- Known risk or unresolved issue:
  - Query dan seed control menghasilkan sampel kandidat kontrol, bukan label `bukan_judol`; anotasi manual tetap wajib.
  - Ketersediaan dan isi channel Telegram publik dapat berubah; jalankan dry-run dan pilot kecil sebelum collection besar.
  - Live X dan YouTube control scraping belum dijalankan; live Telegram control scraping sudah selesai pada database negatif khusus.
  - `sample_type` dari registry kontrol disimpan pada kolom nullable `documents.sample_type`; dokumen dari config positif lama tetap `NULL`.
  - Pada hasil live ini, `sample_type` Telegram mengikuti tipe seed channel. Karena run targeted memakai query hard tetapi mengunjungi seed natural dan hard, gunakan `collection_runs.run_id` untuk audit dan perlakukan seluruh run targeted sebagai hard-negative provenance sebelum sampling final.
- Next best step:
  - Jalankan pilot kecil terpisah per platform ke database baru, export hasilnya, lalu anotasi natural/hard negative sebelum digabung ke dataset final.

## Session 065

- Date: 2026-08-16
- Goal: mengaudit jumlah dokumen interim X, YouTube, dan Telegram serta memastikan berapa yang terdeteksi berbahasa Indonesia.
- Completed:
  - Menggunakan database canonical sesuai `docs/data-interim.md`: `data/interim/x.sqlite`, `data/interim/youtube_api_user_run.sqlite`, dan `data/interim/telegram_full_history.sqlite`.
  - Menghitung 424 dokumen X, 1.048 dokumen YouTube, dan 869 dokumen Telegram; jumlah gabungan 2.341 dokumen.
  - Audit ulang seluruh teks dengan `detect_indonesian_language`: X 314 `id` dan 110 `uncertain`; YouTube 648 `id` dan 400 `uncertain`; Telegram 333 `id`, 123 `uncertain`, dan 413 `non_id`.
  - Memeriksa `telegram_user_run.sqlite`: 5 dokumen tidak ditambahkan ke total canonical Telegram; terdapat 3 irisan berdasarkan `text_hash_normalized` dengan full history.
  - Tidak ditemukan irisan `text_hash_normalized` antar tiga database canonical X, YouTube, dan Telegram.
- Verification run:
  - `.\init.ps1` berhasil; baseline mencetak `Judol Detection monorepo is ready.`
  - Inspeksi tabel SQLite dan audit bahasa lokal berhasil dijalankan melalui `uv run --no-cache python -`.
- Known risk or unresolved issue:
  - `id` berarti lolos detektor bahasa lokal dengan ambang confidence 0,60, bukan kepastian linguistik atau label anotasi manusia.
  - X dan YouTube menyimpan item `uncertain` karena filter strict hanya menolak `non_id`; Telegram tidak mengisi `language_hint` saat collection dan masih memuat 413 item yang terdeteksi non-Indonesia.
  - `weak_label` adalah label kandidat keyword, bukan label bahasa maupun label final promosi judol.
- Next best step:
  - Lanjutkan EDA dan audit manual kategori `uncertain`/`non_id` sebelum menetapkan dataset final berbahasa Indonesia.

## Session 064

- Date: 2026-08-16
- Goal: memperbaiki dropdown mode Populer yang otomatis kembali ke Terbaru saat popup melakukan polling state.
- Completed:
  - Menemukan root cause kedua pada `refresh()`: `setSearchProduct(response.state.search_product)` selalu menimpa pilihan user dengan mode sesi lama setiap 750 ms.
  - Menambahkan `src/popup/search-product-model.ts` dengan state `value/touched`; polling hanya menghidrasi dropdown sebelum user menyentuhnya.
  - Popup sekarang mengirim mode `Top` yang dipilih user saat **Mulai monitor**, tanpa dropdown kembali ke `Latest` selama polling.
- Verification run:
  - Regression test model dropdown ditambahkan dan test-first dijalankan.
  - `pnpm test` di `apps/x-graphql-collector` passed **18 tests**.
  - `pnpm compile` passed.
  - `pnpm build` passed.
  - Python importer focused tests passed **7 tests**.
- Known risk or unresolved issue:
  - Bundle Chrome yang sedang ter-load masih dapat berisi versi lama sampai extension di-reload dari `chrome://extensions`.
- Next best step:
  - Buka `chrome://extensions`, klik **Reload** pada X GraphQL Collector, pilih **Populer (Top)**, dan pastikan dropdown tetap Top sebelum menekan Mulai monitor.

## Session 063

- Date: 2026-08-16
- Goal: menambahkan dropdown pilihan produk pencarian X, Terbaru atau Populer.
- Completed:
  - Menambahkan `SearchProduct = 'Latest' | 'Top'` ke kontrak extension dan `search_product` ke `MonitorState` dengan default `Latest`.
  - Popup sekarang memiliki dropdown `Terbaru (Latest)` dan `Populer (Top)`; pilihan dikirim saat **Mulai monitor** dan dinonaktifkan ketika monitoring aktif.
  - `DebuggerMonitor` menerapkan exact filter terhadap `variables.product`; mode mismatch masuk `ignored_count`, sedangkan response HTTP error tetap masuk `error_count`.
  - Menampilkan mode aktif pada status card dan mendokumentasikan workflow Stop/Edit/Start tanpa navigasi otomatis halaman X.
- Verification run:
  - TDD red run: test mode Top gagal sebelum monitor menyimpan `search_product`.
  - Focused monitor tests passed **16 tests**.
  - Full extension test suite passed **16 tests**.
  - `pnpm compile` passed.
  - `pnpm build` passed.
  - Python importer focused tests passed **7 tests**.
- Known risk or unresolved issue:
  - Live X pilot belum dijalankan untuk memastikan parameter UI X yang dipilih benar-benar menghasilkan `product=Latest` atau `product=Top` pada response runtime.
- Next best step:
  - Reload extension, pilih mode **Populer**, mulai monitor dengan query yang sama seperti tab X, lalu cek `ignored_count` dan response count.

## Session 062

- Date: 2026-08-16
- Goal: memperbaiki input query popup X GraphQL Collector yang kembali ke query monitor lama saat polling state berjalan.
- Completed:
  - Menelusuri alur `refresh()` popup dan menemukan sinkronisasi query menggunakan closure nilai awal sehingga input user tertimpa setiap polling 750 ms.
  - Menambahkan `src/popup/query-input-model.ts` dengan state `value/touched`; polling hanya mengisi query monitor jika input belum disentuh dan masih kosong.
  - Query filter tetap dibekukan saat **Mulai monitor**; mengganti filter dilakukan dengan Stop, edit query, lalu Start lagi.
  - Memperbarui README extension dan panduan collector tentang exact match `rawQuery` dan workflow mengganti query.
- Verification run:
  - TDD red run: regression test gagal karena `query-input-model` belum ada.
  - `pnpm test -- src/popup/query-input-model.test.ts` passed **15 tests**.
  - `pnpm compile` passed.
- Known risk or unresolved issue:
  - Perubahan query saat status masih monitoring hanya mengubah input popup; filter aktif tetap query saat start sampai monitor dihentikan dan dimulai ulang.
- Next best step:
  - Reload extension, tekan Stop, ubah query ke `us deposit slot`, tekan Mulai monitor kembali, lalu pastikan `ignored_count` tidak bertambah untuk request `rawQuery=us deposit slot`.

## Session 061

- Date: 2026-08-16
- Goal: menjalankan collection YouTube berbasis YouTube Data API v3 untuk rentang 2024-2026 menggunakan `configs/youtube_queries.json`, bukan `yt-dlp`.
- Completed:
  - Menjalankan `scripts/collect_youtube_api.py` dengan 12 query aktif dari `configs/youtube_queries.json`.
  - Menggunakan `--max-pages 8`, `--published-after 2024-01-01T00:00:00Z`, `--published-before 2027-01-01T00:00:00Z`, `--region-code ID`, dan target `data/interim/youtube_api_user_run.sqlite`.
  - Menyimpan raw item API ke `data/raw/youtube-api/` tanpa menulis API key ke database atau terminal.
- Verification run:
  - `.\init.ps1` berhasil; baseline `uv run --no-cache python main.py` mencetak `Judol Detection monorepo is ready.`
  - Dry-run memuat 12 query aktif dan konfigurasi `order=date`.
  - Run baru berstatus `completed`; 3.400 hasil API mentah dilaporkan per-query dan 862 dokumen unik tersimpan setelah filter/deduplikasi.
  - Run baru (`run_id=2`) berisi 214 dokumen tahun 2024, 386 tahun 2025, dan 262 tahun 2026; rentang `published_at` adalah `2024-01-08T12:13:30Z` sampai `2026-08-16T09:00:09Z`.
  - Validasi SQLite menemukan 1.048 total dokumen pada database, termasuk 186 dokumen dari run sebelumnya (`run_id=1`), dan 2 collection runs berstatus `completed`.
  - Test fokus `tests/unit/test_youtube_api_collector.py tests/unit/test_youtube_collector.py` passed 4 tests.
- Known risk or unresolved issue:
  - Hasil Data API adalah bounded search samples, bukan arsip lengkap YouTube; `--max-pages 8` membatasi paling banyak 400 item per query sebelum filter.
  - `weak_label=1` adalah label kandidat berbasis keyword, bukan label final manusia; seluruh 862 dokumen run baru lolos sebagai kandidat.
  - Database target sudah berisi run sebelumnya, sehingga total 1.048 tidak boleh dibaca sebagai jumlah run 2024-2026 saja; gunakan `run_id=2` untuk angka run ini.
- Next best step:
  - Audit dan anotasi dokumen run `run_id=2` sebelum dipakai sebagai dataset final, lalu lanjutkan pekerjaan `COL-003`/`EDA-001` sesuai prioritas repo.

## Session 060

- Date: 2026-08-16
- Goal: mendokumentasikan langkah import JSON hasil X GraphQL extension ke database X existing.
- Completed:
  - Menambahkan subbagian `Import hasil extension ke database X existing` pada `docs/collection/x-collector.md`.
  - Menambahkan command PowerShell untuk input dari Downloads dan `configs`, keduanya memakai `--input` secara eksplisit dan target `data/interim/x.sqlite`.
  - Menambahkan dry-run, backup database opsional, penjelasan collection run baru, deduplikasi, provenance `x_graphql_extension_json`, arti setiap counter import, dan query verifikasi jumlah dokumen.
  - Menambahkan alur ringkas yang sama ke `apps/x-graphql-collector/README.md`.
- Verification run:
  - Dry-run `configs\x-search-timeline-slot-gacor.json` berhasil: `source=normalized | items=200`.
  - Dry-run `$env:USERPROFILE\Downloads\x-search-timeline-slot-gacor.json` berhasil: `source=normalized | items=160`.
  - `feature_list.json` valid dan `git diff --check` selesai; diff check hanya melaporkan warning line-ending pada file lama.
- Known risk or unresolved issue:
  - Dua file JSON memiliki jumlah item berbeda, 200 versus 160; keduanya merupakan file input berbeda dan tidak boleh dianggap dataset yang sama tanpa keputusan deduplikasi.
- Next best step:
  - Gunakan dry-run untuk memilih file yang benar, kemudian import dengan `--database data/interim/x.sqlite` dan simpan ringkasan `parsed/inserted/duplicates` sebagai bukti run.

## Session 059

- Date: 2026-08-16
- Goal: mengubah auto-scroll collector X agar langsung melompat ke posisi bawah halaman saat ini dan tetap mengikuti infinite scroll X.
- Completed:
  - Mengganti scroll step dari `window.scrollY + viewport * 2` menjadi `height - viewport` melalui `window.scrollTo`.
  - Auto-scroll tidak lagi berhenti hanya karena posisi saat ini sudah berada di bawah; controller menunggu apakah tinggi dokumen bertambah setelah X memuat batch baru.
  - Progress sekarang dibandingkan melalui `y` dan `height`; jika keduanya tidak bertambah tiga siklus berturut-turut di bawah halaman, auto-scroll berhenti dengan alasan `page_bottom`.
  - Mempertahankan tombol Start/Stop Auto-scroll, interval 2 detik, batas 500 langkah, serta stop karena monitor berhenti, debugger detach, dan error.
  - Memperbarui README extension, panduan collector, auto-scroll spec, dan implementation plan.
- Verification run:
  - RED test sebelum perubahan gagal karena controller berhenti pada evaluasi pertama saat posisi berada di bawah halaman.
  - `pnpm test -- src/monitor/auto-scroll-controller.test.ts` passed **13 tests**.
  - `pnpm compile` passed.
- Known risk or unresolved issue:
  - Live X belum diuji. Jika X memakai scroll container internal selain `window`, expression `window.scrollTo` dapat tidak memicu pemuatan batch.
- Next best step:
  - Build/reload extension, jalankan query X nyata, tekan **Start Auto-scroll**, dan amati apakah counter response/tweet bertambah setelah setiap lompatan ke bawah.

## Session 058

- Date: 2026-08-16
- Goal: menambahkan tombol auto-scroll pada extension `apps/x-graphql-collector` setelah monitoring dimulai.
- Completed:
  - Menambahkan `AutoScrollController` dengan interval 2 detik, scroll sekitar 70% viewport, dan maksimum 500 langkah.
  - Mengendalikan auto-scroll dari background melalui `chrome.debugger` `Runtime.evaluate` pada tab X yang sedang dipantau; extension tetap tidak membuat request GraphQL baru.
  - Menambahkan stop otomatis saat monitoring berhenti, debugger detach, halaman mencapai bawah, tiga kali no-progress, batas 500 langkah, atau evaluator error.
  - Menambahkan message `collector:auto-scroll-start` dan `collector:auto-scroll-stop`, state `auto_scroll`, serta status/langkah/alasan berhenti pada popup.
  - Menambahkan dokumentasi di README extension, panduan collector X, design spec, dan implementation plan.
- Verification run:
  - TDD red run: focused auto-scroll test gagal karena modul controller belum ada.
  - `pnpm test` di `apps/x-graphql-collector` passed **13 tests**.
  - `pnpm compile` di `apps/x-graphql-collector` passed.
  - `pnpm build` di `apps/x-graphql-collector` passed; output tetap di `.output/chrome-mv3`.
  - Focused Python importer tests passed **7 tests**.
  - `graphify update .` completed; graph updated to 1,523 nodes, 2,574 edges, and 132 communities.
- Known risk or unresolved issue:
  - Live auto-scroll belum diuji pada tab X nyata. X dapat mengubah virtualized scroll container, response shape, atau session policy.
  - Auto-scroll menggunakan `window.scrollTo`; jika hasil pencarian X memindahkan scroll ke container internal, controller dapat berhenti karena no-progress dan perlu adaptasi selector/container berdasarkan bukti live.
- Next best step:
  - Build/load unpacked extension terbaru, mulai monitoring query X, tekan **Start Auto-scroll**, dan cek counter response/tweet serta status auto-scroll di popup.

## Session 057

- Date: 2026-08-16
- Goal: membuat extension Chrome terpisah untuk mengamati response GraphQL `SearchTimeline` X dan mengekspor field minimum ke pipeline collection Python.
- Completed:
  - Menambahkan app WXT terpisah di `apps/x-graphql-collector/`; app ini memiliki manifest, popup, background service worker, build output, dan package lock sendiri tanpa mengubah entrypoint JudolLens.
  - Menggunakan `chrome.debugger` untuk attach ke tab X yang dipilih, mengaktifkan `Network`, memfilter endpoint `SearchTimeline` dan `product=Latest`, lalu membaca response body setelah `Network.loadingFinished`.
  - Menambahkan parser TypeScript yang hanya menyimpan `source_item_id`, `text_raw`, `source_url`, `published_at` opsional, serta envelope `schema_version`, `source`, `query`, dan `collected_at`.
  - Menambahkan deduplikasi bounded maksimal 5.000 item, popup start/stop/clear/export JSON, dan status/count error tanpa menyimpan cookie, bearer token, header, atau payload GraphQL mentah.
  - Menambahkan loader normalized JSON pada `src/judol_detection/collectors/x_file.py` dan memperluas `scripts/import_x_files.py`; output extension sekarang melewati candidate filter, strict language filter, weak label, dan deduplikasi SQLite yang sama.
  - Menambahkan `source_type=x_graphql_extension_json` agar provenance hasil extension dapat dibedakan dari import file GraphQL lama.
  - Menulis `apps/x-graphql-collector/README.md`, memperbarui `docs/collection/x-collector.md`, implementation plan, dan `feature_list.json` dengan batasan live pilot.
- Verification run:
  - `uv run --no-cache python -m pytest --basetemp=.pytest-tmp` passed **99 tests**.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-tmp tests/unit/test_x_file.py tests/unit/test_import_x_files_cli.py tests/integration/test_x_manual_file_import.py -q` passed **7 tests**.
  - Normalized fixture import passed: 2 parsed, 1 inserted candidate, 1 non-candidate rejected with `--candidate-only --language-filter strict`.
  - `pnpm test` in `apps/x-graphql-collector` passed **8 tests**.
  - `pnpm compile` in `apps/x-graphql-collector` passed.
  - `pnpm build` in `apps/x-graphql-collector` passed; output is `apps/x-graphql-collector/.output/chrome-mv3` with `debugger`, `storage`, and `tabs` permissions.
  - Existing `apps/browser-extension`: `pnpm test:run` passed **68 tests** and `pnpm compile` passed; its production build generated successfully before the shell timeout during command shutdown.
  - `feature_list.json` JSON parse and `git diff --check` completed; diff check only reported pre-existing line-ending warnings.
  - `graphify update .` completed and refreshed `graphify-out/graph.json`, `graph.html`, and `GRAPH_REPORT.md`; graphify reported 1,500 nodes, 2,520 edges, and 129 communities.
- Known risk or unresolved issue:
  - Live X pilot belum dijalankan. `chrome.debugger` requires a researcher-managed unpacked extension and Chrome displays a debugger indicator.
  - X may change response shape, operation paths, response-body retention, or session policy. The extension does not retry internal GraphQL requests or copy authentication headers.
  - `COL-003` Camoufox remains blocked pending its separate live login/manual pilot; `COL-004` tracks this Chrome extension and remains `in_progress` until live evidence exists.
- Next best step:
  - Load `apps/x-graphql-collector/.output/chrome-mv3` unpacked, open an authenticated X Latest-search tab, run a small manual monitoring pilot, export JSON, and import it into a fresh SQLite database without recording credentials or raw payloads.

## Session 056

- Date: 2026-08-07
- Goal: memperbaiki kegagalan launch Camoufox akibat pasangan WebGL invalid pada fingerprint profile X.
- Completed:
  - Menelusuri traceback sampai `camoufox.utils.launch_options` -> `sample_webgl`, yang menolak vendor `Google Inc. (Intel)` dan renderer Intel Arc A750 pada preset lokal.
  - Memastikan masalah terjadi sebelum browser/login dibuka dan bukan kerusakan sesi X.
  - Menambahkan validasi preset pada `x_camoufox.py`; jika pasangan WebGL tidak tersedia untuk Windows, hanya bagian `webgl` dihapus dan preset navigator/screen/speech tetap dipertahankan.
  - Menambahkan regression test untuk preset WebGL unsupported.
  - Memvalidasi profile aktual: `.camoufox-fingerprint.json` sekarang tidak lagi memiliki key `webgl` invalid.
- Verification run:
  - `uv run --no-cache python -m pytest --basetemp=.pytest-camoufox-webgl-green tests/unit/test_x_camoufox_config.py -q` passed **2 tests**.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-camoufox-webgl-final tests/unit/test_x_camoufox_config.py tests/unit/test_x_login_cli.py tests/unit/test_x_collector.py tests/unit/test_collect_x_cli.py tests/integration/test_x_collection_storage.py -q` passed **21 tests**.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-camoufox-webgl-full` passed **96 tests**.
  - `uv run --no-cache python -m compileall -q src/judol_detection/collectors/x_camoufox.py src/judol_detection/collectors/x.py scripts/login_x.py scripts/collect_x.py` passed.
- Known risk or unresolved issue:
  - Live login and collection still require user interaction. The prior WebGL launch blocker is resolved offline and the existing profile preset has been cleaned.
- Next best step:
  - Rerun `login_x.py` with `data/browser-profiles/x-research`, confirm browser opens, then run one fresh-database collection pilot.

## Session 055

- Date: 2026-08-07
- Goal: menyelaraskan collector X dengan best practice Camoufox resmi dan menghindari direct-search flow yang menghasilkan SearchTimeline 404.
- Completed:
  - Membaca dokumentasi resmi Camoufox untuk usage, persistent context, fingerprint injection, fingerprint preset, locale, humanize, isolated/main world, dan stealth limitations.
  - Menambahkan `src/judol_detection/collectors/x_camoufox.py` sebagai konfigurasi launch Camoufox bersama.
  - Menetapkan `persistent_context=True`, profile yang sama, `headless=False`, `humanize=True`, `os="windows"`, dan `locale="id-ID"` pada login serta collection.
  - Menyimpan satu real fingerprint preset lokal di `.camoufox-fingerprint.json` dalam profile agar `fingerprint_preset=True` tidak memilih preset acak berbeda pada setiap launch.
  - Mengubah collection dari direct `/search?...&f=live` menjadi alur UI: buka `/home`, isi search box, tekan Enter, lalu pilih tab Terbaru.
  - Search box mendukung `data-testid=SearchBox_Search_Input`, placeholder Inggris/Indonesia, dan role textbox.
  - Mempertahankan response observation, tanpa request GraphQL langsung, tanpa cookie/header manual, dan tanpa main-world JavaScript injection.
  - Memperbarui dokumentasi operasional Camoufox dan alasan konfigurasi profile/fingerprint.
- Verification run:
  - `uv run --no-cache python -m pytest --basetemp=.pytest-camoufox-ui-final tests/unit/test_x_camoufox_config.py tests/unit/test_x_login_cli.py tests/unit/test_x_collector.py tests/unit/test_collect_x_cli.py tests/integration/test_x_collection_storage.py tests/integration/test_x_manual_file_import.py -q` passed **21 tests**.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-camoufox-best-practice-final` passed **95 tests**.
  - `uv run --no-cache python -m compileall -q src/judol_detection/collectors/x.py src/judol_detection/collectors/x_camoufox.py scripts/collect_x.py scripts/login_x.py` passed.
  - `uv run --no-cache python scripts/collect_x.py --query "situs slot gacor" --dry-run` passed.
- Known risk or unresolved issue:
  - Live pilot belum dijalankan setelah perubahan UI/fingerprint. X dapat tetap mengembalikan 404 karena perubahan endpoint internal atau policy server, meskipun browser flow sekarang mengikuti UI normal.
  - Profile lama mungkin belum memiliki `.camoufox-fingerprint.json`; login pertama setelah perubahan akan membuat preset lokal dan membutuhkan verifikasi sesi sekali.
  - Camoufox documentation warns the project is under active development and not necessarily stable for production.
- Next best step:
  - Jalankan `login_x.py` sekali dengan profile `x-research`, pastikan `.camoufox-fingerprint.json` terbentuk, lalu jalankan satu collector query dengan database baru. Catat hanya counter terminal dan verifikasi output SQLite.

## Session 053

- Date: 2026-08-06
- Goal: mengganti collector X berbasis Chromium/response dump menjadi collector Camoufox dengan scroll manual dan penyimpanan tweet incremental ke SQLite.
- Completed:
  - Menulis desain di `docs/superpowers/specs/2026-08-06-x-camoufox-manual-collection-design.md` dan implementation plan di `docs/superpowers/plans/2026-08-06-x-camoufox-manual-collection.md`.
  - Mengganti `XPlaywrightCollector` dengan `XCamoufoxCollector` yang memakai persistent context, `humanize=True`, response event SearchTimeline, manual Enter stop, dan event pump Playwright.
  - Memperluas parser untuk `note_tweet` text, nested `tweet` result, fallback `legacy.id_str`, dan payload malformed yang aman dilewati.
  - Mengubah `scripts/collect_x.py` agar setiap dokumen langsung diproses `CollectionStorage`; raw payload, `data.js`, dan list hasil besar tidak lagi dibuat.
  - Mengubah `scripts/login_x.py` ke profil Camoufox persisten yang sama.
  - Menambahkan dependency `camoufox>=0.5.3` dan menyesuaikan Playwright ke `>=1.57.1,<1.61` karena Camoufox 0.5.x mensyaratkan Playwright di bawah 1.61.
  - Memperbarui panduan `docs/collection/x-collector.md` untuk setup Camoufox, login, manual scroll, SQLite, dan importer legacy.
  - Menambahkan fitur `COL-003` berstatus `in_progress` ke `feature_list.json`.
- Verification run:
  - `uv lock --no-cache` berhasil; Camoufox 0.5.4 dan Playwright 1.60.0 ter-resolve.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-camoufox-focused tests/unit/test_x_collector.py tests/unit/test_x_login_cli.py tests/unit/test_collect_x_cli.py tests/integration/test_x_collection_storage.py tests/integration/test_x_manual_file_import.py -q` passed **17 tests**.
  - `uv run --no-cache python -m compileall -q src/judol_detection/collectors/x.py scripts/collect_x.py scripts/login_x.py` passed.
  - `uv run --no-cache python scripts/collect_x.py --query slot --dry-run` passed dan tidak membuka browser.
- Known risk or unresolved issue:
  - `camoufox fetch` belum dijalankan karena browser binary besar dan live browser pilot membutuhkan sesi login X peneliti.
  - Full pytest, `init.ps1`, live Camoufox login, dan manual pilot belum diverifikasi pada sesi ini.
  - X response shape dapat berubah; parser hanya mencakup bentuk legacy, nested tweet, dan note tweet yang sudah diuji.
- Next best step:
  - Jalankan full offline verification, `camoufox fetch`, lalu login manual dan satu pilot kecil dengan database SQLite baru. Setelah bukti live tersedia, update `COL-003` menjadi `passing` hanya jika semua acceptance checks terpenuhi.

## Session 054

- Date: 2026-08-06
- Goal: mendiagnosis X search yang membuka tab Populer dan menampilkan "Ada kesalahan teknis" pada collector Camoufox.
- Completed:
  - Menganalisis screenshot dan DevTools: request `SearchTimeline` untuk query `situs slot gacor` menerima HTTP 404 dengan `product=Top`; URL halaman kehilangan `f=live`, sehingga hasil berada di tab Populer. Home tetap berhasil karena memakai endpoint berbeda.
  - Menetapkan bahwa CORS `api.x.com/live_pipeline/events`, source-map error, dan `flow/viewer.json` 404 bukan bukti utama kegagalan SearchTimeline.
  - Menambahkan diagnosis collector untuk menghitung `search_errors` dan menyimpan `last_error_status` tanpa mencetak cookie, token, atau header sensitif.
  - Menambahkan percobaan memilih tab Terbaru melalui link rendered `a[href*="f=live"]` setelah navigasi.
  - Menambahkan regression tests untuk status non-200 dan pemilihan tab Terbaru.
  - Menghapus script diagnosis sementara setelah investigasi.
- Verification run:
  - `uv run --no-cache python -m pytest --basetemp=.pytest-x-diagnosis-green tests/unit/test_x_collector.py tests/unit/test_collect_x_cli.py tests/integration/test_x_collection_storage.py -q` passed **16 tests**.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-x-full-final` passed **92 tests**.
  - `uv run --no-cache python scripts/collect_x.py --query "situs slot gacor" --dry-run` passed.
- Security note:
  - User pasted live X cookie/authentication material from DevTools. Treat that session as exposed; revoke/logout sessions and rotate the account password. Do not paste or commit DevTools headers again.
- Known risk or unresolved issue:
  - Belum ada live rerun setelah diagnosis. Jika X tetap mengembalikan 404, masalah berada pada sesi/browser/server X atau perubahan endpoint, bukan parser tweet. Jangan menyalin Bearer/cookie untuk membuat request manual.
- Next best step:
  - Jalankan collector lagi dengan database baru, catat baris `[X]`/`[X FINAL]`, dan laporkan `search_errors`, `last_error_status`, `responses`, `observed`, serta URL/tab yang tampil tanpa menyertakan header sensitif.

## Session 052

- Date: 2026-08-06
- Goal: mendokumentasikan cara memeriksa jumlah dan overlap dataset di `data/interim/` agar dapat diikuti agent berikutnya.
- Completed:
  - Menambahkan `docs/data-interim.md` sebagai rujukan operasional canonical database, aturan hitungan tabel `documents`, pembedaan collector messages vs stored documents, aturan duplikasi CSV/Parquet, pemilihan database, dan pemeriksaan overlap Telegram.
  - Memperbarui `AGENTS.md` dengan kondisi kapan `docs/data-interim.md` wajib dibaca dan aturan pelaporan jumlah data.
  - Menambahkan fitur `DOC-001` berstatus `passing` ke `feature_list.json`.
- Verification run:
  - `.\\init.ps1` berhasil; dependency sync dan `uv run --no-cache python main.py` berhasil.
  - Perintah inspeksi SQLite yang tertulis di dokumentasi berhasil membaca seluruh database interim dan tabelnya.
  - Perintah pemeriksaan overlap Telegram yang tertulis di dokumentasi berhasil dijalankan.
  - `git diff --check` berhasil; hanya memberi peringatan line ending untuk file lama yang sudah berubah di worktree.
- Known risk or unresolved issue:
  - Panduan tidak menyimpan snapshot jumlah data saat ini; jumlah harus dihitung ulang dari database canonical ketika ditanyakan.
  - Database dan artefak collection lokal dapat berubah atau bertambah pada run berikutnya; nama file bukan pengganti pemeriksaan isi database.
- Next best step:
  - Saat ada pertanyaan jumlah data interim berikutnya, baca `docs/data-interim.md`, pilih database canonical, jalankan inspeksi, dan laporkan basis hitungnya.

## Session 051

- Date: 2026-08-05
- Goal: implementasi usable sistem agent anotasi Excel sampai terhubung ke OpenAI-compatible Chat Completions.
- Completed:
  - Membuat modul typed `src/judol_detection/annotation/` untuk contracts, Excel loader, hash/fingerprint, checkpoint/cache JSON atomic, quota tracker, async provider client, dan pipeline concurrency.
  - Membuat `scripts/annotate_judol.py` dengan CLI input/output Excel, sheet/text-column, consent external data, `.env`, concurrency default 5, max token preflight, retry, resume, force, dan ringkasan run.
  - Mengubah skill anotator dari output label polos menjadi JSON minimal strict `{"label":"..."}` agar kompatibel dengan JSON Schema.
  - Menambahkan quick start `docs/annotation-agent-quickstart.md` dan konfigurasi provider OpenAI-compatible ke `.env.example`.
  - Menambahkan dependency `httpx`, `openpyxl`, dan `python-dotenv` ke `pyproject.toml`/`uv.lock`.
  - Menambahkan fitur `AGENT-002` dan menandainya `passing` setelah verifikasi.
- Verification run:
  - `uv run --no-cache python -m pytest --basetemp=.pytest-tmp` passed **88 tests**.
  - `uv run --no-cache python -m compileall -q src/judol_detection/annotation scripts/annotate_judol.py` passed.
  - `uv run --no-cache python scripts/annotate_judol.py --help` passed.
  - Local fake-provider and local HTTP OpenAI-compatible end-to-end tests passed; generated Excel labels, checkpoint, and run summary were verified without external API calls.
  - `uv run --no-cache python main.py` passed.
  - `git diff --check` passed.
- Known risk or unresolved issue:
  - Belum diuji terhadap endpoint provider nyata milik user; kompatibilitas JSON Schema/usage field dapat berbeda antar provider.
  - Estimasi token menggunakan fallback karakter, bukan tokenizer model provider.
  - Bulk run 2.000 teks sebaiknya dimulai dengan subset kecil dan `--max-total-tokens` konservatif.
  - Review subagent dicoba dua kali tetapi gagal karena error dispatcher internal `session_message.seq`; review manual dan test suite berhasil.
- Next best step:
  - Jalankan pilot nyata dengan 5–20 baris menggunakan endpoint provider user, verifikasi format response/usage, lalu lanjutkan bulk annotation dengan `--resume` dan batas token yang sesuai.

## Session 050

- Date: 2026-08-05
- Goal: menyusun PRD sistem lengkap agent anotasi promosi judol berbasis Excel dan OpenAI-compatible API.
- Completed:
  - Menyepakati scope sistem lengkap: CLI Excel, pipeline anotasi, Chat Completions, JSON Schema, concurrency, cache, kuota, checkpoint, resume, dan output Excel.
  - Menetapkan keputusan produk: peneliti tunggal, input `.xlsx`, sheet pilihan, `text_raw` configurable, output Excel baru, respons `{"label":"..."}`, temperature 0, concurrency default 5, retry 3 kali, cache `text.strip()`, dan consent `--allow-external-data`.
  - Menetapkan checkpoint tanpa teks mentah, hash skill dan fingerprint input untuk reproducibility, pause saat kuota provider habis, serta `perlu_review` hanya untuk kegagalan terminal per baris.
  - Menetapkan validasi agent-only tanpa klaim precision/recall empiris karena tidak ada gold set manusia.
  - Menulis PRD formal di `docs/agent-annotation-prd.md` dengan 27 functional requirements EARS, 8 non-functional requirements, 21 acceptance criteria, error handling, ringkasan run, dan implementation checklist.
  - Menambahkan aturan bahwa `row_id` existing harus terisi dan unik; jika tidak ada, sistem membuat ID internal.
- Verification run:
  - PRD terbaca dan self-review selesai.
  - `git diff --check` berhasil.
  - PRD berisi requirement EARS, acceptance criteria Given/When/Then, non-functional requirements, error handling, checklist implementasi, batasan, dan open questions fase implementasi.
- Known risk or unresolved issue:
  - PRD belum diimplementasikan; perubahan `SKILL.md` dari output label polos ke JSON minimal masih menjadi pekerjaan implementasi berikutnya.
  - Detail library Excel, format checkpoint, fingerprint, estimator token, exit code, dan nama command CLI masih open questions yang sengaja ditunda ke implementation plan.
- Next best step:
  - User review `docs/agent-annotation-prd.md`; setelah disetujui, buat implementation plan dan lanjutkan implementasi pipeline secara bertahap.

## Session 049

- Date: 2026-08-04
- Goal: meringkas skill anotator agar lebih hemat token untuk 2.000 request satu-teks-per-request.
- Completed:
  - Memadatkan `.agents/skills/judol-annotation-agent/SKILL.md` dari 266 menjadi 120 baris.
  - Mempertahankan tiga label, aturan konteks promosi, hard negative, `perlu_review`, Unicode obfuscation, prompt-injection resistance, dan output tepat satu label.
  - Menghapus penjelasan dan contoh berulang yang tidak diperlukan pada setiap request.
- Verification run:
  - Ukuran baru: 4.670 karakter, 4.672 byte UTF-8, 624 kata, 120 baris.
  - Estimasi kasar tokenizer: sekitar 1.200–1.400 token per pemanggilan; angka persis tetap bergantung pada tokenizer model.
  - Validasi frontmatter, tiga label, exact-output rule, dan prompt-injection rule berhasil.
  - `git diff --check` berhasil.
  - `uv run --no-cache python main.py` berhasil.
- Known risk or unresolved issue:
  - Estimasi token belum diukur dengan tokenizer model target karena `tiktoken` tidak tersedia di environment lokal.
  - Akurasi LLM belum diuji end-to-end pada fixture beranotasi manusia.
- Next best step:
  - Jika biaya/akurasi sudah sesuai, lanjutkan pembuatan adapter JSON/Excel dan client OpenAI-compatible sebagai fitur terpisah.

## Session 048

- Date: 2026-08-04
- Goal: merancang skill agent anotator promosi judol untuk OpenAI-compatible endpoint.
- Completed:
  - Membaca dokumen identifikasi judol di `docs/`, terutama keyword baseline, annotation guidelines, Unicode obfuscation, mock predictor, dan API contract.
  - Menetapkan tiga label anotasi Bahasa Indonesia: `promosi_judol`, `bukan_judol`, dan `perlu_review`.
  - Menetapkan scope tahap ini hanya skill/instruction anotator satu teks per request; adapter JSON/Excel dan client API berada di luar scope.
  - Menulis desain terverifikasi di `docs/superpowers/specs/2026-08-04-judol-annotation-agent-design.md`.
  - Membuat skill repository-owned di `.agents/skills/judol-annotation-agent/SKILL.md`; seluruh instruksi ditulis dalam Bahasa Indonesia.
  - Menambahkan pengecualian `.gitignore` hanya untuk skill anotator agar dapat di-versioning tanpa membuka artefak agent lokal lainnya.
  - Menambahkan fitur `AGENT-001` berstatus `passing` ke `feature_list.json`.
- Verification run:
  - Menjalankan `./init.ps1`; dependency sync dan `uv run --no-cache python main.py` berhasil.
  - Self-review spesifikasi: tidak ada placeholder, label keempat, atau kontradiksi antara aturan konteks, Unicode, dan output contract.
  - Validasi statis skill: frontmatter valid, tiga label lengkap, output contract tepat satu label, aturan prompt injection tersedia, dan `git diff --check` berhasil.
  - Review independen subagent dicoba tetapi gagal karena error internal `session_message.seq`; review manual terhadap rubrik, contoh, dan kontrak output tidak menemukan isu substantif.
- Known risk or unresolved issue:
  - Belum ada evaluasi LLM end-to-end terhadap dataset karena tahap ini belum mencakup OpenAI-compatible client atau adapter JSON/Excel.
  - Akurasi dan proporsi `perlu_review` masih perlu diukur pada fixture beranotasi manusia sebelum bulk annotation.
- Next best step:
  - Bangun adapter JSON/Excel dan client OpenAI-compatible pada fitur terpisah, lalu evaluasi skill menggunakan sampel promosi jelas, hard negative, Unicode obfuscation, berita/peringatan, kasus ambigu, dan prompt injection.

## Session 047

- Date: 2026-08-04
- Goal: menjalankan scraping Telegram menggunakan sesi Telethon yang sudah terotorisasi.
- Completed:
  - Memastikan `.telegram_pilot_session.session` terotorisasi (`is_user_authorized()=True`) dan 10 seed aktif terbaca dari `configs/telegram_seeds.json`.
  - Menjalankan collector `scripts.collect_telegram` dalam mode `discovery` dengan `--max-messages-per-channel 100`, `--max-channels 10`, `--progress-every 50`, dan database baru `data/interim/telegram_user_run.sqlite`.
  - Collector memakai snowball kedalaman satu tingkat; seed turunan yang ditemukan masuk antrean tetapi tetap dibatasi oleh maksimum 10 channel.
  - Mengekspor hasil ke CSV dan Parquet di `data/interim/telegram_user_run_exports/`.
- Verification run:
  - Run database berstatus `completed`, memproses 10 channel dan membaca 1.000 pesan.
  - Sebanyak 5 dokumen kandidat tersimpan; seluruhnya `weak_label=1`.
  - Per-channel yield: `legacyniihbos` 2 dokumen, `skizofernia_area` 2 dokumen, dan `thenineee` 1 dokumen; 7 seed lain tidak menghasilkan dokumen kandidat pada 100 pesan terbaru.
  - `documents.csv` berisi 5 record dan `documents.parquet` berhasil dibuat.
  - Tidak ada `FloodWaitError` atau kegagalan channel pada run ini.
- Known risk or unresolved issue:
  - Collection hanya membaca 100 pesan terbaru per channel, bukan seluruh riwayat.
  - Collector menyimpan kandidat berbasis keyword dan deduplikasi; pesan non-kandidat tidak masuk database hasil.
  - Dua channel menghasilkan banyak near-duplicate, sehingga jumlah dokumen tersimpan jauh lebih kecil daripada jumlah pesan yang dibaca.
- Next best step:
  - Audit dan anotasi `data/interim/telegram_user_run_exports/documents.csv`; bila yield seed tertentu perlu diperbesar, jalankan pilot terpisah dengan batas pesan lebih tinggi atau mode `targeted`.

## Session 046

- Date: 2026-08-04
- Goal: menjalankan scraping YouTube menggunakan YouTube Data API v3, bukan yt-dlp.
- Completed:
  - Memastikan `YOUTUBE_API_KEY` tersedia di `.env` tanpa mencetak nilai secret.
  - Menjalankan `.\\init.ps1`; dependency sync dan baseline `uv run --no-cache python main.py` berhasil.
  - Menjalankan collector resmi `scripts.collect_youtube_api` dengan 12 query aktif dari `configs/youtube_queries.json`, `--max-pages 1`, `--region-code ID`, dan database baru `data/interim/youtube_api_user_run.sqlite`.
  - Collector memakai `order=date`, `type=video`, `relevanceLanguage=id`, dan filter bahasa ketat sesuai implementasi repo.
  - Mengekspor hasil ke CSV dan Parquet di `data/interim/youtube_api_user_run_exports/`.
- Verification run:
  - Run database berstatus `completed` dengan `fetched_count=186`, `inserted_count=186`, dan `duplicate_count=0` setelah filter.
  - Export berisi 186 record pada `documents.csv`; `documents.parquet` juga berhasil dibuat.
  - Distribusi `language_hint`: 131 `id`, 55 `uncertain`.
  - Semua 186 dokumen tersimpan sebagai kandidat `weak_label=1`; 1 dokumen memiliki flag Unicode.
  - Raw payload API tersimpan di `data/raw/youtube-api/`; direktori ini dipakai bersama run sebelumnya dan berisi 1.913 file JSON saat verifikasi.
- Known risk or unresolved issue:
  - Hasil berasal dari satu halaman API per query, sehingga maksimal 50 hasil per query dan bukan arsip lengkap YouTube.
  - `weak_label` adalah label kandidat berbasis keyword, bukan label final anotasi manusia.
  - Direktori raw payload bersifat shared berdasarkan video ID; database run ini terpisah, tetapi payload dengan ID sama dapat tertimpa oleh collection berikutnya.
- Next best step:
  - Audit `data/interim/youtube_api_user_run_exports/documents.csv`, lalu lakukan anotasi manusia sebelum dipakai sebagai dataset final.

## Current Verified State

- Repository root: `D:\judol_detection`
- Standard startup path: `.\init.ps1` on Windows/PowerShell, or `./init.sh` in POSIX shells
- Standard verification path: `uv run --no-cache python main.py`
- Current highest-priority unfinished feature: `COL-003` — pilot live collection X dengan Camoufox manual scroll; setelah pilot selesai kembali ke `EDA-001` untuk eksplorasi data anotasi. `COL-001`/`COL-002` collection dan seluruh fitur browser-extension `EXT-000..EXT-014` passing.
- Current blocker: none
- Current focus: jalankan satu pilot Camoufox dengan sesi X persisten, database SQLite baru, dan verifikasi bahwa tidak ada dump `SearchTimeline`/`data.js`. Setelah itu lanjut `EDA-001` mengikuti `docs/research/eda-plan.md` (10 langkah A–G). Engine analisis Unicode: `silverspeak`. Tokenizer uji: IndoBERT via Colab.
- Standard startup note: use `uv sync --no-cache` and `uv run --no-cache ...` by default to avoid local uv cache permission issues on this machine
- Pytest temporary-directory standard: use `uv run --no-cache python -m pytest --basetemp=.pytest-tmp`; the directory is ignored and removed after the run when possible.

## Current Project Decisions

- Project is a uv-based thesis monorepo for Unicode-robust Indonesian judol promotion detection.
- Browser extension name: `JudolLens`.
- Extension stack decision: WXT + React + TypeScript.
- UI framework decision: Tailwind CSS + shadcn/ui + lucide-react for extension-owned React screens.
- Current implementation priority: frontend first. FastAPI and real ML integration are deferred until the frontend MVP is stable.
- UI direction: calm security tool plus research evidence interface.
- Storage strategy: object-based keys such as `settings:extension`, `stats:session`, `logs:detections`, and `manual:lastAnalysis`.
- Storage helper strategy: typed helpers live in `apps/browser-extension/src/storage/`, are exported through `@/storage`, and store detection logs newest-first with bounded snippets.
- Mock predictor strategy: deterministic rule-based baseline with Unicode evidence, compatible with the API contract.
- Dynamic content strategy: content script uses a 150ms debounced `MutationObserver` for added nodes only and keeps prediction/storage coordination in background.
- Simulation strategy: MVP 1 uses a local HTTP target page at `apps/browser-extension/simulation/`, served by `pnpm simulation`, so content script evaluation stays realistic.
- Options live settings strategy: content scripts fetch current settings before scans, background treats stored settings as the source of truth for automatic scan threshold/mode, and overlays respect censor mode, auto blur, and Unicode highlight.

## Session Log

### Session 045

- Date: 2026-07-24
- Goal: perbaiki error import silverspeak di notebook EDA (cell 0.4 & Langkah D).
- Root cause:
  - `silverspeak` versi terinstal di Colab = **3.0.0**, yang **mengubah API total** dari versi lama yang dirujuk dokumentasi Context7. `normalize_text` dan `find_homoglyph_words` TIDAK ada lagi di v3.
- Completed:
  - Investigasi API v3.0.0 yang sebenarnya terinstal (`uv run --with silverspeak python` inspeksi `dir()`): exports `HomoglyphReplacer`, `TypesOfHomoglyphs` (IDENTICAL/CONFUSABLES/OCR/OCR_REFINED), `targeted_attack`, `random_attack`, `greedy_attack`, `load_default_kb`, `normalize_fast`, `unicode_scoring`, `strip`.
  - Verifikasi end-to-end API deteksi: `load_default_kb()` → `HomoglyphKB.graph_path` → `normalize_fast(text, graph_path, min_score=0.0, score_margin=0.0)` → `NormalizeResult` dengan field `.text` (str ternormalisasi), `.chars_changed` (list `CharChange(pos, src, dst, score)`), `.ambiguous`.
  - Mem-patch `notebooks/01_sample_explore.ipynb`: cell 0.4 (verifikasi + warm-up KB + sanity test assert) dan cell Langkah D (deteksi homoglyph via `normalize_fast`, output `sp_n_changed`/`sp_has_homoglyph`/contoh CharChange).
  - Uji end-to-end cell Langkah D terpatch dengan df tiruan: deteksi akurat (`slοt`→1 change, `linkalternatif аοnline`→2, teks bersih→0).
  - Bonus finding: API v3.0.0 punya `targeted_attack(text, percentage, random_seed, ...)` — persis yang dibutuhkan attack generator Tahap 1 adversarial plan. Catat untuk sesi Q2/library-generasi.
- Verification run:
  - Notebook valid JSON, 38 cells, semua referensi API lama hilang, kedua cell terpatch memakai `normalize_fast`/`load_default_kb`.
  - `uv run --no-cache python` simulasi cell Langkah D terpatch → output benar, tanpa error.
- Known risk:
  - Hanya API silverspeak yang dikoreksi. Cell lain (A,B,B2,C,C2,E,F,G) belum di-run di Colab. Path Drive default masih asumsi.
- Next best step:
  - User re-run notebook di Colab dari cell 0.4 (sekarang punya sanity test assert). Bila pass, lanjut Langkah A→B2.

### Session 044

- Date: 2026-07-24
- Goal: koreksi penanganan Cohen's Kappa di docs dan buat notebook EDA untuk Colab.
- Completed:
  - Mengoreksi kesalahan interpretasi: yang dikeluarkan dari scope EDA adalah **komputasi** Cohen's Kappa (sesi khusus), bukan metodenya. `docs/dataset.md` sekarang menyatakan "3 anotator independen + dievaluasi menggunakan Cohen's Kappa" dengan catatan komputasi ditunda sesi khusus; metode tetap bagian metodologi skripsi.
  - Menutup open question E1 (Resolved) di `docs/research/eda-plan.md` §8.
  - Menyelaraskan catatan scope-exclusion di `eda-plan.md` §1.1: "Cohen's Kappa tetap metode evaluasi anotasi metodologi skripsi — hanya komputasinya yang ditunda, bukan metodenya dihapus."
  - Membuat `notebooks/01_sample_explore.ipynb` (38 cells: 23 code, 15 markdown) untuk Google Colab. Struktur mengikuti `eda-plan.md` Langkah A–G. Mount Google Drive (input `dataset_final.xlsx` + output artefak). Engine `silverspeak` + `unicodedata`. Style mengikuti pola notebook scraper eksisting (`google.colab`, `%pip install`, markdown instruksional per section).
  - Keputusan Colab (dari user): mount Google Drive, semua langkah A–G dalam satu notebook, artefak disimpan ke Drive. Path configurable di cell 0.1.
- Verification run:
  - `notebooks/01_sample_explore.ipynb` valid sebagai JSON nbformat 4; 38 cells; 12 section header cocok plan.
  - `uv run --no-cache python main.py` mencetak `Judol Detection monorepo is ready.` (tidak ada kode fungsional di `src/` yang berubah; notebook bukan bagihan import path repo).
- Known risk:
  - **Notebook belum di-run di Colab** — cell-code di-generate, bukan dieksekusi. Bisa ada runtime issue (API `silverspeak` berbeda antar versi, path Drive salah, dependency version). Cell 0.4 dan Langkah D sudah ada fallback/try-except untuk `silverspeak`.
  - Path Drive default (`/content/drive/MyDrive/judol_detection/...`) asumsi; user harus menyesuaikan di cell 0.1.
  - `dataset_final.xlsx` harus di-copy ke Drive dulu oleh user sebelum run.
  - Skala besar: Langkah F (IndoBERT ~400MB) dan Langkah E (audit manual 100–200 dokumen) memakan runtime/tenaga signifikan di Colab.
- Next best step:
  - User menyalin `dataset_final.xlsx` ke Google Drive, menyesuaikan path di cell 0.1, lalu run notebook di Colab bertahap mulai Langkah A–B2. Setelah hasil leakage terlihat, keputusan split (§5) bisa ditulis. Setelah EDA selesai, isi manual `eda-qualitative-notes.md` + `eda-manual-audit.csv`, lalu update `feature_list.json` (`EDA-001` → `passing`).

### Session 043

- Date: 2026-07-24
- Goal: susun rencana EDA (SEMMA Sample + Explore) yang grounded di dataset aktual, pilih engine analisis Unicode, dan rapikan open question sebelum implementasi.
- Completed:
  - Membuat `docs/research/eda-plan.md` (10 langkah A–G): tujuan EDA dalam konteks skripsi, sumber data, infrastruktur yang di-reuse, dependensi baru, langkah-langkah (termasuk analisis label leakage via fitur struktural, deep-dive kualitatif per kelas, filter false-positive karakter non-ASCII), keputusan split, 8 artefak, Definition of Done, open questions, usulan entri feature, dan urutan eksekusi.
  - Memilih engine analisis Unicode untuk EDA = **`silverspeak`** (resolusi open question E6) lewat riset Context7 + web. Alasan: API deteksi eksplisit (`find_homoglyph_words`, reverse mapping), native Python, multi-strategi, terdokumentasi. Dipakai bersama `unicodedata` stdlib untuk klasifikasi kategori karakter non-ASCII. Q2 (library generasi adversarial) tetap terpisah.
  - Mengeluarkan analisis kualitas anotasi (Cohen's Kappa, inter-rater, survivorship-bias) dari scope EDA → sesi khusus. `label_final` dipakai apa adanya.
  - Menutup open question E3: tokenizer uji = IndoBERT (akan dijalankan via Colab per keputusan user).
  - Menutup open question E5: `dataset_final.xlsx` TIDAK punya metadata platform/sumber; join via `text_hash_normalized` ke `telegram_targeted/youtube_api_1/x_manual_import` = 0% overlap (dataset anotasi Juni lebih tua dari koleksi SQLite Juli). Implikasi: anti-leakage split pakai text-similarity (`collection/deduplication.py`), bukan platform.
  - Memperbaiki `docs/dataset.md` (E1): deskripsi anotasi diperbarui dari "2 anotator + Cohen's Kappa" ke schema aktual (3 anotator + `agreement_status`); menambahkan tabel skema dataset_final.xlsx dan catatan metadata/leakage.
  - Menambahkan fitur `EDA-001` (status `not_started`, area `eda`, priority 1) ke `feature_list.json`; memperbarui Current Verified State.
- Verification run:
  - `feature_list.json` ter-parse valid (18 fitur, EDA-001 pertama, status `not_started`).
  - Tidak ada perubahan kode fungsional; tidak menjalankan pytest (tidak ada modul berubah). Inspeksi data via `uv run --no-cache python -c ...` untuk E5 dan analisis awal fitur struktural (emoji/uppercase per kelas).
- Known risk:
  - Open question tersisa: E4 (Langkah G baseline model di EDA atau tunda), E8 (fitur struktural mana yang dikontrol di Tahap 4 — output Langkah B2). Keduanya non-blocking untuk mulai Langkah A.
  - Skala EDA besar untuk skripsi S1 (10 langkah, 2 manual: C2 close reading, E audit 100–200 dokumen). Pertimbangkan pemilah fase wajib/nice-to-have saat implementasi.
  - Re-join metadata platform ke dataset anotasi butuh sesi pengumpulan data terpisah.
- Next best step:
  - Mulai implementasi `EDA-001` dari Langkah A → B → B2 (audit dasar + analisis label leakage) setelah menambah dependensi `matplotlib`, `seaborn`, `wordcloud`, `scikit-learn`, `silverspeak` via `uv add`.

### Session 042

- Date: 2026-07-23
- Goal: cari sumber data confusable character via Context7 dan dokumentasikan rencana adversarial training skripsi ke file.
- Completed:
  - Memakai skill `context7-mcp` untuk mencari library Python confusable/homoglyph. `confusable_homoglyphs` dan `homoglyphs` tidak terdokumentasi di Context7; alternatif yang muncul: `silverspeak` (riset-grade, multi-strategi), `decancer` (Rust core, performa tinggi), `glin-profanity` (guardrail moderation + homoglyph evasion).
  - Membuat `docs/research/adversarial-training-plan.md`: dokumentasi 5 tahap adversarial training (attack generator → augmentasi → training → evaluasi robustness → analisis tambahan), dikaitkan ke infrastruktur repo yang sudah ada (`collection.sqlite`, keyword baseline, modul kosong di `src/judol_detection/{unicode,preprocessing,models,training,evaluation}/`).
  - Mencatat keputusan Q4: augmentasi diterapkan pada kedua kelas (positif + negatif) untuk mencegah model belajar korelasi dangkal "homoglyph = judol".
  - Menandai Q1 (kategori manipulasi), Q2 (library engine), Q5 (arsitektur) sebagai "dibahas di sesi baru" sesuai permintaan user.
- Verification run:
  - Tidak ada perubahan kode; sesi ini hanya dokumentasi & riset teknologi. Tidak menjalankan pytest karena tidak ada modul yang berubah.
- Known risk:
  - Library engine (Q2), arsitektur (Q5), dan taksonomi manipulasi (Q1) belum difinalisasi — Tahap 1 implementasi tidak boleh dimulai sebelum ketiganya ditutup.
  - `pyproject.toml` belum berisi dependency ML (torch/transformers) maupun library confusable; perlu ditambahkan saat implementasi Tahap 1.
- Next best step:
  - Sesi baru: putuskan Q2 (engine library), Q5 (arsitektur), Q1 (kategori manipulasi), lalu mulai implementasi Tahap 1 (generator homoglyph + tabel confusable + unit test).

### Session 041

- Date: 2026-07-16
- Goal: clean legacy pytest temporary directories and prevent their recurrence.
- Completed:
  - Added `.pytest-*/` and `.tmp/` to `.gitignore` without changing the existing collection-data ignore rules.
  - Updated `AGENTS.md` so all local Python pytest commands use the single `--basetemp=.pytest-tmp` location and record outcomes in this progress log rather than retaining per-run temporary directories.
  - Removed the newly-created `.pytest-tmp` after verification.
- Verification run:
  - Ran `powershell -NoProfile -ExecutionPolicy Bypass -File .\\init.ps1`; dependency sync and `uv run --no-cache python main.py` succeeded.
  - Ran `uv run --no-cache python -m pytest --basetemp=.pytest-tmp tests/unit/test_x_file.py -q`; passed 2 tests.
  - Confirmed `.pytest-example/` and `.tmp/pytest/` are ignored by Git.
- Known risk:
  - Legacy `.pytest-*` directories and `.pytest_cache` remain because Windows denied removal and ownership takeover, including under an escalated cleanup attempt. They are now ignored; remove them from an Administrator-owned Windows session if disk cleanup is still required.
- Next best step:
  - Continue the authenticated X Latest-search pilot; use the new pytest basetemp convention for later verification.

### Session 040

- Date: 2026-07-15
- Goal: import researcher-saved X SearchTimeline response files without browser automation.
- Completed:
  - Added safe JSON5 parsing for `data = [...]` JavaScript object-literal files; the importer never executes input JavaScript.
  - Added `scripts/import_x_files.py` with repeatable `--input`, dry-run, shared candidate/language/deduplication filtering, source filename provenance, and manual-file source type.
  - Updated X collection documentation with full manual import and export commands.
- Verification run:
  - Parser and CLI tests were red before their modules existed; focused tests passed after implementation.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-x-manual-import-final` passed 51 tests.
  - `uv run --no-cache python main.py` printed `Judol Detection monorepo is ready.`
  - Dry-run against `configs/query_x_1.js` found 6 response batches without creating a database.
- Next best step:
  - Run the documented multi-file import command to `data/interim/x_manual_import.sqlite`, then export and audit retained candidates.

### Session 039

- Date: 2026-07-15
- Goal: separate researcher-managed X login from data collection.
- Completed:
  - Added `scripts/login_x.py`, which opens the ignored persistent Chromium profile, allows manual X login, verifies the page is outside the login flow after terminal confirmation, and closes the context to save the local session.
  - Changed `collect_x.py` to default `--login-timeout-seconds 0`; an unauthenticated profile now stops immediately and should be prepared through `login_x.py`.
  - Updated the X collector guide with the two-command workflow.
- Verification run:
  - Login helper and CLI tests were first red because their modules did not exist; collector default test was first red because the old timeout was 300 seconds.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-x-separate-login-final` passed 46 tests.
  - `uv run --no-cache python main.py` printed `Judol Detection monorepo is ready.`
  - Login CLI help and collector dry-run both succeeded.
- Next best step:
  - Run `uv run --no-cache python scripts/login_x.py`, complete manual login, press Enter, then run a 10-post one-query X pilot.

### Session 038

- Date: 2026-07-15
- Goal: resume the selected X Latest-search URL after a successful manual login.
- Root cause:
  - After manual login, X redirected to Home. The collector then scrolled that destination instead of navigating back to the selected search URL.
- Completed:
  - After the manual-login wait succeeds, the collector now reloads the original Latest-search URL and verifies that it did not return to login before scrolling.
  - Added a regression test for search → login → Home → search navigation and updated the operational guide.
- Verification run:
  - Regression test first failed because the collector made only the initial search navigation.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-x-redirect-green tests/unit/test_x_collector.py -v` passed 8 tests.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-x-redirect-final` passed 42 tests.
  - `uv run --no-cache python main.py` printed `Judol Detection monorepo is ready.`
- Next best step:
  - Retry the one-query headful X pilot. Login manually, wait for return to search, then inspect the first bounded export.

### Session 037

- Date: 2026-07-15
- Goal: allow the first headful X collection run to complete researcher-managed login.
- Root cause:
  - The collector navigated to search, immediately observed `/i/flow/login`, and treated that normal first-run state as terminal before a researcher could authenticate.
- Completed:
  - Added `--login-timeout-seconds` (default `300`) and a bounded 1-second polling wait when a headful collector reaches the login URL.
  - Headless runs still stop immediately at login; passing `--login-timeout-seconds 0` also disables the manual-login wait.
  - Updated the X guide and added a regression test where the page leaves login after one wait cycle before scrolling begins.
- Verification run:
  - Regression test first failed because `XPlaywrightCollector` did not accept `login_timeout_seconds`.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-x-login-green tests/unit/test_x_collector.py tests/unit/test_collect_x_cli.py -v` passed 9 tests.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-x-login-final` passed 41 tests.
  - `uv run --no-cache python main.py` printed `Judol Detection monorepo is ready.`
- Next best step:
  - Run the first headful one-query pilot; complete login within five minutes, then allow the collector to continue automatically.

### Session 036

- Date: 2026-07-15
- Goal: add a bounded X Latest-search collector using one persistent local Chromium profile.
- Completed:
  - Added the `XSearchTimelineParser` with a redacted fixture, malformed-entry skipping, and post-ID deduplication.
  - Added a Playwright collector that observes page-loaded SearchTimeline responses while navigating the Latest-search URL and scrolling within explicit post/scroll/no-progress limits.
  - Added authentication and access-challenge stop states, raw JSON provenance paths, X query-run summaries, an X query registry, CLI, and operations guide.
  - Installed Playwright 1.61.0 and Chromium. Browser profile and raw X payload paths are ignored by Git.
- Verification run:
  - Red parser, scroll-policy, raw-payload, X query-summary, and CLI tests failed for their intended missing behavior before implementation.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-x-final` passed 40 tests.
  - `uv run --no-cache python main.py` printed `Judol Detection monorepo is ready.`
  - `uv run --no-cache python scripts/collect_x.py --query-file configs/x_queries.json --dry-run` printed the configured Latest-search queries without launching Chromium.
- Known risk or unresolved issue:
  - The first live headful run requires the researcher to authenticate manually in the local profile. X result structure can change, so keep the bounded pilot and audit raw payloads before expanding collection.
- Next best step:
  - Run a one-query, 10-post headful X pilot to `data/interim/x_latest_pilot.sqlite`, export it, and manually audit retained candidates.

### Session 035

- Date: 2026-07-15
- Goal: make long Telegram collection runs observable in the terminal.
- Completed:
  - Added reusable channel progress events for start, checkpoint, FloodWait, completion, and failure.
  - Added `--progress-every` (default `100`) and terminal output for messages read, inserted candidates, non-candidates, duplicates, and snowball queue size.
  - Updated the Telegram collector guide with the progress command.
- Verification run:
  - Regression test first failed because `collect_async` did not accept progress parameters.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-progress-final` passed 23 tests.
  - `uv run --no-cache python main.py` printed `Judol Detection monorepo is ready.`
- Next best step:
  - Re-run the full-history pilot with `--progress-every 100` and inspect terminal checkpoints and FloodWait messages.

### Session 034

- Date: 2026-07-14
- Goal: support whole-history Telegram collection while respecting Telegram FloodWait limits.
- Completed:
  - `--max-messages-per-channel` now accepts a positive integer or `none`; `none` maps to Telethon `limit=None`.
  - The collector catches `FloodWaitError`, awaits the exact `error.seconds`, then retries the same channel. SQLite deduplication prevents a retry from creating duplicates.
  - Dry-run output and collection-run config now record the selected message limit.
  - Updated the Telegram collector guide with whole-history command and FloodWait behavior.
- Verification run:
  - Red tests failed as expected: the CLI rejected `none` and the collector lacked an asyncio FloodWait path.
  - Focused green tests: `uv run --no-cache python -m pytest --basetemp=.pytest-telegram-full-history-green tests/unit/test_collect_telegram_cli.py tests/integration/test_telegram_snowball.py` passed 3 tests.
  - `uv run --no-cache python scripts/collect_telegram.py --seed seed --max-messages-per-channel none --dry-run` printed `max_messages_per_channel=None`.
  - Full verification: `uv run --no-cache python -m pytest --basetemp=.pytest-telegram-full-history-final` passed 22 tests.
  - Smoke verification: `uv run --no-cache python main.py` printed `Judol Detection monorepo is ready.`
- Known risk or unresolved issue:
  - Full history over many channels can run for a long time. Start with one channel and a new database; FloodWait retries intentionally wait rather than skip the channel.
- Next best step:
  - Run a one-channel full-history collection and inspect the exported retained candidates before expanding channel scope.

### Session 033

- Date: 2026-07-14
- Goal: provide a complete operational reference for the Telegram collection CLI.
- Completed:
  - Added `docs/collection/telegram-collector.md` covering setup, session login, every CLI option, seed registry schema, dry-run, direct seed and snowball collection examples, filtering/deduplication behavior, limits, and export.
  - Linked the guide from `docs/dataset.md`.
- Verification run:
  - `uv run --no-cache python -m scripts.collect_telegram --seed-file configs/telegram_seeds.json --dry-run` printed the ten enabled candidate seeds with depth 1 and cap 50, without collection.
- Known risk or unresolved issue:
  - `--candidate-only` is currently always enabled by the CLI implementation; the guide records this explicitly.
- Next best step:
  - Run a bounded fresh collection, export the database, and audit retained records before increasing message or channel limits.

### Session 032

- Date: 2026-07-14
- Goal: make deduplication aggressive enough to remove Telegram templates with a long identical promotion prefix and different username tails.
- Completed:
  - Added shared-prefix similarity to the reusable deduplication layer.
  - A pair is now a near duplicate when it meets the existing Jaccard or containment rule, or when it has at least 20 initial canonical tokens in common and those tokens cover at least 80% of the shorter text.
  - Added unit and storage integration regression tests for the policy.
- Verification run:
  - Red test: `shared_prefix_similarity` import failed before implementation existed.
  - Focused green test: `uv run --no-cache python -m pytest --basetemp=.pytest-prefix-green-2 tests/unit/test_collection_deduplication.py tests/integration/test_collection_storage.py` passed 9 tests.
  - Direct sample check: the supplied repeated Telegram pair has 64 matching initial tokens and ratio `0.9014`; `is_near_duplicate` returned `True`.
  - Full verification: `uv run --no-cache python -m pytest --basetemp=.pytest-prefix-final` passed 20 tests.
  - Smoke verification: `uv run --no-cache python main.py` printed `Judol Detection monorepo is ready.`
- Known risk or unresolved issue:
  - The rule deliberately favors removing templated promotion variants. Re-run collection to a fresh database; existing records remain untouched.
- Next best step:
  - Run the Telegram collector to a fresh database and export it for a small manual audit of retained texts.

### Session 031

- Date: 2026-07-14
- Goal: eliminate the recurring Telegram promotion templates that differ only by a variable username tail.
- Completed:
  - Added reusable containment similarity beside Jaccard in `collection/deduplication.py`.
  - Canonical deduplication now ignores URLs, mentions, numbers, and one- or two-character tokens; a pair is rejected when either Jaccard meets its configured threshold or containment is at least `0.90`.
  - Applied the behavior through `CollectionStorage`, so current and future collectors share it without source-specific logic.
  - Added unit and storage integration tests covering a short promotion contained in a longer template.
- Verification run:
  - Red test: the containment import failed before the implementation existed.
  - Focused green test: `uv run --no-cache python -m pytest --basetemp=.pytest-containment-green tests/unit/test_collection_deduplication.py tests/integration/test_collection_storage.py` passed 7 tests.
  - Full verification: `uv run --no-cache python -m pytest --basetemp=.pytest-containment-final` passed 18 tests.
  - Smoke verification: `uv run --no-cache python main.py` printed `Judol Detection monorepo is ready.`
- Known risk or unresolved issue:
  - Existing databases and exports are not rewritten. Re-run the Telegram collection into a new database to apply the stricter filter from the beginning.
- Next best step:
  - Run the Telegram pilot to a fresh SQLite path, export it, and inspect a sample of retained documents before using it as the research candidate dataset.

### Session 030

- Date: 2026-07-14
- Goal: implement the approved reusable local collection foundation.
- Completed:
  - Added `judol_detection.collection` modules for deterministic Unicode-aware normalization, baseline keyword weak labels, SQLite schema, run lifecycle, exact normalized-text deduplication, annotation history, and export rows.
  - Added a source-adapter protocol and a direct CLI export script for CSV and Parquet.
  - Added pytest and project-local test configuration because the default Windows temporary directory was inaccessible in this environment.
  - Added unit and integration coverage for weak labels, normalization, deduplication, run failure state, annotations, exports, and direct script execution.
- Verification run:
  - Red and green tests were recorded for normalizer/keyword, storage, export, and direct CLI behavior.
  - `uv run --no-cache python -m pytest` passed 8 tests.
  - `uv run --no-cache python main.py` printed `Judol Detection monorepo is ready.`
- Known risk or unresolved issue:
  - The standard `init.ps1` path can fail while synchronizing an in-use `.venv` file on this machine; focused `uv run --no-cache` verification passed.
  - No live network collector has been added; select an allowed source adapter separately.
- Next best step:
  - Add the first approved source adapter using `collectors.base.Collector`, without duplicating storage, normalization, or weak-label code.

### Session 001

- Date: 2026-06-28
- Goal: prepare durable repo guidance for the JudolLens browser extension before implementation.
- Completed:
  - Added extension planning documents under `docs/extension/`.
  - Updated `AGENTS.md` with WXT, MVP, UI, storage, mock predictor, roadmap, and harness workflow guidance.
  - Added static UI previews for JudolLens.
- Verification run:
  - Checked key files with `Select-String`.
  - Checked working tree with `git status --short`.
- Evidence captured:
  - `docs/extension/wxt-best-practices.md`
  - `docs/extension/mvp-architecture.md`
  - `docs/extension/api-contract.md`
  - `docs/extension/user-flows.md`
  - `docs/extension/feature-scope-mvp.md`
  - `docs/extension/ui-screen-plan.md`
  - `docs/extension/ui-theme.md`
  - `docs/extension/storage-model.md`
  - `docs/extension/mock-predictor.md`
  - `docs/extension/frontend-roadmap.md`
  - `docs/extension/design-preview.html`
  - `docs/extension/design-preview-popup.html`
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `AGENTS.md`
  - `docs/extension/`
- Known risk or unresolved issue:
  - WXT extension has not been scaffolded yet.
  - Static UI previews are design references, not production WXT screens.
  - FastAPI integration is intentionally deferred.
- Next best step:
  - Continue with `EXT-000` by scaffolding WXT + React + TypeScript under `apps/browser-extension/`.

### Session 002

- Date: 2026-06-28
- Goal: adapt `AGENTS.md` and repo harness artifacts to the walkinglabs harness-engineering templates without losing existing JudolLens repository rules.
- Completed:
  - Reworked `AGENTS.md` with startup workflow, working rules, required artifacts, definition of done, and end-of-session rules.
  - Added `claude-progress.md` as the historical session log and current verified status file.
  - Added `feature_list.json` as the machine-readable feature tracker for extension milestones.
  - Added `init.sh` and `init.ps1` startup scripts.
  - Added optional harness artifacts: `session-handoff.md`, `clean-state-checklist.md`, `evaluator-rubric.md`, and `quality-document.md`.
- Verification run:
  - `Get-Content -Path feature_list.json | ConvertFrom-Json | Out-Null`
  - `uv run python main.py`
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1` was attempted and initially failed because `uv run python main.py` touched a blocked local uv cache.
  - `sh ./init.sh` was attempted and failed because `sh` is not installed in this PowerShell environment.
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1` passed after startup commands were changed to use `uv --no-cache`.
- Evidence captured:
  - `feature_list.json` parses as JSON.
  - `uv run python main.py` prints `Judol Detection monorepo is ready.`
  - `init.ps1` was added for Windows/PowerShell compatibility.
  - `init.ps1` now runs `uv sync --no-cache` and `uv run --no-cache python main.py` successfully.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `AGENTS.md`
  - `claude-progress.md`
  - `feature_list.json`
  - `init.sh`
  - `init.ps1`
  - `session-handoff.md`
  - `clean-state-checklist.md`
  - `evaluator-rubric.md`
  - `quality-document.md`
- Known risk or unresolved issue:
  - `init.sh` requires a POSIX shell or Git Bash; use `.\init.ps1` in the current PowerShell environment.
  - Use `--no-cache` for uv commands on this machine unless the uv cache permission issue is fixed.
- Next best step:
  - Continue with `EXT-000` by scaffolding WXT + React + TypeScript under `apps/browser-extension/`.

### Session 003

- Date: 2026-06-28
- Goal: re-check the upstream walkinglabs template repository and align this repo's harness files more closely with the source templates.
- Completed:
  - Compared the repo setup against `walkinglabs/learn-harness-engineering` template guidance.
  - Reworked `claude-progress.md` into the `Progress Log` and `Session Log` style.
  - Reworked `feature_list.json` to include `last_updated`, harness rules, and a `status_legend`.
  - Added optional harness artifacts inspired by the template guide: `session-handoff.md`, `clean-state-checklist.md`, `evaluator-rubric.md`, and `quality-document.md`.
- Verification run:
  - `Get-Content -Path feature_list.json | ConvertFrom-Json | Out-Null`
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
- Evidence captured:
  - `feature_list.json` parses as valid JSON.
  - `init.ps1` runs `uv sync --no-cache` and `uv run --no-cache python main.py` successfully.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `claude-progress.md`
  - `feature_list.json`
  - `session-handoff.md`
  - `clean-state-checklist.md`
  - `evaluator-rubric.md`
  - `quality-document.md`
- Known risk or unresolved issue:
  - POSIX `init.sh` still requires a shell such as Git Bash.
  - WXT extension scaffold is still not started.
- Next best step:
  - Continue with `EXT-000` by scaffolding WXT + React + TypeScript under `apps/browser-extension/`.

### Session 004

- Date: 2026-06-28
- Goal: ignore local-only AI assistant/runtime files without excluding durable repository docs or harness artifacts.
- Completed:
  - Updated `.gitignore` with local AI assistant/runtime patterns.
  - Kept `docs/`, `AGENTS.md`, `claude-progress.md`, `feature_list.json`, and other harness files trackable.
- Verification run:
  - Reviewed `.gitignore`.
- Evidence captured:
  - `.gitignore` now ignores `.agents/`, `.codex/`, `.claude/`, `.cursor/`, `.continue/`, `.aider*`, `.roo/`, and `.windsurf/`.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `.gitignore`
  - `claude-progress.md`
- Known risk or unresolved issue:
  - If a future AI tool stores project-important source files under one of these ignored folders, move those files into tracked repo paths first.
- Next best step:
  - Continue with `EXT-000` by scaffolding WXT + React + TypeScript under `apps/browser-extension/`.

### Session 005

- Date: 2026-06-28
- Goal: verify user-completed WXT + React scaffold for `apps/browser-extension`.
- Completed:
  - Confirmed WXT scaffold exists under `apps/browser-extension`.
  - Confirmed `wxt.config.ts` includes `@wxt-dev/module-react`.
  - Confirmed entrypoints exist for background, content script, and React popup.
  - Marked `EXT-000` as passing in `feature_list.json`.
- Verification run:
  - User ran `pnpm dev`; WXT 0.20.27 started dev server at `http://localhost:3000` and built `.output/chrome-mv3-dev`.
  - Agent ran `pnpm compile`.
  - Agent ran `pnpm build`.
- Evidence captured:
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output.
  - `apps/browser-extension/.output/chrome-mv3-dev/manifest.json` exists.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `feature_list.json`
  - `claude-progress.md`
- Known risk or unresolved issue:
  - Scaffold still uses default WXT starter name and metadata: `wxt-react-starter`, default popup title, and default content script match for Google.
  - Next implementation should rename/configure JudolLens metadata before building real features.
- Next best step:
  - Start `EXT-001` by adding shared frontend types from `docs/extension/api-contract.md` and `docs/extension/storage-model.md`.

### Session 006

- Date: 2026-06-28
- Goal: insert a UI foundation milestone for Tailwind CSS + shadcn/ui before shared frontend types.
- Completed:
  - Added `EXT-001` for Tailwind CSS + shadcn/ui foundation.
  - Renumbered shared frontend types and later extension milestones.
  - Updated `docs/extension/frontend-roadmap.md` with a UI Foundation milestone.
  - Updated `docs/extension/ui-theme.md` with official UI stack guidance.
- Verification run:
  - `Get-Content -Path feature_list.json | ConvertFrom-Json | Out-Null`
  - `pnpm compile`
  - `pnpm build`
- Evidence captured:
  - `feature_list.json` remains valid JSON after milestone renumbering.
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with WXT production `chrome-mv3` output.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `feature_list.json`
  - `docs/extension/frontend-roadmap.md`
  - `docs/extension/ui-theme.md`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - Tailwind CSS and shadcn/ui are planned but not installed yet.
- Next best step:
  - Start `EXT-001` by installing Tailwind CSS, shadcn/ui, lucide-react, and minimal UI components for extension-owned React screens.

### Session 007

- Date: 2026-06-28
- Goal: update local agent instructions so future agents inspect available skills, plugins, and MCP tools before planning or implementing tasks.
- Completed:
  - Added `Capability Selection Workflow` to `AGENTS.md`.
  - Updated startup workflow to require checking available skills, plugins, and MCP tools before choosing an approach.
- Verification run:
  - Reviewed `AGENTS.md` with `Select-String`.
- Evidence captured:
  - `AGENTS.md` now instructs agents to compare the task against available capabilities and use the smallest relevant set.
- Commits: not committed; `AGENTS.md` is local-only and ignored by Git.
- Files or artifacts updated:
  - `AGENTS.md`
  - `claude-progress.md`
- Known risk or unresolved issue:
  - Capability availability can vary by session, so future agents must still inspect the live tool list rather than assume a plugin is callable.
- Next best step:
  - Start `EXT-001` by installing Tailwind CSS, shadcn/ui, lucide-react, and minimal UI components for extension-owned React screens.

### Session 008

- Date: 2026-06-28
- Goal: implement `EXT-001` Tailwind CSS + shadcn/ui foundation for the WXT React browser extension.
- Completed:
  - Installed Tailwind CSS v4, `@tailwindcss/vite`, shadcn/ui manual dependencies, `lucide-react`, `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `tw-animate-css`.
  - Added manual shadcn configuration for WXT through `components.json`.
  - Added `src/styles/global.css` with Tailwind imports, shadcn CSS variables, and JudolLens theme tokens.
  - Added `src/lib/utils.ts` with the shadcn `cn()` helper.
  - Added selected shadcn/ui components under `apps/browser-extension/src/components/ui/`.
  - Updated `wxt.config.ts` with the Tailwind Vite plugin and runtime aliases for `@/components`, `@/lib`, `@/hooks`, and `@/src`.
  - Replaced the WXT starter popup with a minimal JudolLens UI foundation proof using `Button`, `Badge`, `Separator`, `TooltipProvider`, and lucide-react icons.
  - Updated `docs/extension/ui-theme.md` with the WXT manual shadcn configuration note.
  - Marked `EXT-001` as passing in `feature_list.json`.
- Verification run:
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
  - `pnpm dlx shadcn@latest info`
  - `pnpm dlx shadcn@latest docs button badge switch input textarea select slider table tabs tooltip separator`
  - `pnpm compile`
  - `pnpm build`
  - `pnpm exec wxt build -m development`
  - Inspected generated development CSS and JS output for Tailwind JudolLens classes, theme variables, and popup proof text.
- Evidence captured:
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output.
  - `pnpm exec wxt build -m development` completed with development `chrome-mv3-dev` output.
  - `.output/chrome-mv3-dev/assets/*.css` contains `bg-graphite-950`, `text-unicode-amber`, and JudolLens CSS variables.
  - `.output/chrome-mv3-dev/chunks/*.js` contains `JudolLens`, `UI foundation proof`, and shadcn component code.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `apps/browser-extension/package.json`
  - `apps/browser-extension/pnpm-lock.yaml`
  - `apps/browser-extension/components.json`
  - `apps/browser-extension/wxt.config.ts`
  - `apps/browser-extension/tsconfig.json`
  - `apps/browser-extension/entrypoints/popup/App.tsx`
  - `apps/browser-extension/entrypoints/popup/main.tsx`
  - `apps/browser-extension/src/`
  - `docs/extension/ui-theme.md`
  - `feature_list.json`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - shadcn CLI does not auto-detect WXT, so keep manual config and aliases aligned.
  - `pnpm dev` bounded attempts did not provide usable captured output in the shell harness; run it interactively for browser smoke checks.
  - Popup is only an EXT-001 proof surface, not the final popup MVP.
- Next best step:
  - Start `EXT-002` by adding shared frontend types from `docs/extension/api-contract.md` and `docs/extension/storage-model.md`.

### Session 009

- Date: 2026-06-29
- Goal: implement `EXT-002` shared frontend TypeScript contracts for the browser extension.
- Completed:
  - Added shared prediction, platform, storage, and message contracts under `apps/browser-extension/src/shared/`.
  - Added `apps/browser-extension/src/shared/index.ts` as the shared barrel export.
  - Added `@/shared` and `@/shared/*` TypeScript aliases.
  - Added WXT/Vite runtime alias for `@/shared`.
  - Added type-only smoke imports in background and content entrypoints.
  - Updated `docs/extension/api-contract.md` and `docs/extension/storage-model.md` with canonical shared type implementation locations.
  - Marked `EXT-002` as passing in `feature_list.json`.
- Verification run:
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
  - Red check: `pnpm compile` failed before shared modules existed with missing `@/shared`.
  - Green check: `pnpm compile`
  - `pnpm build`
  - `pnpm exec wxt build -m development`
  - `Get-Content -Path feature_list.json | ConvertFrom-Json | Out-Null`
- Evidence captured:
  - TypeScript smoke imports failed for the expected missing-module reason before implementation.
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output.
  - `pnpm exec wxt build -m development` completed with development `chrome-mv3-dev` output.
  - `feature_list.json` parses as valid JSON.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `apps/browser-extension/src/shared/`
  - `apps/browser-extension/entrypoints/background.ts`
  - `apps/browser-extension/entrypoints/content.ts`
  - `apps/browser-extension/tsconfig.json`
  - `apps/browser-extension/wxt.config.ts`
  - `docs/extension/api-contract.md`
  - `docs/extension/storage-model.md`
  - `feature_list.json`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - EXT-002 only defines contracts and defaults; no storage implementation, scanner, predictor, or UI state wiring exists yet.
  - Future API adapter must still map camelCase frontend fields to snake_case FastAPI payloads if the backend uses snake_case.
- Next best step:
  - Start `EXT-003` by implementing the deterministic rule-based mock predictor from `docs/extension/mock-predictor.md`.

### Session 010

- Date: 2026-06-29
- Goal: implement `EXT-003` deterministic rule-based mock predictor for JudolLens.
- Completed:
  - Installed Vitest and added `test` plus `test:run` scripts for `apps/browser-extension`.
  - Added predictor tests for plain judol, Unicode homoglyph obfuscation, false-positive single keyword, repeated keyword deduplication, batch summary, and empty input.
  - Added predictor modules under `apps/browser-extension/src/predictor/`.
  - Added keyword dictionaries, Unicode normalization/evidence extraction, deterministic scoring, batch prediction, and public exports.
  - Marked `EXT-003` as passing in `feature_list.json`.
- Verification run:
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
  - Red check: `pnpm test:run` failed before `./mock-predictor` existed.
  - Green check: `pnpm test:run`
  - `pnpm compile`
  - `pnpm build`
  - `pnpm exec wxt build -m development`
- Evidence captured:
  - Red Vitest run failed for the expected missing predictor module.
  - `pnpm test:run` passed 6 tests in 1 file.
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output.
  - `pnpm exec wxt build -m development` completed with development `chrome-mv3-dev` output.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `apps/browser-extension/package.json`
  - `apps/browser-extension/pnpm-lock.yaml`
  - `apps/browser-extension/src/predictor/`
  - `feature_list.json`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - Predictor is not wired into background, content script, storage, or popup yet.
  - Unicode mapping is intentionally scoped to documented demo/research cases and should expand only with tests.
  - The rule-based predictor is a baseline, not the final ML model.
- Next best step:
  - Start `EXT-004` by implementing the extension storage layer from `docs/extension/storage-model.md`.

### Session 011

- Date: 2026-06-29
- Goal: implement `EXT-004` typed storage layer for the JudolLens browser extension.
- Completed:
  - Added storage tests for default settings, merged settings updates, session stats defaults, source URL privacy, bounded newest-first detection logs, clear logs, manual input bounds, and manual state clear behavior.
  - Added storage helpers under `apps/browser-extension/src/storage/`.
  - Added a dependency-injected `StorageArea` and production WXT local storage adapter using `wxt/utils/storage`.
  - Added `@/storage` and `@/storage/*` aliases to TypeScript and WXT/Vite config.
  - Added a type-only background smoke import for `@/storage`.
  - Updated `docs/extension/storage-model.md` with the storage helper location and newest-first log ordering.
  - Marked `EXT-004` as passing in `feature_list.json`.
- Verification run:
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
  - Red check: `pnpm test:run` failed because `./storage-service` did not exist yet.
  - Green check: `pnpm test:run`
  - `pnpm compile`
  - `pnpm build`
  - `pnpm exec wxt build -m development`
- Evidence captured:
  - Red Vitest run failed for the expected missing storage service module.
  - `pnpm test:run` passed 11 tests in 2 files.
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output.
  - `pnpm exec wxt build -m development` completed with development `chrome-mv3-dev` output.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `apps/browser-extension/src/storage/`
  - `apps/browser-extension/src/storage/storage-service.test.ts`
  - `apps/browser-extension/entrypoints/background.ts`
  - `apps/browser-extension/tsconfig.json`
  - `apps/browser-extension/wxt.config.ts`
  - `docs/extension/storage-model.md`
  - `feature_list.json`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - Storage helpers are not wired into background, content script, popup, options, or manual analysis yet.
  - Storage currently has no migration path beyond `schemaVersion: 1`.
  - Detection logs are ordered newest-first by implementation decision; UI code should preserve that assumption.
- Next best step:
  - Start `EXT-005` by building the popup MVP using the storage helpers, shared types, mock predictor evidence contract, and existing UI foundation.

### Session 012

- Date: 2026-06-29
- Goal: implement `EXT-005` storage-backed popup MVP for JudolLens.
- Completed:
  - Added pure popup view-model helpers in `entrypoints/popup/popup-model.ts`.
  - Added popup model tests covering active clean, detected, disabled, error, and page-protection patch behavior.
  - Replaced the EXT-001 proof popup with a storage-backed control center.
  - Popup now reads settings, session stats, and newest-first recent logs from `@/storage`.
  - Popup updates page protection, auto blur, and Unicode highlight through `updateExtensionSettings`.
  - Rendered Logs and Options as visible disabled placeholders until EXT-011.
  - Added Playwright extension e2e setup with `pnpm test:e2e`.
  - Added WXT manifest `storage` permission after e2e caught the missing permission.
  - Updated `docs/extension/frontend-roadmap.md` to document placeholder navigation for EXT-005.
  - Updated `AGENTS.md` to require Playwright verification and saved screenshots for browser-extension UI changes.
  - Added `docs/extension/screenshots/` as the durable location for UI verification screenshots.
  - Marked `EXT-005` as passing in `feature_list.json`.
- Verification run:
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
  - Red check: `pnpm test:run` failed because `./popup-model` did not exist yet.
  - Green check: `pnpm test:run`
  - `pnpm compile`
  - `pnpm build`
  - `pnpm exec wxt build -m development`
  - `pnpm test:e2e`
  - `node --check scripts/serve-simulation.mjs`
- Evidence captured:
  - Red Vitest run failed for the expected missing popup model module.
  - `pnpm test:run` passed 16 tests in 3 files.
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output.
  - `pnpm exec wxt build -m development` completed with development `chrome-mv3-dev` output.
  - Initial Playwright e2e run opened the extension but failed on missing `storage` manifest permission.
  - After adding `manifest.permissions: ["storage"]`, `pnpm test:e2e` passed 1 Playwright extension test.
  - Playwright screenshot evidence saved to `docs/extension/screenshots/ext-005-popup-control-center.png`.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `apps/browser-extension/entrypoints/popup/App.tsx`
  - `apps/browser-extension/entrypoints/popup/popup-model.ts`
  - `apps/browser-extension/entrypoints/popup/popup-model.test.ts`
  - `apps/browser-extension/tests/e2e/popup.spec.ts`
  - `apps/browser-extension/playwright.config.ts`
  - `apps/browser-extension/package.json`
  - `apps/browser-extension/pnpm-lock.yaml`
  - `apps/browser-extension/wxt.config.ts`
  - `docs/extension/frontend-roadmap.md`
  - `docs/extension/storage-model.md`
  - `docs/extension/screenshots/.gitkeep`
  - `AGENTS.md`
  - `feature_list.json`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - Popup reads storage on open but does not receive live background updates yet.
  - Logs and Options buttons are placeholders until EXT-011.
  - `pnpm exec wxt build -m development` emits a chunk-size warning above 500 kB, but exits successfully.
  - Playwright e2e currently validates the popup production extension output; dynamic page scanning still waits for EXT-006/EXT-007.
- Next best step:
  - Start `EXT-006` by implementing the content script DOM scanner with safe TreeWalker extraction and focused scanner tests.

### Session 013

- Date: 2026-06-29
- Goal: implement `EXT-006` content script DOM scanner for JudolLens.
- Completed:
  - Installed `happy-dom` for Vitest DOM tests.
  - Added TreeWalker-based scanner helpers in `apps/browser-extension/src/dom/`.
  - Added scanner tests for visible text extraction, unsafe/editable/hidden skips, short text skips, markup preservation, processed-node deduplication, batch request creation, platform mapping, and empty batches.
  - Added scan batch request/message helpers compatible with shared prediction/message contracts.
  - Added `@/dom` and `@/dom/*` aliases.
  - Updated the content script from Google-only smoke code to MVP matches for YouTube, Telegram Web, X/Twitter, localhost, and 127.0.0.1 simulation targets.
  - Content script now runs an initial extraction-only scan and sends `judollens:scan-batch` best-effort.
  - Updated frontend roadmap and MVP architecture docs to state EXT-006 is extraction-only.
  - Marked `EXT-006` as passing in `feature_list.json`.
- Verification run:
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
  - Red check: `pnpm test:run -- src/dom/dom-scanner.test.ts` failed because `./dom-scanner` did not exist yet.
  - Focused green check: `pnpm test:run -- src/dom/dom-scanner.test.ts`
  - Full green check: `pnpm test:run`
  - `pnpm compile`
  - `pnpm build`
  - `pnpm exec wxt build -m development`
  - `pnpm test:e2e`
- Evidence captured:
  - Red Vitest run failed for the expected missing scanner module.
  - Focused scanner run passed with the full extension Vitest suite.
  - Full `pnpm test:run` passed 22 tests in 4 files.
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output.
  - `pnpm exec wxt build -m development` completed with development `chrome-mv3-dev` output and the existing popup chunk-size warning.
  - `pnpm test:e2e` passed 1 Playwright popup extension test.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `apps/browser-extension/entrypoints/content.ts`
  - `apps/browser-extension/src/dom/`
  - `apps/browser-extension/tsconfig.json`
  - `apps/browser-extension/wxt.config.ts`
  - `apps/browser-extension/package.json`
  - `apps/browser-extension/pnpm-lock.yaml`
  - `docs/extension/frontend-roadmap.md`
  - `docs/extension/mvp-architecture.md`
  - `feature_list.json`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - Background does not handle `judollens:scan-batch` yet, so content script send failures are expected and safely ignored until EXT-007.
  - Scanner does not apply overlays, write storage, or process dynamic MutationObserver content yet.
  - Visibility detection uses DOM/style checks suitable for MVP tests; real platform-specific refinements may be needed after simulation/overlay milestones.
- Next best step:
  - Start `EXT-007` by adding the background prediction coordinator that receives scan batches, runs the mock predictor, updates session stats/logs, and returns results.

### Session 014

- Date: 2026-06-29
- Goal: implement `EXT-007` background prediction coordinator for JudolLens.
- Completed:
  - Added dependency-injected background coordinator in `apps/browser-extension/src/background/`.
  - Coordinator handles `judollens:scan-batch`, runs the mock predictor, updates session stats, appends detection logs, and returns typed batch responses.
  - Coordinator supports existing get-state, update-settings, and clear-logs message contracts.
  - Updated `entrypoints/background.ts` to register `browser.runtime.onMessage` and delegate to the coordinator.
  - Added tests for scan batch prediction/logging, accumulated session stats, and coordinator error recording.
  - Updated frontend roadmap and MVP architecture docs to record the EXT-007 boundary.
  - Marked `EXT-007` as passing in `feature_list.json`.
- Verification run:
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
  - Red check: `pnpm test:run -- src/background/background-coordinator.test.ts` failed because `./background-coordinator` did not exist yet.
  - Focused green check: `pnpm test:run -- src/background/background-coordinator.test.ts`
  - Full green check: `pnpm test:run`
  - `pnpm compile`
  - `pnpm build`
  - `pnpm exec wxt build -m development`
  - `pnpm test:e2e`
- Evidence captured:
  - Red Vitest run failed for the expected missing background coordinator module.
  - Focused coordinator run passed with the full extension Vitest suite.
  - Full `pnpm test:run` passed 25 tests in 5 files.
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output.
  - `pnpm exec wxt build -m development` completed with development `chrome-mv3-dev` output and the existing popup chunk-size warning.
  - `pnpm test:e2e` passed 1 Playwright popup extension test.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `apps/browser-extension/entrypoints/background.ts`
  - `apps/browser-extension/src/background/`
  - `docs/extension/frontend-roadmap.md`
  - `docs/extension/mvp-architecture.md`
  - `feature_list.json`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - Popup still reads storage on open, not live background push updates.
  - Content script receives prediction responses, but overlay application starts in EXT-008.
  - Development build still emits the existing popup chunk-size warning above 500 kB.
- Next best step:
  - Start `EXT-008` by applying on-page blur/warn overlay and Unicode highlighting from prediction results.

### Session 015

- Date: 2026-06-29
- Goal: implement `EXT-008` on-page overlay for JudolLens detection results.
- Completed:
  - Added scanner refs so content script can keep text-node references locally while prediction requests stay plain JSON.
  - Added overlay helpers for blur, warning, Unicode span highlight, duplicate prevention, label rendering, and scoped style injection.
  - Added `runJudolLensScanOnce` to connect scan candidates, background response, and overlay application.
  - Updated content script to apply overlays from background scan responses.
  - Added Playwright overlay fixture page and screenshot evidence at `docs/extension/screenshots/ext-008-on-page-overlay.png`.
  - Updated `docs/extension/frontend-roadmap.md` and `docs/extension/ui-screen-plan.md` with EXT-008 overlay decisions.
  - Marked `EXT-008` as passing in `feature_list.json`.
- Verification run:
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
  - Red check: `pnpm test:run -- src/dom/overlay.test.ts src/dom/dom-scanner.test.ts` failed because overlay and scanner-ref helpers did not exist yet.
  - Red check: `pnpm test:run -- src/dom/content-scan.test.ts` failed because `./content-scan` did not exist yet.
  - Focused green check: `pnpm test:run -- src/dom/content-scan.test.ts src/dom/overlay.test.ts src/dom/dom-scanner.test.ts`
  - Full green check: `pnpm test:run`
  - `pnpm compile`
  - `pnpm build`
  - `pnpm exec wxt build -m development`
  - `pnpm test:e2e`
- Evidence captured:
  - Full `pnpm test:run` passed 33 tests in 7 files.
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output.
  - `pnpm exec wxt build -m development` completed with development `chrome-mv3-dev` output and the existing popup chunk-size warning.
  - First overlay Playwright run failed because the fixture produced 4 suspicious Unicode spans, not 2; investigation showed `10k` contributes `1` and `0` symbol spans in addition to two homoglyph spans.
  - Final `pnpm test:e2e` passed 2 Playwright tests and saved `docs/extension/screenshots/ext-008-on-page-overlay.png`.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `apps/browser-extension/entrypoints/content.ts`
  - `apps/browser-extension/src/dom/`
  - `apps/browser-extension/tests/e2e/popup.spec.ts`
  - `apps/browser-extension/tests/e2e/fixtures/overlay-page.html`
  - `docs/extension/screenshots/ext-008-on-page-overlay.png`
  - `docs/extension/frontend-roadmap.md`
  - `docs/extension/ui-screen-plan.md`
  - `feature_list.json`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - Dynamic content is not handled until EXT-009.
  - Overlay currently uses default MVP behavior with Unicode highlight on; settings-driven overlay behavior can be refined later.
  - Development build still emits the existing popup chunk-size warning above 500 kB.
- Next best step:
  - Start `EXT-009` by adding MutationObserver-driven dynamic content scanning and debouncing without rescanning unchanged nodes.

### Session 016

- Date: 2026-06-29
- Goal: implement `EXT-009` MutationObserver dynamic content scanning for JudolLens.
- Completed:
  - Added `createDynamicContentObserver` with added-node filtering, 150ms debounce, `start()`/`stop()`, injected timers, and JudolLens overlay-node ignores.
  - Added `runJudolLensScanForRoots` so initial and dynamic scans share the same batch-and-overlay flow while keeping DOM nodes local.
  - Updated content script to run an initial scan, then start a debounced `MutationObserver` using WXT `ctx.setTimeout`.
  - Updated Playwright overlay fixture with a dynamic insert button.
  - Added Playwright coverage for dynamic inserted content and screenshot evidence at `docs/extension/screenshots/ext-009-dynamic-overlay.png`.
  - Updated frontend roadmap and MVP architecture docs with the EXT-009 boundary.
  - Marked `EXT-009` as passing in `feature_list.json`.
- Verification run:
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
  - Red check: `pnpm test:run -- src/dom/dynamic-observer.test.ts src/dom/content-scan.test.ts` failed because `./dynamic-observer` and `runJudolLensScanForRoots` did not exist yet.
  - Focused green check: `pnpm test:run -- src/dom/dynamic-observer.test.ts src/dom/content-scan.test.ts`
  - Full green check: `pnpm test:run`
  - `pnpm compile`
  - `pnpm build`
  - `pnpm exec wxt build -m development`
  - `pnpm test:e2e`
- Evidence captured:
  - Focused EXT-009 tests passed after implementation.
  - Full `pnpm test:run` passed 38 tests in 8 files.
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output.
  - `pnpm exec wxt build -m development` completed with development `chrome-mv3-dev` output and the existing popup chunk-size warning.
  - First EXT-009 Playwright run proved dynamic overlay count reached 3, then failed on an ambiguous text locator; the locator was tightened.
  - Final `pnpm test:e2e` passed 3 Playwright tests and saved `docs/extension/screenshots/ext-009-dynamic-overlay.png`.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `apps/browser-extension/entrypoints/content.ts`
  - `apps/browser-extension/src/dom/content-scan.ts`
  - `apps/browser-extension/src/dom/content-scan.test.ts`
  - `apps/browser-extension/src/dom/dynamic-observer.ts`
  - `apps/browser-extension/src/dom/dynamic-observer.test.ts`
  - `apps/browser-extension/src/dom/index.ts`
  - `apps/browser-extension/tests/e2e/popup.spec.ts`
  - `apps/browser-extension/tests/e2e/fixtures/overlay-page.html`
  - `docs/extension/screenshots/ext-009-dynamic-overlay.png`
  - `docs/extension/frontend-roadmap.md`
  - `docs/extension/mvp-architecture.md`
  - `feature_list.json`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - Dynamic observer handles added nodes only; attribute and characterData mutations are intentionally out of scope for MVP.
  - Product simulation page is still EXT-010; EXT-009 uses a dedicated e2e fixture.
  - Development build still emits the existing popup chunk-size warning above 500 kB.
- Next best step:
  - Start `EXT-010` by building the local simulation page for repeatable thesis evaluation scenarios.

### Session 017

- Date: 2026-06-29
- Goal: implement `EXT-010` local simulation page MVP for JudolLens.
- Completed:
  - Added a static local HTTP simulation page under `apps/browser-extension/simulation/index.html`.
  - Added baseline scenarios for clean text, false-positive trap, plain judol, Unicode-obfuscated judol, mixed feed, and dynamic insertion.
  - Stored expected labels as data/JSON metadata rather than visible scannable hints.
  - Added `apps/browser-extension/scripts/serve-simulation.mjs` and `pnpm simulation` for local demo at `http://127.0.0.1:4173/`.
  - Refactored Playwright extension helpers into `tests/e2e/test-utils.ts`.
  - Added simulation e2e coverage and screenshot evidence at `docs/extension/screenshots/ext-010-simulation-page.png`.
  - Updated frontend roadmap and UI screen plan with the local HTTP target-page decision.
  - Marked `EXT-010` as passing in `feature_list.json`.
- Verification run:
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
  - Red check: `pnpm exec playwright test tests/e2e/simulation.spec.ts` failed because `simulation/index.html` did not exist yet.
  - Focused green check: `pnpm exec playwright test tests/e2e/simulation.spec.ts`
  - `Get-Content -Path feature_list.json | ConvertFrom-Json | Out-Null`
  - `pnpm test:run`
  - `pnpm compile`
  - `pnpm build`
  - `pnpm exec wxt build -m development`
  - `pnpm test:e2e`
- Evidence captured:
  - Focused simulation e2e passed after adding the page and server script.
  - Full `pnpm test:run` passed 38 tests in 8 files.
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output.
  - `pnpm exec wxt build -m development` completed with development `chrome-mv3-dev` output and the existing popup chunk-size warning.
  - Final `pnpm test:e2e` passed 4 Playwright tests: popup, static overlay fixture, dynamic overlay fixture, and simulation page.
  - `node --check scripts/serve-simulation.mjs` completed without syntax errors.
  - Screenshot evidence saved to `docs/extension/screenshots/ext-010-simulation-page.png`.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `apps/browser-extension/package.json`
  - `apps/browser-extension/scripts/serve-simulation.mjs`
  - `apps/browser-extension/simulation/index.html`
  - `apps/browser-extension/tests/e2e/popup.spec.ts`
  - `apps/browser-extension/tests/e2e/simulation.spec.ts`
  - `apps/browser-extension/tests/e2e/test-utils.ts`
  - `docs/extension/screenshots/ext-010-simulation-page.png`
  - `docs/extension/frontend-roadmap.md`
  - `docs/extension/ui-screen-plan.md`
  - `feature_list.json`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - Simulation server is a local demo helper only; it is not part of production extension output.
  - Popup still refreshes storage on open rather than receiving live background push updates.
  - Development build still emits the existing popup chunk-size warning above 500 kB.
- Next best step:
  - Start `EXT-011` by building options and log review pages for MVP 2.

### Session 018

- Date: 2026-06-29
- Goal: implement `EXT-011` Options and Log Review pages for JudolLens.
- Completed:
  - Added full-page WXT React Options entrypoint with settings controls for prediction mode, API endpoint, threshold, censor mode, auto blur, Unicode highlight, platform scope, max logs, bounded evidence, source URL behavior, reset defaults, and diagnostics.
  - Added full-page WXT React Logs entrypoint with summary cards, search/platform/risk/Unicode filters, detection table, detail panel, model metadata, and clear-log behavior.
  - Added pure options/logs view-model helpers plus Vitest coverage for formatting, settings patches, reset defaults, summary counts, filters, default selection, and empty states.
  - Updated popup Logs and Options buttons from disabled placeholders to active navigation.
  - Added Playwright e2e coverage for options persistence, logs review/filter/clear, and popup navigation.
  - Saved screenshot evidence for Options and Logs pages.
  - Updated frontend roadmap and UI screen plan with final EXT-011 behavior.
  - Marked `EXT-011` as passing in `feature_list.json`.
- Verification run:
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
  - Red check: `pnpm test:run -- entrypoints/options/options-model.test.ts entrypoints/logs/logs-model.test.ts` failed before model modules existed.
  - Focused green check: `pnpm test:run -- entrypoints/options/options-model.test.ts entrypoints/logs/logs-model.test.ts`
  - `Get-Content -Path feature_list.json | ConvertFrom-Json | Out-Null`
  - `pnpm test:run`
  - `pnpm compile`
  - `pnpm build`
  - `pnpm exec wxt build -m development`
  - `pnpm test:e2e`
- Evidence captured:
  - Focused options/logs model tests passed after implementation.
  - Full `pnpm test:run` passed 44 tests in 10 files.
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output including `options.html` and `logs.html`.
  - `pnpm exec wxt build -m development` completed with development `chrome-mv3-dev` output including `options.html` and `logs.html`.
  - Final `pnpm test:e2e` passed 6 Playwright tests: options persistence, logs review, popup, static overlay fixture, dynamic overlay fixture, and simulation page.
  - Screenshot evidence saved to `docs/extension/screenshots/ext-011-options-page.png` and `docs/extension/screenshots/ext-011-log-review-page.png`.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `apps/browser-extension/entrypoints/options/`
  - `apps/browser-extension/entrypoints/logs/`
  - `apps/browser-extension/entrypoints/popup/App.tsx`
  - `apps/browser-extension/tests/e2e/options-logs.spec.ts`
  - `apps/browser-extension/tests/e2e/popup.spec.ts`
  - `docs/extension/screenshots/ext-011-options-page.png`
  - `docs/extension/screenshots/ext-011-log-review-page.png`
  - `docs/extension/frontend-roadmap.md`
  - `docs/extension/ui-screen-plan.md`
  - `feature_list.json`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - API health check remains a disabled coming-soon item until the backend integration milestone.
  - Manual analysis and context-menu selected-text flow remain EXT-012.
  - Logs clear history only; session counters intentionally remain session-level.
- Next best step:
  - Start `EXT-012` by building manual analysis for pasted/selected text, using existing mock predictor, storage, and log evidence contracts.

### Session 019

- Date: 2026-06-29
- Goal: implement `EXT-012` Manual Analysis flow for JudolLens.
- Completed:
  - Added full-page WXT React Manual Analysis entrypoint at `manual-analysis.html`.
  - Added textarea analysis flow for pasted text with result summary, matched terms, Unicode breakdown, reasons, model metadata, and save-to-logs behavior.
  - Added background messages for get manual analysis, analyze manual text, and save manual analysis.
  - Added background handling to run the mock predictor, persist `manual:lastAnalysis`, and append bounded logs for both `judol` and `non_judol` manual results.
  - Added context menu helper and registered `Analyze with JudolLens` for selected text.
  - Added `contextMenus` and `tabs` manifest permissions.
  - Added popup Analyze navigation and Logs label column so `NON_JUDOL` evidence is visible.
  - Added unit tests and Playwright e2e coverage for the manual analysis flow.
  - Updated storage model, frontend roadmap, and UI screen plan with EXT-012 behavior.
  - Marked `EXT-012` as passing in `feature_list.json`.
- Verification run:
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
  - Red check: `pnpm test:run -- entrypoints/manual-analysis/manual-analysis-model.test.ts src/background/background-coordinator.test.ts src/background/manual-context-menu.test.ts` failed before manual model/context-menu modules and background handlers existed.
  - Focused green check: `pnpm test:run -- entrypoints/manual-analysis/manual-analysis-model.test.ts src/background/background-coordinator.test.ts src/background/manual-context-menu.test.ts`
  - `Get-Content -Path feature_list.json | ConvertFrom-Json | Out-Null`
  - `pnpm test:run`
  - `pnpm compile`
  - `pnpm build`
  - `pnpm exec wxt build -m development`
  - Focused e2e: `pnpm exec playwright test tests/e2e/manual-analysis.spec.ts`
  - `pnpm test:e2e`
- Evidence captured:
  - Focused manual tests passed after implementation.
  - Full `pnpm test:run` passed 54 tests in 12 files.
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output including `manual-analysis.html`.
  - `pnpm exec wxt build -m development` completed with development `chrome-mv3-dev` output including `manual-analysis.html`.
  - Focused manual Playwright e2e passed after tightening strict locators.
  - Final `pnpm test:e2e` passed 7 Playwright tests: manual analysis, options persistence, logs review, popup, static overlay fixture, dynamic overlay fixture, and simulation page.
  - Screenshot evidence saved to `docs/extension/screenshots/ext-012-manual-analysis-page.png`.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `apps/browser-extension/entrypoints/manual-analysis/`
  - `apps/browser-extension/entrypoints/background.ts`
  - `apps/browser-extension/entrypoints/logs/`
  - `apps/browser-extension/entrypoints/popup/App.tsx`
  - `apps/browser-extension/src/background/`
  - `apps/browser-extension/src/shared/`
  - `apps/browser-extension/src/dom/dom-scanner.ts`
  - `apps/browser-extension/tests/e2e/manual-analysis.spec.ts`
  - `apps/browser-extension/tests/e2e/popup.spec.ts`
  - `apps/browser-extension/wxt.config.ts`
  - `docs/extension/screenshots/ext-012-manual-analysis-page.png`
  - `docs/extension/frontend-roadmap.md`
  - `docs/extension/ui-screen-plan.md`
  - `docs/extension/storage-model.md`
  - `feature_list.json`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - Copy result JSON remains post-MVP.
  - FastAPI integration and real model inference remain intentionally deferred.
  - Playwright does not directly invoke the browser context menu; selected-text preparation is covered by unit tests and the page flow is covered by e2e.
- Next best step:
  - Decide the next workstream after frontend MVP 2: likely FastAPI/API integration planning, evaluation dataset workflow, or thesis experiment documentation.

### Session 020

- Date: 2026-06-29
- Goal: implement `EXT-013` floating selection analyze trigger for JudolLens.
- Completed:
  - Added a vanilla DOM floating `Analyze with JudolLens` button that appears after users select text on supported target pages.
  - Added scoped `judollens-selection-*` CSS for the floating trigger.
  - Wired the content script to send selected text through `judollens:open-manual-analysis`.
  - Extended background coordinator message handling so selected text opens `manual-analysis.html` with the text prefilled.
  - Kept the existing browser context menu as fallback for normal right-click flows.
  - Added unit tests for floating button show/click/hide/cleanup behavior.
  - Added Playwright e2e coverage and screenshot evidence for selecting text, seeing the floating button, and opening Manual Analysis.
  - Updated frontend roadmap and UI screen plan with EXT-013 behavior.
  - Marked `EXT-013` as passing in `feature_list.json`.
- Verification run:
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
  - Red check: `pnpm test:run -- src/dom/selection-analyze-trigger.test.ts src/background/background-coordinator.test.ts` failed before selection trigger module and open-manual message handling existed.
  - Focused green check: `pnpm test:run -- src/dom/selection-analyze-trigger.test.ts src/background/background-coordinator.test.ts`
  - `Get-Content -Path feature_list.json | ConvertFrom-Json | Out-Null`
  - `pnpm test:run`
  - `pnpm compile`
  - `pnpm build`
  - Focused e2e: `pnpm exec playwright test tests/e2e/selection-trigger.spec.ts`
  - `pnpm exec wxt build -m development`
  - `pnpm test:e2e`
- Evidence captured:
  - Focused EXT-013 tests passed after implementation.
  - Full `pnpm test:run` passed 58 tests in 13 files.
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output.
  - `pnpm exec wxt build -m development` completed with development `chrome-mv3-dev` output.
  - Focused selection Playwright e2e passed.
  - Final `pnpm test:e2e` passed 8 Playwright tests: manual analysis, options/logs, popup, static overlay fixture, dynamic overlay fixture, selection trigger, and simulation page.
  - Screenshot evidence saved to `docs/extension/screenshots/ext-013-selection-floating-trigger.png`.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `apps/browser-extension/entrypoints/content.ts`
  - `apps/browser-extension/src/dom/selection-analyze-trigger.ts`
  - `apps/browser-extension/src/dom/selection-analyze-trigger.test.ts`
  - `apps/browser-extension/src/dom/index.ts`
  - `apps/browser-extension/src/background/background-coordinator.ts`
  - `apps/browser-extension/src/background/background-coordinator.test.ts`
  - `apps/browser-extension/src/shared/messages.ts`
  - `apps/browser-extension/tests/e2e/selection-trigger.spec.ts`
  - `docs/extension/screenshots/ext-013-selection-floating-trigger.png`
  - `docs/extension/frontend-roadmap.md`
  - `docs/extension/ui-screen-plan.md`
  - `feature_list.json`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - Floating trigger relies on browser Selection/Range geometry; heavily customized editors may still behave differently.
  - The trigger is intentionally scoped to supported content-script target pages.
- Next best step:
  - Commit EXT-013, then choose the next major workstream: extension demo/evaluation pass, FastAPI integration planning, dataset pipeline, or ML experiment workflow.

### Session 021

- Date: 2026-06-29
- Goal: implement `EXT-014` so Options settings control live simulation/content-script protection behavior.
- Completed:
  - Added `EXT-014` to `feature_list.json` and marked it passing after verification.
  - Updated content scan flow to fetch `judollens:get-extension-state` before initial and dynamic scans.
  - Enforced platform scope at runtime, including disabling simulation scans when Simulation is off.
  - Passed Options threshold and prediction mode into automatic scan batch requests.
  - Updated overlay behavior to respect `censorMode`, `autoBlur`, and `highlightUnicode`.
  - Added `judollens-hide` scoped CSS for hide mode and no-overlay behavior for censor mode `none`.
  - Updated background coordinator to use stored settings as the source of truth for automatic scan threshold/mode.
  - Made `storeBoundedEvidence=false` update session stats without appending detection logs.
  - Added unit and Playwright e2e coverage for live options behavior.
  - Updated frontend roadmap, UI screen plan, and storage model docs.
- Verification run:
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
  - Red check: `pnpm test:run -- src/dom/content-scan.test.ts src/dom/overlay.test.ts src/background/background-coordinator.test.ts` failed because live settings were not yet wired.
  - Focused green check: `pnpm test:run -- src/dom/content-scan.test.ts src/dom/overlay.test.ts src/background/background-coordinator.test.ts`
  - `Get-Content -Path feature_list.json | ConvertFrom-Json | Out-Null`
  - `pnpm test:run`
  - `pnpm compile`
  - `pnpm build`
  - `pnpm exec wxt build -m development`
  - Focused e2e: `pnpm exec playwright test tests/e2e/options-live-settings.spec.ts`
  - `pnpm test:e2e`
- Evidence captured:
  - Focused EXT-014 unit tests passed after implementation.
  - Full `pnpm test:run` passed 68 tests in 13 files.
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output.
  - `pnpm exec wxt build -m development` completed with development `chrome-mv3-dev` output.
  - Focused EXT-014 Playwright e2e passed.
  - Final `pnpm test:e2e` passed 9 Playwright tests: manual analysis, live options settings, options/logs, popup, static overlay fixture, dynamic overlay fixture, selection trigger, and simulation page.
  - Screenshot evidence saved to `docs/extension/screenshots/ext-014-options-live-settings.png`.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `apps/browser-extension/src/dom/content-scan.ts`
  - `apps/browser-extension/src/dom/content-scan.test.ts`
  - `apps/browser-extension/src/dom/overlay.ts`
  - `apps/browser-extension/src/dom/overlay.test.ts`
  - `apps/browser-extension/src/background/background-coordinator.ts`
  - `apps/browser-extension/src/background/background-coordinator.test.ts`
  - `apps/browser-extension/tests/e2e/options-live-settings.spec.ts`
  - `docs/extension/screenshots/ext-014-options-live-settings.png`
  - `docs/extension/frontend-roadmap.md`
  - `docs/extension/ui-screen-plan.md`
  - `docs/extension/storage-model.md`
  - `feature_list.json`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - Full Playwright e2e refreshes some existing screenshot evidence files; only EXT-014 screenshot is new evidence for this milestone.
  - API mode still uses mock/background flow until FastAPI integration is explicitly implemented.
- Next best step:
  - Commit EXT-014, then choose the next workstream: evaluation/demo hardening, FastAPI planning, dataset/ML pipeline, or thesis experiment documentation.

### Session 022

- Date: 2026-06-29
- Goal: clarify popup protection copy after EXT-014 made Options settings operational.
- Completed:
  - Renamed the popup's main protection toggle to `Aktifkan mode sensor` so it reflects the selected censor mode from Options: blur, warning, hide, or none.
  - Kept `Blur otomatis` as a secondary option for high-risk detections, not as the main censor-mode control.
  - Updated the popup Playwright locator to use the new accessible switch name.
- Verification run:
  - `pnpm compile`
  - `pnpm build`
  - Focused e2e: `pnpm exec playwright test tests/e2e/popup.spec.ts`
- Evidence captured:
  - `pnpm compile` completed with `tsc --noEmit`.
  - `pnpm build` completed with production `chrome-mv3` output.
  - Focused popup Playwright e2e passed 3 tests.
  - Popup screenshot evidence was refreshed by the focused popup e2e.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `apps/browser-extension/entrypoints/popup/App.tsx`
  - `apps/browser-extension/tests/e2e/popup.spec.ts`
  - `docs/extension/screenshots/ext-005-popup-control-center.png`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - None for this copy-only adjustment.
- Next best step:
  - Commit EXT-014 plus the popup copy clarification, then choose the next workstream.

### Session 023

- Date: 2026-07-09
- Goal: search Indonesian judol dataset-method literature and preserve screened references in Zotero plus durable repo docs.
- Completed:
  - Confirmed Zotero Desktop local API and connector were running.
  - Used OpenAlex MCP to search judol-only literature with queries for Indonesian online gambling promotion detection, YouTube comments, social media comments, and `judi online` datasets.
  - Screened candidates for dataset-method relevance: Indonesian/context Indonesia, judol/promotion detection topic, and visible data collection or labeling method.
  - Imported 10 screened references into Zotero `My Library`.
  - Tagged imported Zotero items with `Skripsi - Judol Dataset Methods`, `judol`, and `dataset-method`.
  - Added research docs for search log, dataset method matrix, and keyword baseline.
- Verification run:
  - `powershell -ExecutionPolicy Bypass -File .\init.ps1`
  - Zotero status via `zotero.py status --json`
  - Zotero import via `zotero.py import-bibtex --file ... --yes`
  - Zotero inventory via `zotero.py inventory --json`
- Evidence captured:
  - `init.ps1` completed baseline `uv run --no-cache python main.py`.
  - Zotero status showed `api_running: true` and `connector_running: true`.
  - Zotero import returned HTTP `201` and 10 item keys: `5DYFDX3A`, `AQL2DL9V`, `ACI2T66J`, `JRUTHJUT`, `PMVNB2PV`, `BN63T94I`, `JDRGFXYF`, `6L8K4MSX`, `26Z3Q7TB`, `IXXGJ6YQ`.
  - Zotero inventory listed the 10 imported items.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `docs/research/judol-literature-search.md`
  - `docs/research/judol-dataset-method-matrix.md`
  - `docs/research/judol-keyword-baseline.md`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - The Zotero skill imports into the currently selected target but does not expose collection creation; imported papers are in `My Library` with tags instead of a dedicated Zotero collection.
  - Several accepted 2025-2026 papers are very new and should be cited as method references with care.
  - Some YouTube papers need full-text follow-up to extract exact video/query selection details.
- Next best step:
  - Read full text for the accepted YouTube papers and enrich `docs/research/judol-dataset-method-matrix.md` with exact collection seeds, labeling instructions, and class balance.

### Session 024

- Date: 2026-07-09
- Goal: check Zotero attachments for saved judol references and preserve available PDFs locally.
- Completed:
  - Checked the 10 imported Zotero items with `zotero.py inventory --json`.
  - Checked child attachments for each imported Zotero item; all returned empty child lists.
  - Downloaded available open-access PDFs for 4 screened papers into `docs/research/papers/`.
  - Added a PDF inventory README mapping Zotero item keys to local PDF files and unresolved PDF follow-ups.
- Verification run:
  - `zotero.py status --json`
  - `zotero.py inventory --json`
  - `zotero.py children <itemKey> --json` for all 10 imported items
  - `Invoke-WebRequest` for known open-access PDF URLs
- Evidence captured:
  - Zotero status showed `api_running: true` and `connector_running: true`.
  - All 10 Zotero items had no children/attachments at check time.
  - Saved local PDFs initially:
    - `docs/research/papers/perdana-2024-twitter-judol.pdf`
    - `docs/research/papers/pratama-2025-distilbert-deberta-youtube-judol.pdf`
    - `docs/research/papers/ammar-2025-bigru-youtube-judol.pdf`
    - `docs/research/papers/nurseno-2024-goid-scraping-judol.pdf`
  - After manual user downloads, updated the PDF inventory to include 4 additional local PDFs:
    - `docs/research/papers/1-s2.0-S1877050925027358-main.pdf`
    - `docs/research/papers/engproc-107-00066.pdf`
    - `docs/research/papers/Martin_592-602-.pdf`
    - `docs/research/papers/16286-Article Text-60319-59361-10-20251212.pdf`
  - Renamed and moved the 8 local PDFs into `docs/research/papers/judol-dataset-methods/` with filenames that include the Zotero key, author, year, platform, and dataset-method focus.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `docs/research/papers/README.md`
  - `docs/research/papers/judol-dataset-methods/*.pdf`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - The current Zotero skill exposes attachment inspection and BibTeX/RIS import, but not a safe attach-file-to-existing-item command.
  - Two accepted IEEE papers, `6L8K4MSX` and `26Z3Q7TB`, still have no local PDF.
- Next best step:
  - Manually attach saved PDFs to the matching Zotero items, or add a dedicated Zotero attachment workflow/plugin before automating attachment writes.

### Session 025

- Date: 2026-07-09
- Goal: convert local judol dataset-method PDFs to Markdown and produce a line-cited dataset acquisition analysis.
- Completed:
  - Converted 8 local PDFs in `docs/research/papers/judol-dataset-methods/` into Markdown.
  - Saved conversions in `docs/research/papers/judol-dataset-methods/converted-md/`.
  - Added `docs/research/judol-dataset-acquisition-analysis.md` as the ground-truth analysis for dataset search strategy.
  - Classified paper methods into keyword-based search, API collection, seed video/channel/domain selection, web scraping, manual annotation, and pseudo-labeling.
  - Explicitly marked `6L8K4MSX` and `26Z3Q7TB` as metadata-only because no local PDF is available.
- Verification run:
  - Markitdown MCP smoke conversion on one PDF.
  - `uvx --no-cache --from 'markitdown[pdf]' markitdown <pdf> -o <md>` for all 8 PDFs.
  - Counted PDF and Markdown files: `PDF=8 MD=8`.
  - `rg -n -i "keyword|query|YouTube Data API|scraping|dataset|label|annotation|pseudo|semi-supervised|Twitter|FOFA" ...`
  - Python line-reference validator over `docs/research/judol-dataset-acquisition-analysis.md`.
- Evidence captured:
  - Converted Markdown line counts:
    - `5DYFDX3A-perdana-2024-twitter-keyword-dataset.md`: 696 lines.
    - `ACI2T66J-kamdan-2025-youtube-indobert-dataset.md`: 782 lines.
    - `AQL2DL9V-santika-2025-youtube-semisupervised-dataset.md`: 699 lines.
    - `BN63T94I-ammar-2025-youtube-spam-dataset.md`: 711 lines.
    - `IXXGJ6YQ-nurseno-2024-goid-webscraping-dataset.md`: 458 lines.
    - `JDRGFXYF-angelo-2025-youtube-ml-dataset.md`: 827 lines.
    - `JRUTHJUT-manullang-2025-youtube-spam-dataset.md`: 814 lines.
    - `PMVNB2PV-pratama-2025-youtube-transformer-dataset.md`: 836 lines.
  - The analysis document contains 73 `converted-md/...:Lx-Ly` references and all were validated against existing files/ranges.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `docs/research/papers/judol-dataset-methods/converted-md/*.md`
  - `docs/research/judol-dataset-acquisition-analysis.md`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - Markitdown conversion introduced some encoding artifacts and table-column mixing; use PDF originals for final thesis quotations.
  - The two IEEE papers still lack local PDF full text and are excluded from ground-truth conclusions.
- Next best step:
  - Turn `docs/research/judol-dataset-acquisition-analysis.md` into a concrete pilot scraping and annotation protocol for X/Twitter, YouTube, Telegram, and web/domain sources.

## Session Template

### Session NNN

- Date:
- Goal:
- Completed:
- Verification run:
- Evidence captured:
- Commits:
- Files or artifacts updated:
- Known risk or unresolved issue:
- Next best step:

### Session 026

- Date: 2026-07-09
- Goal: rebuild the YouTube scraping notebook into a pilot YouTube Data API v3 comment-collection pipeline for thesis dataset work.
- Completed:
  - Replaced the old keyword/video-search notebook direction in `notebooks/yt_scraper.ipynb` with a reproducible notebook structured around `tl;dr`, context, setup, helpers, offline smoke check, seed resolution, API collection, enrichment, export, results, and takeaways.
  - Switched the planned collection path to official YouTube Data API v3 using explicit `SEED_VIDEOS` and optional `SEED_CHANNELS`.
  - Added stable data-contract columns for pilot `videos` and `comments` outputs, including provenance fields such as `source_seed`, `collection_query`, `paper_basis`, `label`, and `label_source`.
  - Added lightweight enrichment for keyword evidence, URL/contact evidence, Unicode suspicion, language hinting, author hashing, and annotation queue ranking.
  - Made the notebook runnable without an API key by cleanly skipping live collection while still executing the helper and smoke-test path.
  - Added root `.env` loading in the notebook, documented `YOUTUBE_API_KEY` in `.env.example`, and created a local ignored `.env` placeholder.
  - Added an initial Colab dependency setup cell with `%pip install -q pandas pyarrow`.
  - Added Colab Secret fallback for `YOUTUBE_API_KEY` plus an in-notebook note explaining that local `.env` is not visible to a Colab kernel.
  - Changed `YOUTUBE_API_KEY` resolution so a valid root `.env` value takes precedence over any stale process environment variable.
  - Hardened the YouTube API helper to drop empty/`None` query parameters and surface HTTP error bodies without printing API keys.
  - Cleared stale notebook outputs to reduce confusion from out-of-order cell execution.
  - Updated the collection step so unavailable seed videos are recorded in `collection_errors` instead of stopping the entire notebook.
  - Replaced starter YouTube seeds with five user-provided manual video/live URLs and disabled channel expansion for this pilot run.
- Verification run:
  - Parsed the notebook JSON after regeneration.
  - Executed all code cells from `notebooks/yt_scraper.ipynb` in a local Python harness without a YouTube API key.
  - Re-executed all code cells after adding `.env` support.
  - Parsed the notebook JSON after adding the Colab install cell; did not execute `%pip` from the shell verification.
  - Inspected local `.env` without printing the API key; `YOUTUBE_API_KEY` is present locally with length 39.
  - Executed only the notebook import and configuration cells to verify API-key resolution without calling the YouTube API.
  - Executed notebook import/config/helper/API-helper/offline-smoke cells after the YouTube API helper fix.
  - Ran the notebook programmatically against the live YouTube Data API with network approval, skipping only the `%pip` install cell.
  - Re-ran the full notebook against the live YouTube Data API using the five user-provided manual seeds.
- Evidence captured:
  - Notebook now contains 22 cells and validates as `nbformat` 4.5 JSON.
  - Top-to-bottom execution succeeded in no-key mode, including the offline enrichment smoke test and the no-data export/audit path.
  - The notebook now resolves `PROJECT_ROOT` robustly whether it is run from the repo root or from the `notebooks/` directory.
  - The notebook reports `.env` path and presence while keeping API key values hidden.
  - Before the precedence fix, local verification reported `api_key_source: environment`; live API calls remain unverified in this sandbox because outbound YouTube API access is blocked here.
  - After the precedence fix, local configuration verification reports `api_key_source: env_file`, `api_key_length: 39`, and `.env` present.
  - Offline smoke verification passed with `api_key_source: env_file` and `api_key_length: 39`.
  - Live run completed with 7 requested videos, 6 available videos, 258 raw comments, 25 replies, 59 keyword candidates, 5 contact candidates, and 106 Unicode candidates.
  - Exported `data/interim/youtube_comments_raw.csv` with 258 rows and 26 columns.
  - Exported `data/interim/youtube_comments_annotation_queue.csv` with 258 rows and 24 columns.
  - Latest manual-seed run requested 5 videos, found all 5, collected 1,214 raw comments, 219 replies, 6 keyword candidates, 21 contact candidates, and 439 Unicode candidates.
  - Latest exports overwrite the same output paths with 1,214 rows each.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `notebooks/yt_scraper.ipynb`
  - `.env.example`
  - `.env` (local ignored placeholder)
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - Live API collection has now been exercised successfully with the local `.env` key.
  - The starter seed list is intentionally small and should be expanded with a thesis-backed seed set before larger pilot collection.
  - Starter seed `UQiPuBhL3t8` is no longer returned by the YouTube API and is recorded as `video_not_returned_by_api`.
  - Current `candidate_flag_contact` treats `@username` mentions as contact-like, which creates noisy annotation-priority rows for ordinary YouTube replies.
  - `docs/research/` remains uncommitted in the current worktree.
- Next best step:
  - Add `YOUTUBE_API_KEY` to local `.env`, run the notebook, collect a 1-2 seed smoke dataset, then review the exported annotation queue to refine seed selection and keyword evidence rules before scaling.

### Session 027

- Date: 2026-07-09
- Goal: clean up the yt-dlp YouTube video seed discovery notebook and install the required dependency.
- Completed:
  - Added `yt-dlp` to the project environment with `uv add --no-cache yt-dlp`.
  - Rebuilt `notebooks/ytdlp_scraper.ipynb` as a clean seed-discovery notebook instead of a large scratchpad with raw outputs.
  - Structured the notebook around dependency setup, paper-backed query configuration, helper functions, offline smoke test, live discovery, candidate review, export, and summary.
  - Used `yt-dlp` only for metadata/search discovery with `download=False`; no video media is downloaded.
  - Exported video seed candidates and a top-50 seed template for later use in `notebooks/yt_scraper.ipynb`.
- Verification run:
  - Queried Context7 docs for `yt-dlp` Python API usage.
  - Ran offline notebook smoke cells through `uv run --no-cache python -`.
  - Ran the full notebook programmatically against live YouTube search with network approval, skipping only the `%pip` install cell.
- Evidence captured:
  - `yt-dlp==2026.7.4` is installed and recorded in `pyproject.toml`/`uv.lock`.
  - Live discovery processed 10 paper-backed queries.
  - Live discovery returned 375 raw search hits, 320 deduplicated video candidates, and 0 query errors.
  - Candidate summary: 294 keyword candidates, 44 contact candidates, and 276 Unicode candidates.
  - Exported `data/interim/youtube_ytdlp_video_seed_candidates.csv` with 320 rows and 27 columns.
  - Exported `data/interim/youtube_ytdlp_seed_template.csv` with 50 rows and 9 columns.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `notebooks/ytdlp_scraper.ipynb`
  - `data/interim/youtube_ytdlp_video_seed_candidates.csv`
  - `data/interim/youtube_ytdlp_seed_template.csv`
  - `pyproject.toml`
  - `uv.lock`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - `yt-dlp` search results are discovery candidates, not ground-truth labels; review is still required.
  - Some discovered videos may disappear, become private, or have disabled comments before API comment collection.
  - The top candidates include highly explicit video metadata; handle exported CSVs as research data.
- Next best step:
  - Review `data/interim/youtube_ytdlp_seed_template.csv`, select 10-20 strong candidate videos, then feed those `video_id`s into `notebooks/yt_scraper.ipynb` for official API comment collection.

### Session 028

- Date: 2026-07-09
- Goal: analyze the YouTube scraping pilot outputs from yt-dlp seed discovery and YouTube API comment collection.
- Completed:
  - Analyzed `data/interim/youtube_ytdlp_video_seed_candidates.csv`, `youtube_ytdlp_seed_template.csv`, `youtube_comments_raw.csv`, and `youtube_comments_annotation_queue.csv`.
  - Compared video metadata discovery quality against comment-level candidate quality.
  - Added `docs/research/youtube-scraping-pilot-analysis.md` as a durable research summary.
- Verification run:
  - Used pandas to inspect row counts, columns, score distribution, query performance, keyword frequencies, per-video comment distributions, and flag noise.
- Evidence captured:
  - yt-dlp discovery: 320 unique video candidates, 294 keyword candidates, 44 contact candidates, 276 Unicode candidates, median candidate score 5, max score 13.
  - Strongest discovery queries by average score: `link slot gacor`, `slot online gacor`, `maxwin slot pragmatic`, `pragmatic play slot gacor`, and `mahjong ways gacor`.
  - YouTube comments: 1,214 rows from 5 videos, 219 replies, only 6 keyword candidates, all matching only `link`.
  - Contact flag in comments is noisy because 17 of 21 contact rows appear to be mention-only rather than URL/Telegram/WhatsApp/domain evidence.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `docs/research/youtube-scraping-pilot-analysis.md`
  - `claude-progress.md`
- Known risk or unresolved issue:
  - Current comment enrichment over-flags YouTube mentions as contact-like.
  - Current Unicode flag over-counts natural emoji/non-ASCII as suspicious.
- Next best step:
  - Tighten comment enrichment rules, then select 10-20 reviewed videos from `youtube_ytdlp_seed_template.csv` for a second YouTube Data API comment collection run.

### Session 029

- Date: 2026-07-09
- Goal: refactor the Telegram snowball scraper notebook into a safer, auditable research pipeline.
- Completed:
  - Rebuilt `notebooks/telegram_snowball_scraper.ipynb` as a public-channel Telegram pilot collection notebook.
  - Removed hardcoded Telegram API credentials from the notebook.
  - Added `.env`-based configuration for `TELEGRAM_API_ID` and `TELEGRAM_API_HASH`.
  - Added seed provenance, SQLite resume/dedup storage, channel provenance export, candidate evidence flags, and annotation queue export.
  - Changed labeling policy so keyword/contact/Unicode matches are candidate flags only; `label` defaults to `perlu_review`.
  - Added `docs/research/telegram-scraping-pilot-plan.md` to document the Telegram collection method and safety boundaries.
  - Updated `.gitignore` to ignore Telethon session files.
- Verification run:
  - Queried Context7 Telethon docs for `TelegramClient`, `iter_messages`, `FloodWaitError`, `search`, and `takeout` guidance.
  - Validated notebook JSON structure and compiled code cells after stripping notebook magics.
  - Confirmed old hardcoded Telegram credential strings are not present in the rebuilt notebook.
  - Ran `Get-Content -Path feature_list.json | ConvertFrom-Json | Out-Null`.
- Evidence captured:
  - Notebook has 21 cells and 10 code cells.
  - Notebook compile validation returned `compile: ok`.
  - `hardcoded_telegram_credentials: False`.
- Commits: not committed in this session yet.
- Files or artifacts updated:
  - `notebooks/telegram_snowball_scraper.ipynb`
  - `.env.example`
  - `.gitignore`
  - `docs/research/telegram-scraping-pilot-plan.md`
  - `claude-progress.md`
  - `session-handoff.md`
- Known risk or unresolved issue:
  - `.\init.ps1` is blocked by the local PowerShell ExecutionPolicy in this shell.
  - Live Telegram collection was not run because it requires user login/OTP and `RUN_COLLECTION=True`.
  - Telegram scraping must stay limited to public channels and should be manually reviewed before scaling.
- Next best step:
  - Add Telegram credentials to local `.env`, run the notebook with `RUN_COLLECTION=False` first to verify configuration, then set `RUN_COLLECTION=True` for a small seed smoke run and inspect the exported annotation queue.

### Session 081

- Date: 2026-09-14
- Goal: blur the complete X/Twitter tweet containing a judol detection rather than only a matched text fragment.
- Completed:
  - Changed `apps/browser-extension/src/dom/overlay.ts` so a `blur` result within `[data-testid="tweet"]` creates one non-interactive, full-size backdrop-filter overlay on that tweet article.
  - Kept ordinary page candidates and all `warn`/`hide` actions text-scoped; scan, message, storage, and OpenAPI contracts are unchanged.
  - Deduplicated multiple judol candidates in the same tweet, preserving a single readable `Terdeteksi JudolLens` label and avoiding tweet DOM wrapping that could destabilize X layout.
  - Added a focused unit regression plus a loaded-extension Playwright fixture for a tweet containing two detected text nodes and media.
- Verification run:
  - `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\judol_detection\init.ps1"` — passed; `uv sync --no-cache` and `uv run --no-cache python main.py` completed.
  - `pnpm test:run -- src/dom/overlay.test.ts` — passed: 79 tests.
  - `pnpm compile` — passed.
  - `pnpm build` — passed.
  - `pnpm exec playwright test tests/e2e/x-tweet-overlay.spec.ts` — passed: one full-tweet overlay, label, `backdrop-filter: blur(3px)`, and bounding box within the tweet border.
  - `pnpm test:e2e` — passed: 10 Playwright tests.
- Evidence captured:
  - Screenshot visual verification: `docs/extension/screenshots/ext-015-x-tweet-overlay.png`; full X tweet including media is blurred, while the JudolLens label remains legible at bottom-right.
  - The initial full E2E run had one intermittent pre-existing dynamic-fixture timing failure (zero overlays before its 5-second assertion); the exact test reproduced green, then the complete rerun passed 10/10 without code changes.
- Files or artifacts updated:
  - `apps/browser-extension/src/dom/overlay.ts`
  - `apps/browser-extension/src/dom/overlay.test.ts`
  - `apps/browser-extension/tests/e2e/fixtures/x-tweet-page.html`
  - `apps/browser-extension/tests/e2e/x-tweet-overlay.spec.ts`
  - `docs/extension/screenshots/ext-015-x-tweet-overlay.png`
  - `docs/superpowers/plans/2026-09-14-tweet-level-blur.md`
  - `feature_list.json`
  - `claude-progress.md`
- Known risk or unresolved issue:
  - X owns and changes its third-party DOM. This implementation depends on the semantic `data-testid="tweet"` marker; if X removes it, blur safely falls back to the matched text instead of a broad container.
- Next best step:
  - Resume API-001 real-server extension validation: API mode against the sampled artifact, non-mock metadata and latency, 503 behavior, and the API-mode screenshot.

### Session 082

- Date: 2026-09-14
- Goal: prefetch X/Twitter tweet predictions before tweets enter the viewport.
- Completed:
  - Added an X-only `IntersectionObserver` scheduler for
    `article[data-testid="tweet"]`: visible roots precede below-viewport roots,
    batches contain at most 12 roots, batches are serialized, and mutation
    observation registers new tweet roots without scanning them early.
  - Added a per-tab cache of at most 100 numeric X status-ID positive blur
    decisions. Cache entries retain only `{ id, riskLevel }`; no tweet text,
    URL, SearchTimeline payload, browsing history, or persistent extension
    storage is retained.
  - Added a local completed-prediction callback that pairs valid response IDs
    to DOM refs and reports the setting-effective action. It does not change
    OpenAPI, prediction request/response, or background message contracts.
  - Routed only X/Twitter content scripts through the scheduler. YouTube,
    Telegram, simulation, and other supported pages retain the full initial
    scan plus `DynamicContentObserver` lifecycle.
  - Added a loaded-extension X fixture and Playwright proof for an initially
    offscreen tweet; screenshot recorded below.
- Verification run:
  - `pnpm test:run` — passed: 93 tests in 17 files.
  - `pnpm compile` — passed: `tsc --noEmit`.
  - `pnpm build` — passed: WXT production chrome-mv3 output.
  - `pnpm exec playwright test tests/e2e/x-viewport-prefetch.spec.ts` —
    passed: target was offscreen, already had its final overlay, and retained
    it after entering the viewport.
  - `pnpm test:e2e` — passed: 11 Playwright tests.
- Evidence captured:
  - Visual verification: `docs/extension/screenshots/ext-016-x-viewport-prefetch.png`; the target X tweet is fully blurred with the label visible after entering view.
  - Unit coverage includes viewport priority, 12-root bounds, unavailable-observer fallback, dynamic registration, lifecycle cleanup, cache status parsing/eviction, remount cache use, result-ID pairing, and independent non-X text overlays.
- Files or artifacts updated:
  - `apps/browser-extension/src/dom/x-viewport-scheduler.ts`
  - `apps/browser-extension/src/dom/x-viewport-scheduler.test.ts`
  - `apps/browser-extension/src/dom/content-scan.ts`
  - `apps/browser-extension/src/dom/content-scan.test.ts`
  - `apps/browser-extension/src/dom/overlay.ts`
  - `apps/browser-extension/src/dom/overlay.test.ts`
  - `apps/browser-extension/src/dom/index.ts`
  - `apps/browser-extension/entrypoints/content.ts`
  - `apps/browser-extension/tests/e2e/test-utils.ts`
  - `apps/browser-extension/tests/e2e/fixtures/x-viewport-prefetch-page.html`
  - `apps/browser-extension/tests/e2e/x-viewport-prefetch.spec.ts`
  - `docs/extension/screenshots/ext-016-x-viewport-prefetch.png`
  - `docs/extension/frontend-roadmap.md`
  - `feature_list.json`
  - `claude-progress.md`
- Known risk or unresolved issue:
  - X owns its third-party DOM. This scheduler intentionally depends on
    `article[data-testid="tweet"]`; if the marker changes, X tweet roots will
    not be scheduled until that selector is revised.
- Next best step:
  - Resume API-001 real-server extension validation: API mode against the
    sampled artifact, non-mock metadata and latency, 503 behavior, and the
    API-mode screenshot.

### Session 083

- Date: 2026-09-14
- Goal: validate the sampled local IndoBERT API through the built browser
  extension in API mode.
- Completed:
  - Ran the manifest-valid sampled artifact on a dedicated loopback port and
    verified `/health`, `/predict`, and `/predict/batch`. The two-item direct
    batch preserved IDs, returned `is_mock: false`, and reported 3,689 ms.
  - Used a focused loaded-extension Playwright scenario to switch storage to API
    mode, confirm a real-model DOM blur, check non-mock model metadata and
    nonzero latency in extension state, then verify a controlled 503 is retried
    four times and retained as `api_prediction_failed` without an overlay. The
    scenario was removed after verification because its 474.7 MiB local
    artifact is deliberately untracked and unsuitable as a permanent E2E
    precondition.
  - Corrected API documentation and MVP architecture status to distinguish the
    sampled integration baseline from the still-required final
    human-annotated-model artifact.
- Verification run:
  - `powershell.exe -NoProfile -ExecutionPolicy Bypass -File
    "D:\judol_detection\init.ps1"` — passed; `uv sync --no-cache` and
    `uv run --no-cache python main.py` completed.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-tmp apps/api/tests`
    — passed: 13 tests.
  - `pnpm check:api` and `pnpm compile` — passed.
  - `pnpm test:run` — passed: 94 extension unit tests in 17 files.
  - Focused loaded-extension API-mode scenario — passed: real API overlay plus
    terminal 503 state.
- Evidence captured:
  - Screenshot visual verification:
    `docs/extension/screenshots/ext-017-api-mode-sampled-artifact.png`; real
    sampled-model API mode blurs detected simulation posts while clean posts
    remain readable.
  - Direct API evidence: `/health` reported
    `judollens-indobert-sampled-baseline` with `is_mock: false`; `/predict`
    returned `sampled-item`; `/predict/batch` returned both input IDs and
    `processing_time_ms: 3689`.
- Files or artifacts updated:
  - `docs/extension/screenshots/ext-017-api-mode-sampled-artifact.png`
  - `apps/api/README.md`
  - `docs/extension/mvp-architecture.md`
  - `feature_list.json`
  - `claude-progress.md`
- Known risk or unresolved issue:
  - The sampled baseline is trained from
    `data/annotation/dataset_sampled_2384_labeled.xlsx`; it is suitable only
    for integration evidence, not final ground-truth performance claims.
  - Extension background requests use explicit loopback host permissions and do
    not require CORS. An exact configured origin is relevant only to a future
    ordinary web-page client; wildcard CORS remains prohibited.
- Next best step:
  - Human-annotate `dataset_final.xlsx`, train the final clean artifact, then
    repeat this API-mode smoke against that artifact before marking API-001
    passing.

### Session 084

- Date: 2026-09-14
- Goal: replace the superseded X viewport scheduler with detection from captured
  SearchTimeline responses and reconcile predictions by X status ID.
- Completed:
  - Removed the X-only `IntersectionObserver` scheduler and its viewport fixture
    and test. X no longer independently scans rendered tweet text nodes.
  - Kept the existing X monitor, parser, generic batch-coordinator route, and
    status-ID reconciler as the single X detection path: the background observes
    successful `SearchTimeline` bodies after `Network.loadingFinished`, predicts
    `{ id, text }` entries through the existing batch contract, and sends keyed
    predictions back to the subscribing tab.
  - Made the reconciler self-contained by parsing numeric `/status/<id>` links
    locally. It retains at most 100 positive `{ id, riskLevel }` decisions in
    tab memory and applies a full-card overlay only to the matching
    `article[data-testid="tweet"]`.
  - Updated the MVP architecture, frontend roadmap, API contract explanation,
    and `EXT-015` record for the SearchTimeline design.
- Verification run:
  - `pnpm vitest run src/dom/x-timeline-reconciler.test.ts` — passed: 3 tests.
  - `pnpm test:run` — passed: 95 extension unit tests in 19 files.
  - `pnpm compile` — passed: `tsc --noEmit`.
  - `pnpm build` — passed: WXT production chrome-mv3 output.
  - `pnpm exec playwright test tests/e2e/x-search-timeline.spec.ts` — passed:
    a background-delivered prediction blurred only the matching X tweet card.
  - `pnpm test:e2e` — passed: 11 Playwright tests.
  - `graphify update .` — completed; graph rebuilt with 2,050 nodes and 3,788
    edges. It warned that 16 stale nodes remain from excluded files; this is a
    graph-maintenance issue, not a product verification failure.
- Evidence captured:
  - Screenshot visual verification:
    `docs/extension/screenshots/ext-017-x-search-timeline.png`; the matching
    X fixture post is fully blurred, its label remains visible, and a
    nonmatching card remains readable.
- Files or artifacts updated:
  - `apps/browser-extension/entrypoints/content.ts`
  - `apps/browser-extension/src/dom/index.ts`
  - `apps/browser-extension/src/dom/x-timeline-reconciler.ts`
  - `apps/browser-extension/src/dom/x-viewport-scheduler.ts` (removed)
  - `apps/browser-extension/src/dom/x-viewport-scheduler.test.ts` (removed)
  - `apps/browser-extension/tests/e2e/x-viewport-prefetch.spec.ts` (removed)
  - `apps/browser-extension/tests/e2e/fixtures/x-viewport-prefetch-page.html`
    (removed)
  - `docs/extension/mvp-architecture.md`
  - `docs/extension/frontend-roadmap.md`
  - `docs/extension/api-contract.md`
  - `feature_list.json`
  - `claude-progress.md`
- Known risk or unresolved issue:
  - Live X account/session behavior, debugger attachment policy, response-body
    availability, and virtualized DOM changes need researcher-managed manual
    validation. The implementation intentionally depends on
    `article[data-testid="tweet"]` and numeric status links.
- Next best step:
  - Human-annotate `dataset_final.xlsx`, train the final clean artifact, then
    repeat the sampled API-mode smoke before marking API-001 passing.

### Session 085

- Date: 2026-09-14
- Goal: measure CPU latency of the sampled local IndoBERT artifact against a
  captured 19-item X SearchTimeline payload before selecting a serving change.
- Completed:
  - Loaded `models/checkpoints/indobert-sampled-baseline-v0.1.0` once, then
    ran warm in-process measurements. The artifact uses `max_length: 256`;
    the payload contained 3,874 characters, with per-item token lengths
    51--84 and batch padding length 84. The raw payload was not saved because
    it contains collected X content.
  - For 10 warm runs, component p50/p95 latency in milliseconds was:

    | Items | Total p50 | Total p95 | Forward p50 | Tokenize p50 | Unicode/projection p50 |
    | ---: | ---: | ---: | ---: | ---: | ---: |
    | 1 | 666.0 | 1,130.8 | 664.7 | 1.2 | 0.1 |
    | 4 | 1,658.0 | 2,240.4 | 1,656.3 | 1.8 | 0.2 |
    | 8 | 3,247.3 | 4,004.7 | 3,243.7 | 3.2 | 0.4 |
    | 12 | 5,514.4 | 14,035.0 | 5,501.2 | 4.5 | 0.6 |
    | 19 | 10,552.7 | 11,886.6 | 10,543.9 | 8.3 | 1.1 |

  - Exercised the complete FastAPI `/predict/batch` path for 19 items after
    warm-up. Five requests returned all 19 results and no errors. Endpoint
    wall-clock p50 was 10,456.5 ms; response
    `summary.processing_time_ms` p50 was 10,451 ms. This aligns with the
    browser-observed 9.44 s wait and localizes latency to inference rather
    than serialization or transport.
  - Compared full 19-item `predict_items` runs in fresh processes with PyTorch
    CPU thread counts. Five-run p50/p95 was 12,213/14,266 ms (1 thread),
    8,876/11,501 ms (2 threads), and 8,170/13,198 ms (4 threads). The default
    two-thread configuration has materially better p95 than four threads.
- Decision:
  - Do not increase the server queue or Uvicorn workers. The forward pass is
    effectively all measured request time; tokenization and Unicode evidence
    are each below 0.1% at batch 19.
  - Use a small client batch as a temporary UX control if needed: four items
    provide a 1.66 s p50 time-to-first result, while eight and nineteen items
    exceed the interactive target. This preserves the OpenAPI contract.
  - The next serving optimization experiment is ONNX Runtime CPU with dynamic
    INT8 quantization and label/threshold parity evaluation against this
    PyTorch artifact. Do not alter raw-text preprocessing or Unicode handling
    during the runtime experiment.
- Verification run:
  - `powershell.exe -NoProfile -ExecutionPolicy Bypass -File init.ps1` —
    passed; `uv sync --no-cache` and `uv run --no-cache python main.py` both
    completed.
- Known risk or unresolved issue:
  - This is a sampled baseline artifact, not the final human-annotated clean
    model. The thread and in-process numbers are machine-specific and provide
    an optimization baseline, not a production SLO.
- Next best step:
  - Export the artifact to ONNX, benchmark FP32 and dynamic INT8 using the
    same unsaved captured payload, and evaluate PyTorch--ONNX label,
    confidence, and action parity before any extension batching change.

### Session 086

- Date: 2026-09-14
- Goal: create a reproducible local conversion from the sampled IndoBERT
  artifact to FP32 and dynamic-INT8 ONNX serving artifacts, with parity gates.
- Completed:
  - Added `scripts/export_indobert_onnx.py`. It validates the local manifest
    and label map; exports an ONNX text classifier with dynamic batch/sequence
    axes; quantizes from FP32 to dynamic per-channel INT8; copies the source
    manifest and tokenizer into a separate serving artifact; and writes a
    structured `conversion-report.json`.
  - The script rejects nonempty output directories, runs only with local model
    files, and preserves the artifact `max_length`, raw-text preprocessing,
    threshold label boundary, and `none`/`warn`/`blur` rules. It does not alter
    the FastAPI contract or browser extension.
  - Added five deterministic unit tests for API action boundaries, label/action
    parity, immutable output paths, absent manifests, and safe parity corpus
    coverage. Added `onnxruntime` runtime dependency and `onnx` dev dependency.
  - Converted the sampled baseline locally with:
    `uv run --no-cache python scripts/export_indobert_onnx.py --source
    models/checkpoints/indobert-sampled-baseline-v0.1.0 --output
    models/serving/indobert-sampled-baseline-v0.1.0-onnx --threshold 0.33`.
    The ignored artifact contains FP32 `model.onnx` (498,003,463 bytes) and
    INT8 `model.int8.onnx` (125,654,723 bytes), reducing model storage by about
    74.8%.
- Parity evidence:
  - `conversion-report.json` marks both FP32 and INT8 serving-eligible on four
    safe Indonesian samples, including ordinary, URL-bearing, and
    Unicode-obfuscated text. Every sample preserved its PyTorch label and
    action. Maximum `judol` probability drift was `7.826089859008789e-05` for
    FP32 (under the `1e-4` gate) and `6.955862045288086e-05` for INT8.
  - Both artifacts accept `input_ids`, `attention_mask`, and `token_type_ids`.
- Verification run:
  - `uv sync --no-cache` — passed; installed `onnx==1.22.0` and
    `onnxruntime==1.30.0`.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-tmp
    tests/unit/test_export_indobert_onnx.py apps/api/tests/test_api_contract.py
    -q` — passed: 17 tests. One existing FastAPI TestClient deprecation warning
    from Starlette was emitted.
- Known risk or unresolved issue:
  - The legacy TorchScript ONNX exporter emitted transformers tracing warnings
    during export; dynamic input axes and all report samples executed correctly,
    but final artifact adoption still requires validation-split parity and real
    X-payload latency measurements.
  - `quantize_dynamic` emitted ONNX Runtime's generic preprocessing advisory.
    Dynamic INT8 decision parity passed; no further graph transformation was
    applied, so FP32-to-INT8 investigation remains traceable.
  - The sampled artifact is not the final human-annotated model and must not be
    presented as final deployment quality.
- Next best step:
  - Benchmark PyTorch, ONNX FP32, and ONNX INT8 on the same unsaved captured
    X payload for batch sizes 1, 4, 8, and 19. Adopt an ONNX runtime adapter
    only if latency improves and final validation-split label/action parity is
    also acceptable.

### Session 087

- Date: 2026-09-14
- Goal: compare CPU forward-pass latency of the sampled IndoBERT model in
  PyTorch, ONNX FP32, and ONNX dynamic INT8 using the same unsaved 19-item X
  payload used for the PyTorch baseline.
- Method:
  - Loaded the source tokenizer/model and both generated ONNX artifacts once;
    all ONNX sessions used `CPUExecutionProvider`. Tokenization, HTTP, FastAPI
    projection, and Unicode analysis were excluded, so the figures isolate
    runtime forward-pass cost. Each cell received three warm-ups and ten warm
    runs; p95 is nearest-rank. Default PyTorch thread count was two.
  - Payload: 19 items, 3,874 total characters, maximum 297 characters. Batch
    sequence length was 79 for sizes 1/4/8 and 84 for size 19.
- Results (milliseconds):

  | Batch | PyTorch p50 / p95 | ONNX FP32 p50 / p95 | ONNX INT8 p50 / p95 |
  | ---: | ---: | ---: | ---: |
  | 1 | 628.27 / 1,811.83 | 376.34 / 486.60 | 300.73 / 327.98 |
  | 4 | 2,103.00 / 2,557.03 | 1,696.54 / 2,583.77 | 1,172.18 / 3,650.11 |
  | 8 | 3,396.01 / 5,254.93 | 4,079.94 / 17,306.81 | 2,309.44 / 4,975.87 |
  | 19 | 10,436.68 / 12,831.85 | 8,041.88 / 8,889.68 | 8,148.67 / 16,636.99 |

- Decision:
  - ONNX INT8 is the clear candidate for interactive small batches: p50 is
    2.09x faster than PyTorch at batch 1, 1.79x at batch 4, and 1.47x at batch
    8. Its batch-1 p95 is 327.98 ms versus PyTorch 1,811.83 ms.
  - Do not adopt ONNX FP32 as the runtime default: it is slower and markedly
    less stable at batch 8, despite improving batch 1 and batch 19 p50.
  - Do not use batch 19 with any runtime for interactive X protection. ONNX
    INT8 p50 is still 8.15 seconds and p95 is worse than PyTorch on this run.
  - Candidate next serving configuration: ONNX INT8 with a client batch cap of
    four. Its 1.17-second p50 gives a practical time-to-first-protection;
    observed batch-4 p95 remains 3.65 seconds, so this must be verified through
    the complete FastAPI/extension path before making an SLO claim.
- Known risk or unresolved issue:
  - Batch p95 varies materially on this two-core/four-thread Ryzen host;
    measurements are machine-specific. Int8 quality has parity only on the
    safe corpus; final validation-split parity remains required.
  - Benchmark did not include FastAPI serialization, extension queueing, or
    real browser overlay timing. It is runtime evidence, not end-to-end UX
    verification.
- Next best step:
  - Implement a separate ONNX INT8 inference-service adapter behind the same
    API contract, select it explicitly via artifact/runtime configuration, then
    run validation-split parity and the loaded-extension API-mode smoke with a
    four-item cap before retiring the PyTorch serving path.

### Session 088

- Date: 2026-09-14
- Goal: adopt the sampled IndoBERT ONNX INT8 serving runtime behind the existing FastAPI/OpenAPI contract and validate the extension's four-item API path.
- Completed:
  - Added the explicit `onnx-int8` runtime selection, which loads only a manifest-validated tokenizer, INT8 ONNX model, and serving-eligible conversion report; it has no PyTorch fallback.
  - Limited extension API gateway batches to four items and serialized chunks to retain ordered responses while avoiding simultaneous CPU inference work.
  - Added a self-contained Playwright integration test that reserves a loopback port, starts the actual ONNX INT8 FastAPI service using the local serving artifact, configures the built extension for that endpoint, then verifies two real overlays, non-mock persisted model evidence, positive stored response latency, and screenshot output.
  - Added `docs/extension/screenshots/ext-018-api-mode-onnx-int8.png`; it visibly shows the two real model detections (including Unicode-obfuscated text) blurred with JudolLens labels.
- Verification run:
  - Compared all 300 validation-split items at threshold `0.33` in four-item chunks: no label/action mismatches; maximum confidence drift was `0.03747682273387909`.
  - Real ONNX FastAPI `/predict/batch` returned HTTP 200 and preserved the ordered 19 input IDs.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-tmp tests/unit/test_inference_service.py apps/api/tests -q` — passed: 22 tests. Six existing third-party deprecation/tracing warnings were emitted during the isolated ONNX export fixture.
  - `pnpm check:api` — passed; `pnpm compile` — passed; `pnpm test:run` — passed: 95 tests.
  - `pnpm exec playwright test tests/e2e/onnx-runtime-extension.spec.ts` — passed: 1 self-contained real-server extension test.
  - `pnpm test:e2e` — passed: 12 Playwright tests after correcting the temporary ONNX service cleanup to terminate its full Windows process tree.
- Decision:
  - ONNX INT8 is the selected runtime for interactive local serving when `JUDOLLENS_MODEL_ARTIFACT` points to its serving artifact and `JUDOLLENS_INFERENCE_RUNTIME=onnx-int8`; PyTorch remains explicitly selectable for the source artifact and parity baseline.
  - Four extension API items per serialized request is retained. The API/OpenAPI schema and raw-text Unicode analysis are unchanged.
- Files or artifacts updated:
  - `apps/api/app/config.py`
  - `apps/api/app/main.py`
  - `apps/api/app/services/inference.py`
  - `apps/browser-extension/src/api/api-prediction-gateway.ts`
  - `apps/browser-extension/src/api/api-prediction-gateway.test.ts`
  - `apps/browser-extension/tests/e2e/onnx-runtime-extension.spec.ts`
  - `apps/api/README.md`
  - `docs/extension/screenshots/ext-018-api-mode-onnx-int8.png`
  - `feature_list.json`
  - `claude-progress.md`
- Known risk or unresolved issue:
  - The ONNX artifact remains a sampled baseline, not a final human-annotated model. The observed confidence drift is below the decision boundary for this split but model quality must be re-established after final annotation and retraining.
  - Four-item client chunks protect time-to-first-result but do not establish a portable latency SLO; batch p95 remains host-dependent.
- Next best step:
  - Human-annotate `dataset_final.xlsx`, train a final clean artifact, convert and validate it with the same ONNX parity gates, then update API-001 only after final-model evidence is available.

### Session 089

- Date: 2026-09-14
- Goal: prevent stale X content scripts from surfacing `Extension context invalidated` after an extension reload, update, disable, or uninstall.
- Root cause:
  - WXT invalidates existing content-script contexts after an extension lifecycle replacement, but the X-specific subscribe/unsubscribe and selection-trigger runtime messages bypassed the context lifecycle guard. An invalidated X page could therefore reject a `browser.runtime.sendMessage` promise and rethrow it from the X scan path, which appears as an uncaught page-console error.
- Completed:
  - Added `src/dom/content-runtime.ts`, a single guarded runtime-message boundary: it skips calls for an already invalid context, absorbs only the documented invalidation error, and discards replies that arrive after invalidation. Unrelated runtime failures still reject.
  - Routed content scans, X timeline subscription lifecycle, and floating manual-analysis trigger messages through the guard.
  - Registered `ctx.onInvalidated` cleanup so an existing content script disconnects its X listener/reconciler or dynamic observer and stops the selection trigger immediately.
  - Added regressions for rejected invalidation, pre-send invalidation, post-await invalidation, unrelated error preservation, and scan-level invalidation.
- Verification run:
  - `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./init.ps1` — passed baseline startup verification.
  - `pnpm exec vitest run src/dom/content-runtime.test.ts src/dom/content-scan.test.ts src/dom/x-timeline-reconciler.test.ts` — passed: 16 tests.
  - `pnpm compile` — passed.
  - `pnpm build && pnpm exec playwright test tests/e2e/x-search-timeline.spec.ts tests/e2e/x-tweet-overlay.spec.ts` — passed: 2 tests.
- Files updated:
  - `apps/browser-extension/entrypoints/content.ts`
  - `apps/browser-extension/src/dom/content-runtime.ts`
  - `apps/browser-extension/src/dom/content-runtime.test.ts`
  - `apps/browser-extension/src/dom/content-scan.ts`
  - `apps/browser-extension/src/dom/content-scan.test.ts`
  - `apps/browser-extension/src/dom/index.ts`
- Known behavior:
  - Chrome reports `Extension context invalidated` for an old injected script when the extension changes. The repaired script now treats it as terminal lifecycle cleanup instead of an application crash. Reload the affected X tab once after updating the unpacked extension so Chrome injects the new build; a pre-existing old script cannot be patched in place.

### Session 090

- Date: 2026-09-14
- Goal: correct the remaining `Extension context invalidated` exception emitted by the WXT context accessor on a stale injected X script.
- Root cause:
  - Session 089 guarded rejected `runtime.sendMessage` promises but still directly read `ctx.isInvalid`. WXT's getter itself reads `chrome.runtime.id`; when Chrome has invalidated an old content-script context, that getter throws `Extension context invalidated` before the message guard can run. The supplied stack trace contains the prior built guard `if (!e.isInvalid)`, confirming this path.
- Completed:
  - Added `isContentContextInvalid()`, which treats only the documented invalidation exception from WXT's context getter as terminal context state and preserves unrelated accessor failures.
  - Replaced all direct content-entrypoint `ctx.isInvalid` reads with that safe accessor. The existing guarded message boundary now also uses it before and after a runtime message.
  - Rebuilt the unpacked Chrome extension at `apps/browser-extension/.output/chrome-mv3` after the correction.
- Verification run:
  - `pnpm exec vitest run src/dom/content-runtime.test.ts src/dom/content-scan.test.ts src/dom/x-timeline-reconciler.test.ts` — passed: 18 tests.
  - `pnpm compile` — passed.
  - `pnpm build` — passed; regenerated `.output/chrome-mv3/content-scripts/content.js`.
  - `pnpm exec playwright test tests/e2e/x-search-timeline.spec.ts tests/e2e/x-tweet-overlay.spec.ts` — passed: 2 tests.
- Required local deployment:
  - In `chrome://extensions`, reload the unpacked JudolLens extension whose root is `apps/browser-extension/.output/chrome-mv3`, then reload the X tab. Chrome cannot replace an already injected stale content script until the target page reloads.

### Session 091

- Date: 2026-09-14
- Goal: recover the local ONNX INT8 serving setup after an incorrect checkpoint path was provided for manual backend logging.
- Root cause:
  - `models/checkpoints/indobert-sampled-baseline-v0.1.0` is the PyTorch source artifact and does not contain an ONNX conversion report or INT8 model. A manual export to `models/checkpoints/indobert-sampled-baseline-onnx-int8-v0.1.0` produced `fp32_serving_eligible=false` because its maximum FP32 probability drift (`0.0002841353416442871`) exceeded the `0.0001` gate.
- Completed:
  - Located the pre-existing, validated local serving artifact at `models/serving/indobert-sampled-baseline-v0.1.0-onnx`. Its conversion report records `fp32_serving_eligible=true`, `int8_serving_eligible=true`, and maximum FP32 drift `0.00007826089859008789`.
  - Started the FastAPI service with that artifact and the explicit `onnx-int8` runtime; `/health` returned ready with the non-mock sampled baseline.
  - Sent a real `/predict/batch` request: `judol` returned `judol` at `0.999756`; `ordinary` returned `non_judol` at `0.000303`.
- Verification run:
  - `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& './init.ps1'"` — passed baseline startup verification.
  - `uv run --no-cache uvicorn apps.api.app.main:app --host 127.0.0.1 --port 8000 --log-level info` with `JUDOLLENS_MODEL_ARTIFACT=models/serving/indobert-sampled-baseline-v0.1.0-onnx` and `JUDOLLENS_INFERENCE_RUNTIME=onnx-int8` — `/health` returned HTTP 200.
  - Real `/predict/batch` smoke request — passed with expected ordered labels.
- Local command for backend logs:
  - Set `JUDOLLENS_MODEL_ARTIFACT` to `models/serving/indobert-sampled-baseline-v0.1.0-onnx`, `JUDOLLENS_INFERENCE_RUNTIME=onnx-int8`, then start Uvicorn on `127.0.0.1:8000`.
- Known risk:
  - The sampled baseline is local-only and not a final human-annotated model. The failed checkpoint-local export remains unsuitable for serving and should not be selected.

### Session 092

- Date: 2026-09-14
- Goal: replace the confusing popup protection controls with one automatic-protection master toggle.
- Completed:
  - Replaced the popup's sensor-mode, auto-blur, and Unicode-highlight controls with one persisted `protectionEnabled` switch. Detailed behavior settings remain only in Options.
  - Automatic scans now exit before candidate collection or batch dispatch when disabled; the background independently skips prediction, stats, and detection-log writes.
  - Added a post-prediction settings check so a scan completed after the user disables protection is discarded without persisting stale evidence.
  - Updated the storage, popup-flow, and popup-screen-plan documentation; added regressions for persistence, content-script dispatch suppression, background defense, and the in-flight toggle race.
- Verification run:
  - `pnpm test:run` — passed: 106 unit tests in 20 files.
  - `pnpm compile` — passed.
  - `pnpm build && pnpm exec playwright test tests/e2e/popup.spec.ts` — production build passed; 3 Playwright popup/overlay tests passed. The popup test toggled **Aktifkan perlindungan**, observed `Nonaktif`, restored `Aktif`, and refreshed `docs/extension/screenshots/ext-005-popup-control-center.png`.
- Review:
  - Independent review identified the in-flight stale-settings race; it was fixed and covered by `discards an in-flight automatic scan when protection is disabled before persistence`.
- Known behavior:
  - The master toggle governs automatic protection only. Manual analysis and detailed censorship/Unicode configuration remain independently available from Options, matching their distinct user flows.

### Session 093

- Date: 2026-09-14
- Goal: make Options `Censor mode: hide` remove a detected X tweet rather than
  applying an opaque text-level wrapper.
- Completed:
  - The X background delivery now maps positive timeline predictions to the
    persisted `censorMode`, matching the normal content-scan path.
  - The X reconciler retains bounded `{ id, riskLevel, action }` decisions and
    distinguishes `blur` from `hide` after status-ID matching.
  - `hide` removes the complete matching `article[data-testid="tweet"]`; other
    rendered tweets and all nonmatching status IDs remain untouched. `blur`
    continues to use the existing full-card overlay.
  - Updated the X roadmap, MVP architecture, and feature evidence to record
    this intentional destructive DOM behavior for hide mode.
- Verification run:
  - `pnpm exec vitest run src/dom/overlay.test.ts src/dom/content-scan.test.ts src/dom/x-timeline-reconciler.test.ts src/background/background-coordinator.test.ts` — passed: 47 unit tests.
  - `pnpm compile` — passed.
  - No E2E test run, per user direction.
- Known risk:
  - X virtualized timeline remounts a censored status card after its decision
    ages out of the bounded 100-item in-memory cache; it can then become visible
    again until a new SearchTimeline delivery. This matches the pre-existing
    no-persistence privacy boundary.

### Session 094

- Date: 2026-09-15
- Goal: make Options `Censor mode: warn` visibly mark a status-ID-matched X
  tweet without obscuring its content.
- Root cause:
  - The existing `warn` branch added an absolute amber element covering the
    complete tweet card. It was technically visible but did not meet the
    intended badge-only warning behavior.
- Completed:
  - The X reconciler continues to retain positive `warn` decisions alongside
    `blur` and `hide`, keyed solely by bounded in-memory status IDs.
  - A matching X tweet now receives exactly one compact, pointer-transparent
    `Terdeteksi JudolLens` badge at its top-right. It creates no full-card
    overlay, leaves tweet text readable, and leaves nonmatching cards intact.
  - The loaded-extension SearchTimeline check now delivers a `warn` result and
    asserts the badge, absence of the blur overlay, and warning marker.
  - Updated the X implementation roadmap, MVP architecture, and EXT-015
    behavior/evidence to describe badge-only warning mode.
- Verification run:
  - `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& './init.ps1'"`
    — passed baseline startup verification.
  - `pnpm exec vitest run src/dom/overlay.test.ts src/dom/x-timeline-reconciler.test.ts src/background/background-coordinator.test.ts`
    — passed: 38 unit tests.
  - `pnpm compile` — passed.
  - `pnpm build` — passed; production output regenerated at
    `apps/browser-extension/.output/chrome-mv3`.
  - `pnpm exec playwright test tests/e2e/x-search-timeline.spec.ts` — passed:
    1 loaded-extension browser test; screenshot refreshed at
    `docs/extension/screenshots/ext-017-x-search-timeline.png`.
- Known risk:
  - X virtualized timeline remounts a censored status card after its decision
    ages out of the bounded 100-item in-memory cache; it can then become visible
    again until a new SearchTimeline delivery. This matches the no-persistence
    privacy boundary.

### Session 095

- Date: 2026-09-16
- Goal: verify the approved OpenAPI contract-first FastAPI and browser-extension integration, including generic X batch routing.
- Completed:
  - Confirmed `contracts/judollens-api.openapi.yaml` is the sole machine-readable contract: FastAPI exposes only `GET /health`, `POST /predict`, and `POST /predict/batch`; generated extension declarations have no drift; `x` is a `source.platform` value on the generic batch route, not a separate endpoint.
  - Confirmed the extension confines snake_case/camelCase conversion to `src/api/judollens-api-client.ts`; background-owned API transport serializes four-item chunks, retries only `429`/`503`, and does not fall back to mock predictions.
  - Fixed a persistence boundary found in review: an API batch containing successful chunks plus any terminal item error now enters the explicit API-error state and writes no detection logs. The response still returns its successful items and item-level errors to its caller.
  - Updated `docs/extension/api-contract.md` with the partial-failure persistence rule and recorded API-001 evidence. API-001 remains `in_progress`: the serving artifact is a sampled notebook baseline, not final human-ground-truth model evidence.
- Verification run:
  - RED: `pnpm exec vitest run src/background/background-coordinator.test.ts` failed the new mixed-response regression because session stats became `active` and successful results would be logged.
  - GREEN: the same focused coordinator test passed **20 tests** after the predicate correction; focused API client/gateway/selector/coordinator tests then passed **25 tests**, and `pnpm compile` passed.
  - `pnpm --dir apps/browser-extension check:api` — passed; generated schema stayed clean.
  - `uv run --no-cache python -m pytest --basetemp=.pytest-tmp apps/api/tests/test_api_contract.py -q` — passed **12 tests**.
  - Live loopback smoke against the pre-existing `127.0.0.1:8000` sampled-baseline service: `/health`, `/predict`, and an X-shaped `/predict/batch` all returned HTTP 200 with `is_mock: false`; single ID `manual-1` and batch IDs `tweet-positive`, `tweet-negative` were preserved. The service was pre-existing and left running. The observed sampled-model classifications are smoke output, not ground truth.
  - Final gates: `init.ps1` passed; `apps/api/tests` passed **14 tests**; extension `test:run` passed **110 tests**; API drift check, compile, and production build passed.
  - The planned `tests/e2e/api-mode.spec.ts` does not exist, so Playwright reported “No tests found.” The real contract scenario is `tests/e2e/onnx-runtime-extension.spec.ts`; it passed **1 test**, started its own loopback ONNX service, applied two overlays, stored non-mock metadata and positive latency, and refreshed `docs/extension/screenshots/ext-018-api-mode-onnx-int8.png`.
- Review:
  - Independent review approved the partial-failure correction: API responses with any gateway error skip normal persistence; mock and error-free API scans retain their existing path.
- Known risk:
  - The validated ONNX artifact is the sampled `indobert-sampled-baseline-v0.1.0-onnx`, not a final model trained from human-annotated `dataset_final.xlsx`; API-001 must remain in progress until that artifact and evidence exist.
- Next best step:
  - Complete final human annotation, train and validate the final clean serving artifact, then repeat this contract smoke and API-mode browser scenario before marking API-001 passing.

### Session 096

- Date: 2026-09-16
- Goal: extend X timeline GraphQL capture from SearchTimeline-only delivery to the approved allow-listed coverage while preserving the generic prediction contract.
- Completed:
  - Replaced `parseSearchTimelinePayload` with `parseXTimelinePayload` without a compatibility alias. It explicitly handles Home, Search, profile, and Tweet Detail instruction roots; direct and module tweet entries; canonical or legacy IDs; note or legacy text; trim/invalid-value rejection; and first-ID-wins deduplication.
  - Restricted the debugger monitor to successful X responses for `HomeTimeline`, `SearchTimeline`, `UserOriginalsTimeline`, `UserRepostsTimeline`, `UserVideoTimeline`, `UserPhotoTimeline`, `UserRepliesTimeline`, and `TweetDetail`; the generic `/predict/batch` route, OpenAPI file, API mode, mock mode, logs, and storage contract did not change.
  - Preserved per-tab dispatch deduplication and added lifecycle regressions for response failure, external detach, unsubscribe during attach/enable, replacement subscription after cancellation, and delayed explicit detach events.
  - Confirmed status-ID-only reconciliation across Home, profile, detail, and reply cards. Nonmatching, nonnumeric-link, and linkless cards remain unchanged.
  - Added a loaded-extension X coverage scenario and `docs/extension/screenshots/ext-019-x-timeline-coverage.png`.
- Verification run:
  - Local capture parser smoke printed only counts: HomeTimeline=35, SearchTimeline=20, UserOriginalsTimeline=20, UserRepostsTimeline=20, UserVideoTimeline=0, UserPhotoTimeline=20, UserRepliesTimeline=2, TweetDetail=35. The temporary smoke script was removed; no raw capture content was recorded.
  - `pnpm exec vitest run src/x/x-timeline-parser.test.ts src/background/x-timeline-monitor.test.ts src/dom/x-timeline-reconciler.test.ts` — passed: 29 tests in 3 files.
  - `pnpm test:run` — passed: 128 tests in 20 files.
  - `pnpm compile` and `pnpm build` — passed.
  - `pnpm exec playwright test tests/e2e/x-timeline-coverage.spec.ts` — passed: 1 test. `pnpm test:e2e` — passed: 13 tests.
  - `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& .\init.ps1"` — passed baseline startup verification. `uv sync` emitted an existing `debugpy` missing-RECORD warning but completed, and `uv run --no-cache python main.py` reported the monorepo ready.
- Review:
  - Independent reviews found and corrected whitespace IDs, inherited allow-list membership, failed/detached response tracking, setup cancellation/replacement races, stale explicit-detach ordering, and a missing linkless-card regression.
- Known risk:
  - Chrome `onDetach` exposes only tab ID and reason. A truly simultaneous unrelated same-tab `canceled_by_user` event cannot be distinguished from a delayed explicit detach; the reason-qualified expected-detach fence protects the tested delayed-detach ordering without timeouts. Live logged-in X traffic remains a manual validation item.
- Next best step:
  - Complete final human annotation, train and validate the final clean serving artifact, then repeat the API contract smoke and API-mode browser scenario before marking API-001 passing.

### Session 097

- Date: 2026-09-16
- Goal: prevent the X content script from crashing while registering its runtime-message listener after the extension context has been invalidated.
- Root cause:
  - The X branch called `browser.runtime.onMessage.addListener(...)` directly. During extension reload or update, WXT can invalidate the content-script context before that accessor is used, producing the observed `Cannot read properties of undefined (reading 'addListener')` startup crash.
- Completed:
  - Added `registerRuntimeMessageListenerSafely()` alongside the existing context-safe runtime send helper. It pre-checks WXT invalidation, absorbs only the expected invalid-context error, and preserves unrelated runtime failures.
  - Routed X timeline prediction-listener registration through the guard; normal listener removal, reconciler teardown, subscription, and shared prediction contract remain unchanged.
- Verification run:
  - RED: `pnpm exec vitest run src/dom/content-runtime.test.ts` failed the new stale-listener regression because the guard did not exist.
  - GREEN: `pnpm exec vitest run src/dom/content-runtime.test.ts src/dom/x-timeline-reconciler.test.ts` passed 13 tests.
  - `pnpm compile` and `pnpm build` passed from `apps/browser-extension`.
- Known risk:
  - A stale content script cannot self-heal after an extension reload; Chrome must inject the current script on navigation/reload. The guard makes that lifecycle condition quiet and prevents it from crashing the page's active script.
- Next best step:
  - Complete final human annotation, train and validate the final clean serving artifact, then repeat the API contract smoke and API-mode browser scenario before marking API-001 passing.

### Session 098

- Date: 2026-09-16
- Goal: localize user-visible browser-extension copy to Indonesian without
  changing the OpenAPI prediction contract.
- Completed:
  - Replaced visible English copy in popup, options, log review, manual
    analysis, and simulation surfaces with Indonesian equivalents; protocol
    identifiers, platform values, and persisted contract enums remain stable.
  - Updated the simulator Playwright heading assertion to its localized value.
  - Documented the copy-language boundary in
    `docs/extension/ui-screen-plan.md`.
- Verification:
  - `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& .\init.ps1"`
    passed; it completed `uv sync --no-cache` and reported the monorepo ready.
  - `pnpm compile` and `pnpm build` passed from `apps/browser-extension`.
  - The running simulator returned HTTP 200 and contained every localized
    marker: `Simulasi JudolLens`, the Indonesian subtitle, `Umpan Dasar`,
    `Komentar Terobfuskasi`, `Umpan Campuran`, and its Indonesian ARIA label.
  - `pnpm exec playwright test tests/e2e/simulation.spec.ts` reached the same
    existing 30-second browser-context timeout. Its error context contains only
    the timeout, and direct harness browser attachment fails earlier with
    `Network.enable: Debugger is not attached to the tab`; this precedes any
    test assertion.
- Known risk:
  - A visual screenshot of the localized simulator cannot be regenerated until
    the shared Chrome/CDP lifecycle failure is resolved. The static HTML and
    production extension build are verified, but no live rendered surface was
    available in this workstation state.
- Next best step:
  - Resolve the shared Chromium/CDP lifecycle issue, rerun `pnpm test:e2e`, and
    regenerate the simulator screenshot; API-001 remains blocked on a final
    human-annotated model artifact.

### Session 099

- Date: 2026-09-16
- Goal: repair the Chrome extension load failure caused by a manifest locale
  catalog missing from WXT build output.
- Root cause:
  - `wxt.config.ts` correctly declares `default_locale: 'id'`, but WXT copies
    locale catalogs only from `public/_locales/`; the catalog was incorrectly
    placed at the extension root in `_locales/id/messages.json`. Chrome then
    rejected the generated manifest because its required output subtree was
    absent.
- Completed:
  - Moved the Indonesian catalog to
    `apps/browser-extension/public/_locales/id/messages.json` without changing
    its messages or the manifest locale.
  - Added a build-output regression to
    `src/background/background-coordinator.test.ts`, requiring the manifest's
    declared default locale catalog to exist in `.output/chrome-mv3`.
- Verification:
  - RED: the new regression failed against the previous output because
    `.output/chrome-mv3/_locales/id/messages.json` did not exist.
  - GREEN: `pnpm build` now emits
    `.output/chrome-mv3/_locales/id/messages.json`.
  - `pnpm exec vitest run src/background/background-coordinator.test.ts` passed
    21 tests; `pnpm compile` passed.
  - Manifest smoke confirmed `default_locale=id`, the matching catalog exists,
    and its JSON parses successfully.
- Next best step:
  - Reload the unpacked `.output/chrome-mv3` directory in Chrome. API-001
    remains blocked only on a final human-annotated model artifact.

### Session 100

- Date: 2026-09-17
- Goal: deliver production runtime handling for YouTube Home Browse GraphQL videos through the existing extension prediction contract.
- Root cause:
  - YouTube regular Home cards require stable video-ID reconciliation because DOM text scanning cannot reliably associate a later prediction with a virtualized card. The existing X GraphQL capture/reconciliation design provided the bounded, contract-compatible pattern.
- Completed:
  - Added a YouTube Browse parser that accepts only selected rich-grid `lockupViewModel` video records with trimmed IDs and titles, deduplicates IDs, and rejects unsupported content types.
  - Added a tab-scoped Chrome debugger monitor for successful HTTPS YouTube `/youtubei/v1/browse` responses. It parses only terminal response bodies, bounds per-tab dispatch IDs, and cleans pending state across unsubscribe and detach paths.
  - Routed Browse items through the existing background prediction coordinator and its generic mock/API batch contract; no OpenAPI wire shape or persistence contract changed.
  - Added a YouTube Home content lifecycle, message subscription, bounded regular-card reconciler, and scoped blur/warn/hide overlays. It matches only `/watch?v=` video IDs, leaves Shorts and unmatched cards unchanged, and retains no raw page payload.
  - Added parser, monitor, coordinator, reconciler, content-runtime, overlay, and loaded-extension E2E coverage. The browser scenario uses an HTTPS `www.youtube.com` fixture and records `docs/extension/screenshots/ext-020-youtube-browse-home.png`.
- Verification:
  - RED: `pnpm compile` exposed two test-only type errors: a synchronous Vitest mock did not satisfy the asynchronous `PredictBatch` contract, and inferred mixed tuples widened `requestId` to `string | number`.
  - GREEN: the mock is explicitly async and unsupported-response tuples are typed. `pnpm test:run` passed **163 tests in 23 files**; `pnpm compile` and `pnpm build` passed.
  - `pnpm exec playwright test tests/e2e/youtube-browse-coverage.spec.ts` passed **1 test**. It observed a matching blur overlay, warning badge, removed hide card, and unchanged unrelated plus positive-ID Shorts cards.
  - Independent review found no critical or important defect in parser safety, debugger lifecycle, message routing, or the notification-only runtime-message boundary.
- Known risk:
  - This covers only selected YouTube Home Browse rich-grid responses and normal `/watch?v=` cards. Live logged-in YouTube delivery and renderer variants remain manual validation items.
- Next best step:
  - Complete final human annotation, train and validate the final clean serving artifact, then repeat the API contract smoke and API-mode browser scenario before marking API-001 passing.

### Session 101

- Date: 2026-09-17
- Goal: make generic YouTube title detections blur their complete regular video card rather than only the title text.
- Root cause:
  - Generic YouTube scanning used the text-node parent as its overlay target. The screenshot and live DOM evidence showed `span.judollens-detected` wrapping only the title inside a regular `ytd-rich-item-renderer`, while the thumbnail and metadata stayed readable.
- Completed:
  - For `blur` only, generic YouTube title detections now promote their target to the nearest `ytd-rich-item-renderer` and reuse the scoped full-card YouTube overlay. Warning and hide retain their existing title-local behavior; X card behavior is unchanged.
  - Added a regression with a realistic thumbnail/title card fixture and strengthened the loaded-extension scenario to require the full-card marker and direct overlay while forbidding the inline text wrapper.
- Verification:
  - RED: `pnpm exec vitest run src/dom/overlay.test.ts` failed the new card-level assertion because generic scanning left `data-judollens-youtube-blur` absent.
  - GREEN: focused overlay/reconciler tests passed **25 tests**; `pnpm test:run` passed **164 tests in 23 files**; `pnpm compile` and `pnpm build` passed.
  - `pnpm exec playwright test tests/e2e/youtube-browse-coverage.spec.ts` passed **1 test**, asserting the full-card blur marker and direct overlay, with no inline title wrapper.
- Known risk:
  - Generic YouTube title scanning relies on the stable enclosing `ytd-rich-item-renderer` selector. New YouTube renderer variants outside that container retain text-level behavior until explicitly covered.
- Next best step:
  - Reload the unpacked extension, then manually validate an actual YouTube Home card with its thumbnail and metadata before the final-model API evaluation cycle.

### Session 102

- Date: 2026-09-17
- Goal: apply generic YouTube warning and hide actions to the full regular video card, matching blur behavior.
- Completed:
  - Generic scan predictions inside `ytd-rich-item-renderer` now resolve `blur`, `warn`, and `hide` to the enclosing regular video card.
  - Warning appends the existing pointer-transparent card badge; hide removes the entire card. No prediction response shape, storage contract, or X behavior changed.
  - Added unit regressions for generic card-level warning and hide, plus loaded-extension assertions that the warning marker and badge are direct descendants of the expected card.
- Verification:
  - RED: `pnpm exec vitest run src/dom/overlay.test.ts` failed the new warning and hide regressions because generic scans still targeted the title parent.
  - GREEN: focused overlay suite passed **18 tests**. `pnpm test:run` passed **166 tests in 23 files**; `pnpm compile` and `pnpm build` passed.
  - `pnpm exec playwright test tests/e2e/youtube-browse-coverage.spec.ts` passed **1 test**, proving a full-card blur, card-level warning, full-card hide, and unchanged unrelated/Shorts cards.
  - `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./init.ps1` passed the repository startup verification.
- Known risk:
  - Full-card promotion is restricted to regular `ytd-rich-item-renderer` cards. Unknown renderer variants remain text-local by design.
- Next best step:
  - Reload the unpacked extension, then manually validate blur, warning, and hide on actual YouTube Home cards before the final-model API evaluation cycle.

### Session 103

- Date: 2026-09-18
- Goal: specify Telegram Web bidirectional viewport prefetch before any implementation.
- Completed:
  - Added `docs/superpowers/specs/2026-09-18-telegram-bidirectional-prefetch-design.md`.
  - The design scopes scheduling to rendered Telegram `.bubble` roots and retains the canonical OpenAPI batch contract, background coordinator, model selection, overlay behavior, and bounded evidence storage unchanged.
  - It defines one viewport of prefetch on both sides of the reader: visible bubbles first, then the current scroll direction, then the opposite side; each serialized call contains at most 12 roots.
  - It explicitly excludes chat-history scans, Telegram API/debugger capture, persistent prediction caching, raw text/HTML retention, and changes to X, YouTube, simulation, or generic pages.
  - If Telegram's scroll container cannot be resolved, the design requires the existing generic scan plus dynamic-observer fallback so Telegram is never silently unscanned.
- Verification:
  - The design was checked against the existing content entrypoint, content scan, dynamic observer tests, shared platform detection, canonical OpenAPI contract, extension architecture, storage model, and prior viewport-scheduler plan.
- Known risk:
  - Telegram Web can change its bubble or scroll-container DOM. The planned selector scope and tested generic fallback contain that risk; live Telegram Web remains a required manual check after fixture-based browser verification.
- Next best step:
  - Review and approve `docs/superpowers/specs/2026-09-18-telegram-bidirectional-prefetch-design.md`; only then write the implementation plan and begin test-first implementation.

### Session 104

- Date: 2026-09-18
- Goal: turn the approved Telegram bidirectional reader-prefetch design into a test-first implementation plan.
- Completed:
  - Wrote `docs/superpowers/plans/2026-09-18-telegram-bidirectional-prefetch.md` after approval of the design specification.
  - The plan defines five TDD tasks: scheduler ordering and bounds; dynamic lifecycle cleanup; Telegram-only content lifecycle with generic fallback; loaded-extension two-direction browser proof; and durable architecture, feature, progress, graph, and startup evidence.
  - It locks `.bubble` scope, one-reader-height two-sided prefetch, visible/directional/opposite ordering, an 8px direction deadband, serialized 12-root scans, and no new HTTP, message, storage, persistence, or raw-text boundary.
  - Plan self-review corrected the fallback test seam: `canStartTelegramViewportPrefetch()` precisely matches the content-entrypoint branch.
- Verification:
  - Cross-checked the plan against `entrypoints/content.ts`, `content-scan.ts`, `dynamic-observer.test.ts`, `content-runtime.test.ts`, shared platform detection, existing loaded-extension fixtures, the canonical OpenAPI document, prior X viewport plan, and the graph query for the content-scanner path.
- Next best step:
  - Execute `docs/superpowers/plans/2026-09-18-telegram-bidirectional-prefetch.md` task by task using its required execution workflow.

### Session 105

- Date: 2026-09-18
- Goal: implement and verify bounded bidirectional prefetch for rendered Telegram Web reader bubbles.
- Completed:
  - Added a Telegram-only content-side scheduler for rendered `.bubble` roots. It resolves the shared scrollable reader, admits roots from one reader-height pixel above and below, prioritizes visible roots then the current direction then the opposite side, and serializes the existing scan path in batches of at most 12.
  - Added lifecycle-safe observer handling: dynamic bubble registration, deduplication, disconnected-root discard, passive direction tracking with an 8px deadband, and cleanup that disconnects both observers and the scroll listener.
  - Routed only Telegram Web through this scheduler; unresolved-reader and unavailable-`IntersectionObserver` cases retain the existing generic initial scan and dynamic observer.
  - Added the HTTPS loaded-extension fixture and screenshot `docs/extension/screenshots/ext-021-telegram-bidirectional-prefetch.png`, proving the positive bubbles above and below the reader are annotated before entering it and the clean control bubble remains unchanged.
  - Updated `docs/extension/frontend-roadmap.md`, `docs/extension/mvp-architecture.md`, and `feature_list.json` for EXT-017. Corrected the existing manual-log E2E assertion to the canonical `NON_JUDOL` contract label and made its `Tidak ada` action assertion strict.
- Verification:
  - RED/GREEN during implementation: focused scheduler and loaded-extension Telegram regression passed after the scheduler and fixture were completed.
  - Review found that percentage `rootMargin` uses reader width, not height. Replaced it with a pixel margin derived from `scrollContainer.clientHeight`; the focused scheduler regression now asserts the intended height-based boundary.
  - `pnpm test:run` passed 180 tests in 24 files; `pnpm compile`, `pnpm build`, and `pnpm check:api` passed.
  - `pnpm test:e2e` passed 15 loaded-extension scenarios, including Telegram bidirectional prefetch and manual analysis/log persistence.
  - `graphify update .` completed and refreshed `graphify-out/` with 2,251 nodes and 4,200 edges.
- Known risk:
  - Telegram Web may change its `.bubble` or scroll-container DOM. The scheduler falls back to generic scanning when the reader cannot resolve, but manual validation against a live logged-in Telegram Web reader remains required.
- Next best step:
  - Reload the unpacked extension and manually validate a real Telegram Web conversation by scrolling in both directions before backend/model evaluation work.

### Session 106

- Date: 2026-09-18
- Goal: preserve complete rendered Telegram message payloads through the canonical batch prediction route.
- Completed:
  - Added Telegram-specific candidate collection for `.translatable-message`: nested text, image `alt` evidence, and line breaks are normalized into one bounded (512-character) `message` item rather than fragmented DOM-node requests.
  - Preserved each complete message's text-node references for overlay and processed/pending lifecycle tracking.
  - Kept the generic text-node scanner as the Telegram fallback when a rendered Telegram surface has no `.translatable-message` element, preserving the existing bidirectional `.bubble` fixture/scheduler behavior.
- Verification:
  - RED: the content-scan integration regression initially received ten fragmented batch items instead of one complete Telegram message.
  - GREEN: focused DOM-scanner and content-scan suites passed **19 tests**; overlay coverage passed as part of the earlier focused suite.
  - `pnpm test:run` passed **182 tests in 24 files**; `pnpm compile`, `pnpm build`, and `pnpm check:api` passed.
  - `pnpm exec playwright test tests/e2e/telegram-bidirectional-prefetch.spec.ts` passed **1 loaded-extension scenario**, proving the scheduler's non-`.translatable-message` bubble fallback still annotates both positive bubbles before they enter view.
  - `graphify update .` refreshed `graphify-out/` with **2,255 nodes** and **4,213 edges**.
- Known risk:
  - Telegram Web markup can differ between actual messages and fixtures. `.translatable-message` receives message-level batching when present; the existing generic scanner remains the safe fallback until live logged-in Telegram validation.
- Next best step:
  - Reload the unpacked extension and manually validate a real Telegram Web message with links, emoji/image alt text, and Unicode obfuscation, then continue the FastAPI/model evaluation path.


### Session 107

- Date: 2026-09-18
- Goal: make the Telegram viewport scheduler scan already-rendered startup bubbles without depending on the browser's initial `IntersectionObserver` delivery.
- Completed:
  - Added an opt-in initial bubble queue to the Telegram scheduler. It synchronously admits bubbles within the existing one-reader-height prefetch window, then uses the same priority and serialized batch path as intersection-delivered roots.
  - Enabled that queue only from the Telegram content entrypoint. Scheduler callers retain their previous event-driven behavior unless they explicitly opt in.
  - Added a regression proving an initially rendered visible bubble is scanned without an `IntersectionObserver` callback.
- Verification:
  - RED: the new scheduler regression received no scan before the initial intersection callback.
  - GREEN: `pnpm compile` and `pnpm exec vitest run src/dom/dom-scanner.test.ts src/dom/content-scan.test.ts src/dom/overlay.test.ts src/dom/telegram-viewport-scheduler.test.ts` passed **57 tests in 4 files**.
  - Repository startup verification passed: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File D:/judol_detection/init.ps1`; it completed `uv sync --no-cache` and `uv run --no-cache python main.py`.
- Known risk:
  - The loaded-extension Telegram fixture remains unverified after this correction. Earlier E2E evidence is historical only: subsequent runs did not receive any Telegram overlay within the assertion window, so the extension injection/background-message boundary must be traced before using it as final proof. Per direction, no further E2E run was started.
- Next best step:
  - Diagnose the loaded-extension Telegram fixture's content-script injection and background response path, then rerun the focused Playwright regression before declaring EXT-017 fully reverified.

### Session 108

- Date: 2026-09-18
- Goal: restore visible Telegram blur overlays when Telegram's stacked bubble content covers the injected overlay.
- Completed:
  - Added `z-index: 2` only to `.judollens-telegram-overlay`; it remains an absolute, pointer-transparent sibling on the existing `.bubble-content-wrapper` target, so Telegram links and controls retain their normal interaction behavior.
  - Added a focused regression asserting the injected Telegram blur CSS places the overlay above stacked Telegram content layers.
- Verification:
  - RED: `pnpm exec vitest run src/dom/overlay.test.ts` failed because the Telegram overlay stylesheet had no explicit stacking order.
  - GREEN: the same suite passed **22 tests** after the CSS correction; `pnpm compile` and `pnpm build` passed.
  - `git diff --check -- apps/browser-extension/src/dom/overlay.ts apps/browser-extension/src/dom/overlay.test.ts` passed.
- Known risk:
  - The focused loaded-extension Telegram fixture still times out before it receives any overlay. Its Playwright trace shows both expected `data-judollens-telegram-blur` attributes remain absent, so that is an existing injection/background-message boundary failure—not evidence against the new CSS layer. This correction is not claimed as a fresh end-to-end Telegram validation.
- Next best step:
  - Trace why the loaded-extension fixture injects no content result, rerun that focused Playwright scenario, then manually validate the rebuilt unpacked extension against the real Telegram message surface.

### Session 109

- Date: 2026-09-18
- Goal: render the injected Telegram blur surface above Telegram's real stacked bubble content.
- Completed:
  - Replaced the insufficient local `z-index: 2` with an isolated stacking context on the existing `.bubble-content-wrapper` target and `z-index: 2147483647` on its pointer-transparent `.judollens-telegram-overlay` child.
  - The message DOM, link/media interactions, target selection, and prediction path remain unchanged; only paint order changed.
  - Added a regression whose simulated `.bubble-content` has `position: relative; z-index: 10`; it proves the overlay owns an isolated foreground layer above message content.
- Verification:
  - RED: `pnpm exec vitest run src/dom/overlay.test.ts` failed because the Telegram wrapper had no isolated stacking context.
  - GREEN: `pnpm exec vitest run src/dom/overlay.test.ts` passed 22 tests; `pnpm compile` and `pnpm build` passed.
  - `git diff --check -- apps/browser-extension/src/dom/overlay.ts apps/browser-extension/src/dom/overlay.test.ts` passed; only Git CRLF normalization warnings were emitted.
- Known risk:
  - No logged-in Telegram Web session is available here, so the real page must be reloaded and visually checked after replacing the unpacked build. The earlier fixture timeout is a separate content-injection/background-message issue and was not used as proof for this CSS-only correction.
- Next best step:
  - Reload the unpacked extension in Chrome, revisit the detected Telegram message, and confirm the red blur surface plus `Terdeteksi JudolLens` badge visibly cover its media and text while its links remain clickable.

### Session 110

- Date: 2026-09-18
- Goal: render the injected Telegram warning badge above Telegram's stacked bubble content.
- Completed:
  - Added the same local stacking isolation to a warning-targeted `.bubble-content-wrapper` and raised `.judollens-telegram-warning.judollens-label` to `z-index: 2147483647`.
  - Preserved the warning's existing top-right placement and pointer-transparent interaction behavior.
  - Added a regression proving a warning badge remains in the foreground when sibling Telegram content establishes `z-index: 10`.
- Verification:
  - RED: `pnpm exec vitest run src/dom/overlay.test.ts` failed because the warning target lacked `isolation: isolate`.
  - GREEN: `pnpm exec vitest run src/dom/overlay.test.ts` passed 23 tests; `pnpm compile` and `pnpm build` passed.
  - `git diff --check -- apps/browser-extension/src/dom/overlay.ts apps/browser-extension/src/dom/overlay.test.ts` passed; only Git CRLF normalization warnings were emitted.
- Known risk:
  - Reload the rebuilt unpacked extension before manual Telegram validation. The focused loaded-extension fixture remains a separate injection/background-message issue and does not verify this paint-order correction.
- Next best step:
  - Reload the unpacked extension in Chrome and verify both Telegram warning and blur remain visible above real message/media content while links remain clickable.

### Session 111

- Date: 2026-09-23
- Goal: implement the approved privacy-safe OpenTelemetry/Jaeger benchmark path across the browser extension and FastAPI server.
- Completed:
  - Added opt-in extension telemetry settings, strict loopback OTLP endpoint validation, opaque benchmark run IDs, an ephemeral exporter diagnostic, and Options controls. No telemetry status or trace data is persisted in extension storage.
  - Added the background-owned OpenTelemetry provider with 128 bounded roots, timeout/invalidation/reconfiguration cleanup, batch export, W3C trace-context plus run-ID baggage, fail-open exporter handling, and one generic warning per minute.
  - Instrumented content scan/overlay/next-paint, background prediction/storage, gateway queue/chunk/retry/HTTP attempts, and explicit JudolLens API header injection. Aggregate-only envelopes structurally exclude content and browsing fields.
  - Added app-scoped FastAPI telemetry lifecycle and matching PyTorch/ONNX spans for tokenization, inference, postprocessing, and response projection. CORS preflight now allows `traceparent`, `tracestate`, and `baggage` for configured exact origins.
  - Client tracing integration passed **73 tests in 6 files**; exporter diagnostics passed **44 tests in 3 files**; the full extension suite passed **225 tests in 26 files**. `pnpm compile`, `pnpm build`, and `pnpm check:api` passed.
  - Server telemetry/inference/contract suite passed **40 tests**; the full Python suite passed **233 tests** with six upstream deprecation/tracing warnings. Python compileall and repository `init.ps1` passed.
  - Jaeger YAML parsed with repository PyYAML; health `13133`, query `16686`, OTLP/gRPC `4317`, and OTLP/HTTP `4318` all bind to `127.0.0.1`; Badger is non-ephemeral with `720h` retention.
  - Real ONNX API telemetry smoke: the API loaded `indobert-sampled-baseline-onnx-int8-v0.1.0`, accepted a known W3C trace context and `judollens.run_id=benchmark-smoke`, and returned HTTP 200 for `benchmark-smoke-request`. With Jaeger absent, OTLP export failed to `127.0.0.1:4318` while prediction remained successful, proving server fail-open behavior.
  - Final `graphify update .` refreshed the graph to **2,349 nodes, 4,428 edges, and 160 communities**.
- Blocker and remaining verification:
  - `observability/jaeger/jaeger.exe` is not installed and `where.exe jaeger.exe` found no system binary. Therefore no real Jaeger version, trace ID, cross-process topology, Badger restart persistence, loaded-extension telemetry flow, opt-out absence check, or Jaeger privacy query is claimed.
  - OBS-001 remains `in_progress`; do not mark it passing until the native binary is installed and the full Task 11 scenario passes.
- Next best step:
  - Download and checksum an official Jaeger v2 Windows AMD64 release into `observability/jaeger/jaeger.exe`, start it with `jaeger-v2.yaml`, then run the real loaded-extension ONNX trace/persistence/opt-out/privacy smoke described in `docs/observability/jaeger-local.md` and the approved implementation plan.

### Session 112

- Date: 2026-10-31
- Goal: inspect and commit the existing working-tree changes at the user's request.
- Verification:
  - Repository `init.ps1` passed dependency sync and the entrypoint smoke check.
  - `pnpm test:run` passed 225 tests in 26 files; `pnpm compile` and `pnpm check:api` passed.
  - The initial full Python run exceeded the shell's 120-second limit. The rerun with a 600-second limit completed with 232 passed and one ONNX Uvicorn startup timeout at its existing 60-second readiness deadline.
  - Reran `uv run --no-cache python -m pytest --basetemp=.pytest-tmp apps/api/tests/test_api_process.py::test_uvicorn_serves_onnx_int8_artifact_without_pytorch_fallback -q`: 1 passed in 54.49 seconds. The readiness deadline was not changed.
  - `git diff --check` passed. Inspected the tracked diff and new-file list before staging; local Jaeger binary and Badger traces remain ignored.
- Remaining verification:
  - OBS-001 remains in progress with the Session 111 native-Jaeger end-to-end blocker. Existing Telegram live/browser verification limitations remain recorded above; no new browser screenshot or E2E acceptance is claimed in this commit session.
- Next best step:
  - Complete the native Jaeger distributed-trace acceptance scenario documented in Session 111.
