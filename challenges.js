// SQL Quest - LeetCode-style Challenges
// Contains all 30 challenges across difficulty levels

window.challengesData = [
  {
    id: 1,
    title: "Surviving Passengers",
    difficulty: "Easy",
    category: "SELECT",
    xpReward: 20,
    description: "Write a SQL query to find all passengers who **survived** the Titanic disaster.",
    tables: ["passengers"],
    example: {
      input: "passengers table contains passenger data with a 'survived' column (1 = survived, 0 = died)",
      output: "All rows where survived = 1"
    },
    hint: "Use WHERE to filter rows where survived equals 1",
    solution: "SELECT * FROM passengers WHERE survived = 1",
    dataset: "titanic"
  },
  {
    id: 2,
    title: "Top 5 Highest Rated Movies",
    difficulty: "Easy",
    category: "ORDER BY",
    xpReward: 20,
    description: "Write a SQL query to find the **top 5 movies** with the highest rating. Return title and rating, sorted by rating descending.",
    tables: ["movies"],
    example: {
      input: "movies table with title and rating columns",
      output: "5 rows with highest ratings"
    },
    hint: "Use ORDER BY rating DESC and LIMIT 5",
    solution: "SELECT title, rating FROM movies ORDER BY rating DESC LIMIT 5",
    dataset: "movies"
  },
  {
    id: 3,
    title: "Female Passengers",
    difficulty: "Easy",
    category: "WHERE",
    xpReward: 20,
    description: "Write a SQL query to find all **female passengers**. Return their name and age.",
    tables: ["passengers"],
    example: {
      input: "passengers table with sex column ('male' or 'female')",
      output: "All female passengers with name and age"
    },
    hint: "Filter WHERE sex = 'female'",
    solution: "SELECT name, age FROM passengers WHERE sex = 'female'",
    dataset: "titanic"
  },
  {
    id: 4,
    title: "Expensive Products",
    difficulty: "Easy",
    category: "WHERE",
    xpReward: 25,
    description: "Write a SQL query to find all orders where the **price is greater than $50**. Return product, price, and country.",
    tables: ["orders"],
    example: {
      input: "orders table with price column",
      output: "Orders with price > 50"
    },
    hint: "Use WHERE price > 50",
    solution: "SELECT product, price, country FROM orders WHERE price > 50",
    dataset: "ecommerce"
  },
  {
    id: 5,
    title: "Unique Movie Genres",
    difficulty: "Easy",
    category: "DISTINCT",
    xpReward: 25,
    description: "Write a SQL query to find all **unique genres** in the movies table.",
    tables: ["movies"],
    example: {
      input: "movies table with genre column",
      output: "List of unique genre names"
    },
    hint: "Use SELECT DISTINCT",
    solution: "SELECT DISTINCT genre FROM movies ORDER BY genre",
    dataset: "movies"
  },
  // MEDIUM
  {
    id: 6,
    title: "Survival Rate by Class",
    difficulty: "Medium",
    category: "GROUP BY",
    xpReward: 40,
    description: "Write a SQL query to find the **number of survivors per passenger class** (pclass). Return pclass and the count of survivors.",
    tables: ["passengers"],
    example: {
      input: "passengers table with pclass and survived columns",
      output: "3 rows showing survival count per class"
    },
    hint: "Use GROUP BY pclass and filter WHERE survived = 1",
    solution: "SELECT pclass, COUNT(*) as survivors FROM passengers WHERE survived = 1 GROUP BY pclass",
    dataset: "titanic"
  },
  {
    id: 7,
    title: "Average Movie Rating by Genre",
    difficulty: "Medium",
    category: "GROUP BY",
    xpReward: 40,
    description: "Write a SQL query to find the **average rating for each genre**. Return genre and average rating (as avg_rating), sorted by average rating descending.",
    tables: ["movies"],
    example: {
      input: "movies table with genre and rating columns",
      output: "Genres with their average ratings, highest first"
    },
    hint: "Use GROUP BY genre with AVG(rating), then ORDER BY",
    solution: "SELECT genre, AVG(rating) as avg_rating FROM movies GROUP BY genre ORDER BY avg_rating DESC",
    dataset: "movies"
  },
  {
    id: 8,
    title: "High Earning Departments",
    difficulty: "Medium",
    category: "HAVING",
    xpReward: 50,
    description: "Write a SQL query to find departments where the **average salary exceeds $80,000**. Return department and average salary.",
    tables: ["employees"],
    example: {
      input: "employees table with department and salary",
      output: "Departments with avg salary > 80000"
    },
    hint: "Use GROUP BY with HAVING AVG(salary) > 80000",
    solution: "SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department HAVING AVG(salary) > 80000",
    dataset: "employees"
  },
  {
    id: 9,
    title: "Revenue by Country",
    difficulty: "Medium",
    category: "GROUP BY",
    xpReward: 45,
    description: "Write a SQL query to calculate **total revenue by country**. Revenue = quantity × price. Return country and total_revenue, sorted by revenue descending.",
    tables: ["orders"],
    example: {
      input: "orders table with country, quantity, price",
      output: "Countries with their total revenue"
    },
    hint: "Use SUM(quantity * price) and GROUP BY country",
    solution: "SELECT country, SUM(quantity * price) as total_revenue FROM orders GROUP BY country ORDER BY total_revenue DESC",
    dataset: "ecommerce"
  },
  {
    id: 10,
    title: "Prolific Directors",
    difficulty: "Medium",
    category: "HAVING",
    xpReward: 50,
    description: "Write a SQL query to find directors who have directed **3 or more movies**. Return director and number of films, sorted by film count descending.",
    tables: ["movies"],
    example: {
      input: "movies table with director column",
      output: "Directors with 3+ movies"
    },
    hint: "GROUP BY director, HAVING COUNT(*) >= 3",
    solution: "SELECT director, COUNT(*) as films FROM movies GROUP BY director HAVING COUNT(*) >= 3 ORDER BY films DESC",
    dataset: "movies"
  },
  {
    id: 11,
    title: "Average Salary by Department",
    difficulty: "Medium",
    category: "GROUP BY",
    xpReward: 45,
    description: "Write a SQL query to find the **average salary for each department**. Round to 2 decimal places and sort by average salary descending.",
    tables: ["employees"],
    example: {
      input: "employees table with department, salary",
      output: "Departments with their rounded average salaries"
    },
    hint: "Use AVG() with ROUND() and GROUP BY department, then ORDER BY",
    solution: "SELECT department, ROUND(AVG(salary), 2) FROM employees GROUP BY department ORDER BY ROUND(AVG(salary), 2) DESC",
    dataset: "employees"
  },
  // MEDIUM-HARD (Bridge challenges)
  {
    id: 12,
    title: "Customer Orders",
    difficulty: "Medium",
    category: "JOIN",
    xpReward: 55,
    description: "Write a SQL query to show each order with **customer details**. Return product, price, customer name, and membership level.",
    tables: ["orders", "customers"],
    example: {
      input: "orders and customers tables linked by customer_id",
      output: "Orders with customer name and membership"
    },
    hint: "JOIN orders with customers ON customer_id",
    solution: "SELECT o.product, o.price, c.name, c.membership FROM orders o JOIN customers c ON o.customer_id = c.customer_id",
    dataset: "ecommerce"
  },
  {
    id: 13,
    title: "Gold Member Spending",
    difficulty: "Medium",
    category: "JOIN + GROUP BY",
    xpReward: 60,
    description: "Write a SQL query to find the **total spending by Gold members**. Return customer name and their total spent (quantity × price).",
    tables: ["orders", "customers"],
    example: {
      input: "orders and customers tables",
      output: "Gold members with their total spending"
    },
    hint: "JOIN tables, filter membership = 'Gold', GROUP BY customer",
    solution: "SELECT c.name, SUM(o.quantity * o.price) as total_spent FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE c.membership = 'Gold' GROUP BY c.name",
    dataset: "ecommerce"
  },
  {
    id: 14,
    title: "Department Salary Range",
    difficulty: "Medium",
    category: "Aggregation",
    xpReward: 55,
    description: "Write a SQL query to find the **salary range for each department**. Return department, minimum salary, maximum salary, and the difference (as salary_range).",
    tables: ["employees"],
    example: {
      input: "employees table with department and salary",
      output: "Departments with min, max, and range"
    },
    hint: "Use MIN(), MAX() and subtraction in GROUP BY",
    solution: "SELECT department, MIN(salary) as min_salary, MAX(salary) as max_salary, MAX(salary) - MIN(salary) as salary_range FROM employees GROUP BY department",
    dataset: "employees"
  },
  {
    id: 15,
    title: "Blockbuster Genres",
    difficulty: "Medium",
    category: "HAVING",
    xpReward: 55,
    description: "Write a SQL query to find genres where **total box office revenue exceeds $1 billion**. Return genre, number of movies, and total revenue. Sort by revenue descending.",
    tables: ["movies"],
    example: {
      input: "movies table with genre and revenue_millions",
      output: "High-grossing genres (>$1B total)"
    },
    hint: "GROUP BY genre, HAVING SUM(revenue_millions) > 1000",
    solution: "SELECT genre, COUNT(*) as movie_count, SUM(revenue_millions) as total_revenue FROM movies GROUP BY genre HAVING SUM(revenue_millions) > 1000 ORDER BY total_revenue DESC",
    dataset: "movies"
  },
  // HARD
  {
    id: 16,
    title: "Second Highest Salary",
    difficulty: "Hard",
    category: "Subquery",
    xpReward: 80,
    description: "Write a SQL query to find the **second highest salary** from the employees table. If there is no second highest salary, return NULL.",
    tables: ["employees"],
    example: {
      input: "employees table with various salaries",
      output: "Single value: the second highest salary"
    },
    hint: "Use a subquery with MAX to exclude the highest salary, then find MAX of remaining",
    solution: "SELECT MAX(salary) as second_highest FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)",
    dataset: "employees"
  },
  {
    id: 17,
    title: "Employees Earning More Than Manager",
    difficulty: "Hard",
    category: "Self-Join",
    xpReward: 90,
    description: "Write a SQL query to find employees who earn **more than their manager**. Return employee name, employee salary, manager name, and manager salary.",
    tables: ["employees"],
    example: {
      input: "employees table with manager_id referencing emp_id",
      output: "Employees whose salary > their manager's salary"
    },
    hint: "Self-join employees table: JOIN employees m ON e.manager_id = m.emp_id, then compare salaries",
    solution: "SELECT e.name as employee, e.salary as emp_salary, m.name as manager, m.salary as mgr_salary FROM employees e JOIN employees m ON e.manager_id = m.emp_id WHERE e.salary > m.salary",
    dataset: "employees"
  },
  {
    id: 18,
    title: "Department with Highest Average Salary",
    difficulty: "Hard",
    category: "Subquery",
    xpReward: 85,
    description: "Write a SQL query to find the **department with the highest average salary**. Return only the department name and its average salary.",
    tables: ["employees"],
    example: {
      input: "employees table with department and salary",
      output: "Single row: department with highest avg salary"
    },
    hint: "Use GROUP BY to get averages, then use ORDER BY DESC LIMIT 1, or a subquery with MAX",
    solution: "SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department ORDER BY avg_salary DESC LIMIT 1",
    dataset: "employees"
  },
  {
    id: 19,
    title: "Customers Who Never Ordered",
    difficulty: "Hard",
    category: "LEFT JOIN / NOT IN",
    xpReward: 85,
    description: "Write a SQL query to find all **customers who have never placed an order**. Return customer name only.",
    tables: ["customers", "orders"],
    example: {
      input: "customers and orders tables",
      output: "Customer names with no matching orders"
    },
    hint: "Use LEFT JOIN and check for NULL, or use NOT IN with a subquery",
    solution: "SELECT c.name FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id WHERE o.order_id IS NULL",
    dataset: "ecommerce"
  },
  {
    id: 20,
    title: "Top Spender Per Country",
    difficulty: "Hard",
    category: "Subquery / Ranking",
    xpReward: 95,
    description: "Write a SQL query to find the **customer who spent the most in each country**. Return country, customer_id, and their total spending.",
    tables: ["orders", "customers"],
    example: {
      input: "orders with country and customer_id",
      output: "One row per country with top spender"
    },
    hint: "First calculate total per customer per country, then use a subquery to find the max per country",
    solution: "SELECT o.country, o.customer_id, SUM(o.quantity * o.price) as total_spent FROM orders o GROUP BY o.country, o.customer_id HAVING total_spent = (SELECT MAX(sub_total) FROM (SELECT country as c, customer_id, SUM(quantity * price) as sub_total FROM orders GROUP BY country, customer_id) sub WHERE sub.c = o.country)",
    dataset: "ecommerce"
  },
  {
    id: 21,
    title: "Survival Rate Analysis",
    difficulty: "Hard",
    category: "Complex Analysis",
    xpReward: 90,
    description: "Write a SQL query to find passenger classes where **survival rate exceeds 50%**. Return pclass, total passengers, survivors, and survival_rate (as percentage).",
    tables: ["passengers"],
    example: {
      input: "passengers table",
      output: "Classes with >50% survival rate"
    },
    hint: "Calculate COUNT(*) for total, SUM(survived) for survivors, then compute percentage and filter with HAVING",
    solution: "SELECT pclass, COUNT(*) as total, SUM(survived) as survivors, ROUND(100.0 * SUM(survived) / COUNT(*), 1) as survival_rate FROM passengers GROUP BY pclass HAVING survival_rate > 50",
    dataset: "titanic"
  },
  {
    id: 22,
    title: "Billion Dollar Directors",
    difficulty: "Hard", 
    category: "Multiple HAVING",
    xpReward: 90,
    description: "Write a SQL query to find directors whose **total box office revenue exceeds $2 billion** AND have directed **at least 2 movies** in the database. Return director, movie count, total revenue, and average rating.",
    tables: ["movies"],
    example: {
      input: "movies table",
      output: "Elite directors with massive box office"
    },
    hint: "GROUP BY director, use HAVING with multiple conditions: SUM(revenue) > 2000 AND COUNT(*) >= 2",
    solution: "SELECT director, COUNT(*) as movies, SUM(revenue_millions) as total_revenue, ROUND(AVG(rating), 2) as avg_rating FROM movies GROUP BY director HAVING COUNT(*) >= 2 AND SUM(revenue_millions) > 2000 ORDER BY total_revenue DESC",
    dataset: "movies"
  },
  {
    id: 23,
    title: "Salary Rank Within Department",
    difficulty: "Hard",
    category: "Window Function",
    xpReward: 100,
    description: "Write a SQL query to **rank employees by salary within each department**. Return name, department, salary, and rank (1 = highest paid in dept). Use dense ranking (no gaps).",
    tables: ["employees"],
    example: {
      input: "employees table",
      output: "All employees with their salary rank in their department"
    },
    hint: "Use window function: DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC)",
    solution: "SELECT name, department, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dept_rank FROM employees",
    dataset: "employees"
  },
  {
    id: 24,
    title: "Running Total Revenue",
    difficulty: "Hard",
    category: "Window Function",
    xpReward: 100,
    description: "Write a SQL query to calculate the **running total of revenue by order date**. Return order_date, daily revenue, and cumulative revenue up to that date.",
    tables: ["orders"],
    example: {
      input: "orders table with dates and prices",
      output: "Daily revenue with running cumulative total"
    },
    hint: "First aggregate by date, then use SUM() OVER (ORDER BY order_date) for running total",
    solution: "SELECT order_date, SUM(quantity * price) as daily_revenue, SUM(SUM(quantity * price)) OVER (ORDER BY order_date) as cumulative_revenue FROM orders GROUP BY order_date ORDER BY order_date",
    dataset: "ecommerce"
  },
  {
    id: 25,
    title: "Movies Better Than Genre Average",
    difficulty: "Hard",
    category: "Correlated Subquery",
    xpReward: 100,
    description: "Write a SQL query to find movies that have a **rating higher than the average rating of their genre**. Return title, genre, rating, and genre average.",
    tables: ["movies"],
    example: {
      input: "movies table",
      output: "Movies that outperform their genre's average"
    },
    hint: "Use a correlated subquery to calculate genre average for each movie's genre, then compare",
    solution: "SELECT m.title, m.genre, m.rating, (SELECT ROUND(AVG(rating), 2) FROM movies m2 WHERE m2.genre = m.genre) as genre_avg FROM movies m WHERE m.rating > (SELECT AVG(rating) FROM movies m2 WHERE m2.genre = m.genre) ORDER BY m.genre, m.rating DESC",
    dataset: "movies"
  },
  {
    id: 26,
    title: "Revenue by Decade",
    difficulty: "Hard",
    category: "Expression Grouping",
    xpReward: 95,
    description: "Write a SQL query to compare **movie revenue by decade**. Return decade (e.g., 1990, 2000, 2010), number of movies, total revenue, and average revenue per film.",
    tables: ["movies"],
    example: {
      input: "movies table with year and revenue",
      output: "Revenue stats grouped by decade"
    },
    hint: "Use (year / 10) * 10 to calculate decade, then GROUP BY decade",
    solution: "SELECT (year / 10) * 10 as decade, COUNT(*) as movie_count, ROUND(SUM(revenue_millions), 0) as total_revenue, ROUND(AVG(revenue_millions), 1) as avg_revenue FROM movies GROUP BY decade ORDER BY decade",
    dataset: "movies"
  },
  {
    id: 27,
    title: "Over Budget Departments",
    difficulty: "Hard",
    category: "JOIN + Aggregation",
    xpReward: 90,
    description: "Write a SQL query to compare **each department's actual salary expense vs budget**. Return department name, budget, total salaries, and remaining budget. Only show departments that are over budget (negative remaining).",
    tables: ["employees", "departments"],
    example: {
      input: "employees and departments tables",
      output: "Departments where total salaries exceed budget"
    },
    hint: "JOIN on department name, GROUP BY to sum salaries, calculate budget - total_salaries, filter negative",
    solution: "SELECT d.dept_name, d.budget, SUM(e.salary) as total_salaries, d.budget - SUM(e.salary) as remaining FROM departments d JOIN employees e ON d.dept_name = e.department GROUP BY d.dept_name, d.budget HAVING remaining < 0",
    dataset: "employees"
  },
  {
    id: 28,
    title: "Highest Fare Per Port",
    difficulty: "Hard",
    category: "Correlated Subquery",
    xpReward: 85,
    description: "Write a SQL query to find the **passenger who paid the highest fare at each embarkation port**. Return embarked, passenger name, and fare.",
    tables: ["passengers"],
    example: {
      input: "passengers table with embarked (S, C, Q) and fare",
      output: "Top paying passenger per port"
    },
    hint: "Use a correlated subquery to find max fare per port, then match passengers",
    solution: "SELECT p.embarked, p.name, p.fare FROM passengers p WHERE p.fare = (SELECT MAX(fare) FROM passengers p2 WHERE p2.embarked = p.embarked) AND p.embarked IS NOT NULL ORDER BY p.fare DESC",
    dataset: "titanic"
  },
  {
    id: 29,
    title: "Nth Highest Salary per Department",
    difficulty: "Hard",
    category: "Window Function",
    xpReward: 110,
    description: "Write a SQL query to find the **top 3 earners in each department**. Return department, name, salary, and their rank within the department.",
    tables: ["employees"],
    example: {
      input: "employees table",
      output: "Top 3 paid employees per department"
    },
    hint: "Use DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) and filter rank <= 3",
    solution: "SELECT department, name, salary, dept_rank FROM (SELECT department, name, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dept_rank FROM employees) ranked WHERE dept_rank <= 3",
    dataset: "employees"
  },
  {
    id: 30,
    title: "Year-over-Year Growth",
    difficulty: "Hard",
    category: "Window Function / LAG",
    xpReward: 110,
    description: "Write a SQL query to calculate **year-over-year movie count growth**. For each year, show the year, movie count, previous year's count, and the difference.",
    tables: ["movies"],
    example: {
      input: "movies table with year",
      output: "Each year with its movie count and change from previous year"
    },
    hint: "Use GROUP BY year, then LAG() OVER (ORDER BY year) to get previous year's count",
    solution: "SELECT year, movie_count, LAG(movie_count) OVER (ORDER BY year) as prev_year, movie_count - LAG(movie_count) OVER (ORDER BY year) as growth FROM (SELECT year, COUNT(*) as movie_count FROM movies GROUP BY year) yearly ORDER BY year",
    dataset: "movies"
  }
];
