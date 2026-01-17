// SQL Quest - Daily Challenges
// One challenge per day, cycles through the list
// XP Reward: 50 XP for completing daily challenge

window.dailyChallengesData = [
  {
    id: 1,
    title: "Count All Passengers",
    description: "Write a query to count the **total number of passengers** on the Titanic.",
    dataset: "titanic",
    hint: "Use COUNT(*)",
    solution: "SELECT COUNT(*) as total_passengers FROM passengers"
  },
  {
    id: 2,
    title: "Find the Oldest Movie",
    description: "Write a query to find the **oldest movie** in the database. Return title and year.",
    dataset: "movies",
    hint: "Use ORDER BY year and LIMIT 1",
    solution: "SELECT title, year FROM movies ORDER BY year LIMIT 1"
  },
  {
    id: 3,
    title: "Highest Paid Employee",
    description: "Write a query to find the **highest paid employee**. Return name and salary.",
    dataset: "employees",
    hint: "Use ORDER BY salary DESC and LIMIT 1",
    solution: "SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 1"
  },
  {
    id: 4,
    title: "Electronics Orders",
    description: "Write a query to find all orders in the **Electronics** category. Return product and price.",
    dataset: "ecommerce",
    hint: "Use WHERE category = 'Electronics'",
    solution: "SELECT product, price FROM orders WHERE category = 'Electronics'"
  },
  {
    id: 5,
    title: "First Class Survivors",
    description: "Write a query to count how many **first class passengers survived**.",
    dataset: "titanic",
    hint: "Filter WHERE pclass = 1 AND survived = 1",
    solution: "SELECT COUNT(*) as survivors FROM passengers WHERE pclass = 1 AND survived = 1"
  },
  {
    id: 6,
    title: "Movies Above 8.5 Rating",
    description: "Write a query to find all movies with a **rating above 8.5**. Return title and rating, sorted by rating descending.",
    dataset: "movies",
    hint: "Use WHERE rating > 8.5 and ORDER BY",
    solution: "SELECT title, rating FROM movies WHERE rating > 8.5 ORDER BY rating DESC"
  },
  {
    id: 7,
    title: "Engineering Team Size",
    description: "Write a query to count how many employees work in **Engineering**.",
    dataset: "employees",
    hint: "Use COUNT with WHERE department = 'Engineering'",
    solution: "SELECT COUNT(*) as eng_count FROM employees WHERE department = 'Engineering'"
  },
  {
    id: 8,
    title: "Total Revenue",
    description: "Write a query to calculate the **total revenue** from all orders (quantity × price).",
    dataset: "ecommerce",
    hint: "Use SUM(quantity * price)",
    solution: "SELECT SUM(quantity * price) as total_revenue FROM orders"
  },
  {
    id: 9,
    title: "Average Passenger Age",
    description: "Write a query to find the **average age** of Titanic passengers (round to 1 decimal).",
    dataset: "titanic",
    hint: "Use ROUND(AVG(age), 1)",
    solution: "SELECT ROUND(AVG(age), 1) as avg_age FROM passengers"
  },
  {
    id: 10,
    title: "Unique Directors",
    description: "Write a query to find the **number of unique directors** in the movies database.",
    dataset: "movies",
    hint: "Use COUNT(DISTINCT director)",
    solution: "SELECT COUNT(DISTINCT director) as unique_directors FROM movies"
  },
  {
    id: 11,
    title: "Employees by Department",
    description: "Write a query to count employees **per department**. Show department and count.",
    dataset: "employees",
    hint: "Use GROUP BY department",
    solution: "SELECT department, COUNT(*) as count FROM employees GROUP BY department ORDER BY count DESC"
  },
  {
    id: 12,
    title: "Orders from USA",
    description: "Write a query to find all orders from the **USA**. Return product, price, and order_date.",
    dataset: "ecommerce",
    hint: "Use WHERE country = 'USA'",
    solution: "SELECT product, price, order_date FROM orders WHERE country = 'USA'"
  },
  {
    id: 13,
    title: "Young Survivors",
    description: "Write a query to find passengers **under 18 who survived**. Return name and age.",
    dataset: "titanic",
    hint: "Use WHERE age < 18 AND survived = 1",
    solution: "SELECT name, age FROM passengers WHERE age < 18 AND survived = 1 ORDER BY age"
  },
  {
    id: 14,
    title: "Action Movies Count",
    description: "Write a query to count how many **Action** movies are in the database.",
    dataset: "movies",
    hint: "Use COUNT with WHERE genre = 'Action'",
    solution: "SELECT COUNT(*) as action_count FROM movies WHERE genre = 'Action'"
  },
  {
    id: 15,
    title: "Top 3 Salaries",
    description: "Write a query to find the **top 3 highest salaries**. Return name, position, and salary.",
    dataset: "employees",
    hint: "Use ORDER BY salary DESC LIMIT 3",
    solution: "SELECT name, position, salary FROM employees ORDER BY salary DESC LIMIT 3"
  },
  {
    id: 16,
    title: "Furniture Revenue",
    description: "Write a query to calculate **total Furniture category revenue** (quantity × price).",
    dataset: "ecommerce",
    hint: "Use SUM with WHERE category = 'Furniture'",
    solution: "SELECT SUM(quantity * price) as furniture_revenue FROM orders WHERE category = 'Furniture'"
  },
  {
    id: 17,
    title: "Survival Rate",
    description: "Write a query to calculate the **overall survival rate** as a percentage (round to 1 decimal).",
    dataset: "titanic",
    hint: "Use ROUND(100.0 * SUM(survived) / COUNT(*), 1)",
    solution: "SELECT ROUND(100.0 * SUM(survived) / COUNT(*), 1) as survival_rate FROM passengers"
  },
  {
    id: 18,
    title: "Highest Grossing Movie",
    description: "Write a query to find the **highest grossing movie**. Return title and revenue_millions.",
    dataset: "movies",
    hint: "Use ORDER BY revenue_millions DESC LIMIT 1",
    solution: "SELECT title, revenue_millions FROM movies ORDER BY revenue_millions DESC LIMIT 1"
  },
  {
    id: 19,
    title: "Average Salary by Position",
    description: "Write a query to find **average salary per position** (round to 0 decimals). Show top 5.",
    dataset: "employees",
    hint: "Use GROUP BY position with AVG and LIMIT 5",
    solution: "SELECT position, ROUND(AVG(salary), 0) as avg_salary FROM employees GROUP BY position ORDER BY avg_salary DESC LIMIT 5"
  },
  {
    id: 20,
    title: "Gold Members",
    description: "Write a query to find all **Gold membership** customers. Return name and email.",
    dataset: "ecommerce",
    hint: "Query customers table WHERE membership = 'Gold'",
    solution: "SELECT name, email FROM customers WHERE membership = 'Gold'"
  },
  {
    id: 21,
    title: "Passengers by Class",
    description: "Write a query to count passengers **per class** (pclass). Show class and count.",
    dataset: "titanic",
    hint: "Use GROUP BY pclass",
    solution: "SELECT pclass, COUNT(*) as count FROM passengers GROUP BY pclass ORDER BY pclass"
  },
  {
    id: 22,
    title: "Movies by Genre",
    description: "Write a query to count movies **per genre**. Show genre and count, sorted by count descending.",
    dataset: "movies",
    hint: "Use GROUP BY genre",
    solution: "SELECT genre, COUNT(*) as count FROM movies GROUP BY genre ORDER BY count DESC"
  },
  {
    id: 23,
    title: "Recent Hires",
    description: "Write a query to find employees hired in **2022**. Return name, position, hire_date.",
    dataset: "employees",
    hint: "Use WHERE hire_date LIKE '2022%'",
    solution: "SELECT name, position, hire_date FROM employees WHERE hire_date LIKE '2022%' ORDER BY hire_date"
  },
  {
    id: 24,
    title: "Orders per Country",
    description: "Write a query to count orders **per country**. Show country and order count.",
    dataset: "ecommerce",
    hint: "Use GROUP BY country",
    solution: "SELECT country, COUNT(*) as order_count FROM orders GROUP BY country ORDER BY order_count DESC"
  },
  {
    id: 25,
    title: "Male vs Female Survival",
    description: "Write a query to show survival count **by gender**. Return sex and survivor count.",
    dataset: "titanic",
    hint: "Filter survived = 1, GROUP BY sex",
    solution: "SELECT sex, COUNT(*) as survivors FROM passengers WHERE survived = 1 GROUP BY sex"
  },
  {
    id: 26,
    title: "Christopher Nolan Movies",
    description: "Write a query to find all movies directed by **Christopher Nolan**. Return title and year.",
    dataset: "movies",
    hint: "Use WHERE director = 'Christopher Nolan'",
    solution: "SELECT title, year FROM movies WHERE director = 'Christopher Nolan' ORDER BY year"
  },
  {
    id: 27,
    title: "High Performers",
    description: "Write a query to find employees with **performance rating >= 4.5**. Return name and rating.",
    dataset: "employees",
    hint: "Use WHERE performance_rating >= 4.5",
    solution: "SELECT name, performance_rating FROM employees WHERE performance_rating >= 4.5 ORDER BY performance_rating DESC"
  },
  {
    id: 28,
    title: "Most Expensive Order",
    description: "Write a query to find the **most expensive single order**. Return product and price.",
    dataset: "ecommerce",
    hint: "Use ORDER BY price DESC LIMIT 1",
    solution: "SELECT product, price FROM orders ORDER BY price DESC LIMIT 1"
  },
  {
    id: 29,
    title: "Average Fare by Class",
    description: "Write a query to find **average fare per class** (round to 2 decimals).",
    dataset: "titanic",
    hint: "Use GROUP BY pclass with AVG(fare)",
    solution: "SELECT pclass, ROUND(AVG(fare), 2) as avg_fare FROM passengers GROUP BY pclass ORDER BY pclass"
  },
  {
    id: 30,
    title: "90s Movies",
    description: "Write a query to find movies from the **1990s** (1990-1999). Return title, year, rating.",
    dataset: "movies",
    hint: "Use WHERE year BETWEEN 1990 AND 1999",
    solution: "SELECT title, year, rating FROM movies WHERE year BETWEEN 1990 AND 1999 ORDER BY rating DESC"
  }
];
