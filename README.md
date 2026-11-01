# Telepon AI Gratis (Gemini Live)

Telepon suara realtime dengan AI memakai Gemini Live API (paket gratis Google). Suara dari model native audio, bukan suara robot, dan AI bisa disela di tengah kalimat. Tanpa server: ini situs statis, jadi gratis di Vercel Hobby.

## Cara pakai
1. Buat API key gratis di https://aistudio.google.com/apikey (login akun Google, tanpa kartu kredit).
2. Deploy ke Vercel: upload isi folder ini ke GitHub, di vercel.com pilih Add New > Project > Import, Framework Preset: Other, lalu Deploy. Tidak ada environment variable.
3. Buka alamat Vercel-nya di Chrome atau Edge, tempel API key di kolom Pengaturan (tersimpan hanya di browser-mu), lalu tekan tombol telepon.

## Catatan
- Paket gratis punya batas sesi dan token dari Google; bila kena batas, tunggu atau coba lagi nanti.
- Di paket gratis, Google dapat memakai data percakapan untuk meningkatkan produknya.
- API key dikirim langsung dari browser-mu ke Google. Jangan bagikan link yang sudah berisi key-mu, dan tiap orang memakai key-nya sendiri.
- Pakai headphone supaya suara AI tidak tertangkap mikrofon.
- Mengganti karakter, suara, gaya, atau bahasa saat telepon berjalan akan menyambung ulang panggilan.
