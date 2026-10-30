# Proje Loncası

Kod ve tasarım görevlerini bir kale savunması oyununa çeviren takım platformu.
DOT407 Oyunlaştırma Uygulamaları + DOT403 Web Programlama ortak projesi.

## Çalıştırma

```bash
npm install
npm run dev     # http://localhost:3000
```

## Şu anki durum

- Next.js (App Router) + TypeScript + Tailwind.
- Oyun durumu tarayıcıda (localStorage) tutulur, demo verisiyle açılır. Menüdeki "Demo verisini sıfırla" ile başa döner.
- `supabase/schema.sql` hazır, ama uygulama henüz Supabase'e bağlı değil.

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

1. Supabase bağlantısı (Auth, tablolar, Storage) ve çok kullanıcılı canlı pano.
2. Gerçek GitHub webhook'u (`/api/webhooks/github`).
3. Sezon sonu portföy ve sertifika sayfası.
