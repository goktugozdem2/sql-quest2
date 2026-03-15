# SQL Quest - Dataset Engagement & Gamification Analysis

## 1. Current Datasets Inventory

### Core Public Datasets

| # | Dataset | Records | Tables | Columns | Theme |
|---|---------|---------|--------|---------|-------|
| 1 | **Titanic Passengers** | 891 | 1 (passengers) | 10 | Historical survival data |
| 2 | **Movies** | ~100+ | 1 (movies) | ~8 | Film ratings, genres, revenue |
| 3 | **Employees** | ~50+ | 2 (employees, departments) | ~10 | HR/salary data |
| 4 | **E-commerce** | ~100+ | 2 (customers, orders) | ~12 | Shopping transactions |

### Story Mode Datasets (12 custom scenarios)

| # | Story Dataset | Tables | Theme | Difficulty |
|---|--------------|--------|-------|------------|
| 1 | Coffee Chain Crisis | stores (12 rows) | Health inspections | Easy |
| 2 | Hospital Staffing | staff (20 rows) | Healthcare workforce | Easy |
| 3 | E-Commerce Fraud Ring | transactions (24 rows) | Fraud detection | Medium |
| 4 | School District Budget | teachers (12) + schools (6) | Education funding | Medium |
| 5 | Airline Overbooking | flights (12 rows) | Travel operations | Medium |
| 6 | Startup Salary Equity | employees (16 rows) | Pay gap analysis | Medium |
| 7 | Restaurant Health Inspector | inspections (17 rows) | Food safety | Hard |
| 8 | Insurance Claim Investigation | claims (15) + repair_shops (4) | Insurance fraud | Hard |
| 9 | Pandemic Contact Tracer | test_records (14 rows) | Public health | Easy |
| 10 | Music Streaming Royalties | artist_earnings (12 rows) | Entertainment law | Hard |
| 11 | Missing Shipments | shipments (15 rows) | Logistics | Easy |
| 12 | Election Night Data | votes (18 rows) | Civic data | Medium |

---

## 2. Engagement Score & Effort Matrix

Rating scale: **Engagement** (1-10, how compelling for users) | **Effort** (1-10, dev effort to implement/expand)

### Existing Datasets

| Dataset | Engagement | Effort | ROI | Notes |
|---------|:----------:|:------:|:---:|-------|
| **Titanic** | 7/10 | 1/10 (exists) | HIGH | Classic dataset, universally known, great for beginners |
| **Movies** | 8/10 | 1/10 (exists) | HIGH | Everyone relates to movies, high curiosity factor |
| **Employees/HR** | 5/10 | 1/10 (exists) | MED | Practical but dry — feels like homework |
| **E-commerce** | 6/10 | 1/10 (exists) | MED | Relevant to industry but generic |
| **Story: Coffee Chain** | 9/10 | 1/10 (exists) | HIGH | Urgency + real stakes = very engaging |
| **Story: Hospital Staffing** | 9/10 | 1/10 (exists) | HIGH | Life-or-death stakes, emotional connection |
| **Story: Fraud Ring** | 10/10 | 1/10 (exists) | HIGH | Detective work, thrilling narrative |
| **Story: School Budget** | 7/10 | 1/10 (exists) | HIGH | Relatable, meaningful consequences |
| **Story: Airline Overbooking** | 8/10 | 1/10 (exists) | HIGH | Everyone hates overbooking — instant buy-in |
| **Story: Salary Equity** | 8/10 | 1/10 (exists) | HIGH | Hot-button social issue, feels important |
| **Story: Health Inspector** | 8/10 | 1/10 (exists) | HIGH | Public safety angle, investigative feel |
| **Story: Insurance Fraud** | 9/10 | 1/10 (exists) | HIGH | Complex detective work, satisfying to crack |
| **Story: Contact Tracer** | 7/10 | 1/10 (exists) | HIGH | Timely, public health relevance |
| **Story: Music Royalties** | 9/10 | 1/10 (exists) | HIGH | Pop culture + injustice = compelling |
| **Story: Missing Shipments** | 6/10 | 1/10 (exists) | MED | Functional but less emotionally gripping |
| **Story: Election Night** | 8/10 | 1/10 (exists) | HIGH | Democracy stakes, real-time pressure |

### Recommended NEW Datasets to Add

| Dataset Idea | Engagement | Effort | ROI | Why It Works |
|-------------|:----------:|:------:|:---:|-------------|
| **Social Media Analytics** (posts, likes, followers) | 10/10 | 3/10 | HIGH | Everyone uses social media — instant relatability |
| **Sports Stats** (NBA/FIFA/NFL player stats) | 9/10 | 4/10 | HIGH | Huge audience, debates drive engagement |
| **Spotify/Music Playlist** (songs, plays, artists) | 9/10 | 3/10 | HIGH | Personal connection to music |
| **Crypto/Stock Market** (trades, prices, portfolios) | 8/10 | 4/10 | HIGH | Finance curiosity, trend analysis |
| **Video Game Leaderboard** (players, scores, achievements) | 9/10 | 3/10 | HIGH | Meta — gamers learning SQL through games data |
| **Restaurant Reviews** (Yelp-style ratings) | 7/10 | 3/10 | HIGH | Foodies love data, relatable domain |
| **Netflix Watch History** (shows, ratings, watch time) | 9/10 | 3/10 | HIGH | "What should I watch?" angle |
| **Weather & Climate** (temps, storms, records) | 5/10 | 3/10 | MED | Educational but not thrilling |
| **Pokemon/Game Characters** (stats, types, abilities) | 9/10 | 3/10 | HIGH | Nostalgia, fun, rich relational data |
| **Hospital Patient Records** (anonymized) | 6/10 | 5/10 | MED | Industry-relevant but sensitive topic |
| **Uber/Ride-Share Trips** (rides, routes, fares) | 8/10 | 3/10 | HIGH | Common experience, pricing curiosity |
| **NASA Space Missions** (launches, crews, missions) | 8/10 | 4/10 | HIGH | Awe factor, great for JOINs |

---

## 3. Engagement Tier Rankings

### TIER S — Maximum Engagement (Score 9-10)
These datasets should be prioritized for challenges and tests:

1. **Story: E-Commerce Fraud Ring** (10/10) — Detective narrative, thrill of catching criminals
2. **Social Media Analytics** (10/10) — Universal relatability, NEW
3. **Story: Coffee Chain Crisis** (9/10) — Time pressure, PR stakes
4. **Story: Hospital Staffing** (9/10) — Life-or-death urgency
5. **Story: Insurance Fraud** (9/10) — Complex investigation
6. **Story: Music Royalties** (9/10) — Pop culture + justice
7. **Sports Stats** (9/10) — Passionate audience, debate fuel, NEW
8. **Spotify/Music Playlist** (9/10) — Personal taste connection, NEW
9. **Video Game Leaderboard** (9/10) — Meta-gaming appeal, NEW
10. **Pokemon/Game Characters** (9/10) — Nostalgia + fun, NEW

### TIER A — High Engagement (Score 7-8)
Strong options for variety:

11. **Movies** (8/10) — Curiosity-driven exploration
12. **Story: Airline Overbooking** (8/10) — Universal frustration
13. **Story: Salary Equity** (8/10) — Social relevance
14. **Story: Health Inspector** (8/10) — Investigative journalism feel
15. **Story: Election Night** (8/10) — Civic urgency
16. **Crypto/Stock Market** (8/10) — Finance trend appeal, NEW
17. **Uber/Ride-Share** (8/10) — Everyday relevance, NEW
18. **NASA Space Missions** (8/10) — Awe + exploration, NEW
19. **Netflix Watch History** (9/10) — Binge culture, NEW
20. **Titanic** (7/10) — Classic, reliable
21. **Story: School Budget** (7/10) — Meaningful consequences
22. **Story: Contact Tracer** (7/10) — Public health urgency
23. **Restaurant Reviews** (7/10) — Foodie appeal, NEW

### TIER B — Moderate Engagement (Score 5-6)
Useful but need narrative boost:

24. **E-commerce** (6/10) — Generic, needs story wrapper
25. **Story: Missing Shipments** (6/10) — Functional, less exciting
26. **Hospital Records** (6/10) — Industry-focused, NEW
27. **Employees/HR** (5/10) — Feels like textbook work
28. **Weather/Climate** (5/10) — Educational, less fun, NEW

---

## 4. Gamification Ideas

### A. Challenge-Based Gamification (Low Effort, High Impact)

| Idea | Engagement | Effort | Description |
|------|:----------:|:------:|-------------|
| **Mystery Query Mode** | 10/10 | 4/10 | Show the result table, player must write the query that produces it. Reverse-engineering SQL. |
| **SQL Detective Cases** | 10/10 | 5/10 | Multi-step investigations where each query reveals a clue. 3-5 queries to "solve the case." |
| **Query Golf** | 9/10 | 3/10 | Solve the challenge in the fewest characters. Leaderboard for shortest correct query. |
| **Speed Ladder** | 9/10 | 3/10 | Progressive difficulty — each correct answer gives a harder question. How far can you climb? |
| **Boss Rush Mode** | 9/10 | 3/10 | Face 5 increasingly hard queries. Fail = game over. Beat all 5 = boss defeated. |
| **Query Duel (1v1)** | 10/10 | 7/10 | Real-time PvP — both players get the same challenge, fastest correct query wins. |
| **Daily Tournament** | 9/10 | 5/10 | All players compete on the same daily set. Global leaderboard resets daily. |

### B. Progression & Reward Systems (Medium Effort)

| Idea | Engagement | Effort | Description |
|------|:----------:|:------:|-------------|
| **Skill Trees** | 9/10 | 6/10 | Visual branching paths: SELECT → WHERE → JOIN → Subqueries → Window Functions → CTEs. Unlock advanced topics. |
| **Badge Collections** | 8/10 | 3/10 | Themed badge sets (e.g., "JOIN Master Set": Inner, Left, Right, Cross, Self). Collect all for bonus XP. |
| **Seasonal Challenges** | 8/10 | 4/10 | Monthly themed events (e.g., "Spooky SQL October" with horror-themed datasets, "March Madness" with sports data). |
| **Title System** | 7/10 | 2/10 | Earned display titles: "The Detective" (fraud queries), "The Healer" (hospital data), "The Speedster" (fast completions). |
| **Loot Boxes / Reward Chests** | 8/10 | 4/10 | Random XP bonuses, themes, or bonus challenges after milestones. Anticipation drives engagement. |
| **Prestige System** | 8/10 | 4/10 | After reaching max level, "prestige" resets with a permanent badge + XP multiplier. Encourages replay. |

### C. Social & Competitive Features (Higher Effort, Highest Retention)

| Idea | Engagement | Effort | Description |
|------|:----------:|:------:|-------------|
| **Guild/Team System** | 9/10 | 7/10 | Form teams, compete in weekly team challenges. Social accountability keeps users returning. |
| **Friend Challenges** | 9/10 | 6/10 | Send a challenge to a friend — they must beat your time/score. Async competition. |
| **Weekly Leaderboard Seasons** | 8/10 | 4/10 | Weekly resets with tier rewards (Bronze/Silver/Gold). Keeps competition fresh. |
| **Mentor System** | 7/10 | 6/10 | Advanced users can "mentor" beginners by reviewing queries and giving tips. Earns mentor XP. |
| **Community Challenges** | 8/10 | 5/10 | Users submit their own challenges. Top-voted become official. User-generated content engine. |

### D. Narrative & Immersion (Medium Effort, Strong Differentiation)

| Idea | Engagement | Effort | Description |
|------|:----------:|:------:|-------------|
| **Campaign Mode** | 10/10 | 7/10 | A 20-quest storyline where you play a data analyst hired by a company. Each chapter = new SQL skill. Final boss = complex CTE + window function query. |
| **Character Progression** | 8/10 | 5/10 | Choose a character class (Analyst, Engineer, Scientist). Each has unique challenge paths and unlockables. |
| **Achievement Showcase** | 7/10 | 2/10 | Public profile page showing badges, stats, and rare achievements. Social proof drives competition. |
| **Story Branching** | 9/10 | 6/10 | Story challenges where your query results determine the next scenario. Wrong answer = different path. |
| **Easter Eggs** | 8/10 | 2/10 | Hidden achievements for creative queries (e.g., selecting all columns with *, writing a query over 200 chars, using 5+ JOINs). |

### E. Retention Mechanics (Low-Medium Effort, Critical for DAU)

| Idea | Engagement | Effort | Description |
|------|:----------:|:------:|-------------|
| **Streak Shields** | 8/10 | 2/10 | Earn 1 "shield" per week that protects your streak if you miss a day. Reduces streak anxiety. |
| **Comeback Bonus** | 7/10 | 1/10 | Already exists. Boost the reward — 3x XP for first challenge after 3+ days away. |
| **Mystery Daily Reward** | 8/10 | 3/10 | Unknown reward for completing the daily challenge. Could be 1x, 2x, 5x, or 10x XP. Slot machine psychology. |
| **Weekly Goals** | 8/10 | 3/10 | "Complete 10 challenges this week" / "Try 3 datasets" / "Solve 2 Hard challenges." Variable goals keep it fresh. |
| **Login Calendar** | 7/10 | 3/10 | Visual calendar showing active days. Cumulative rewards at 7, 14, 21, 30 days. |
| **Decay Prevention Alerts** | 6/10 | 2/10 | Already partially exists. "Your JOIN skills are getting rusty! Practice now to keep your rating." |

---

## 5. Top 10 Highest-Impact Recommendations

Ranked by **(Engagement x Reach) / Effort**:

| Rank | Recommendation | Category | Est. Impact |
|------|---------------|----------|-------------|
| 1 | **Mystery Query Mode** (reverse-engineer SQL) | Challenge | Unique mechanic, highly addictive |
| 2 | **Query Golf** (shortest correct query) | Challenge | Easy to build, drives creativity |
| 3 | **Social Media Analytics dataset** | Dataset | Universal appeal, instant engagement |
| 4 | **Weekly Goals system** | Retention | Keeps users coming back with varied tasks |
| 5 | **Sports Stats dataset** (NBA/FIFA) | Dataset | Passionate audience, debate-driven |
| 6 | **SQL Detective Cases** (multi-step) | Challenge | Story mode on steroids |
| 7 | **Speed Ladder** (progressive difficulty) | Challenge | Simple, "one more try" addiction |
| 8 | **Badge Collections** (themed sets) | Progression | Collector mentality drives completionism |
| 9 | **Streak Shields** | Retention | Reduces churn from broken streaks |
| 10 | **Easter Eggs** | Narrative | Low effort, high delight, viral sharing |

---

## 6. Quick Wins (Can Ship This Week)

1. **Query Golf mode** — Add character count tracking to existing speed mode
2. **Streak Shields** — Simple boolean flag in user data
3. **Easter Egg achievements** — Add 5-10 hidden achievements to config.js
4. **Title System** — Map existing achievements to display titles
5. **Mystery Daily Reward** — Randomize daily XP multiplier (1x-5x)
6. **Achievement Showcase** — Surface achievement list in profile view
7. **Comeback Bonus boost** — Increase returning user XP from 50 to 150

---

## 7. Dataset-Challenge Pairing Matrix

Best dataset + challenge type combinations:

| Dataset | Best For | SQL Skills Covered |
|---------|----------|--------------------|
| Titanic | Beginner SELECT/WHERE | Filtering, NULL handling, basic aggregation |
| Movies | GROUP BY, ORDER BY | Aggregation, sorting, HAVING |
| Story: Fraud Ring | GROUP BY + HAVING | Pattern detection, counting |
| Story: School Budget | JOINs | Multi-table queries, filtering joined data |
| Story: Airline | Subqueries | Comparing to averages, nested queries |
| Story: Salary Equity | GROUP BY + ROUND | Aggregation with formatting |
| Story: Health Inspector | Window Functions | ROW_NUMBER, RANK, PARTITION BY |
| Story: Insurance | Subquery + JOIN | Complex multi-concept queries |
| Story: Music Royalties | CTE + Window | Advanced analytics, percentage calculations |
| Story: Election Night | CASE + Aggregation | Pivot tables, conditional logic |
| Sports Stats (NEW) | All levels | Full SQL spectrum from basic to advanced |
| Social Media (NEW) | JOINs, Subqueries | Multi-table relationships, trending analysis |
| Pokemon (NEW) | Fun beginner queries | WHERE, GROUP BY, comparisons |
