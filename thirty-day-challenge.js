// 30-Day SQL Mastery Challenge Curriculum
window.thirtyDayChallenge = {
  title: "Master SQL 30-Day Challenge",
  description: "Transform from SQL beginner to expert in 30 days with our structured curriculum",
  
  weeks: [
    {
      id: 1,
      title: "SQL for Data Analysis",
      subtitle: "Days 1-7: Fundamentals",
      color: "from-blue-500 to-cyan-500",
      icon: "📊"
    },
    {
      id: 2,
      title: "Intermediate SQL",
      subtitle: "Days 8-14: Level Up",
      color: "from-green-500 to-emerald-500",
      icon: "📈"
    },
    {
      id: 3,
      title: "Advanced SQL",
      subtitle: "Days 15-21: Pro Skills",
      color: "from-purple-500 to-pink-500",
      icon: "🚀"
    },
    {
      id: 4,
      title: "SQL for Data Analysis",
      subtitle: "Days 22-28: Analytics",
      color: "from-orange-500 to-red-500",
      icon: "🔬"
    },
    {
      id: 5,
      title: "Best Practices",
      subtitle: "Days 29-30: Mastery",
      color: "from-yellow-500 to-amber-500",
      icon: "🏆"
    }
  ],
  
  days: [
    // ============ WEEK 1: SQL FUNDAMENTALS ============
    {
      day: 1,
      week: 1,
      title: "Introduction to SQL",
      description: "Learn what SQL is, why it matters, and write your first query",
      concepts: ["SQL basics", "Databases", "Tables"],
      lesson: {
        content: `# Welcome to SQL! 🎉

**SQL (Structured Query Language)** is the standard language for working with databases. It's used by data analysts, scientists, engineers, and developers worldwide.

## What You'll Learn Today
- What SQL is and why it's important
- How databases organize data
- Your first SELECT query

## Key Concepts

### Databases & Tables
A **database** is like a filing cabinet that stores organized data. Inside, **tables** hold the actual data in rows and columns - just like a spreadsheet!

### The SELECT Statement
The most fundamental SQL command retrieves data from a table:

\`\`\`sql
SELECT * FROM employees;
\`\`\`

This gets ALL columns (*) from the employees table.

### Selecting Specific Columns
\`\`\`sql
SELECT name, salary FROM employees;
\`\`\`

This gets only the name and salary columns.`,
        tips: [
          "SQL keywords like SELECT and FROM are not case-sensitive, but UPPERCASE is conventional",
          "Always end statements with a semicolon (;)",
          "The * symbol means 'all columns'"
        ]
      },
      challenge: {
        title: "Your First Query",
        description: "Write a query to select all columns from the **passengers** table in the Titanic dataset.",
        dataset: "titanic",
        solution: "SELECT * FROM passengers;",
        alternativeSolutions: ["SELECT * FROM passengers", "select * from passengers;"],
        hints: [
          "Use SELECT * to get all columns",
          "The table name is 'passengers'",
          "Don't forget the semicolon!"
        ],
        expectedRows: 891,
        points: 10
      },
      bonusChallenge: {
        title: "Specific Columns",
        description: "Select only the **Name** and **Age** columns from the passengers table.",
        solution: "SELECT Name, Age FROM passengers;",
        points: 5
      }
    },
    {
      day: 2,
      week: 1,
      title: "Understanding Databases and Tables",
      description: "Explore database structure, data types, and table schemas",
      concepts: ["Schema", "Data types", "Table structure"],
      lesson: {
        content: `# Databases & Tables Deep Dive 🗄️

## Database Structure

Think of a database as a container that holds multiple related tables:

\`\`\`
Database: company_db
├── employees (table)
├── departments (table)
├── salaries (table)
└── projects (table)
\`\`\`

## Data Types

Each column has a specific data type:

| Type | Description | Example |
|------|-------------|---------|
| INTEGER | Whole numbers | 42, -7, 0 |
| REAL/FLOAT | Decimal numbers | 3.14, -0.5 |
| TEXT | Strings/words | 'Hello', 'John' |
| DATE | Dates | '2024-01-15' |
| BOOLEAN | True/False | 1, 0 |

## Viewing Table Structure

To see what columns a table has:
\`\`\`sql
PRAGMA table_info(passengers);
\`\`\`

## NULL Values
NULL represents missing or unknown data - it's different from 0 or empty string!`,
        tips: [
          "NULL is not the same as 0 or an empty string",
          "Data types help ensure data integrity",
          "Understanding schema is crucial for writing correct queries"
        ]
      },
      challenge: {
        title: "Explore the Schema",
        description: "Select the **PassengerId**, **Name**, **Sex**, and **Age** columns from the passengers table.",
        dataset: "titanic",
        solution: "SELECT PassengerId, Name, Sex, Age FROM passengers;",
        hints: [
          "List column names separated by commas",
          "Column names are case-sensitive"
        ],
        points: 10
      }
    },
    {
      day: 3,
      week: 1,
      title: "SELECT Statement Mastery",
      description: "Master column selection, aliases, and expressions",
      concepts: ["SELECT", "Aliases", "Expressions"],
      lesson: {
        content: `# SELECT Statement Mastery 🎯

## Column Aliases
Give columns friendlier names using AS:

\`\`\`sql
SELECT Name AS passenger_name, 
       Age AS passenger_age 
FROM passengers;
\`\`\`

## Expressions in SELECT
Perform calculations directly in your query:

\`\`\`sql
SELECT Name, 
       Age,
       Age * 12 AS age_in_months
FROM passengers;
\`\`\`

## String Concatenation
Combine text values:

\`\`\`sql
SELECT Name || ' - ' || Sex AS passenger_info
FROM passengers;
\`\`\`

## DISTINCT - Remove Duplicates
Get unique values only:

\`\`\`sql
SELECT DISTINCT Pclass FROM passengers;
\`\`\`

This returns only the unique passenger classes (1, 2, 3).`,
        tips: [
          "AS keyword is optional but improves readability",
          "Use || for string concatenation in SQLite",
          "DISTINCT is great for exploring unique values in a column"
        ]
      },
      challenge: {
        title: "Calculated Columns",
        description: "Select passenger **Name**, **Fare**, and create a column called **fare_in_cents** that multiplies Fare by 100.",
        dataset: "titanic",
        solution: "SELECT Name, Fare, Fare * 100 AS fare_in_cents FROM passengers;",
        hints: [
          "Use AS to create an alias",
          "Multiply Fare by 100",
          "Column alias should be fare_in_cents"
        ],
        points: 15
      }
    },
    {
      day: 4,
      week: 1,
      title: "WHERE Clause and Logical Operators",
      description: "Filter data using conditions and combine them with AND/OR",
      concepts: ["WHERE", "AND", "OR", "Comparison operators"],
      lesson: {
        content: `# Filtering with WHERE 🔍

## Basic WHERE Clause
Filter rows that match a condition:

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

### AND - Both must be true
\`\`\`sql
SELECT * FROM passengers
WHERE Age > 30 AND Sex = 'female';
\`\`\`

### OR - Either can be true
\`\`\`sql
SELECT * FROM passengers
WHERE Pclass = 1 OR Pclass = 2;
\`\`\`

### NOT - Negate a condition
\`\`\`sql
SELECT * FROM passengers
WHERE NOT Survived = 0;
\`\`\`

## Working with NULL
\`\`\`sql
SELECT * FROM passengers WHERE Age IS NULL;
SELECT * FROM passengers WHERE Age IS NOT NULL;
\`\`\``,
        tips: [
          "Text values need single quotes: 'female'",
          "Use IS NULL, not = NULL for null checks",
          "Parentheses help clarify complex conditions"
        ]
      },
      challenge: {
        title: "Filter Survivors",
        description: "Find all **female passengers** who **survived** (Survived = 1).",
        dataset: "titanic",
        solution: "SELECT * FROM passengers WHERE Sex = 'female' AND Survived = 1;",
        hints: [
          "Use AND to combine conditions",
          "Sex should equal 'female' (with quotes)",
          "Survived should equal 1"
        ],
        points: 15
      }
    },
    {
      day: 5,
      week: 1,
      title: "Sorting Data with ORDER BY",
      description: "Sort results in ascending or descending order",
      concepts: ["ORDER BY", "ASC", "DESC", "Multiple sorting"],
      lesson: {
        content: `# Sorting with ORDER BY 📊

## Basic Sorting
Sort results by a column:

\`\`\`sql
SELECT * FROM passengers
ORDER BY Age;
\`\`\`

## Ascending vs Descending

\`\`\`sql
-- Youngest first (default)
SELECT * FROM passengers ORDER BY Age ASC;

-- Oldest first
SELECT * FROM passengers ORDER BY Age DESC;
\`\`\`

## Multiple Sort Columns
Sort by multiple columns - first by Pclass, then by Age within each class:

\`\`\`sql
SELECT * FROM passengers
ORDER BY Pclass ASC, Age DESC;
\`\`\`

## Sorting with NULL
NULL values appear first with ASC, last with DESC (in most databases).

## Combining with WHERE
\`\`\`sql
SELECT Name, Age, Fare FROM passengers
WHERE Survived = 1
ORDER BY Fare DESC;
\`\`\``,
        tips: [
          "ASC is the default (ascending)",
          "DESC sorts from highest to lowest",
          "ORDER BY always comes after WHERE"
        ]
      },
      challenge: {
        title: "Top Fares",
        description: "Find the **top 20 passengers** who paid the highest **Fare**. Show Name, Pclass, and Fare, sorted by Fare descending.",
        dataset: "titanic",
        solution: "SELECT Name, Pclass, Fare FROM passengers ORDER BY Fare DESC LIMIT 20;",
        hints: [
          "Use ORDER BY Fare DESC for highest first",
          "Add LIMIT 20 at the end",
          "Select only the requested columns"
        ],
        points: 15
      }
    },
    {
      day: 6,
      week: 1,
      title: "LIMIT & OFFSET",
      description: "Control how many rows to return and pagination",
      concepts: ["LIMIT", "OFFSET", "Pagination"],
      lesson: {
        content: `# LIMIT & OFFSET 📄

## LIMIT - Restrict Results
Get only a specific number of rows:

\`\`\`sql
SELECT * FROM passengers LIMIT 10;
\`\`\`

## OFFSET - Skip Rows
Skip the first N rows:

\`\`\`sql
SELECT * FROM passengers LIMIT 10 OFFSET 20;
\`\`\`
This skips 20 rows, then returns the next 10.

## Pagination Example
For a "page" system with 10 items per page:

\`\`\`sql
-- Page 1 (rows 1-10)
SELECT * FROM passengers LIMIT 10 OFFSET 0;

-- Page 2 (rows 11-20)
SELECT * FROM passengers LIMIT 10 OFFSET 10;

-- Page 3 (rows 21-30)
SELECT * FROM passengers LIMIT 10 OFFSET 20;
\`\`\`

## Practical Use Cases
- Preview large datasets
- Build paginated APIs
- Get "Top N" results with ORDER BY`,
        tips: [
          "LIMIT without OFFSET returns from the beginning",
          "OFFSET formula: (page_number - 1) * items_per_page",
          "Always use ORDER BY with LIMIT for consistent results"
        ]
      },
      challenge: {
        title: "Pagination Practice",
        description: "Get the **second page** of passengers (rows 11-20) sorted by **PassengerId**. Show 10 results.",
        dataset: "titanic",
        solution: "SELECT * FROM passengers ORDER BY PassengerId LIMIT 10 OFFSET 10;",
        hints: [
          "Page 2 needs OFFSET 10 (skip first 10)",
          "LIMIT 10 for 10 results per page",
          "ORDER BY ensures consistent pagination"
        ],
        points: 15
      }
    },
    {
      day: 7,
      week: 1,
      title: "Aggregate Functions",
      description: "Calculate totals, averages, counts, and more",
      concepts: ["COUNT", "SUM", "AVG", "MIN", "MAX"],
      lesson: {
        content: `# Aggregate Functions 📈

Aggregate functions perform calculations across multiple rows.

## COUNT - Count Rows
\`\`\`sql
-- Count all rows
SELECT COUNT(*) FROM passengers;

-- Count non-null values in a column
SELECT COUNT(Age) FROM passengers;
\`\`\`

## SUM - Total Values
\`\`\`sql
SELECT SUM(Fare) AS total_revenue FROM passengers;
\`\`\`

## AVG - Average Value
\`\`\`sql
SELECT AVG(Age) AS average_age FROM passengers;
\`\`\`

## MIN & MAX
\`\`\`sql
SELECT MIN(Age) AS youngest,
       MAX(Age) AS oldest
FROM passengers;
\`\`\`

## Combining Aggregates
\`\`\`sql
SELECT 
    COUNT(*) AS total_passengers,
    SUM(Survived) AS survivors,
    AVG(Fare) AS avg_fare,
    MIN(Age) AS youngest,
    MAX(Age) AS oldest
FROM passengers;
\`\`\`

## With WHERE
\`\`\`sql
SELECT AVG(Age) FROM passengers WHERE Survived = 1;
\`\`\``,
        tips: [
          "COUNT(*) counts all rows, COUNT(column) skips NULLs",
          "AVG ignores NULL values",
          "Use aliases to make results readable"
        ]
      },
      challenge: {
        title: "Survival Statistics",
        description: "Calculate the **total passengers**, **number who survived** (SUM of Survived), and **survival rate** (AVG of Survived * 100).",
        dataset: "titanic",
        solution: "SELECT COUNT(*) AS total_passengers, SUM(Survived) AS survivors, AVG(Survived) * 100 AS survival_rate FROM passengers;",
        hints: [
          "COUNT(*) for total passengers",
          "SUM(Survived) since Survived is 0 or 1",
          "AVG(Survived) * 100 gives percentage"
        ],
        points: 20
      }
    },
    
    // ============ WEEK 2: INTERMEDIATE SQL ============
    {
      day: 8,
      week: 2,
      title: "GROUP BY Clause",
      description: "Group rows and calculate aggregates per group",
      concepts: ["GROUP BY", "Aggregates per group"],
      lesson: {
        content: `# GROUP BY - Grouping Data 📊

GROUP BY lets you calculate aggregates for each group separately.

## Basic GROUP BY
\`\`\`sql
SELECT Pclass, COUNT(*) AS passengers
FROM passengers
GROUP BY Pclass;
\`\`\`

Result:
| Pclass | passengers |
|--------|------------|
| 1 | 216 |
| 2 | 184 |
| 3 | 491 |

## Multiple Aggregates per Group
\`\`\`sql
SELECT Pclass,
       COUNT(*) AS total,
       SUM(Survived) AS survived,
       AVG(Fare) AS avg_fare
FROM passengers
GROUP BY Pclass;
\`\`\`

## GROUP BY Multiple Columns
\`\`\`sql
SELECT Pclass, Sex, COUNT(*) AS count
FROM passengers
GROUP BY Pclass, Sex;
\`\`\`

## Important Rule
Every column in SELECT must either be:
1. In the GROUP BY clause, OR
2. Inside an aggregate function`,
        tips: [
          "GROUP BY creates 'buckets' of rows",
          "Each group returns exactly one row in results",
          "Column order in GROUP BY can affect results"
        ]
      },
      challenge: {
        title: "Survival by Class",
        description: "Calculate the **survival rate** (AVG of Survived * 100) for each **passenger class** (Pclass). Order by class.",
        dataset: "titanic",
        solution: "SELECT Pclass, AVG(Survived) * 100 AS survival_rate FROM passengers GROUP BY Pclass ORDER BY Pclass;",
        hints: [
          "GROUP BY Pclass",
          "AVG(Survived) * 100 for percentage",
          "ORDER BY Pclass at the end"
        ],
        points: 20
      }
    },
    {
      day: 9,
      week: 2,
      title: "HAVING Clause",
      description: "Filter groups after aggregation",
      concepts: ["HAVING", "WHERE vs HAVING"],
      lesson: {
        content: `# HAVING - Filter Groups 🔍

HAVING filters groups AFTER aggregation (WHERE filters rows BEFORE).

## WHERE vs HAVING

\`\`\`sql
-- WHERE: Filter rows before grouping
SELECT Pclass, COUNT(*) 
FROM passengers
WHERE Age > 30
GROUP BY Pclass;

-- HAVING: Filter groups after aggregation
SELECT Pclass, COUNT(*) AS count
FROM passengers
GROUP BY Pclass
HAVING COUNT(*) > 100;
\`\`\`

## Using Both Together
\`\`\`sql
SELECT Embarked, COUNT(*) AS passengers
FROM passengers
WHERE Survived = 1          -- Filter rows first
GROUP BY Embarked
HAVING COUNT(*) > 50;       -- Then filter groups
\`\`\`

## HAVING with Aggregates
\`\`\`sql
SELECT Pclass, AVG(Fare) AS avg_fare
FROM passengers
GROUP BY Pclass
HAVING AVG(Fare) > 50;
\`\`\`

## Order of Execution
1. FROM → 2. WHERE → 3. GROUP BY → 4. HAVING → 5. SELECT → 6. ORDER BY`,
        tips: [
          "HAVING requires GROUP BY",
          "Use WHERE for row-level filters",
          "Use HAVING for aggregate-level filters"
        ]
      },
      challenge: {
        title: "Popular Embarkation Points",
        description: "Find embarkation points (**Embarked**) with more than **200 passengers**. Show the port and count.",
        dataset: "titanic",
        solution: "SELECT Embarked, COUNT(*) AS passenger_count FROM passengers GROUP BY Embarked HAVING COUNT(*) > 200;",
        hints: [
          "GROUP BY Embarked",
          "Use HAVING COUNT(*) > 200",
          "Not WHERE - we're filtering on aggregate"
        ],
        points: 20
      }
    },
    {
      day: 10,
      week: 2,
      title: "JOINs - INNER, LEFT, RIGHT",
      description: "Combine data from multiple tables",
      concepts: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN"],
      lesson: {
        content: `# JOINs - Combining Tables 🔗

JOINs let you combine rows from two or more tables based on related columns.

## INNER JOIN
Returns only matching rows from both tables:

\`\`\`sql
SELECT e.name, d.department_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.id;
\`\`\`

## LEFT JOIN
Returns all rows from left table, with matches from right (NULL if no match):

\`\`\`sql
SELECT e.name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id;
\`\`\`

## RIGHT JOIN
Returns all rows from right table, with matches from left:

\`\`\`sql
SELECT e.name, d.department_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.id;
\`\`\`

## Visual Representation
\`\`\`
INNER: Only intersection
LEFT:  All left + matching right
RIGHT: All right + matching left
\`\`\``,
        tips: [
          "Use table aliases (e, d) for cleaner queries",
          "INNER JOIN is the most common type",
          "LEFT JOIN is great for finding 'missing' relationships"
        ]
      },
      challenge: {
        title: "Join Practice",
        description: "Using the **ecommerce** dataset, join **orders** with **customers** to show customer **name** and their **order_total**. Use INNER JOIN.",
        dataset: "ecommerce",
        solution: "SELECT c.name, o.order_total FROM orders o INNER JOIN customers c ON o.customer_id = c.id;",
        hints: [
          "Join ON orders.customer_id = customers.id",
          "Use table aliases for cleaner code",
          "Select name from customers, order_total from orders"
        ],
        points: 25
      }
    },
    {
      day: 11,
      week: 2,
      title: "Subqueries",
      description: "Nest queries inside other queries",
      concepts: ["Subqueries", "IN", "EXISTS"],
      lesson: {
        content: `# Subqueries - Queries within Queries 🎭

A subquery is a query nested inside another query.

## Subquery in WHERE
\`\`\`sql
SELECT * FROM passengers
WHERE Fare > (SELECT AVG(Fare) FROM passengers);
\`\`\`

## Subquery with IN
\`\`\`sql
SELECT * FROM passengers
WHERE Pclass IN (SELECT Pclass FROM passengers WHERE Survived = 1);
\`\`\`

## Subquery in FROM (Derived Table)
\`\`\`sql
SELECT avg_by_class.Pclass, avg_by_class.avg_fare
FROM (
    SELECT Pclass, AVG(Fare) AS avg_fare
    FROM passengers
    GROUP BY Pclass
) AS avg_by_class
WHERE avg_by_class.avg_fare > 30;
\`\`\`

## Correlated Subquery
References the outer query:
\`\`\`sql
SELECT p1.Name, p1.Fare
FROM passengers p1
WHERE p1.Fare > (
    SELECT AVG(p2.Fare)
    FROM passengers p2
    WHERE p2.Pclass = p1.Pclass
);
\`\`\``,
        tips: [
          "Subqueries must be enclosed in parentheses",
          "Use aliases for derived tables",
          "Correlated subqueries run once per outer row"
        ]
      },
      challenge: {
        title: "Above Average Fares",
        description: "Find all passengers who paid **more than the average fare**. Show Name, Fare, and Pclass.",
        dataset: "titanic",
        solution: "SELECT Name, Fare, Pclass FROM passengers WHERE Fare > (SELECT AVG(Fare) FROM passengers);",
        hints: [
          "Use a subquery to calculate AVG(Fare)",
          "Compare each row's Fare to this average",
          "The subquery goes in the WHERE clause"
        ],
        points: 25
      }
    },
    {
      day: 12,
      week: 2,
      title: "CASE Statements",
      description: "Add conditional logic to your queries",
      concepts: ["CASE WHEN", "Conditional logic"],
      lesson: {
        content: `# CASE - Conditional Logic 🔀

CASE adds if-then-else logic to SQL queries.

## Simple CASE
\`\`\`sql
SELECT Name,
       CASE Pclass
           WHEN 1 THEN 'First Class'
           WHEN 2 THEN 'Second Class'
           WHEN 3 THEN 'Third Class'
       END AS class_name
FROM passengers;
\`\`\`

## Searched CASE (with conditions)
\`\`\`sql
SELECT Name, Age,
       CASE
           WHEN Age < 18 THEN 'Minor'
           WHEN Age < 65 THEN 'Adult'
           ELSE 'Senior'
       END AS age_group
FROM passengers;
\`\`\`

## CASE in Aggregations
\`\`\`sql
SELECT 
    SUM(CASE WHEN Survived = 1 THEN 1 ELSE 0 END) AS survivors,
    SUM(CASE WHEN Survived = 0 THEN 1 ELSE 0 END) AS casualties
FROM passengers;
\`\`\`

## CASE for Pivoting
\`\`\`sql
SELECT Pclass,
    SUM(CASE WHEN Sex = 'male' THEN 1 ELSE 0 END) AS males,
    SUM(CASE WHEN Sex = 'female' THEN 1 ELSE 0 END) AS females
FROM passengers
GROUP BY Pclass;
\`\`\``,
        tips: [
          "Always include END to close CASE",
          "ELSE is optional but recommended",
          "CASE can be used in SELECT, WHERE, ORDER BY"
        ]
      },
      challenge: {
        title: "Age Categories",
        description: "Create age categories: 'Child' (Age < 18), 'Adult' (18-59), 'Senior' (60+). Count passengers in each category.",
        dataset: "titanic",
        solution: "SELECT CASE WHEN Age < 18 THEN 'Child' WHEN Age < 60 THEN 'Adult' ELSE 'Senior' END AS age_group, COUNT(*) AS count FROM passengers WHERE Age IS NOT NULL GROUP BY age_group;",
        hints: [
          "Use CASE WHEN for conditions",
          "GROUP BY the CASE expression",
          "Filter out NULL ages with WHERE"
        ],
        points: 25
      }
    },
    {
      day: 13,
      week: 2,
      title: "Self-Joins",
      description: "Join a table to itself",
      concepts: ["Self-Join", "Table aliases"],
      lesson: {
        content: `# Self-Joins 🔄

A self-join joins a table to itself - useful for hierarchical or comparative data.

## Employee-Manager Example
\`\`\`sql
SELECT e.name AS employee,
       m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
\`\`\`

## Finding Pairs
Find passengers with the same fare:
\`\`\`sql
SELECT p1.Name AS passenger1,
       p2.Name AS passenger2,
       p1.Fare
FROM passengers p1
JOIN passengers p2 ON p1.Fare = p2.Fare
WHERE p1.PassengerId < p2.PassengerId;
\`\`\`

## Comparing Rows
Find passengers older than average of their class:
\`\`\`sql
SELECT p1.Name, p1.Age, p1.Pclass
FROM passengers p1
JOIN (
    SELECT Pclass, AVG(Age) as avg_age
    FROM passengers
    GROUP BY Pclass
) p2 ON p1.Pclass = p2.Pclass
WHERE p1.Age > p2.avg_age;
\`\`\``,
        tips: [
          "Always use different aliases for each 'copy' of the table",
          "Use inequality (< or >) to avoid duplicate pairs",
          "Self-joins are powerful for hierarchical data"
        ]
      },
      challenge: {
        title: "Fare Twins",
        description: "Find pairs of passengers with the **exact same Fare**. Show both names and the fare. Avoid duplicates (passenger1 ID < passenger2 ID).",
        dataset: "titanic",
        solution: "SELECT p1.Name AS passenger1, p2.Name AS passenger2, p1.Fare FROM passengers p1 JOIN passengers p2 ON p1.Fare = p2.Fare AND p1.PassengerId < p2.PassengerId WHERE p1.Fare > 0;",
        hints: [
          "Join passengers to itself",
          "Match on Fare equality",
          "Use PassengerId < to avoid duplicates"
        ],
        points: 25
      }
    },
    {
      day: 14,
      week: 2,
      title: "UNION & UNION ALL",
      description: "Combine results from multiple queries",
      concepts: ["UNION", "UNION ALL", "Set operations"],
      lesson: {
        content: `# UNION - Combining Results 📋

UNION combines the results of two or more SELECT statements.

## UNION (removes duplicates)
\`\`\`sql
SELECT Name FROM passengers WHERE Pclass = 1
UNION
SELECT Name FROM passengers WHERE Survived = 1;
\`\`\`

## UNION ALL (keeps duplicates)
\`\`\`sql
SELECT Name FROM passengers WHERE Pclass = 1
UNION ALL
SELECT Name FROM passengers WHERE Survived = 1;
\`\`\`

## Rules for UNION
1. Same number of columns in each SELECT
2. Compatible data types
3. Column names come from first SELECT

## Practical Example
\`\`\`sql
SELECT 'Survivor' AS status, Name, Age
FROM passengers WHERE Survived = 1
UNION ALL
SELECT 'Casualty' AS status, Name, Age
FROM passengers WHERE Survived = 0;
\`\`\`

## Other Set Operations
- INTERSECT: Only rows in both results
- EXCEPT: Rows in first but not second`,
        tips: [
          "UNION is slower than UNION ALL (checks for duplicates)",
          "Use UNION ALL when you know there are no duplicates",
          "ORDER BY applies to the final combined result"
        ]
      },
      challenge: {
        title: "Combined Lists",
        description: "Create a list showing all passengers from **first class** OR who **paid more than $100**. Use UNION to combine and remove duplicates. Show Name and Fare.",
        dataset: "titanic",
        solution: "SELECT Name, Fare FROM passengers WHERE Pclass = 1 UNION SELECT Name, Fare FROM passengers WHERE Fare > 100;",
        hints: [
          "First SELECT: WHERE Pclass = 1",
          "Second SELECT: WHERE Fare > 100",
          "UNION removes duplicates automatically"
        ],
        points: 20
      }
    },
    
    // ============ WEEK 3: ADVANCED SQL ============
    {
      day: 15,
      week: 3,
      title: "Understanding Indexes",
      description: "Learn how indexes speed up queries",
      concepts: ["Indexes", "Performance", "CREATE INDEX"],
      lesson: {
        content: `# Indexes - Speed Up Your Queries ⚡

## What is an Index?
An index is like a book's index - it helps find data without scanning every row.

## Creating an Index
\`\`\`sql
CREATE INDEX idx_passengers_age ON passengers(Age);
\`\`\`

## Composite Index (multiple columns)
\`\`\`sql
CREATE INDEX idx_class_survived ON passengers(Pclass, Survived);
\`\`\`

## When Indexes Help
- WHERE clause filters
- JOIN conditions
- ORDER BY columns
- GROUP BY columns

## When Indexes Don't Help
- Small tables
- Columns with few unique values
- Queries returning most rows

## Trade-offs
✅ Faster reads
❌ Slower writes (INSERT, UPDATE, DELETE)
❌ Uses storage space`,
        tips: [
          "Index columns you frequently filter or sort by",
          "Don't over-index - each index has overhead",
          "Composite indexes work left-to-right"
        ]
      },
      challenge: {
        title: "Index Analysis",
        description: "Which columns would benefit most from an index in a query that filters by **Pclass** and sorts by **Fare**? Write a query using these columns.",
        dataset: "titanic",
        solution: "SELECT Name, Pclass, Fare FROM passengers WHERE Pclass = 1 ORDER BY Fare DESC;",
        hints: [
          "Pclass in WHERE would benefit from index",
          "Fare in ORDER BY would also benefit",
          "A composite index (Pclass, Fare) would be ideal"
        ],
        points: 20
      }
    },
    {
      day: 16,
      week: 3,
      title: "Working with Views",
      description: "Create virtual tables for reusable queries",
      concepts: ["CREATE VIEW", "Virtual tables", "Abstraction"],
      lesson: {
        content: `# Views - Reusable Query Shortcuts 👁️

A view is a saved query that acts like a virtual table.

## Creating a View
\`\`\`sql
CREATE VIEW survivors AS
SELECT * FROM passengers WHERE Survived = 1;
\`\`\`

## Using a View
\`\`\`sql
SELECT * FROM survivors WHERE Pclass = 1;
\`\`\`

## Complex View Example
\`\`\`sql
CREATE VIEW passenger_summary AS
SELECT 
    Pclass,
    Sex,
    COUNT(*) AS total,
    SUM(Survived) AS survived,
    ROUND(AVG(Survived) * 100, 1) AS survival_rate
FROM passengers
GROUP BY Pclass, Sex;
\`\`\`

## Benefits of Views
- Simplify complex queries
- Provide data abstraction
- Security (hide sensitive columns)
- Consistent calculations

## Dropping a View
\`\`\`sql
DROP VIEW IF EXISTS survivors;
\`\`\``,
        tips: [
          "Views don't store data - they run the query each time",
          "Views can join multiple tables",
          "Use views to simplify reporting queries"
        ]
      },
      challenge: {
        title: "Create a Summary View",
        description: "Create a query that could be a view: Show **survival stats by class and gender** (Pclass, Sex, total, survived, survival_rate).",
        dataset: "titanic",
        solution: "SELECT Pclass, Sex, COUNT(*) AS total, SUM(Survived) AS survived, ROUND(AVG(Survived) * 100, 1) AS survival_rate FROM passengers GROUP BY Pclass, Sex ORDER BY Pclass, Sex;",
        hints: [
          "GROUP BY Pclass, Sex",
          "COUNT(*) for total",
          "AVG(Survived) * 100 for percentage"
        ],
        points: 25
      }
    },
    {
      day: 17,
      week: 3,
      title: "Transaction Management",
      description: "Ensure data integrity with transactions",
      concepts: ["BEGIN", "COMMIT", "ROLLBACK", "ACID"],
      lesson: {
        content: `# Transactions - All or Nothing 🔐

Transactions group multiple operations into a single unit that either completely succeeds or completely fails.

## Basic Transaction
\`\`\`sql
BEGIN TRANSACTION;
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;
    UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
\`\`\`

## Rollback on Error
\`\`\`sql
BEGIN TRANSACTION;
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;
    -- If something goes wrong:
ROLLBACK;
\`\`\`

## ACID Properties
- **A**tomicity: All or nothing
- **C**onsistency: Data stays valid
- **I**solation: Transactions don't interfere
- **D**urability: Committed changes persist

## Savepoints
\`\`\`sql
BEGIN TRANSACTION;
    UPDATE table1 SET col1 = 'value1';
    SAVEPOINT sp1;
    UPDATE table2 SET col2 = 'value2';
    -- Oops, rollback just the second update
    ROLLBACK TO sp1;
COMMIT;
\`\`\``,
        tips: [
          "Always COMMIT or ROLLBACK to end a transaction",
          "Use transactions for multi-step operations",
          "Transactions prevent partial updates"
        ]
      },
      challenge: {
        title: "Transaction Concepts",
        description: "Write a query that shows the total fare collected by class, simulating a 'report' that might be part of a transaction.",
        dataset: "titanic",
        solution: "SELECT Pclass, SUM(Fare) AS total_fare, COUNT(*) AS passengers FROM passengers GROUP BY Pclass ORDER BY Pclass;",
        hints: [
          "GROUP BY Pclass",
          "SUM(Fare) for total fare",
          "This type of aggregation might be in a reporting transaction"
        ],
        points: 20
      }
    },
    {
      day: 18,
      week: 3,
      title: "Stored Procedures",
      description: "Create reusable SQL programs",
      concepts: ["Procedures", "Parameters", "Reusability"],
      lesson: {
        content: `# Stored Procedures 📦

Stored procedures are saved SQL code that can be executed repeatedly.

## Creating a Procedure (varies by database)
\`\`\`sql
-- MySQL/PostgreSQL style
CREATE PROCEDURE GetSurvivorsByClass(IN class_num INT)
BEGIN
    SELECT * FROM passengers 
    WHERE Pclass = class_num AND Survived = 1;
END;
\`\`\`

## Benefits
- Reusable code
- Reduced network traffic
- Better security
- Encapsulation of business logic

## SQLite Alternative
SQLite doesn't support stored procedures, but you can:
1. Use Views for reusable queries
2. Use application code for complex logic
3. Use triggers for automated actions

## Simulating with Views
\`\`\`sql
-- Create parameterized-like views
CREATE VIEW first_class_survivors AS
SELECT * FROM passengers WHERE Pclass = 1 AND Survived = 1;

CREATE VIEW second_class_survivors AS
SELECT * FROM passengers WHERE Pclass = 2 AND Survived = 1;
\`\`\``,
        tips: [
          "Stored procedures reduce code duplication",
          "They can accept input parameters",
          "Great for complex, repeated operations"
        ]
      },
      challenge: {
        title: "Reusable Query Design",
        description: "Design a query that could be a stored procedure: Find survivors from a specific class with their details. Use Pclass = 1 as example.",
        dataset: "titanic",
        solution: "SELECT PassengerId, Name, Sex, Age, Fare FROM passengers WHERE Pclass = 1 AND Survived = 1 ORDER BY Fare DESC;",
        hints: [
          "Filter by Pclass and Survived",
          "Select relevant columns",
          "This pattern could accept Pclass as parameter"
        ],
        points: 20
      }
    },
    {
      day: 19,
      week: 3,
      title: "Triggers",
      description: "Automate actions on data changes",
      concepts: ["CREATE TRIGGER", "BEFORE/AFTER", "Automation"],
      lesson: {
        content: `# Triggers - Automatic Actions 🎯

Triggers automatically execute code when data changes.

## Trigger Types
- BEFORE INSERT/UPDATE/DELETE
- AFTER INSERT/UPDATE/DELETE

## Example Trigger
\`\`\`sql
CREATE TRIGGER log_fare_changes
AFTER UPDATE ON passengers
WHEN OLD.Fare != NEW.Fare
BEGIN
    INSERT INTO fare_log (passenger_id, old_fare, new_fare, changed_at)
    VALUES (NEW.PassengerId, OLD.Fare, NEW.Fare, datetime('now'));
END;
\`\`\`

## Use Cases
- Audit logging
- Automatic calculations
- Data validation
- Cascading updates

## Special Values
- NEW: The new row data
- OLD: The previous row data

## Caution
- Triggers add hidden complexity
- Can impact performance
- Difficult to debug`,
        tips: [
          "Use triggers sparingly",
          "Document all triggers thoroughly",
          "Test trigger behavior carefully"
        ]
      },
      challenge: {
        title: "Audit Query Design",
        description: "Write a query that shows what an audit log might track: Compare fare statistics before and after a hypothetical 10% increase.",
        dataset: "titanic",
        solution: "SELECT Pclass, AVG(Fare) AS current_avg_fare, AVG(Fare) * 1.1 AS projected_avg_fare, SUM(Fare) AS current_total, SUM(Fare) * 1.1 AS projected_total FROM passengers GROUP BY Pclass;",
        hints: [
          "Show current and projected values",
          "Multiply by 1.1 for 10% increase",
          "GROUP BY class for comparison"
        ],
        points: 25
      }
    },
    {
      day: 20,
      week: 3,
      title: "Database Normalization",
      description: "Design efficient database structures",
      concepts: ["1NF", "2NF", "3NF", "Normalization"],
      lesson: {
        content: `# Database Normalization 📐

Normalization organizes data to reduce redundancy and improve integrity.

## First Normal Form (1NF)
- Each cell contains a single value
- Each row is unique
- No repeating groups

❌ Bad: "John, Jane" in one cell
✅ Good: Separate rows for John and Jane

## Second Normal Form (2NF)
- Must be in 1NF
- All non-key columns depend on the entire primary key

❌ Bad: Order table with customer_name
✅ Good: Separate customers table, link by customer_id

## Third Normal Form (3NF)
- Must be in 2NF
- No transitive dependencies

❌ Bad: employee table with dept_name
✅ Good: departments table linked by dept_id

## Trade-offs
- Normalized: Less redundancy, more joins
- Denormalized: Fewer joins, some redundancy`,
        tips: [
          "Normalize for transaction systems (OLTP)",
          "Denormalize for analytics (OLAP)",
          "Balance between joins and redundancy"
        ]
      },
      challenge: {
        title: "Data Structure Analysis",
        description: "The Titanic data has denormalized cabin info. Count how many passengers share cabins (same Cabin value, excluding empty).",
        dataset: "titanic",
        solution: "SELECT Cabin, COUNT(*) AS passengers FROM passengers WHERE Cabin IS NOT NULL AND Cabin != '' GROUP BY Cabin HAVING COUNT(*) > 1 ORDER BY passengers DESC;",
        hints: [
          "GROUP BY Cabin",
          "Filter out NULL/empty cabins",
          "HAVING COUNT(*) > 1 for shared cabins"
        ],
        points: 25
      }
    },
    {
      day: 21,
      week: 3,
      title: "ACID Properties",
      description: "Understand database reliability guarantees",
      concepts: ["Atomicity", "Consistency", "Isolation", "Durability"],
      lesson: {
        content: `# ACID Properties 🛡️

ACID ensures reliable database transactions.

## Atomicity
All operations complete, or none do.
\`\`\`sql
-- Transfer $100: both must succeed or both fail
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
\`\`\`

## Consistency
Database moves from one valid state to another.
- Constraints are enforced
- Data integrity maintained

## Isolation
Concurrent transactions don't interfere.

Isolation Levels:
1. READ UNCOMMITTED (lowest)
2. READ COMMITTED
3. REPEATABLE READ
4. SERIALIZABLE (highest)

## Durability
Committed transactions survive system failures.
- Write-ahead logging
- Data persistence

## Why ACID Matters
- Financial transactions
- Inventory management
- User account operations`,
        tips: [
          "Higher isolation = less concurrency",
          "Choose isolation level based on needs",
          "ACID is critical for data integrity"
        ]
      },
      challenge: {
        title: "Consistency Check",
        description: "Write a query to verify data consistency: Check that all Survived values are either 0 or 1 (no other values).",
        dataset: "titanic",
        solution: "SELECT Survived, COUNT(*) AS count FROM passengers GROUP BY Survived ORDER BY Survived;",
        hints: [
          "GROUP BY Survived to see all values",
          "Should only show 0 and 1",
          "This validates data consistency"
        ],
        points: 20
      }
    },
    
    // ============ WEEK 4: DATA ANALYSIS ============
    {
      day: 22,
      week: 4,
      title: "Date Functions",
      description: "Work with dates and times in SQL",
      concepts: ["DATE", "DATETIME", "Date arithmetic"],
      lesson: {
        content: `# Date Functions 📅

## Current Date/Time
\`\`\`sql
SELECT date('now');           -- 2024-01-15
SELECT datetime('now');       -- 2024-01-15 14:30:00
SELECT time('now');           -- 14:30:00
\`\`\`

## Date Arithmetic
\`\`\`sql
SELECT date('now', '+7 days');      -- 7 days from now
SELECT date('now', '-1 month');     -- 1 month ago
SELECT date('now', 'start of year'); -- Jan 1 of current year
\`\`\`

## Extracting Parts
\`\`\`sql
SELECT strftime('%Y', date_column) AS year,
       strftime('%m', date_column) AS month,
       strftime('%d', date_column) AS day
FROM table_name;
\`\`\`

## Date Formatting
\`\`\`sql
SELECT strftime('%Y-%m-%d', datetime_column) AS formatted_date;
SELECT strftime('%H:%M', datetime_column) AS time_only;
\`\`\`

## Date Comparisons
\`\`\`sql
SELECT * FROM orders 
WHERE order_date >= date('now', '-30 days');
\`\`\``,
        tips: [
          "SQLite stores dates as TEXT in ISO format",
          "Use strftime for formatting",
          "Always use consistent date formats"
        ]
      },
      challenge: {
        title: "Date Analysis",
        description: "Using **ecommerce** dataset, find orders from the last 30 days (use date comparison with order_date).",
        dataset: "ecommerce",
        solution: "SELECT * FROM orders WHERE order_date >= date('now', '-30 days') ORDER BY order_date DESC;",
        hints: [
          "Use date('now', '-30 days')",
          "Compare with order_date",
          "ORDER BY date descending for recent first"
        ],
        points: 25
      }
    },
    {
      day: 23,
      week: 4,
      title: "String Functions",
      description: "Manipulate text data effectively",
      concepts: ["UPPER", "LOWER", "SUBSTR", "TRIM", "REPLACE"],
      lesson: {
        content: `# String Functions 📝

## Case Conversion
\`\`\`sql
SELECT UPPER(Name) AS upper_name,
       LOWER(Name) AS lower_name
FROM passengers;
\`\`\`

## Substring
\`\`\`sql
SELECT SUBSTR(Name, 1, 10) AS first_10_chars
FROM passengers;
\`\`\`

## Length
\`\`\`sql
SELECT Name, LENGTH(Name) AS name_length
FROM passengers;
\`\`\`

## Trim Whitespace
\`\`\`sql
SELECT TRIM('  hello  ');     -- 'hello'
SELECT LTRIM('  hello');      -- 'hello'
SELECT RTRIM('hello  ');      -- 'hello'
\`\`\`

## Replace
\`\`\`sql
SELECT REPLACE(Name, 'Mr.', 'Mister')
FROM passengers;
\`\`\`

## Concatenation
\`\`\`sql
SELECT Name || ' - Class ' || Pclass AS passenger_info
FROM passengers;
\`\`\`

## Pattern Matching (LIKE)
\`\`\`sql
SELECT * FROM passengers WHERE Name LIKE '%Smith%';
SELECT * FROM passengers WHERE Name LIKE 'A%';
\`\`\``,
        tips: [
          "LIKE: % matches any characters, _ matches one character",
          "String functions are case-sensitive",
          "Use || for concatenation in SQLite"
        ]
      },
      challenge: {
        title: "Extract Titles",
        description: "Extract passenger titles (Mr., Mrs., Miss., Master) from names. Count how many of each title exist.",
        dataset: "titanic",
        solution: "SELECT CASE WHEN Name LIKE '%Mr.%' THEN 'Mr.' WHEN Name LIKE '%Mrs.%' THEN 'Mrs.' WHEN Name LIKE '%Miss.%' THEN 'Miss.' WHEN Name LIKE '%Master.%' THEN 'Master' ELSE 'Other' END AS title, COUNT(*) AS count FROM passengers GROUP BY title ORDER BY count DESC;",
        hints: [
          "Use LIKE for pattern matching",
          "CASE WHEN to categorize",
          "GROUP BY the extracted title"
        ],
        points: 30
      }
    },
    {
      day: 24,
      week: 4,
      title: "Math Functions",
      description: "Perform calculations in SQL",
      concepts: ["ROUND", "ABS", "CEIL", "FLOOR", "MOD"],
      lesson: {
        content: `# Math Functions 🔢

## Rounding
\`\`\`sql
SELECT ROUND(3.14159, 2);     -- 3.14
SELECT ROUND(Fare, 0) FROM passengers;
\`\`\`

## Absolute Value
\`\`\`sql
SELECT ABS(-42);              -- 42
\`\`\`

## Min/Max per Row
\`\`\`sql
SELECT MAX(Age, Fare) AS greater_value
FROM passengers;
\`\`\`

## Modulo (Remainder)
\`\`\`sql
SELECT PassengerId, PassengerId % 10 AS last_digit
FROM passengers;
\`\`\`

## Practical Calculations
\`\`\`sql
SELECT 
    Fare,
    ROUND(Fare * 1.1, 2) AS fare_plus_10_percent,
    ROUND(Fare / 100, 2) AS fare_in_hundreds
FROM passengers;
\`\`\`

## Statistical Calculations
\`\`\`sql
SELECT 
    AVG(Fare) AS mean_fare,
    MIN(Fare) AS min_fare,
    MAX(Fare) AS max_fare,
    MAX(Fare) - MIN(Fare) AS fare_range
FROM passengers;
\`\`\``,
        tips: [
          "ROUND(value, decimals) rounds to specified places",
          "Division by integers truncates - use 1.0 for decimals",
          "Combine math with aggregates for statistics"
        ]
      },
      challenge: {
        title: "Fare Statistics",
        description: "Calculate fare statistics by class: average, min, max, and range (max - min). Round to 2 decimal places.",
        dataset: "titanic",
        solution: "SELECT Pclass, ROUND(AVG(Fare), 2) AS avg_fare, ROUND(MIN(Fare), 2) AS min_fare, ROUND(MAX(Fare), 2) AS max_fare, ROUND(MAX(Fare) - MIN(Fare), 2) AS fare_range FROM passengers GROUP BY Pclass ORDER BY Pclass;",
        hints: [
          "GROUP BY Pclass",
          "Use ROUND(..., 2) for all values",
          "Range = MAX - MIN"
        ],
        points: 25
      }
    },
    {
      day: 25,
      week: 4,
      title: "Window Functions",
      description: "Perform calculations across row sets",
      concepts: ["OVER", "PARTITION BY", "ROW_NUMBER", "RANK"],
      lesson: {
        content: `# Window Functions 🪟

Window functions perform calculations across a set of rows related to the current row.

## ROW_NUMBER
\`\`\`sql
SELECT Name, Fare,
       ROW_NUMBER() OVER (ORDER BY Fare DESC) AS fare_rank
FROM passengers;
\`\`\`

## PARTITION BY
Separate windows for each group:
\`\`\`sql
SELECT Name, Pclass, Fare,
       ROW_NUMBER() OVER (PARTITION BY Pclass ORDER BY Fare DESC) AS rank_in_class
FROM passengers;
\`\`\`

## RANK and DENSE_RANK
\`\`\`sql
SELECT Name, Fare,
       RANK() OVER (ORDER BY Fare DESC) AS rank,
       DENSE_RANK() OVER (ORDER BY Fare DESC) AS dense_rank
FROM passengers;
\`\`\`

## Running Totals
\`\`\`sql
SELECT Name, Fare,
       SUM(Fare) OVER (ORDER BY PassengerId) AS running_total
FROM passengers;
\`\`\`

## Moving Averages
\`\`\`sql
SELECT Name, Fare,
       AVG(Fare) OVER (ORDER BY PassengerId 
                       ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg
FROM passengers;
\`\`\``,
        tips: [
          "Window functions don't collapse rows like GROUP BY",
          "PARTITION BY creates separate 'windows'",
          "ORDER BY within OVER determines row ordering"
        ]
      },
      challenge: {
        title: "Rank Within Class",
        description: "Rank passengers by fare within each class. Show Name, Pclass, Fare, and rank_in_class.",
        dataset: "titanic",
        solution: "SELECT Name, Pclass, Fare, RANK() OVER (PARTITION BY Pclass ORDER BY Fare DESC) AS rank_in_class FROM passengers WHERE Fare > 0;",
        hints: [
          "Use RANK() or ROW_NUMBER()",
          "PARTITION BY Pclass",
          "ORDER BY Fare DESC for highest first"
        ],
        points: 30
      }
    },
    {
      day: 26,
      week: 4,
      title: "Common Table Expressions (CTEs)",
      description: "Write cleaner, more readable queries",
      concepts: ["WITH clause", "CTEs", "Recursive CTEs"],
      lesson: {
        content: `# CTEs - Common Table Expressions 📋

CTEs create temporary named result sets for cleaner queries.

## Basic CTE
\`\`\`sql
WITH survivors AS (
    SELECT * FROM passengers WHERE Survived = 1
)
SELECT Pclass, COUNT(*) AS survivor_count
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
    SELECT Pclass, AVG(Age) AS avg_age
    FROM survivors
    GROUP BY Pclass
)
SELECT * FROM class_stats;
\`\`\`

## CTE vs Subquery
\`\`\`sql
-- CTE (more readable)
WITH high_fare AS (
    SELECT * FROM passengers WHERE Fare > 100
)
SELECT * FROM high_fare WHERE Age > 50;

-- Equivalent subquery (harder to read)
SELECT * FROM (
    SELECT * FROM passengers WHERE Fare > 100
) WHERE Age > 50;
\`\`\`

## Benefits
- Improved readability
- Reusable within the query
- Self-referencing (recursive)`,
        tips: [
          "CTEs make complex queries more readable",
          "Each CTE can reference previous ones",
          "Great for breaking down complex logic"
        ]
      },
      challenge: {
        title: "CTE Analysis",
        description: "Use a CTE to find: First, passengers who paid above-average fare, then calculate survival rate for this group.",
        dataset: "titanic",
        solution: "WITH high_fare_passengers AS (SELECT * FROM passengers WHERE Fare > (SELECT AVG(Fare) FROM passengers)) SELECT COUNT(*) AS total, SUM(Survived) AS survived, ROUND(AVG(Survived) * 100, 1) AS survival_rate FROM high_fare_passengers;",
        hints: [
          "First CTE: passengers with Fare > AVG(Fare)",
          "Main query: aggregate stats from the CTE",
          "Calculate survival rate as AVG(Survived) * 100"
        ],
        points: 30
      }
    },
    {
      day: 27,
      week: 4,
      title: "Analytic Functions",
      description: "Advanced analytics with SQL",
      concepts: ["LAG", "LEAD", "FIRST_VALUE", "LAST_VALUE"],
      lesson: {
        content: `# Analytic Functions 📊

Access data from other rows without self-joins.

## LAG - Previous Row
\`\`\`sql
SELECT Name, Fare,
       LAG(Fare) OVER (ORDER BY PassengerId) AS prev_fare,
       Fare - LAG(Fare) OVER (ORDER BY PassengerId) AS fare_diff
FROM passengers;
\`\`\`

## LEAD - Next Row
\`\`\`sql
SELECT Name, Fare,
       LEAD(Fare) OVER (ORDER BY PassengerId) AS next_fare
FROM passengers;
\`\`\`

## FIRST_VALUE / LAST_VALUE
\`\`\`sql
SELECT Name, Pclass, Fare,
       FIRST_VALUE(Name) OVER (PARTITION BY Pclass ORDER BY Fare DESC) AS highest_fare_passenger
FROM passengers;
\`\`\`

## NTH_VALUE
\`\`\`sql
SELECT Name, Fare,
       NTH_VALUE(Name, 3) OVER (ORDER BY Fare DESC) AS third_highest
FROM passengers;
\`\`\`

## Practical Use Cases
- Compare to previous period
- Calculate differences
- Find first/last in group`,
        tips: [
          "LAG/LEAD accept optional offset and default parameters",
          "FIRST_VALUE is useful for 'best in class' queries",
          "Combine with PARTITION BY for group-level analysis"
        ]
      },
      challenge: {
        title: "Fare Comparison",
        description: "For each passenger, show their fare and the fare of the next more expensive ticket (using LEAD).",
        dataset: "titanic",
        solution: "SELECT Name, Fare, LEAD(Fare) OVER (ORDER BY Fare) AS next_higher_fare, LEAD(Fare) OVER (ORDER BY Fare) - Fare AS fare_gap FROM passengers WHERE Fare > 0 ORDER BY Fare;",
        hints: [
          "Use LEAD with ORDER BY Fare",
          "Calculate the gap as next - current",
          "Filter out zero fares"
        ],
        points: 30
      }
    },
    {
      day: 28,
      week: 4,
      title: "Pivot & Unpivot",
      description: "Transform data between rows and columns",
      concepts: ["PIVOT", "UNPIVOT", "Cross-tabulation"],
      lesson: {
        content: `# Pivot & Unpivot 🔄

Transform between row and column layouts.

## Manual Pivot with CASE
\`\`\`sql
SELECT 
    Pclass,
    SUM(CASE WHEN Survived = 1 THEN 1 ELSE 0 END) AS survived,
    SUM(CASE WHEN Survived = 0 THEN 1 ELSE 0 END) AS died
FROM passengers
GROUP BY Pclass;
\`\`\`

## Gender by Class Pivot
\`\`\`sql
SELECT 
    Pclass,
    SUM(CASE WHEN Sex = 'male' THEN 1 ELSE 0 END) AS male,
    SUM(CASE WHEN Sex = 'female' THEN 1 ELSE 0 END) AS female
FROM passengers
GROUP BY Pclass;
\`\`\`

## Cross-Tabulation
\`\`\`sql
SELECT 
    CASE WHEN Age < 18 THEN 'Child' ELSE 'Adult' END AS age_group,
    SUM(CASE WHEN Survived = 1 THEN 1 ELSE 0 END) AS survived,
    SUM(CASE WHEN Survived = 0 THEN 1 ELSE 0 END) AS died
FROM passengers
WHERE Age IS NOT NULL
GROUP BY age_group;
\`\`\`

## Why Pivot?
- Create reports
- Compare categories side-by-side
- Prepare data for visualization`,
        tips: [
          "SQLite doesn't have native PIVOT - use CASE",
          "Pivoting is great for creating dashboards",
          "Unpivot normalizes wide tables"
        ]
      },
      challenge: {
        title: "Survival Cross-Tab",
        description: "Create a pivot table showing survival counts by **Pclass (rows)** and **Sex (columns)**.",
        dataset: "titanic",
        solution: "SELECT Pclass, SUM(CASE WHEN Sex = 'male' AND Survived = 1 THEN 1 ELSE 0 END) AS male_survived, SUM(CASE WHEN Sex = 'male' AND Survived = 0 THEN 1 ELSE 0 END) AS male_died, SUM(CASE WHEN Sex = 'female' AND Survived = 1 THEN 1 ELSE 0 END) AS female_survived, SUM(CASE WHEN Sex = 'female' AND Survived = 0 THEN 1 ELSE 0 END) AS female_died FROM passengers GROUP BY Pclass ORDER BY Pclass;",
        hints: [
          "Use CASE WHEN with AND for combinations",
          "Four columns: male_survived, male_died, female_survived, female_died",
          "GROUP BY Pclass"
        ],
        points: 35
      }
    },
    
    // ============ WEEK 5: MASTERY ============
    {
      day: 29,
      week: 5,
      title: "Index Optimization",
      description: "Optimize queries with proper indexing",
      concepts: ["Index strategies", "Query optimization", "EXPLAIN"],
      lesson: {
        content: `# Index Optimization ⚡

## Query Execution Plans
See how a query runs:
\`\`\`sql
EXPLAIN QUERY PLAN
SELECT * FROM passengers WHERE Age > 30;
\`\`\`

## Index Strategies

### Single-Column Index
\`\`\`sql
CREATE INDEX idx_age ON passengers(Age);
-- Good for: WHERE Age > 30
\`\`\`

### Composite Index
\`\`\`sql
CREATE INDEX idx_class_age ON passengers(Pclass, Age);
-- Good for: WHERE Pclass = 1 AND Age > 30
-- Also works for: WHERE Pclass = 1
-- Doesn't help: WHERE Age > 30 (not leftmost)
\`\`\`

### Covering Index
Include all columns needed:
\`\`\`sql
CREATE INDEX idx_covering ON passengers(Pclass, Age, Name);
-- Query can use index without touching table
\`\`\`

## What Prevents Index Use
- Functions on indexed column: WHERE UPPER(Name) = 'JOHN'
- OR with different columns
- NOT IN, NOT EXISTS (sometimes)
- Leading wildcard: LIKE '%Smith'`,
        tips: [
          "EXPLAIN QUERY PLAN shows if indexes are used",
          "Leftmost column in composite index is most important",
          "Too many indexes slow down writes"
        ]
      },
      challenge: {
        title: "Query Analysis",
        description: "Write an optimized query that would benefit from a composite index on (Pclass, Survived): Find survival rate by class.",
        dataset: "titanic",
        solution: "SELECT Pclass, COUNT(*) AS total, SUM(Survived) AS survived, ROUND(AVG(Survived) * 100, 2) AS survival_rate FROM passengers GROUP BY Pclass ORDER BY Pclass;",
        hints: [
          "GROUP BY Pclass uses the index",
          "Survived in aggregate can use index",
          "This query pattern is index-friendly"
        ],
        points: 30
      }
    },
    {
      day: 30,
      week: 5,
      title: "Query Performance Tuning",
      description: "Master techniques for fast, efficient queries",
      concepts: ["Performance tuning", "Best practices", "Query optimization"],
      lesson: {
        content: `# Query Performance Tuning 🏆

## Key Optimization Techniques

### 1. Select Only What You Need
\`\`\`sql
-- Bad
SELECT * FROM passengers WHERE Pclass = 1;

-- Good
SELECT Name, Age, Fare FROM passengers WHERE Pclass = 1;
\`\`\`

### 2. Use WHERE to Filter Early
\`\`\`sql
-- Bad
SELECT * FROM passengers HAVING Age > 30;

-- Good
SELECT * FROM passengers WHERE Age > 30;
\`\`\`

### 3. Avoid Functions on Indexed Columns
\`\`\`sql
-- Bad (can't use index)
SELECT * FROM passengers WHERE UPPER(Name) LIKE 'SMITH%';

-- Good (uses index)
SELECT * FROM passengers WHERE Name LIKE 'Smith%';
\`\`\`

### 4. Use EXISTS Instead of IN (for large sets)
\`\`\`sql
-- Often slower
SELECT * FROM passengers WHERE Pclass IN (SELECT Pclass FROM ...);

-- Often faster
SELECT * FROM passengers p WHERE EXISTS (SELECT 1 FROM ... WHERE Pclass = p.Pclass);
\`\`\`

### 5. Optimize JOINs
- Join on indexed columns
- Start with smaller table
- Filter before joining when possible

## Performance Checklist
✅ SELECT only needed columns
✅ Use appropriate indexes
✅ Filter early with WHERE
✅ Avoid SELECT DISTINCT if possible
✅ Use LIMIT for large results`,
        tips: [
          "Measure before optimizing",
          "The best optimization is not running unnecessary queries",
          "Database design impacts performance more than query tuning"
        ]
      },
      challenge: {
        title: "Final Challenge: Complete Analysis",
        description: "Write an optimized, comprehensive analysis: Show passenger class, gender, count, survivors, survival rate, avg fare, and avg age - all in one efficient query!",
        dataset: "titanic",
        solution: "SELECT Pclass, Sex, COUNT(*) AS total, SUM(Survived) AS survivors, ROUND(AVG(Survived) * 100, 1) AS survival_rate, ROUND(AVG(Fare), 2) AS avg_fare, ROUND(AVG(Age), 1) AS avg_age FROM passengers WHERE Age IS NOT NULL GROUP BY Pclass, Sex ORDER BY Pclass, Sex;",
        hints: [
          "GROUP BY Pclass, Sex",
          "Multiple aggregates in one query",
          "Filter NULL ages for accurate averages"
        ],
        points: 50
      }
    }
  ],
  
  // Rewards for completing milestones
  rewards: {
    daily: 25, // Base XP per day
    weekComplete: 100, // Bonus for completing a week
    perfectDay: 10, // Bonus for no hints used
    challengeComplete: 500, // Completing all 30 days
    speedBonus: 50 // Completing ahead of schedule
  }
};
