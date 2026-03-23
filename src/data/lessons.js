// SQL Quest - Static Lesson Content for AI Tutor
// Tone: Sharp senior colleague. Code-first. Challenge-oriented.

window.lessonContentData = {
    1: {
      intro: "SQL is how you talk to databases. Every tech company — Google, Stripe, your future employer — runs on it. Here's a quick test: what do you think SELECT * FROM passengers LIMIT 5 does? Take a guess, then let's dig in.",
      teaching: "Here's your first query:\n\nSELECT * FROM passengers LIMIT 5;\n\nSELECT picks columns (* means all). FROM names the table. LIMIT caps the rows returned.\n\nThink of it this way: you're telling the database exactly what you want, from where, and how much.\n\nQuick challenge before we practice: what would happen if you removed LIMIT 5? Think about it.\n\nLet's put this to work.",
      practice: [
        { question: "Show all columns from passengers, limited to 3 rows.", expected: "SELECT * FROM passengers LIMIT 3" },
        { question: "Now show all columns but limit to 10 rows.", expected: "SELECT * FROM passengers LIMIT 10" },
        { question: "Show all passenger data, limited to just 1 row.", expected: "SELECT * FROM passengers LIMIT 1" }
      ],
      comprehension: [
        "In your own words — what does the asterisk (*) do in SELECT, and when would you NOT want to use it?",
        "What problem does LIMIT solve? When would leaving it off be a bad idea?",
        "What's the difference between a row and a column in a database table? Use a real-world analogy."
      ]
    },
    2: {
      intro: "Using SELECT * is lazy — in interviews and in production. You should pick exactly the columns you need. Why? Performance, clarity, and it shows you know what you're doing. Let's fix that habit.",
      teaching: "Instead of grabbing everything:\n\nSELECT name, age FROM passengers LIMIT 5;\n\nThis returns ONLY name and age. Separate columns with commas.\n\nWhy this matters: in a real database with 50 columns, SELECT * wastes bandwidth and makes your query harder to read. Interviewers notice.\n\nBefore we practice — what do you think happens if you SELECT a column that doesn't exist? Take a guess.",
      practice: [
        { question: "Select only the 'name' column from passengers (limit 5).", expected: "SELECT name FROM passengers LIMIT 5" },
        { question: "Select 'name' and 'age' columns (limit 10).", expected: "SELECT name, age FROM passengers LIMIT 10" },
        { question: "Select 'name', 'sex', and 'pclass' columns (limit 5).", expected: "SELECT name, sex, pclass FROM passengers LIMIT 5" }
      ],
      comprehension: [
        "Give me two reasons why SELECT * is a bad habit in production code.",
        "How do you select multiple columns? What separates them?",
        "If you SELECT a column that doesn't exist, what happens? Why is that useful to know for debugging?"
      ]
    },
    3: {
      intro: "WHERE is how you filter. Without it, you get everything — and nobody wants everything. In interviews, WHERE shows up in literally every question. Let's make sure you nail it.",
      teaching: "WHERE filters rows based on conditions:\n\nSELECT * FROM passengers WHERE survived = 1;\n\nThis returns only passengers who survived. Operators: = (equals), > < >= <= (comparisons), <> (not equal).\n\nFor text values, use quotes: WHERE sex = 'female'\n\nHere's a trap interviewers set: what's the difference between WHERE age = NULL and WHERE age IS NULL? One works, one doesn't. Think about why.\n\nLet's practice filtering.",
      practice: [
        { question: "Find all passengers who survived (survived = 1).", expected: "SELECT * FROM passengers WHERE survived = 1" },
        { question: "Find all female passengers.", expected: "SELECT * FROM passengers WHERE sex = 'female'" },
        { question: "Find passengers in first class (pclass = 1).", expected: "SELECT * FROM passengers WHERE pclass = 1" }
      ],
      comprehension: [
        "Why can't you use WHERE age = NULL? What do you use instead, and why?",
        "When filtering text, what happens if you forget the quotes around the value?",
        "What operator would you use to find passengers NOT in third class? Give two ways to write it."
      ]
    },
    4: {
      intro: "Single conditions are fine, but real queries need multiple filters. AND and OR let you combine them — and mixing them up is one of the most common interview mistakes. Let's make sure you don't.",
      teaching: "AND = both conditions must be true. OR = at least one must be true.\n\nSELECT * FROM passengers WHERE sex = 'female' AND survived = 1;\n\nReturns female passengers who survived. Both conditions must hold.\n\nSELECT * FROM passengers WHERE pclass = 1 OR pclass = 2;\n\nReturns first OR second class passengers.\n\nHere's where people mess up: what does WHERE pclass = 1 OR pclass = 2 AND survived = 1 return? It's NOT what most people think. AND binds tighter than OR. Parentheses fix this.\n\nLet's practice.",
      practice: [
        { question: "Find female passengers who survived.", expected: "SELECT * FROM passengers WHERE sex = 'female' AND survived = 1" },
        { question: "Find passengers in first OR second class.", expected: "SELECT * FROM passengers WHERE pclass = 1 OR pclass = 2" },
        { question: "Find male passengers who survived.", expected: "SELECT * FROM passengers WHERE sex = 'male' AND survived = 1" }
      ],
      comprehension: [
        "What does AND require vs OR? Explain like you're debugging someone else's query.",
        "Why does operator precedence matter when mixing AND and OR? Give an example that breaks.",
        "How would you find passengers who are female AND in first class? Write it out in your head."
      ]
    },
    5: {
      intro: "ORDER BY controls how results are sorted. Without it, you're getting rows in whatever order the database feels like — which is unpredictable. Interviewers use 'top N' questions constantly. Let's nail this.",
      teaching: "ORDER BY sorts your results:\n\nSELECT * FROM movies ORDER BY rating DESC;\n\nDESC = highest first. ASC = lowest first (default if you don't specify).\n\nPair with LIMIT for 'top N' questions:\n\nSELECT * FROM movies ORDER BY rating DESC LIMIT 5;\n\nThis is a classic interview pattern: 'Find the top 5 highest-rated movies.'\n\nQuick thought experiment: what happens if two movies have the same rating? How does ORDER BY break ties? This matters more than you'd think.\n\nLet's practice.",
      practice: [
        { question: "Show all movies sorted by rating (highest first).", expected: "SELECT * FROM movies ORDER BY rating DESC" },
        { question: "Show movies sorted by year (oldest first).", expected: "SELECT * FROM movies ORDER BY year ASC" },
        { question: "Show top 5 highest revenue movies.", expected: "SELECT * FROM movies ORDER BY revenue_millions DESC LIMIT 5" }
      ],
      comprehension: [
        "If you don't specify ASC or DESC, which is the default? Why does this matter?",
        "How would you sort by rating DESC but break ties by title ASC? Write it out.",
        "Can you ORDER BY a column that isn't in your SELECT? Why or why not?"
      ]
    },
    6: {
      intro: "Aggregate functions — COUNT, SUM, AVG, MIN, MAX — summarize data across rows. Instead of seeing every row, you get a single answer. These show up in almost every SQL interview question.",
      teaching: "Aggregate functions crunch numbers across rows:\n\nSELECT COUNT(*) FROM movies;\n\nThis counts all rows. Not specific columns — all rows.\n\nSELECT AVG(rating) FROM movies;\n\nAverage rating across all movies.\n\nKey distinction: COUNT(*) counts rows (including NULLs). COUNT(column) counts non-NULL values. Interviewers test this difference.\n\nBefore we practice: what do you think AVG does with NULL values — does it include them in the calculation or skip them? Important to know.\n\nLet's practice.",
      practice: [
        { question: "Count the total number of movies.", expected: "SELECT COUNT(*) FROM movies" },
        { question: "Find the average movie rating.", expected: "SELECT AVG(rating) FROM movies" },
        { question: "Find the highest revenue among all movies.", expected: "SELECT MAX(revenue_millions) FROM movies" }
      ],
      comprehension: [
        "What's the difference between COUNT(*) and COUNT(column_name)? When does it matter?",
        "How does AVG handle NULL values? Why is this a common interview trap?",
        "When would you use MAX vs ORDER BY DESC LIMIT 1? Is there a difference?"
      ]
    },
    7: {
      intro: "GROUP BY is where SQL gets interesting — and where most beginners get confused. It splits your data into groups, then aggregates each group separately. Master this and you've unlocked half of all interview questions.",
      teaching: "GROUP BY creates groups, then aggregates within each:\n\nSELECT department, COUNT(*) FROM employees GROUP BY department;\n\nThis counts employees per department. The rule: every column in SELECT must either be in GROUP BY or wrapped in an aggregate function. Break this rule and your query fails.\n\nSELECT department, AVG(salary) FROM employees GROUP BY department;\n\nAverage salary per department.\n\nHere's the thing most people get wrong: what happens if you SELECT name, COUNT(*) FROM employees GROUP BY department? Think about WHY that's a problem.\n\nLet's practice.",
      practice: [
        { question: "Count employees in each department, sorted by department.", expected: "SELECT department, COUNT(*) FROM employees GROUP BY department ORDER BY department" },
        { question: "Find average salary by department, sorted by avg salary DESC.", expected: "SELECT department, AVG(salary) FROM employees GROUP BY department ORDER BY AVG(salary) DESC" },
        { question: "Count employees by position, sorted by count DESC.", expected: "SELECT position, COUNT(*) FROM employees GROUP BY position ORDER BY COUNT(*) DESC" }
      ],
      comprehension: [
        "Why must every non-aggregated column in SELECT also appear in GROUP BY?",
        "What's the difference between COUNT(*) with and without GROUP BY?",
        "Can you GROUP BY multiple columns? When would you want to?"
      ]
    },
    8: {
      intro: "HAVING is WHERE's cousin — but for groups. You can't use WHERE to filter aggregated results (try it and you'll get an error). HAVING exists for exactly this. Interviewers LOVE testing whether you know the difference.",
      teaching: "WHERE filters rows BEFORE grouping. HAVING filters groups AFTER.\n\nSELECT department, COUNT(*) FROM employees GROUP BY department HAVING COUNT(*) > 5;\n\nShows only departments with more than 5 employees.\n\nHere's the execution order that matters:\n1. FROM → 2. WHERE → 3. GROUP BY → 4. HAVING → 5. SELECT → 6. ORDER BY\n\nWHERE can't see aggregates because they don't exist yet at step 2. HAVING runs at step 4, after groups are formed.\n\nQuick test: why would WHERE salary > 50000 work but WHERE AVG(salary) > 50000 fail?\n\nLet's practice.",
      practice: [
        { question: "Show departments with more than 5 employees, sorted by count DESC.", expected: "SELECT department, COUNT(*) FROM employees GROUP BY department HAVING COUNT(*) > 5 ORDER BY COUNT(*) DESC" },
        { question: "Find departments where average salary is above 70000, sorted by avg salary DESC.", expected: "SELECT department, AVG(salary) FROM employees GROUP BY department HAVING AVG(salary) > 70000 ORDER BY AVG(salary) DESC" },
        { question: "Show positions held by at least 3 people, sorted by position.", expected: "SELECT position, COUNT(*) FROM employees GROUP BY position HAVING COUNT(*) >= 3 ORDER BY position" }
      ],
      comprehension: [
        "Explain the difference between WHERE and HAVING using the SQL execution order.",
        "Can you use HAVING without GROUP BY? What would that even mean?",
        "Why does WHERE AVG(salary) > 50000 throw an error? Be specific about the execution order."
      ]
    },
    9: {
      intro: "JOINs combine data from multiple tables — and they're the backbone of relational databases. If you can't JOIN, you can't pass a SQL interview. Every multi-table question is a JOIN question.",
      teaching: "JOIN connects rows from different tables using a shared column:\n\nSELECT orders.product, customers.name\nFROM orders\nJOIN customers ON orders.customer_id = customers.customer_id;\n\nINNER JOIN (the default): only returns rows that match in BOTH tables.\nLEFT JOIN: returns ALL rows from the left table, NULLs where there's no match.\n\nThe difference matters: 'find customers who never ordered' needs a LEFT JOIN + WHERE ... IS NULL pattern. Interviewers test this constantly.\n\nBefore we practice: what happens if the ON condition matches multiple rows? Your result set grows. That's not a bug — but it surprises people.\n\nLet's practice.",
      practice: [
        { question: "Join orders with customers to show product and customer name, sorted by product.", expected: "SELECT orders.product, customers.name FROM orders JOIN customers ON orders.customer_id = customers.customer_id ORDER BY orders.product" },
        { question: "Show product, price, and customer name for orders, sorted by price DESC (limit 10).", expected: "SELECT orders.product, orders.price, customers.name FROM orders JOIN customers ON orders.customer_id = customers.customer_id ORDER BY orders.price DESC LIMIT 10" },
        { question: "Show category and count of orders per category, sorted by count DESC.", expected: "SELECT category, COUNT(*) FROM orders GROUP BY category ORDER BY COUNT(*) DESC" }
      ],
      comprehension: [
        "What's the practical difference between INNER JOIN and LEFT JOIN? Give a real scenario where you'd need each.",
        "What does the ON clause do, and what happens if you accidentally JOIN without one?",
        "If a customer has 3 orders and you JOIN orders with customers, how many rows appear for that customer? Why?"
      ]
    },
    10: {
      intro: "Subqueries are queries inside queries. They unlock complex analysis — like 'find all movies rated above average.' You can't do that with a single WHERE clause because you don't know the average yet. That's where subqueries come in.",
      teaching: "A subquery is a SELECT inside another query:\n\nSELECT * FROM movies WHERE rating > (SELECT AVG(rating) FROM movies);\n\nThe inner query runs first, calculates the average. The outer query uses that result.\n\nYou can use subqueries in WHERE, FROM (as a derived table), and SELECT (as a scalar value). But don't overuse them — interviewers will ask 'can you rewrite this as a JOIN?' and you should be able to.\n\nCritical distinction: correlated vs non-correlated subqueries. The one above is non-correlated (runs once). Correlated subqueries run once PER ROW and can be slow.\n\nLet's practice.",
      practice: [
        { question: "Find movies with rating higher than average.", expected: "SELECT * FROM movies WHERE rating > (SELECT AVG(rating) FROM movies)" },
        { question: "Find the movie with the highest rating.", expected: "SELECT * FROM movies WHERE rating = (SELECT MAX(rating) FROM movies)" },
        { question: "Show movies with revenue above average.", expected: "SELECT * FROM movies WHERE revenue_millions > (SELECT AVG(revenue_millions) FROM movies)" }
      ],
      comprehension: [
        "Which runs first — the inner or outer query? Why does that matter?",
        "When would a JOIN be better than a subquery? Give a concrete example.",
        "What's the difference between a correlated and non-correlated subquery in terms of performance?"
      ]
    }
};
