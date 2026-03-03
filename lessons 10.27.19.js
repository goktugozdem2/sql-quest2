// SQL Quest - Static Lesson Content for AI Tutor
// Contains intro, teaching, practice questions, and comprehension checks

window.lessonContentData = {
    1: {
      intro: "Welcome to SQL Quest! SQL (Structured Query Language) is the language used to communicate with databases. It lets you retrieve, add, update, and delete data. Every tech company uses SQL - from Google to small startups. Ready to begin?",
      teaching: "Let's start with the basics! A DATABASE stores data in TABLES. Tables have ROWS (records) and COLUMNS (fields). Think of it like a spreadsheet.\n\nThe most basic SQL command is SELECT, which retrieves data:\n\nSELECT * FROM passengers LIMIT 5;\n\nThis says: 'Give me ALL columns (*) FROM the passengers table, but LIMIT to 5 rows.'\n\nReady to practice?",
      practice: [
        { question: "Let's try it! Write a query to show all columns from passengers, limited to 3 rows.", expected: "SELECT * FROM passengers LIMIT 3" },
        { question: "Great! Now show all columns but limit to 10 rows.", expected: "SELECT * FROM passengers LIMIT 10" },
        { question: "Show all passenger data, limited to just 1 row.", expected: "SELECT * FROM passengers LIMIT 1" }
      ],
      comprehension: [
        "What does the asterisk (*) symbol mean in a SELECT statement?",
        "What is the purpose of the LIMIT clause?",
        "In a database table, what's the difference between rows and columns?"
      ]
    },
    2: {
      intro: "Now let's learn how to SELECT specific columns instead of everything. This is more efficient and gives you exactly the data you need. Ready?",
      teaching: "Instead of SELECT * (all columns), you can name specific columns:\n\nSELECT name, age FROM passengers LIMIT 5;\n\nThis returns ONLY the name and age columns. You can select multiple columns by separating them with commas.\n\nReady to practice selecting specific columns?",
      practice: [
        { question: "Select only the 'name' column from passengers (limit 5).", expected: "SELECT name FROM passengers LIMIT 5" },
        { question: "Select 'name' and 'age' columns (limit 10).", expected: "SELECT name, age FROM passengers LIMIT 10" },
        { question: "Select 'name', 'sex', and 'pclass' columns (limit 5).", expected: "SELECT name, sex, pclass FROM passengers LIMIT 5" }
      ],
      comprehension: [
        "Why might you SELECT specific columns instead of using * for all columns?",
        "How do you separate multiple column names in a SELECT statement?",
        "What happens if you try to SELECT a column that doesn't exist?"
      ]
    },
    3: {
      intro: "Time to learn FILTERING with WHERE! This lets you find specific rows that match conditions. It's one of the most powerful SQL features. Ready?",
      teaching: "The WHERE clause filters rows based on conditions:\n\nSELECT * FROM passengers WHERE survived = 1;\n\nThis returns only passengers who survived. You can use:\n= (equals), > (greater), < (less), >= , <= , <> (not equal)\n\nFor text, use quotes: WHERE sex = 'female'\n\nReady to practice filtering?",
      practice: [
        { question: "Find all passengers who survived (survived = 1).", expected: "SELECT * FROM passengers WHERE survived = 1" },
        { question: "Find all female passengers.", expected: "SELECT * FROM passengers WHERE sex = 'female'" },
        { question: "Find passengers in first class (pclass = 1).", expected: "SELECT * FROM passengers WHERE pclass = 1" }
      ],
      comprehension: [
        "What is the purpose of the WHERE clause?",
        "When filtering text values, what must you put around the value?",
        "What operator would you use to find passengers NOT in third class?"
      ]
    },
    4: {
      intro: "Let's combine multiple conditions using AND and OR! This makes your filters even more powerful. Ready?",
      teaching: "AND requires BOTH conditions to be true:\nSELECT * FROM passengers WHERE sex = 'female' AND survived = 1;\n\nOR requires at least ONE condition to be true:\nSELECT * FROM passengers WHERE pclass = 1 OR pclass = 2;\n\nYou can combine multiple conditions for complex filters!\n\nReady to practice?",
      practice: [
        { question: "Find female passengers who survived.", expected: "SELECT * FROM passengers WHERE sex = 'female' AND survived = 1" },
        { question: "Find passengers in first OR second class.", expected: "SELECT * FROM passengers WHERE pclass = 1 OR pclass = 2" },
        { question: "Find male passengers who survived.", expected: "SELECT * FROM passengers WHERE sex = 'male' AND survived = 1" }
      ],
      comprehension: [
        "What's the difference between AND and OR in SQL?",
        "If you use AND, do both conditions need to be true or just one?",
        "How would you find passengers who are female AND in first class?"
      ]
    },
    5: {
      intro: "Let's learn to SORT results with ORDER BY! You can arrange data in ascending or descending order. Ready?",
      teaching: "ORDER BY sorts your results:\n\nSELECT * FROM movies ORDER BY rating DESC;\n\nDESC = descending (highest first)\nASC = ascending (lowest first, this is default)\n\nYou can sort by multiple columns too!\n\nReady to practice sorting?",
      practice: [
        { question: "Show all movies sorted by rating (highest first).", expected: "SELECT * FROM movies ORDER BY rating DESC" },
        { question: "Show movies sorted by year (oldest first).", expected: "SELECT * FROM movies ORDER BY year ASC" },
        { question: "Show top 5 highest revenue movies.", expected: "SELECT * FROM movies ORDER BY revenue_millions DESC LIMIT 5" }
      ],
      comprehension: [
        "What does DESC mean in ORDER BY?",
        "If you don't specify ASC or DESC, which is the default?",
        "Can you sort by multiple columns? How?"
      ]
    },
    6: {
      intro: "Time for AGGREGATE FUNCTIONS! These summarize data - COUNT, SUM, AVG, MIN, MAX. Ready?",
      teaching: "Aggregate functions calculate values across rows:\n\nCOUNT(*) - counts rows\nSUM(column) - adds values\nAVG(column) - average\nMIN/MAX(column) - smallest/largest\n\nExample: SELECT COUNT(*) FROM movies;\n\nThis counts all movies. Ready to practice?",
      practice: [
        { question: "Count the total number of movies.", expected: "SELECT COUNT(*) FROM movies" },
        { question: "Find the average movie rating.", expected: "SELECT AVG(rating) FROM movies" },
        { question: "Find the highest revenue among all movies.", expected: "SELECT MAX(revenue_millions) FROM movies" }
      ],
      comprehension: [
        "What does COUNT(*) return?",
        "What's the difference between SUM and AVG?",
        "When would you use MAX vs MIN?"
      ]
    },
    7: {
      intro: "Let's learn GROUP BY! This groups rows together for aggregate calculations. Ready?",
      teaching: "GROUP BY creates groups for aggregation:\n\nSELECT department, COUNT(*) FROM employees GROUP BY department;\n\nThis counts employees IN EACH department. The column in SELECT must either be in GROUP BY or be an aggregate function.\n\nReady to practice grouping?",
      practice: [
        { question: "Count employees in each department, sorted by department.", expected: "SELECT department, COUNT(*) FROM employees GROUP BY department ORDER BY department" },
        { question: "Find average salary by department, sorted by avg salary DESC.", expected: "SELECT department, AVG(salary) FROM employees GROUP BY department ORDER BY AVG(salary) DESC" },
        { question: "Count employees by position, sorted by count DESC.", expected: "SELECT position, COUNT(*) FROM employees GROUP BY position ORDER BY COUNT(*) DESC" }
      ],
      comprehension: [
        "What does GROUP BY do?",
        "Why do you need GROUP BY when using COUNT with another column?",
        "Can you GROUP BY multiple columns?"
      ]
    },
    8: {
      intro: "Now let's filter groups with HAVING! It's like WHERE but for grouped results. Ready?",
      teaching: "HAVING filters AFTER grouping (WHERE filters BEFORE):\n\nSELECT department, COUNT(*) FROM employees GROUP BY department HAVING COUNT(*) > 5;\n\nThis shows only departments with MORE than 5 employees.\n\nReady to practice?",
      practice: [
        { question: "Show departments with more than 5 employees, sorted by count DESC.", expected: "SELECT department, COUNT(*) FROM employees GROUP BY department HAVING COUNT(*) > 5 ORDER BY COUNT(*) DESC" },
        { question: "Find departments where average salary is above 70000, sorted by avg salary DESC.", expected: "SELECT department, AVG(salary) FROM employees GROUP BY department HAVING AVG(salary) > 70000 ORDER BY AVG(salary) DESC" },
        { question: "Show positions held by at least 3 people, sorted by position.", expected: "SELECT position, COUNT(*) FROM employees GROUP BY position HAVING COUNT(*) >= 3 ORDER BY position" }
      ],
      comprehension: [
        "What's the difference between WHERE and HAVING?",
        "When do you use HAVING instead of WHERE?",
        "Can you use HAVING without GROUP BY?"
      ]
    },
    9: {
      intro: "Time for JOINS! This combines data from multiple tables. It's essential for relational databases. Ready?",
      teaching: "JOIN connects tables using a common column:\n\nSELECT orders.product, customers.name\nFROM orders\nJOIN customers ON orders.customer_id = customers.customer_id;\n\nINNER JOIN: only matching rows\nLEFT JOIN: all from left table + matches\n\nReady to practice?",
      practice: [
        { question: "Join orders with customers to show product and customer name, sorted by product.", expected: "SELECT orders.product, customers.name FROM orders JOIN customers ON orders.customer_id = customers.customer_id ORDER BY orders.product" },
        { question: "Show product, price, and customer name for orders, sorted by price DESC (limit 10).", expected: "SELECT orders.product, orders.price, customers.name FROM orders JOIN customers ON orders.customer_id = customers.customer_id ORDER BY orders.price DESC LIMIT 10" },
        { question: "Show category and count of orders per category, sorted by count DESC.", expected: "SELECT category, COUNT(*) FROM orders GROUP BY category ORDER BY COUNT(*) DESC" }
      ],
      comprehension: [
        "What does JOIN do?",
        "What's the difference between INNER JOIN and LEFT JOIN?",
        "What is the ON clause used for in a JOIN?"
      ]
    },
    10: {
      intro: "Advanced topic: SUBQUERIES! These are queries inside queries for complex analysis. Ready?",
      teaching: "A subquery is a SELECT inside another query:\n\nSELECT * FROM movies WHERE rating > (SELECT AVG(rating) FROM movies);\n\nThe inner query runs FIRST, then the outer query uses its result.\n\nReady to practice subqueries?",
      practice: [
        { question: "Find movies with rating higher than average.", expected: "SELECT * FROM movies WHERE rating > (SELECT AVG(rating) FROM movies)" },
        { question: "Find the movie with the highest rating.", expected: "SELECT * FROM movies WHERE rating = (SELECT MAX(rating) FROM movies)" },
        { question: "Show movies with revenue above average.", expected: "SELECT * FROM movies WHERE revenue_millions > (SELECT AVG(revenue_millions) FROM movies)" }
      ],
      comprehension: [
        "What is a subquery?",
        "Which query runs first - the inner or outer query?",
        "Why might you use a subquery instead of a regular WHERE clause?"
      ]
    }
};
