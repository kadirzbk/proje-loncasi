# Proje Loncası

Kod ve tasarım görevlerini bir kale savunması oyununa çeviren takım platformu.
DOT407 Oyunlaştırma Uygulamaları + DOT403 Web Programlama ortak projesi.

Devralan kişi için önce [HANDOFF.md](HANDOFF.md) dosyasına bak.

## Çalıştırma

```bash
npm install
npm run dev     # http://localhost:3000
```

## Şu anki durum

- Next.js (App Router) + TypeScript + Tailwind.
- **Demo modu:** `.env.local` yoksa oyun durumu tarayıcıda (localStorage) tutulur, örnek veriyle açılır.
- **Supabase modu:** `.env.example` içindeki iki değeri `.env.local` olarak kaydedersen e-posta ile giriş, lonca kurma/davet koduyla katılma, görevler, tasarım versiyonları (Storage) ve pinler Supabase'e yazılır. Pano 12 saniyede bir yenilenir.
- Şema ve güvenlik kuralları `supabase/migrations` içinde; `proje-loncasi` Supabase projesine uygulandı.
- Supabase panelinde Authentication > Providers > Email bölümünde **Confirm email** kapatılırsa kayıt olan hemen girebilir (sınıf testi için kolaylık).

## Dosya haritası

| Yol | Ne yapar |
| --- | --- |
| `src/lib/engine.ts` | Oyunlaştırma kuralları: ödül, Plan Bonusu, Done şartı, kale seviyesi, kuşatma |
| `src/lib/actions.ts` | Durumu değiştiren saf fonksiyonlar |
| `src/app/pano` | Kanban + onay şartlı Done |
| `src/components/DesignStudio.tsx` | Önce/sonra slider, saydam çakıştırma, pin yorumu |
| `src/app/odak` | Pomodoro ve sekme takibi |
| `src/app/kale` | Kale, kasa, haftalık kuşatma |

## Sıradaki işler

1. Supabase bağlantısının canlı testi (kod yazıldı, sunucu tarafı kuralları SQL ile doğrulandı).
2. Gerçek GitHub webhook'u (`/api/webhooks/github`).
3. Sezon sonu portföy ve sertifika sayfası.
