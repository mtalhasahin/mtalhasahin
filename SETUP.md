# Kurulum

## 1. Repoyu oluştur

Profil README'i, kullanıcı adınla aynı isimdeki repodan gelir:

```bash
gh repo create mtalhasahin/mtalhasahin --public --description "Profile README"
```

Sonra bu klasörün içeriğini o repoya koyup push et:

```bash
git init && git add . && git commit -m "feat: neofetch profile card"
git branch -M main
git remote add origin https://github.com/mtalhasahin/mtalhasahin.git
git push -u origin main
```

## 2. Token ekle

Commit sayısı ve satır sayısı (LOC) için GraphQL API'ye yetkili bir token lazım;
Actions'ın kendi `GITHUB_TOKEN`'ı private katkıları göremiyor.

1. https://github.com/settings/tokens → **Generate new token (classic)**
2. Scope: **`repo`** (private repolarındaki katkıları da saymak için). Sadece
   public verilerle yetinecekseniz `public_repo` da yeter.
3. Repoda **Settings → Secrets and variables → Actions → New repository secret**
4. İsim: `ACCESS_TOKEN`, değer: aldığın token

## 3. Çalıştır

**Actions** sekmesinden `Update profile card` → **Run workflow**. Sonrasında her
gün 03:17 UTC'de kendi kendine dönüyor ve değişiklik varsa commit atıyor.

---

# Kartı özelleştirme

## Metinler

Hepsi [`config.js`](./config.js) içinde. `TODO` yazan satırlar tahmin — düzelt ya
da tamamen sil, kart kendini ona göre yeniden boyutlandırır.

## Portre

İki dosya var, ikisi de düz metin — elle de düzenleyebilirsin:

- `assets/art.txt` — koyu tema. Fotoğrafın **aydınlık** yerleri karakter oluyor.
- `assets/art-light.txt` — açık tema. Tersi: **gölgeler** karakter oluyor, yoksa
  beyaz zeminde portre negatif görünürdü.

Yeni bir fotoğraftan ikisini birden üretmek için:

```bash
npm install
node scripts/art.js foto.jpg
```

Ayarlar `config.js` içindeki `portrait` bloğunda:

| Parametre  | Ne yapar |
|------------|----------|
| `cols`     | Genişlik (karakter). 38–46 arası iyi sonuç verir. |
| `crop`     | Fotoğraftan kırpılacak alan: `x0,y0,x1,y1`, 0–1 arası oran. Yüze yakın kırp. |
| `floor`    | Bu eşiğin altında kalan tonlar boşluğa dönüşür. Arka plan gürültüsünü siler. |
| `vignette` | Kenarları söndürerek arka planı bastırır. `0` = kapalı, `0.7–1.0` = tipik. |
| `gamma`    | `<1` orta tonları açar, `>1` kontrastı sertleştirir. |
| `invert`   | Gölgeleri karaktere çevirir. Açık temada `true` olmalı. |

Kırptığın alanın oranı kartın yüksekliğini belirler: satır sayısı yaklaşık
`cols × (kırpma yüksekliği / genişliği) × 0.46`. Sağdaki metin ~26 satır, o yüzden
26–30 satırlık bir portre en dengeli duruyor.

Doğru `crop` değerini bulmak deneme yanılma: bir değer ver, `node scripts/art.js
foto.jpg` çalıştır, `assets/art.txt`'ye bak, daralt/genişlet.

**İpucu:** yüzü net, arka planı sade ve ışığı önden gelen bir fotoğraf en iyi
sonucu verir. Kaynak fotoğraf repoya konmuyor — sadece üretilen `.txt` dosyaları.

## Renkler

[`scripts/card.js`](./scripts/card.js) en üstteki `THEMES` objesinde. `art` üç
renkli bir degrade (üstten alta). Aynı dosyada `FS`, `LH`, `PAD` ile tipografi ve
boşluklar da ayarlanabilir.

## Yerelde önizleme

```bash
node scripts/build.js --public
```

Token olmadan çalışır; commit ve LOC sayıları `0` görünür, gerisi gerçek veridir.
Üretilen SVG'leri bir tarayıcıda açıp kontrol edebilirsin.
