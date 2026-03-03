// 30-Day SQL Mastery Challenge Curriculum
window.sqlCurriculum = {
  title: "Master SQL 30-Days Challenge",
  description: "Transform from SQL beginner to expert in 30 days with our structured curriculum",
  
  weeks: [
    {
      id: 1,
      title: "SQL for Data Analysis",
      subtitle: "Days 01-07",
      color: "from-blue-500 to-cyan-500",
      icon: "📊",
      days: [
        {
          day: 1,
          title: "Introduction to SQL",
          description: "Learn what SQL is, why it matters, and write your first query",
          concepts: ["SELECT", "FROM", "Basic Syntax"],
          lesson: {
            content: `# Welcome to SQL! 🎉

SQL (Structured Query Language) is the standard language for working with databases. Every tech company uses it!

## Your First Query

The most basic SQL statement retrieves data from a table:

\`\`\`sql
SELECT * FROM employees;
\`\`\`

This returns ALL columns (*) from the employees table.

## Selecting Specific Columns

\`\`\`sql
SELECT name, salary FROM employees;
\`\`\`

This returns only the name and salary columns.`,
            keyPoints: [
              "SQL is used to communicate with databases",
              "SELECT retrieves data from tables",
              "* means 'all columns'",
              "Always end statements with semicolon"
            ]
          },
          challenge: {
            title: "Your First SELECT",
            description: "Write a query to select all columns from the **passengers** table in the Titanic dataset.",
            dataset: "titanic",
            solution: "SELECT * FROM passengers;",
            hints: ["Use SELECT * to get all columns", "The table name is 'passengers'"],
            points: 10
          }
        },
        {
          day: 2,
          title: "Understanding Databases and Tables",
          description: "Learn how data is organized in databases, tables, rows, and columns",
          concepts: ["Tables", "Rows", "Columns", "Data Types"],
          lesson: {
            content: `# Database Structure 🗄️

## How Data is Organized

- **Database**: A collection of related tables
- **Table**: A collection of related data (like a spreadsheet)
- **Row**: A single record (one passenger, one sale, etc.)
- **Column**: A specific attribute (name, age, price, etc.)

## Common Data Types

| Type | Example | Use For |
|------|---------|---------|
| INTEGER | 42 | Whole numbers |
| REAL/FLOAT | 3.14 | Decimal numbers |
| TEXT | 'John' | Words and strings |
| DATE | '2024-01-15' | Dates |

## Viewing Table Structure

\`\`\`sql
PRAGMA table_info(passengers);
\`\`\``,
            keyPoints: [
              "Tables organize data into rows and columns",
              "Each column has a specific data type",
              "Rows represent individual records",
              "Good table design is crucial for efficiency"
            ]
          },
          challenge: {
            title: "Explore the Data",
            description: "Select only the **Name**, **Age**, and **Fare** columns from the passengers table.",
            dataset: "titanic",
            solution: "SELECT Name, Age, Fare FROM passengers;",
            hints: ["List column names separated by commas", "Column names are case-sensitive"],
            points: 10
          }
        },
        {
          day: 3,
          title: "SELECT Statement",
          description: "Master the SELECT statement with column selection and aliases",
          concepts: ["SELECT", "Column Aliases", "DISTINCT"],
          lesson: {
            content: `# Mastering SELECT 🎯

## Column Aliases

Give columns friendlier names in your output:

\`\`\`sql
SELECT Name AS passenger_name, 
       Fare AS ticket_price 
FROM passengers;
\`\`\`

## Removing Duplicates

Use DISTINCT to get unique values:

\`\`\`sql
SELECT DISTINCT Pclass FROM passengers;
\`\`\`

This shows each class only once (1, 2, 3).

## Combining Techniques

\`\`\`sql
SELECT DISTINCT Embarked AS boarding_port 
FROM passengers;
\`\`\``,
            keyPoints: [
              "AS creates column aliases for cleaner output",
              "DISTINCT removes duplicate rows",
              "Aliases don't change the actual data",
              "You can alias multiple columns in one query"
            ]
          },
          challenge: {
            title: "Distinct Values",
            description: "Find all unique **passenger classes** (Pclass) in the Titanic dataset. Use an alias to name the column 'class'.",
            dataset: "titanic",
            solution: "SELECT DISTINCT Pclass AS class FROM passengers;",
            hints: ["Use DISTINCT before the column name", "Use AS to create the alias"],
            points: 15
          }
        },
        {
          day: 4,
          title: "WHERE Clause and Logical Operators",
          description: "Filter data using conditions with WHERE, AND, OR, and comparison operators",
          concepts: ["WHERE", "AND", "OR", "Comparison Operators"],
          lesson: {
            content: `# Filtering with WHERE 🔍

## Basic Filtering

\`\`\`sql
SELECT * FROM passengers 
WHERE Age > 30;
\`\`\`

## Comparison Operators

| Operator | Meaning |
|----------|---------|
| = | Equal to |
| != or <> | Not equal to |
| > | Greater than |
| < | Less than |
| >= | Greater than or equal |
| <= | Less than or equal |

## Combining Conditions

**AND** - Both conditions must be true:
\`\`\`sql
SELECT * FROM passengers 
WHERE Age > 30 AND Survived = 1;
\`\`\`

**OR** - Either condition can be true:
\`\`\`sql
SELECT * FROM passengers 
WHERE Pclass = 1 OR Pclass = 2;
\`\`\``,
            keyPoints: [
              "WHERE filters rows based on conditions",
              "AND requires ALL conditions to be true",
              "OR requires ANY condition to be true",
              "Use parentheses to group complex conditions"
            ]
          },
          challenge: {
            title: "Filter Survivors",
            description: "Find all **female passengers** who **survived**. Select their Name, Age, and Fare.",
            dataset: "titanic",
            solution: "SELECT Name, Age, Fare FROM passengers WHERE Sex = 'female' AND Survived = 1;",
            hints: ["Sex column contains 'male' or 'female'", "Survived = 1 means they survived"],
            points: 15
          }
        },
        {
          day: 5,
          title: "Sorting Data with ORDER BY",
          description: "Learn to sort query results in ascending or descending order",
          concepts: ["ORDER BY", "ASC", "DESC", "Multiple Sorts"],
          lesson: {
            content: `# Sorting Results 📈

## Basic Sorting

\`\`\`sql
SELECT * FROM passengers 
ORDER BY Age;
\`\`\`

By default, ORDER BY sorts in **ascending** order (smallest to largest).

## Descending Order

\`\`\`sql
SELECT * FROM passengers 
ORDER BY Fare DESC;
\`\`\`

## Multiple Sort Columns

\`\`\`sql
SELECT * FROM passengers 
ORDER BY Pclass ASC, Fare DESC;
\`\`\`

This sorts by class first, then by fare within each class.

## Sorting with NULL Values

NULL values typically appear first when sorting ASC, last when DESC.`,
            keyPoints: [
              "ORDER BY sorts results (ASC is default)",
              "DESC sorts from largest to smallest",
              "You can sort by multiple columns",
              "Sorting happens after WHERE filtering"
            ]
          },
          challenge: {
            title: "Top Fares",
            description: "Find the **10 highest fares** paid. Show Name, Pclass, and Fare, sorted from highest to lowest fare.",
            dataset: "titanic",
            solution: "SELECT Name, Pclass, Fare FROM passengers ORDER BY Fare DESC LIMIT 10;",
            hints: ["Use ORDER BY with DESC", "Use LIMIT to restrict to 10 rows"],
            points: 15
          }
        },
        {
          day: 6,
          title: "LIMIT & OFFSET",
          description: "Control how many rows are returned and implement pagination",
          concepts: ["LIMIT", "OFFSET", "Pagination"],
          lesson: {
            content: `# Limiting Results 📄

## Basic LIMIT

\`\`\`sql
SELECT * FROM passengers LIMIT 5;
\`\`\`

Returns only the first 5 rows.

## OFFSET for Pagination

\`\`\`sql
SELECT * FROM passengers 
LIMIT 10 OFFSET 20;
\`\`\`

Skips the first 20 rows, then returns 10.

## Pagination Pattern

Page 1: \`LIMIT 10 OFFSET 0\`
Page 2: \`LIMIT 10 OFFSET 10\`
Page 3: \`LIMIT 10 OFFSET 20\`

Formula: OFFSET = (page_number - 1) × page_size

## Combining with ORDER BY

\`\`\`sql
SELECT * FROM passengers 
ORDER BY Age DESC 
LIMIT 5;
\`\`\`

Gets the 5 oldest passengers.`,
            keyPoints: [
              "LIMIT restricts the number of rows returned",
              "OFFSET skips a specified number of rows",
              "ORDER BY + LIMIT finds top/bottom N records",
              "Pagination uses LIMIT with calculated OFFSET"
            ]
          },
          challenge: {
            title: "Pagination Practice",
            description: "Get the **second page** of passengers (rows 11-20) when showing 10 per page, sorted by Name alphabetically.",
            dataset: "titanic",
            solution: "SELECT * FROM passengers ORDER BY Name ASC LIMIT 10 OFFSET 10;",
            hints: ["Page 2 means OFFSET 10", "LIMIT 10 for 10 items per page"],
            points: 15
          }
        },
        {
          day: 7,
          title: "Aggregate Functions",
          description: "Calculate totals, averages, counts, and other aggregates",
          concepts: ["COUNT", "SUM", "AVG", "MIN", "MAX"],
          lesson: {
            content: `# Aggregate Functions 🔢

## COUNT - Count Rows

\`\`\`sql
SELECT COUNT(*) FROM passengers;
-- Total passengers

SELECT COUNT(Age) FROM passengers;
-- Passengers with known age (excludes NULL)
\`\`\`

## SUM & AVG - Totals and Averages

\`\`\`sql
SELECT SUM(Fare) AS total_revenue FROM passengers;
SELECT AVG(Age) AS average_age FROM passengers;
\`\`\`

## MIN & MAX - Extremes

\`\`\`sql
SELECT MIN(Age) AS youngest, 
       MAX(Age) AS oldest 
FROM passengers;
\`\`\`

## Combining Aggregates

\`\`\`sql
SELECT 
  COUNT(*) AS total,
  AVG(Fare) AS avg_fare,
  SUM(Survived) AS survivors
FROM passengers;
\`\`\``,
            keyPoints: [
              "COUNT(*) counts all rows, COUNT(column) excludes NULLs",
              "SUM adds up numeric values",
              "AVG calculates the mean",
              "MIN/MAX find extreme values"
            ]
          },
          challenge: {
            title: "Survival Statistics",
            description: "Calculate the **total passengers**, **survivors count**, and **average fare** for the entire dataset.",
            dataset: "titanic",
            solution: "SELECT COUNT(*) AS total_passengers, SUM(Survived) AS survivors, AVG(Fare) AS average_fare FROM passengers;",
            hints: ["Use COUNT(*) for total", "SUM(Survived) counts survivors (1=survived)"],
            points: 20
          }
        }
      ]
    },
    {
      id: 2,
      title: "Intermediate SQL",
      subtitle: "Days 08-14",
      color: "from-purple-500 to-pink-500",
      icon: "🚀",
      days: [
        {
          day: 8,
          title: "GROUP BY Clause",
          description: "Group data and calculate aggregates per group",
          concepts: ["GROUP BY", "Aggregates with Groups"],
          lesson: {
            content: `# Grouping Data 📊

## Basic GROUP BY

\`\`\`sql
SELECT Pclass, COUNT(*) AS passengers
FROM passengers
GROUP BY Pclass;
\`\`\`

Returns count of passengers in each class.

## Multiple Aggregates per Group

\`\`\`sql
SELECT Pclass,
       COUNT(*) AS total,
       AVG(Age) AS avg_age,
       SUM(Survived) AS survivors
FROM passengers
GROUP BY Pclass;
\`\`\`

## Group by Multiple Columns

\`\`\`sql
SELECT Pclass, Sex, AVG(Fare) AS avg_fare
FROM passengers
GROUP BY Pclass, Sex;
\`\`\``,
            keyPoints: [
              "GROUP BY creates groups of rows with same values",
              "Aggregate functions calculate per group",
              "Non-aggregated columns must be in GROUP BY",
              "You can group by multiple columns"
            ]
          },
          challenge: {
            title: "Class Statistics",
            description: "Find the **survival rate** and **average fare** for each passenger **class**.",
            dataset: "titanic",
            solution: "SELECT Pclass, AVG(Survived) AS survival_rate, AVG(Fare) AS avg_fare FROM passengers GROUP BY Pclass;",
            hints: ["AVG(Survived) gives survival rate (0-1)", "GROUP BY Pclass"],
            points: 20
          }
        },
        {
          day: 9,
          title: "HAVING Clause",
          description: "Filter grouped data using HAVING",
          concepts: ["HAVING", "WHERE vs HAVING"],
          lesson: {
            content: `# Filtering Groups with HAVING 🎯

## WHERE vs HAVING

- **WHERE**: Filters individual rows BEFORE grouping
- **HAVING**: Filters groups AFTER aggregation

## Example

\`\`\`sql
SELECT Embarked, COUNT(*) AS passengers
FROM passengers
WHERE Age > 18
GROUP BY Embarked
HAVING COUNT(*) > 100;
\`\`\`

This query:
1. Filters to adults only (WHERE)
2. Groups by embarkation port
3. Only shows ports with 100+ adults (HAVING)

## Common Pattern

\`\`\`sql
SELECT category, AVG(value) AS avg_val
FROM data
GROUP BY category
HAVING AVG(value) > 50;
\`\`\``,
            keyPoints: [
              "HAVING filters after GROUP BY",
              "WHERE filters before GROUP BY",
              "HAVING can use aggregate functions",
              "WHERE cannot use aggregates"
            ]
          },
          challenge: {
            title: "Popular Ports",
            description: "Find embarkation ports (**Embarked**) with more than **200 passengers**. Show the port and count.",
            dataset: "titanic",
            solution: "SELECT Embarked, COUNT(*) AS passenger_count FROM passengers GROUP BY Embarked HAVING COUNT(*) > 200;",
            hints: ["GROUP BY Embarked", "Use HAVING with COUNT(*)"],
            points: 20
          }
        },
        {
          day: 10,
          title: "JOINs (INNER, LEFT, RIGHT)",
          description: "Combine data from multiple tables using different join types",
          concepts: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN"],
          lesson: {
            content: `# Joining Tables 🔗

## INNER JOIN

Returns only matching rows from both tables:

\`\`\`sql
SELECT e.name, d.department_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.id;
\`\`\`

## LEFT JOIN

Returns ALL rows from left table, matching from right:

\`\`\`sql
SELECT e.name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id;
\`\`\`

Employees without departments will show NULL.

## RIGHT JOIN

Returns ALL rows from right table, matching from left.

## Visual Guide

| Join Type | Left Only | Match | Right Only |
|-----------|-----------|-------|------------|
| INNER     | ❌ | ✅ | ❌ |
| LEFT      | ✅ | ✅ | ❌ |
| RIGHT     | ❌ | ✅ | ✅ |`,
            keyPoints: [
              "INNER JOIN returns only matching rows",
              "LEFT JOIN includes all left table rows",
              "RIGHT JOIN includes all right table rows",
              "Use table aliases (e, d) for cleaner queries"
            ]
          },
          challenge: {
            title: "Join Practice",
            description: "Using the **ecommerce** dataset, join **orders** with **customers** to show customer names with their order totals.",
            dataset: "ecommerce",
            solution: "SELECT c.name, o.total FROM orders o INNER JOIN customers c ON o.customer_id = c.id;",
            hints: ["Join on customer_id = id", "Use table aliases"],
            points: 25
          }
        },
        {
          day: 11,
          title: "Subqueries",
          description: "Use queries within queries for complex data retrieval",
          concepts: ["Subqueries", "IN", "EXISTS"],
          lesson: {
            content: `# Subqueries 🎭

## Subquery in WHERE

\`\`\`sql
SELECT * FROM passengers
WHERE Fare > (SELECT AVG(Fare) FROM passengers);
\`\`\`

Finds passengers who paid more than average.

## Subquery with IN

\`\`\`sql
SELECT * FROM passengers
WHERE Pclass IN (
  SELECT Pclass FROM passengers
  GROUP BY Pclass
  HAVING AVG(Survived) > 0.5
);
\`\`\`

## Subquery in SELECT

\`\`\`sql
SELECT Name, Fare,
  (SELECT AVG(Fare) FROM passengers) AS avg_fare
FROM passengers;
\`\`\`

## Correlated Subquery

\`\`\`sql
SELECT * FROM passengers p1
WHERE Fare > (
  SELECT AVG(Fare) FROM passengers p2
  WHERE p2.Pclass = p1.Pclass
);
\`\`\``,
            keyPoints: [
              "Subqueries are queries inside queries",
              "Use parentheses around subqueries",
              "IN checks if value is in subquery results",
              "Correlated subqueries reference outer query"
            ]
          },
          challenge: {
            title: "Above Average",
            description: "Find passengers who paid a fare **higher than the average fare for their class**.",
            dataset: "titanic",
            solution: "SELECT * FROM passengers p1 WHERE Fare > (SELECT AVG(Fare) FROM passengers p2 WHERE p2.Pclass = p1.Pclass);",
            hints: ["Use a correlated subquery", "Match Pclass in subquery"],
            points: 25
          }
        },
        {
          day: 12,
          title: "Working with CASE Statements",
          description: "Add conditional logic to your queries",
          concepts: ["CASE", "WHEN", "THEN", "ELSE"],
          lesson: {
            content: `# Conditional Logic with CASE 🔀

## Basic CASE

\`\`\`sql
SELECT Name,
  CASE 
    WHEN Age < 18 THEN 'Child'
    WHEN Age < 65 THEN 'Adult'
    ELSE 'Senior'
  END AS age_group
FROM passengers;
\`\`\`

## CASE in Aggregates

\`\`\`sql
SELECT 
  SUM(CASE WHEN Survived = 1 THEN 1 ELSE 0 END) AS survived,
  SUM(CASE WHEN Survived = 0 THEN 1 ELSE 0 END) AS died
FROM passengers;
\`\`\`

## Simple CASE Form

\`\`\`sql
SELECT Name,
  CASE Pclass
    WHEN 1 THEN 'First Class'
    WHEN 2 THEN 'Second Class'
    WHEN 3 THEN 'Third Class'
  END AS class_name
FROM passengers;
\`\`\``,
            keyPoints: [
              "CASE provides if-then-else logic",
              "Each WHEN is checked in order",
              "ELSE handles unmatched cases",
              "CASE can be used anywhere an expression is valid"
            ]
          },
          challenge: {
            title: "Fare Categories",
            description: "Create a query that categorizes fares as 'Budget' (< 20), 'Standard' (20-100), or 'Premium' (> 100). Show Name and the category.",
            dataset: "titanic",
            solution: "SELECT Name, CASE WHEN Fare < 20 THEN 'Budget' WHEN Fare <= 100 THEN 'Standard' ELSE 'Premium' END AS fare_category FROM passengers;",
            hints: ["Use CASE WHEN for each range", "Check conditions in order"],
            points: 20
          }
        },
        {
          day: 13,
          title: "Self-Joins",
          description: "Join a table to itself for hierarchical or comparative queries",
          concepts: ["Self-Join", "Table Aliases"],
          lesson: {
            content: `# Self-Joins 🔄

A self-join joins a table to itself, useful for:
- Hierarchical data (employees → managers)
- Comparing rows within the same table

## Example: Find Employees and Their Managers

\`\`\`sql
SELECT 
  e.name AS employee,
  m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
\`\`\`

## Comparing Rows

Find passengers who paid the same fare:

\`\`\`sql
SELECT p1.Name, p2.Name, p1.Fare
FROM passengers p1
INNER JOIN passengers p2 
  ON p1.Fare = p2.Fare 
  AND p1.PassengerId < p2.PassengerId;
\`\`\`

The \`<\` prevents duplicate pairs.`,
            keyPoints: [
              "Self-joins require different aliases for the same table",
              "Useful for hierarchical relationships",
              "Use inequality to avoid duplicate pairs",
              "LEFT JOIN keeps rows without matches"
            ]
          },
          challenge: {
            title: "Same Cabin",
            description: "Find pairs of passengers who shared the same **Cabin** (non-empty). Show both names and the cabin.",
            dataset: "titanic",
            solution: "SELECT p1.Name AS passenger1, p2.Name AS passenger2, p1.Cabin FROM passengers p1 INNER JOIN passengers p2 ON p1.Cabin = p2.Cabin AND p1.PassengerId < p2.PassengerId WHERE p1.Cabin != '';",
            hints: ["Join passengers to itself", "Use < to avoid duplicates", "Filter out empty cabins"],
            points: 25
          }
        },
        {
          day: 14,
          title: "UNION & UNION ALL",
          description: "Combine results from multiple queries",
          concepts: ["UNION", "UNION ALL", "Set Operations"],
          lesson: {
            content: `# Combining Results 🔗

## UNION

Combines results and removes duplicates:

\`\`\`sql
SELECT Name FROM passengers WHERE Pclass = 1
UNION
SELECT Name FROM passengers WHERE Survived = 1;
\`\`\`

## UNION ALL

Combines results and keeps ALL rows (faster):

\`\`\`sql
SELECT 'Class 1' AS source, COUNT(*) AS count 
FROM passengers WHERE Pclass = 1
UNION ALL
SELECT 'Survivors', COUNT(*) 
FROM passengers WHERE Survived = 1;
\`\`\`

## Rules

- Same number of columns
- Compatible data types
- Column names from first query

## Use Cases

- Combining data from multiple sources
- Creating summary reports
- Merging historical and current data`,
            keyPoints: [
              "UNION removes duplicates, UNION ALL keeps all",
              "All queries must have same number of columns",
              "Column names come from first SELECT",
              "UNION ALL is faster (no deduplication)"
            ]
          },
          challenge: {
            title: "Combined Report",
            description: "Create a report showing counts with labels: 'First Class' count, 'Second Class' count, and 'Third Class' count using UNION ALL.",
            dataset: "titanic",
            solution: "SELECT 'First Class' AS class, COUNT(*) AS count FROM passengers WHERE Pclass = 1 UNION ALL SELECT 'Second Class', COUNT(*) FROM passengers WHERE Pclass = 2 UNION ALL SELECT 'Third Class', COUNT(*) FROM passengers WHERE Pclass = 3;",
            hints: ["Three SELECT statements with UNION ALL", "Add a label column to each"],
            points: 20
          }
        }
      ]
    },
    {
      id: 3,
      title: "Advanced SQL",
      subtitle: "Days 15-21",
      color: "from-orange-500 to-red-500",
      icon: "🔥",
      days: [
        {
          day: 15,
          title: "Understanding Indexes",
          description: "Learn how indexes speed up queries and when to use them",
          concepts: ["Indexes", "CREATE INDEX", "Query Optimization"],
          lesson: {
            content: `# Database Indexes 🏃

## What is an Index?

An index is like a book's index - it helps find data faster without scanning every row.

## Creating an Index

\`\`\`sql
CREATE INDEX idx_passengers_class 
ON passengers(Pclass);
\`\`\`

## Composite Index

\`\`\`sql
CREATE INDEX idx_passengers_class_survived 
ON passengers(Pclass, Survived);
\`\`\`

## When to Use Indexes

✅ Columns used in WHERE clauses
✅ Columns used in JOIN conditions
✅ Columns used in ORDER BY

❌ Small tables
❌ Columns with few unique values
❌ Tables with frequent inserts/updates

## Viewing Indexes

\`\`\`sql
PRAGMA index_list(passengers);
\`\`\``,
            keyPoints: [
              "Indexes speed up SELECT queries",
              "They slow down INSERT/UPDATE/DELETE",
              "Choose indexed columns wisely",
              "Composite indexes help multi-column queries"
            ]
          },
          challenge: {
            title: "Index Strategy",
            description: "Create an index on the **Embarked** column, then write a query that would benefit from it.",
            dataset: "titanic",
            solution: "CREATE INDEX idx_embarked ON passengers(Embarked); SELECT * FROM passengers WHERE Embarked = 'S';",
            hints: ["CREATE INDEX idx_name ON table(column)", "Then query using that column in WHERE"],
            points: 20
          }
        },
        {
          day: 16,
          title: "Working with Views",
          description: "Create virtual tables for reusable query logic",
          concepts: ["CREATE VIEW", "Virtual Tables", "Abstraction"],
          lesson: {
            content: `# Database Views 👁️

## What is a View?

A view is a saved query that acts like a virtual table.

## Creating a View

\`\`\`sql
CREATE VIEW survivors AS
SELECT Name, Age, Pclass, Fare
FROM passengers
WHERE Survived = 1;
\`\`\`

## Using a View

\`\`\`sql
SELECT * FROM survivors WHERE Age > 50;
\`\`\`

## Benefits

- **Simplicity**: Complex queries become simple
- **Security**: Hide sensitive columns
- **Consistency**: Same logic everywhere
- **Maintenance**: Update once, use everywhere

## Dropping a View

\`\`\`sql
DROP VIEW IF EXISTS survivors;
\`\`\``,
            keyPoints: [
              "Views are saved queries, not stored data",
              "They simplify complex queries",
              "Views can be queried like regular tables",
              "Changes to base tables reflect in views"
            ]
          },
          challenge: {
            title: "Create a View",
            description: "Create a view called **first_class_passengers** that shows Name, Age, and Fare for Pclass = 1. Then query it.",
            dataset: "titanic",
            solution: "CREATE VIEW first_class_passengers AS SELECT Name, Age, Fare FROM passengers WHERE Pclass = 1; SELECT * FROM first_class_passengers;",
            hints: ["CREATE VIEW name AS SELECT...", "Then SELECT from the view"],
            points: 20
          }
        },
        {
          day: 17,
          title: "Transaction Management",
          description: "Ensure data integrity with transactions",
          concepts: ["BEGIN", "COMMIT", "ROLLBACK", "ACID"],
          lesson: {
            content: `# Transactions 🔐

## What is a Transaction?

A transaction is a group of operations that either ALL succeed or ALL fail.

## ACID Properties

- **Atomicity**: All or nothing
- **Consistency**: Valid state before and after
- **Isolation**: Transactions don't interfere
- **Durability**: Committed changes persist

## Transaction Syntax

\`\`\`sql
BEGIN TRANSACTION;

UPDATE accounts SET balance = balance - 100 
WHERE id = 1;

UPDATE accounts SET balance = balance + 100 
WHERE id = 2;

COMMIT;
\`\`\`

## Rollback on Error

\`\`\`sql
BEGIN TRANSACTION;
-- operations...
ROLLBACK; -- Undo all changes
\`\`\``,
            keyPoints: [
              "Transactions group related operations",
              "COMMIT saves all changes",
              "ROLLBACK undoes all changes",
              "Essential for data integrity"
            ]
          },
          challenge: {
            title: "Safe Update",
            description: "Write a transaction that updates a passenger's fare and class atomically. Use BEGIN and COMMIT.",
            dataset: "titanic",
            solution: "BEGIN TRANSACTION; UPDATE passengers SET Fare = 100, Pclass = 1 WHERE PassengerId = 1; COMMIT;",
            hints: ["Start with BEGIN TRANSACTION", "End with COMMIT"],
            points: 20
          }
        },
        {
          day: 18,
          title: "Creating Stored Procedures",
          description: "Learn about reusable SQL code blocks (conceptual in SQLite)",
          concepts: ["Procedures", "Functions", "Reusability"],
          lesson: {
            content: `# Stored Procedures & Functions 📦

## What are Stored Procedures?

Reusable blocks of SQL code stored in the database.

Note: SQLite has limited support, but the concepts apply to all databases.

## SQLite User Functions (Conceptual)

In production databases like PostgreSQL/MySQL:

\`\`\`sql
CREATE PROCEDURE GetSurvivorsByClass(class_id INT)
BEGIN
  SELECT * FROM passengers 
  WHERE Pclass = class_id AND Survived = 1;
END;

CALL GetSurvivorsByClass(1);
\`\`\`

## Benefits

- **Reusability**: Write once, use many times
- **Security**: Control data access
- **Performance**: Pre-compiled execution
- **Maintainability**: Centralized logic

## SQLite Alternative: Views

\`\`\`sql
CREATE VIEW class_survivors AS
SELECT Pclass, COUNT(*) as survivors
FROM passengers WHERE Survived = 1
GROUP BY Pclass;
\`\`\``,
            keyPoints: [
              "Stored procedures encapsulate SQL logic",
              "They accept parameters for flexibility",
              "In SQLite, use views for similar functionality",
              "Production databases have full procedure support"
            ]
          },
          challenge: {
            title: "Reusable Query",
            description: "Create a view that mimics a procedure: show survival statistics (count, avg_age, avg_fare) grouped by Pclass.",
            dataset: "titanic",
            solution: "CREATE VIEW class_statistics AS SELECT Pclass, COUNT(*) AS total, SUM(Survived) AS survivors, AVG(Age) AS avg_age, AVG(Fare) AS avg_fare FROM passengers GROUP BY Pclass; SELECT * FROM class_statistics;",
            hints: ["Create a view with GROUP BY", "Include multiple aggregates"],
            points: 25
          }
        },
        {
          day: 19,
          title: "Implementing Triggers",
          description: "Automate actions when data changes",
          concepts: ["Triggers", "AFTER INSERT", "BEFORE UPDATE"],
          lesson: {
            content: `# Database Triggers ⚡

## What is a Trigger?

Automatic code that runs when data changes.

## Creating a Trigger

\`\`\`sql
CREATE TRIGGER log_fare_update
AFTER UPDATE ON passengers
FOR EACH ROW
WHEN OLD.Fare != NEW.Fare
BEGIN
  INSERT INTO fare_log(passenger_id, old_fare, new_fare, changed_at)
  VALUES (NEW.PassengerId, OLD.Fare, NEW.Fare, datetime('now'));
END;
\`\`\`

## Trigger Types

- **BEFORE**: Runs before the operation
- **AFTER**: Runs after the operation
- **INSTEAD OF**: Replaces the operation (for views)

## OLD and NEW

- **OLD**: The row before change
- **NEW**: The row after change`,
            keyPoints: [
              "Triggers automate database tasks",
              "They fire on INSERT, UPDATE, or DELETE",
              "OLD/NEW reference row values",
              "Use for auditing, validation, cascading changes"
            ]
          },
          challenge: {
            title: "Audit Trail",
            description: "Create an audit table and a trigger that logs whenever a passenger's Survived status is updated.",
            dataset: "titanic",
            solution: "CREATE TABLE IF NOT EXISTS survival_log (id INTEGER PRIMARY KEY, passenger_id INTEGER, old_status INTEGER, new_status INTEGER, changed_at TEXT); CREATE TRIGGER log_survival AFTER UPDATE ON passengers WHEN OLD.Survived != NEW.Survived BEGIN INSERT INTO survival_log(passenger_id, old_status, new_status, changed_at) VALUES (NEW.PassengerId, OLD.Survived, NEW.Survived, datetime('now')); END;",
            hints: ["First CREATE TABLE for logs", "Then CREATE TRIGGER AFTER UPDATE"],
            points: 30
          }
        },
        {
          day: 20,
          title: "Database Normalization",
          description: "Design efficient database structures",
          concepts: ["1NF", "2NF", "3NF", "Normalization"],
          lesson: {
            content: `# Database Normalization 📐

## Why Normalize?

- Eliminate redundant data
- Prevent update anomalies
- Ensure data integrity

## First Normal Form (1NF)

- Each cell contains single value
- Each row is unique
- No repeating groups

❌ Bad: \`hobbies: "reading, gaming"\`
✅ Good: Separate hobbies table

## Second Normal Form (2NF)

- Meet 1NF
- All non-key columns depend on the FULL primary key

## Third Normal Form (3NF)

- Meet 2NF
- No transitive dependencies

❌ Bad: \`employee_id, department_id, department_name\`
✅ Good: Separate departments table

## Denormalization

Sometimes we intentionally denormalize for performance (read-heavy systems).`,
            keyPoints: [
              "Normalization reduces data redundancy",
              "1NF: Atomic values, unique rows",
              "2NF: Full dependency on primary key",
              "3NF: No transitive dependencies"
            ]
          },
          challenge: {
            title: "Normalize Design",
            description: "The passengers table has Ticket shared by multiple passengers. Write a query to find all unique tickets with passenger count.",
            dataset: "titanic",
            solution: "SELECT Ticket, COUNT(*) AS passengers_on_ticket FROM passengers WHERE Ticket != '' GROUP BY Ticket HAVING COUNT(*) > 1 ORDER BY passengers_on_ticket DESC;",
            hints: ["GROUP BY Ticket", "Use HAVING to filter groups"],
            points: 20
          }
        },
        {
          day: 21,
          title: "Exploring ACID Properties",
          description: "Deep dive into database reliability guarantees",
          concepts: ["Atomicity", "Consistency", "Isolation", "Durability"],
          lesson: {
            content: `# ACID Properties 🛡️

## Atomicity

All operations in a transaction succeed or all fail.

\`\`\`sql
BEGIN;
UPDATE account SET balance = balance - 100 WHERE id = 1;
UPDATE account SET balance = balance + 100 WHERE id = 2;
-- If either fails, both are rolled back
COMMIT;
\`\`\`

## Consistency

Database moves from one valid state to another.

## Isolation

Concurrent transactions don't interfere.

### Isolation Levels:
1. READ UNCOMMITTED (lowest)
2. READ COMMITTED
3. REPEATABLE READ
4. SERIALIZABLE (highest)

## Durability

Once committed, data survives crashes.

## Testing Atomicity

\`\`\`sql
BEGIN;
UPDATE passengers SET Fare = -100 WHERE PassengerId = 1;
-- Check constraint would fail
ROLLBACK;
\`\`\``,
            keyPoints: [
              "ACID ensures reliable transactions",
              "Atomicity: All or nothing",
              "Isolation levels trade performance for safety",
              "Durability means committed = permanent"
            ]
          },
          challenge: {
            title: "Transaction Practice",
            description: "Write a transaction that swaps fares between two passengers (ID 1 and 2), ensuring atomicity.",
            dataset: "titanic",
            solution: "BEGIN; UPDATE passengers SET Fare = (SELECT Fare FROM passengers WHERE PassengerId = 2) WHERE PassengerId = 1; UPDATE passengers SET Fare = (SELECT Fare FROM passengers WHERE PassengerId = 1) WHERE PassengerId = 2; COMMIT;",
            hints: ["Use subqueries to get the other passenger's fare", "Wrap in BEGIN/COMMIT"],
            points: 25
          }
        }
      ]
    },
    {
      id: 4,
      title: "SQL for Data Analysis",
      subtitle: "Days 22-28",
      color: "from-green-500 to-teal-500",
      icon: "📈",
      days: [
        {
          day: 22,
          title: "Date Functions",
          description: "Manipulate and extract information from dates",
          concepts: ["date()", "strftime()", "Date Arithmetic"],
          lesson: {
            content: `# Date Functions 📅

## Current Date/Time

\`\`\`sql
SELECT date('now');           -- 2024-01-15
SELECT datetime('now');       -- 2024-01-15 14:30:00
SELECT time('now');           -- 14:30:00
\`\`\`

## Date Formatting (strftime)

\`\`\`sql
SELECT strftime('%Y', '2024-01-15');  -- 2024
SELECT strftime('%m', '2024-01-15');  -- 01
SELECT strftime('%d', '2024-01-15');  -- 15
SELECT strftime('%W', '2024-01-15');  -- Week number
\`\`\`

## Date Arithmetic

\`\`\`sql
SELECT date('now', '+7 days');
SELECT date('now', '-1 month');
SELECT date('now', 'start of month');
\`\`\`

## Age Calculation

\`\`\`sql
SELECT 
  (strftime('%Y', 'now') - strftime('%Y', birth_date)) AS age
FROM people;
\`\`\``,
            keyPoints: [
              "date(), datetime(), time() get current values",
              "strftime() formats and extracts date parts",
              "Date modifiers allow arithmetic",
              "Dates stored as TEXT in SQLite"
            ]
          },
          challenge: {
            title: "Date Analysis",
            description: "Using the **ecommerce** dataset, find orders from the current year grouped by month. Show month and order count.",
            dataset: "ecommerce",
            solution: "SELECT strftime('%m', order_date) AS month, COUNT(*) AS order_count FROM orders WHERE strftime('%Y', order_date) = strftime('%Y', 'now') GROUP BY month ORDER BY month;",
            hints: ["Use strftime('%Y',...) for year", "Group by month"],
            points: 25
          }
        },
        {
          day: 23,
          title: "String Functions",
          description: "Manipulate and search text data",
          concepts: ["UPPER", "LOWER", "SUBSTR", "INSTR", "REPLACE"],
          lesson: {
            content: `# String Functions 📝

## Case Conversion

\`\`\`sql
SELECT UPPER(Name) FROM passengers;  -- JOHN SMITH
SELECT LOWER(Name) FROM passengers;  -- john smith
\`\`\`

## Substring

\`\`\`sql
SELECT SUBSTR(Name, 1, 5) FROM passengers;  -- First 5 chars
SELECT SUBSTR(Name, -3) FROM passengers;    -- Last 3 chars
\`\`\`

## Finding Text

\`\`\`sql
SELECT INSTR(Name, 'Mr.') FROM passengers;  -- Position or 0
SELECT * FROM passengers WHERE Name LIKE '%Mr.%';
\`\`\`

## Replacing Text

\`\`\`sql
SELECT REPLACE(Name, 'Mr.', 'Mister') FROM passengers;
\`\`\`

## Concatenation

\`\`\`sql
SELECT Name || ' - Class ' || Pclass FROM passengers;
\`\`\`

## Length and Trimming

\`\`\`sql
SELECT LENGTH(Name) FROM passengers;
SELECT TRIM('  hello  ');  -- 'hello'
\`\`\``,
            keyPoints: [
              "|| concatenates strings in SQLite",
              "SUBSTR extracts parts of strings",
              "LIKE with % for pattern matching",
              "TRIM removes whitespace"
            ]
          },
          challenge: {
            title: "Name Parsing",
            description: "Extract the **title** (Mr., Mrs., Miss., etc.) from passenger names. Show the title and count of each.",
            dataset: "titanic",
            solution: "SELECT SUBSTR(Name, INSTR(Name, ', ') + 2, INSTR(SUBSTR(Name, INSTR(Name, ', ') + 2), '.')) AS title, COUNT(*) AS count FROM passengers GROUP BY title ORDER BY count DESC;",
            hints: ["Titles are between ', ' and '.'", "Use SUBSTR and INSTR"],
            points: 30
          }
        },
        {
          day: 24,
          title: "Math Functions",
          description: "Perform calculations and rounding in SQL",
          concepts: ["ROUND", "ABS", "Mathematical Operations"],
          lesson: {
            content: `# Math Functions 🔢

## Basic Math

\`\`\`sql
SELECT 10 + 5;   -- 15
SELECT 10 - 5;   -- 5
SELECT 10 * 5;   -- 50
SELECT 10 / 3;   -- 3 (integer division)
SELECT 10.0 / 3; -- 3.333...
SELECT 10 % 3;   -- 1 (modulo)
\`\`\`

## Rounding

\`\`\`sql
SELECT ROUND(3.14159, 2);  -- 3.14
SELECT ROUND(Fare, 0) FROM passengers;
\`\`\`

## Absolute Value

\`\`\`sql
SELECT ABS(-42);  -- 42
\`\`\`

## Calculations in Queries

\`\`\`sql
SELECT Name, 
       Fare,
       ROUND(Fare * 1.1, 2) AS fare_with_tax
FROM passengers;
\`\`\`

## Statistical Calculations

\`\`\`sql
SELECT 
  AVG(Fare) AS mean,
  MIN(Fare) AS minimum,
  MAX(Fare) AS maximum,
  MAX(Fare) - MIN(Fare) AS range
FROM passengers;
\`\`\``,
            keyPoints: [
              "Use 10.0 / 3 for decimal division",
              "ROUND(value, decimals) rounds numbers",
              "ABS returns absolute value",
              "Combine with aggregates for statistics"
            ]
          },
          challenge: {
            title: "Fare Analysis",
            description: "Calculate the **fare per family member** (SibSp + Parch + 1). Show Name, Fare, family_size, and fare_per_person (rounded to 2 decimals).",
            dataset: "titanic",
            solution: "SELECT Name, Fare, (SibSp + Parch + 1) AS family_size, ROUND(Fare / (SibSp + Parch + 1), 2) AS fare_per_person FROM passengers WHERE Fare > 0;",
            hints: ["family_size = SibSp + Parch + 1", "Use ROUND for fare_per_person"],
            points: 20
          }
        },
        {
          day: 25,
          title: "Window Functions",
          description: "Perform calculations across related rows",
          concepts: ["OVER", "PARTITION BY", "ROW_NUMBER", "RANK"],
          lesson: {
            content: `# Window Functions 🪟

## What are Window Functions?

Calculate values across a set of rows related to the current row.

## ROW_NUMBER

\`\`\`sql
SELECT Name, Fare,
  ROW_NUMBER() OVER (ORDER BY Fare DESC) AS rank
FROM passengers;
\`\`\`

## PARTITION BY

\`\`\`sql
SELECT Name, Pclass, Fare,
  ROW_NUMBER() OVER (PARTITION BY Pclass ORDER BY Fare DESC) AS class_rank
FROM passengers;
\`\`\`

## Running Totals

\`\`\`sql
SELECT Name, Fare,
  SUM(Fare) OVER (ORDER BY PassengerId) AS running_total
FROM passengers;
\`\`\`

## RANK vs DENSE_RANK

\`\`\`sql
SELECT Fare,
  RANK() OVER (ORDER BY Fare DESC) AS rank,      -- 1,2,2,4
  DENSE_RANK() OVER (ORDER BY Fare DESC) AS dense -- 1,2,2,3
FROM passengers;
\`\`\``,
            keyPoints: [
              "Window functions don't collapse rows like GROUP BY",
              "OVER() defines the window",
              "PARTITION BY creates sub-windows",
              "ROW_NUMBER, RANK, DENSE_RANK for ordering"
            ]
          },
          challenge: {
            title: "Ranking Passengers",
            description: "Rank passengers by fare **within their class**. Show Name, Pclass, Fare, and their rank (1 = highest fare).",
            dataset: "titanic",
            solution: "SELECT Name, Pclass, Fare, RANK() OVER (PARTITION BY Pclass ORDER BY Fare DESC) AS fare_rank FROM passengers;",
            hints: ["PARTITION BY Pclass", "ORDER BY Fare DESC in the window"],
            points: 30
          }
        },
        {
          day: 26,
          title: "Common Table Expressions (CTE)",
          description: "Write cleaner queries with WITH clause",
          concepts: ["WITH", "CTE", "Recursive CTE"],
          lesson: {
            content: `# Common Table Expressions 📋

## Basic CTE

\`\`\`sql
WITH survivors AS (
  SELECT * FROM passengers WHERE Survived = 1
)
SELECT Pclass, COUNT(*) AS count
FROM survivors
GROUP BY Pclass;
\`\`\`

## Multiple CTEs

\`\`\`sql
WITH 
  survivors AS (
    SELECT * FROM passengers WHERE Survived = 1
  ),
  class_stats AS (
    SELECT Pclass, AVG(Fare) AS avg_fare
    FROM survivors
    GROUP BY Pclass
  )
SELECT * FROM class_stats;
\`\`\`

## CTE vs Subquery

CTEs are:
- More readable
- Reusable within the query
- Self-documenting

## Recursive CTE (Advanced)

\`\`\`sql
WITH RECURSIVE countdown(n) AS (
  SELECT 10
  UNION ALL
  SELECT n - 1 FROM countdown WHERE n > 1
)
SELECT n FROM countdown;
\`\`\``,
            keyPoints: [
              "CTEs make complex queries readable",
              "WITH clause defines temporary result sets",
              "Multiple CTEs separated by commas",
              "Recursive CTEs handle hierarchical data"
            ]
          },
          challenge: {
            title: "CTE Analysis",
            description: "Use a CTE to find the **average fare by class**, then find passengers who paid more than their class average.",
            dataset: "titanic",
            solution: "WITH class_avg AS (SELECT Pclass, AVG(Fare) AS avg_fare FROM passengers GROUP BY Pclass) SELECT p.Name, p.Pclass, p.Fare, c.avg_fare FROM passengers p JOIN class_avg c ON p.Pclass = c.Pclass WHERE p.Fare > c.avg_fare;",
            hints: ["First CTE calculates class averages", "Main query joins and filters"],
            points: 30
          }
        },
        {
          day: 27,
          title: "Analytic Functions",
          description: "LAG, LEAD, and other analytic capabilities",
          concepts: ["LAG", "LEAD", "FIRST_VALUE", "LAST_VALUE"],
          lesson: {
            content: `# Analytic Functions 📊

## LAG - Previous Row Value

\`\`\`sql
SELECT Name, Fare,
  LAG(Fare) OVER (ORDER BY PassengerId) AS prev_fare
FROM passengers;
\`\`\`

## LEAD - Next Row Value

\`\`\`sql
SELECT Name, Fare,
  LEAD(Fare) OVER (ORDER BY PassengerId) AS next_fare
FROM passengers;
\`\`\`

## Calculating Differences

\`\`\`sql
SELECT Name, Fare,
  Fare - LAG(Fare) OVER (ORDER BY PassengerId) AS fare_diff
FROM passengers;
\`\`\`

## FIRST_VALUE / LAST_VALUE

\`\`\`sql
SELECT Name, Pclass, Fare,
  FIRST_VALUE(Name) OVER (
    PARTITION BY Pclass 
    ORDER BY Fare DESC
  ) AS highest_payer
FROM passengers;
\`\`\``,
            keyPoints: [
              "LAG accesses previous row values",
              "LEAD accesses next row values",
              "Useful for calculating changes/differences",
              "FIRST_VALUE/LAST_VALUE get boundary values"
            ]
          },
          challenge: {
            title: "Fare Comparison",
            description: "For each passenger, show their fare and the **difference from the previous passenger's fare** (ordered by PassengerId).",
            dataset: "titanic",
            solution: "SELECT Name, Fare, LAG(Fare) OVER (ORDER BY PassengerId) AS prev_fare, Fare - LAG(Fare) OVER (ORDER BY PassengerId) AS fare_difference FROM passengers;",
            hints: ["Use LAG(Fare) OVER (ORDER BY PassengerId)", "Subtract to get difference"],
            points: 25
          }
        },
        {
          day: 28,
          title: "Pivot & Unpivot",
          description: "Transform data between row and column formats",
          concepts: ["CASE Pivot", "Cross-Tabulation"],
          lesson: {
            content: `# Pivot Tables in SQL 🔄

SQLite doesn't have native PIVOT, but we can use CASE statements.

## Pivot with CASE

Turn rows into columns:

\`\`\`sql
SELECT 
  Embarked,
  SUM(CASE WHEN Pclass = 1 THEN 1 ELSE 0 END) AS first_class,
  SUM(CASE WHEN Pclass = 2 THEN 1 ELSE 0 END) AS second_class,
  SUM(CASE WHEN Pclass = 3 THEN 1 ELSE 0 END) AS third_class
FROM passengers
GROUP BY Embarked;
\`\`\`

## Cross-Tabulation

\`\`\`sql
SELECT 
  Sex,
  SUM(CASE WHEN Survived = 1 THEN 1 ELSE 0 END) AS survived,
  SUM(CASE WHEN Survived = 0 THEN 1 ELSE 0 END) AS died,
  ROUND(AVG(Survived) * 100, 1) AS survival_rate
FROM passengers
GROUP BY Sex;
\`\`\`

## Dynamic Aggregation

\`\`\`sql
SELECT 
  Pclass,
  COUNT(*) AS total,
  SUM(Survived) AS survivors,
  ROUND(100.0 * SUM(Survived) / COUNT(*), 1) AS pct
FROM passengers
GROUP BY Pclass;
\`\`\``,
            keyPoints: [
              "Use CASE inside aggregates for pivot",
              "GROUP BY determines your rows",
              "CASE WHEN determines your columns",
              "Great for cross-tabulation reports"
            ]
          },
          challenge: {
            title: "Survival Pivot",
            description: "Create a pivot showing **survival count by Sex and Class**. Rows = Sex, Columns = Class (1, 2, 3).",
            dataset: "titanic",
            solution: "SELECT Sex, SUM(CASE WHEN Pclass = 1 AND Survived = 1 THEN 1 ELSE 0 END) AS class1_survived, SUM(CASE WHEN Pclass = 2 AND Survived = 1 THEN 1 ELSE 0 END) AS class2_survived, SUM(CASE WHEN Pclass = 3 AND Survived = 1 THEN 1 ELSE 0 END) AS class3_survived FROM passengers GROUP BY Sex;",
            hints: ["GROUP BY Sex for rows", "CASE for each class column"],
            points: 30
          }
        }
      ]
    },
    {
      id: 5,
      title: "SQL Best Practices & Optimization",
      subtitle: "Days 29-30",
      color: "from-yellow-500 to-amber-500",
      icon: "⚡",
      days: [
        {
          day: 29,
          title: "Index Optimization",
          description: "Advanced indexing strategies for query performance",
          concepts: ["Query Plans", "Index Selection", "Covering Indexes"],
          lesson: {
            content: `# Index Optimization ⚡

## Query Execution Plan

\`\`\`sql
EXPLAIN QUERY PLAN
SELECT * FROM passengers WHERE Pclass = 1;
\`\`\`

Shows how SQLite will execute your query.

## Index Types

1. **Single Column**: One column
2. **Composite**: Multiple columns (order matters!)
3. **Covering**: Contains all needed columns

## Composite Index Order

\`\`\`sql
CREATE INDEX idx_class_survived 
ON passengers(Pclass, Survived);

-- Uses index well:
WHERE Pclass = 1 AND Survived = 1
WHERE Pclass = 1

-- May not use index:
WHERE Survived = 1  -- Second column only!
\`\`\`

## When NOT to Index

- Columns with few unique values
- Frequently updated columns
- Small tables (< 1000 rows)
- Columns rarely in WHERE/JOIN`,
            keyPoints: [
              "EXPLAIN QUERY PLAN shows execution",
              "Composite index column order matters",
              "Covering indexes include all SELECT columns",
              "Too many indexes slow writes"
            ]
          },
          challenge: {
            title: "Optimize Query",
            description: "Use EXPLAIN QUERY PLAN to analyze a query, then create an appropriate index to optimize it.",
            dataset: "titanic",
            solution: "EXPLAIN QUERY PLAN SELECT Name, Fare FROM passengers WHERE Pclass = 1 AND Survived = 1 ORDER BY Fare DESC; CREATE INDEX idx_class_surv_fare ON passengers(Pclass, Survived, Fare);",
            hints: ["First EXPLAIN the query", "Index columns used in WHERE and ORDER BY"],
            points: 30
          }
        },
        {
          day: 30,
          title: "Query Performance Tuning",
          description: "Write efficient queries and avoid common pitfalls",
          concepts: ["Query Optimization", "Best Practices", "Common Mistakes"],
          lesson: {
            content: `# Query Performance Tuning 🎯

## DO: Select Only What You Need

\`\`\`sql
-- ❌ Bad
SELECT * FROM passengers;

-- ✅ Good
SELECT Name, Age FROM passengers;
\`\`\`

## DO: Use WHERE to Limit Data Early

\`\`\`sql
-- ❌ Bad (filters after aggregation)
SELECT * FROM (
  SELECT Pclass, AVG(Fare) FROM passengers GROUP BY Pclass
) WHERE Pclass = 1;

-- ✅ Good (filters before aggregation)
SELECT Pclass, AVG(Fare) FROM passengers 
WHERE Pclass = 1 GROUP BY Pclass;
\`\`\`

## DON'T: Use Functions on Indexed Columns

\`\`\`sql
-- ❌ Can't use index
WHERE UPPER(Name) = 'JOHN'

-- ✅ Can use index
WHERE Name = 'John'
\`\`\`

## DO: Use EXISTS Instead of IN for Large Subqueries

\`\`\`sql
-- Often faster:
WHERE EXISTS (SELECT 1 FROM other WHERE other.id = main.id)
\`\`\`

## Final Tips

1. Index columns in WHERE, JOIN, ORDER BY
2. Avoid SELECT *
3. Use LIMIT for testing
4. Profile with EXPLAIN QUERY PLAN`,
            keyPoints: [
              "Select only needed columns",
              "Filter early with WHERE",
              "Avoid functions on indexed columns",
              "Use EXPLAIN to find bottlenecks"
            ]
          },
          challenge: {
            title: "Graduation Challenge",
            description: "Write an optimized query to find the **top 5 highest-paying survivors in each class** with their class rank. Use CTEs and window functions.",
            dataset: "titanic",
            solution: "WITH ranked_survivors AS (SELECT Name, Pclass, Fare, RANK() OVER (PARTITION BY Pclass ORDER BY Fare DESC) AS class_rank FROM passengers WHERE Survived = 1) SELECT * FROM ranked_survivors WHERE class_rank <= 5 ORDER BY Pclass, class_rank;",
            hints: ["CTE with window function for ranking", "Filter to top 5 per class"],
            points: 50
          }
        }
      ]
    }
  ]
};

// Weekly completion rewards
window.weeklyRewards = {
  1: { xp: 100, badge: "SQL Foundations", icon: "🏅" },
  2: { xp: 150, badge: "Query Architect", icon: "🥈" },
  3: { xp: 200, badge: "Database Expert", icon: "🥇" },
  4: { xp: 250, badge: "Data Analyst", icon: "🏆" },
  5: { xp: 300, badge: "SQL Master", icon: "👑" }
};

// 30-Day Completion Reward
window.masterReward = {
  xp: 1000,
  badge: "30-Day SQL Master",
  icon: "🎓",
  title: "SQL Master" // Leaderboard title
};
