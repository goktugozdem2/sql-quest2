// SQL Quest - LeetCode-style Challenges
// Contains 73 challenges across difficulty levels with multi-skill tagging
// Last updated: Added context, fixed difficulties, new patterns

window.challengesData = [
  {
    id: 1,
    title: "Survivor Manifest",
    difficulty: "Easy",
    category: "SELECT",
    skills: ["SELECT", "WHERE"],
    xpReward: 20,
    description: "The rescue ship captain needs a passenger manifest. Find the **name, age, and ticket class (pclass)** of all passengers who survived the Titanic disaster.",
    tables: ["passengers"],
    example: {
      input: "passengers table with survived column (1 = survived, 0 = died)",
      output: "Name, age, pclass for all survivors"
    },
    hint: "Use WHERE to filter survived = 1, and SELECT only the columns needed (not SELECT *)",
    solution: "SELECT name, age, pclass FROM passengers WHERE survived = 1",
    dataset: "titanic"
  },
  {
    id: 2,
    title: "Top 5 Highest Rated Movies",
    difficulty: "Easy",
    category: "ORDER BY",
    skills: ["SELECT", "ORDER BY", "LIMIT"],
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
    title: "Women and Children First?",
    difficulty: "Easy",
    category: "WHERE",
    skills: ["SELECT", "WHERE", "ORDER BY"],
    xpReward: 20,
    description: "A historian is researching the 'Women and Children First' protocol. Find all **female passengers** with their **name, age, and survival status** to analyze if the protocol was followed.",
    tables: ["passengers"],
    example: {
      input: "passengers table with sex column ('male' or 'female')",
      output: "Female passengers with survival data, ordered by survival"
    },
    hint: "Filter WHERE sex = 'female', include survived column, ORDER BY survived DESC to see survivors first",
    solution: "SELECT name, age, survived FROM passengers WHERE sex = 'female' ORDER BY survived DESC, age",
    dataset: "titanic"
  },
  {
    id: 4,
    title: "Premium Order Analysis",
    difficulty: "Easy",
    category: "WHERE",
    skills: ["SELECT", "WHERE", "ORDER BY"],
    xpReward: 25,
    description: "The marketing team wants to target high-value customers. Find all orders where the **price exceeds $50**. Return product, price, and country, sorted by price descending to see the biggest orders first.",
    tables: ["orders"],
    example: {
      input: "orders table with price column",
      output: "Premium orders (>$50) sorted by price"
    },
    hint: "Use WHERE price > 50, add ORDER BY price DESC",
    solution: "SELECT product, price, country FROM orders WHERE price > 50 ORDER BY price DESC",
    dataset: "ecommerce"
  },
  {
    id: 5,
    title: "Genre Catalog",
    difficulty: "Easy",
    category: "DISTINCT",
    skills: ["SELECT", "DISTINCT", "ORDER BY"],
    xpReward: 25,
    description: "A streaming service is organizing their catalog. Find all **unique genres** in the movies database and count how many movies are in each. Return genre and movie_count, sorted alphabetically.",
    tables: ["movies"],
    example: {
      input: "movies table with genre column",
      output: "Unique genres with movie counts"
    },
    hint: "Use GROUP BY genre with COUNT(*), or use DISTINCT for just unique genres",
    solution: "SELECT genre, COUNT(*) as movie_count FROM movies GROUP BY genre ORDER BY genre",
    dataset: "movies"
  },
  {
    id: 6,
    title: "Survival Rate by Class",
    difficulty: "Medium",
    category: "GROUP BY",
    skills: ["SELECT", "WHERE", "GROUP BY", "Aggregation"],
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
    skills: ["SELECT", "GROUP BY", "Aggregation", "ORDER BY"],
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
    skills: ["SELECT", "GROUP BY", "HAVING", "Aggregation"],
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
    skills: ["SELECT", "GROUP BY", "Aggregation", "ORDER BY"],
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
    skills: ["SELECT", "GROUP BY", "HAVING", "Aggregation", "ORDER BY"],
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
    skills: ["SELECT", "GROUP BY", "Aggregation", "ORDER BY"],
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
  {
    id: 12,
    title: "Customer Orders",
    difficulty: "Medium",
    category: "JOIN",
    skills: ["SELECT", "JOIN"],
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
    skills: ["SELECT", "JOIN", "WHERE", "GROUP BY", "Aggregation", "ORDER BY"],
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
    skills: ["SELECT", "GROUP BY", "Aggregation"],
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
    skills: ["SELECT", "GROUP BY", "HAVING", "Aggregation", "ORDER BY"],
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
  {
    id: 16,
    title: "Second Highest Salary",
    difficulty: "Medium",
    category: "Subquery",
    skills: ["SELECT", "Subquery", "Aggregation"],
    xpReward: 60,
    description: "Write a SQL query to find the **second highest salary** from the employees table. If there is no second highest salary, return NULL. This is a classic interview question!",
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
    skills: ["SELECT", "JOIN", "WHERE"],
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
    difficulty: "Medium",
    category: "Subquery",
    skills: ["SELECT", "GROUP BY", "Aggregation", "ORDER BY", "LIMIT"],
    xpReward: 55,
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
    skills: ["SELECT", "LEFT JOIN", "WHERE", "NULL Handling"],
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
    skills: ["SELECT", "Subquery", "GROUP BY", "HAVING", "Aggregation"],
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
    skills: ["SELECT", "GROUP BY", "HAVING", "Aggregation", "CASE"],
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
    skills: ["SELECT", "GROUP BY", "HAVING", "Aggregation", "ORDER BY"],
    xpReward: 90,
    description: "Write a SQL query to find directors whose **total box office revenue exceeds $1 billion** AND have directed **at least 2 movies** in the database. Return director, movie count, total revenue, and average rating.",
    tables: ["movies"],
    example: {
      input: "movies table",
      output: "Elite directors with massive box office"
    },
    hint: "GROUP BY director, use HAVING with multiple conditions: SUM(revenue) > 1000 AND COUNT(*) >= 2",
    solution: "SELECT director, COUNT(*) as movies, SUM(revenue_millions) as total_revenue, ROUND(AVG(rating), 2) as avg_rating FROM movies GROUP BY director HAVING COUNT(*) >= 2 AND SUM(revenue_millions) > 1000 ORDER BY total_revenue DESC",
    dataset: "movies"
  },
  {
    id: 23,
    title: "Salary Rank Within Department",
    difficulty: "Hard",
    category: "Window Function",
    skills: ["SELECT", "Window Functions", "ORDER BY"],
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
    skills: ["SELECT", "Subquery", "Window Functions", "GROUP BY", "Aggregation", "ORDER BY"],
    xpReward: 100,
    description: "Write a SQL query to calculate the **running total of revenue by order date**. Return order_date, daily revenue, and cumulative revenue up to that date.",
    tables: ["orders"],
    example: {
      input: "orders table with dates and prices",
      output: "Daily revenue with running cumulative total"
    },
    hint: "Use a subquery to get daily totals first, then apply SUM() OVER (ORDER BY order_date) for the running total",
    solution: "SELECT order_date, daily_revenue, SUM(daily_revenue) OVER (ORDER BY order_date) as cumulative_revenue FROM (SELECT order_date, SUM(quantity * price) as daily_revenue FROM orders GROUP BY order_date) ORDER BY order_date",
    dataset: "ecommerce"
  },
  {
    id: 25,
    title: "Handle Missing Fares",
    difficulty: "Medium",
    category: "NULL Handling",
    skills: ["SELECT", "NULL Handling", "CASE"],
    xpReward: 55,
    description: "Write a SQL query to display passengers with their fares. For passengers with **NULL fares, show 0 instead**. Return name, original fare, and cleaned_fare. Use COALESCE or CASE.",
    tables: ["passengers"],
    example: {
      input: "fare=NULL",
      output: "cleaned_fare=0"
    },
    hint: "Use COALESCE(fare, 0) or CASE WHEN fare IS NULL THEN 0 ELSE fare END",
    solution: "SELECT name, fare, COALESCE(fare, 0) as cleaned_fare FROM passengers ORDER BY cleaned_fare DESC LIMIT 20",
    dataset: "titanic"
  },
  {
    id: 26,
    title: "Revenue by Decade",
    difficulty: "Hard",
    category: "Expression Grouping",
    skills: ["SELECT", "GROUP BY", "Aggregation", "ORDER BY"],
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
    title: "Combine High and Low Earners",
    difficulty: "Medium",
    category: "UNION",
    skills: ["SELECT", "UNION", "WHERE", "ORDER BY"],
    xpReward: 60,
    description: "Write a SQL query using **UNION** to combine two result sets: employees earning more than $80,000 (labeled 'High Earner') and employees earning less than $50,000 (labeled 'Low Earner'). Return name, salary, and earner_type.",
    tables: ["employees"],
    example: {
      input: "employees with various salaries",
      output: "Combined list of high and low earners with labels"
    },
    hint: "Use UNION to combine two SELECT statements, each with its own WHERE clause and a literal string for earner_type",
    solution: "SELECT name, salary, 'High Earner' as earner_type FROM employees WHERE salary > 80000 UNION SELECT name, salary, 'Low Earner' as earner_type FROM employees WHERE salary < 50000 ORDER BY salary DESC",
    dataset: "employees"
  },
  {
    id: 28,
    title: "Highest Fare Per Port",
    difficulty: "Hard",
    category: "Correlated Subquery",
    skills: ["SELECT", "Subquery", "WHERE", "Aggregation", "ORDER BY"],
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
    skills: ["SELECT", "Subquery", "Window Functions", "WHERE"],
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
    skills: ["SELECT", "Subquery", "Window Functions", "GROUP BY", "Aggregation", "ORDER BY"],
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
  },
  
  // ============ STRING FUNCTIONS CATEGORY ============
  {
    id: 31,
    title: "Passenger Name Standardization",
    difficulty: "Medium",
    category: "String Functions",
    skills: ["SELECT", "String Functions"],
    xpReward: 45,
    description: "The passenger manifest is messy! Write a SQL query to: 1) Extract the **last name** (before the comma), 2) Convert it to **UPPERCASE**, and 3) Create a **ticket code** (pclass + '-' + passenger_id). Return passenger_id, last_name_upper, and ticket_code.",
    tables: ["passengers"],
    example: {
      input: "'Braund, Mr. Owen Harris', pclass=3, id=1",
      output: "last_name_upper='BRAUND', ticket_code='3-1'"
    },
    hint: "Use SUBSTR to get text before comma (INSTR finds comma position), UPPER to capitalize, || to concatenate",
    solution: "SELECT passenger_id, UPPER(SUBSTR(name, 1, INSTR(name, ',') - 1)) as last_name_upper, pclass || '-' || passenger_id as ticket_code FROM passengers LIMIT 20",
    dataset: "titanic"
  },
  {
    id: 32,
    title: "Extract Title from Name",
    difficulty: "Medium",
    category: "String Functions",
    skills: ["SELECT", "String Functions"],
    xpReward: 50,
    description: "Write a SQL query to extract the **title** (Mr., Mrs., Miss., Master.) from passenger names. Return name and extracted title. Titles appear after the comma and before the period.",
    tables: ["passengers"],
    example: {
      input: "'Braund, Mr. Owen Harris'",
      output: "name: 'Braund, Mr. Owen Harris', title: 'Mr'"
    },
    hint: "Use SUBSTR() with INSTR() to find the position of ', ' and '. ' to extract between them",
    solution: "SELECT name, TRIM(SUBSTR(name, INSTR(name, ', ') + 2, INSTR(name, '.') - INSTR(name, ', ') - 2)) as title FROM passengers LIMIT 20",
    dataset: "titanic"
  },
  {
    id: 33,
    title: "Product Catalog Cleanup",
    difficulty: "Easy",
    category: "String Functions",
    skills: ["SELECT", "String Functions", "WHERE", "ORDER BY", "CASE"],
    xpReward: 35,
    description: "The e-commerce team wants to identify products that need description cleanup. Find all products and categorize them by name length: **'Short'** (≤10 chars), **'Medium'** (11-20), or **'Long'** (>20). Return product, length, and length_category.",
    tables: ["orders"],
    example: {
      input: "'iPhone' (6 chars), 'Samsung Galaxy S21' (18 chars)",
      output: "iPhone: Short, Samsung Galaxy S21: Medium"
    },
    hint: "Use LENGTH() with CASE WHEN to categorize",
    solution: "SELECT DISTINCT product, LENGTH(product) as length, CASE WHEN LENGTH(product) <= 10 THEN 'Short' WHEN LENGTH(product) <= 20 THEN 'Medium' ELSE 'Long' END as length_category FROM orders ORDER BY length DESC",
    dataset: "ecommerce"
  },
  {
    id: 34,
    title: "Combine First and Last Port",
    difficulty: "Easy",
    category: "String Functions",
    skills: ["SELECT", "String Functions", "WHERE"],
    xpReward: 35,
    description: "Write a SQL query to create a **combined string** showing 'Name boarded at [port]' for each passenger. Return passenger_id and the combined string as boarding_info.",
    tables: ["passengers"],
    example: {
      input: "name='John', embarked='S'",
      output: "'John boarded at S'"
    },
    hint: "Use || operator for string concatenation in SQLite",
    solution: "SELECT passenger_id, name || ' boarded at ' || embarked as boarding_info FROM passengers WHERE embarked IS NOT NULL LIMIT 20",
    dataset: "titanic"
  },
  {
    id: 35,
    title: "Find Passengers by Pattern",
    difficulty: "Medium",
    category: "String Functions",
    skills: ["SELECT", "String Functions", "WHERE"],
    xpReward: 45,
    description: "Write a SQL query to find all passengers whose **name starts with 'A' and contains 'Mrs'**. Return name and survived status.",
    tables: ["passengers"],
    example: {
      input: "passengers table",
      output: "Names starting with A that contain Mrs"
    },
    hint: "Use LIKE with wildcards: % for any characters, combine with AND",
    solution: "SELECT name, survived FROM passengers WHERE name LIKE 'A%' AND name LIKE '%Mrs%'",
    dataset: "titanic"
  },
  {
    id: 36,
    title: "Genres Without Blockbusters",
    difficulty: "Medium",
    category: "NOT IN / Subquery",
    skills: ["SELECT", "Subquery", "NOT IN", "DISTINCT"],
    xpReward: 55,
    description: "Write a SQL query to find **genres that have no movies with revenue over 500 million**. Return the distinct genre names. Use NOT IN with a subquery.",
    tables: ["movies"],
    example: {
      input: "genres like Action, Drama, Romance",
      output: "Genres without any blockbuster (>500M) movies"
    },
    hint: "First find genres WITH blockbusters using a subquery, then use NOT IN to exclude them",
    solution: "SELECT DISTINCT genre FROM movies WHERE genre NOT IN (SELECT DISTINCT genre FROM movies WHERE revenue_millions > 500) ORDER BY genre",
    dataset: "movies"
  },
  {
    id: 37,
    title: "Replace Category Names",
    difficulty: "Medium",
    category: "String Functions",
    skills: ["SELECT", "String Functions", "WHERE"],
    xpReward: 45,
    description: "Write a SQL query to **replace 'Electronics' with 'Tech'** in the category column. Return product, original category, and new_category.",
    tables: ["orders"],
    example: {
      input: "category='Electronics'",
      output: "new_category='Tech'"
    },
    hint: "Use the REPLACE() function",
    solution: "SELECT product, category, REPLACE(category, 'Electronics', 'Tech') as new_category FROM orders WHERE category = 'Electronics' OR category LIKE '%Electronics%'",
    dataset: "ecommerce"
  },
  {
    id: 38,
    title: "Parse Last Name",
    difficulty: "Hard",
    category: "String Functions",
    skills: ["SELECT", "String Functions"],
    xpReward: 75,
    description: "Write a SQL query to extract the **last name** from passenger names. Names are formatted as 'LastName, Title. FirstName'. Return passenger_id, full name, and last_name.",
    tables: ["passengers"],
    example: {
      input: "'Braund, Mr. Owen Harris'",
      output: "last_name: 'Braund'"
    },
    hint: "Last name is everything before the first comma. Use SUBSTR() and INSTR()",
    solution: "SELECT passenger_id, name, SUBSTR(name, 1, INSTR(name, ',') - 1) as last_name FROM passengers LIMIT 20",
    dataset: "titanic"
  },
  {
    id: 39,
    title: "Email Domain Extraction",
    difficulty: "Hard",
    category: "String Functions",
    skills: ["SELECT", "String Functions"],
    xpReward: 80,
    description: "Write a SQL query to extract the **domain** from customer email addresses. Return customer name, email, and the domain (part after @).",
    tables: ["customers"],
    example: {
      input: "email='john@gmail.com'",
      output: "domain='gmail.com'"
    },
    hint: "Use SUBSTR() starting from position of '@' + 1 to the end",
    solution: "SELECT name, email, SUBSTR(email, INSTR(email, '@') + 1) as domain FROM customers",
    dataset: "ecommerce"
  },
  {
    id: 40,
    title: "Rank Movies by Rating",
    difficulty: "Hard",
    category: "Window Functions",
    skills: ["SELECT", "Window Functions", "ORDER BY"],
    xpReward: 85,
    description: "Write a SQL query to **rank movies by rating within each genre** using RANK(). Return title, genre, rating, and rank_in_genre. Movies with same rating should have same rank.",
    tables: ["movies"],
    example: {
      input: "Action movies with ratings 8.5, 8.5, 8.0",
      output: "Ranks: 1, 1, 3 (ties get same rank)"
    },
    hint: "Use RANK() OVER (PARTITION BY genre ORDER BY rating DESC) to rank within each genre",
    solution: "SELECT title, genre, rating, RANK() OVER (PARTITION BY genre ORDER BY rating DESC) as rank_in_genre FROM movies WHERE rating IS NOT NULL ORDER BY genre, rank_in_genre LIMIT 30",
    dataset: "movies"
  },
  
  // ============ NEW LEETCODE-STYLE CHALLENGES ============
  
  // Self-Join Challenges
  {
    id: 41,
    title: "Find Duplicate Emails",
    difficulty: "Easy",
    category: "GROUP BY + HAVING",
    skills: ["SELECT", "GROUP BY", "HAVING", "Aggregation"],
    xpReward: 35,
    description: "The data team found quality issues! Write a SQL query to find all **duplicate email addresses** in the customers table. Return the email and how many times it appears. This is a classic interview question!",
    tables: ["customers"],
    example: {
      input: "Emails: john.smith@email.com (2x), sophia.lee@email.com (1x)",
      output: "john.smith@email.com | 2, emma.wilson@email.com | 2, daniel.martinez@email.com | 2"
    },
    hint: "GROUP BY email, then use HAVING COUNT(*) > 1 to find duplicates",
    solution: "SELECT email, COUNT(*) as count FROM customers GROUP BY email HAVING COUNT(*) > 1 ORDER BY count DESC",
    dataset: "ecommerce"
  },
  {
    id: 42,
    title: "Find Employees Without Managers",
    difficulty: "Easy",
    category: "NULL Handling",
    skills: ["SELECT", "WHERE", "NULL Handling"],
    xpReward: 30,
    description: "Write a SQL query to find all employees who **do not have a manager** (manager_id is NULL). These are typically top-level executives. Return name, position, and salary.",
    tables: ["employees"],
    example: {
      input: "CEO has manager_id = NULL",
      output: "CEO appears in result"
    },
    hint: "Use WHERE manager_id IS NULL",
    solution: "SELECT name, position, salary FROM employees WHERE manager_id IS NULL ORDER BY salary DESC",
    dataset: "employees"
  },
  {
    id: 43,
    title: "Count Direct Reports",
    difficulty: "Medium",
    category: "Self-Join + GROUP BY",
    skills: ["SELECT", "JOIN", "GROUP BY", "Aggregation"],
    xpReward: 60,
    description: "Write a SQL query to find **how many direct reports each manager has**. Return manager name and report_count. Only include employees who manage at least 1 person.",
    tables: ["employees"],
    example: {
      input: "Alice manages Bob, Carol, David",
      output: "Alice: 3 direct reports"
    },
    hint: "Join employees to itself, GROUP BY manager, COUNT the employees",
    solution: "SELECT m.name as manager, COUNT(e.emp_id) as report_count FROM employees e JOIN employees m ON e.manager_id = m.emp_id GROUP BY m.emp_id, m.name HAVING COUNT(e.emp_id) >= 1 ORDER BY report_count DESC",
    dataset: "employees"
  },
  
  // Date Function Challenges
  {
    id: 44,
    title: "Employee Tenure in Years",
    difficulty: "Medium",
    category: "Date Functions",
    skills: ["SELECT", "Date Functions", "ORDER BY"],
    xpReward: 50,
    description: "Write a SQL query to calculate **how many years each employee has worked** at the company. Return name, hire_date, and tenure_years (rounded down). Assume current date is 2024-06-01.",
    tables: ["employees"],
    example: {
      input: "hire_date = '2019-03-15'",
      output: "tenure_years = 5"
    },
    hint: "Use (julianday('2024-06-01') - julianday(hire_date)) / 365 to calculate years",
    solution: "SELECT name, hire_date, CAST((julianday('2024-06-01') - julianday(hire_date)) / 365 AS INTEGER) as tenure_years FROM employees ORDER BY tenure_years DESC",
    dataset: "employees"
  },
  {
    id: 45,
    title: "Employees Hired in 2020",
    difficulty: "Easy",
    category: "Date Functions",
    skills: ["SELECT", "Date Functions", "WHERE"],
    xpReward: 25,
    description: "Write a SQL query to find all employees **hired in the year 2020**. Return name, department, and hire_date. Order by hire_date.",
    tables: ["employees"],
    example: {
      input: "hire_date = '2020-06-01'",
      output: "Employee appears in result"
    },
    hint: "Use strftime('%Y', hire_date) = '2020' or hire_date BETWEEN '2020-01-01' AND '2020-12-31'",
    solution: "SELECT name, department, hire_date FROM employees WHERE strftime('%Y', hire_date) = '2020' ORDER BY hire_date",
    dataset: "employees"
  },
  {
    id: 46,
    title: "Hires Per Month",
    difficulty: "Medium",
    category: "Date Functions + GROUP BY",
    skills: ["SELECT", "Date Functions", "GROUP BY", "Aggregation"],
    xpReward: 55,
    description: "Write a SQL query to count **how many employees were hired each month** (regardless of year). Return month number and hire_count. Order by month.",
    tables: ["employees"],
    example: {
      input: "3 people hired in January across all years",
      output: "month: 01, hire_count: 3"
    },
    hint: "Use strftime('%m', hire_date) to extract month, then GROUP BY",
    solution: "SELECT strftime('%m', hire_date) as month, COUNT(*) as hire_count FROM employees GROUP BY strftime('%m', hire_date) ORDER BY month",
    dataset: "employees"
  },
  
  // Advanced Window Function Challenges
  {
    id: 47,
    title: "Second Highest Salary",
    difficulty: "Medium",
    category: "Window Functions",
    skills: ["SELECT", "Window Functions", "Subquery"],
    xpReward: 65,
    description: "Write a SQL query to find the **second highest salary** in the company. If there is no second highest salary, return NULL. This is a classic LeetCode problem!",
    tables: ["employees"],
    example: {
      input: "Salaries: 100k, 95k, 90k",
      output: "Second highest: 95k"
    },
    hint: "Use DENSE_RANK() to rank salaries, then select where rank = 2. Or use LIMIT 1 OFFSET 1",
    solution: "SELECT DISTINCT salary as second_highest_salary FROM (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) as rank FROM employees) ranked WHERE rank = 2",
    dataset: "employees"
  },
  {
    id: 48,
    title: "Top Earner Per Department",
    difficulty: "Hard",
    category: "Window Functions",
    skills: ["SELECT", "Window Functions", "Subquery"],
    xpReward: 80,
    description: "Write a SQL query to find the **highest paid employee in each department**. Return department, employee name, and salary. Use ROW_NUMBER() window function.",
    tables: ["employees"],
    example: {
      input: "Engineering: Alice $95k, Bob $75k",
      output: "Engineering: Alice, $95k"
    },
    hint: "Use ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC), then filter for row_num = 1",
    solution: "SELECT department, name, salary FROM (SELECT department, name, salary, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as rn FROM employees) ranked WHERE rn = 1 ORDER BY salary DESC",
    dataset: "employees"
  },
  {
    id: 49,
    title: "Salary Difference from Previous",
    difficulty: "Hard",
    category: "Window Functions",
    skills: ["SELECT", "Window Functions", "LAG"],
    xpReward: 85,
    description: "Write a SQL query using **LAG()** to show each employee's salary and the **difference from the previous employee's salary** (ordered by salary). Return name, salary, prev_salary, and salary_diff.",
    tables: ["employees"],
    example: {
      input: "Salaries ordered: 48k, 51k, 52k",
      output: "salary_diff: NULL, 3k, 1k"
    },
    hint: "Use LAG(salary) OVER (ORDER BY salary) to get previous salary, then subtract",
    solution: "SELECT name, salary, LAG(salary) OVER (ORDER BY salary) as prev_salary, salary - LAG(salary) OVER (ORDER BY salary) as salary_diff FROM employees ORDER BY salary LIMIT 20",
    dataset: "employees"
  },
  {
    id: 50,
    title: "Running Total of Revenue",
    difficulty: "Hard",
    category: "Window Functions",
    skills: ["SELECT", "Window Functions", "Aggregation"],
    xpReward: 90,
    description: "Write a SQL query to calculate a **running total of movie revenue** ordered by year. Return year, title, revenue, and running_total. Use SUM() as a window function.",
    tables: ["movies"],
    example: {
      input: "2010: $100M, 2010: $50M, 2011: $80M",
      output: "running_total: $100M, $150M, $230M"
    },
    hint: "Use SUM(revenue_millions) OVER (ORDER BY year, title ROWS UNBOUNDED PRECEDING)",
    solution: "SELECT year, title, revenue_millions, SUM(revenue_millions) OVER (ORDER BY year, title) as running_total FROM movies WHERE revenue_millions IS NOT NULL ORDER BY year, title LIMIT 25",
    dataset: "movies"
  },
  
  // Rate/Percentage Calculation Challenges
  {
    id: 51,
    title: "Department Performance Rate",
    difficulty: "Medium",
    category: "Rate Calculation",
    skills: ["SELECT", "GROUP BY", "Aggregation", "CASE"],
    xpReward: 60,
    description: "Write a SQL query to calculate the **percentage of high performers** (rating >= 4.0) in each department. Return department and high_performer_rate (as percentage, rounded to 1 decimal).",
    tables: ["employees"],
    example: {
      input: "Dept has 10 employees, 7 with rating >= 4.0",
      output: "high_performer_rate: 70.0%"
    },
    hint: "Use SUM(CASE WHEN rating >= 4.0 THEN 1 ELSE 0 END) / COUNT(*) * 100",
    solution: "SELECT department, ROUND(SUM(CASE WHEN performance_rating >= 4.0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as high_performer_rate FROM employees GROUP BY department ORDER BY high_performer_rate DESC",
    dataset: "employees"
  },
  {
    id: 52,
    title: "Order Completion Rate by Country",
    difficulty: "Medium",
    category: "Rate Calculation",
    skills: ["SELECT", "GROUP BY", "Aggregation", "CASE"],
    xpReward: 55,
    description: "Write a SQL query to calculate the **order completion rate** for each country. Return country, total_orders, completed_orders, and completion_rate (as percentage).",
    tables: ["orders"],
    example: {
      input: "USA: 10 orders, 8 completed",
      output: "completion_rate: 80%"
    },
    hint: "Use CASE WHEN status = 'completed' THEN 1 ELSE 0 END to count completed orders",
    solution: "SELECT country, COUNT(*) as total_orders, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders, ROUND(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as completion_rate FROM orders GROUP BY country ORDER BY completion_rate DESC",
    dataset: "ecommerce"
  },
  
  // EXISTS / Advanced Subquery Challenges
  {
    id: 53,
    title: "Departments With High Earners",
    difficulty: "Medium",
    category: "EXISTS Subquery",
    skills: ["SELECT", "EXISTS", "Subquery", "DISTINCT"],
    xpReward: 65,
    description: "Write a SQL query using **EXISTS** to find departments that have **at least one employee earning over $90,000**. Return distinct department names.",
    tables: ["employees"],
    example: {
      input: "Engineering has someone earning $95k",
      output: "Engineering appears in result"
    },
    hint: "Use WHERE EXISTS (SELECT 1 FROM employees e2 WHERE e2.department = e.department AND e2.salary > 90000)",
    solution: "SELECT DISTINCT e.department FROM employees e WHERE EXISTS (SELECT 1 FROM employees e2 WHERE e2.department = e.department AND e2.salary > 90000) ORDER BY department",
    dataset: "employees"
  },
  {
    id: 54,
    title: "Consecutive IDs",
    difficulty: "Hard",
    category: "Self-Join",
    skills: ["SELECT", "JOIN", "WHERE"],
    xpReward: 75,
    description: "Write a SQL query to find pairs of employees with **consecutive emp_id values** who are in the **same department**. Return both employee names and their department.",
    tables: ["employees"],
    example: {
      input: "emp_id 1 and 2 both in Engineering",
      output: "Pair: Alice, Bob, Engineering"
    },
    hint: "Self-join where e2.emp_id = e1.emp_id + 1 AND same department",
    solution: "SELECT e1.name as employee1, e2.name as employee2, e1.department FROM employees e1 JOIN employees e2 ON e2.emp_id = e1.emp_id + 1 AND e1.department = e2.department ORDER BY e1.emp_id",
    dataset: "employees"
  },
  {
    id: 55,
    title: "Movies Above Average Runtime",
    difficulty: "Easy",
    category: "Subquery",
    skills: ["SELECT", "Subquery", "WHERE"],
    xpReward: 35,
    description: "Write a SQL query to find all movies with a **runtime longer than the average runtime**. Return title, runtime, and the average runtime. Order by runtime descending.",
    tables: ["movies"],
    example: {
      input: "Average runtime is 120 min",
      output: "Movies with runtime > 120 min"
    },
    hint: "Use a subquery to calculate AVG(runtime), then compare in WHERE clause",
    solution: "SELECT title, runtime, (SELECT ROUND(AVG(runtime), 1) FROM movies) as avg_runtime FROM movies WHERE runtime > (SELECT AVG(runtime) FROM movies) ORDER BY runtime DESC",
    dataset: "movies"
  },
  
  // ============ NEW CHALLENGES - MISSING PATTERNS ============
  
  {
    id: 56,
    title: "Repeat Customers",
    difficulty: "Medium",
    category: "JOIN + GROUP BY",
    skills: ["SELECT", "JOIN", "GROUP BY", "HAVING", "Aggregation"],
    xpReward: 55,
    description: "Find your most loyal customers! Write a SQL query to find customers who have placed **3 or more orders**. Return customer name, email, and order_count. Order by number of orders descending.",
    tables: ["customers", "orders"],
    example: {
      input: "Customer A: 5 orders, Customer B: 2 orders",
      output: "Customer A appears (5 orders)"
    },
    hint: "JOIN customers to orders, GROUP BY customer, use HAVING COUNT(*) >= 3",
    solution: "SELECT c.name, c.email, COUNT(o.order_id) as order_count FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.name, c.email HAVING COUNT(o.order_id) >= 3 ORDER BY order_count DESC",
    dataset: "ecommerce"
  },
  {
    id: 57,
    title: "Handle NULL Ages",
    difficulty: "Medium",
    category: "NULL Handling",
    skills: ["SELECT", "NULL Handling", "COALESCE", "Aggregation"],
    xpReward: 50,
    description: "Many passengers have missing ages. Write a SQL query to show the **average age by class**, but replace NULL ages with the **overall average age** before calculating. Return pclass, avg_age_raw (with NULLs), and avg_age_filled (NULLs replaced).",
    tables: ["passengers"],
    example: {
      input: "Ages: 25, NULL, 35. Overall avg: 30",
      output: "avg_raw: 30, avg_filled: 30 (NULL → 30)"
    },
    hint: "Use COALESCE(age, (SELECT AVG(age) FROM passengers)) to replace NULLs",
    solution: "SELECT pclass, ROUND(AVG(age), 1) as avg_age_raw, ROUND(AVG(COALESCE(age, (SELECT AVG(age) FROM passengers))), 1) as avg_age_filled FROM passengers GROUP BY pclass ORDER BY pclass",
    dataset: "titanic"
  },
  {
    id: 58,
    title: "Customer Lifetime Value",
    difficulty: "Hard",
    category: "Multiple JOINs + Aggregation",
    skills: ["SELECT", "JOIN", "GROUP BY", "Aggregation", "ORDER BY"],
    xpReward: 85,
    description: "Calculate the **Customer Lifetime Value (CLV)** for each customer. Return customer name, membership, total_orders, total_spent, and avg_order_value. Include customers with NO orders (show 0). Order by total_spent descending.",
    tables: ["customers", "orders"],
    example: {
      input: "Customer with 3 orders totaling $150",
      output: "total_orders: 3, total_spent: $150, avg_order_value: $50"
    },
    hint: "Use LEFT JOIN to include customers with no orders, COALESCE for NULLs",
    solution: "SELECT c.name, c.membership, COUNT(o.order_id) as total_orders, COALESCE(SUM(o.quantity * o.price), 0) as total_spent, COALESCE(ROUND(AVG(o.quantity * o.price), 2), 0) as avg_order_value FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.name, c.membership ORDER BY total_spent DESC",
    dataset: "ecommerce"
  },
  {
    id: 59,
    title: "Fare Percentile Ranking",
    difficulty: "Hard",
    category: "Window Functions",
    skills: ["SELECT", "Window Functions", "NTILE"],
    xpReward: 90,
    description: "Divide passengers into **4 fare brackets** (quartiles) using NTILE. Return name, fare, fare_quartile (1=lowest, 4=highest), and pclass. Order by fare descending.",
    tables: ["passengers"],
    example: {
      input: "Top 25% of fares",
      output: "fare_quartile: 4"
    },
    hint: "Use NTILE(4) OVER (ORDER BY fare) to create quartiles",
    solution: "SELECT name, fare, NTILE(4) OVER (ORDER BY fare) as fare_quartile, pclass FROM passengers WHERE fare IS NOT NULL ORDER BY fare DESC LIMIT 30",
    dataset: "titanic"
  },
  {
    id: 60,
    title: "Movies vs Genre Average",
    difficulty: "Medium",
    category: "Window Functions",
    skills: ["SELECT", "Window Functions", "Aggregation"],
    xpReward: 65,
    description: "For each movie, show how it compares to its genre average. Return title, genre, rating, genre_avg_rating, and diff_from_avg (positive = above average). Use window functions.",
    tables: ["movies"],
    example: {
      input: "Movie rated 8.5, genre avg is 7.0",
      output: "diff_from_avg: +1.5"
    },
    hint: "Use AVG(rating) OVER (PARTITION BY genre) to get genre average",
    solution: "SELECT title, genre, rating, ROUND(AVG(rating) OVER (PARTITION BY genre), 2) as genre_avg_rating, ROUND(rating - AVG(rating) OVER (PARTITION BY genre), 2) as diff_from_avg FROM movies WHERE rating IS NOT NULL ORDER BY diff_from_avg DESC LIMIT 25",
    dataset: "movies"
  },
  {
    id: 61,
    title: "Top Spending Countries",
    difficulty: "Easy",
    category: "GROUP BY",
    skills: ["SELECT", "GROUP BY", "Aggregation"],
    xpReward: 25,
    description: "The finance team needs a regional breakdown. Find the **total revenue** from each **country** in the orders table. Sort by total revenue descending.",
    tables: ["orders"],
    example: {
      input: "Orders from USA, UK, France...",
      output: "USA: $5000, UK: $3200, ..."
    },
    hint: "GROUP BY country and use SUM(total) to get revenue per country",
    solution: "SELECT country, SUM(total) as total_revenue FROM orders GROUP BY country ORDER BY total_revenue DESC",
    dataset: "ecommerce"
  },
  {
    id: 62,
    title: "Young Survivors",
    difficulty: "Easy",
    category: "WHERE + ORDER BY",
    skills: ["SELECT", "WHERE", "Filter & Sort"],
    xpReward: 20,
    description: "Find all **children under 12** who **survived** the Titanic. Return their **name, age, and ticket class**. Sort by age.",
    tables: ["passengers"],
    example: {
      input: "Passengers with age < 12 and survived = 1",
      output: "List of child survivors sorted by age"
    },
    hint: "Use WHERE age < 12 AND survived = 1, then ORDER BY age",
    solution: "SELECT name, age, pclass FROM passengers WHERE age < 12 AND survived = 1 ORDER BY age",
    dataset: "titanic"
  },
  {
    id: 63,
    title: "Department Salary Budget",
    difficulty: "Medium",
    category: "GROUP BY + Aggregation",
    skills: ["GROUP BY", "Aggregation"],
    xpReward: 35,
    description: "HR needs budget numbers. Find the **total salary**, **average salary**, and **number of employees** in each **department**. Sort by total salary descending.",
    tables: ["employees"],
    example: {
      input: "Engineering: 5 employees, Sales: 3 employees",
      output: "Engineering | $450000 | $90000 | 5"
    },
    hint: "GROUP BY department with SUM, AVG (rounded), and COUNT",
    solution: "SELECT department, SUM(salary) as total_salary, ROUND(AVG(salary), 2) as avg_salary, COUNT(*) as num_employees FROM employees GROUP BY department ORDER BY total_salary DESC",
    dataset: "employees"
  },
  {
    id: 64,
    title: "Cancelled Orders",
    difficulty: "Easy",
    category: "WHERE + COUNT",
    skills: ["SELECT", "WHERE", "Aggregation"],
    xpReward: 20,
    description: "How many orders were **cancelled**? Return the **total count** of cancelled orders from the orders table.",
    tables: ["orders"],
    example: {
      input: "Orders with status: completed, cancelled, pending",
      output: "count of cancelled orders"
    },
    hint: "Use WHERE status = 'cancelled' with COUNT(*)",
    solution: "SELECT COUNT(*) as cancelled_count FROM orders WHERE status = 'cancelled'",
    dataset: "ecommerce"
  },
  {
    id: 65,
    title: "Highest Rated by Genre",
    difficulty: "Medium",
    category: "Subqueries",
    skills: ["Subqueries", "Aggregation", "WHERE"],
    xpReward: 50,
    description: "Find the **highest rated movie** in each **genre**. Return the title, genre, and rating. Only include genres with at least 2 movies.",
    tables: ["movies"],
    example: {
      input: "Action: Movie A (8.9), Movie B (7.2)",
      output: "Action | Movie A | 8.9"
    },
    hint: "Use a subquery to find MAX(rating) per genre, then match back to the movies table",
    solution: "SELECT m.title, m.genre, m.rating FROM movies m WHERE m.rating = (SELECT MAX(m2.rating) FROM movies m2 WHERE m2.genre = m.genre) AND m.genre IN (SELECT genre FROM movies GROUP BY genre HAVING COUNT(*) >= 2) ORDER BY m.rating DESC",
    dataset: "movies"
  },
  {
    id: 66,
    title: "Customer Order Summary",
    difficulty: "Medium",
    category: "JOIN + GROUP BY",
    skills: ["JOIN Tables", "GROUP BY", "Aggregation"],
    xpReward: 50,
    description: "Join the **customers** and **orders** tables. For each customer, show their **name**, **membership**, **number of orders**, and **total spent**. Only include customers with at least 1 order. Sort by total spent descending.",
    tables: ["customers", "orders"],
    example: {
      input: "John Smith placed 3 orders totaling $500",
      output: "John Smith | Gold | 3 | 500.00"
    },
    hint: "JOIN customers ON customer_id, then GROUP BY with COUNT and SUM",
    solution: "SELECT c.name, c.membership, COUNT(o.order_id) as num_orders, SUM(o.total) as total_spent FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.name, c.membership ORDER BY total_spent DESC",
    dataset: "ecommerce"
  },
  {
    id: 67,
    title: "Fare Class Analysis",
    difficulty: "Medium",
    category: "CASE + GROUP BY",
    skills: ["CASE Statements", "GROUP BY", "Aggregation"],
    xpReward: 40,
    description: "Categorize passengers by fare into **Budget** (fare < 15), **Standard** (15-50), and **Premium** (> 50). Count how many passengers are in each category.",
    tables: ["passengers"],
    example: {
      input: "Fare 7.25 = Budget, Fare 30 = Standard, Fare 80 = Premium",
      output: "Budget: 400, Standard: 200, Premium: 100"
    },
    hint: "Use CASE WHEN fare < 15 THEN 'Budget' ... END with GROUP BY",
    solution: "SELECT CASE WHEN fare < 15 THEN 'Budget' WHEN fare <= 50 THEN 'Standard' ELSE 'Premium' END as fare_class, COUNT(*) as passenger_count FROM passengers GROUP BY fare_class ORDER BY passenger_count DESC",
    dataset: "titanic"
  },
  {
    id: 68,
    title: "Recent Hires",
    difficulty: "Easy",
    category: "WHERE + ORDER BY",
    skills: ["SELECT", "WHERE", "Filter & Sort", "Date Functions"],
    xpReward: 25,
    description: "Find all employees hired in **2024 or later**. Return their **name**, **department**, **position**, and **hire_date**. Sort by hire date, newest first.",
    tables: ["employees"],
    example: {
      input: "Employees with hire_date >= 2024-01-01",
      output: "List of recent hires sorted newest first"
    },
    hint: "Use WHERE hire_date >= '2024-01-01' and ORDER BY hire_date DESC",
    solution: "SELECT name, department, position, hire_date FROM employees WHERE hire_date >= '2024-01-01' ORDER BY hire_date DESC",
    dataset: "employees"
  },
  {
    id: 69,
    title: "Product Category Revenue",
    difficulty: "Medium",
    category: "GROUP BY + HAVING",
    skills: ["GROUP BY", "HAVING", "Aggregation"],
    xpReward: 45,
    description: "Find product **categories** that generated more than **$500** in total revenue. Return the category, total revenue, and number of orders. Sort by revenue descending.",
    tables: ["orders"],
    example: {
      input: "Electronics: $2000 (15 orders), Books: $300 (8 orders)",
      output: "Only categories with > $500 revenue"
    },
    hint: "GROUP BY category, use HAVING SUM(total) > 500",
    solution: "SELECT category, SUM(total) as total_revenue, COUNT(*) as num_orders FROM orders GROUP BY category HAVING SUM(total) > 500 ORDER BY total_revenue DESC",
    dataset: "ecommerce"
  },
  {
    id: 70,
    title: "Director Filmography Stats",
    difficulty: "Medium",
    category: "GROUP BY + HAVING",
    skills: ["GROUP BY", "HAVING", "Aggregation"],
    xpReward: 45,
    description: "Find directors with **3 or more movies** in the database. Show the director name, number of movies, and their **average rating** (rounded to 1 decimal). Sort by average rating descending.",
    tables: ["movies"],
    example: {
      input: "Director A: 5 movies, avg 7.8",
      output: "Director A | 5 | 7.8"
    },
    hint: "GROUP BY director with HAVING COUNT(*) >= 3, use ROUND for avg rating",
    solution: "SELECT director, COUNT(*) as num_movies, ROUND(AVG(rating), 1) as avg_rating FROM movies GROUP BY director HAVING COUNT(*) >= 3 ORDER BY avg_rating DESC",
    dataset: "movies"
  },
  {
    id: 71,
    title: "VIP Customer Spending",
    difficulty: "Hard",
    category: "JOIN + Subquery",
    skills: ["JOIN", "Subquery", "Aggregation", "WHERE"],
    xpReward: 50,
    description: "Find all **Gold or Platinum** membership customers who have spent more than the **average total** across all orders. Return the customer **name**, **membership** level, and their **total spending**. Sort by total spending descending.",
    tables: ["customers", "orders"],
    example: {
      input: "Customer Alice (Gold) total $1200, avg order total across all orders = $95",
      output: "Alice | Gold | 1200.0"
    },
    hint: "JOIN customers and orders on customer_id, filter membership IN ('Gold','Platinum'), GROUP BY customer, use HAVING SUM(total) > (SELECT AVG(total) FROM orders)",
    solution: "SELECT c.name, c.membership, SUM(o.total) as total_spending FROM customers c JOIN orders o ON c.customer_id = o.customer_id WHERE c.membership IN ('Gold', 'Platinum') GROUP BY c.name, c.membership HAVING SUM(o.total) > (SELECT AVG(total) FROM orders) ORDER BY total_spending DESC",
    dataset: "ecommerce"
  },
  {
    id: 72,
    title: "Department Salary Ranks",
    difficulty: "Medium",
    category: "Aggregation + CASE",
    skills: ["GROUP BY", "Aggregation", "CASE Statements", "ROUND"],
    xpReward: 40,
    description: "For each **department**, show the **number of employees**, **average salary** (rounded to nearest whole number), and a **pay_grade** label: **'High'** if avg salary > 85000, **'Mid'** if between 60000 and 85000, or **'Low'** otherwise. Sort by average salary descending.",
    tables: ["employees"],
    example: {
      input: "Engineering: 10 employees, avg salary $92,000",
      output: "Engineering | 10 | 92000 | High"
    },
    hint: "GROUP BY department, use ROUND(AVG(salary), 0) and CASE WHEN for the pay_grade label",
    solution: "SELECT department, COUNT(*) as num_employees, ROUND(AVG(salary), 0) as avg_salary, CASE WHEN AVG(salary) > 85000 THEN 'High' WHEN AVG(salary) >= 60000 THEN 'Mid' ELSE 'Low' END as pay_grade FROM employees GROUP BY department ORDER BY avg_salary DESC",
    dataset: "employees"
  },
  {
    id: 73,
    title: "Genre Box Office Battle",
    difficulty: "Hard",
    category: "GROUP BY + HAVING + Aggregation",
    skills: ["GROUP BY", "HAVING", "Aggregation", "ROUND", "ORDER BY"],
    xpReward: 50,
    description: "Find movie **genres** where the total box office revenue exceeds **$500 million** and the average rating is above **6.5**. Return the genre, **total revenue** (in millions), **average rating** (rounded to 1 decimal), and **number of movies**. Sort by total revenue descending.",
    tables: ["movies"],
    example: {
      input: "Action: $1200M total, 7.1 avg rating, 15 movies",
      output: "Action | 1200.0 | 7.1 | 15"
    },
    hint: "GROUP BY genre, use HAVING with two conditions: SUM(revenue_millions) > 500 AND AVG(rating) > 6.5",
    solution: "SELECT genre, ROUND(SUM(revenue_millions), 1) as total_revenue, ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as num_movies FROM movies GROUP BY genre HAVING SUM(revenue_millions) > 500 AND AVG(rating) > 6.5 ORDER BY total_revenue DESC",
    dataset: "movies"
  }
];
