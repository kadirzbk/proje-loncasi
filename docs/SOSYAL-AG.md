# Lonca ağı: profil, ilan, başvuru, portfolyo

Proje Loncası tek takımlık bir panodan, GitHub'a benzeyen bir ağa dönüştü. Kişiler ve loncalar ayrı varlıklar; bir kişi birden çok loncada çalışabilir ve yaptığı iş profilinde birikir.

## Akış

1. Kayıt olan kişi önce **profil** oluşturur: görünen ad, kullanıcı adı (`/u/kadir`), ana sınıf, beceriler, kısa tanıtım.
2. **Keşfet** (`/kesfet`) sayfasında loncaların açtığı ilanları ("Kale görselleri için Mimar", "Kayıt sistemi için Demirci") ve loncaları görür. Sınıfa ve beceriye göre süzer.
3. İlana **başvurur**. Başvuruda kısa bir mesaj yazar; lonca yöneticisi mesajla birlikte kişinin portfolyosunu (biten kartlar, seviye, rozetler) görür.
4. Yönetici **Yönetim** (`/yonet`) sayfasında başvuruyu kabul ya da reddeder. Kabul edilen kişi ilanın sınıfıyla loncaya üye olur.
5. Üye, loncanın panosunda kart alır. Kart bittiğinde iki şey olur: loncanın kalesi büyür (eski oyun döngüsü) ve kart kişinin **portfolyosuna** katkı olarak yazılır.
6. Profil sayfası (`/u/kullanici-adi`) GitHub gibi bir katkı ısı haritası, portfolyo listesi, rozetler, üye olduğu loncalar ve sınıf dağılımını gösterir.

## Sayfalar

| Adres | Ne var |
|---|---|
| `/kesfet` | Açık ilanlar, lonca kartları, ağdaki son olaylar, arama ve sınıf süzgeci |
| `/l/[slug]` | Loncanın herkese açık sayfası: tanıtım, kale seviyesi, aranan sınıflar, üyeler, son zaferler, defter, Başvur düğmesi |
| `/u/[handle]` | Kişinin portfolyosu: ısı haritası, katkılar, rozetler, loncalar, sınıf dağılımı |
| `/profil` | Kendi profilini düzenleme ve başvurularım (inceleniyor / kabul / ret, geri çekme) |
| `/yonet` | Yöneticiler için: bekleyen başvurular, ilan açma/kapama, rütbeler, lonca ayarları, davet kodu |
| `/yeni-lonca` | Lonca kurma ya da davet koduyla doğrudan katılma |
| `/`, `/pano`, `/odak`, `/kale` | Üstteki seçiciyle seçilen loncanın karargahı, panosu, odak sayacı ve kalesi |

## Rütbeler

- **Kurucu (owner):** loncayı kuran. Rütbe verir, kimse onu çıkaramaz.
- **Yönetici (officer):** başvuruları değerlendirir, ilan açar, ayarları değiştirir, üye çıkarır.
- **Üye (member):** panoda çalışır, inceleme yapar.

## Oyunlaştırma açısından ne değişti

- **Sosyal oyuncu tipi** artık gerçekten besleniyor: lonca seçmek, başvurmak, kabul edilmek, ağda görünmek.
- **Başarıcı** için kalıcı bir vitrin var: portfolyo, seviye ve rozetler loncadan bağımsız olarak kişide kalır.
- **Kaşif** için Keşfet sayfası ve farklı loncalarda farklı sınıflarla oynama imkânı (Gezgin rozeti).
- Rozetler katkı verisinden hesaplanır: İlk Zafer, Usta Zanaatkâr (10 kart), Ağır Yük (8 puanlık kart), Plan Ustası (3 tasarım), Demirci Ocağı (5 kod), Konsey Üyesi (3 onay), Gezgin (2 lonca), Kurucu.
- Yönetim sayfası, panoda kartı olan ama üyesi olmayan sınıfları fark edip "bu sınıf için ilan aç" önerir. Böylece pano ile ilan sistemi birbirine bağlanır.

## Veritabanı (migration 006)

- `profiles`: kişi. Herkes okuyabilir, e-posta burada yok.
- `members`: artık (lonca, kişi) çifti; rütbe (`rank`) ve katılma zamanı eklendi. Bir kişi birden çok loncada olabilir.
- `guilds`: `slug`, `tagline`, `description`, `visibility` (public/private), `recruiting`, `owner_id` eklendi. Davet kodu `guild_secrets` tablosuna taşındı, sadece yöneticiler `guild_invite_code()` ile görür.
- `openings`: ilanlar. `applications`: başvurular (bir lonca için aynı anda tek bekleyen başvuru).
- `contributions`: kart Done olunca tetikleyiciyle yazılır, portfolyonun kaynağı. Kartın kazandırdığı XP `quests.reward_xp`'den gelir.
- `activity`: kalıcı lonca defteri. Üye katılması, kart bitmesi, ilan açılması ve kuşatma sonucu tetikleyicilerle yazılır.
- RPC'ler: `create_guild`, `join_guild`, `apply_to_guild`, `decide_application`, `set_member_rank`, `remove_member`, `guild_invite_code`, `guild_directory`.
- Güvenlik: kartlar, tasarımlar, onaylar sadece üyelere açık. Dışarıya sadece lonca tanıtımı, üye listesi, ilanlar ve biten kartların özeti açılır. Gizli loncanın hiçbir şeyi dışarıdan görünmez. Lonca ayarlarını ve rütbeleri tetikleyiciler korur.

## Demo modu

Supabase bağlı değilken uygulama tarayıcıda sahte bir ağla çalışır: oynanan lonca (Kızıl Sancak) ve üç örnek lonca (Piksel Atölyesi, Kuzey Stüdyo, Veri Kervanı), on kişi, altı ilan ve iki bekleyen başvuru. Kabul edilen başvuran gerçekten panoya üye olarak eklenir. Sınıf sunumunda internet sorun çıkarırsa bu mod kullanılabilir.

## Bilinen eksikler

- Profil ve lonca sayfaları giriş yapmadan görülemiyor (veritabanı izin veriyor, arayüz henüz girişe zorluyor). Portfolyo bağlantısını paylaşmak için bu açılmalı.
- Bildirim yok; başvuru sonucu Başvurularım sayfasında ve üstteki lonca seçicide görünür.
- Kişi loncadan kendi isteğiyle ayrılamıyor (veritabanında `remove_member` destekliyor, düğme yok).
- Kapalı ilanlar listelenmiyor, yeniden açılamıyor.
