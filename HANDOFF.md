# Devir Notları

Bu dosya projeye sonradan katılan biri için. Önce README'deki "Çalıştırma" kısmını yap, sonra buradan devam et.

## Proje nedir

DOT407 Oyunlaştırma Uygulamaları ve DOT403 Web Programlama derslerinin ortak projesi. Ekip: Abdülkadir Özbek ve Fikri Vuranel. İki derse ayrı sunum yapılacak: Web Programlama için mimari ve kodlama tarafı, Oyunlaştırma için oyun kuralları ve motivasyon tasarımı.

Fikir: Kanban panosu, GitHub benzeri teslimat kontrolü ve MMORPG tarzı kale savunmasını birleştiren bir takım platformu. Görevleri tamamlamak kaleye kaynak kazandırır, ihmal sis ve çatlak olarak geri döner, haftalık kuşatmada kale sınanır.

## Karar günlüğü

| Karar | Neden |
| --- | --- |
| Next.js (App Router) + Supabase | Hoca tarafından serbest bırakıldı, tek depoda hem arayüz hem veri. |
| Oyun kuralları `src/lib/engine.ts` içinde saf fonksiyon | Test etmesi ve sunumda anlatması kolay, arayüzden bağımsız. |
| Durum değişimleri `src/lib/actions.ts` içinde saf fonksiyon | Aynı kod hem demo modunda hem Supabase modunda çalışır. |
| Supabase yoksa localStorage demo modu | Anahtar olmadan da uygulama açılır, sunumda internet sorunu olursa yedek. |
| Supabase modunda "farkı yaz" (`pushDiff`) | Eski ve yeni durum karşılaştırılır, yalnızca değişen satırlar yazılır. Gerçek zamanlı değil, 12 saniyede bir yenilenir. |
| Kendi kartını onaylayamama kuralı hem arayüzde hem veritabanı tetikleyicisinde | Arayüz atlatılsa bile veritabanı reddeder. |
| Görsel dil: koyu mürekkep, pirinç vurgu, Fraunces + Hanken Grotesk + Martian Mono, keskin köşe, ince çizgi | Standart "yuvarlak kartlı, mor gradyanlı" yapay zeka görünümünden uzak durmak için. Yeni ekranlar aynı dili sürdürmeli. |

## Oyun kuralları (kısa)

- 4 sınıf: Mimar (tasarım), Demirci (backend), Muhafız (frontend), Gözcü (PM/QA).
- Kart `Done` olmak için: kod kartında birleştirilmiş PR, tasarım kartında en az bir versiyon ve çözülmüş tüm pinler, her ikisinde de **sahibi dışında birinin onayı**.
- Ödül: `puan x 20` XP. Çarpanlar: bağlı tasarım onaylıysa +%25, Gözcü onayı +%15, odak süresi en fazla +%20, Muhafız için sprint sonuna 48 saatten az kala x1,3.
- Kale seviyesi toplanan kaynaklardan hesaplanır: 0, 60, 160, 320 eşikleri.
- Kuşatma: tehdit = sprintteki kartların puanı x 4, savunma = kale seviyesi, can, stabilite ve biten kartlar. Üç dalgada sonuç gösterilir.

Sayılar `engine.ts` içinde, dengelemek için orası değiştirilir.

## Dosya haritası

Ayrıntılı tablo README'de. Önemli olanlar:

- `src/lib/engine.ts`: kurallar. Önce burayı oku.
- `src/lib/actions.ts`: her kullanıcı eylemi (kart taşı, pin ekle, onayla).
- `src/lib/store.tsx`: durum, oturum, Supabase senkronu.
- `src/lib/remote.ts`: Supabase okuma ve yazma.
- `src/components/DesignStudio.tsx`: önce/sonra çubuğu, saydam çakıştırma, pin yorumu.
- `supabase/migrations`: sırayla uygulanan SQL dosyaları.

## Supabase

Proje: `proje-loncasi` (bölge eu-central-1). Adres ve herkese açık anahtar `.env.example` içinde. Bu anahtar tarayıcıda zaten görünür olacak biçimde tasarlanmıştır, veriyi satır güvenliği kuralları korur. `service_role` anahtarını **asla** depoya koyma.

Yeni bir Supabase projesi kurmak istersen: `supabase/migrations` içindeki 3 dosyayı sırayla SQL Editor'de çalıştır, `.env.local` dosyasına yeni adres ve anahtarı yaz.

Panelde yapılması gereken: Authentication > Providers > Email > **Confirm email** kapalı olmalı, yoksa kayıt olan herkes önce e-posta doğrulamak zorunda kalır.

## Bilinen eksikler ve sıradaki işler

1. **Canlı test yapılmadı.** Supabase bağlantısı yazıldı ve veritabanı kuralları SQL ile denendi ama tarayıcıdan gerçek kayıt, lonca kurma, görsel yükleme akışı henüz elle denenmedi. İlk iş bu olmalı.
2. Davet kodu ve lonca kurma akışı elle test edilmeli (iki farklı tarayıcıyla).
3. Gerçek GitHub webhook'u (`/api/webhooks/github`) yok. Şimdilik "PR aç" ve "PR'ı birleştir" düğmeleri simülasyon.
4. Sezon sonu portföy ve sertifika sayfası yok.
5. Odak oturumu sayfada tutuluyor, sekme kapanırsa kaybolur.
6. 3D model önizleme yapılmadı, bilerek MVP dışında bırakıldı.
7. Lonca defteri Supabase modunda sayfa yenilenince boşalır (kayıt tablosu yok).
8. Pano telefon genişliğinde denendi. Tasarım stüdyosu (pin koyma, çubuk sürükleme) telefonda ve dokunmatik ekranda denenmedi.
9. Henüz yayınlanmadı. Vercel'e bağlayıp iki ortam değişkenini (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) girmek yeterli.

## Sunumlara hazırlık

- **Oyunlaştırma dersi:** `engine.ts` kurallarını, dört oyuncu tipine (başarıcı, kaşif, sosyal, rakip) karşılık gelen mekanikleri ve "puan kasma" önlemini (onay şartı) anlat. İyi bir gösterim: onaysız kartı Zaferler'e sürükle, sistemin reddedişini göster.
- **Web Programlama dersi:** Next.js App Router yapısını, durum yönetimini, Supabase tablolarını ve satır güvenliği kurallarını, sürükle-bırak ve görsel yükleme akışını anlat.
- Sınıf testi için: Supabase modunda herkes kendi hesabıyla girip aynı davet koduyla loncaya katılır.

## Geliştirme ipuçları

- Next.js 16 kullanılıyor. `AGENTS.md` içindeki uyarı geçerli: bilinen API'ler değişmiş olabilir, emin olmadığında `node_modules/next/dist/docs/` içine bak.
- `npm run lint` ve `npx tsc --noEmit` temiz olmalı.
- Yapay zeka destekli geliştirme serbest. Bu depodaki kodun büyük kısmı Claude ile yazıldı.

## İnceleme notları (2026-11-01)

Düzeltilenler:
- Sahibi olmayan kart onaylanabiliyordu, bu yüzden tek kişi kendi kartını bitirebiliyordu. Artık sahibi olmayan karta onay verilemez ve Done olamaz (arayüz, `canComplete` ve veritabanı tetikleyicisi, migration 004). Karta sahip atama ve "Üstlen" düğmesi eklendi.
- Yeni tasarım versiyonu yüklenince önceki onaylar sıfırlanıyor. Daha önce eski onay yeni versiyona da geçerli sayılıyordu.
- Bir inceleyici "değişiklik iste" derse başka birinin onayı kartı bitirmeye yetmiyor.
- Odak sayfasındaki 15 saniyelik demo oturumu 25 dakika sayılıyordu, artık 1 dakika sayılıyor.

Hâlâ eksik, öncelik sırasıyla:
1. **Sprint kavramı yok.** `hoursToSprintEnd` sabit 72, bu yüzden Muhafız "hızlı teslimat" bonusu hiç tetiklenmiyor. Kuşatma bir düğme, otomatik değil. Sprint tablosu (başlangıç, bitiş) ve sprint bitince otomatik kuşatma gerekiyor.
2. **İhmalin cezası yok.** Stabilite sadece kaybedilen kuşatmada düşüyor, hiçbir şey yapmayınca azalmıyor. "İhmal sis olur" vaadi şu an doğru değil. Son etkinlik zamanına göre azalma eklenmeli.
3. **Klasik oyunlaştırma öğeleri yok:** rozet, seri (streak), liderlik tablosu. Oyunlaştırma dersi için en ucuz ve en görünür kazanım bunlar.
4. Odak süresi sayfada tutuluyor, sekme kapanınca kayboluyor ama bonus veriyor. Ya veritabanına yazılmalı ya da bonus düşürülmeli.
5. Lonca defteri Supabase'de kalıcı değil. Basit bir olay tablosu yeter.
6. ~~Gerçek zamanlı değil.~~ Supabase Realtime eklendi (migration 005, `store.tsx`): başka üyenin değişikliği ~0,5 sn içinde gelir, 12 sn yoklama yedek olarak duruyor. Bildirim hâlâ yok.
7. Kart düzenleme ve silme yok. Yanlış yüklenen versiyonu geri alma yok. Gözcü (QA) kartlarında teslimat alanı yok, sadece onay var.
8. Denge ayarı yapılmadı: kale eşikleri (0/60/160/320) ve XP formülü 2 kişilik ekiple denenmedi.

Sadeleştirilebilecekler: 4 sınıf ve üç ayrı kaynak (taş, ahşap, harç) 2 kişilik ekip için fazla ayrıntı. Sınıf bonusları sprint gelmeden anlamsız. Plan Bonusu'nu kullanıcı bulamazsa hiç kullanılmaz, kart oluştururken daha görünür olmalı ya da kaldırılmalı. Can ve stabilite iki ayrı çubuk, birleşebilir.

Not: tek kişilik loncada hiçbir kart bitirilemez (kural gereği). Test için ikinci bir hesapla (gizli pencere) aynı davet koduyla katıl.
