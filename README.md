# NEURALINK — Otak vs Mesin Berpikir 🧠

Website edukasi neurosains interaktif berbahasa Indonesia yang membandingkan cara kerja otak manusia dengan model bahasa (LLM).

![Status](https://img.shields.io/badge/status-aktif-brightgreen) ![Tech](https://img.shields.io/badge/stack-HTML%20%2B%20CSS%20%2B%20Vanilla%20JS-orange)

## Fitur

- **Cara Otak Bekerja** — penjelasan neuron, sinapsis, dan plastisitas
- **Simulasi Jaringan Saraf** — visualisasi jaringan neural berjalan di canvas
- **Cara Model Bahasa Bekerja** — penjelasan token, embedding, dan transformer
- **Otak vs LLM** — perbandingan langsung antara kognisi biologis vs komputasi statistik
- **Lab Interaktif** — 22 simulasi canvas: aksi potensial, hebbian learning, dll.
- **Teknologi Neuralink** — overview teknologi brain-computer interface

## Tech Stack

- HTML5 — struktur & konten
- CSS3 — styling, responsif, dark theme
- Vanilla JavaScript — simulasi canvas & interaktivitas (tanpa framework, tanpa build step)

## Menjalankan

Cukup buka `index.html` di browser — tidak perlu install apa pun.

Atau lewat server lokal:

```bash
# Python
python -m http.server 8000

# lalu buka http://localhost:8000
```

## Struktur

```
neuralinks/
├── index.html   # halaman utama (6 section)
├── styles.css   # styling + responsive + dark theme
└── app.js       # simulasi canvas + interaktivitas
```

## Lisensi

MIT
