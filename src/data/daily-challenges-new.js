// SQL Quest - Daily Challenges (3-Step Format) - V2 (Improved)
// Format: Warm-up (MCQ) → Core Challenge (SQL) → Insight Check (MCQ)
// Weekly Rhythm: Mon=Easy, Tue=Easy-Med, Wed=Med, Thu=Med-Hard, Fri=Med, Sat=Debug, Sun=Interview

window.dailyChallengesData = [
  // ========== WEEK 1: Foundations ==========

  // Day 1 - Monday (Easy: SELECT/WHERE)
  {
    id: 1,
    day: 'Monday',
    difficulty: 'Easy',
    topic: 'SELECT & WHERE',
    avgSolveTime: 3,
    solveRate: 85,

    warmup: {
      type: 'mcq',
      question: 'Which SQL clause is used to filter rows BEFORE grouping?',
      options: ['HAVING', 'WHERE', 'ORDER BY', 'GROUP BY'],
      correct: 1,
      explanation: 'WHERE filters rows before any grouping. HAVING filters after GROUP BY.'
    },

    core: {
      title: 'Wealthy Survivor Profile',
      description: 'A historian studying the "women and children first" evacuation wants data on **wealthy survivors**. Find all **first class passengers** (pclass = 1) who **survived** (survived = 1). Show their **name**, **sex**, **age**, and **fare**. Then order by fare descending so the highest-paying survivors appear first.',
      dataset: 'titanic',
      hint: 'WHERE pclass = 1 AND survived = 1 — then ORDER BY fare DESC to rank by wealth',
      solution: "SELECT name, sex, age, fare FROM passengers WHERE pclass = 1 AND survived = 1 ORDER BY fare DESC",
      concept: 'Multi-condition WHERE with ORDER BY'
    },

    insight: {
      type: 'mcq',
      question: 'To also find out the AVERAGE fare paid by first-class survivors, which addition is correct?',
      options: [
        'Add AVG(fare) to the SELECT list as-is',
        'Wrap the query as a subquery and use SELECT AVG(fare) FROM (...)',
        'Replace ORDER BY with GROUP BY fare',
        'Use HAVING AVG(fare)'
      ],
      correct: 1,
      explanation: 'Adding AVG(fare) to a non-aggregated SELECT causes an error (mixing aggregate and non-aggregate). To get both individual rows AND the average, use a subquery or window function: SELECT *, AVG(fare) OVER () AS overall_avg FROM passengers WHERE ...'
    }
  },

  // Day 2 - Tuesday (Easy: JOIN)
  {
    id: 2,
    day: 'Tuesday',
    difficulty: 'Easy',
    topic: 'JOIN Basics',
    avgSolveTime: 4,
    solveRate: 72,

    warmup: {
      type: 'truefalse',
      question: 'INNER JOIN returns all rows from both tables, even without matches.',
      correct: false,
      explanation: 'INNER JOIN only returns rows with matches in BOTH tables. LEFT JOIN keeps all from the left table.'
    },

    core: {
      title: 'Gold Member Spending',
      description: 'The marketing team needs a report on loyal customers. Show each **Gold member\'s name** and the **total amount they\'ve spent** (quantity × price). Sort by total spent descending.',
      dataset: 'ecommerce',
      hint: 'JOIN customers with orders, filter membership = "Gold", use SUM(quantity * price)',
      solution: "SELECT c.name, SUM(o.quantity * o.price) as total_spent FROM customers c JOIN orders o ON c.customer_id = o.customer_id WHERE c.membership = 'Gold' GROUP BY c.customer_id, c.name ORDER BY total_spent DESC",
      concept: 'JOIN with WHERE filter and aggregation'
    },

    insight: {
      type: 'mcq',
      question: 'If you move the membership filter from WHERE to ON in JOIN, what changes?',
      options: [
        'Nothing — identical results',
        'With INNER JOIN: same results. With LEFT JOIN: different results',
        'Always different results',
        'Syntax error'
      ],
      correct: 1,
      explanation: 'For INNER JOIN, WHERE vs ON filtering gives same results. But with LEFT JOIN, ON keeps non-matching rows while WHERE filters them out.'
    }
  },

  // Day 3 - Wednesday (Medium: GROUP BY & HAVING)
  {
    id: 3,
    day: 'Wednesday',
    difficulty: 'Medium',
    topic: 'GROUP BY & HAVING',
    avgSolveTime: 5,
    solveRate: 65,

    warmup: {
      type: 'mcq',
      question: 'Which runs FIRST in SQL execution order?',
      options: ['SELECT', 'WHERE', 'GROUP BY', 'HAVING'],
      correct: 1,
      explanation: 'Execution order: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY'
    },

    core: {
      title: 'Hidden Gem Directors',
      description: 'Find directors who consistently make quality films. Show directors with **3 or more movies** that have an **average rating above 7.5**. Display director, movie count, and average rating. Sort by avg rating descending.',
      dataset: 'movies',
      hint: 'GROUP BY director, use HAVING for both count and average conditions',
      solution: "SELECT director, COUNT(*) as movie_count, ROUND(AVG(rating), 2) as avg_rating FROM movies GROUP BY director HAVING COUNT(*) >= 3 AND AVG(rating) > 7.5 ORDER BY avg_rating DESC",
      concept: 'Multiple HAVING conditions'
    },

    insight: {
      type: 'mcq',
      question: 'Why can\'t we use WHERE AVG(rating) > 7.5?',
      options: [
        'WHERE doesn\'t support decimal numbers',
        'Aggregate functions haven\'t been calculated when WHERE runs',
        'It\'s just a syntax preference — both work',
        'WHERE only works with equality checks'
      ],
      correct: 1,
      explanation: 'WHERE runs before GROUP BY, so aggregate functions like AVG() haven\'t been calculated yet. Use HAVING for aggregate conditions.'
    }
  },

  // Day 4 - Thursday (Hard: Subqueries)
  {
    id: 4,
    day: 'Thursday',
    difficulty: 'Hard',
    topic: 'Subqueries',
    avgSolveTime: 6,
    solveRate: 55,

    warmup: {
      type: 'truefalse',
      question: 'A subquery in WHERE must always return exactly one value.',
      correct: false,
      explanation: 'With IN, ANY, or ALL, subqueries can return multiple values. Only with =, >, < do you need one value (scalar subquery).'
    },

    core: {
      title: 'Underpaid Departments',
      description: 'HR wants to find employees earning **less than their own department\'s average salary**. Show the employee name, department, salary, and use a **correlated subquery** to compare against department average.',
      dataset: 'employees',
      hint: 'WHERE salary < (SELECT AVG(salary) FROM employees e2 WHERE e2.department = e1.department)',
      solution: "SELECT e1.name, e1.department, e1.salary FROM employees e1 WHERE e1.salary < (SELECT AVG(salary) FROM employees e2 WHERE e2.department = e1.department)",
      concept: 'Correlated subquery'
    },

    insight: {
      type: 'mcq',
      question: 'How does a correlated subquery differ from a regular subquery?',
      options: [
        'It runs once for the entire query',
        'It references columns from the outer query and re-runs for each row',
        'It must use EXISTS',
        'It\'s faster than a regular subquery'
      ],
      correct: 1,
      explanation: 'A correlated subquery references the outer query and executes once per outer row. Regular subqueries run independently just once.'
    }
  },

  // Day 5 - Friday (Medium: CASE)
  {
    id: 5,
    day: 'Friday',
    difficulty: 'Medium',
    topic: 'Conditional Aggregation',
    avgSolveTime: 5,
    solveRate: 68,

    warmup: {
      type: 'mcq',
      question: 'What does CASE return if no conditions match and there\'s no ELSE?',
      options: ['0', 'Empty string', 'NULL', 'Error'],
      correct: 2,
      explanation: 'Without ELSE, unmatched CASE returns NULL. Always include ELSE to be explicit.'
    },

    core: {
      title: 'Survival Dashboard',
      description: 'Build a single-row survival dashboard for the Titanic. Show: **total passengers**, **count survived**, **count died**, and **survival rate as a percentage** (round to 1 decimal).',
      dataset: 'titanic',
      hint: 'Use SUM(CASE WHEN survived = 1 THEN 1 ELSE 0 END) for conditional counting',
      solution: "SELECT COUNT(*) as total, SUM(CASE WHEN survived = 1 THEN 1 ELSE 0 END) as survived, SUM(CASE WHEN survived = 0 THEN 1 ELSE 0 END) as died, ROUND(100.0 * SUM(CASE WHEN survived = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) as survival_pct FROM passengers",
      concept: 'CASE inside aggregation (conditional aggregation)'
    },

    insight: {
      type: 'mcq',
      question: 'Why use 100.0 instead of 100 when calculating percentage?',
      options: [
        'No difference, just style',
        'Forces floating-point division instead of integer division',
        'Required by SQLite syntax',
        'Prevents NULL results'
      ],
      correct: 1,
      explanation: 'In SQL, integer / integer = integer (truncated). 100.0 forces decimal division: 100.0 * 3/7 = 42.86, but 100 * 3/7 = 42.'
    }
  },

  // Day 6 - Saturday (Debug)
  {
    id: 6,
    day: 'Saturday',
    difficulty: 'Mixed',
    topic: 'Debug Challenge',
    avgSolveTime: 4,
    solveRate: 60,

    warmup: {
      type: 'debug',
      question: 'This query should find customers with no orders. What\'s wrong?',
      code: 'SELECT c.name\nFROM customers c\nLEFT JOIN orders o ON c.customer_id = o.customer_id\nWHERE o.order_id = NULL;',
      options: [
        'LEFT JOIN should be RIGHT JOIN',
        'Must use IS NULL, not = NULL',
        'Missing GROUP BY',
        'Should use NOT EXISTS instead'
      ],
      correct: 1,
      explanation: 'NULL cannot be compared with =. Always use IS NULL or IS NOT NULL.'
    },

    core: {
      title: 'Inactive Customer Analysis',
      description: 'Find all customers who have **never placed any order**. Show their **name**, **email**, **membership level**, and how long they\'ve been registered. Calculate **days_since_signup** as the difference between today and their signup_date using julianday(). Sort by days_since_signup descending — oldest unactivated accounts first.',
      dataset: 'ecommerce',
      hint: 'LEFT JOIN and filter WHERE order_id IS NULL. Use CAST(julianday(\'now\') - julianday(signup_date) AS INTEGER) for days.',
      solution: "SELECT c.name, c.email, c.membership, CAST(julianday('now') - julianday(c.signup_date) AS INTEGER) AS days_since_signup FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id WHERE o.order_id IS NULL ORDER BY days_since_signup DESC",
      concept: 'LEFT JOIN anti-join with date arithmetic'
    },

    insight: {
      type: 'mcq',
      question: 'Three methods to find "rows with no match." Which is NULL-safe AND avoids a full table scan of the subquery?',
      options: [
        'NOT IN (SELECT ...) — simple but fails with NULLs',
        'LEFT JOIN ... WHERE key IS NULL — good and readable',
        'NOT EXISTS (SELECT 1 ...) — NULL-safe, short-circuits at first match',
        'All three perform identically'
      ],
      correct: 2,
      explanation: 'NOT EXISTS is the gold standard: it handles NULLs correctly (unlike NOT IN) and stops processing as soon as a non-match is confirmed. LEFT JOIN IS NULL is readable but scans more rows. NOT IN silently returns empty results if any subquery row is NULL.'
    }
  },

  // Day 7 - Sunday (Interview)
  {
    id: 7,
    day: 'Sunday',
    difficulty: 'Hard',
    topic: 'Interview Challenge',
    avgSolveTime: 8,
    solveRate: 45,
    isOptional: true,

    warmup: {
      type: 'mcq',
      question: 'In a SQL interview, what should you do FIRST?',
      options: [
        'Start coding immediately',
        'Ask clarifying questions about requirements and edge cases',
        'Optimize for performance',
        'Write test cases'
      ],
      correct: 1,
      explanation: 'Always clarify requirements, edge cases, and expected output before writing any SQL.'
    },

    core: {
      title: 'Nth Highest Salary — the DENSE_RANK way',
      description: 'Find the **3rd highest distinct salary** in the company. Return a single column called **third_highest**. Ties count as one rank: if two people earn $120K, the next distinct value is rank 2, not rank 3. Write the solution using **DENSE_RANK** — the approach every senior interviewer expects.',
      dataset: 'employees',
      hint: 'SELECT DISTINCT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk ... then filter WHERE rnk = 3',
      solution: "SELECT salary AS third_highest FROM (SELECT DISTINCT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM employees) WHERE rnk = 3",
      alternativeSolution: "SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees))",
      concept: 'DENSE_RANK for Nth distinct value — the reusable interview pattern'
    },

    insight: {
      type: 'mcq',
      question: 'You need the 5th highest salary. To change the DENSE_RANK solution, what is the ONLY thing that needs to change?',
      options: [
        'Change ORDER BY salary DESC to ASC',
        'Change WHERE rnk = 3 to WHERE rnk = 5',
        'Add LIMIT 5',
        'Change DENSE_RANK to ROW_NUMBER'
      ],
      correct: 1,
      explanation: 'The DENSE_RANK pattern is parameterizable — just change the rank filter. This is why interviewers prefer it: one reusable pattern handles any Nth value, handles ties correctly, and returns NULL when the Nth rank doesn\'t exist.'
    }
  },

  // ========== WEEK 2: Intermediate SQL ==========

  // Day 8 - Monday (Easy)
  {
    id: 8,
    day: 'Monday',
    difficulty: 'Easy',
    topic: 'COALESCE & Defaults',
    avgSolveTime: 3,
    solveRate: 82,

    warmup: {
      type: 'mcq',
      question: 'What does COALESCE(NULL, NULL, 42, 99) return?',
      options: ['NULL', '42', '99', 'Error'],
      correct: 1,
      explanation: 'COALESCE returns the FIRST non-NULL value. It skips the two NULLs and returns 42.'
    },

    core: {
      title: 'Passenger Data Quality Audit',
      description: 'Analyse what we know vs don\'t know about passengers. Classify each passenger into an **age_group**: `"Child"` (age < 18), `"Adult"` (18–60), `"Senior"` (age > 60), or `"Unknown"` (age IS NULL — use COALESCE). For each group show: **age_group**, **passenger_count**, **survival_rate** (% survived, 1 decimal), and **avg_fare** (2 decimals). Sort by passenger_count descending.',
      dataset: 'titanic',
      hint: 'COALESCE(CASE WHEN age < 18 ... END, \'Unknown\') — or use CASE WHEN age IS NULL first, then the age ranges',
      solution: "SELECT CASE WHEN age IS NULL THEN 'Unknown' WHEN age < 18 THEN 'Child' WHEN age <= 60 THEN 'Adult' ELSE 'Senior' END AS age_group, COUNT(*) AS passenger_count, ROUND(100.0 * SUM(survived) / COUNT(*), 1) AS survival_rate, ROUND(AVG(COALESCE(fare, 0)), 2) AS avg_fare FROM passengers GROUP BY age_group ORDER BY passenger_count DESC",
      concept: 'CASE WHEN + COALESCE + conditional aggregation for data quality analysis'
    },

    insight: {
      type: 'mcq',
      question: 'COALESCE(fare, 0) in AVG() changes the result compared to AVG(fare). Why?',
      options: [
        'No difference — AVG ignores NULLs either way',
        'COALESCE(fare, 0) turns NULLs into 0s which ARE included in AVG, lowering the average',
        'COALESCE makes AVG run faster',
        'AVG(fare) would error without COALESCE'
      ],
      correct: 1,
      explanation: 'AVG(fare) ignores NULLs — only non-NULL fares contribute. AVG(COALESCE(fare, 0)) replaces NULLs with 0, which do count, dragging the average down. Neither is "wrong" — the choice depends on whether missing fares should be treated as zero or excluded.'
    }
  },

  // Day 9 - Tuesday (Easy)
  {
    id: 9,
    day: 'Tuesday',
    difficulty: 'Easy',
    topic: 'DISTINCT & Counting',
    avgSolveTime: 4,
    solveRate: 75,

    warmup: {
      type: 'mcq',
      question: 'What does COUNT(DISTINCT column) do compared to COUNT(column)?',
      options: [
        'Same thing',
        'Counts all rows including NULL',
        'Counts only unique non-NULL values',
        'Counts NULL values only'
      ],
      correct: 2,
      explanation: 'COUNT(DISTINCT col) counts unique non-NULL values. COUNT(col) counts all non-NULL values (with duplicates).'
    },

    core: {
      title: 'Product Diversity Report',
      description: 'For each **country**, show the **number of unique products ordered** and the **number of unique categories**. Only include countries with orders in **3+ different categories**. Sort by product variety descending.',
      dataset: 'ecommerce',
      hint: 'Use COUNT(DISTINCT product) and COUNT(DISTINCT category) with HAVING',
      solution: "SELECT country, COUNT(DISTINCT product) as unique_products, COUNT(DISTINCT category) as unique_categories FROM orders GROUP BY country HAVING COUNT(DISTINCT category) >= 3 ORDER BY unique_products DESC",
      concept: 'Multiple COUNT DISTINCT in one query'
    },

    insight: {
      type: 'mcq',
      question: 'COUNT(*) vs COUNT(column) — which counts NULLs?',
      options: [
        'Both count NULLs',
        'Neither counts NULLs',
        'Only COUNT(*) counts rows with NULLs',
        'Only COUNT(column) counts NULLs'
      ],
      correct: 2,
      explanation: 'COUNT(*) counts all rows regardless. COUNT(column) skips NULLs in that column.'
    }
  },

  // Day 10 - Wednesday (Medium)
  {
    id: 10,
    day: 'Wednesday',
    difficulty: 'Medium',
    topic: 'Date Functions',
    avgSolveTime: 5,
    solveRate: 62,

    warmup: {
      type: 'mcq',
      question: 'In SQLite, how do you extract the year from a date?',
      options: ['YEAR(date)', 'strftime("%Y", date)', 'EXTRACT(YEAR FROM date)', 'date.year'],
      correct: 1,
      explanation: 'SQLite uses strftime(). %Y = 4-digit year, %m = month, %d = day.'
    },

    core: {
      title: 'Quarterly Sales Report',
      description: 'Build a quarterly breakdown for orders. Show the **quarter** (Q1, Q2, Q3, Q4 based on month), **total orders**, and **total revenue** (quantity × price). Sort by quarter.',
      dataset: 'ecommerce',
      hint: 'Use CASE with strftime("%m") to assign quarters, then GROUP BY',
      solution: "SELECT CASE WHEN CAST(strftime('%m', order_date) AS INTEGER) BETWEEN 1 AND 3 THEN 'Q1' WHEN CAST(strftime('%m', order_date) AS INTEGER) BETWEEN 4 AND 6 THEN 'Q2' WHEN CAST(strftime('%m', order_date) AS INTEGER) BETWEEN 7 AND 9 THEN 'Q3' ELSE 'Q4' END as quarter, COUNT(*) as total_orders, SUM(quantity * price) as total_revenue FROM orders GROUP BY quarter ORDER BY quarter",
      concept: 'Date extraction with CASE logic'
    },

    insight: {
      type: 'mcq',
      question: 'Why do we CAST strftime result to INTEGER for BETWEEN?',
      options: [
        'BETWEEN only works with integers',
        'strftime returns a string — "02" BETWEEN "1" AND "3" would fail for "10"+"11"+"12"',
        'Performance optimization',
        'SQLite requires it'
      ],
      correct: 1,
      explanation: 'strftime returns strings. String comparison: "10" < "3" (compares character by character). Cast to integer for correct numeric comparison.'
    }
  },

  // Day 11 - Thursday (Hard)
  {
    id: 11,
    day: 'Thursday',
    difficulty: 'Hard',
    topic: 'Self JOIN',
    avgSolveTime: 7,
    solveRate: 50,

    warmup: {
      type: 'mcq',
      question: 'A self JOIN is used when:',
      options: [
        'Joining tables from different databases',
        'A table has a hierarchical relationship within itself',
        'You need to join without any condition',
        'You want to duplicate all rows'
      ],
      correct: 1,
      explanation: 'Self JOINs handle hierarchies (employee → manager), comparisons within the same table, or finding pairs.'
    },

    core: {
      title: 'Manager Salary Comparison',
      description: 'Show each employee\'s **name**, **salary**, their **manager\'s name**, and **manager\'s salary**. Only include employees who earn **more than their manager**.',
      dataset: 'employees',
      hint: 'Self JOIN: employees e JOIN employees m ON e.manager_id = m.emp_id, then WHERE e.salary > m.salary',
      solution: "SELECT e.name as employee, e.salary as emp_salary, m.name as manager, m.salary as mgr_salary FROM employees e JOIN employees m ON e.manager_id = m.emp_id WHERE e.salary > m.salary",
      concept: 'Self JOIN with comparison filter'
    },

    insight: {
      type: 'mcq',
      question: 'Why are table aliases REQUIRED (not optional) in self JOINs?',
      options: [
        'For better query performance',
        'Just a style convention',
        'SQL can\'t distinguish which "copy" of the table a column belongs to',
        'Self JOINs always need exactly 2 aliases'
      ],
      correct: 2,
      explanation: 'Without aliases, SQL can\'t tell if "name" refers to the employee or the manager instance of the same table.'
    }
  },

  // Day 12 - Friday (Medium)
  {
    id: 12,
    day: 'Friday',
    difficulty: 'Medium',
    topic: 'NULL Handling',
    avgSolveTime: 5,
    solveRate: 64,

    warmup: {
      type: 'mcq',
      question: 'What does NULL = NULL return?',
      options: ['TRUE', 'FALSE', 'NULL (unknown)', 'Error'],
      correct: 2,
      explanation: 'NULL = NULL returns NULL (unknown). Nothing "equals" NULL. Use IS NULL to check for NULLs.'
    },

    core: {
      title: 'Fare Gap Analysis',
      description: 'Compare passengers **with known ages** vs **unknown ages** (NULL). For each group, show the **count**, **average fare**, and **survival rate** (% survived, rounded to 1 decimal).',
      dataset: 'titanic',
      hint: 'Use CASE WHEN age IS NULL THEN "Unknown" ELSE "Known" END to create groups',
      solution: "SELECT CASE WHEN age IS NULL THEN 'Unknown Age' ELSE 'Known Age' END as age_status, COUNT(*) as passengers, ROUND(AVG(fare), 2) as avg_fare, ROUND(100.0 * SUM(survived) / COUNT(*), 1) as survival_pct FROM passengers GROUP BY age_status",
      concept: 'Grouping and analyzing NULLs'
    },

    insight: {
      type: 'mcq',
      question: 'What does this return: SELECT 5 + NULL',
      options: [
        '5',
        '0',
        'NULL',
        'Error'
      ],
      correct: 2,
      explanation: 'Any arithmetic with NULL returns NULL. NULL is "unknown" — 5 + unknown = unknown. Use COALESCE to provide defaults.'
    }
  },

  // Day 13 - Saturday (Debug)
  {
    id: 13,
    day: 'Saturday',
    difficulty: 'Mixed',
    topic: 'Debug Challenge',
    avgSolveTime: 4,
    solveRate: 58,

    warmup: {
      type: 'debug',
      question: 'This query returns wrong results. Why?',
      code: 'SELECT department, name, salary\nFROM employees\nWHERE salary = MAX(salary);',
      options: [
        'MAX() requires GROUP BY',
        'Aggregate functions can\'t appear in WHERE',
        'Should use >= instead of =',
        'Missing ORDER BY'
      ],
      correct: 1,
      explanation: 'Aggregate functions like MAX() can\'t be used in WHERE. Use a subquery: WHERE salary = (SELECT MAX(salary) FROM employees).'
    },

    core: {
      title: 'Top Earner Per Department',
      description: 'Find the **highest-paid employee in each department**. Show department, employee name, and salary. If there\'s a tie, show all tied employees.',
      dataset: 'employees',
      hint: 'Use a subquery or CTE to find MAX salary per department, then match back',
      solution: "SELECT e.department, e.name, e.salary FROM employees e WHERE e.salary = (SELECT MAX(salary) FROM employees e2 WHERE e2.department = e.department)",
      concept: 'Correlated subquery for group maximum'
    },

    insight: {
      type: 'mcq',
      question: 'Which approach also solves "top earner per group" but in a single scan?',
      options: [
        'Multiple self-joins',
        'RANK() OVER (PARTITION BY department ORDER BY salary DESC)',
        'GROUP BY with MAX',
        'UNION ALL'
      ],
      correct: 1,
      explanation: 'Window functions with PARTITION BY process data in one pass. Filter WHERE rank = 1 to get top earners.'
    }
  },

  // Day 14 - Sunday (Interview)
  {
    id: 14,
    day: 'Sunday',
    difficulty: 'Hard',
    topic: 'Interview Challenge',
    avgSolveTime: 10,
    solveRate: 40,
    isOptional: true,

    warmup: {
      type: 'mcq',
      question: 'When an interviewer says "find duplicates," what should you clarify?',
      options: [
        'Nothing — the approach is always the same',
        'Which columns define a duplicate and whether to show all rows or just duplicate values',
        'Which database engine to use',
        'Whether to use JOIN or subquery'
      ],
      correct: 1,
      explanation: 'Clarify: which columns define duplicates? Show all duplicate rows or just the repeated values? Keep one copy or delete all?'
    },

    core: {
      title: 'Suspicious Order Patterns',
      description: 'Find customers who ordered the **exact same product more than once**. Show customer name, product, and how many times they ordered it. Sort by repeat count descending.',
      dataset: 'ecommerce',
      hint: 'JOIN customers with orders, GROUP BY customer + product, HAVING COUNT > 1',
      solution: "SELECT c.name, o.product, COUNT(*) as times_ordered FROM orders o JOIN customers c ON o.customer_id = c.customer_id GROUP BY c.customer_id, o.product HAVING COUNT(*) > 1 ORDER BY times_ordered DESC",
      concept: 'Finding duplicates with GROUP BY + HAVING'
    },

    insight: {
      type: 'mcq',
      question: 'To delete duplicate rows keeping only one copy, which approach is safest?',
      options: [
        'DELETE with GROUP BY',
        'ROW_NUMBER() to mark duplicates, then DELETE WHERE row_num > 1',
        'DELETE all then re-insert distinct rows',
        'Use DISTINCT in a DELETE statement'
      ],
      correct: 1,
      explanation: 'ROW_NUMBER() partitioned by duplicate columns lets you precisely identify which rows to keep (row_num = 1) and which to remove.'
    }
  },

  // ========== WEEK 3: Advanced Techniques ==========

  // Day 15 - Monday (Easy)
  {
    id: 15,
    day: 'Monday',
    difficulty: 'Easy',
    topic: 'String Functions',
    avgSolveTime: 3,
    solveRate: 82,

    warmup: {
      type: 'mcq',
      question: 'In SQLite, which operator concatenates strings?',
      options: ['+', '&', '||', 'CONCAT()'],
      correct: 2,
      explanation: 'SQLite uses || for concatenation: "Hello" || " " || "World". Many other databases support CONCAT().'
    },

    core: {
      title: 'Title Survival Analysis',
      description: 'Titanic passenger names embed social titles ("Mr.", "Mrs.", "Miss.", "Master.", "Dr." etc). Extract each passenger\'s **title** (the word between ", " and "."), then aggregate by title to show: **title**, **count**, **survival_rate** (% survived, 1 decimal), and **avg_fare** (2 decimals). Only show titles held by **3 or more passengers**. Sort by count descending. This is real ETL analysis — extracting a structured field from unstructured text to uncover social patterns.',
      dataset: 'titanic',
      hint: 'SUBSTR(name, INSTR(name, \', \') + 2, INSTR(SUBSTR(name, INSTR(name, \', \') + 2), \'.\') - 1) extracts the title — wrap in a subquery, then GROUP BY title with HAVING COUNT(*) >= 3',
      solution: "SELECT title, COUNT(*) AS count, ROUND(100.0 * SUM(survived) / COUNT(*), 1) AS survival_rate, ROUND(AVG(fare), 2) AS avg_fare FROM (SELECT SUBSTR(name, INSTR(name, ', ') + 2, INSTR(SUBSTR(name, INSTR(name, ', ') + 2), '.') - 1) AS title, survived, fare FROM passengers) GROUP BY title HAVING COUNT(*) >= 3 ORDER BY count DESC",
      concept: 'String parsing → subquery → GROUP BY aggregation pipeline'
    },

    insight: {
      type: 'mcq',
      question: 'The survival_rate by title reveals "Master." (young boys) survived at ~57% while "Mr." survived at ~16%. Why does this matter analytically?',
      options: [
        'It doesn\'t — title is just a formatting artefact',
        'It shows the title column is a proxy for age and sex, confirming "women and children first" evacuation order in data',
        'It means the title extraction has a bug',
        'It shows aggregate functions are unreliable on small groups'
      ],
      correct: 1,
      explanation: 'This is why data analysts extract and analyse embedded fields — "Master" was a title given exclusively to boys under ~13, so its high survival rate corroborates the documented evacuation priority. A field that looks like formatting noise turns out to encode age and gender signal.'
    }
  },

  // Day 16 - Tuesday (Easy)
  {
    id: 16,
    day: 'Tuesday',
    difficulty: 'Easy',
    topic: 'IN & NOT IN',
    avgSolveTime: 4,
    solveRate: 78,

    warmup: {
      type: 'mcq',
      question: 'What does IN (1, 2, 3) check?',
      options: [
        'Value is between 1 and 3',
        'Value equals 1, 2, OR 3',
        'Value equals 1, 2, AND 3 simultaneously',
        'Value is greater than 3'
      ],
      correct: 1,
      explanation: 'IN checks if the value matches ANY item in the list. Equivalent to val = 1 OR val = 2 OR val = 3.'
    },

    core: {
      title: 'Genre Performance Comparison',
      description: 'Compare movies from **Action, Comedy, and Drama** genres. For each, show the genre, **movie count**, **average rating**, and **average revenue** (exclude NULL revenues). Sort by average revenue descending.',
      dataset: 'movies',
      hint: 'Use WHERE genre IN (...), GROUP BY genre, filter revenue NULLs',
      solution: "SELECT genre, COUNT(*) as movie_count, ROUND(AVG(rating), 2) as avg_rating, ROUND(AVG(revenue_millions), 2) as avg_revenue FROM movies WHERE genre IN ('Action', 'Comedy', 'Drama') AND revenue_millions IS NOT NULL GROUP BY genre ORDER BY avg_revenue DESC",
      concept: 'IN with aggregation analysis'
    },

    insight: {
      type: 'mcq',
      question: 'What happens with NOT IN when the subquery returns a NULL value?',
      options: [
        'Works normally — NULLs are ignored',
        'Returns all rows',
        'Returns NO rows at all',
        'Throws a runtime error'
      ],
      correct: 2,
      explanation: 'NOT IN with any NULL value in the list = empty result. This is because "x NOT IN (1, NULL)" becomes "x != 1 AND x != NULL" — and anything != NULL is NULL (unknown). Use NOT EXISTS instead.'
    }
  },

  // Day 17 - Wednesday (Medium)
  {
    id: 17,
    day: 'Wednesday',
    difficulty: 'Medium',
    topic: 'CTEs (WITH Clause)',
    avgSolveTime: 5,
    solveRate: 60,

    warmup: {
      type: 'mcq',
      question: 'What does CTE stand for in SQL?',
      options: [
        'Common Table Expression',
        'Cached Temporary Entity',
        'Conditional Table Evaluation',
        'Compiled Table Extension'
      ],
      correct: 0,
      explanation: 'CTE = Common Table Expression. Defined with WITH keyword, it creates a named temporary result set for the query.'
    },

    core: {
      title: 'Department Salary Bands',
      description: 'Using a CTE, first calculate each department\'s **average salary**. Then classify departments as **"High"** (avg > 80K), **"Medium"** (50K-80K), or **"Low"** (< 50K). Show department, avg salary, and band.',
      dataset: 'employees',
      hint: 'WITH dept_avg AS (SELECT department, AVG(salary)...) SELECT ..., CASE WHEN ... FROM dept_avg',
      solution: "WITH dept_avg AS (SELECT department, ROUND(AVG(salary), 0) as avg_salary FROM employees GROUP BY department) SELECT department, avg_salary, CASE WHEN avg_salary > 80000 THEN 'High' WHEN avg_salary >= 50000 THEN 'Medium' ELSE 'Low' END as salary_band FROM dept_avg ORDER BY avg_salary DESC",
      concept: 'CTE with CASE classification'
    },

    insight: {
      type: 'mcq',
      question: 'CTE vs Subquery — when should you prefer a CTE?',
      options: [
        'CTEs are always faster',
        'When the result is referenced multiple times or for readability',
        'CTEs are required for GROUP BY',
        'Only when using window functions'
      ],
      correct: 1,
      explanation: 'CTEs shine when you reference the same derived data multiple times (avoids repeating subqueries) and make complex queries more readable.'
    }
  },

  // Day 18 - Thursday (Hard)
  {
    id: 18,
    day: 'Thursday',
    difficulty: 'Hard',
    topic: 'Window Functions',
    avgSolveTime: 7,
    solveRate: 48,

    warmup: {
      type: 'mcq',
      question: 'How do window functions differ from GROUP BY aggregation?',
      options: [
        'They\'re the same thing',
        'Window functions collapse rows; GROUP BY doesn\'t',
        'Window functions keep individual rows while adding aggregate calculations',
        'Window functions can\'t use SUM or AVG'
      ],
      correct: 2,
      explanation: 'GROUP BY collapses rows into groups. Window functions add calculations to each row WITHOUT collapsing — you keep all original rows.'
    },

    core: {
      title: 'Running Revenue by Genre',
      description: 'For each genre, show movies sorted by year with a **running total of revenue within that genre**. Display genre, title, year, revenue_millions, and cumulative_revenue. Exclude NULL revenues. **Limit to 25 rows.**',
      dataset: 'movies',
      hint: 'SUM(revenue_millions) OVER (PARTITION BY genre ORDER BY year, title)',
      solution: "SELECT genre, title, year, revenue_millions, SUM(revenue_millions) OVER (PARTITION BY genre ORDER BY year, title) as cumulative_revenue FROM movies WHERE revenue_millions IS NOT NULL ORDER BY genre, year LIMIT 25",
      concept: 'Running total with PARTITION BY'
    },

    insight: {
      type: 'mcq',
      question: 'What is the default frame for SUM() OVER (ORDER BY year)?',
      options: [
        'All rows in the partition',
        'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW',
        'Only the current row',
        'ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING'
      ],
      correct: 1,
      explanation: 'With ORDER BY, the default frame is UNBOUNDED PRECEDING to CURRENT ROW — which is why it creates a running total.'
    }
  },

  // Day 19 - Friday (Medium)
  {
    id: 19,
    day: 'Friday',
    difficulty: 'Medium',
    topic: 'BETWEEN & Range Queries',
    avgSolveTime: 5,
    solveRate: 68,

    warmup: {
      type: 'truefalse',
      question: 'BETWEEN 10 AND 20 includes both 10 and 20.',
      correct: true,
      explanation: 'BETWEEN is inclusive on both ends: equivalent to >= 10 AND <= 20.'
    },

    core: {
      title: 'Movie Decade Analysis',
      description: 'Analyze movies by **decade**. Group movies into decades (2000s, 2010s, etc.) and show the **decade label**, **number of movies**, **average rating**, and the **highest-grossing movie title** per decade. Sort by decade.',
      dataset: 'movies',
      hint: 'Use (year / 10) * 10 for decade grouping. For top movie, use a subquery or window function.',
      solution: "SELECT (year / 10) * 10 || 's' as decade, COUNT(*) as movies, ROUND(AVG(rating), 2) as avg_rating, (SELECT m2.title FROM movies m2 WHERE (m2.year / 10) * 10 = (m.year / 10) * 10 AND m2.revenue_millions IS NOT NULL ORDER BY m2.revenue_millions DESC LIMIT 1) as top_grossing FROM movies m GROUP BY (year / 10) * 10 ORDER BY decade",
      concept: 'Computed grouping with correlated subquery'
    },

    insight: {
      type: 'mcq',
      question: 'Why does (2017 / 10) * 10 give 2010 in SQL?',
      options: [
        'It doesn\'t — it gives 2017',
        'Integer division truncates: 2017/10 = 201, then 201 * 10 = 2010',
        'SQL rounds down automatically',
        'This only works in SQLite'
      ],
      correct: 1,
      explanation: 'Integer / integer = integer (truncated, not rounded). 2017 / 10 = 201, then 201 × 10 = 2010. A useful trick for bucketing.'
    }
  },

  // Day 20 - Saturday (Debug)
  {
    id: 20,
    day: 'Saturday',
    difficulty: 'Mixed',
    topic: 'Debug Challenge',
    avgSolveTime: 5,
    solveRate: 55,

    warmup: {
      type: 'debug',
      question: 'Find the error in this query:',
      code: 'SELECT genre, title, rating,\n  RANK() OVER (ORDER BY rating DESC) as genre_rank\nFROM movies\nGROUP BY genre;',
      options: [
        'RANK() syntax is wrong',
        'Can\'t mix window functions with GROUP BY this way — non-aggregated columns',
        'Missing alias for RANK()',
        'ORDER BY should be outside the OVER clause'
      ],
      correct: 1,
      explanation: 'GROUP BY collapses rows, but title and rating aren\'t aggregated. Use PARTITION BY genre in the OVER clause instead of GROUP BY.'
    },

    core: {
      title: 'Rank Movies Within Genre',
      description: 'Rank movies **within each genre** by rating (highest first). Show genre, title, rating, and rank. Only show the **top 3 per genre** (rank <= 3).',
      dataset: 'movies',
      hint: 'Use RANK() OVER (PARTITION BY genre ORDER BY rating DESC), then filter with a CTE or subquery',
      solution: "WITH ranked AS (SELECT genre, title, rating, RANK() OVER (PARTITION BY genre ORDER BY rating DESC) as genre_rank FROM movies) SELECT genre, title, rating, genre_rank FROM ranked WHERE genre_rank <= 3 ORDER BY genre, genre_rank",
      concept: 'PARTITION BY + RANK with filtering'
    },

    insight: {
      type: 'mcq',
      question: 'Scores: 9.0, 9.0, 8.5, 8.0. What ranks does RANK() assign vs DENSE_RANK()?',
      options: [
        'Both give 1, 1, 2, 3',
        'RANK: 1, 1, 3, 4 — DENSE_RANK: 1, 1, 2, 3',
        'RANK: 1, 2, 3, 4 — DENSE_RANK: 1, 1, 2, 3',
        'Both give 1, 2, 3, 4'
      ],
      correct: 1,
      explanation: 'RANK skips numbers after ties (1, 1, 3...). DENSE_RANK doesn\'t skip (1, 1, 2...). Use DENSE_RANK for "top N" queries.'
    }
  },

  // Day 21 - Sunday (Interview)
  {
    id: 21,
    day: 'Sunday',
    difficulty: 'Hard',
    topic: 'Interview Challenge',
    avgSolveTime: 10,
    solveRate: 38,
    isOptional: true,

    warmup: {
      type: 'mcq',
      question: 'When an interviewer asks for "year-over-year growth," what calculation do they expect?',
      options: [
        'This year minus last year',
        '(This year - Last year) / Last year × 100',
        'This year / Last year',
        'Running total by year'
      ],
      correct: 1,
      explanation: 'YoY growth rate = (current - previous) / previous × 100. Shows percentage change, not absolute difference.'
    },

    core: {
      title: 'Year-over-Year Revenue Growth',
      description: 'Calculate **year-over-year revenue growth rate** for movies. Show year, total revenue, previous year\'s revenue, and **growth percentage** (rounded to 1 decimal). Exclude NULL revenues.',
      dataset: 'movies',
      hint: 'Use LAG() to get previous year, then calculate (current - prev) / prev * 100',
      solution: "WITH yearly AS (SELECT year, ROUND(SUM(revenue_millions), 2) as revenue FROM movies WHERE revenue_millions IS NOT NULL GROUP BY year) SELECT year, revenue, LAG(revenue) OVER (ORDER BY year) as prev_revenue, ROUND((revenue - LAG(revenue) OVER (ORDER BY year)) * 100.0 / LAG(revenue) OVER (ORDER BY year), 1) as growth_pct FROM yearly ORDER BY year",
      concept: 'LAG for period-over-period analysis'
    },

    insight: {
      type: 'mcq',
      question: 'What does LAG(value, 2, 0) return?',
      options: [
        'Value 2 rows ahead, default 0',
        'Value 2 rows behind, default 0 if no row exists',
        'Value multiplied by 2',
        'The 2nd highest value, or 0'
      ],
      correct: 1,
      explanation: 'LAG(col, N, default): N = rows back (default 1), default = value when no prior row exists. LEAD is the forward equivalent.'
    }
  },

  // ========== WEEK 4: Analytics & Mastery ==========

  // Day 22 - Monday (Easy)
  {
    id: 22,
    day: 'Monday',
    difficulty: 'Easy',
    topic: 'UNION & Combining Results',
    avgSolveTime: 4,
    solveRate: 80,

    warmup: {
      type: 'mcq',
      question: 'Difference between UNION and UNION ALL?',
      options: [
        'UNION is always faster',
        'UNION ALL removes duplicates',
        'UNION removes duplicates (slower), UNION ALL keeps all rows',
        'They produce identical results'
      ],
      correct: 2,
      explanation: 'UNION deduplicates results (extra sort/comparison). UNION ALL keeps everything — faster when you know there are no duplicates.'
    },

    core: {
      title: 'Customer Health Report',
      description: 'Build a customer health report using UNION ALL to combine two groups into one result set:\n- **"Power User"**: customers whose total spend (quantity × price) exceeds $500 — show name, membership, total_spent\n- **"Dormant"**: customers who have placed **zero orders** — show name, membership, 0 as total_spent\n\nInclude a **segment** label column. Sort by segment, then total_spent descending.',
      dataset: 'ecommerce',
      hint: 'Two separate SELECT statements joined by UNION ALL — wrap each in a subquery if you need ORDER BY inside',
      solution: "SELECT 'Power User' AS segment, c.name, c.membership, ROUND(SUM(o.quantity * o.price), 2) AS total_spent FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.name, c.membership HAVING SUM(o.quantity * o.price) > 500 UNION ALL SELECT 'Dormant', c.name, c.membership, 0 FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id WHERE o.order_id IS NULL ORDER BY segment, total_spent DESC",
      concept: 'UNION ALL combining different business segments into one report'
    },

    insight: {
      type: 'mcq',
      question: 'The ORDER BY clause appears once at the very end of the UNION ALL query. Why can\'t you put ORDER BY inside each individual SELECT?',
      options: [
        'You can — it\'s just a style preference to put it at the end',
        'ORDER BY inside a UNION branch is undefined behaviour in standard SQL — the combined result set is what gets sorted, not individual branches',
        'SQLite requires ORDER BY at the start',
        'ORDER BY would conflict with GROUP BY inside UNION'
      ],
      correct: 1,
      explanation: 'Standard SQL does not allow ORDER BY inside individual UNION branches (it\'s undefined/ignored in most engines). One ORDER BY at the end sorts the entire combined result. This is a common interview gotcha.'
    }
  },

  // Day 23 - Tuesday (Easy)
  {
    id: 23,
    day: 'Tuesday',
    difficulty: 'Easy',
    topic: 'LEFT JOIN Mastery',
    avgSolveTime: 5,
    solveRate: 70,

    warmup: {
      type: 'mcq',
      question: 'In LEFT JOIN, unmatched rows from the right table appear as:',
      options: [
        'Empty strings',
        'Zero values',
        'NULL in all right-table columns',
        'They are excluded'
      ],
      correct: 2,
      explanation: 'LEFT JOIN keeps all left rows. Unmatched right columns become NULL — which is how we detect "no match" (WHERE right.key IS NULL).'
    },

    core: {
      title: 'Customer Order Summary',
      description: 'Show **every customer** with their **order count** and **total spending** (quantity × price). Customers with no orders should show **0 orders and $0 spent**. Sort by total spent descending.',
      dataset: 'ecommerce',
      hint: 'LEFT JOIN, use COUNT(o.order_id) not COUNT(*), and COALESCE for the sum',
      solution: "SELECT c.name, c.membership, COUNT(o.order_id) as order_count, COALESCE(SUM(o.quantity * o.price), 0) as total_spent FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.name, c.membership ORDER BY total_spent DESC",
      concept: 'LEFT JOIN with COALESCE for clean output'
    },

    insight: {
      type: 'mcq',
      question: 'Why does COUNT(o.order_id) return 0 for no orders, but COUNT(*) returns 1?',
      options: [
        'It\'s a bug in SQL',
        'COUNT(column) ignores NULLs; COUNT(*) counts the row itself (which exists from LEFT JOIN)',
        'COUNT(*) counts from both tables',
        'LEFT JOIN adds an extra row'
      ],
      correct: 1,
      explanation: 'LEFT JOIN creates one row with NULLs for right-side columns. COUNT(*) counts that row. COUNT(o.order_id) sees NULL and skips it → 0.'
    }
  },

  // Day 24 - Wednesday (Medium)
  {
    id: 24,
    day: 'Wednesday',
    difficulty: 'Medium',
    topic: 'EXISTS & Correlated Queries',
    avgSolveTime: 6,
    solveRate: 58,

    warmup: {
      type: 'mcq',
      question: 'What does EXISTS return?',
      options: ['A count of matching rows', 'The matching rows themselves', 'TRUE if subquery has any results, FALSE otherwise', 'NULL if no match'],
      correct: 2,
      explanation: 'EXISTS returns a boolean: TRUE if the subquery returns at least one row, FALSE if it returns none.'
    },

    core: {
      title: 'Multi-Category Shoppers',
      description: 'Find customers who have ordered from **at least 2 different categories**. Show name and email. Use EXISTS with a correlated subquery approach.',
      dataset: 'ecommerce',
      hint: 'One approach: subquery counting distinct categories per customer, then filter >= 2',
      solution: "SELECT c.name, c.email FROM customers c WHERE (SELECT COUNT(DISTINCT o.category) FROM orders o WHERE o.customer_id = c.customer_id) >= 2",
      concept: 'Correlated subquery with aggregation'
    },

    insight: {
      type: 'mcq',
      question: 'When is EXISTS typically faster than IN with a subquery?',
      options: [
        'When the subquery returns very few rows',
        'When the subquery returns many rows (EXISTS stops at first match)',
        'They always perform the same',
        'EXISTS is always slower due to correlation'
      ],
      correct: 1,
      explanation: 'EXISTS short-circuits at the first match — it doesn\'t need to process all rows. IN must materialize the full subquery result. EXISTS wins with large result sets.'
    }
  },

  // Day 25 - Thursday (Hard)
  {
    id: 25,
    day: 'Thursday',
    difficulty: 'Hard',
    topic: 'Advanced Window Functions',
    avgSolveTime: 7,
    solveRate: 45,

    warmup: {
      type: 'mcq',
      question: 'What does NTILE(4) OVER (ORDER BY salary) do?',
      options: [
        'Divides salary by 4',
        'Shows top 4 salaries',
        'Splits rows into 4 roughly equal groups (quartiles)',
        'Returns every 4th row'
      ],
      correct: 2,
      explanation: 'NTILE(N) divides ordered rows into N approximately equal buckets. NTILE(4) creates quartiles (1, 2, 3, 4).'
    },

    core: {
      title: 'Salary Percentile Report',
      description: 'Assign each employee a **salary quartile** (1 = bottom 25%, 4 = top 25%) and show the **salary difference from their department average**. Display name, department, salary, quartile, and salary_vs_dept_avg.',
      dataset: 'employees',
      hint: 'Use NTILE(4) OVER (ORDER BY salary) and AVG(salary) OVER (PARTITION BY department)',
      solution: "SELECT name, department, salary, NTILE(4) OVER (ORDER BY salary) as quartile, ROUND(salary - AVG(salary) OVER (PARTITION BY department), 0) as salary_vs_dept_avg FROM employees ORDER BY quartile DESC, salary DESC",
      concept: 'Multiple window functions in one query'
    },

    insight: {
      type: 'mcq',
      question: 'Can you use multiple different OVER() clauses in the same SELECT?',
      options: [
        'No — all window functions must use the same OVER clause',
        'Yes — each window function can have its own PARTITION BY and ORDER BY',
        'Only with named WINDOW clauses',
        'Only if they use the same aggregate function'
      ],
      correct: 1,
      explanation: 'Each window function can have its own OVER() clause with different partitioning and ordering. This is one of their most powerful features.'
    }
  },

  // Day 26 - Friday (Medium)
  {
    id: 26,
    day: 'Friday',
    difficulty: 'Medium',
    topic: 'LIKE & Pattern Matching',
    avgSolveTime: 5,
    solveRate: 65,

    warmup: {
      type: 'mcq',
      question: 'In LIKE patterns, what does _ (underscore) match?',
      options: [
        'Zero or more characters',
        'Exactly one character',
        'Only underscores',
        'Only letters'
      ],
      correct: 1,
      explanation: '% = zero or more characters. _ = exactly one character. Example: "J_n" matches "Jan", "Jon", but not "John".'
    },

    core: {
      title: 'Social Class by Name Pattern',
      description: 'Titanic names encode social class through titles. Use LIKE patterns to classify passengers into groups and compare outcomes:\n- **"Married women"**: name LIKE `\'%Mrs.%\'`\n- **"Single women"**: name LIKE `\'%Miss.%\'`\n- **"Boys"**: name LIKE `\'%Master.%\'`\n- **"Men"**: name LIKE `\'%Mr.%\'` (and NOT any of the above)\n\nFor each group show: **group_name**, **count**, **avg_fare** (2 decimals), **survival_rate** (% survived, 1 decimal). Sort by survival_rate descending.',
      dataset: 'titanic',
      hint: 'Use CASE WHEN name LIKE \'%Mrs.%\' THEN \'Married women\' ... ELSE \'Men\' END as group_name, then GROUP BY group_name',
      solution: "SELECT CASE WHEN name LIKE '%Mrs.%' THEN 'Married women' WHEN name LIKE '%Miss.%' THEN 'Single women' WHEN name LIKE '%Master.%' THEN 'Boys' ELSE 'Men' END AS group_name, COUNT(*) AS count, ROUND(AVG(fare), 2) AS avg_fare, ROUND(100.0 * SUM(survived) / COUNT(*), 1) AS survival_rate FROM passengers GROUP BY group_name ORDER BY survival_rate DESC",
      concept: 'LIKE inside CASE WHEN for pattern-based grouping and analysis'
    },

    insight: {
      type: 'mcq',
      question: 'The query puts men in ELSE rather than another LIKE clause. What is the risk of this approach?',
      options: [
        'No risk — ELSE always catches the right rows',
        'Any passenger whose name doesn\'t match Mrs/Miss/Master — including unusual titles like "Dr.", "Rev.", "Col." — falls into "Men"',
        'ELSE is slower than an explicit LIKE',
        'ELSE doesn\'t work inside GROUP BY'
      ],
      correct: 1,
      explanation: 'ELSE catches everything not matched above — including "Dr. Alice", "Rev. Smith", etc. In production you\'d add explicit cases for known titles and a separate "Other" group, then audit what lands in Other. This is why data cleaning is iterative.'
    }
  },

  // Day 27 - Saturday (Debug)
  {
    id: 27,
    day: 'Saturday',
    difficulty: 'Mixed',
    topic: 'Debug Challenge',
    avgSolveTime: 5,
    solveRate: 55,

    warmup: {
      type: 'debug',
      question: 'This query should find customers who never ordered Electronics. What\'s the bug?',
      code: 'SELECT name FROM customers\nWHERE customer_id NOT IN (\n  SELECT customer_id\n  FROM orders\n  WHERE category = \'Electronics\'\n);',
      options: [
        'NOT IN might return empty results if any customer_id in orders is NULL',
        'Should use != instead of NOT IN',
        'Missing JOIN clause',
        'WHERE category filter is in wrong place'
      ],
      correct: 0,
      explanation: 'If any customer_id in the subquery is NULL, NOT IN returns no rows at all. Use NOT EXISTS for NULL-safe filtering.'
    },

    core: {
      title: 'Exclusive Category Shoppers',
      description: 'Find customers who have ordered **only from a single category** (they\'ve never mixed categories). Show their name and which category they exclusively buy from.',
      dataset: 'ecommerce',
      hint: 'Use HAVING COUNT(DISTINCT category) = 1 after joining customers with orders',
      solution: "SELECT c.name, MIN(o.category) as exclusive_category FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.name HAVING COUNT(DISTINCT o.category) = 1",
      concept: 'HAVING with COUNT DISTINCT for exclusivity'
    },

    insight: {
      type: 'mcq',
      question: 'Why can we use MIN(category) when there\'s only one distinct value?',
      options: [
        'MIN always returns the first row',
        'When COUNT(DISTINCT) = 1, MIN, MAX, and the actual value are all identical',
        'MIN works on strings alphabetically',
        'It\'s a SQLite-specific behavior'
      ],
      correct: 1,
      explanation: 'With only one distinct value, MIN = MAX = the value itself. It\'s a clean trick to extract the single value in a GROUP BY context.'
    }
  },

  // Day 28 - Sunday (Interview)
  {
    id: 28,
    day: 'Sunday',
    difficulty: 'Hard',
    topic: 'Interview Challenge',
    avgSolveTime: 12,
    solveRate: 35,
    isOptional: true,

    warmup: {
      type: 'mcq',
      question: 'For "top N per group" problems in interviews, which approach is most scalable?',
      options: [
        'Correlated subquery with LIMIT',
        'Multiple self-joins',
        'ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...) then filter',
        'UNION ALL for each group'
      ],
      correct: 2,
      explanation: 'ROW_NUMBER with PARTITION BY processes data in a single pass. Correlated subqueries re-run for each row. Window functions scale better.'
    },

    core: {
      title: 'Customer Lifetime Value Tiers',
      description: 'Calculate each customer\'s **total spending** (quantity × price), **order frequency**, and **average order value**. Then classify into tiers: **"VIP"** (spent > $500), **"Regular"** (spent $100-$500), **"Low"** (< $100). Show name, total_spent, order_count, avg_order_value, and tier.',
      dataset: 'ecommerce',
      hint: 'Use CTE for spending calculations, then CASE for tier classification',
      solution: "WITH customer_stats AS (SELECT c.customer_id, c.name, SUM(o.quantity * o.price) as total_spent, COUNT(o.order_id) as order_count, ROUND(AVG(o.quantity * o.price), 2) as avg_order_value FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.name) SELECT name, total_spent, order_count, avg_order_value, CASE WHEN total_spent > 500 THEN 'VIP' WHEN total_spent >= 100 THEN 'Regular' ELSE 'Low' END as tier FROM customer_stats ORDER BY total_spent DESC",
      concept: 'CTE + aggregation + CASE classification'
    },

    insight: {
      type: 'mcq',
      question: 'In a real system, how would you handle the tier thresholds ($500, $100)?',
      options: [
        'Hardcode them — they rarely change',
        'Store thresholds in a configuration table and JOIN against it',
        'Use environment variables',
        'Let the application layer handle it'
      ],
      correct: 1,
      explanation: 'Business rules change. A config table (tier_name, min_spent, max_spent) makes thresholds adjustable without modifying queries.'
    }
  },

  // Days 29-30 (Capstone)
  {
    id: 29,
    day: 'Monday',
    difficulty: 'Easy',
    topic: 'Query Structure Review',
    avgSolveTime: 4,
    solveRate: 82,

    warmup: {
      type: 'mcq',
      question: 'What is the correct WRITING order of SQL clauses?',
      options: [
        'SELECT, WHERE, FROM, GROUP BY',
        'SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT',
        'FROM, SELECT, WHERE, ORDER BY',
        'SELECT, FROM, GROUP BY, WHERE'
      ],
      correct: 1,
      explanation: 'Write: SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT. Execute: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.'
    },

    core: {
      title: 'Embarkation Port Report',
      description: 'Build a comprehensive report for each **embarkation port** (S=Southampton, C=Cherbourg, Q=Queenstown). Show port, **passenger count**, **average fare** (2 decimals), **survival rate %** (1 decimal), and **average age** (excluding NULLs). Sort by passenger count descending. Exclude empty/NULL ports.',
      dataset: 'titanic',
      hint: 'GROUP BY embarked, use ROUND and multiple aggregates, filter with WHERE embarked IS NOT NULL AND embarked != ""',
      solution: "SELECT embarked as port, COUNT(*) as passengers, ROUND(AVG(fare), 2) as avg_fare, ROUND(100.0 * SUM(survived) / COUNT(*), 1) as survival_pct, ROUND(AVG(age), 1) as avg_age FROM passengers WHERE embarked IS NOT NULL AND embarked != '' GROUP BY embarked ORDER BY passengers DESC",
      concept: 'Multi-aggregate analysis with clean data handling'
    },

    insight: {
      type: 'mcq',
      question: 'The execution order differs from writing order. Which runs LAST?',
      options: [
        'SELECT',
        'ORDER BY',
        'LIMIT',
        'HAVING'
      ],
      correct: 2,
      explanation: 'LIMIT runs last: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. That\'s why LIMIT respects ORDER BY.'
    }
  },

  {
    id: 30,
    day: 'Tuesday',
    difficulty: 'Medium',
    topic: 'Final Challenge',
    avgSolveTime: 8,
    solveRate: 50,

    warmup: {
      type: 'mcq',
      question: 'Which SQL concept is most important for data analyst interviews?',
      options: [
        'Stored procedures',
        'Window functions — they appear in 80%+ of analytics interviews',
        'Database administration',
        'Transaction management'
      ],
      correct: 1,
      explanation: 'Window functions (ROW_NUMBER, RANK, LAG, SUM OVER) are the #1 topic in analytics SQL interviews. Master them!'
    },

    core: {
      title: 'Complete Analytics Report',
      description: 'Build a director performance report. For directors with **3+ movies**, show:\n- Director name\n- Movie count\n- Average rating (1 decimal)\n- Total revenue (millions)\n- **Their highest-rated movie title**\n- **Rank among all qualifying directors** by average rating\n\nSort by rank.',
      dataset: 'movies',
      hint: 'Use a CTE for director stats, a correlated subquery for best movie, and RANK() for ranking',
      solution: "WITH director_stats AS (SELECT director, COUNT(*) as movies, ROUND(AVG(rating), 1) as avg_rating, ROUND(SUM(revenue_millions), 1) as total_revenue FROM movies GROUP BY director HAVING COUNT(*) >= 3) SELECT director, movies, avg_rating, total_revenue, (SELECT title FROM movies m WHERE m.director = ds.director ORDER BY rating DESC LIMIT 1) as best_movie, RANK() OVER (ORDER BY avg_rating DESC) as director_rank FROM director_stats ds ORDER BY director_rank",
      concept: 'CTE + correlated subquery + window function'
    },

    insight: {
      type: 'mcq',
      question: 'You completed 30 days! Which combination of skills makes you interview-ready?',
      options: [
        'Just knowing SELECT and WHERE',
        'JOINs + GROUP BY + Window Functions + CTEs + Subqueries',
        'Only window functions',
        'Memorizing syntax without understanding'
      ],
      correct: 1,
      explanation: 'The winning combo: JOINs (data relationships), GROUP BY (aggregation), Window Functions (analytics), CTEs (readability), Subqueries (complex logic). Keep practicing!'
    }
  }
];

// Helper to get today's challenge
window.getDailyChallenge = () => {
  const challenges = window.dailyChallengesData;
  if (!challenges || challenges.length === 0) return null;

  // Reset at 11:00 AM GMT+3
  const now = new Date();
  const gmt3 = new Date(now.getTime() + (3 * 60 * 60 * 1000));

  if (gmt3.getUTCHours() < 8) { // 8 UTC = 11 GMT+3
    gmt3.setUTCDate(gmt3.getUTCDate() - 1);
  }

  const start = new Date(gmt3.getFullYear(), 0, 0);
  const diff = gmt3 - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  return challenges[dayOfYear % challenges.length];
};

// Get time until next challenge
window.getTimeUntilNextChallenge = () => {
  const now = new Date();
  const gmt3 = new Date(now.getTime() + (3 * 60 * 60 * 1000));

  let next = new Date(gmt3);
  next.setUTCHours(8, 0, 0, 0); // 8 UTC = 11 GMT+3

  if (gmt3.getUTCHours() >= 8) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  const diff = next - gmt3;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes };
};
