/* First-party landing analytics.
 *
 * WHY THIS EXISTS
 * ---------------
 * The landing pages called trackLanding(), which sends only to window.va —
 * Vercel's custom-events API. Vercel's own pricing table lists Custom Events
 * as unavailable on Hobby, and this team is on Hobby (verified 2026-07-28 for
 * both the personal account and team_boYL1sce...). So every landing_view,
 * cta_hero_primary, cta_coach_section, faq_open and scroll_depth ever fired
 * has been silently discarded. pro_events confirms it: zero rows for all
 * five, ever. CLAUDE.md documented them as live analytics.
 *
 * That left the marketing funnel with a product side and no denominator. We
 * know 167 people arrived at the app from the homepage in 30 days
 * (arrivalSrc, which does work); we have never known how many saw it.
 *
 * WHY NOT JUST UPGRADE TO PRO
 * ---------------------------
 * $20/mo would buy custom events back, but it would not close the loop:
 * app.html is the only one of 47 pages without the Vercel analytics script,
 * and Hobby/Pro alike offer no join between a pageview and a later solve.
 * Writing to our own table does close it — every row here carries the same
 * `aid` the app stamps (src/utils/anon-id.js), so a landing_view and a
 * challenge_solved 20 minutes later are the same browser.
 *
 * It also removes two Hobby constraints that would have bitten later: the
 * 1-month reporting window (older data is gone, not recoverable) and the
 * 50,000 events/month cap shared across all ten projects on this team.
 *
 * SCOPE
 * -----
 * Injected by scripts/build-static-pages.js into every page carrying the
 * Vercel insights script, so coverage does not depend on remembering to add
 * it to the next landing page. Fires landing_view on load and relays clicks
 * on [data-track] elements. Deliberately does NOT touch the existing
 * trackLanding() — that keeps feeding window.va, which costs nothing and
 * starts working if the team ever moves to Pro.
 *
 * Known remainder: faq_open and scroll_depth are called directly through
 * trackLanding rather than via [data-track], so they stay Vercel-only (i.e.
 * still discarded) until those call sites are moved.
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://abmgtjafghpupaqsjnwe.supabase.co/rest/v1/pro_events';
  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibWd0amFmZ2hwdXBhcXNqbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzIzMjMsImV4cCI6MjA4NDUwODMyM30.8KS-UKN1r8YANggQ9HqsQmSHY95ghRL1Oq_d5LO19y4';

  // Same key and format as src/utils/anon-id.js. These two MUST agree — the
  // whole point is that a landing page and the app produce one id for one
  // browser. If you change the format there, change it here.
  var AID_KEY = 'sqlquest_aid';

  function aid() {
    try {
      var existing = localStorage.getItem(AID_KEY);
      if (existing && /^[0-9a-f]{32}$/.test(existing)) return existing;
    } catch (_) {}
    var out = '';
    try {
      if (window.crypto && crypto.randomUUID) {
        out = crypto.randomUUID().replace(/-/g, '');
      } else if (window.crypto && crypto.getRandomValues) {
        var b = new Uint8Array(16);
        crypto.getRandomValues(b);
        for (var i = 0; i < b.length; i++) out += ('0' + b[i].toString(16)).slice(-2);
      }
    } catch (_) {}
    if (!/^[0-9a-f]{32}$/.test(out)) {
      out = '';
      for (var j = 0; j < 32; j++) out += Math.floor(Math.random() * 16).toString(16);
    }
    try { localStorage.setItem(AID_KEY, out); } catch (_) {}
    return out;
  }

  // Cheap bot filter. Vercel drops known crawlers server-side; we do not get
  // that for free, and an inflated denominator is worse than no denominator
  // because it makes conversion look broken. Not exhaustive — treat these
  // counts as "browsers that ran JS", which is the honest description.
  function isBot() {
    try {
      if (navigator.webdriver) return true;
      // Google-InspectionTool (the GSC "Test live URL" fetcher) carries no
      // 'bot' substring, so it sailed through and landed 47 aids in the
      // 2026-08-03 landing read — one unique aid per view, all tz
      // America/Los_Angeles, ~28% of every landing number. Same for
      // Chrome-Lighthouse and the AdsBot variants.
      // 2026-09-16: the list grew by the fetchers that carry no 'bot' either —
      // link unfurlers, AI assistants fetching for a user, and plain HTTP
      // libraries. None of them caused the 09-13 burst (see landing_engaged
      // below); they are here so the next one does not start from zero.
      return /bot|crawl|spider|slurp|bingpreview|headless|lighthouse|pagespeed|gtmetrix|ahrefs|semrush|inspectiontool|google-read|adsbot|apis-google|mediapartners|facebookexternalhit|embedly|chatgpt-user|perplexity-user|claude-user|python|curl\/|wget|go-http|axios|node-fetch|java\//i
        .test(navigator.userAgent || '');
    } catch (_) { return false; }
  }

  // A fetcher the upstream crawler list names but isBot() does not
  // (2026-11-24). GoogleOther and Google-NotebookLM carry no 'bot' and were
  // 155 of 972 new landing people in the week to 11-24; none of 1,129 ever
  // opened the app. Measurement only: landing_view carries `cuaBot`, the row
  // is still written. scripts/vendor-crawler-ua.mjs writes the list below and
  // src/data/crawler-user-agents.js; tests/crawler-user-agents.test.js pins
  // them equal.
  // crawler-user-agents:start (generated by scripts/vendor-crawler-ua.mjs — do not hand-edit)
  // crawler-user-agents 1.66.0, sha256 25ea6326102d7abd…, 811 of 1505 patterns.
  var CUA_PATTERNS = ["AdsBot-Google([^-]|$)","Feedfetcher-Google","Mediapartners \\(Googlebot\\)","GoogleOther","[wW]get","aiohttp","httpx","libwww-perl","httpunit","Nutch","BIGLOTRON","Teoma","convera","Gigablast","ia_archiver","webmon ","HTTrack","grub\\.org","netresearchserver","speedy","fluffy","findlink","panscient","ips-agent","yanga","CyberPatrol","postrank","Turnitin","page2rss","linkdex","ezooms","heritrix","findthatfile","europarchive\\.org","(sistrix|SISTRIX) [cC]rawler","Ahrefs(Bot|SiteAudit)","mappydata","eright","Apercite","Aboundex","summify","ec2linkfinder","Yeti","RetrevoPageAnalyzer","Sogou","wotbox","ichiro","drupact","coccoc","integromedb","siteexplorer\\.info","proximic","changedetection","WeSEE:Search","CC Metadata Scaper","g00g1e\\.net","binlar","A6-Indexer","ADmantX","MegaIndex","ltx71","BUbiNG","Qwantify","S[eE][mM]rushBot","lipperhey","Y!J","AddThis","MetaURI","Scrapy","Livelap[bB]ot","CapsuleChecker","collection@infegy\\.com","DeuSu\\/","Sonic","Sysomos","Trove","deadlinkchecker","Slack-ImgProxy","iskanie","SkypeUriPreview","Google-Adwords-Instant","WhatsApp","electricmonk","Yahoo Link Preview","Daum\\/","Xenu Link Sleuth","Pcore-HTTP","[pP]ingdom","AppInsights","PhantomJS","Jetslide","newsharecounts","Bark[rR]owler","TinEye","LinkArchiver","YaK\\/","Digg Deeper","Snacktory","NING\\/","okhttp","Nuzzel","omgili","PocketParser","um-LN","MuckRack","AHC\\/","NetcraftSurveyAgent","^Apache-HttpClient","AppEngine-Google","Jetty","Upflow","Thinklab","Traackr\\.com","Twurly","Mastodon","http_get","BrandVerity","check_http","EZID","^LCC ","Buck\\/","Genieo","MeltwaterNews","Moreover","newspaper\\/","ScoutJet","(^| )sentry\\/","seoscanners","Hatena","Google Web Preview","adscanner","Netvibes","Baidu-YunGuanCe","BTWebClient","Disqus","Feedly","Fetch\\/","Fever","Flamingo_SearchEngine","FlipboardProxy","G2 Web Services","vkShare","Siteimprove\\.com","DareBoost","Miniflux\\/","Feedspot","SEOkicks","tracemyfile","zgrab","PR-CY\\.RU","Datafeedwatch","Zabbix","google-xrawler","Amazon CloudFront","Pulsepoint ","CloudFlare-AlwaysOnline","Cloudflare-Healthchecks","Cloudflare-Traffic-Manager","CloudFlare-Prefetch","Cloudflare-SSLDetector","https:\\/\\/developers\\.cloudflare\\.com\\/security-center\\/","Google-Structured-Data-Testing-Tool","WordupInfoSearch","WebDataStats","HttpUrlConnection","outbrain","W3C_Validator","Validator\\.nu","W3C-checklink","W3C-mobileOK","W3C_I18n-Checker","FeedValidator","W3C_CSS_Validator","W3C_Unicorn","Google-PhysicalWeb","Blackboard","BazQux","Twingly","Rivva","Dataprovider\\.com","GroupHigh\\/","theoldreader\\.com","AnyEvent","Nmap Scripting Engine","2ip\\.ru","Clickagy","Google Favicon","HubSpot","CheckMarkNetwork\\/","www\\.uptime\\.com","MixnodeCache\\/","^curl","SimpleScraper","fedoraplanet","Friendica","NextCloud","Tiny Tiny RSS","Datanyze","Google-Site-Verification","TrendsmapResolver","tweetedtimes","Gwene","SimplePie","SearchAtlas","Superfeedr","AmazonProductDiscovery","AmazonSellerInitiatedListing","FreeWebMonitoring SiteChecker","Domains Project\\/","Pandalytics","[Cc]urebot","PagePeeker\\/","Vigil\\/","seewithkids","BlogTraffic\\/\\d\\.\\d+ Feed-Fetcher","Cincraw","FreshRSS","^PHP-Curl-Class","Google-Certificates-Bridge","Viber","evc-batch","virustotal","(^| )PTST\\/","seostar\\.co","Uptime-Kuma","Seekport","Feedbin","Snap URL Preview Service","RuxitSynthetic","Valve\\/Steam","woorankreview\\/","Google-Safety","search\\.marginalia\\.nu","hyscore\\.io","SEOlizer","Synapse","deepnoc","hypestat","sempi\\.tech","Iframely","MetaInspector","l9explore","OpenGraphCheck","developers\\.google\\.com\\/\\+\\/web\\/snippet","MaCoCu","NewsBlur","inoreader","NetSystemsResearch","PageThing","WordPress\\/","Expanse","InternetMeasurement","^BW\\/","[cC]laude[bB]ot","vercel-screenshot","facebookcatalog\\/","meta-externalads\\/","meta-externalagent\\/","meta-externalfetcher\\/","Lemmy","CookieHubScan","Hydrozen\\.io","HTTP Banner Detection","MicrosoftPreview\\/","GeedoProductSearch","sindresorhus\\/got","CensysInspect\\/","sitebulb","DatadogSynthetics","Google-Ads-Conversions","ObservePoint","Checkly","ALittle Client","Claude-Web","anthropic-ai","Google-Extended","cohere-ai","CMSChecker","Wayback","Playwright","Puppeteer","Selenium","Nikto","sqlmap","ZmEu","masscan","WPScan","[aA]cunetix","Nessus","[dD]ir[Bb]uster","StatusCake","colly","[mM]echanize","air\\.ai\\/scanning","asnriskscorer","l9scan","CustomAsyncHttpClient","^HTTPie\\/","Gemini-Deep-Research","PerplexityUser","meta-webindexer","MistralAI-User","webzio","newsai\\/","A360-Search","AccessStatus","Acquia optimize","ActiveComply","AlertSite","AllAfrica","Amazon-Bedrock-AgentCore-Browser","AmazonBuyForMe","Amzn-User","Anchor Browser","Anomura","AP3A\\.240617\\.008","Archive-It","artemis web reader","Attracta","Authory","Automaton|Newsify Feed Fetcher","BestChange","bigsur\\.ai","BlingERP","Blockaid","Bloglines","BlogVault","bluesky-domain-status-classifier","Bluesky\\/","Bugsnag","Buttondown","CertChief","channable","Chirp|gotosocial","ClickUpLinkUnfurler","Cloudflare-AutoRAG","Cloudflare-Custom-Hostname-Verification","Cloudflare-Stream-Webhook","CloudflareRadarURLScanner","Cloudtrellis","[cC]ludo","Code\\/1\\.","Collapsify","ContextualBot[\\s\\S]*outcomes\\.net","Convermax","cookie-maestro","CookieHubVerify","Crazy Egg","Current[\\s\\S]*RSS Reader","cypex\\.ai\\/scanning","DigiCert DCV","dlvr\\.it","Dotcom-Monitor","DrataAutopilot","DreamHost Data Team","ds9","elmah\\.io Uptime Monitoring","EzLynx","FastDAST","Feeder \\/","FeedFlow","FindFiles\\.net","Goodreads","Google Trust Services","Google-Agent","Google-Gemini-CLI","Google-NotebookLM","GoogleAgent-Mariner","Hardenize","Innologica","kagi-fetcher","Known Agent","laion-huggingface-processor","lyonl-asset-proxy","MagpieRSS","mail\\.ru","MailChimp","Manus-User","MetaIAB Facebook","MontasticMonitor","NanoInteractive","Netcraft SSL Server Survey","Netcraft Web Server Survey","Netumo|netumo","NewRelicSynthetics","NewsRoom\\.BI","Nitro-","Noibu","OneTrust","opencode-smartfetch",";Owler","PodchaserParser","Podimo","Poggio-Citations","Qualys","RSiteAuditor","RSS\\.Social","Salesforce\\.com","Scope3","scraping@nytimes\\.com","Scrubby","seo4ajax\\.com","SequelWP","ServerDensity","ShortPixel","Silktide","SiteLock","Software-Security-Research","SottopopNone","Spider[\\s\\S]*spider\\.com","Splunk","ThousandEyes","Trae\\/","TwinAgent","um-FC","um-IC","UptimeStatistics","visionheight\\.com\\/scan","Watchful","weborama-fetcher","WepchSearchEngine","WPMU DEV Hub","WTotem","ZoomInfo-","7Siters","Bling ERP","Dark Visitor","Determ","DNSScanner","eMoney Advisor","FediDB","FediIndex","FediList Agent","Fedineko","Fluid","kaikki\\.org-digital-archive","Library Of Congress Web Archiving","MatchorySearch","ModatScanner","New York Times Newsgathering","NLUX_IAHarvester","seoLyt","Termly","TLS tester","trafilatura","WebZIP","WikiDo","ZyBorg","TerraCotta","caveman-hunter","Corporama matcher","CyotekWebCopy","Datadog Agent","Download Ninja","EmailWolf","NicheIndex","HeadOnlyScraper","Impact\\.com Agent","Keydrop\\.io","larbin","SENTINEL-LinkCheck","linko","lwp-trivial","loopimprovements\\.com","OWLer-W","Pixalate\\.com","Poduptime","semantic-visions","Sindup","SiteSucker","SQWatcher","sv-watchagent","TSM-turingos","UGAResearchAgent","WebCapture","WebCopier","cognitiveseo\\.com","XML Sitemaps Generator","008\\/","adbeat\\.com","AdminLabs","Adventurer","alexa site audit","alienfarm","allOrigins","AppSiteAssociation","Aragog\\/","Aranea","ArchiveBox","Asana\\/","Autoconfig Test from USTC","Bad Neighborhood Header Detector","BinaryCanary","Bitbucket-Webhooks","BlackDuck-FD","Blogtrottr","BDFetch","Brandwatch","brokenlinkcheck\\.com","BW\\/","Bushbaby","Butterfly","rss-parser","CapitalOneShopping","Catchpoint","centuryb\\.o\\.t9","CERT PL","certytags","Charlotte","Chatwork LinkPreview","CheckHost","Goodzer","Chrome Privacy Preserving Prefetch Proxy","CirrusExplorer","CLASSLA-web","Cloudflare-Validator","cloudflare-csup","Cloudflare-Radar-Scanner","Cloudflare-SpeedTest","Cloudflare-Stream-Hook","CommaFeed","researchscan\\.comsys\\.rwth-aachen\\.de","contentkingapp","Cotoyogi","Criticalcss\\.com","cron-job\\.org","DMBrowser","downnotifier\\.com","DowntimeDetector\\/","Dlc\\/","EasyBib AutoCite","easybill-ImportManager","EasyCron\\/","easyDNS Monitoring","Cronless","crusty\\/","csirt\\.cz","daumoa","Dead Link Checker","Detectify","Devin","Discourse Forum Onebox","EdgeWatch","Do Not Track Verifier","eRepublik\\.tools","ExodusMovement","Ezgif","FastmailUA","Feed Image Audit","FeedBurner","feeder\\.co","Feedwind","FirmoGraph","FlipboardRSS","Foregenix","Freespoke\\/","Funnelback","gdnplus\\.com","getthit\\.com","Ghost Inspector","github-camo","GlobalWebSearch","Golfe\\/","Google-Apps-Script","GoogleStackdriverMonitoring","GoogleAssociationService\\/","GoogleImageProxy","GoogleProducer","Google-Trust-Services\\/","Google-Area120","GoogleAssociationService$","GoogleDocs","GoPay","GotSiteMonitor\\.com","synthetic-monitoring-agent\\/","Grammarly\\/","Grover\\/","Verity\\/","HappyWing","hCardValidator","Hello World","HetrixTools","Honeybadger Uptime Check","HostTracker\\/","Hotjar","Hype Machine\\/","Web Screen Service By hyperhost","IFTTT\\/","ImageFetcher\\/","ImageMind","img2dataset","imgproxy\\/","Innguma\\/","Instapaper\\/","Integromat\\/","internetVista monitor","Irokez\\.cz monitoring","iubenda-radar\\/","jetmon\\/","Jumio","keycdn-tools\\/","Klaviyo\\/","LAC_IAHarvester","LegalMonster","Let's Encrypt","loc\\.gov\\/programs\\/web-archiving","LinkTiger","LinkAce\\/","LinkWalker\\/","LogicMonitor","Magellan","magicsearchdev\\/","Magnet\\.me-web\\/","MainWP\\/","Make\\/","ManageWP","MarketGoo\\/","MarketingMiner","dbot\\)","Mavifinds","MB-LinkChecker","MediavineMetadataParser\\/","Meta-ExternalHit\\/","Metorik","Miniature\\.io\\/","mirrorweb\\.com","ModularConnector\\/","Mollie HTTP client","monitis -","MonitoRSS\\/","MonSpark\\/","montastic-monitor","MonTools\\.com","MxToolbox","nbertaupete95","NetAPI","NetShelter ContentScan","NETVIGIE","nyt_scraping","NewsNow\\/","NLNZ_IAHarvester","NodePing","Nooshub\\/","Novaact\\/","Novellum","nvdorz","Odin;","Offline Explorer","OhDear\\/","Omnisend\\/","Online Domain Tools","WebCEO Online\\/","OpenGraph\\.io\\/","OpenRSS","OpenVAS","Owler \\(ows\\.eu","Operator\\/","Orlo-LinkPreview\\/","Cozi-iCalendar-FeedReader","OutsellURLValidator","Overcast\\/","Panopta","parse\\.ly scraper\\/","PayPal\\/","PDF24 URL To PDF","PingAdmin\\.Ru\\/","pingping\\.io\\/","PlayStore-Google","PocketCasts\\/","Potions\\/","PrintFriendly\\.com","Pro-Sitemaps\\/","ProbelySPDR\\/","ProjectShield-UrlCheck","Blackbox Exporter\\/","Protopage\\/","PS_Daily\\/","pulsetic\\.com","PWABuilderHttpAgent","Rackspace Monitoring\\/","Readable\\/","Recurly Webhooks\\/","RED\\/","Reelevant\\/","remove\\.bg\\/","Retool\\/","RetroListeCOM\\/","RevvimGort\\/","reward-gateway","Riddler \\(http:\\/\\/riddler\\.io","RSSAPI\\/","rss2tg","SFDC-Callout\\/","page-preview-tool","Sansec Security Monitor\\/","GIFTEDVISITOR SCAN","Schema-Markup-Validator","Scoop\\.it\\/","Searcherweb","Searcherxweb","SearchExpress","SecurityHeaders","SendGrid Event API","s4a\\/","SeoSiteCheckup","Server Density Service Monitoring","Shopify-Captain-Hook","Shortwave Image Fetcher","linkReader\\/","^Silk\\/","SinceraSyntheticUser\\/","Optimizer\\)","Site24x7","SiteSearch360\\/","SiteUptime\\.com","SnapURLPreview\\/","SnapchatAds\\/","Snipcart\\/","solarwinds\\/","Sora POS\\/","SparkShipping","SparkPost","Spawning-AI","IDG\\/EU","Specificfeeds","Spectate\\/","splash Version\\/","Rigor\\)","TwinWaveScanner","SSL Labs \\(https:\\/\\/www\\.ssllabs\\.com","Stape\\/","StartpagePrivateImageProxy\\/","StatistikAustria\\/","Stripe\\/","Sucuri","Svix-Webhooks\\/","SwifteqLinkChecker","Swisscows","Datadog Synthetic","TactiScout\\/","tchelebi\\/","bitdiscovery","Test Certificate Info","TestLocally\\/","TestURI","TextRazor","The Knowledge AI","TheInternetSearchx","Trellis-Services","trentwil\\.es","Trustly\\/","TTD-Content","Tweakers","TwilioProxy\\/","UASlinkChecker\\/","Unshorten\\.It\\!","updown\\.io","Uptime\\/","uptimedoctor","Uptimia","uptrends","Urlcheckr\\/","useeBookChecker\\/","Vagabondo\\/","VaultPress","vu-server-health-scanner\\/","WebsiteOps","WatchMouse","Web Measure\\/","Webflow","websitepulse","WebSniffer\\/","WSM\\/","WEDOS OnLine","WhatsMyIP\\.org","WhatWeb\\/","Wheregoes\\.com","wheresitup\\.com\\/","Citoid","ZoteroTranslationServer\\/WMF","wmtips\\.com\\/","Wordup-1","workona-favicon-service\\/","Indy Library","WJHRO\\/","WP Time Capsule","WPUmbrella","WPMU DEV Broken Link Checker","WPMUDEV Uptime Monitor","WPSec\\/","abuse\\.xmco\\.fr","XY-Archive-Compliance","Yahoo Ad monitoring","YahooMailProxy","YahooCacheSystem","YLT Chrome","YokoyGroupAG\\/","Zapier","Zendesk Webhook","Penthouse Critical Path CSS Generator","Google-AdWords-Express","Notion\\/","SSL Labs$","Tumblr\\/","upday\\/","watchTowr","PRTG Network Monitor","GeedoShopProductFinder","IsonAI-User","InfoSifter","AIWebIndex"];
  // crawler-user-agents:end
  var cuaRe = null;
  function listedCrawler() {
    try {
      if (!cuaRe) cuaRe = new RegExp(CUA_PATTERNS.join('|'));
      return cuaRe.test(navigator.userAgent || '');
    } catch (_) { return false; }
  }

  // Page identity that matches how arrivalSrc names things, so the two sides
  // of the funnel join on the same string: "/" -> home, "/x/" -> x.
  function slug() {
    try {
      var p = (location.pathname || '/').replace(/\/+$/, '').replace(/^\/+/, '');
      p = p.replace(/\.html$/, '');
      return p === '' || p === 'index' ? 'home' : p;
    } catch (_) { return 'unknown'; }
  }

  // ── Landing source: the AI-assistant channel (2026-09-06) ─────────────
  //
  // The only channel that has ever produced a paying user is AI-assistant
  // recommendation — both payers arrived as arrivalSrc='home', and payer #2
  // wrote that Gemini sent him for "analytics prep" — and it was invisible:
  // zero arrivals stamped chatgpt/perplexity/gemini/copilot/claude in 60
  // days. Assistants link to the homepage; ChatGPT appends
  // ?utm_source=chatgpt.com and Perplexity sends a referrer. This file wrote
  // the referrer into landing_view and persisted nothing, so when the
  // visitor clicked /app/?src=home the app stamped first-touch
  // arrivalSrc='home' from the explicit ?src and the utm/referrer was gone.
  //
  // `landingSrc` is a NEW first-touch field under its own key, stamped next
  // to arrivalSrc on the app's events. It is deliberately not a change to
  // arrivalSrc: `home` is the door series every open ledger claim reads
  // (door_solve_rate), and re-labelling those rows mid-flight would rewrite
  // the history the claims compare against. `home` keeps meaning "clicked
  // the homepage CTA"; landingSrc says who sent them there. Gemini sends no
  // utm and no referrer, so it stays dark — that is the channel's limit.
  //
  // This block is an ES5 copy of src/utils/landing-src.js (this file cannot
  // import). tests/track.test.js parses LANDING_SRC_TABLE out of this text,
  // compares it to the module's export, and runs both over the same inputs.
  // Change one, change both. Stored values are labels and hostnames only —
  // never a path or query string; an assistant share URL can carry a prompt.
  var LANDING_SRC_KEY = 'sqlquest_landing_src';
  var MAX_UTM_LEN = 40;
  var MAX_HOST_LEN = 60;

  // LANDING_SRC_TABLE:begin — byte-for-byte the same rows as src/utils/landing-src.js
  var LANDING_SRC_TABLE = [
    ['chatgpt.com', 'ai:chatgpt'],
    ['openai.com', 'ai:chatgpt'],
    ['chatgpt', 'ai:chatgpt'],
    ['openai', 'ai:chatgpt'],
    ['perplexity.ai', 'ai:perplexity'],
    ['perplexity', 'ai:perplexity'],
    ['gemini.google.com', 'ai:gemini'],
    ['bard.google.com', 'ai:gemini'],
    ['gemini', 'ai:gemini'],
    ['bard', 'ai:gemini'],
    ['copilot.microsoft.com', 'ai:copilot'],
    ['copilot', 'ai:copilot'],
    ['claude.ai', 'ai:claude'],
    ['claude', 'ai:claude'],
    ['google', 'search:google'],
    ['bing.com', 'search:bing'],
    ['bing', 'search:bing'],
    ['duckduckgo.com', 'search:ddg'],
    ['duckduckgo', 'search:ddg'],
    ['reddit.com', 'social:reddit'],
    ['reddit', 'social:reddit'],
    ['linkedin.com', 'social:linkedin'],
    ['lnkd.in', 'social:linkedin'],
    ['linkedin', 'social:linkedin'],
    ['t.co', 'social:x'],
    ['twitter.com', 'social:x'],
    ['x.com', 'social:x'],
    ['twitter', 'social:x'],
    ['facebook.com', 'social:facebook'],
    ['facebook', 'social:facebook'],
    ['news.ycombinator.com', 'social:hn'],
    ['hackernews', 'social:hn'],
  ];
  // LANDING_SRC_TABLE:end

  function cleanSource(v) {
    if (v == null) return null;
    var s = String(v).toLowerCase().replace(/^\s+|\s+$/g, '');
    s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/^www\./, '');
    s = s.split(/[/?#]/)[0];
    s = s.replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    return s || null;
  }

  function parseReferrer(referrer) {
    var m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)([^?#]*)/i.exec(String(referrer || '').replace(/^\s+|\s+$/g, ''));
    if (!m) return null;
    var host = m[1].toLowerCase();
    var at = host.lastIndexOf('@');
    if (at >= 0) host = host.slice(at + 1);
    host = host.replace(/:\d+$/, '').replace(/^www\./, '');
    if (!host) return null;
    return { host: host, path: m[2] || '/' };
  }

  function hostMatches(host, pattern) {
    return host === pattern || host.slice(-(pattern.length + 1)) === '.' + pattern;
  }

  function lookupLandingSrc(value) {
    for (var i = 0; i < LANDING_SRC_TABLE.length; i++) {
      if (hostMatches(value, LANDING_SRC_TABLE[i][0])) return LANDING_SRC_TABLE[i][1];
    }
    if (/^google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(value)) return 'search:google';
    return null;
  }

  function isSameSite(host, siteHost) {
    if (!host) return true;
    if (host === 'sqlquest.app' || host.slice(-13) === '.sqlquest.app') return true;
    var site = String(siteHost || '').toLowerCase().replace(/^www\./, '');
    return !!site && host === site;
  }

  function classifyLandingSrc(source, referrer, siteHost) {
    var utm = cleanSource(source);
    if (utm) return lookupLandingSrc(utm) || ('utm:' + utm.slice(0, MAX_UTM_LEN));
    var r = parseReferrer(referrer);
    if (!r || isSameSite(r.host, siteHost)) return null;
    if (hostMatches(r.host, 'bing.com') && /^\/chat(\/|$)/i.test(r.path)) return 'ai:copilot';
    return lookupLandingSrc(r.host) || ('ref:' + r.host.slice(0, MAX_HOST_LEN));
  }

  // No URLSearchParams — this runs on every static page, in whatever the
  // visitor brought. Returns the decoded raw value or null.
  function param(name) {
    try {
      var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search || '');
      if (!m) return null;
      var v = m[1].replace(/\+/g, ' ');
      try { v = decodeURIComponent(v); } catch (_) {}
      v = v.replace(/^\s+|\s+$/g, '');
      return v || null;
    } catch (_) { return null; }
  }

  // utm_source for the event row (this view's, not the first touch), run
  // through the same cleanSource as the persisted key and capped so a junk
  // value cannot bloat metadata. 2026-09-06 review: this returned the raw
  // param, so `?utm_source=some.site/with/path?x=1` persisted `utm:some.site`
  // but the landing_view row carried the whole path and query — the one
  // param an assistant share URL controls, and the one this file promises
  // never to store. Hostname only, on the row as well as in storage.
  function utmSource() {
    var v = cleanSource(param('utm_source'));
    return v ? v.slice(0, MAX_UTM_LEN) : null;
  }

  function landingSrc() {
    try { return localStorage.getItem(LANDING_SRC_KEY) || null; } catch (_) { return null; }
  }

  // Referrer spam (2026-11-12): hosts whose referrals are only ever crawlers.
  // Rows are stamped `bot: 'refspam'`, never dropped, so a read excludes them
  // and a mistake is recoverable. Kept identical to SPAM_REFERRERS in
  // src/utils/bot-signals.js (tests/bot-signals.test.js).
  var SPAM_REFERRERS = ['aocr.org'];
  function isSpamReferrer(src) {
    var m = /^ref:(.+)$/.exec(String(src || ''));
    if (!m) return false;
    var host = m[1].toLowerCase();
    for (var i = 0; i < SPAM_REFERRERS.length; i++) {
      if (hostMatches(host, SPAM_REFERRERS[i])) return true;
    }
    return false;
  }

  // Crawler fingerprints by window size (2026-11-22). Until today a
  // landing_view carried no viewport at all, so the crawlers the app stamps
  // since 2026-10-07 (src/utils/bot-signals.js) walked the landing pages as
  // people: in the 30 days to 2026-11-22, 941 "readers" in Asia/Shanghai with
  // no source and 855 in America/Los_Angeles with none, against ~250 real
  // blog readers. Same bands and the same table as the app, in ES5 rows:
  // [id, viewport, tz or null, only when there is no landing source].
  // Stamped, never dropped — a read excludes them, a mistake is recoverable.
  // tests/track.test.js runs this and botSignals() over the same inputs.
  // SOFT_FINGERPRINTS:begin
  var SOFT_FINGERPRINTS = [
    ['vp1919x992', 'desktop:1919x992', null, false],
    ['la1920x1080', 'desktop:1920x1080', 'America/Los_Angeles', true],
    ['utc1280x720', 'desktop:1280x720', 'UTC', false],
    ['tab800x600', 'tablet:800x600', null, false],
    ['vp1280x1200', 'desktop:1280x1200', null, false]
  ];
  // SOFT_FINGERPRINTS:end

  function viewportLabel() {
    try {
      var w = window.innerWidth;
      if (!w) return null;
      var band = w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
      return band + ':' + w + 'x' + window.innerHeight;
    } catch (_) { return null; }
  }

  function softFingerprint(viewport, tz, src) {
    for (var i = 0; i < SOFT_FINGERPRINTS.length; i++) {
      var f = SOFT_FINGERPRINTS[i];
      if (viewport !== f[1]) continue;
      if (f[2] && tz !== f[2]) continue;
      if (f[3] && src) continue;
      return f[0];
    }
    return isSpamReferrer(src) ? 'refspam' : null;
  }

  // First touch wins — the same rule arrivalSrc uses in app.jsx. Explicit
  // param beats referrer: utm_source, else ref, else src (an assistant or a
  // share link can carry any of the three onto a landing page). Runs before
  // the bot/localhost gate on purpose: persisting is local and harmless, and
  // the landing_view row must already carry the value.
  function persistLandingSrc() {
    try {
      if (localStorage.getItem(LANDING_SRC_KEY)) return;
      var source = param('utm_source') || param('ref') || param('src');
      var value = classifyLandingSrc(source, document.referrer, location.hostname);
      if (value) localStorage.setItem(LANDING_SRC_KEY, String(value).slice(0, 64));
    } catch (_) {}
  }

  // ── Hero CTA copy test (founder's SEO plan P3.18, 2026-09-13) ──────────
  // One experiment, on elements marked data-cta-test="hero" (the homepage
  // hero's primary button only). The arm is a hash of the browser's aid, so a
  // returning visitor always sees the same button, and it rides on EVERY event
  // this page sends (landing_view included) as meta.ctaArm — which is what
  // makes a click, and through aid a later solve, attributable to the copy.
  // Arm 0 is the control, the button as it was. readiness and plan share a
  // destination on purpose: that pair isolates the words. Ledger claim
  // "hero CTA copy test"; metric hero_cta_test. Armed 2026-10-04, read 2026-11-01.
  var CTA_TEST_ID = 'hero_cta_v1';
  var CTA_ARMS = [
    ['control', 'Start free', '/app/?src=home'],
    ['start', 'Start Practicing', '/app/?src=home'],
    ['skills', 'Test My SQL Skills', '/sql-quiz/'],
    ['readiness', 'Check My Interview Readiness', '/sql-interview-readiness-test/'],
    ['plan', 'Build My Interview Plan', '/sql-interview-readiness-test/']
  ];
  var ctaArm = null;
  // Armed from 2026-10-04, not today: the founder's homepage read closes on
  // 2026-10-03 on "home→app must not fall below 51.9%", and three of these
  // arms do not go to the app. Starting the test before that verdict would
  // move the watched number by construction. ?cta_test=1 arms it early for a
  // preview check.
  var CTA_TEST_START = Date.UTC(2026, 9, 4);

  function ctaArmIndex(id) {
    var h = 2166136261;
    var s = String(id) + ':' + CTA_TEST_ID;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h % CTA_ARMS.length;
  }

  function applyCtaTest() {
    try {
      if (!document.querySelectorAll) return;
      if (Date.now() < CTA_TEST_START && param('cta_test') !== '1') return;
      var els = document.querySelectorAll('[data-cta-test="hero"]');
      if (!els || !els.length) return;
      var arm = CTA_ARMS[ctaArmIndex(aid())];
      ctaArm = arm[0];
      for (var i = 0; i < els.length; i++) {
        els[i].textContent = arm[1];
        els[i].setAttribute('href', arm[2]);
      }
    } catch (_) {}
  }

  function send(event, props) {
    try {
      if (isBot()) return;
      // Local dev and headless smoke runs must not write production analytics —
      // each run mints a fresh aid, so no static exclusion list can catch it.
      // Same guard as ANALYTICS_MUTED in src/app.jsx.
      if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
      var meta = props || {};
      meta.aid = aid();
      meta.page = slug();
      // LANDING_VARIANT is declared `const` at the top level of an inline
      // script, so it lives in the global LEXICAL scope and never appears on
      // window — checking window.LANDING_VARIANT silently yields null on
      // every page. A bare reference resolves it; this file is deferred, so
      // the inline declaration has already run. Guarded because only the
      // three variant pages declare it at all.
      try { meta.variant = (typeof LANDING_VARIANT === 'string') ? LANDING_VARIANT : null; }
      catch (_) { meta.variant = null; }
      try { meta.ref = document.referrer ? document.referrer.slice(0, 200) : null; } catch (_) {}
      // utm = this view's utm_source, cleaned to a hostname-shaped label;
      // landingSrc = the browser's first-touch classification (see the
      // landing-source block above).
      // Both on every row, so a cta_* click is attributable without a join.
      try { meta.utm = utmSource(); } catch (_) { meta.utm = null; }
      meta.landingSrc = landingSrc();
      if (ctaArm) { meta.ctaArm = ctaArm; meta.ctaTest = CTA_TEST_ID; }
      try { meta.tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (_) {}
      meta.viewport = viewportLabel();
      var fp = softFingerprint(meta.viewport, meta.tz, meta.landingSrc);
      if (fp) meta.bot = fp;

      var user = null;
      try { user = localStorage.getItem('sqlquest_user') || null; } catch (_) {}

      var body = JSON.stringify({
        event: event,
        username: user || 'guest',
        reason: 'landing',
        metadata: JSON.stringify(meta),
        created_at: new Date().toISOString()
      });

      // keepalive so a click that navigates away still reports — without it
      // cta_* would under-count exactly the clicks we most want to measure.
      fetch(ENDPOINT, {
        method: 'POST',
        keepalive: true,
        headers: {
          'apikey': ANON_KEY,
          'Authorization': 'Bearer ' + ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: body
      }).catch(function () {});
    } catch (_) {}
  }

  window.sqTrack = send;

  persistLandingSrc();
  applyCtaTest();
  // `ua` rides on landing_view only, capped. The 2026-09-13 burst — 313
  // question-page views in 13 minutes, one aid each, tz America/Los_Angeles,
  // no referrer, nothing after — passed isBot() and could not be named,
  // because no row said what fetched the page. Next time it can.
  try {
    send('landing_view', {
      returning: !!localStorage.getItem('sqlquest_user'),
      ua: (navigator.userAgent || '').slice(0, 160) || null,
      cuaBot: listedCrawler(),
      vis: (document.visibilityState || null),
    });
  } catch (_) {}

  // landing_engaged: the first real input on the page — pointer, key, touch,
  // scroll or wheel — once per load. A renderer executes the script and so
  // writes landing_view; it does not move a mouse. From 2026-09-16 the
  // landing denominator is people with landing_engaged (or any later app
  // event), not landing_view: docs/agent/metrics.md, `landing_people`.
  // landing_view itself is unchanged, so the series before that date still
  // reads the same way.
  (function () {
    var t0 = Date.now();
    var done = false;
    var kinds = ['pointerdown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'wheel'];
    function engaged(e) {
      if (done) return;
      done = true;
      for (var k = 0; k < kinds.length; k++) {
        try { document.removeEventListener(kinds[k], engaged, true); } catch (_) {}
      }
      send('landing_engaged', { via: (e && e.type) || null, msToEngage: Date.now() - t0 });
    }
    for (var i = 0; i < kinds.length; i++) {
      try { document.addEventListener(kinds[i], engaged, { capture: true, passive: true }); } catch (_) {}
    }
  })();

  // Extra props on a [data-track] element (2026-09-26, /for-teams/): every
  // data-track-<name>="value" attribute rides on the event as props.<name>.
  // `data-track-seats="20"` → {seats: 20}. A plain integer becomes a number;
  // anything else stays a string, capped at 120 chars. The page owns what it
  // puts there — /for-teams/ keeps them in sync with its form, and sets
  // data-track-email only when the visitor typed one (pro_events is
  // insert-only for anon, so a row cannot be read back from the browser).
  // `href` is reserved and never overwritten.
  var MAX_PROP_LEN = 120;
  function trackProps(el) {
    var props = { href: (el.getAttribute('href') || null) };
    try {
      var ds = el.dataset;
      for (var k in ds) {
        if (!Object.prototype.hasOwnProperty.call(ds, k)) continue;
        if (k.length <= 5 || k.indexOf('track') !== 0) continue;
        var name = k.charAt(5).toLowerCase() + k.slice(6);
        if (!name || name === 'href') continue;
        var v = String(ds[k]);
        props[name] = /^\d{1,9}$/.test(v) ? Number(v) : v.slice(0, MAX_PROP_LEN);
      }
    } catch (_) {}
    return props;
  }

  document.addEventListener('click', function (e) {
    try {
      var el = e.target && e.target.closest && e.target.closest('[data-track]');
      if (!el || !el.dataset || !el.dataset.track) return;
      send(el.dataset.track, trackProps(el));
    } catch (_) {}
  }, true);
})();
