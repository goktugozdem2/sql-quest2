// SQL Quest - Exercises & Lessons Data
// This file contains all lesson definitions and exercises

window.aiLessonsData = [
  {
    id: 1,
    title: "Introduction to SQL",
    topic: "What is SQL and why it matters",
    concepts: ["databases", "tables", "rows", "columns", "queries"],
    practiceTable: "passengers",
    exercises: [
      // Easy
      { question: "Show all columns from the passengers table (limit to 5 rows)", sql: "SELECT * FROM passengers LIMIT 5", difficulty: "easy" },
      // Medium
      { question: "Display just the name and age columns from passengers (limit 10)", sql: "SELECT name, age FROM passengers LIMIT 10", difficulty: "medium" },
      { question: "Show passenger names, their class, and fare paid (limit 8)", sql: "SELECT name, pclass, fare FROM passengers LIMIT 8", difficulty: "medium" },
      // Hard
      { question: "Display name, age, sex, and survival status for 10 passengers", sql: "SELECT name, age, sex, survived FROM passengers LIMIT 10", difficulty: "hard" },
      { question: "Show all passenger details including passenger_id, name, pclass, sex, age, and fare (limit 5)", sql: "SELECT passenger_id, name, pclass, sex, age, fare FROM passengers LIMIT 5", difficulty: "hard" }
    ]
  },
  {
    id: 2,
    title: "SELECT Statement",
    topic: "Retrieving data from tables",
    concepts: ["SELECT", "FROM", "* (all columns)", "specific columns", "LIMIT"],
    practiceTable: "passengers",
    exercises: [
      // Easy
      { question: "Select the name column from passengers (limit 5)", sql: "SELECT name FROM passengers LIMIT 5", difficulty: "easy" },
      // Medium
      { question: "Show passenger names and their ages (limit 10)", sql: "SELECT name, age FROM passengers LIMIT 10", difficulty: "medium" },
      { question: "Display name, sex, and pclass for 7 passengers", sql: "SELECT name, sex, pclass FROM passengers LIMIT 7", difficulty: "medium" },
      // Hard (uses Lesson 1: multiple columns, specific selection)
      { question: "Select passenger_id, name, survived, pclass, and fare columns (limit 6)", sql: "SELECT passenger_id, name, survived, pclass, fare FROM passengers LIMIT 6", difficulty: "hard" },
      { question: "Show name, age, sex, fare, and embarked location for 5 passengers", sql: "SELECT name, age, sex, fare, embarked FROM passengers LIMIT 5", difficulty: "hard" }
    ]
  },
  {
    id: 3,
    title: "Filtering with WHERE",
    topic: "Using conditions to filter data",
    concepts: ["WHERE", "comparison operators", "=", ">", "<", ">=", "<=", "<>"],
    practiceTable: "passengers",
    exercises: [
      // Easy
      { question: "Find all passengers who survived (survived = 1)", sql: "SELECT * FROM passengers WHERE survived = 1", difficulty: "easy" },
      // Medium
      { question: "Show all female passengers", sql: "SELECT * FROM passengers WHERE sex = 'female'", difficulty: "medium" },
      { question: "Find passengers who were in first class (pclass = 1)", sql: "SELECT * FROM passengers WHERE pclass = 1", difficulty: "medium" },
      // Hard (uses Lessons 1-2: WHERE + specific columns)
      { question: "Show name, age, and fare for passengers who paid more than 50 for their fare", sql: "SELECT name, age, fare FROM passengers WHERE fare > 50", difficulty: "hard" },
      { question: "Display name, pclass, and survived for passengers older than 60 years", sql: "SELECT name, pclass, survived FROM passengers WHERE age > 60", difficulty: "hard" }
    ]
  },
  {
    id: 4,
    title: "Combining Conditions",
    topic: "Using AND, OR to combine filters",
    concepts: ["AND", "OR", "NOT", "combining conditions"],
    practiceTable: "passengers",
    exercises: [
      // Easy
      { question: "Find female passengers who survived", sql: "SELECT * FROM passengers WHERE sex = 'female' AND survived = 1", difficulty: "easy" },
      // Medium
      { question: "Show passengers in first OR second class", sql: "SELECT * FROM passengers WHERE pclass = 1 OR pclass = 2", difficulty: "medium" },
      { question: "Find male passengers who did NOT survive", sql: "SELECT * FROM passengers WHERE sex = 'male' AND survived = 0", difficulty: "medium" },
      // Hard (uses Lessons 1-3: AND/OR + WHERE + specific columns)
      { question: "Show name, age, pclass for female survivors in first class", sql: "SELECT name, age, pclass FROM passengers WHERE sex = 'female' AND survived = 1 AND pclass = 1", difficulty: "hard" },
      { question: "Display name, fare, survived for passengers under 18 OR over 60 who survived", sql: "SELECT name, fare, survived FROM passengers WHERE (age < 18 OR age > 60) AND survived = 1", difficulty: "hard" }
    ]
  },
  {
    id: 5,
    title: "Sorting Results",
    topic: "Ordering data with ORDER BY",
    concepts: ["ORDER BY", "ASC", "DESC", "sorting by multiple columns"],
    practiceTable: "movies",
    exercises: [
      // Easy
      { question: "Show all movies sorted by rating (highest first)", sql: "SELECT * FROM movies ORDER BY rating DESC", difficulty: "easy" },
      // Medium
      { question: "List movies sorted by year (oldest first)", sql: "SELECT * FROM movies ORDER BY year ASC", difficulty: "medium" },
      { question: "Show movies sorted by revenue (highest first), limit to 10", sql: "SELECT * FROM movies ORDER BY revenue_millions DESC LIMIT 10", difficulty: "medium" },
      // Hard (uses Lessons 1-4: ORDER BY + WHERE + specific columns)
      { question: "Show title, rating, revenue for Action movies sorted by rating DESC", sql: "SELECT title, rating, revenue_millions FROM movies WHERE genre = 'Action' ORDER BY rating DESC", difficulty: "hard" },
      { question: "Display title, year, rating for movies after 2010 with rating > 8, sorted by year DESC then rating DESC", sql: "SELECT title, year, rating FROM movies WHERE year > 2010 AND rating > 8 ORDER BY year DESC, rating DESC", difficulty: "hard" }
    ]
  },
  {
    id: 6,
    title: "Aggregate Functions",
    topic: "Calculating statistics with COUNT, SUM, AVG, MIN, MAX",
    concepts: ["COUNT", "SUM", "AVG", "MIN", "MAX", "aggregate functions"],
    practiceTable: "movies",
    exercises: [
      // Easy
      { question: "Count the total number of movies", sql: "SELECT COUNT(*) FROM movies", difficulty: "easy" },
      // Medium
      { question: "Find the average movie rating", sql: "SELECT AVG(rating) FROM movies", difficulty: "medium" },
      { question: "Find the highest revenue among all movies", sql: "SELECT MAX(revenue_millions) FROM movies", difficulty: "medium" },
      // Hard (uses Lessons 1-5: Aggregates + WHERE + ORDER BY)
      { question: "Find the count, average rating, and total revenue for Action movies", sql: "SELECT COUNT(*), AVG(rating), SUM(revenue_millions) FROM movies WHERE genre = 'Action'", difficulty: "hard" },
      { question: "Show the minimum and maximum ratings for movies released after 2010", sql: "SELECT MIN(rating), MAX(rating) FROM movies WHERE year > 2010", difficulty: "hard" }
    ]
  },
  {
    id: 7,
    title: "GROUP BY",
    topic: "Grouping data for aggregate analysis",
    concepts: ["GROUP BY", "grouping", "aggregating groups"],
    practiceTable: "employees",
    exercises: [
      // Easy
      { question: "Count employees in each department, sorted by department name", sql: "SELECT department, COUNT(*) FROM employees GROUP BY department ORDER BY department", difficulty: "easy" },
      // Medium
      { question: "Find the average salary by department, sorted by avg salary DESC", sql: "SELECT department, AVG(salary) FROM employees GROUP BY department ORDER BY AVG(salary) DESC", difficulty: "medium" },
      { question: "Show total salary paid by each department, sorted by total DESC", sql: "SELECT department, SUM(salary) FROM employees GROUP BY department ORDER BY SUM(salary) DESC", difficulty: "medium" },
      // Hard (uses Lessons 1-6: GROUP BY + aggregates + ORDER BY)
      { question: "Show department, employee count, and avg salary sorted by avg salary DESC", sql: "SELECT department, COUNT(*), AVG(salary) FROM employees GROUP BY department ORDER BY AVG(salary) DESC", difficulty: "hard" },
      { question: "Display position, count, min salary, max salary for each position, sorted by count DESC", sql: "SELECT position, COUNT(*), MIN(salary), MAX(salary) FROM employees GROUP BY position ORDER BY COUNT(*) DESC", difficulty: "hard" }
    ]
  },
  {
    id: 8,
    title: "HAVING Clause",
    topic: "Filtering grouped data",
    concepts: ["HAVING", "filtering groups", "HAVING vs WHERE"],
    practiceTable: "employees",
    exercises: [
      // Easy
      { question: "Show departments with more than 5 employees, sorted by count DESC", sql: "SELECT department, COUNT(*) FROM employees GROUP BY department HAVING COUNT(*) > 5 ORDER BY COUNT(*) DESC", difficulty: "easy" },
      // Medium
      { question: "Find departments where average salary is above 70000, sorted by avg salary DESC", sql: "SELECT department, AVG(salary) FROM employees GROUP BY department HAVING AVG(salary) > 70000 ORDER BY AVG(salary) DESC", difficulty: "medium" },
      { question: "Show positions held by more than 3 employees, sorted by position name", sql: "SELECT position, COUNT(*) FROM employees GROUP BY position HAVING COUNT(*) >= 3 ORDER BY position", difficulty: "medium" },
      // Hard (uses Lessons 1-7: HAVING + GROUP BY + aggregates + ORDER BY + WHERE)
      { question: "Show departments with avg salary > 65000 and at least 3 employees, sorted by avg salary DESC", sql: "SELECT department, COUNT(*), AVG(salary) FROM employees GROUP BY department HAVING AVG(salary) > 65000 AND COUNT(*) >= 3 ORDER BY AVG(salary) DESC", difficulty: "hard" },
      { question: "Find positions with min rating > 3 and count > 2, showing position, count, avg salary, sorted by avg salary DESC", sql: "SELECT position, COUNT(*), AVG(salary) FROM employees GROUP BY position HAVING MIN(performance_rating) > 3 AND COUNT(*) > 2 ORDER BY AVG(salary) DESC", difficulty: "hard" }
    ]
  },
  {
    id: 9,
    title: "JOIN Basics",
    topic: "Combining data from multiple tables",
    concepts: ["INNER JOIN", "LEFT JOIN", "ON clause", "table aliases"],
    practiceTable: "orders",
    joinTables: {
      orders: ["order_id", "customer_id", "product", "category", "quantity", "price", "order_date", "country"],
      customers: ["customer_id", "name", "email", "join_date", "membership", "total_orders"]
    },
    exercises: [
      // Easy (INNER JOIN)
      { question: "Join orders with customers to show product and customer name, sorted by product", sql: "SELECT orders.product, customers.name FROM orders JOIN customers ON orders.customer_id = customers.customer_id ORDER BY orders.product", difficulty: "easy" },
      // Medium (INNER JOIN with more columns)
      { question: "Show product, price, and customer name for all orders, sorted by price DESC (limit 10)", sql: "SELECT orders.product, orders.price, customers.name FROM orders JOIN customers ON orders.customer_id = customers.customer_id ORDER BY orders.price DESC LIMIT 10", difficulty: "medium" },
      // Medium (filtering with JOIN)
      { question: "Show customer name and product for Gold members only, sorted by name", sql: "SELECT customers.name, orders.product FROM orders JOIN customers ON orders.customer_id = customers.customer_id WHERE customers.membership = 'Gold' ORDER BY customers.name", difficulty: "medium" },
      // Hard (JOIN with aggregation)
      { question: "Show customer name and their total spending (SUM of price), sorted by total DESC", sql: "SELECT customers.name, SUM(orders.price) FROM orders JOIN customers ON orders.customer_id = customers.customer_id GROUP BY customers.name ORDER BY SUM(orders.price) DESC", difficulty: "hard" },
      { question: "Show category, number of orders, and total revenue per category, sorted by revenue DESC", sql: "SELECT orders.category, COUNT(*), SUM(orders.price) FROM orders GROUP BY orders.category ORDER BY SUM(orders.price) DESC", difficulty: "hard" }
    ]
  },
  {
    id: 10,
    title: "Advanced Queries",
    topic: "Subqueries and complex analysis",
    concepts: ["subqueries", "nested SELECT", "correlated subqueries"],
    practiceTable: "movies",
    exercises: [
      // Easy
      { question: "Find movies with rating higher than average rating", sql: "SELECT * FROM movies WHERE rating > (SELECT AVG(rating) FROM movies)", difficulty: "easy" },
      // Medium
      { question: "Find the movie with the highest rating", sql: "SELECT * FROM movies WHERE rating = (SELECT MAX(rating) FROM movies)", difficulty: "medium" },
      { question: "Show movies with revenue above average revenue", sql: "SELECT * FROM movies WHERE revenue_millions > (SELECT AVG(revenue_millions) FROM movies)", difficulty: "medium" },
      // Hard (uses ALL previous lessons: Subqueries + SELECT columns + WHERE + AND + ORDER BY + aggregates)
      { question: "Show title, genre, rating, revenue for movies with above-average rating AND above-average votes, sorted by rating DESC (limit 10)", sql: "SELECT title, genre, rating, revenue_millions FROM movies WHERE rating > (SELECT AVG(rating) FROM movies) AND votes > (SELECT AVG(votes) FROM movies) ORDER BY rating DESC LIMIT 10", difficulty: "hard" },
      { question: "Find genre, count, and avg rating for genres that have movies with above-average revenue, having count > 3, sorted by avg rating DESC", sql: "SELECT genre, COUNT(*), AVG(rating) FROM movies WHERE revenue_millions > (SELECT AVG(revenue_millions) FROM movies) GROUP BY genre HAVING COUNT(*) > 3 ORDER BY AVG(rating) DESC", difficulty: "hard" }
    ]
  }
];

// Export for use in modules (if needed in future)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.aiLessonsData;
}
