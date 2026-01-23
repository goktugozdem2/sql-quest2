// SQL Mock Interviews Data - Option A Freemium Model
// Free: 1 interview | Pro: Unlimited ($9.99/mo) | Lifetime: $49.99

window.mockInterviewsData = [
  // ============ FREE INTERVIEW ============
  {
    id: 'sql-fundamentals-free',
    title: 'SQL Fundamentals Assessment',
    company: 'General',
    role: 'Entry-Level Data Analyst',
    difficulty: 'Easy-Medium',
    totalTime: 25 * 60, // 25 minutes
    questionsCount: 4,
    isFree: true,
    description: 'Test your core SQL skills with fundamental queries. Perfect for beginners preparing for entry-level positions.',
    skills: ['SELECT', 'WHERE', 'ORDER BY', 'JOINs', 'Aggregation'],
    questions: [
      {
        id: 'free-q1',
        order: 1,
        title: 'Filter and Sort',
        description: 'Write a query to find all **employees** with a salary greater than **$70,000**. Show their **name**, **department**, and **salary**, sorted by salary in descending order.',
        timeLimit: 5 * 60,
        difficulty: 'Easy',
        points: 20,
        dataset: 'employees',
        solution: "SELECT name, department, salary FROM employees WHERE salary > 70000 ORDER BY salary DESC",
        hints: [
          'Use WHERE to filter by salary',
          'Use ORDER BY column DESC for descending order'
        ],
        concepts: ['SELECT', 'WHERE', 'ORDER BY']
      },
      {
        id: 'free-q2',
        order: 2,
        title: 'Aggregation Basics',
        description: 'Calculate the **average salary** for each **department**. Show the department name and average salary, rounded to 2 decimal places.',
        timeLimit: 6 * 60,
        difficulty: 'Easy',
        points: 25,
        dataset: 'employees',
        solution: "SELECT department, ROUND(AVG(salary), 2) as avg_salary FROM employees GROUP BY department",
        hints: [
          'Use GROUP BY to group by department',
          'AVG() calculates average, ROUND() rounds the result'
        ],
        concepts: ['GROUP BY', 'AVG', 'ROUND']
      },
      {
        id: 'free-q3',
        order: 3,
        title: 'JOIN Tables',
        description: 'List all **orders** with their **customer names**. Show the order_id, customer name, and order total. Include only orders over **$100**.',
        timeLimit: 7 * 60,
        difficulty: 'Medium',
        points: 30,
        dataset: 'ecommerce',
        solution: "SELECT o.order_id, c.name, o.total FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE o.total > 100",
        hints: [
          'JOIN orders with customers on customer_id',
          'Use table aliases (o, c) for cleaner code'
        ],
        concepts: ['JOIN', 'WHERE', 'Table Aliases']
      },
      {
        id: 'free-q4',
        order: 4,
        title: 'Grouping with Conditions',
        description: 'Find departments that have **more than 3 employees** with a salary above **$60,000**. Show the department and the count.',
        timeLimit: 7 * 60,
        difficulty: 'Medium',
        points: 25,
        dataset: 'employees',
        solution: "SELECT department, COUNT(*) as high_earners FROM employees WHERE salary > 60000 GROUP BY department HAVING COUNT(*) > 3",
        hints: [
          'First filter with WHERE, then group',
          'Use HAVING to filter after GROUP BY'
        ],
        concepts: ['WHERE', 'GROUP BY', 'HAVING', 'COUNT']
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
        title: 'Monthly Revenue Report',
        description: 'Calculate the **total revenue per month** for 2024. Show the month (YYYY-MM format) and total revenue, sorted chronologically.',
        timeLimit: 5 * 60,
        difficulty: 'Easy',
        points: 15,
        dataset: 'ecommerce',
        solution: "SELECT strftime('%Y-%m', order_date) as month, SUM(total) as revenue FROM orders WHERE strftime('%Y', order_date) = '2024' GROUP BY month ORDER BY month",
        hints: [
          "Use strftime('%Y-%m', date) to format as YYYY-MM",
          'GROUP BY the formatted month'
        ],
        concepts: ['Date Functions', 'SUM', 'GROUP BY']
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
        title: 'Top Spending Customers',
        description: 'Find the **top 5 customers** by total spending. Show rank, customer name, and total spent.',
        timeLimit: 8 * 60,
        difficulty: 'Medium-Hard',
        points: 25,
        dataset: 'ecommerce',
        solution: "SELECT ROW_NUMBER() OVER (ORDER BY SUM(o.total) DESC) as rank, c.name, SUM(o.total) as total_spent FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.name ORDER BY total_spent DESC LIMIT 5",
        hints: [
          'ROW_NUMBER() creates ranking',
          'JOIN and GROUP BY to sum per customer'
        ],
        concepts: ['Window Functions', 'ROW_NUMBER', 'GROUP BY', 'LIMIT']
      },
      {
        id: 'da-q5',
        order: 5,
        title: 'Year-over-Year Comparison',
        description: 'Compare **total revenue between 2023 and 2024**. Show year, revenue, and the difference from previous year.',
        timeLimit: 9 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT year, revenue, revenue - LAG(revenue) OVER (ORDER BY year) as yoy_diff FROM (SELECT strftime('%Y', order_date) as year, SUM(total) as revenue FROM orders WHERE strftime('%Y', order_date) IN ('2023', '2024') GROUP BY year) ORDER BY year",
        hints: [
          'LAG() gets previous row value',
          'Subquery first aggregates by year'
        ],
        concepts: ['Window Functions', 'LAG', 'Subquery', 'Date Functions']
      }
    ],
    passingScore: 60
  },

  {
    id: 'backend-engineer-sql',
    title: 'Backend Engineer SQL Round',
    company: 'SaaS Company',
    role: 'Backend Engineer',
    difficulty: 'Medium-Hard',
    totalTime: 40 * 60,
    questionsCount: 5,
    isFree: false,
    description: 'Technical SQL interview for backend roles. Focus on complex queries, data integrity, and performance.',
    skills: ['Complex JOINs', 'Subqueries', 'Window Functions', 'Data Integrity', 'Self-JOINs'],
    questions: [
      {
        id: 'be-q1',
        order: 1,
        title: 'Multi-table Query',
        description: 'Get a complete order summary: **order_id**, **customer name**, **item count**, and **order total**. Only include completed orders.',
        timeLimit: 7 * 60,
        difficulty: 'Medium',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT o.order_id, c.name as customer_name, COUNT(oi.item_id) as item_count, o.total FROM orders o JOIN customers c ON o.customer_id = c.customer_id LEFT JOIN order_items oi ON o.order_id = oi.order_id WHERE o.status = 'completed' GROUP BY o.order_id, c.name, o.total",
        hints: [
          'Join three tables: orders, customers, order_items',
          'GROUP BY to count items per order'
        ],
        concepts: ['Multiple JOINs', 'GROUP BY', 'COUNT']
      },
      {
        id: 'be-q2',
        order: 2,
        title: 'Above Average Query',
        description: 'Find employees who earn **more than the average salary in their department**. Show name, department, salary, and department average.',
        timeLimit: 8 * 60,
        difficulty: 'Medium-Hard',
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
        title: 'Ranking Employees',
        description: 'Rank employees by salary **within each department**. Show name, department, salary, and rank (1 = highest).',
        timeLimit: 7 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'employees',
        solution: "SELECT name, department, salary, RANK() OVER (PARTITION BY department ORDER BY salary DESC) as salary_rank FROM employees ORDER BY department, salary_rank",
        hints: [
          'RANK() creates rankings',
          'PARTITION BY separates by department'
        ],
        concepts: ['Window Functions', 'RANK', 'PARTITION BY']
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
        title: 'Duplicate Detection',
        description: 'Find **duplicate email addresses** in customers table. Show the email, count of occurrences, and customer names.',
        timeLimit: 9 * 60,
        difficulty: 'Medium',
        points: 15,
        dataset: 'ecommerce',
        solution: "SELECT email, COUNT(*) as count, GROUP_CONCAT(name) as customer_names FROM customers GROUP BY email HAVING COUNT(*) > 1",
        hints: [
          'GROUP BY email to find duplicates',
          'HAVING COUNT(*) > 1 filters duplicates'
        ],
        concepts: ['GROUP BY', 'HAVING', 'GROUP_CONCAT', 'Duplicate Detection']
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
        title: 'Second Highest Salary',
        description: 'Find the **second highest salary** in the employees table. Return just the salary value. Handle the edge case where there might not be one.',
        timeLimit: 7 * 60,
        difficulty: 'Medium',
        points: 20,
        dataset: 'employees',
        solution: "SELECT MAX(salary) as second_highest FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)",
        hints: [
          'First find the maximum salary',
          'Then find max of salaries less than that'
        ],
        concepts: ['Subquery', 'MAX', 'Edge Cases']
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
        title: 'Top N Per Group',
        description: 'Find the **top 2 highest-paid employees in each department**. Show department, name, salary, and rank.',
        timeLimit: 10 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'employees',
        solution: "SELECT department, name, salary, rn as rank FROM (SELECT department, name, salary, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as rn FROM employees) WHERE rn <= 2",
        hints: [
          'ROW_NUMBER() ranks within each partition',
          'Filter for rank <= 2 in outer query'
        ],
        concepts: ['Window Functions', 'ROW_NUMBER', 'PARTITION BY', 'Subquery']
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
        title: 'Percentile Ranking',
        description: 'Assign each order a **percentile rank** (0-100) based on order total. Show order_id, total, and percentile.',
        timeLimit: 11 * 60,
        difficulty: 'Hard',
        points: 15,
        dataset: 'ecommerce',
        solution: "SELECT order_id, total, ROUND(PERCENT_RANK() OVER (ORDER BY total) * 100, 0) as percentile FROM orders ORDER BY percentile DESC",
        hints: [
          'PERCENT_RANK() gives 0-1 position',
          'Multiply by 100 for percentile'
        ],
        concepts: ['Window Functions', 'PERCENT_RANK', 'Percentiles']
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
        title: 'Daily Active Customers',
        description: 'Count the **unique customers** who placed orders for each day. Show date and customer count, sorted by date.',
        timeLimit: 5 * 60,
        difficulty: 'Easy',
        points: 15,
        dataset: 'ecommerce',
        solution: "SELECT order_date, COUNT(DISTINCT customer_id) as active_customers FROM orders GROUP BY order_date ORDER BY order_date",
        hints: [
          'COUNT(DISTINCT ...) counts unique values',
          'GROUP BY date'
        ],
        concepts: ['COUNT DISTINCT', 'GROUP BY', 'DAU']
      },
      {
        id: 'ba-q2',
        order: 2,
        title: 'Average Order Value',
        description: 'Calculate **Average Order Value (AOV)** by customer country. Show country and AOV (rounded to 2 decimals), sorted by AOV descending.',
        timeLimit: 6 * 60,
        difficulty: 'Easy-Medium',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT c.country, ROUND(AVG(o.total), 2) as aov FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.country ORDER BY aov DESC",
        hints: [
          'JOIN customers and orders',
          'AVG calculates average order value'
        ],
        concepts: ['JOIN', 'AVG', 'GROUP BY', 'Business Metrics']
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
        title: 'Revenue by Day of Week',
        description: 'Calculate **total revenue by day of week** (Sunday=0 to Saturday=6). Show day number, day name, and revenue.',
        timeLimit: 5 * 60,
        difficulty: 'Medium',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT CAST(strftime('%w', order_date) AS INTEGER) as day_num, CASE CAST(strftime('%w', order_date) AS INTEGER) WHEN 0 THEN 'Sunday' WHEN 1 THEN 'Monday' WHEN 2 THEN 'Tuesday' WHEN 3 THEN 'Wednesday' WHEN 4 THEN 'Thursday' WHEN 5 THEN 'Friday' ELSE 'Saturday' END as day_name, SUM(total) as revenue FROM orders GROUP BY day_num ORDER BY day_num",
        hints: [
          "strftime('%w', date) gives day of week",
          'CASE WHEN maps number to name'
        ],
        concepts: ['Date Functions', 'CASE WHEN', 'GROUP BY']
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
        title: 'Month-over-Month Growth',
        description: 'Calculate **month-over-month revenue growth rate** as a percentage. Show month, revenue, previous month revenue, and growth rate.',
        timeLimit: 10 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT month, revenue, prev_revenue, ROUND(100.0 * (revenue - prev_revenue) / prev_revenue, 2) as growth_rate FROM (SELECT strftime('%Y-%m', order_date) as month, SUM(total) as revenue, LAG(SUM(total)) OVER (ORDER BY strftime('%Y-%m', order_date)) as prev_revenue FROM orders GROUP BY month) WHERE prev_revenue IS NOT NULL ORDER BY month",
        hints: [
          'LAG() gets previous month revenue',
          'Growth = (current - prev) / prev × 100'
        ],
        concepts: ['Window Functions', 'LAG', 'Growth Calculation']
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
        title: 'Percentile Analysis',
        description: 'Find orders in the **top 10% by value**. Show order_id, total, and percentile rank.',
        timeLimit: 10 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT order_id, total, ROUND(pct_rank * 100, 0) as percentile FROM (SELECT order_id, total, PERCENT_RANK() OVER (ORDER BY total DESC) as pct_rank FROM orders) WHERE pct_rank <= 0.10 ORDER BY total DESC",
        hints: [
          'PERCENT_RANK() with DESC puts highest at top',
          'Filter for top 10% (rank <= 0.10)'
        ],
        concepts: ['Window Functions', 'PERCENT_RANK', 'Percentiles']
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
  }
];

// Categories for filtering
window.interviewCategories = [
  { id: 'all', label: 'All Interviews', icon: '📋' },
  { id: 'free', label: 'Free', icon: '🆓' },
  { id: 'data-analyst', label: 'Data Analyst', icon: '📊' },
  { id: 'backend', label: 'Backend Engineer', icon: '⚙️' },
  { id: 'faang', label: 'FAANG-Style', icon: '🏢' },
  { id: 'senior', label: 'Senior Level', icon: '👨‍💼' }
];

// Get category for an interview
window.getInterviewCategory = (interview) => {
  if (interview.isFree) return 'free';
  if (interview.id.includes('analyst') || interview.id.includes('business')) return 'data-analyst';
  if (interview.id.includes('backend')) return 'backend';
  if (interview.id.includes('faang')) return 'faang';
  if (interview.id.includes('senior')) return 'senior';
  return 'all';
};
