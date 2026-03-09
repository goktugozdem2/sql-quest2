# SQL Quest - Warm-Up Questions Quality Analysis

## Scoring Criteria (1-10 scale)

| Criteria | Weight | Description |
|----------|--------|-------------|
| **Quality** | 35% | Accurate, unambiguous, single correct answer |
| **Engagement** | 30% | Interesting, relevant, not boring/obvious |
| **Teaching** | 35% | Tests important concept, builds real knowledge |

---

## 📊 Summary by Topic

| Topic | Questions | Avg Score | Issues |
|-------|-----------|-----------|--------|
| SELECT Basics | 10 | 6.8 | Some too easy, some obscure |
| Filter & Sort | 10 | 7.5 | Good coverage, clear |
| GROUP BY | 10 | 7.2 | Some repetitive |
| Aggregation | 10 | 7.0 | Good but predictable |
| JOIN Tables | 10 | 7.8 | Strong practical focus |
| Subqueries | 10 | 7.5 | Good progression |
| Window Functions | 10 | 8.2 | Excellent teaching value |
| String Functions | 10 | 6.5 | Too easy, mechanical |
| Date Functions | 5 | 6.0 | SQLite-specific, limited |
| CASE Statements | 5 | 7.0 | Solid basics |
| Advanced | 10 | 7.8 | Good variety |

---

## 🏆 TOP TIER (Score 8-10) - Keep As-Is

| ID | Question | Q | E | T | Score | Why It's Great |
|----|----------|---|---|---|-------|----------------|
| w17 | Employees earning more than manager | 9 | 9 | 10 | **9.3** | Classic interview, self-join |
| w60 | LEFT JOIN common mistake | 9 | 9 | 9 | **9.0** | Teaches real gotcha |
| w76 | Window functions in WHERE | 8 | 9 | 9 | **8.7** | Important limitation |
| w63 | Correlated subquery | 9 | 8 | 9 | **8.7** | Key concept, well-phrased |
| w46 | Non-grouped column error | 9 | 8 | 9 | **8.7** | Common mistake |
| w97 | NULL = NULL | 9 | 9 | 9 | **9.0** | Gotcha question, memorable |
| w67 | JOIN vs subquery performance | 8 | 9 | 9 | **8.7** | Nuanced, practical |
| w73 | SUM() OVER() | 8 | 8 | 9 | **8.3** | Tests understanding |
| w74 | Window function row reduction | 9 | 8 | 9 | **8.7** | Key distinction |
| w93 | Recursive CTE use case | 8 | 9 | 9 | **8.7** | Real-world scenario |

---

## ✅ GOOD (Score 6.5-7.9) - Minor Improvements

| ID | Question | Score | Issue | Fix |
|----|----------|-------|-------|-----|
| w1 | SELECT keyword | 6.5 | Too easy | Make harder: "Which retrieves specific columns?" |
| w4 | COUNT(*) | 6.5 | Too obvious | Add nuance about NULL handling |
| w5 | INNER JOIN | 7.0 | Good | ✓ Keep |
| w8 | GROUP BY | 7.0 | Straightforward | Add "with same values in specified columns" |
| w12 | LEFT JOIN | 7.5 | Good | ✓ Keep |
| w15 | What is subquery | 7.0 | Definition-only | Test with example instead |
| w19 | WHERE vs HAVING | 8.0 | Excellent | ✓ Keep |
| w20 | ROW_NUMBER() | 7.5 | Good | ✓ Keep |
| w22 | CASE WHEN | 7.0 | Basic | Add complexity |
| w28 | PARTITION BY | 7.5 | Good | ✓ Keep |
| w35 | SQL clause order | 8.0 | Practical | ✓ Keep |
| w50 | Aliases in GROUP BY | 8.0 | Database-aware | ✓ Excellent |

---

## ⚠️ NEEDS IMPROVEMENT (Score 5-6.4)

| ID | Question | Score | Problem | Suggested Rewrite |
|----|----------|-------|---------|-------------------|
| w7 | DISTINCT keyword | 5.5 | Too easy | "What does `SELECT DISTINCT a, b` consider unique?" → Options: "Column a only", "Column b only", "Combination of a and b", "Either a or b" |
| w9 | MAX() function | 5.0 | Trivial | "MAX(col) with NULL values..." → Tests NULL handling |
| w21 | COUNT(*) vs COUNT(col) | 6.0 | Good concept, boring phrasing | "Your table has 100 rows, 20 have NULL in 'email'. What does COUNT(email) return?" → 80 |
| w25 | SUBSTR | 5.5 | Mechanical | "Which extracts 'SQL' from 'NoSQL Database'?" |
| w29 | UPPER() | 5.0 | Too trivial | Remove or combine with other string functions |
| w31 | Fix Passenger Names | 5.0 | Too easy | Combine into string manipulation scenario |
| w36 | SELECT * | 5.5 | Basic | "Why might SELECT * be bad practice?" |
| w77 | CONCAT | 5.0 | Trivial | Test multi-value concat with NULL |
| w78 | LENGTH | 5.0 | Trivial | Test with multi-byte characters |
| w79 | TRIM | 5.0 | Trivial | Test LTRIM vs RTRIM vs TRIM |
| w81 | LOWER | 5.0 | Trivial | Remove or combine |

---

## ❌ NEEDS REPLACEMENT (Score <5)

| ID | Question | Score | Problem | Replacement |
|----|----------|-------|---------|-------------|
| w40 | SELECT 1+1 | 4.0 | Pointless | "What type does `SELECT 1 + '2'` return in SQLite?" |
| w84 | CURRENT_DATE | 4.5 | Too obvious | "How do you get the first day of current month?" |
| w85 | Extract year | 4.5 | SQLite-specific | Make database-agnostic or remove |
| w86 | DATE_DIFF | 4.0 | Not standard SQL | "How do you calculate days between dates in SQLite?" |
| w100 | VACUUM in SQLite | 4.0 | Too niche | Replace with more universal concept |

---

## 🔄 Suggested Rewrites

### Transform Trivial → Tricky

**Before (w78):**
> What does LENGTH('SQL') return?
> Options: 2, 3, 4, SQL

**After:**
> What does LENGTH('Café') return in SQLite?
> Options: 4, 5, 6, Error
> (Answer: 5 - counts bytes, not characters)

---

**Before (w21):**
> Which aggregate function ignores NULL values?
> Options: COUNT(*), COUNT(column), Both, Neither

**After:**
> A table has 100 rows. Column 'email' has 80 values and 20 NULLs.
> What does `SELECT COUNT(*), COUNT(email)` return?
> Options: 100, 80 | 80, 80 | 100, 100 | 80, 100
> (Answer: 100, 80)

---

### Add Real-World Context

**Before (w3):**
> Which clause filters rows AFTER grouping?
> Options: WHERE, LIMIT, HAVING, FILTER

**After:**
> You want sales by region, but only show regions with >$1M total.
> Which clause filters AFTER the totals are calculated?
> Options: WHERE total > 1000000, HAVING total > 1000000, LIMIT BY total, FILTER total > 1000000

---

### Test Application, Not Definition

**Before (w15):**
> What is a subquery?
> Options: A backup query, A query inside another query, A query that runs twice, A query on multiple tables

**After:**
> Which query finds employees earning above average?
> Options: 
> - SELECT * FROM emp WHERE salary > AVG(salary)
> - SELECT * FROM emp WHERE salary > (SELECT AVG(salary) FROM emp)
> - SELECT * FROM emp HAVING salary > AVG(salary)
> - SELECT * FROM emp GROUP BY salary > AVG(salary)

---

## 📈 Recommended New Questions

### High-Value Additions

| Topic | Question | Why Needed |
|-------|----------|------------|
| JOIN | "What happens in LEFT JOIN when no match?" → Returns NULL for right table | Common confusion |
| GROUP BY | "Can you SELECT columns not in GROUP BY or aggregate?" → No (usually) | Interview staple |
| Subqueries | "Which is equivalent to `IN (SELECT...)`?" → EXISTS... | Important equivalence |
| Window | "RANK vs DENSE_RANK with ties: 1,1,?,4 vs 1,1,?,3" → 3 vs 2 | Practical |
| NULL | "What does `WHERE col <> 'A'` exclude?" → NULL rows too! | Gotcha |
| Performance | "Which can use an index: LIKE 'abc%' or LIKE '%abc'?" → First | Real optimization |
| Joins | "A has 3 rows, B has 4. CROSS JOIN returns how many?" → 12 | Math check |

---

## 📊 Topic Balance Analysis

Current distribution is good, but:

### Under-represented (Add More)
- **NULL handling** - Only 3 questions, need 5+
- **Query optimization** - 1 question, need 3+
- **Error scenarios** - 2 questions, need 4+

### Over-represented (Can Reduce)
- **Basic string functions** - 10 questions, many trivial
- **Simple SELECT** - Could combine some

---

## 🎯 Priority Actions

### Immediate (High Impact, Easy)
1. ✏️ Rewrite w21 (COUNT NULL handling) - More specific scenario
2. ✏️ Rewrite w36 (SELECT *) - Ask WHY it's bad practice
3. ✏️ Rewrite w40 (SELECT 1+1) - Make it about type coercion
4. 🗑️ Remove w100 (VACUUM) - Too SQLite-specific

### Short-term (Medium Impact)
5. 🔀 Combine string function questions (w77, w78, w79, w81) into 2 scenario-based
6. ➕ Add 3 NULL-handling gotcha questions
7. ➕ Add 2 performance/index questions
8. ✏️ Make date questions database-agnostic

### Long-term (Polish)
9. Add difficulty ratings (Easy/Medium/Hard) to each question
10. Add explanations for wrong answers
11. Create "Why?" follow-up for each question

---

## File Location
Questions are in: `src/app.jsx` (lines ~2785-2910)

Consider moving to: `src/data/warmup-questions.js` for easier maintenance.

