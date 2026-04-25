# Turkish Launch — Distribution Drafts

Coach Turkish mode + `/turkce-sql-ogren/` landing page shipped. This file is the distribution playbook: copy-paste ready posts, threads, and outreach emails. Voice matches Can's natural register: kısa, samimi, builder-to-builder, occasional swagger.

**Posting schedule (suggested):**
- **Tuesday morning Istanbul time (10-11 AM):** LinkedIn post (long form, builds the story)
- **Tuesday afternoon (1-2 PM IST = 6-7 AM ET):** X thread (catches both TR and US morning audience)
- **Tuesday evening:** Reddit r/CodingTR + r/Turkey (after engagement signal from X/LinkedIn)
- **Wednesday:** Bootcamp program manager emails (one at a time, personalized)

Don't blast all at once. Pacing builds momentum, lets each channel show traction.

---

## 1. LinkedIn Post (Turkish, primary distribution)

**Format:** Long-form storytelling, 1500-1800 chars. Drops the link at the end. Use line breaks generously (LinkedIn rewards readability).

```
SQL Quest artık Türkçe.

3 ay önce Preply'de bir öğrencim Murat ile SQL çalışıyorduk. "Hocam," dedi, "site bana sadece 'incorrect, try again' yazıyor. Hangi satırın yanlış olduğunu bilmiyorum."

O an SQL Quest'in eksik olan parçasını gördüm.

Geçen hafta Coach Turkish mode'u shipledim:

— Türkçe yazınca AI Coach Türkçe cevap veriyor
— Hangi satır yanlış, hangi sütun eşleşmiyor — tam olarak söylüyor
— Sıralama mı bozuk, NULL mı handle etmedin, açıkça gösteriyor
— Kayıt yok, kart yok, ücretsiz başlıyor

Toggle yok. Türkçe yazıyorsun, Türkçe cevap alıyorsun. Claude tarafından destekleniyor.

Türkiye'den 1000+ kişi her gün siteyi kullanıyor (trafiğin %38'i). Çoğu bootcamp mezunu, kariyer değiştiren, ya da veri analisti olmak isteyen. Hepsi Google Translate'i parallel tab'de açıp İngilizce SQL hatalarını çözmeye çalışıyordu.

Artık çözmesi gerekmiyor.

Aynı zamanda /turkce-sql-ogren/ sayfasını shipledim — Türkçe arayan herkesin landing page'i. SEO + content + AI tutor, hepsi tek pakette.

Kimdir bunu kullanır:
🎓 Bootcamp mezunuyum, mülakatta SQL'de takılıyorum (Kodluyoruz, Patika.dev, Global AI Hub — sizin için)
💼 Veri analisti olmak istiyorum, Excel'in ötesine geçeceğim
🎯 FAANG'a başvuracağım, gerçek interview soruları lazım
🔄 Kariyer değiştiriyorum, sıfırdan başlayacağım

Tek sayfa: sqlquest.app/turkce-sql-ogren/

İlk sorgun 30 saniyede. Coach Türkçe konuşuyor. Kayıt yok.

#SQL #VeriAnalisti #TürkçeKodlama #AI #Claude #Bootcamp #FAANG
```

**Tag suggestions (post yayınladıktan sonra comment'e ekle):**
- @AnthropicAI (Claude collab credit)
- @Akın Kaldıroğlu (Turkish data community influencer — istersen mention et, "umarım faydalı olur" tarzında)
- Specific bootcamp founders if you have personal connection

**Don't tag in main post body:** keeps it organic-feeling. Tags in comment increase visibility without spam vibe.

---

## 2. X/Twitter Thread (English, broader reach)

**Why English:** X audience for SQL/data is global. Turkish thread can be a follow-up if first one gains traction.

**Thread (7 tweets, post 1-2 PM Istanbul = 6-7 AM ET sweet spot):**

```
1/

just shipped: SQL Quest now speaks Turkish.

38% of our traffic is from Türkiye. they were all grinding english error messages through google translate.

no more.

#SQL #BuildInPublic
```

```
2/

how it works:

write your SQL question in turkish → AI Coach responds in turkish.

no toggle. no language picker. it just detects.

@AnthropicAI's Claude speaks turkish natively, so we just stopped pretending it didn't.

3 lines of detection logic + a system prompt prefix. shipped same afternoon.
```

```
3/

the bigger story: this isn't a translation feature. it's a market wedge.

turkish bootcamp grads have been forced to use english SQL platforms for years. nobody built for them because the localization tax felt too high.

with claude as pair programmer, that tax is now ~4 hours.
```

```
4/

we also built /turkce-sql-ogren/ — a turkish-first landing page.

SEO targets: "SQL öğren", "Türkçe SQL", "veri analisti SQL", "bootcamp sonrası SQL".

hreflang tags so google knows which version to serve. ranking compounds while we sleep.
```

```
5/

tools that made this possible:

— Claude (the AI Coach itself)
— Claude Code (paired programming partner that built it)
— Vercel Web Analytics (showed us 38% TR with no marketing)
— vanilla JS regex (no fancy NLP, just turkish chars + words)

shipped in one Saturday morning.
```

```
6/

@garrytan you keep saying solo + AI = teams.

today: turkey-localized AI tutor + new SEO landing page + announcement deck. all in one morning.

i'm one person. claude is the team.
```

```
7/

if you're a turkish bootcamp grad reading this — sqlquest.app/turkce-sql-ogren/

if you're a founder thinking about localization — claude makes it 10x cheaper than you think.

if you're @AnthropicAI — thank you, your model just unlocked a new market for us.
```

**Optional bonus tweet for Turkish-specific reach:**

```
türkçe konuşan SQL öğrenicileri için 🇹🇷

sqlquest.app artık türkçe cevap veriyor. coach hata neden olduğunu açıklıyor, FAANG mülakat soruları, ücretsiz başla.

bootcamp sonrası ne yaparım sorusunun cevabı: sqlquest.app/turkce-sql-ogren/
```

Post bunu Turkish thread'i olarak veya bonus reply tweet olarak. Türk Twitter'ı için signal.

---

## 3. Reddit Posts

**Be careful with Reddit — they hate marketing. Post as a builder sharing a story, not as marketing.**

### r/CodingTR (most relevant Turkish dev community)

**Title:** SQL Quest'i Türkçe yaptım — bootcamp mezunlarına yönelik

**Body:**
```
Selam,

3 ay önce Preply'de SQL ders veriyordum. Öğrencilerimden biri (Türkiye'den) bana dedi ki: "Hocam, pratik yaptığım sitede sorgum yanlışsa sadece 'incorrect, try again' yazıyor. Hangi satırın hatalı olduğunu bilmiyorum."

Bu noktada SQL Quest'i (zaten kendi yan projem) Türkçe yapma fikri oluştu.

Bu hafta sonu shipledim:

- AI Coach (Anthropic Claude tabanlı) Türkçe yazılan soruları Türkçe cevaplıyor
- Toggle yok, otomatik tespit
- Hata varsa hangi satır yanlış olduğunu açıklıyor — sadece "incorrect" değil
- 125+ challenge, 13 şirket etiketli mülakat soruları
- Ücretsiz başlıyor, kayıt yok

Site: https://sqlquest.app/turkce-sql-ogren/

Bootcamp mezunuysanız (Kodluyoruz, Patika.dev, Global AI Hub mezunlarımız çok), kariyer değiştiriyorsanız, ya da veri analisti olmak istiyorsanız — açıkçası sizin için yapılmış bir şey.

Feedback'e açığım. Hata bulursanız DM atın, aynı gün shipliyorum (gerçekten — geçen ay 75 dakikada bir LinkedIn DM'i feature'a çevirdim).

(Mod ekibine: bu kendi projem, satış değil. Reklam değil — gerçekten bu topluluğun bir kısmının kullanabileceği bir şey shipledim.)
```

### r/Turkey (broader audience, lower SQL relevance)

**Decide based on engagement on r/CodingTR first.** r/Turkey is mostly news/politics. Skip unless you have a specific career-changer angle.

### r/learnSQL (English, global)

**Title:** I localized my SQL practice site to Turkish in one afternoon — here's what I learned

**Body:**
```
Hi everyone,

Long-time SQL teacher (Preply) and builder of sqlquest.app. About 38% of my traffic is from Türkiye, but until this weekend the entire experience was English.

I just shipped Turkish localization for the AI Coach part. The detection is naive (regex for Turkish characters and common words), the system prompt is one extra paragraph, and Claude (Anthropic) does the actual heavy lifting — it natively speaks Turkish.

Total implementation: ~4 hours including tests.

Why this matters for the SQL learning community:
- Most non-English SQL learners use English platforms with Google Translate in a parallel tab. That's awful UX for active learning.
- AI tutors that speak the user's native language remove that tab-switching friction
- For platforms with significant non-English traffic, localization is now affordable in a way it wasn't 2 years ago

Live: sqlquest.app/turkce-sql-ogren/ (Turkish landing) and sqlquest.app/ (English homepage with hreflang to Turkish version)

Open to questions about the implementation. Happy to share the regex if anyone wants to build something similar.
```

---

## 4. Bootcamp Program Manager Emails

**Strategy:** Personalized, not template. Mention something specific about THEIR bootcamp. Offer free Pro for their grads as a partnership angle.

### Email 1: Kodluyoruz

**To:** Program manager email (find on kodluyoruz.org/iletisim, or LinkedIn)
**Subject:** SQL Quest Türkçe — Kodluyoruz mezunlarına ücretsiz Pro?

```
Selam [İsim],

Adım Can. SQL Quest'in (sqlquest.app) kurucusuyum, ayrıca Preply'de SQL ders veriyorum.

Sizin programınızı uzun zamandır izliyorum — bootcamp ekosistemine yaptığınız katkı çok değerli, özellikle Mehmet [Atıcı] ve ekibinin Türkiye'de "kod öğrenebilir miyim?" sorusunu "evet, yaparsın" haline getirmesi.

Bu hafta sonu SQL Quest'i Türkçe yaptım. AI Coach (Claude tabanlı) artık Türkçe cevaplıyor — soru Türkçe, açıklama Türkçe, sadece SQL keywords (SELECT, JOIN) İngilizce kalıyor (gerçek hayatta da öyle).

Önerim:
Kodluyoruz mezunlarına SQL Quest Pro'yu 6 ay ücretsiz veriyorum. Mezunlarınıza özel bir kupon kodu hazırlarım, programınızdaki SQL modülü sonrasında dağıtırsınız.

Niye işinize yarar:
1. Bootcamp sonrası "ne yapacağım" problemi — gerçek mülakat soruları + Türkçe Coach ile
2. FAANG + Türk şirketler (Trendyol, Getir tarzı) SQL pattern'ları, mock interview modu
3. Sizin için maliyet yok, sadece Pro kupon

Demo için 15 dakika ayırabilir misiniz? Coach'u canlı göstereyim.

Saygılar,
Can
sqlquest.app
[LinkedIn URL]
```

### Email 2: Patika.dev

**To:** Patika program lead (Patika.dev/iletisim or LinkedIn'den DM)
**Subject:** Patika SQL track + SQL Quest Türkçe — ortak bir şey yapalım mı?

```
Selam [İsim],

Patika'nın SQL/Veri Bilimi track'ini takip ediyorum. Adım Can, SQL Quest (sqlquest.app) kurucusuyum.

Geçen hafta SQL Quest'i Türkçeleştirdim — AI Coach Türkçe yazılan soruları Türkçe cevaplıyor. Patika mezunlarınızdan bazıları zaten kullanıyor (analytics'ten görüyoruz), ama resmi bir entegrasyon önereyim:

→ Patika SQL track'ini bitiren her mezuna SQL Quest Pro'da 6 ay ücretsiz erişim
→ Patika branded onboarding flow (gelir gelmez "Patika mezunlarına özel" mesajı)
→ Mezunlarınızın FAANG + Türk şirketleri mülakat hazırlığı için tek bir kaynak

Sizin için maliyet yok, mezunlara katma değer.

15 dakika demo + sohbet için müsait misiniz?

Saygılar,
Can
sqlquest.app
```

### Email 3: TechCareer.net (or Global AI Hub if they're more relevant)

**To:** TechCareer program manager
**Subject:** SQL pratik platformu — Türkçe Coach + FAANG hazırlığı

```
Merhaba,

Adım Can, SQL Quest'in (sqlquest.app) kurucusuyum.

Sizin Veri Bilimi / Veri Analisti programlarınızı takip ediyorum. Mezunlarınız "bootcamp bitti, sonra ne?" probleminde gerçek mülakat soruları + adaptive feedback ile pratik yapma kaynağı arıyor.

Bu hafta sonu SQL Quest'i Türkçe yaptım:
- AI Coach Türkçe cevaplıyor (Anthropic Claude tabanlı)
- 13 şirket etiketli mülakat soruları (Meta, Google, Amazon, Apple, Netflix + Stripe, Uber, Airbnb, vs)
- Mock interview modu — gerçek FAANG pattern'ları, süreli, scoring ile
- Skill radar: 9 SQL skill ölçüyor, hangi konuda zayıfsın söylüyor

Önerim: TechCareer mezunlarınıza SQL Quest Pro'yu 6 ay ücretsiz vermek. Sizin için maliyet yok, mezunlara doğrudan iş hazırlığı katma değeri.

Sayfa: sqlquest.app/turkce-sql-ogren/

20 dakika demo için müsait misiniz? Coach Türkçe nasıl çalışıyor canlı göstereyim.

Saygılar,
Can
[email]
[LinkedIn]
```

---

## 5. Tracking + Measurement

After posts go live, watch:

**Vercel Web Analytics (sqlquest.app):**
- Türkiye traffic % (currently 38% — does it spike?)
- `/turkce-sql-ogren/` page views (new page, baseline = 0)
- Conversion to `/app.html` from Turkish landing
- Mobile vs desktop split for Turkish users

**Google Search Console (submit sitemap after deploy):**
- "SQL öğren" rankings (current: probably page 5+, target page 1-2 in 30-60 days)
- "Türkçe SQL" rankings
- Click-through rate on Turkish queries
- Total impressions/clicks for `/turkce-sql-ogren/`

**Manual Coach quality check:**
- Send 10 Turkish messages to Coach over the week
- Score each response: did it sound natural? did it keep SQL keywords English? did it use 'sen' form?
- If quality issues, tune the system prompt prefix

**Decision gate (2 weeks):**
- If Turkish-Pro conversion ≥ 2x English baseline → ship Approach B (full Turkish UI + 30 challenges translated + bootcamp partnerships)
- If Turkish conversion ≈ English → hold the wedge, focus US acquisition
- If Turkish < English → kill localization, document learning

---

## 6. Crisis-mode adjustments

If Coach Turkish mode produces bad output (broken Turkish, wrong terms, formal/corporate tone instead of friendly), iterate:

1. Edit `src/utils/language.js` → tweak `TURKISH_SYSTEM_PROMPT_PREFIX`
2. Add specific bad-example anti-patterns: "Don't say X, say Y"
3. Test with 5 prompts, ship if better

If a Turkish user reports a bug on Twitter/LinkedIn:
- Reply same day in Turkish
- Acknowledge the issue
- Ship a fix within 48h if possible
- Tell them when it's live, tag them in the announcement

This is the same playbook that produced the wrong-answer diagnostic and collapsible skills features. Real users → fast ships → social proof → more users.

---

## Done. Now distribute.

The page is live. The Coach speaks Turkish. The drafts are written. All that's missing is hitting "post" on Tuesday morning.

🇹🇷 Hadi başla.
