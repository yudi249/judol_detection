# Architecture

Sistem terdiri dari empat artefak utama:

1. Pipeline dataset dan manipulasi Unicode.
2. Model klasifikasi teks CNN, BiLSTM, dan IndoBERT.
3. Server inferensi FastAPI lokal yang contract-first. `contracts/judollens-api.openapi.yaml` adalah source of truth untuk `GET /health`, `POST /predict`, dan `POST /predict/batch`; server memuat satu artefak IndoBERT lokal yang tervalidasi manifest tanpa mengirim teks mentah ke log.
4. Browser extension Manifest V3 untuk pemindaian DOM dan penyensoran realtime. Background service worker menjadi satu-satunya client HTTP, menggunakan client yang dihasilkan dari OpenAPI; content script dan React UI tetap transport-agnostic.

Mode `mock` tetap tersedia untuk demo offline dan regresi. Mode `api` baru dapat dipakai setelah artefak clean IndoBERT lokal dilatih dan server loopback dijalankan dengan CORS origin extension yang eksplisit; belum ada klaim verifikasi surface API nyata sebelum prasyarat tersebut terpenuhi.
