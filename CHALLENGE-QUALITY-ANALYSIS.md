# SQL Quest - Challenge Quality Analysis

## Scoring Criteria (1-10 scale)

| Criteria | Description |
|----------|-------------|
| **Quality** | Clear problem statement, unambiguous requirements, correct solution |
| **Engagement** | Interesting scenario, real-world relevance, motivating context |
| **Teaching** | Teaches important concept, appropriate difficulty, builds skills |

---

## 🏆 TOP TIER (Score 25-30) - Excellent

| ID | Title | Quality | Engage | Teach | Total | Notes |
|----|-------|---------|--------|-------|-------|-------|
| 17 | Employees Earning More Than Manager | 9 | 10 | 10 | **29** | Classic interview Q, self-join, real scenario |
| 21 | Survival Rate Analysis | 9 | 10 | 9 | **28** | Percentage calc, HAVING, compelling data story |
| 23 | Salary Rank Within Department | 9 | 9 | 10 | **28** | Window functions, real HR use case |
| 20 | Top Spender Per Country | 8 | 9 | 10 | **27** | Complex subquery, business intelligence |
| 22 | Billion Dollar Directors | 9 | 9 | 9 | **27** | Multiple HAVING conditions, engaging topic |
| 24 | Running Total Revenue | 8 | 9 | 10 | **27** | Window functions, financial reporting |
| 30 | Year-over-Year Growth | 8 | 9 | 10 | **27** | LAG function, analytics essential |
| 29 | Nth Highest Salary per Department | 9 | 8 | 10 | **27** | DENSE_RANK, very common interview Q |
| 19 | Customers Who Never Ordered | 9 | 9 | 9 | **27** | LEFT JOIN + NULL, fundamental pattern |

---

## ✅ GOOD (Score 22-24) - Solid

| ID | Title | Quality | Engage | Teach | Total | Notes |
|----|-------|---------|--------|-------|-------|-------|
| 16 | Second Highest Salary | 9 | 8 | 9 | **26** | Classic interview, but getting dated |
| 13 | Gold Member Spending | 8 | 9 | 9 | **26** | JOIN + GROUP BY + filter, realistic |
| 9 | Revenue by Country | 9 | 9 | 8 | **26** | Calculation + GROUP, business relevant |
| 28 | Highest Fare Per Port | 8 | 9 | 9 | **26** | Correlated subquery, good scenario |
| 18 | Department with Highest Average | 9 | 7 | 9 | **25** | Simple but teaches ORDER+LIMIT |
| 14 | Department Salary Range | 9 | 7 | 9 | **25** | MIN/MAX combo, useful pattern |
| 6 | Survival Rate by Class | 9 | 9 | 8 | **26** | First GROUP BY, compelling data |
| 15 | Blockbuster Genres | 8 | 9 | 8 | **25** | HAVING with SUM, fun topic |
| 26 | Revenue by Decade | 8 | 8 | 9 | **25** | Integer math trick, creative |
| 32 | Extract Title from Name | 7 | 8 | 9 | **24** | String parsing, tricky but useful |
| 51 | Department Performance Rate | 8 | 8 | 9 | **25** | CASE with percentage, practical |
| 48 | Top Earner Per Department | 8 | 7 | 9 | **24** | ROW_NUMBER pattern, essential |
| 49 | Salary Difference from Previous | 8 | 7 | 9 | **24** | LAG function intro |

---

## ⚠️ NEEDS IMPROVEMENT (Score 18-21) - Okay but Issues

| ID | Title | Quality | Engage | Teach | Total | Issues |
|----|-------|---------|--------|-------|-------|--------|
| 1 | Surviving Passengers | 9 | 6 | 7 | **22** | Too easy, SELECT * is bad practice |
| 2 | Top 5 Highest Rated Movies | 9 | 7 | 7 | **23** | Good but generic |
| 3 | Female Passengers | 8 | 5 | 6 | **19** | Boring filter, no insight |
| 4 | Expensive Products | 8 | 6 | 6 | **20** | Very basic, predictable |
| 5 | Unique Movie Genres | 8 | 5 | 7 | **20** | DISTINCT is simple, needs context |
| 7 | Average Movie Rating by Genre | 8 | 7 | 7 | **22** | Good but similar to #6 |
| 8 | High Earning Departments | 8 | 6 | 8 | **22** | First HAVING, but dry |
| 10 | Prolific Directors | 8 | 7 | 7 | **22** | Good pattern, generic scenario |
| 11 | Average Salary by Department | 7 | 5 | 7 | **19** | Repetitive of concept |
| 12 | Customer Orders | 8 | 6 | 8 | **22** | First JOIN, but bland example |
| 25 | Handle Missing Fares | 8 | 6 | 8 | **22** | COALESCE is important, dry delivery |
| 27 | Combine High and Low Earners | 7 | 6 | 8 | **21** | UNION needed, artificial scenario |
| 31 | Fix Passenger Names | 8 | 4 | 6 | **18** | UPPER() too trivial |
| 33 | Product Name Length | 8 | 4 | 6 | **18** | LENGTH() too trivial |
| 55 | Movies Above Average Runtime | 8 | 6 | 8 | **22** | Subquery intro, decent |

---

## ❌ NEEDS REWRITE (Score <18) - Problematic

| ID | Title | Quality | Engage | Teach | Total | Critical Issues |
|----|-------|---------|--------|-------|-------|-----------------|
| 34-40 | String Function series | 6 | 4 | 6 | **16** | Too similar, mechanical, no story |

---

## Summary Statistics

| Tier | Count | % |
|------|-------|---|
| 🏆 Top Tier (25+) | 9 | 18% |
| ✅ Good (22-24) | 13 | 26% |
| ⚠️ Needs Improvement (18-21) | 15 | 30% |
| ❌ Needs Rewrite (<18) | ~8 | 16% |

---

## 🔧 Specific Recommendations

### 1. **Rewrite "SELECT *" Challenges**
- Challenge #1 uses `SELECT *` which is bad practice
- Should require specific columns

**Before:**
```
Find all passengers who survived the Titanic disaster.
Solution: SELECT * FROM passengers WHERE survived = 1
```

**After:**
```
The ship's captain needs a manifest of survivors for the rescue boats. 
Find the name, age, and ticket class of all passengers who survived.
Solution: SELECT name, age, pclass FROM passengers WHERE survived = 1
```

### 2. **Add Story/Context to Boring Ones**

**Challenge #3 (Female Passengers) - Before:**
> Find all female passengers. Return their name and age.

**After:**
> A historian is researching the "Women and Children First" protocol. 
> Help them find all female passengers with their names and ages to 
> analyze if age affected survival chances.

### 3. **Combine Trivial String Challenges**

Instead of 10 separate string function challenges, create 3-4 multi-step ones:

**New: "Data Cleaning Pipeline"**
> The passenger manifest has messy data. Clean it by:
> 1. Extracting the title (Mr., Mrs., etc.)
> 2. Converting names to proper case
> 3. Standardizing cabin codes
> Return: cleaned_name, title, cabin_standard

### 4. **Add More Real-World Scenarios**

Missing important patterns:
- **Duplicate detection** - Find customers with same email
- **Date gaps** - Find missing days in a time series
- **Pivot/unpivot** - Transform rows to columns
- **Recursive CTE** - Org chart hierarchy
- **Data validation** - Find invalid records

### 5. **Progressive Difficulty Within Topics**

Current JOIN challenges jump around. Better:
```
JOIN Track:
1. Simple INNER JOIN (Easy)
2. LEFT JOIN with NULL check (Medium)  
3. Self-join (Medium-Hard)
4. Multiple JOINs (Hard)
5. JOIN with subquery (Hard)
```

---

## 🆕 Suggested New Challenges

### High-Value Additions

| Title | Concept | Difficulty | Why Needed |
|-------|---------|------------|------------|
| Find Duplicate Emails | GROUP BY HAVING COUNT>1 | Easy | Super common |
| Consecutive Login Days | Self-join or LAG | Hard | Interview favorite |
| Department Budget vs Actual | JOIN + CASE | Medium | Business scenario |
| Inactive Users | Date comparison + NULL | Medium | Real-world |
| Leaderboard Ranking | RANK with ties | Medium | Gaming context! |
| Product Recommendations | Self-join on purchases | Hard | E-commerce pattern |
| Time Zone Conversion | Date functions | Medium | Practical skill |
| A/B Test Analysis | CASE + statistics | Hard | Data science |

---

## Priority Action Items

1. **Immediate**: Fix Challenge #1 (no SELECT *)
2. **Quick Win**: Add context/story to #3, #4, #5, #31, #33
3. **Medium**: Consolidate string challenges (34-40)
4. **Larger**: Add 5-8 new high-value challenges
5. **Polish**: Ensure progressive difficulty within each topic

---

## File Locations

- Challenges: `src/data/challenges.js`
- Daily Challenges: `src/data/daily-challenges.js`
- Exercises: `src/data/exercises.js`

