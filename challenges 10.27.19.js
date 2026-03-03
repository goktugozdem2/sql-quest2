// SQL Quest - LeetCode-style Challenges
// Contains all 40 challenges across difficulty levels with multi-skill tagging

window.challengesData = [
  {
    id: 1,
    title: "Surviving Passengers",
    difficulty: "Easy",
    category: "SELECT",
    skills: ["SELECT", "WHERE"],
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
    title: "Female Passengers",
    difficulty: "Easy",
    category: "WHERE",
    skills: ["SELECT", "WHERE"],
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
    skills: ["SELECT", "WHERE"],
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
    skills: ["SELECT", "DISTINCT", "ORDER BY"],
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
    difficulty: "Hard",
    category: "Subquery",
    skills: ["SELECT", "Subquery", "Aggregation"],
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
    difficulty: "Hard",
    category: "Subquery",
    skills: ["SELECT", "GROUP BY", "Aggregation", "ORDER BY", "LIMIT"],
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
    title: "Fix Passenger Names",
    difficulty: "Easy",
    category: "String Functions",
    skills: ["SELECT", "String Functions"],
    xpReward: 30,
    description: "Write a SQL query to display passenger names in **UPPERCASE**. Return passenger_id and the uppercase name.",
    tables: ["passengers"],
    example: {
      input: "'Braund, Mr. Owen Harris'",
      output: "'BRAUND, MR. OWEN HARRIS'"
    },
    hint: "Use the UPPER() function",
    solution: "SELECT passenger_id, UPPER(name) as name_upper FROM passengers LIMIT 20",
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
    title: "Product Name Length",
    difficulty: "Easy",
    category: "String Functions",
    skills: ["SELECT", "String Functions", "WHERE", "ORDER BY"],
    xpReward: 30,
    description: "Write a SQL query to find all products where the **product name is longer than 10 characters**. Return product and its length.",
    tables: ["orders"],
    example: {
      input: "orders table",
      output: "Products with LENGTH(product) > 10"
    },
    hint: "Use the LENGTH() function in WHERE clause",
    solution: "SELECT DISTINCT product, LENGTH(product) as name_length FROM orders WHERE LENGTH(product) > 10 ORDER BY name_length DESC",
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
    title: "Employees Earning More Than Managers",
    difficulty: "Medium",
    category: "Self-Join",
    skills: ["SELECT", "JOIN", "WHERE"],
    xpReward: 65,
    description: "Write a SQL query to find employees who earn **more than their manager**. Return the employee name and their salary. This is a classic self-join problem!",
    tables: ["employees"],
    example: {
      input: "Employee earns $95k, Manager earns $80k",
      output: "Employee name appears in result"
    },
    hint: "Join employees table to itself: e for employee, m for manager. Match e.manager_id = m.emp_id, then compare salaries",
    solution: "SELECT e.name as employee, e.salary as employee_salary, m.name as manager, m.salary as manager_salary FROM employees e JOIN employees m ON e.manager_id = m.emp_id WHERE e.salary > m.salary",
    dataset: "employees"
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
  }
];
