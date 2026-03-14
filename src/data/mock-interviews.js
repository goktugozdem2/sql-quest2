// SQL Mock Interviews Data - Option A Freemium Model
// Free: 1 interview | Pro: Unlimited ($9.99/mo) | Lifetime: $49.99

window.mockInterviewsData = [
  // ============ FREE INTERVIEW ============
  {
    id: 'sql-fundamentals-free',
    title: 'SQL Fundamentals Assessment',
    company: 'General',
    role: 'Entry-Level Data Analyst',
    difficulty: 'Easy',
    totalTime: 25 * 60, // 25 minutes
    questionsCount: 4,
    isFree: true,
    description: 'Test your core SQL skills with fundamental queries. Perfect for beginners preparing for entry-level positions.',
    skills: ['SELECT', 'WHERE', 'ORDER BY', 'JOINs', 'Aggregation'],
    questions: [
      {
        id: 'free-q1',
        order: 1,
        title: 'Multi-column sort',
        description: 'The HR team wants a report on high earners. Find all employees with a salary over **$70,000**. Show their **name**, **department**, **position**, **salary**, and **performance_rating**. Sort by department A→Z first, then by salary within each department highest-first.',
        timeLimit: 5 * 60,
        difficulty: 'Easy',
        points: 20,
        dataset: 'employees',
        solution: "SELECT name, department, position, salary, performance_rating FROM employees WHERE salary > 70000 ORDER BY department ASC, salary DESC",
        hints: [
          'SELECT the five columns: name, department, position, salary, performance_rating',
          'ORDER BY accepts multiple columns separated by commas — each can have its own ASC or DESC'
        ],
        concepts: ['SELECT', 'WHERE', 'ORDER BY', 'Multi-column sort']
      },
      {
        id: 'free-q2',
        order: 2,
        title: 'Department salary summary',
        description: 'Generate a salary summary for each department. Show **department**, **headcount** (number of employees), **avg_salary** (rounded to 2 decimal places), **max_salary**, and **min_salary**. Sort by average salary descending.',
        timeLimit: 6 * 60,
        difficulty: 'Easy',
        points: 25,
        dataset: 'employees',
        solution: "SELECT department, COUNT(*) AS headcount, ROUND(AVG(salary), 2) AS avg_salary, MAX(salary) AS max_salary, MIN(salary) AS min_salary FROM employees GROUP BY department ORDER BY avg_salary DESC",
        hints: [
          'COUNT(*) gives total rows per group, AVG/MAX/MIN work on a column',
          'All four aggregate functions can sit in the same SELECT — GROUP BY still applies to all of them'
        ],
        concepts: ['GROUP BY', 'COUNT', 'AVG', 'MAX', 'MIN', 'ROUND']
      },
      {
        id: 'free-q3',
        order: 3,
        title: 'High-value order report',
        description: 'Customer support needs to prioritise big orders. List all orders with a total over **$200** showing the **order_id**, **customer name**, **product**, **quantity**, and **total**. Sort by total descending so the largest orders appear first.',
        timeLimit: 7 * 60,
        difficulty: 'Medium',
        points: 30,
        dataset: 'ecommerce',
        solution: "SELECT o.order_id, c.name AS customer_name, o.product, o.quantity, o.total FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE o.total > 200 ORDER BY o.total DESC",
        hints: [
          'JOIN orders and customers on customer_id — use table aliases (o, c) to keep it readable',
          'The WHERE clause filters rows BEFORE they are returned; ORDER BY sorts the final result'
        ],
        concepts: ['JOIN', 'WHERE', 'ORDER BY', 'Table Aliases']
      },
      {
        id: 'free-q4',
        order: 4,
        title: 'WHERE vs HAVING — high-earning departments',
        description: 'Finance needs two numbers per department: the count of employees earning above **$60,000** and what percentage of the department that represents. Show **department**, **high_earners** (count above $60k), and **pct_high_earners** (rounded to 1 decimal place). Only include departments where **more than 3** employees clear the threshold. This question tests the WHERE vs HAVING distinction — one of the most commonly confused concepts in SQL.',
        timeLimit: 8 * 60,
        difficulty: 'Medium',
        points: 25,
        dataset: 'employees',
        solution: "SELECT department, COUNT(*) AS high_earners, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM employees e2 WHERE e2.department = employees.department), 1) AS pct_high_earners FROM employees WHERE salary > 60000 GROUP BY department HAVING COUNT(*) > 3 ORDER BY high_earners DESC",
        hints: [
          'WHERE salary > 60000 filters individual rows BEFORE grouping — only high earners enter the aggregation',
          'HAVING COUNT(*) > 3 filters whole groups AFTER aggregation — departments with 3 or fewer high earners are excluded',
          'For the percentage, a correlated subquery counts all employees in the same department regardless of the WHERE filter'
        ],
        concepts: ['WHERE', 'GROUP BY', 'HAVING', 'COUNT', 'Correlated Subquery', 'Percentage']
      }
    ],
    passingScore: 60
  },

  // ============ PRO INTERVIEWS ============
  {
    id: 'data-analyst-mid',
    title: 'Data Analyst Interview',
    company: 'Tech Startup',
    role: 'Mid-Level Data Analyst',
    difficulty: 'Medium',
    totalTime: 35 * 60,
    questionsCount: 5,
    isFree: false,
    description: 'Real-world data analyst interview focusing on business insights, reporting, and data manipulation.',
    skills: ['JOINs', 'Subqueries', 'Date Functions', 'CASE WHEN', 'Window Functions'],
    questions: [
      {
        id: 'da-q1',
        order: 1,
        title: 'Monthly revenue report',
        description: 'Build a monthly revenue summary across all available data. Show the **month** (YYYY-MM format), **total_orders** (count of orders), **revenue** (sum of totals), and **avg_order_value** (rounded to 2 decimal places). Sort chronologically.',
        timeLimit: 6 * 60,
        difficulty: 'Easy',
        points: 15,
        dataset: 'ecommerce',
        solution: "SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS total_orders, SUM(total) AS revenue, ROUND(AVG(total), 2) AS avg_order_value FROM orders GROUP BY month ORDER BY month",
        hints: [
          "strftime('%Y-%m', order_date) formats a date column as YYYY-MM",
          'You can use multiple aggregate functions (COUNT, SUM, AVG) in the same GROUP BY query'
        ],
        concepts: ['Date Functions', 'strftime', 'COUNT', 'SUM', 'AVG', 'GROUP BY']
      },
      {
        id: 'da-q2',
        order: 2,
        title: 'Customer Segmentation',
        description: 'Categorize customers by total spending: **"VIP"** (>$500), **"Regular"** ($100-$500), **"Low"** (<$100). Show customer name and category.',
        timeLimit: 7 * 60,
        difficulty: 'Medium',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT c.name, CASE WHEN COALESCE(SUM(o.total), 0) > 500 THEN 'VIP' WHEN COALESCE(SUM(o.total), 0) >= 100 THEN 'Regular' ELSE 'Low' END as category FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.name",
        hints: [
          'Use CASE WHEN for categorization',
          'LEFT JOIN includes customers with no orders'
        ],
        concepts: ['CASE WHEN', 'LEFT JOIN', 'COALESCE', 'GROUP BY']
      },
      {
        id: 'da-q3',
        order: 3,
        title: 'Inactive Customers',
        description: 'Find customers who registered but have **never placed an order**. Show their name, email, and signup date.',
        timeLimit: 6 * 60,
        difficulty: 'Medium',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT c.name, c.email, c.signup_date FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id WHERE o.order_id IS NULL",
        hints: [
          'LEFT JOIN keeps all customers',
          'NULL check finds those without orders'
        ],
        concepts: ['LEFT JOIN', 'NULL Check', 'Filtering']
      },
      {
        id: 'da-q4',
        order: 4,
        title: 'Customer revenue ranking',
        description: 'Rank **all customers** by total spending and show each customer\'s revenue share. Show **revenue_rank**, **customer name**, **total_spent**, and **pct_of_total** (their percentage of total company revenue, rounded to 2 decimal places). Unlike a simple TOP 5, this ranks all customers and calculates each one\'s contribution — which requires both RANK and a grand-total window.',
        timeLimit: 10 * 60,
        difficulty: 'Hard',
        points: 25,
        dataset: 'ecommerce',
        solution: "WITH customer_revenue AS (SELECT c.customer_id, c.name, SUM(o.total) AS total_spent FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.name) SELECT RANK() OVER (ORDER BY total_spent DESC) AS revenue_rank, name, total_spent, ROUND(100.0 * total_spent / SUM(total_spent) OVER (), 2) AS pct_of_total FROM customer_revenue ORDER BY revenue_rank",
        hints: [
          'Use a CTE to first aggregate total_spent per customer',
          'RANK() OVER (ORDER BY total_spent DESC) gives the ranking',
          'SUM(total_spent) OVER () — with no ORDER BY and no PARTITION BY — computes the grand total across all rows',
          'Divide each customer total by the grand total and multiply by 100'
        ],
        concepts: ['RANK', 'SUM() OVER', 'Grand Total Window', 'CTE', 'Percentage of Total']
      },
      {
        id: 'da-q5',
        order: 5,
        title: 'Month-over-month revenue change',
        description: 'For every month in the dataset, calculate the **absolute revenue change** versus the previous month. Show **month** (YYYY-MM), **revenue**, **prev_revenue**, and **revenue_change** (current minus previous, rounded to 2 decimal places). Exclude the first month — it has no previous month to compare.',
        timeLimit: 9 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT month, revenue, prev_revenue, ROUND(revenue - prev_revenue, 2) AS revenue_change FROM (SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue, LAG(SUM(total)) OVER (ORDER BY strftime('%Y-%m', order_date)) AS prev_revenue FROM orders GROUP BY month) WHERE prev_revenue IS NOT NULL ORDER BY month",
        hints: [
          'First aggregate revenue by month in a subquery or CTE',
          'LAG(SUM(total)) inside the same window as GROUP BY — apply the window OVER the aggregated result',
          'Filter WHERE prev_revenue IS NOT NULL to drop the first row',
          'Revenue change = revenue - prev_revenue (no division needed — this is absolute, not percentage)'
        ],
        concepts: ['LAG', 'Window over aggregate', 'Subquery', 'Date Functions', 'NULL filtering']
      }
    ],
    passingScore: 60
  },

  {
    id: 'backend-engineer-sql',
    title: 'Backend Engineer SQL Round',
    company: 'SaaS Company',
    role: 'Backend Engineer',
    difficulty: 'Hard',
    totalTime: 40 * 60,
    questionsCount: 5,
    isFree: false,
    description: 'Technical SQL interview for backend roles. Focus on complex queries, data integrity, and performance.',
    skills: ['Complex JOINs', 'Subqueries', 'Window Functions', 'Data Integrity', 'Self-JOINs'],
    questions: [
      {
        id: 'be-q1',
        order: 1,
        title: 'Multi-table completed orders',
        description: 'Get a complete order summary: **order_id**, **customer name**, **product**, and **order total**. Only include orders with status = **\'completed\'** (lowercase). Sort by order_id ascending.',
        timeLimit: 7 * 60,
        difficulty: 'Medium',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT o.order_id, c.name AS customer_name, o.product, o.total FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE o.status = 'completed' ORDER BY o.order_id",
        hints: [
          'JOIN orders and customers on customer_id',
          "Status values in the data are lowercase — use WHERE o.status = 'completed' not 'Completed'"
        ],
        concepts: ['JOIN', 'WHERE', 'Status filter', 'Table Aliases']
      },
      {
        id: 'be-q2',
        order: 2,
        title: 'Above Average Query',
        description: 'Find employees who earn **more than the average salary in their department**. Show name, department, salary, and department average.',
        timeLimit: 8 * 60,
        difficulty: 'Hard',
        points: 25,
        dataset: 'employees',
        solution: "SELECT e.name, e.department, e.salary, dept_avg.avg_sal FROM employees e JOIN (SELECT department, AVG(salary) as avg_sal FROM employees GROUP BY department) dept_avg ON e.department = dept_avg.department WHERE e.salary > dept_avg.avg_sal",
        hints: [
          'Subquery calculates average per department',
          'JOIN to compare individual vs average'
        ],
        concepts: ['Subquery', 'JOIN', 'AVG', 'Comparison']
      },
      {
        id: 'be-q3',
        order: 3,
        title: 'Employee–manager lookup (self-join)',
        description: 'The org-chart tool needs manager names. For each employee, show their **name**, **department**, and their **manager_name**. Employees with no manager (NULL manager_id) should show **\'No Manager\'**. This is the **self-join pattern** — joining the employees table to itself using manager_id → emp_id.',
        timeLimit: 8 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'employees',
        solution: "SELECT e.name AS employee_name, e.department, COALESCE(m.name, 'No Manager') AS manager_name FROM employees e LEFT JOIN employees m ON e.manager_id = m.emp_id ORDER BY e.department, e.name",
        hints: [
          'Alias the same table twice: employees e (worker) and employees m (manager)',
          'JOIN condition: e.manager_id = m.emp_id — each employee\'s manager_id points to another employee\'s emp_id',
          'Use LEFT JOIN so employees with NULL manager_id still appear',
          "COALESCE(m.name, 'No Manager') returns the manager name, or 'No Manager' when NULL"
        ],
        concepts: ['Self-JOIN', 'LEFT JOIN', 'COALESCE', 'Table Aliases', 'Hierarchy']
      },
      {
        id: 'be-q4',
        order: 4,
        title: 'Running Total',
        description: 'Calculate the **running total of daily revenue**. Show order_date, daily total, and cumulative total.',
        timeLimit: 9 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT order_date, SUM(total) as daily_revenue, SUM(SUM(total)) OVER (ORDER BY order_date ROWS UNBOUNDED PRECEDING) as running_total FROM orders GROUP BY order_date ORDER BY order_date",
        hints: [
          'First GROUP BY date, then apply window function',
          'SUM() OVER (ORDER BY ...) creates running total'
        ],
        concepts: ['Window Functions', 'Running Total', 'GROUP BY']
      },
      {
        id: 'be-q5',
        order: 5,
        title: 'Duplicate email detection',
        description: 'A data quality check has flagged potential duplicate accounts. Find all **email addresses shared by more than one customer**. Show the **email**, the **duplicate_count**, and a **customer_names** list (comma-separated) of everyone using that email. Sort by duplicate count descending. In production, this query would feed an alert pipeline.',
        timeLimit: 9 * 60,
        difficulty: 'Medium',
        points: 15,
        dataset: 'ecommerce',
        solution: "SELECT email, COUNT(*) AS duplicate_count, GROUP_CONCAT(name, ', ') AS customer_names FROM customers GROUP BY email HAVING COUNT(*) > 1 ORDER BY duplicate_count DESC",
        hints: [
          'GROUP BY email collapses all customers sharing the same email into one row',
          'HAVING COUNT(*) > 1 keeps only groups with duplicates — WHERE would not work here (it runs before aggregation)',
          'GROUP_CONCAT(name, \', \') concatenates all names in the group into a single string'
        ],
        concepts: ['GROUP BY', 'HAVING', 'GROUP_CONCAT', 'Duplicate Detection', 'Data Quality']
      }
    ],
    passingScore: 55
  },

  {
    id: 'faang-sql-interview',
    title: 'FAANG-Style SQL Interview',
    company: 'Big Tech',
    role: 'Software Engineer / Data Engineer',
    difficulty: 'Hard',
    totalTime: 50 * 60,
    questionsCount: 5,
    isFree: false,
    description: 'Challenging interview simulating FAANG-level SQL questions. Tests advanced concepts and edge case handling.',
    skills: ['Advanced Window Functions', 'CTEs', 'Complex Subqueries', 'Self-JOINs', 'Edge Cases'],
    questions: [
      {
        id: 'faang-q1',
        order: 1,
        title: 'Second highest salary',
        description: 'Find the **second highest distinct salary** in the employees table. Return a single column called **second_highest**. If every employee earns the same salary (no second distinct value), return NULL. Write the solution using **DENSE_RANK** — the approach expected in a senior interview — rather than a nested MAX subquery.',
        timeLimit: 7 * 60,
        difficulty: 'Medium',
        points: 20,
        dataset: 'employees',
        solution: "SELECT salary AS second_highest FROM (SELECT DISTINCT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM employees) WHERE rnk = 2",
        hints: [
          'DISTINCT first — you want the second highest salary value, not the second highest row',
          'DENSE_RANK() OVER (ORDER BY salary DESC) gives rank 1 to the highest, 2 to the next distinct value',
          'Wrap in a subquery and filter WHERE rnk = 2',
          'If no second distinct salary exists, the outer query returns no rows — which is equivalent to NULL'
        ],
        concepts: ['DENSE_RANK', 'DISTINCT', 'Subquery', 'NULL handling', 'Window Functions']
      },
      {
        id: 'faang-q2',
        order: 2,
        title: 'Consecutive Orders',
        description: 'Find customers who placed orders on **at least 2 consecutive days**. Show customer name and their consecutive dates.',
        timeLimit: 12 * 60,
        difficulty: 'Hard',
        points: 25,
        dataset: 'ecommerce',
        solution: "SELECT DISTINCT c.name, o1.order_date as day1, o2.order_date as day2 FROM orders o1 JOIN orders o2 ON o1.customer_id = o2.customer_id AND DATE(o2.order_date) = DATE(o1.order_date, '+1 day') JOIN customers c ON o1.customer_id = c.customer_id",
        hints: [
          'Self-join orders to compare dates',
          "DATE(date, '+1 day') adds one day"
        ],
        concepts: ['Self-JOIN', 'Date Arithmetic', 'DISTINCT']
      },
      {
        id: 'faang-q3',
        order: 3,
        title: 'Longest-tenured employee per department',
        description: 'Find the **most tenured employee in each department** — the one who joined earliest. Show **department**, **name**, **hire_date**, and **years_tenure** (years since hire_date, rounded to 1 decimal). Handle ties: if two people share the same earliest hire_date, show both. This is a PARTITION BY pattern with ascending date order — different from salary ranking.',
        timeLimit: 10 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'employees',
        solution: "SELECT department, name, hire_date, ROUND((julianday('now') - julianday(hire_date)) / 365.25, 1) AS years_tenure FROM (SELECT *, RANK() OVER (PARTITION BY department ORDER BY hire_date ASC) AS rk FROM employees) WHERE rk = 1 ORDER BY years_tenure DESC",
        hints: [
          'RANK() OVER (PARTITION BY department ORDER BY hire_date ASC) — ASC because the earliest date = most tenure',
          'Use RANK() not ROW_NUMBER() to surface tied employees with the same hire_date',
          'julianday() converts a date string to a day number; subtract to get the difference',
          'Divide by 365.25 (not 365) to account for leap years'
        ],
        concepts: ['RANK', 'PARTITION BY', 'Date Arithmetic', 'julianday', 'Tie handling']
      },
      {
        id: 'faang-q4',
        order: 4,
        title: 'Gap to Next',
        description: 'For each employee, find the **salary gap** to the next highest earner in their department. Show name, salary, and gap.',
        timeLimit: 10 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'employees',
        solution: "SELECT name, department, salary, LEAD(salary) OVER (PARTITION BY department ORDER BY salary) - salary as gap_to_next FROM employees ORDER BY department, salary",
        hints: [
          'LEAD() gets next row value',
          'PARTITION BY for within-department'
        ],
        concepts: ['Window Functions', 'LEAD', 'PARTITION BY']
      },
      {
        id: 'faang-q5',
        order: 5,
        title: 'Percentile and quartile ranking',
        description: 'Categorise every order by two different distribution metrics. Show **order_id**, **total**, **percentile** (0–100, using PERCENT_RANK, rounded to the nearest integer), and **quartile** (1–4, using NTILE). Sort by total descending. Understanding the difference between PERCENT_RANK and NTILE is a real senior interview differentiator — PERCENT_RANK places rows in relative position, NTILE divides them into equal-sized buckets.',
        timeLimit: 11 * 60,
        difficulty: 'Hard',
        points: 15,
        dataset: 'ecommerce',
        solution: "SELECT order_id, total, ROUND(PERCENT_RANK() OVER (ORDER BY total) * 100, 0) AS percentile, NTILE(4) OVER (ORDER BY total) AS quartile FROM orders ORDER BY total DESC",
        hints: [
          'PERCENT_RANK() returns a value from 0.0 to 1.0 — multiply by 100 and ROUND() to get 0–100',
          'NTILE(4) splits rows into 4 equal buckets (quartiles): 1 = bottom 25%, 4 = top 25%',
          'Both functions use the same ORDER BY total — they can share the same window expression',
          'The first row (lowest total) gets PERCENT_RANK = 0.0; the last gets 1.0'
        ],
        concepts: ['PERCENT_RANK', 'NTILE', 'Window Functions', 'Percentile vs Quartile']
      }
    ],
    passingScore: 50
  },

  {
    id: 'business-analyst-sql',
    title: 'Business Analyst SQL Test',
    company: 'E-commerce Corp',
    role: 'Business Analyst',
    difficulty: 'Medium',
    totalTime: 30 * 60,
    questionsCount: 5,
    isFree: false,
    description: 'Business-focused SQL interview emphasizing KPIs, reporting, and actionable business insights.',
    skills: ['Reporting', 'KPIs', 'Aggregation', 'Percentages', 'Business Logic'],
    questions: [
      {
        id: 'ba-q1',
        order: 1,
        title: 'Daily customer and order metrics',
        description: 'Build a daily dashboard row. For each order date, show the **order_date**, number of **unique_customers**, total **orders**, and **avg_order_value** (rounded to 2 decimal places). Sort by date ascending. This combines COUNT(*), COUNT(DISTINCT), and AVG in a single GROUP BY — a standard business reporting pattern.',
        timeLimit: 6 * 60,
        difficulty: 'Easy',
        points: 15,
        dataset: 'ecommerce',
        solution: "SELECT order_date, COUNT(DISTINCT customer_id) AS unique_customers, COUNT(*) AS orders, ROUND(AVG(total), 2) AS avg_order_value FROM orders GROUP BY order_date ORDER BY order_date",
        hints: [
          'COUNT(*) counts all rows (orders); COUNT(DISTINCT customer_id) counts unique customers',
          'AVG(total) calculates the mean order value — ROUND(..., 2) keeps it to 2 decimal places',
          'All three aggregate functions sit in the same SELECT with the same GROUP BY'
        ],
        concepts: ['COUNT DISTINCT', 'COUNT', 'AVG', 'GROUP BY', 'DAU metrics']
      },
      {
        id: 'ba-q2',
        order: 2,
        title: 'Average order value by country',
        description: 'Calculate the **Average Order Value (AOV)** for each country. Show the **country** (from the orders table), the **order_count**, and **aov** rounded to 2 decimal places. Sort by AOV descending. Note: country is stored on the order, not the customer.',
        timeLimit: 6 * 60,
        difficulty: 'Easy',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT country, COUNT(*) AS order_count, ROUND(AVG(total), 2) AS aov FROM orders GROUP BY country ORDER BY aov DESC",
        hints: [
          'The country column lives on the orders table — no JOIN needed',
          'GROUP BY country, then apply COUNT(*) and AVG(total)',
          'ROUND(..., 2) keeps AOV to 2 decimal places'
        ],
        concepts: ['GROUP BY', 'AVG', 'COUNT', 'ROUND', 'Business Metrics']
      },
      {
        id: 'ba-q3',
        order: 3,
        title: 'Repeat Purchase Rate',
        description: 'Calculate the **percentage of customers** who have placed more than one order. Return a single percentage value.',
        timeLimit: 8 * 60,
        difficulty: 'Medium',
        points: 25,
        dataset: 'ecommerce',
        solution: "SELECT ROUND(100.0 * SUM(CASE WHEN order_count > 1 THEN 1 ELSE 0 END) / COUNT(*), 2) as repeat_rate FROM (SELECT customer_id, COUNT(*) as order_count FROM orders GROUP BY customer_id)",
        hints: [
          'First count orders per customer',
          'Then calculate % with more than 1'
        ],
        concepts: ['Subquery', 'CASE WHEN', 'Percentage Calculation']
      },
      {
        id: 'ba-q4',
        order: 4,
        title: 'Order Status Breakdown',
        description: 'Show the **count and percentage** of orders in each status (pending, completed, cancelled).',
        timeLimit: 6 * 60,
        difficulty: 'Medium',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT status, COUNT(*) as count, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM orders), 2) as percentage FROM orders GROUP BY status ORDER BY count DESC",
        hints: [
          'Subquery gets total count',
          'Calculate percentage for each status'
        ],
        concepts: ['GROUP BY', 'Subquery', 'Percentage']
      },
      {
        id: 'ba-q5',
        order: 5,
        title: 'Revenue and orders by day of week',
        description: 'The marketing team wants to know which days drive the most business. For each day of the week show: **day_num** (0=Sunday, 6=Saturday), **day_name**, **total_orders**, **total_revenue**, and **avg_order_value** (rounded to 2 decimal places). Sort by day_num so the week reads in order. This requires SQLite date functions plus CASE WHEN to translate numbers to names.',
        timeLimit: 7 * 60,
        difficulty: 'Medium',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT CAST(strftime('%w', order_date) AS INTEGER) AS day_num, CASE CAST(strftime('%w', order_date) AS INTEGER) WHEN 0 THEN 'Sunday' WHEN 1 THEN 'Monday' WHEN 2 THEN 'Tuesday' WHEN 3 THEN 'Wednesday' WHEN 4 THEN 'Thursday' WHEN 5 THEN 'Friday' ELSE 'Saturday' END AS day_name, COUNT(*) AS total_orders, ROUND(SUM(total), 2) AS total_revenue, ROUND(AVG(total), 2) AS avg_order_value FROM orders GROUP BY day_num ORDER BY day_num",
        hints: [
          "strftime('%w', order_date) returns the day-of-week as a text character ('0'=Sunday) — CAST to INTEGER first",
          'CASE WHEN maps each integer to a day name — cover all 7 values (0–6)',
          'GROUP BY day_num, then use COUNT(*), SUM(total), AVG(total) for the three metrics'
        ],
        concepts: ['Date Functions', 'strftime', 'CASE WHEN', 'CAST', 'GROUP BY', 'Multiple Aggregates']
      }
    ],
    passingScore: 60
  },

  {
    id: 'senior-data-engineer',
    title: 'Senior Data Engineer Interview',
    company: 'Fintech',
    role: 'Senior Data Engineer',
    difficulty: 'Hard',
    totalTime: 55 * 60,
    questionsCount: 5,
    isFree: false,
    description: 'Advanced SQL interview for senior positions. Focus on optimization, complex transformations, and analytics.',
    skills: ['Advanced Window Functions', 'CTEs', 'Performance', 'Complex Analytics', 'Data Quality'],
    questions: [
      {
        id: 'sde-q1',
        order: 1,
        title: '7-day rolling average revenue',
        description: 'Calculate a **7-day rolling average of daily revenue** to smooth out day-to-day noise. Show **day** (DATE format), **daily_revenue**, and **rolling_7day_avg** (rounded to 2 decimal places). The first 6 rows will have a rolling average over fewer than 7 days — that is expected. This is one of the most common advanced window frame patterns in data engineering.',
        timeLimit: 10 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'ecommerce',
        solution: "WITH daily AS (SELECT DATE(order_date) AS day, SUM(total) AS daily_revenue FROM orders GROUP BY DATE(order_date)) SELECT day, daily_revenue, ROUND(AVG(daily_revenue) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS rolling_7day_avg FROM daily ORDER BY day",
        hints: [
          'First aggregate to one row per day using a CTE: GROUP BY DATE(order_date)',
          'AVG() OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) is the 7-day window',
          'ROWS BETWEEN 6 PRECEDING AND CURRENT ROW = current row + 6 previous rows = 7 rows',
          'The frame clause narrows the window — without it, AVG() OVER cumulates all prior rows'
        ],
        concepts: ['Rolling Average', 'Frame Clause', 'ROWS BETWEEN', 'AVG() OVER', 'CTE']
      },
      {
        id: 'sde-q2',
        order: 2,
        title: 'Customer Cohort',
        description: 'Group customers by **signup month** and calculate how many orders each cohort placed in their first 30 days. Show signup month and order count.',
        timeLimit: 12 * 60,
        difficulty: 'Hard',
        points: 25,
        dataset: 'ecommerce',
        solution: "SELECT strftime('%Y-%m', c.signup_date) as cohort, COUNT(o.order_id) as orders_in_30_days FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id AND julianday(o.order_date) - julianday(c.signup_date) BETWEEN 0 AND 30 GROUP BY cohort ORDER BY cohort",
        hints: [
          'JOIN with date range condition',
          'julianday() for date math'
        ],
        concepts: ['Cohort Analysis', 'Date Math', 'LEFT JOIN']
      },
      {
        id: 'sde-q3',
        order: 3,
        title: 'Top 10% orders with category context',
        description: 'Find all orders in the **top 10% by total value**. Show **order_id**, **category**, **total**, **percentile_rank** (0–100 rounded to 1 decimal), and **category_rank** (rank within the order\'s own category by total, highest first). This combines a global percentile filter with a within-group ranking — two different window partitions on the same query.',
        timeLimit: 12 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT order_id, category, total, ROUND(PERCENT_RANK() OVER (ORDER BY total) * 100, 1) AS percentile_rank, RANK() OVER (PARTITION BY category ORDER BY total DESC) AS category_rank FROM orders WHERE order_id IN (SELECT order_id FROM (SELECT order_id, PERCENT_RANK() OVER (ORDER BY total) AS pct FROM orders) WHERE pct >= 0.90) ORDER BY total DESC",
        hints: [
          'First identify the top-10% order_ids using a subquery: PERCENT_RANK() >= 0.90',
          'Then in the outer query, compute both window functions on the filtered set',
          'PERCENT_RANK() OVER (ORDER BY total) — no PARTITION BY — ranks across all orders globally',
          'RANK() OVER (PARTITION BY category ORDER BY total DESC) restarts the rank for each category',
          'You need two separate OVER clauses in the same SELECT — that is valid SQL'
        ],
        concepts: ['PERCENT_RANK', 'RANK', 'PARTITION BY', 'Multiple Windows', 'Subquery filter']
      },
      {
        id: 'sde-q4',
        order: 4,
        title: 'Gap Detection',
        description: 'Find **gaps in order IDs** (missing sequence numbers). Show the start and end of each gap.',
        timeLimit: 12 * 60,
        difficulty: 'Very Hard',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT order_id + 1 as gap_start, next_id - 1 as gap_end FROM (SELECT order_id, LEAD(order_id) OVER (ORDER BY order_id) as next_id FROM orders) WHERE next_id - order_id > 1",
        hints: [
          'LEAD() gets the next order_id',
          'Gap exists when difference > 1'
        ],
        concepts: ['Window Functions', 'LEAD', 'Gap Analysis']
      },
      {
        id: 'sde-q5',
        order: 5,
        title: 'Cumulative Distinct',
        description: 'Calculate the **cumulative count of unique customers** over time. Show date and running unique customer count.',
        timeLimit: 11 * 60,
        difficulty: 'Very Hard',
        points: 15,
        dataset: 'ecommerce',
        solution: "SELECT order_date, (SELECT COUNT(DISTINCT o2.customer_id) FROM orders o2 WHERE o2.order_date <= o1.order_date) as cumulative_customers FROM (SELECT DISTINCT order_date FROM orders) o1 ORDER BY order_date",
        hints: [
          'Correlated subquery counts up to each date',
          'Cannot use simple window function for distinct'
        ],
        concepts: ['Correlated Subquery', 'Cumulative Distinct', 'Advanced Analytics']
      }
    ],
    passingScore: 50
  },

  // ============ TOP 10 MOST ASKED ============
  {
    id: 'top-10-most-asked',
    title: 'Top 10 Most-Asked SQL Questions',
    company: 'FAANG',
    role: 'Data Analyst / Data Engineer',
    difficulty: 'Hard',
    totalTime: 90 * 60,
    questionsCount: 10,
    isFree: false,
    description: 'The 10 SQL patterns that appear most often in real FAANG interviews — based on hundreds of interview reports from Meta, Google, Amazon, Netflix and Stripe. Master these and you\'re ready for any data interview.',
    skills: ['Window Functions', 'CTEs', 'Anti-joins', 'Running Totals', 'Retention', 'Ranking', 'Consecutive Days', 'Conditional Aggregation', 'Median'],
    questions: [
      {
        id: 'top10-q1',
        order: 1,
        title: 'Top N per group',
        description: 'The single most common FAANG SQL pattern. Find the **top 2 highest-paid employees in each department**. Show department, name, salary, and their rank within the department. Handle ties so two employees with the same salary both appear.',
        timeLimit: 10 * 60,
        difficulty: 'Hard',
        points: 10,
        dataset: 'employees',
        solution: "SELECT department, name, salary, rnk FROM (SELECT department, name, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk FROM employees) ranked WHERE rnk <= 2 ORDER BY department, rnk",
        hints: [
          'Use DENSE_RANK() not ROW_NUMBER() — ties should both appear',
          'PARTITION BY department restarts the rank for each department',
          'Filter rnk <= 2 in an outer query or subquery'
        ],
        concepts: ['DENSE_RANK', 'PARTITION BY', 'Window Functions', 'Subquery']
      },
      {
        id: 'top10-q2',
        order: 2,
        title: 'Running total (cumulative sum)',
        description: 'Calculate the **running total of revenue** across all orders, ordered by order date. Show order_id, order_date, total (for that order), and cumulative_revenue (running total up to and including that order).',
        timeLimit: 8 * 60,
        difficulty: 'Medium',
        points: 10,
        dataset: 'ecommerce',
        solution: "SELECT order_id, order_date, total, SUM(total) OVER (ORDER BY order_date, order_id) AS cumulative_revenue FROM orders ORDER BY order_date, order_id",
        hints: [
          'SUM() OVER (ORDER BY ...) creates a running total',
          'Without PARTITION BY, the window covers all rows',
          'Add order_id as a tiebreaker when dates are equal'
        ],
        concepts: ['SUM() OVER', 'Window Functions', 'Cumulative Sum']
      },
      {
        id: 'top10-q3',
        order: 3,
        title: 'Finding duplicates',
        description: 'Find all **email addresses that are shared by more than one customer**. Return the email and how many customers share it, sorted by count descending. This tests GROUP BY + HAVING — the most commonly confused clause pair.',
        timeLimit: 6 * 60,
        difficulty: 'Easy',
        points: 10,
        dataset: 'ecommerce',
        solution: "SELECT email, COUNT(*) AS occurrences FROM customers GROUP BY email HAVING COUNT(*) > 1 ORDER BY occurrences DESC",
        hints: [
          'GROUP BY email to group per email',
          'HAVING filters after aggregation — WHERE would not work here',
          'COUNT(*) counts rows per group'
        ],
        concepts: ['GROUP BY', 'HAVING', 'COUNT', 'Duplicates']
      },
      {
        id: 'top10-q4',
        order: 4,
        title: 'Employees with shared salaries',
        description: 'Find all salaries that are **shared by more than one employee**. For each such salary, show the **salary**, how many employees **share_it**, and a comma-separated **employees_list** of their names. Order by salary descending. This tests CTE + HAVING + GROUP_CONCAT — a common pattern for detecting collisions and duplicates in real data.',
        timeLimit: 9 * 60,
        difficulty: 'Medium',
        points: 10,
        dataset: 'employees',
        solution: "WITH shared AS (SELECT salary, COUNT(*) AS share_it FROM employees GROUP BY salary HAVING COUNT(*) > 1) SELECT e.salary, s.share_it, GROUP_CONCAT(e.name, ', ') AS employees_list FROM employees e JOIN shared s ON e.salary = s.salary GROUP BY e.salary ORDER BY e.salary DESC",
        hints: [
          'Step 1 (CTE): GROUP BY salary, HAVING COUNT(*) > 1 finds salaries that appear more than once',
          'Step 2: JOIN employees back to the CTE to get the names',
          'GROUP_CONCAT(name, \', \') concatenates names within each salary group',
          'GROUP BY e.salary in the outer query collapses to one row per shared salary'
        ],
        concepts: ['CTE', 'HAVING', 'GROUP_CONCAT', 'JOIN', 'Duplicate detection']
      },
      {
        id: 'top10-q5',
        order: 5,
        title: 'Month-over-month revenue growth',
        description: 'Calculate the **month-over-month revenue growth rate** for each month. Show the month (YYYY-MM), that month\'s revenue, the previous month\'s revenue, and the percentage change rounded to 2 decimal places. Return NULL for the first month.',
        timeLimit: 10 * 60,
        difficulty: 'Hard',
        points: 10,
        dataset: 'ecommerce',
        solution: "WITH monthly AS (SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue FROM orders GROUP BY month) SELECT month, revenue, LAG(revenue) OVER (ORDER BY month) AS prev_revenue, ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month)) / LAG(revenue) OVER (ORDER BY month), 2) AS pct_change FROM monthly ORDER BY month",
        hints: [
          'First aggregate revenue by month using a CTE',
          'LAG(revenue) OVER (ORDER BY month) gets the previous row',
          'Percentage change = (current - previous) / previous * 100',
          'LAG returns NULL for the first row — no special handling needed'
        ],
        concepts: ['LAG', 'CTE', 'Window Functions', 'Date Functions', 'Percentage Change']
      },
      {
        id: 'top10-q6',
        order: 6,
        title: 'Anti-join: ordered but never completed',
        description: 'Find all customers who have **placed at least one order** but have **no completed orders** (status = \'completed\'). Return the customer name and their total number of orders. This tests the anti-join pattern — one of the most important SQL patterns for funnel analysis.',
        timeLimit: 9 * 60,
        difficulty: 'Medium',
        points: 10,
        dataset: 'ecommerce',
        solution: "SELECT c.name, COUNT(o.order_id) AS total_orders FROM customers c JOIN orders o ON c.customer_id = o.customer_id WHERE c.customer_id NOT IN (SELECT DISTINCT customer_id FROM orders WHERE status = 'completed') GROUP BY c.customer_id, c.name ORDER BY total_orders DESC",
        hints: [
          "Status values are lowercase in the data: use 'completed', 'pending', 'cancelled'",
          'The subquery finds every customer_id that has at least one completed order',
          'NOT IN on that subquery keeps only customers who never appear in completed orders',
          "Alternative approach: LEFT JOIN orders completed_orders ON c.customer_id = completed_orders.customer_id AND completed_orders.status = 'completed' WHERE completed_orders.customer_id IS NULL"
        ],
        concepts: ['Anti-join', 'NOT IN', 'Subquery', 'JOIN', 'Funnel Analysis']
      },
      {
        id: 'top10-q7',
        order: 7,
        title: 'Consecutive days with orders (streak detection)',
        description: 'Find all customers who placed orders on **at least 3 consecutive days**. Return the customer name, the start date of their streak, and the streak length. This is the classic "gaps and islands" pattern.',
        timeLimit: 14 * 60,
        difficulty: 'Hard',
        points: 10,
        dataset: 'ecommerce',
        solution: "WITH daily AS (SELECT customer_id, DATE(order_date) AS day, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY DATE(order_date)) AS rn FROM orders GROUP BY customer_id, DATE(order_date)), grouped AS (SELECT customer_id, day, DATE(day, '-' || rn || ' days') AS grp FROM daily) SELECT c.name, MIN(g.day) AS streak_start, COUNT(*) AS streak_length FROM grouped g JOIN customers c ON g.customer_id = c.customer_id GROUP BY g.customer_id, g.grp HAVING COUNT(*) >= 3 ORDER BY streak_length DESC",
        hints: [
          'GROUP BY customer_id and date first to get one row per day',
          'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day) gives a sequential rank',
          'Subtract the row number from the date — consecutive days produce the same result',
          'GROUP BY that result and count rows >= 3'
        ],
        concepts: ['Gaps and Islands', 'ROW_NUMBER', 'Date Arithmetic', 'CTE', 'Self-Join Pattern']
      },
      {
        id: 'top10-q8',
        order: 8,
        title: 'Click-through rate (conditional aggregation)',
        description: 'From the orders table, calculate the **conversion rate by product category**: the percentage of orders with status = \'Completed\' out of all orders, per category. Show category, total_orders, completed_orders, and conversion_rate rounded to 1 decimal place.',
        timeLimit: 8 * 60,
        difficulty: 'Medium',
        points: 10,
        dataset: 'ecommerce',
        solution: "SELECT category, COUNT(*) AS total_orders, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders, ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 1) AS conversion_rate FROM orders GROUP BY category ORDER BY conversion_rate DESC",
        hints: [
          'SUM(CASE WHEN status = \'Completed\' THEN 1 ELSE 0 END) counts completed rows',
          'Divide by COUNT(*) for the rate — multiply by 100.0 to avoid integer division',
          'ROUND(..., 1) gives one decimal place'
        ],
        concepts: ['CASE WHEN', 'Conditional Aggregation', 'SUM', 'GROUP BY', 'Conversion Rate']
      },
      {
        id: 'top10-q9',
        order: 9,
        title: 'Median salary (without MEDIAN function)',
        description: 'Calculate the **median salary** across all employees. SQLite has no MEDIAN() function, so derive it manually. Return a single value labelled median_salary. This is a Google favourite and tests whether you understand window frame arithmetic.',
        timeLimit: 12 * 60,
        difficulty: 'Hard',
        points: 10,
        dataset: 'employees',
        solution: "WITH ranked AS (SELECT salary, ROW_NUMBER() OVER (ORDER BY salary) AS rn, COUNT(*) OVER () AS total FROM employees) SELECT ROUND(AVG(salary), 2) AS median_salary FROM ranked WHERE rn IN (CAST((total + 1) / 2 AS INT), CAST((total + 2) / 2 AS INT))",
        hints: [
          'ROW_NUMBER() OVER (ORDER BY salary) ranks each salary',
          'COUNT(*) OVER () gives total rows in every row',
          'For odd N: median is at position (N+1)/2',
          'For even N: median is average of positions N/2 and N/2+1',
          'Use IN (..., ...) to handle both odd and even cases'
        ],
        concepts: ['ROW_NUMBER', 'COUNT() OVER', 'Median', 'Window Functions', 'AVG']
      },
      {
        id: 'top10-q10',
        order: 10,
        title: 'Customer cohort retention (Day-1)',
        description: 'For each customer\'s **first order month** (their cohort), find how many customers placed another order **at least 30 days later**. Show the cohort month, total customers in that cohort, retained customers, and retention rate as a percentage. This is Meta\'s most famous interview question pattern.',
        timeLimit: 14 * 60,
        difficulty: 'Hard',
        points: 10,
        dataset: 'ecommerce',
        solution: "WITH first_orders AS (SELECT customer_id, MIN(DATE(order_date)) AS first_date, strftime('%Y-%m', MIN(order_date)) AS cohort FROM orders GROUP BY customer_id), retained AS (SELECT f.customer_id, f.cohort FROM first_orders f JOIN orders o ON f.customer_id = o.customer_id WHERE DATE(o.order_date) >= DATE(f.first_date, '+30 days')) SELECT f.cohort, COUNT(DISTINCT f.customer_id) AS cohort_size, COUNT(DISTINCT r.customer_id) AS retained, ROUND(100.0 * COUNT(DISTINCT r.customer_id) / COUNT(DISTINCT f.customer_id), 1) AS retention_rate FROM first_orders f LEFT JOIN retained r ON f.customer_id = r.customer_id GROUP BY f.cohort ORDER BY f.cohort",
        hints: [
          'Step 1: find each customer\'s first order date (their cohort entry)',
          'Step 2: find customers who ordered again 30+ days after their first order',
          'Step 3: LEFT JOIN so customers with no return still appear (as 0)',
          'Use COUNT(DISTINCT) to avoid double-counting'
        ],
        concepts: ['CTE', 'Cohort Analysis', 'Retention', 'LEFT JOIN', 'Date Arithmetic', 'COUNT DISTINCT']
      }
    ],
    passingScore: 60
  }
];

// Categories for filtering
window.interviewCategories = [
  { id: 'all', label: 'All Interviews', icon: '📋' },
  { id: 'free', label: 'Free', icon: '🆓' },
  { id: 'top10', label: 'Top 10 Most Asked', icon: '🔥' },
  { id: 'data-analyst', label: 'Data Analyst', icon: '📊' },
  { id: 'backend', label: 'Backend Engineer', icon: '⚙️' },
  { id: 'faang', label: 'FAANG-Style', icon: '🏢' },
  { id: 'senior', label: 'Senior Level', icon: '👨‍💼' }
];

// Get category for an interview
window.getInterviewCategory = (interview) => {
  if (interview.isFree) return 'free';
  if (interview.id === 'top-10-most-asked') return 'top10';
  if (interview.id.includes('analyst') || interview.id.includes('business')) return 'data-analyst';
  if (interview.id.includes('backend')) return 'backend';
  if (interview.id.includes('faang')) return 'faang';
  if (interview.id.includes('senior')) return 'senior';
  return 'all';
};
