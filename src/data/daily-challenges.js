// SQL Quest - Daily Challenges (3-Step Format)
// Format: Warm-up (MCQ) → Core Challenge (SQL) → Insight Check (MCQ)
// Weekly Rhythm: Mon=Easy, Tue=Easy-Med, Wed=Med, Thu=Med-Hard, Fri=Med, Sat=Debug, Sun=Interview

window.dailyChallengesData = [
  // ========== WEEK 1 ==========
  
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
      title: 'Find First Class Survivors',
      description: 'Find all **first class passengers** (pclass = 1) who **survived** (survived = 1). Show their name and age.',
      dataset: 'titanic',
      hint: 'Use WHERE with AND to combine conditions',
      solution: "SELECT name, age FROM passengers WHERE pclass = 1 AND survived = 1",
      concept: 'WHERE with multiple conditions'
    },
    
    insight: {
      type: 'mcq',
      question: 'What would happen if you used OR instead of AND in the query?',
      options: [
        'Same results',
        'More rows (all pclass=1 OR all survived=1)',
        'No rows returned',
        'Syntax error'
      ],
      correct: 1,
      explanation: 'OR returns rows matching EITHER condition, giving many more results.'
    }
  },
  
  // Day 2 - Tuesday (Easy-Medium: JOIN)
  {
    id: 2,
    day: 'Tuesday',
    difficulty: 'Easy-Medium',
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
      title: 'Customer Order Count',
      description: 'Show each **customer name** and their **total number of orders**. Only include customers with at least 1 order.',
      dataset: 'ecommerce',
      hint: 'JOIN customers with orders, then GROUP BY customer',
      solution: "SELECT c.name, COUNT(o.order_id) as total_orders FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.name",
      concept: 'JOIN with aggregation'
    },
    
    insight: {
      type: 'mcq',
      question: 'If a customer has 0 orders, which JOIN would still show them?',
      options: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'CROSS JOIN'],
      correct: 1,
      explanation: 'LEFT JOIN keeps all rows from the left table (customers) even without matching orders.'
    }
  },
  
  // Day 3 - Wednesday (Medium: GROUP BY)
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
      explanation: 'Order: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY'
    },
    
    core: {
      title: 'Popular Movie Genres',
      description: 'Find genres with **more than 5 movies** that have a rating above 7.0. Show genre and movie count.',
      dataset: 'movies',
      hint: 'WHERE for rating, GROUP BY genre, HAVING for count',
      solution: "SELECT genre, COUNT(*) as movie_count FROM movies WHERE rating > 7.0 GROUP BY genre HAVING COUNT(*) > 5",
      concept: 'WHERE vs HAVING'
    },
    
    insight: {
      type: 'mcq',
      question: 'Why can\'t we use WHERE COUNT(*) > 5?',
      options: [
        'WHERE doesn\'t support numbers',
        'COUNT() doesn\'t exist when WHERE runs',
        'Just a syntax preference',
        'WHERE only works with text'
      ],
      correct: 1,
      explanation: 'WHERE runs before GROUP BY, so aggregate functions haven\'t been calculated yet.'
    }
  },
  
  // Day 4 - Thursday (Medium-Hard: Subqueries)
  {
    id: 4,
    day: 'Thursday',
    difficulty: 'Medium-Hard',
    topic: 'Subqueries',
    avgSolveTime: 6,
    solveRate: 55,
    
    warmup: {
      type: 'truefalse',
      question: 'A subquery in WHERE must always return exactly one value.',
      correct: false,
      explanation: 'With IN, ANY, or ALL, subqueries can return multiple values. Only with = or > do you need one value.'
    },
    
    core: {
      title: 'Above Average Salaries',
      description: 'Find employees earning **more than the average salary**. Show name, department, and salary.',
      dataset: 'employees',
      hint: 'Use a subquery: WHERE salary > (SELECT AVG(salary) FROM employees)',
      solution: "SELECT name, department, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees)",
      concept: 'Scalar subquery in WHERE'
    },
    
    insight: {
      type: 'mcq',
      question: 'What type of subquery returns a single value like AVG()?',
      options: ['Table subquery', 'Scalar subquery', 'Correlated subquery', 'Nested subquery'],
      correct: 1,
      explanation: 'A scalar subquery returns exactly one value (one row, one column).'
    }
  },
  
  // Day 5 - Friday (Medium: CASE)
  {
    id: 5,
    day: 'Friday',
    difficulty: 'Medium',
    topic: 'CASE Expressions',
    avgSolveTime: 5,
    solveRate: 68,
    
    warmup: {
      type: 'mcq',
      question: 'What does CASE return if no conditions match and there\'s no ELSE?',
      options: ['0', 'Empty string', 'NULL', 'Error'],
      correct: 2,
      explanation: 'Without ELSE, unmatched CASE returns NULL.'
    },
    
    core: {
      title: 'Categorize Movies',
      description: 'Categorize movies: **"Excellent"** (8+), **"Good"** (6-7.9), **"Average"** (below 6). Show title, rating, category.',
      dataset: 'movies',
      hint: 'Use CASE WHEN with multiple conditions',
      solution: "SELECT title, rating, CASE WHEN rating >= 8 THEN 'Excellent' WHEN rating >= 6 THEN 'Good' ELSE 'Average' END as category FROM movies",
      concept: 'CASE for categorization'
    },
    
    insight: {
      type: 'mcq',
      question: 'If multiple WHEN conditions are true, which is used?',
      options: [
        'All matching values',
        'The FIRST match',
        'The LAST match',
        'An error occurs'
      ],
      correct: 1,
      explanation: 'CASE uses the FIRST matching condition. Order matters!'
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
      question: 'What\'s wrong with this query?',
      code: 'SELECT department, COUNT(*)\nFROM employees\nWHERE COUNT(*) > 5\nGROUP BY department;',
      options: [
        'Missing column alias',
        'Can\'t use COUNT(*) in WHERE',
        'GROUP BY should come before WHERE',
        'Need table alias'
      ],
      correct: 1,
      explanation: 'Use HAVING for aggregate conditions, not WHERE.'
    },
    
    core: {
      title: 'Fix and Improve',
      description: 'Find departments with **more than 3 employees** AND **average salary over $70,000**. Show department, count, average salary.',
      dataset: 'employees',
      hint: 'GROUP BY department, use HAVING for both conditions',
      solution: "SELECT department, COUNT(*) as emp_count, AVG(salary) as avg_salary FROM employees GROUP BY department HAVING COUNT(*) > 3 AND AVG(salary) > 70000",
      concept: 'Multiple HAVING conditions'
    },
    
    insight: {
      type: 'truefalse',
      question: 'You can use column aliases (like emp_count) in the HAVING clause.',
      correct: false,
      explanation: 'HAVING runs before SELECT, so aliases aren\'t available. Repeat the expression.'
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
        'Ask clarifying questions',
        'Optimize for performance',
        'Write test cases'
      ],
      correct: 1,
      explanation: 'Always clarify requirements, edge cases, and expected output first!'
    },
    
    core: {
      title: 'Second Highest Salary',
      description: 'Find the **second highest salary**. If there\'s a tie for first, return the next distinct salary.',
      dataset: 'employees',
      hint: 'Use DISTINCT, ORDER BY DESC, LIMIT 1 OFFSET 1',
      solution: "SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1",
      alternativeSolution: "SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)",
      concept: 'Classic interview: Nth highest'
    },
    
    insight: {
      type: 'mcq',
      question: 'For "Nth highest" with ties, which approach is best?',
      options: [
        'LIMIT N',
        'DENSE_RANK()',
        'ROW_NUMBER()',
        'Simple MAX with subquery'
      ],
      correct: 1,
      explanation: 'DENSE_RANK() handles ties without skipping numbers.'
    }
  },
  
  // ========== WEEK 2 ==========
  
  // Day 8 - Monday (Easy)
  {
    id: 8,
    day: 'Monday',
    difficulty: 'Easy',
    topic: 'ORDER BY & LIMIT',
    avgSolveTime: 3,
    solveRate: 88,
    
    warmup: {
      type: 'mcq',
      question: 'What is the default ORDER BY direction?',
      options: ['Descending (Z-A)', 'Ascending (A-Z)', 'Random', 'Insertion order'],
      correct: 1,
      explanation: 'ORDER BY defaults to ASC. Use DESC for descending.'
    },
    
    core: {
      title: 'Top 5 Movies',
      description: 'Find the **top 5 highest-rated movies**. Show title, rating, and year, sorted by rating.',
      dataset: 'movies',
      hint: 'ORDER BY rating DESC, LIMIT 5',
      solution: "SELECT title, rating, year FROM movies ORDER BY rating DESC LIMIT 5",
      concept: 'Sorting and limiting'
    },
    
    insight: {
      type: 'truefalse',
      question: 'LIMIT always comes before ORDER BY.',
      correct: false,
      explanation: 'ORDER BY comes first. SQL sorts, then limits. Otherwise you limit random rows!'
    }
  },
  
  // Day 9 - Tuesday (Easy-Medium)
  {
    id: 9,
    day: 'Tuesday',
    difficulty: 'Easy-Medium',
    topic: 'DISTINCT & COUNT',
    avgSolveTime: 4,
    solveRate: 75,
    
    warmup: {
      type: 'mcq',
      question: 'What does COUNT(DISTINCT column) do?',
      options: [
        'Counts all rows',
        'Counts non-NULL values',
        'Counts unique non-NULL values',
        'Counts NULL values only'
      ],
      correct: 2,
      explanation: 'COUNT(DISTINCT) counts only unique, non-NULL values.'
    },
    
    core: {
      title: 'Unique Customers by Country',
      description: 'Count **unique customers** who ordered in each country. Show country and count, sorted by count descending.',
      dataset: 'ecommerce',
      hint: 'Use COUNT(DISTINCT customer_id) with GROUP BY',
      solution: "SELECT country, COUNT(DISTINCT customer_id) as unique_customers FROM orders GROUP BY country ORDER BY unique_customers DESC",
      concept: 'COUNT DISTINCT'
    },
    
    insight: {
      type: 'mcq',
      question: 'COUNT(*) vs COUNT(column) - which counts NULLs?',
      options: [
        'Both count NULLs',
        'Neither counts NULLs',
        'Only COUNT(*) counts NULLs',
        'Only COUNT(column) counts NULLs'
      ],
      correct: 2,
      explanation: 'COUNT(*) counts all rows. COUNT(column) skips NULLs.'
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
      explanation: 'SQLite uses strftime(). %Y extracts 4-digit year.'
    },
    
    core: {
      title: 'Orders by Month',
      description: 'Count orders **per month in 2024**. Show month number and order count, sorted by month.',
      dataset: 'ecommerce',
      hint: 'strftime("%m", order_date) for month, strftime("%Y", ...) for year filter',
      solution: "SELECT strftime('%m', order_date) as month, COUNT(*) as order_count FROM orders WHERE strftime('%Y', order_date) = '2024' GROUP BY month ORDER BY month",
      concept: 'Date extraction'
    },
    
    insight: {
      type: 'truefalse',
      question: 'strftime() returns a string, not a number.',
      correct: true,
      explanation: 'Yes! Cast if needed: CAST(strftime("%m", date) AS INTEGER)'
    }
  },
  
  // Day 11 - Thursday (Medium-Hard)
  {
    id: 11,
    day: 'Thursday',
    difficulty: 'Medium-Hard',
    topic: 'Self JOIN',
    avgSolveTime: 7,
    solveRate: 50,
    
    warmup: {
      type: 'mcq',
      question: 'A self JOIN is when you:',
      options: [
        'JOIN with a different database',
        'JOIN a table with itself',
        'JOIN without any condition',
        'JOIN using only primary keys'
      ],
      correct: 1,
      explanation: 'Self JOIN joins a table to itself, useful for hierarchies.'
    },
    
    core: {
      title: 'Employees and Managers',
      description: 'Show each employee\'s **name** and their **manager\'s name**. Only include those with managers.',
      dataset: 'employees',
      hint: 'JOIN employees to itself: e.manager_id = m.emp_id',
      solution: "SELECT e.name as employee, m.name as manager FROM employees e JOIN employees m ON e.manager_id = m.emp_id",
      concept: 'Self JOIN for hierarchies'
    },
    
    insight: {
      type: 'mcq',
      question: 'Why are aliases required in self JOINs?',
      options: [
        'Better performance',
        'Just for readability',
        'To distinguish between table instances',
        'SQL requires aliases for all JOINs'
      ],
      correct: 2,
      explanation: 'Aliases distinguish between the two "copies" of the same table.'
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
      options: ['TRUE', 'FALSE', 'NULL', 'Error'],
      correct: 2,
      explanation: 'NULL = NULL returns NULL (unknown). Use IS NULL instead.'
    },
    
    core: {
      title: 'Handle Missing Ages',
      description: 'Find all passengers with **unknown age (NULL)**. Show name and class.',
      dataset: 'titanic',
      hint: 'Use WHERE age IS NULL',
      solution: "SELECT name, pclass FROM passengers WHERE age IS NULL",
      concept: 'NULL comparison'
    },
    
    insight: {
      type: 'mcq',
      question: 'COALESCE(a, b, c) returns:',
      options: [
        'Always the first value',
        'Sum of all values',
        'First non-NULL value',
        'Last value'
      ],
      correct: 2,
      explanation: 'COALESCE returns first non-NULL. COALESCE(NULL, NULL, 5) = 5'
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
      question: 'What\'s wrong with this query?',
      code: 'SELECT name, department, salary\nFROM employees\nWHERE salary = MAX(salary);',
      options: [
        'Can\'t use = with MAX',
        'Aggregates can\'t be in WHERE',
        'Missing GROUP BY',
        'Syntax error in SELECT'
      ],
      correct: 1,
      explanation: 'Use subquery: WHERE salary = (SELECT MAX(salary) FROM employees)'
    },
    
    core: {
      title: 'Highest Earner',
      description: 'Find the employee(s) with the **highest salary**. Show name, department, salary.',
      dataset: 'employees',
      hint: 'Subquery for MAX(salary) in WHERE',
      solution: "SELECT name, department, salary FROM employees WHERE salary = (SELECT MAX(salary) FROM employees)",
      concept: 'Subquery for MAX'
    },
    
    insight: {
      type: 'truefalse',
      question: 'If multiple employees have the highest salary, this query returns all of them.',
      correct: true,
      explanation: 'WHERE salary = MAX returns ALL rows matching the maximum.'
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
      question: 'Most important consideration when writing SQL in interviews?',
      options: [
        'Shortest query',
        'Most advanced features',
        'Correct, readable, handles edge cases',
        'Finish fast'
      ],
      correct: 2,
      explanation: 'Correctness and readability beat cleverness.'
    },
    
    core: {
      title: 'Find Duplicate Orders',
      description: 'Find customer emails with **more than one order**. Show email and order count.',
      dataset: 'ecommerce',
      hint: 'GROUP BY email (via JOIN), HAVING COUNT(*) > 1',
      solution: "SELECT c.email, COUNT(*) as order_count FROM orders o JOIN customers c ON o.customer_id = c.customer_id GROUP BY c.email HAVING COUNT(*) > 1",
      concept: 'Finding duplicates'
    },
    
    insight: {
      type: 'mcq',
      question: 'To delete duplicates keeping one, which is safest?',
      options: [
        'DELETE with GROUP BY',
        'ROW_NUMBER() to identify, then DELETE',
        'DELETE all, re-insert unique',
        'DISTINCT in DELETE'
      ],
      correct: 1,
      explanation: 'ROW_NUMBER() numbers duplicates, then DELETE WHERE row_num > 1'
    }
  },
  
  // ========== WEEK 3 ==========
  
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
      question: 'Which function combines strings?',
      options: ['CONCAT()', 'MERGE()', 'COMBINE()', 'ADD()'],
      correct: 0,
      explanation: 'CONCAT() or || in SQLite: "Hello" || " World"'
    },
    
    core: {
      title: 'Format Names',
      description: 'Show passengers with **name in UPPERCASE** and **class as text** (First/Second/Third). **Limit to 20 rows.**',
      dataset: 'titanic',
      hint: 'Use UPPER() for name, CASE WHEN for class text',
      solution: "SELECT UPPER(name) as name_upper, CASE pclass WHEN 1 THEN 'First' WHEN 2 THEN 'Second' ELSE 'Third' END as class_name FROM passengers LIMIT 20",
      concept: 'String functions + CASE'
    },
    
    insight: {
      type: 'truefalse',
      question: 'UPPER() and LOWER() work on numbers too.',
      correct: false,
      explanation: 'String functions are for strings only.'
    }
  },
  
  // Day 16 - Tuesday (Easy-Medium)
  {
    id: 16,
    day: 'Tuesday',
    difficulty: 'Easy-Medium',
    topic: 'IN Operator',
    avgSolveTime: 4,
    solveRate: 78,
    
    warmup: {
      type: 'mcq',
      question: 'What does IN (1, 2, 3) check?',
      options: [
        'Value between 1 and 3',
        'Value equals 1, 2, OR 3',
        'Value equals 1, 2, AND 3',
        'Value greater than 3'
      ],
      correct: 1,
      explanation: 'IN checks if value matches ANY in the list.'
    },
    
    core: {
      title: 'Action & Comedy Movies',
      description: 'Find **Action or Comedy** movies with rating above 7. Show title, genre, rating.',
      dataset: 'movies',
      hint: 'Use IN for genres, AND for rating',
      solution: "SELECT title, genre, rating FROM movies WHERE genre IN ('Action', 'Comedy') AND rating > 7",
      concept: 'IN operator'
    },
    
    insight: {
      type: 'mcq',
      question: 'What happens with NOT IN when the list contains NULL?',
      options: [
        'Works normally',
        'Returns all rows',
        'Returns no rows',
        'Throws error'
      ],
      correct: 2,
      explanation: 'NOT IN with NULL = empty result. Use NOT EXISTS instead.'
    }
  },
  
  // Day 17 - Wednesday (Medium)
  {
    id: 17,
    day: 'Wednesday',
    difficulty: 'Medium',
    topic: 'UNION',
    avgSolveTime: 5,
    solveRate: 65,
    
    warmup: {
      type: 'mcq',
      question: 'Difference between UNION and UNION ALL?',
      options: [
        'UNION is faster',
        'UNION ALL removes duplicates',
        'UNION removes duplicates',
        'They\'re the same'
      ],
      correct: 2,
      explanation: 'UNION removes duplicates (slower). UNION ALL keeps all rows.'
    },
    
    core: {
      title: 'Combined Department List',
      description: 'List employees from **Engineering** and **Marketing** with a dept column. Use UNION.',
      dataset: 'employees',
      hint: 'Two SELECTs with different WHERE, combined with UNION',
      solution: "SELECT name, 'Engineering' as dept FROM employees WHERE department = 'Engineering' UNION SELECT name, 'Marketing' FROM employees WHERE department = 'Marketing'",
      concept: 'UNION'
    },
    
    insight: {
      type: 'truefalse',
      question: 'UNION requires both SELECTs to have the same number of columns.',
      correct: true,
      explanation: 'UNION needs matching column counts and compatible types.'
    }
  },
  
  // Day 18 - Thursday (Medium-Hard)
  {
    id: 18,
    day: 'Thursday',
    difficulty: 'Medium-Hard',
    topic: 'Window Functions',
    avgSolveTime: 7,
    solveRate: 48,
    
    warmup: {
      type: 'mcq',
      question: 'Which window function calculates a running total?',
      options: ['ROW_NUMBER()', 'RANK()', 'SUM() OVER', 'COUNT(*)'],
      correct: 2,
      explanation: 'SUM() OVER (ORDER BY ...) creates a running total.'
    },
    
    core: {
      title: 'Cumulative Revenue',
      description: 'Calculate **running total of revenue** by year for movies with non-null revenue. Show title, year, revenue_millions, cumulative. **Limit to 20 rows.**',
      dataset: 'movies',
      hint: 'Use SUM(revenue_millions) OVER (ORDER BY year, title) and filter with WHERE revenue_millions IS NOT NULL',
      solution: "SELECT title, year, revenue_millions, SUM(revenue_millions) OVER (ORDER BY year, title) as cumulative FROM movies WHERE revenue_millions IS NOT NULL LIMIT 20",
      concept: 'Running total'
    },
    
    insight: {
      type: 'mcq',
      question: 'In SUM() OVER (ORDER BY year), what does ORDER BY determine?',
      options: [
        'Final output order',
        'Order of calculation',
        'Which rows to include',
        'Nothing, optional'
      ],
      correct: 1,
      explanation: 'ORDER BY in window function determines calculation order.'
    }
  },
  
  // Day 19 - Friday (Medium)
  {
    id: 19,
    day: 'Friday',
    difficulty: 'Medium',
    topic: 'BETWEEN',
    avgSolveTime: 4,
    solveRate: 72,
    
    warmup: {
      type: 'truefalse',
      question: 'BETWEEN 10 AND 20 includes both 10 and 20.',
      correct: true,
      explanation: 'BETWEEN is inclusive: >= 10 AND <= 20'
    },
    
    core: {
      title: 'Mid-Range Salaries',
      description: 'Find employees with salaries **between $60K and $90K**. Show name, department, salary (sorted by salary DESC).',
      dataset: 'employees',
      hint: 'WHERE salary BETWEEN 60000 AND 90000',
      solution: "SELECT name, department, salary FROM employees WHERE salary BETWEEN 60000 AND 90000 ORDER BY salary DESC",
      concept: 'BETWEEN'
    },
    
    insight: {
      type: 'mcq',
      question: 'For date ranges, which is more readable?',
      options: [
        'date >= X AND date <= Y',
        'date BETWEEN X AND Y',
        'Both equally readable',
        'Neither'
      ],
      correct: 1,
      explanation: 'BETWEEN is clearer and shows inclusive bounds.'
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
      question: 'Find the error:',
      code: 'SELECT genre, title, rating,\n  RANK() OVER (ORDER BY rating DESC)\nFROM movies\nGROUP BY genre;',
      options: [
        'RANK() syntax wrong',
        'Can\'t mix window functions and GROUP BY this way',
        'Missing alias for RANK()',
        'ORDER BY should be outside'
      ],
      correct: 1,
      explanation: 'Use PARTITION BY genre in OVER clause, not GROUP BY.'
    },
    
    core: {
      title: 'Rank Movies by Genre',
      description: 'Rank movies **within each genre** by rating. Show genre, title, rating, rank.',
      dataset: 'movies',
      hint: 'RANK() OVER (PARTITION BY genre ORDER BY rating DESC)',
      solution: "SELECT genre, title, rating, RANK() OVER (PARTITION BY genre ORDER BY rating DESC) as genre_rank FROM movies",
      concept: 'PARTITION BY + RANK'
    },
    
    insight: {
      type: 'mcq',
      question: 'RANK() vs DENSE_RANK() with ties?',
      options: [
        'No difference',
        'RANK() skips numbers after ties',
        'DENSE_RANK() skips numbers',
        'RANK() can\'t handle ties'
      ],
      correct: 1,
      explanation: 'RANK: 1,1,3. DENSE_RANK: 1,1,2. Use DENSE_RANK for "top N".'
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
      question: 'For "find duplicates", what should you clarify?',
      options: [
        'Nothing, just write it',
        'Which columns define duplicate, show all or just values',
        'Which database',
        'How many duplicates expected'
      ],
      correct: 1,
      explanation: 'Clarify: which columns, show all rows or just duplicate values?'
    },
    
    core: {
      title: 'Year-over-Year',
      description: 'Compare each year\'s **total revenue** with **previous year** (exclude null revenues). Show year, revenue, prev_year revenue.',
      dataset: 'movies',
      hint: 'Use LAG() window function and filter WHERE revenue_millions IS NOT NULL',
      solution: "SELECT year, SUM(revenue_millions) as revenue, LAG(SUM(revenue_millions)) OVER (ORDER BY year) as prev_year FROM movies WHERE revenue_millions IS NOT NULL GROUP BY year ORDER BY year",
      concept: 'LAG for comparisons'
    },
    
    insight: {
      type: 'mcq',
      question: 'What does LAG(value, 2) return?',
      options: [
        'Value 2 rows ahead',
        'Value 2 rows behind',
        'Value × 2',
        '2nd highest value'
      ],
      correct: 1,
      explanation: 'LAG(v, N) = N rows BEFORE. LEAD = N rows AFTER.'
    }
  },
  
  // ========== WEEK 4 ==========
  
  // Day 22 - Monday (Easy)
  {
    id: 22,
    day: 'Monday',
    difficulty: 'Easy',
    topic: 'Aggregation Review',
    avgSolveTime: 3,
    solveRate: 85,
    
    warmup: {
      type: 'mcq',
      question: 'Which finds the middle value?',
      options: ['AVG()', 'MEDIAN()', 'MID()', 'SQLite has no built-in MEDIAN'],
      correct: 3,
      explanation: 'Most databases don\'t have MEDIAN. Use subqueries or window functions.'
    },
    
    core: {
      title: 'Movie Statistics',
      description: 'Show **average, max, min rating** and **total movie count**.',
      dataset: 'movies',
      hint: 'AVG(), MAX(), MIN(), COUNT(*) in one SELECT',
      solution: "SELECT AVG(rating) as avg_rating, MAX(rating) as max_rating, MIN(rating) as min_rating, COUNT(*) as total FROM movies",
      concept: 'Multiple aggregations'
    },
    
    insight: {
      type: 'truefalse',
      question: 'AVG() ignores NULL values.',
      correct: true,
      explanation: 'AVG() only considers non-NULLs. [10, NULL, 20] → AVG = 15'
    }
  },
  
  // Day 23 - Tuesday (Easy-Medium)
  {
    id: 23,
    day: 'Tuesday',
    difficulty: 'Easy-Medium',
    topic: 'LEFT JOIN',
    avgSolveTime: 5,
    solveRate: 70,
    
    warmup: {
      type: 'mcq',
      question: 'In LEFT JOIN, which table\'s rows are always included?',
      options: ['Right', 'Left', 'Both', 'Neither completely'],
      correct: 1,
      explanation: 'LEFT JOIN keeps ALL from left table, matching or not.'
    },
    
    core: {
      title: 'All Customers + Orders',
      description: 'Show **all customers** and order count. Include those with **0 orders** (show 0).',
      dataset: 'ecommerce',
      hint: 'LEFT JOIN, COUNT(order_id) handles NULLs correctly',
      solution: "SELECT c.name, COUNT(o.order_id) as order_count FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.name",
      concept: 'LEFT JOIN + COUNT'
    },
    
    insight: {
      type: 'mcq',
      question: 'Why COUNT(o.order_id) = 0 for no orders, but COUNT(*) = 1?',
      options: [
        'Bug',
        'COUNT(col) ignores NULLs, COUNT(*) counts rows',
        'They\'re the same',
        'LEFT JOIN changes COUNT'
      ],
      correct: 1,
      explanation: 'COUNT(*) counts the row. COUNT(col) counts non-NULLs (order_id is NULL).'
    }
  },
  
  // Day 24 - Wednesday (Medium)
  {
    id: 24,
    day: 'Wednesday',
    difficulty: 'Medium',
    topic: 'Multiple Conditions',
    avgSolveTime: 5,
    solveRate: 62,
    
    warmup: {
      type: 'truefalse',
      question: 'You can use both WHERE and HAVING in the same query.',
      correct: true,
      explanation: 'WHERE filters rows, HAVING filters groups. Use both!'
    },
    
    core: {
      title: 'High-Performing Depts',
      description: 'Find depts with **avg salary > $75K** AND **2+ employees**. Show dept, count, avg salary.',
      dataset: 'employees',
      hint: 'GROUP BY with two HAVING conditions',
      solution: "SELECT department, COUNT(*) as emp_count, AVG(salary) as avg_salary FROM employees GROUP BY department HAVING AVG(salary) > 75000 AND COUNT(*) >= 2",
      concept: 'Multiple HAVING'
    },
    
    insight: {
      type: 'mcq',
      question: 'To filter Engineering dept with avg > 75K, where does each filter go?',
      options: [
        'Both in HAVING',
        'Dept in WHERE, avg in HAVING',
        'Both in WHERE',
        'Doesn\'t matter'
      ],
      correct: 1,
      explanation: 'Row filters (dept) in WHERE. Group filters (avg) in HAVING.'
    }
  },
  
  // Day 25 - Thursday (Medium-Hard)
  {
    id: 25,
    day: 'Thursday',
    difficulty: 'Medium-Hard',
    topic: 'EXISTS',
    avgSolveTime: 6,
    solveRate: 52,
    
    warmup: {
      type: 'mcq',
      question: 'What does EXISTS return?',
      options: ['A count', 'Matching rows', 'TRUE or FALSE', 'NULL'],
      correct: 2,
      explanation: 'EXISTS returns TRUE if subquery has any rows, FALSE otherwise.'
    },
    
    core: {
      title: 'Customers with Electronics',
      description: 'Find customers with **at least one Electronics order**. Show name and email.',
      dataset: 'ecommerce',
      hint: 'EXISTS (SELECT 1 FROM orders WHERE customer_id matches AND category)',
      solution: "SELECT c.name, c.email FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id AND o.category = 'Electronics')",
      concept: 'EXISTS'
    },
    
    insight: {
      type: 'mcq',
      question: 'When is EXISTS faster than IN?',
      options: [
        'Subquery returns few rows',
        'Subquery returns many rows',
        'Always same speed',
        'EXISTS is always slower'
      ],
      correct: 1,
      explanation: 'EXISTS stops at first match. IN must process all. EXISTS wins with many rows.'
    }
  },
  
  // Day 26 - Friday (Medium)
  {
    id: 26,
    day: 'Friday',
    difficulty: 'Medium',
    topic: 'LIKE Patterns',
    avgSolveTime: 4,
    solveRate: 70,
    
    warmup: {
      type: 'mcq',
      question: 'In LIKE, what does % match?',
      options: ['One character', 'Zero or more characters', 'Only letters', 'Only numbers'],
      correct: 1,
      explanation: '% = any characters. _ = exactly one character.'
    },
    
    core: {
      title: 'Find Directors',
      description: 'Find movies by directors starting with **"Christopher"**. Show title, director, year.',
      dataset: 'movies',
      hint: 'WHERE director LIKE \'Christopher%\'',
      solution: "SELECT title, director, year FROM movies WHERE director LIKE 'Christopher%'",
      concept: 'LIKE patterns'
    },
    
    insight: {
      type: 'truefalse',
      question: 'LIKE is case-sensitive in SQLite by default.',
      correct: false,
      explanation: 'SQLite LIKE is case-INSENSITIVE for ASCII. "abc" LIKE "ABC" = TRUE'
    }
  },
  
  // Day 27 - Saturday (Debug)
  {
    id: 27,
    day: 'Saturday',
    difficulty: 'Mixed',
    topic: 'Debug Challenge',
    avgSolveTime: 5,
    solveRate: 58,
    
    warmup: {
      type: 'debug',
      question: 'Why might this fail?',
      code: 'SELECT customer_id, name\nFROM customers\nWHERE customer_id NOT IN (\n  SELECT customer_id FROM orders\n  WHERE customer_id IS NULL\n);',
      options: [
        'NOT IN with potential NULLs',
        'Syntax error',
        'Missing JOIN',
        'Wrong column names'
      ],
      correct: 0,
      explanation: 'NOT IN with any NULL = no results. Use NOT EXISTS.'
    },
    
    core: {
      title: 'Safe NOT IN',
      description: 'Find customers who **never ordered Electronics**. Use NOT EXISTS.',
      dataset: 'ecommerce',
      hint: 'NOT EXISTS (SELECT 1 FROM orders WHERE matches AND category)',
      solution: "SELECT name, email FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id AND o.category = 'Electronics')",
      concept: 'NOT EXISTS (safer)'
    },
    
    insight: {
      type: 'mcq',
      question: 'Safest "not in list" when NULLs might exist?',
      options: ['NOT IN', 'NOT EXISTS', '<> ALL', 'All the same'],
      correct: 1,
      explanation: 'NOT EXISTS handles NULLs correctly.'
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
      question: 'For "consecutive days" problems, which approach?',
      options: [
        'Multiple self-joins',
        'ROW_NUMBER() and date arithmetic',
        'Recursive CTE',
        'CASE statements'
      ],
      correct: 1,
      explanation: 'ROW_NUMBER minus date groups consecutive dates.'
    },
    
    core: {
      title: 'Top per Country',
      description: 'Find the **highest spending customer per country**. Show country, name, total spent.',
      dataset: 'ecommerce',
      hint: 'Calculate totals first, then find max per country',
      solution: "WITH totals AS (SELECT o.country, c.name, SUM(o.quantity * o.price) as spent FROM orders o JOIN customers c ON o.customer_id = c.customer_id GROUP BY o.country, c.customer_id) SELECT country, name, spent FROM totals t WHERE spent = (SELECT MAX(spent) FROM totals WHERE country = t.country)",
      concept: 'Top per group'
    },
    
    insight: {
      type: 'mcq',
      question: 'For "top N per group", most efficient approach?',
      options: [
        'Correlated subquery',
        'Multiple JOINs',
        'ROW_NUMBER() OVER PARTITION',
        'UNION ALL'
      ],
      correct: 2,
      explanation: 'ROW_NUMBER with PARTITION BY scans data once.'
    }
  },
  
  // Days 29-30 (Final Review)
  {
    id: 29,
    day: 'Monday',
    difficulty: 'Easy',
    topic: 'Complete Query',
    avgSolveTime: 3,
    solveRate: 88,
    
    warmup: {
      type: 'mcq',
      question: 'Correct clause order?',
      options: [
        'SELECT, WHERE, FROM, GROUP BY',
        'SELECT, FROM, WHERE, GROUP BY, ORDER BY',
        'FROM, SELECT, WHERE, ORDER BY',
        'SELECT, FROM, GROUP BY, WHERE'
      ],
      correct: 1,
      explanation: 'SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT'
    },
    
    core: {
      title: 'Full Query',
      description: 'Show **dept**, **avg salary** for depts with avg > $60K, sorted descending, **top 3 only**.',
      dataset: 'employees',
      hint: 'Use all clauses: GROUP BY, HAVING, ORDER BY, LIMIT',
      solution: "SELECT department, AVG(salary) as avg_sal FROM employees GROUP BY department HAVING AVG(salary) > 60000 ORDER BY avg_sal DESC LIMIT 3",
      concept: 'All clauses together'
    },
    
    insight: {
      type: 'truefalse',
      question: 'You can use avg_sal alias in HAVING.',
      correct: false,
      explanation: 'HAVING runs before SELECT. Repeat AVG(salary).'
    }
  },
  
  {
    id: 30,
    day: 'Tuesday',
    difficulty: 'Medium',
    topic: 'Final Challenge',
    avgSolveTime: 8,
    solveRate: 55,
    
    warmup: {
      type: 'mcq',
      question: 'Best way to keep improving SQL?',
      options: [
        'Memorize syntax',
        'Daily practice + learn from mistakes',
        'Read documentation',
        'Watch tutorials'
      ],
      correct: 1,
      explanation: 'Consistent practice with real problems is the fastest path!'
    },
    
    core: {
      title: 'Genre Summary',
      description: 'For genres with **5+ movies**: show genre, count, avg rating (1 decimal), total revenue. **Sort by avg rating DESC**.',
      dataset: 'movies',
      hint: 'GROUP BY genre, HAVING COUNT >= 5, ROUND for decimal, ORDER BY avg_rating',
      solution: "SELECT genre, COUNT(*) as movies, ROUND(AVG(rating), 1) as avg_rating, SUM(revenue_millions) as total_revenue FROM movies GROUP BY genre HAVING COUNT(*) >= 5 ORDER BY avg_rating DESC",
      concept: 'Comprehensive analysis'
    },
    
    insight: {
      type: 'mcq',
      question: 'You completed 30 days! What\'s next?',
      options: [
        'Done learning SQL',
        'Harder challenges + real datasets + interviews',
        'Start over from day 1',
        'Move to NoSQL'
      ],
      correct: 1,
      explanation: 'Keep practicing! Try LeetCode SQL, Kaggle datasets, interview prep!'
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
