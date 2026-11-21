# SQL Quest - Practice Challenges Quality Analysis

## Scoring Criteria (1-10 scale)

| Criteria | Weight | Description |
|----------|--------|-------------|
| **Quality** | 35% | Clear problem statement, unambiguous requirements, correct solution |
| **Engagement** | 30% | Interesting scenario, real-world relevance, motivating context |
| **Teaching** | 35% | Teaches important concept, appropriate difficulty, progressive skill building |

---

## 📊 Complete Challenge Scoring

### 🏆 TOP TIER (Score 25-30) - Excellent, Keep As-Is

| ID | Title | Diff | Q | E | T | Total | Why It's Great |
|----|-------|------|---|---|---|-------|----------------|
| 17 | Employees Earning More Than Manager | Hard | 9 | 10 | 10 | **29** | Classic interview Q, self-join pattern, real HR scenario |
| 23 | Salary Rank Within Department | Hard | 9 | 9 | 10 | **28** | Window functions, DENSE_RANK, essential skill |
| 19 | Customers Who Never Ordered | Hard | 9 | 10 | 9 | **28** | LEFT JOIN + NULL pattern, universal use case |
| 21 | Survival Rate Analysis | Hard | 9 | 10 | 9 | **28** | Percentage calc, HAVING, compelling data story |
| 30 | Year-over-Year Growth | Hard | 8 | 9 | 10 | **27** | LAG function, analytics essential, real BI |
| 29 | Nth Highest Salary per Department | Hard | 9 | 8 | 10 | **27** | Top-N per group, very common interview Q |
| 24 | Running Total Revenue | Hard | 8 | 9 | 10 | **27** | Window functions, financial reporting |
| 22 | Billion Dollar Directors | Hard | 9 | 9 | 9 | **27** | Multiple HAVING conditions, engaging topic |
| 20 | Top Spender Per Country | Hard | 8 | 9 | 9 | **26** | Complex subquery, business intelligence |
| 48 | Top Earner Per Department | Hard | 9 | 8 | 9 | **26** | ROW_NUMBER pattern, essential skill |
| 28 | Highest Fare Per Port | Hard | 8 | 9 | 9 | **26** | Correlated subquery, good scenario |

---

### ✅ GOOD (Score 22-24) - Solid, Minor Polish

| ID | Title | Diff | Q | E | T | Total | Notes |
|----|-------|------|---|---|---|-------|-------|
| 16 | Second Highest Salary | Hard | 9 | 8 | 8 | **25** | Classic but overused, still valuable |
| 13 | Gold Member Spending | Med | 8 | 9 | 8 | **25** | JOIN + GROUP + filter, realistic |
| 9 | Revenue by Country | Med | 9 | 9 | 7 | **25** | Good business context |
| 6 | Survival Rate by Class | Med | 9 | 9 | 7 | **25** | First GROUP BY, compelling data |
| 15 | Blockbuster Genres | Med | 8 | 9 | 8 | **25** | HAVING with SUM, fun topic |
| 26 | Revenue by Decade | Hard | 8 | 8 | 9 | **25** | Integer math trick, creative |
| 49 | Salary Difference from Previous | Hard | 8 | 7 | 9 | **24** | LAG function intro, clear |
| 50 | Running Total of Revenue | Hard | 8 | 8 | 9 | **25** | Window function practice |
| 51 | Department Performance Rate | Med | 8 | 8 | 9 | **25** | CASE with percentage, practical |
| 47 | Second Highest Salary (Window) | Med | 8 | 7 | 9 | **24** | Alternative approach to #16 |
| 40 | Rank Movies by Rating | Hard | 8 | 8 | 9 | **25** | RANK() OVER practice |
| 43 | Count Direct Reports | Med | 8 | 8 | 8 | **24** | Self-join + GROUP BY |
| 53 | Departments With High Earners | Med | 8 | 7 | 9 | **24** | EXISTS pattern |
| 36 | Genres Without Blockbusters | Med | 8 | 8 | 8 | **24** | NOT IN subquery |
| 14 | Department Salary Range | Med | 9 | 7 | 8 | **24** | MIN/MAX combo |
| 18 | Dept with Highest Avg Salary | Hard | 9 | 6 | 8 | **23** | Simple but useful |
| 12 | Customer Orders | Med | 8 | 7 | 8 | **23** | First JOIN, foundational |
| 10 | Prolific Directors | Med | 8 | 8 | 7 | **23** | Good HAVING example |
| 8 | High Earning Departments | Med | 8 | 6 | 8 | **22** | First HAVING |
| 27 | Combine High and Low Earners | Med | 7 | 7 | 8 | **22** | UNION needed |
| 52 | Order Completion Rate | Med | 8 | 7 | 8 | **23** | Rate calculation |
| 32 | Extract Title from Name | Med | 7 | 8 | 8 | **23** | String parsing, tricky |
| 39 | Email Domain Extraction | Hard | 7 | 8 | 8 | **23** | Practical string skill |
| 44 | Employee Tenure in Years | Med | 7 | 8 | 7 | **22** | Date calculation |

---

### ⚠️ NEEDS IMPROVEMENT (Score 18-21)

| ID | Title | Diff | Q | E | T | Total | Problems | Suggested Fix |
|----|-------|------|---|---|---|-------|----------|---------------|
| 1 | Surviving Passengers | Easy | 7 | 6 | 5 | **18** | Uses SELECT *, too basic | Require specific columns, add context |
| 2 | Top 5 Highest Rated Movies | Easy | 8 | 7 | 6 | **21** | Generic, predictable | Add tiebreaker requirement |
| 3 | Female Passengers | Easy | 7 | 4 | 5 | **16** | Boring filter, no insight | Add survival analysis context |
| 4 | Expensive Products | Easy | 8 | 5 | 6 | **19** | Very basic | Add business context |
| 5 | Unique Movie Genres | Easy | 8 | 5 | 6 | **19** | DISTINCT is trivial | Ask to count movies per genre |
| 7 | Avg Rating by Genre | Med | 8 | 7 | 6 | **21** | Similar to #6 | Add MIN/MAX or filter |
| 11 | Avg Salary by Dept | Med | 7 | 5 | 6 | **18** | Repetitive of #8 | Merge or differentiate |
| 25 | Handle Missing Fares | Med | 8 | 6 | 7 | **21** | Good concept, dry | Add data quality scenario |
| 31 | Fix Passenger Names | Easy | 7 | 4 | 5 | **16** | UPPER() is trivial | Make multi-step |
| 33 | Product Name Length | Easy | 7 | 4 | 5 | **16** | LENGTH() trivial | Find specific patterns |
| 34 | Combine First and Last Port | Easy | 7 | 5 | 6 | **18** | Concat is basic | Add conditional logic |
| 35 | Find Passengers by Pattern | Med | 7 | 6 | 7 | **20** | LIKE patterns | Add case-insensitive |
| 37 | Replace Category Names | Med | 7 | 5 | 6 | **18** | REPLACE is simple | Data migration scenario |
| 38 | Parse Last Name | Hard | 7 | 6 | 7 | **20** | Good but niche | Add validation |
| 41 | Employees Earning > Managers | Med | 8 | 7 | 6 | **21** | Duplicate of #17! | Remove or differentiate |
| 42 | Employees Without Managers | Easy | 8 | 6 | 6 | **20** | IS NULL too easy | Add hierarchy level |
| 45 | Employees Hired in 2020 | Easy | 8 | 5 | 5 | **18** | Too straightforward | Add comparison |
| 46 | Hires Per Month | Med | 7 | 6 | 7 | **20** | Decent | Add YoY comparison |
| 54 | Consecutive IDs | Hard | 6 | 5 | 7 | **18** | Artificial scenario | Better real use case |
| 55 | Movies Above Avg Runtime | Easy | 8 | 6 | 7 | **21** | Good intro to subquery | Keep but easy category |

---

## 🔴 Critical Issues Found

### 1. **Duplicate Challenge (#41 = #17)**
Challenge #41 "Employees Earning More Than Managers" is identical to #17. Remove or differentiate.

### 2. **SELECT * Anti-pattern (#1)**
```sql
-- Current (bad practice):
SELECT * FROM passengers WHERE survived = 1

-- Should require:
SELECT name, age, pclass FROM passengers WHERE survived = 1
```

### 3. **Too Many Trivial String Challenges**
Challenges #31, #33, #34, #37 are all very basic string operations. Consolidate into 2 meaningful challenges.

### 4. **Missing Important Patterns**
No challenges for:
- **Duplicate detection** (GROUP BY HAVING COUNT > 1)
- **Gaps in sequences** (common interview)
- **Pivot/unpivot** concepts
- **COALESCE in calculations** (real NULL handling)
- **Multiple table JOINs** (3+ tables)

### 5. **Difficulty Mislabeling**
| ID | Current | Should Be | Reason |
|----|---------|-----------|--------|
| 16 | Hard | Medium | Subquery version is simpler than window |
| 18 | Hard | Medium | Just ORDER BY LIMIT 1 |
| 55 | Easy | Easy | Correct ✓ |
| 38 | Hard | Medium | String parsing isn't that complex |

---

## 📈 Recommended Improvements

### Immediate Fixes

#### 1. Fix Challenge #1 (SELECT *)
```javascript
// Before
solution: "SELECT * FROM passengers WHERE survived = 1"

// After  
description: "The rescue ship captain needs a manifest. Find the **name, age, and ticket class** of all survivors.",
solution: "SELECT name, age, pclass FROM passengers WHERE survived = 1"
```

#### 2. Add Context to #3 (Female Passengers)
```javascript
// Before
description: "Find all female passengers. Return their name and age."

// After
description: "A historian researching the 'Women and Children First' protocol needs to analyze female passengers. Find their **name, age, and survival status** to see if age affected survival chances among women.",
solution: "SELECT name, age, survived FROM passengers WHERE sex = 'female' ORDER BY survived DESC, age"
```

#### 3. Remove Duplicate #41
Delete challenge #41 since #17 already covers "Employees earning more than manager" with better description.

#### 4. Consolidate String Challenges
Merge #31, #33, #34 into one multi-step challenge:
```javascript
{
  id: 31,
  title: "Data Cleaning Pipeline",
  difficulty: "Medium",
  description: "Clean the passenger manifest by: 1) Extracting last name, 2) Converting to uppercase, 3) Creating a ticket label. Return passenger_id, last_name_upper, and ticket_label (format: 'CLASS-ID').",
  solution: "SELECT passenger_id, UPPER(SUBSTR(name, 1, INSTR(name, ',')-1)) as last_name_upper, pclass || '-' || passenger_id as ticket_label FROM passengers LIMIT 20"
}
```

### New Challenges to Add

#### A. Find Duplicate Emails (Easy - Missing Pattern!)
```javascript
{
  id: 56,
  title: "Find Duplicate Emails",
  difficulty: "Easy",
  category: "GROUP BY + HAVING",
  description: "Write a SQL query to find all **duplicate email addresses** in the customers table. Return the email and how many times it appears.",
  hint: "GROUP BY email, HAVING COUNT(*) > 1",
  solution: "SELECT email, COUNT(*) as count FROM customers GROUP BY email HAVING COUNT(*) > 1",
  dataset: "ecommerce"
}
```

#### B. Customers with Multiple Orders (Medium)
```javascript
{
  id: 57,
  title: "Repeat Customers",
  difficulty: "Medium",
  category: "JOIN + GROUP BY + HAVING",
  description: "Find customers who have placed **3 or more orders**. Return customer name, email, and order count.",
  solution: "SELECT c.name, c.email, COUNT(o.order_id) as order_count FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id HAVING COUNT(o.order_id) >= 3 ORDER BY order_count DESC"
}
```

#### C. Department Budget Analysis (Hard - Multi-Table)
```javascript
{
  id: 58,
  title: "Department Budget Analysis",
  difficulty: "Hard",
  category: "Multiple JOINs + Aggregation",
  description: "Calculate total salary cost per department and compare to a budget of $500k. Show department, total_salary, budget ($500k), and variance (budget - total).",
  solution: "SELECT department, SUM(salary) as total_salary, 500000 as budget, 500000 - SUM(salary) as variance FROM employees GROUP BY department ORDER BY variance"
}
```

#### D. Find Gaps in IDs (Hard - Interview Classic)
```javascript
{
  id: 59,
  title: "Missing Employee IDs",
  difficulty: "Hard",
  category: "Self-Join / Gaps",
  description: "Find all **missing employee IDs** in the sequence. If emp_ids are 1,2,4,5,8, return 3,6,7.",
  hint: "Generate a sequence or use self-join to find gaps",
  solution: "WITH RECURSIVE seq AS (SELECT 1 as n UNION ALL SELECT n+1 FROM seq WHERE n < (SELECT MAX(emp_id) FROM employees)) SELECT n as missing_id FROM seq WHERE n NOT IN (SELECT emp_id FROM employees)"
}
```

---

## 📊 Summary Statistics

### Current State
| Tier | Count | % |
|------|-------|---|
| 🏆 Top Tier (25+) | 11 | 20% |
| ✅ Good (22-24) | 24 | 44% |
| ⚠️ Needs Work (18-21) | 18 | 33% |
| ❌ Remove/Rewrite | 2 | 3% |

### By Difficulty
| Difficulty | Count | Avg Score |
|------------|-------|-----------|
| Easy | 10 | 18.5 |
| Medium | 26 | 22.3 |
| Hard | 19 | 25.1 |

### By Category Coverage
| Category | Count | Notes |
|----------|-------|-------|
| SELECT/WHERE | 5 | Adequate |
| GROUP BY | 6 | Good |
| HAVING | 4 | Good |
| JOIN | 6 | Need multi-table |
| Subquery | 5 | Good |
| Window Functions | 8 | Excellent |
| String Functions | 7 | Too many trivial |
| NULL Handling | 2 | **Need more** |
| Date Functions | 3 | Adequate |
| Self-Join | 4 | Good |
| UNION | 1 | Need 1 more |
| EXISTS | 1 | Need 1 more |

---

## 🎯 Priority Action Items

### P0 - Critical (Do First)
1. ✏️ **Fix #1** - Remove SELECT *, require specific columns
2. 🗑️ **Remove #41** - Duplicate of #17
3. ✏️ **Fix difficulty labels** - #16, #18, #38

### P1 - High (This Sprint)
4. ✏️ **Add context to boring challenges** - #3, #4, #5
5. 🔀 **Consolidate string challenges** - Merge #31, #33, #34
6. ➕ **Add "Find Duplicates" challenge** - Missing essential pattern
7. ➕ **Add multi-table JOIN challenge** - Only 2-table JOINs exist

### P2 - Medium (Next Sprint)
8. ➕ Add 2-3 more NULL handling challenges
9. ✏️ Add tiebreaker requirements to ranking challenges
10. ➕ Add one EXISTS/NOT EXISTS challenge
11. ✏️ Improve hints with "why" not just "how"

### P3 - Polish (Backlog)
12. Add alternative solutions to each challenge
13. Add "common mistakes" section
14. Add difficulty progression within categories
15. Add estimated completion time

---

## File Location
`src/data/challenges.js`

