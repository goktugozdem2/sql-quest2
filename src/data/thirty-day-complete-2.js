// ============================================================
// SQL QUEST: 30-DAY SQL MASTERY CHALLENGE - PART 2
// Days 16-30 (75 Questions)
// Complete with Table Schemas, Columns, and Expected Results
// ============================================================

(function() {
  // Ensure Part 1 exists
  if (!window.sqlChallenge30Days) {
    window.sqlChallenge30Days = { days: [], tables: {}, scoring: {} };
  }

  const additionalDays = [

    // ============================================================
    // DAY 16: INNER JOIN
    // ============================================================
    {
      day: 16, week: 3, title: "INNER JOIN", description: "Combine data from multiple tables",
      concepts: ["INNER JOIN", "ON", "Table aliases"],
      dataset: "ecommerce",
      tablesUsed: ["customers", "orders"],
      tableSchemas: {
        customers: [
          { column: "customer_id", type: "INTEGER", description: "Customer ID" },
          { column: "name", type: "TEXT", description: "Customer name" },
          { column: "email", type: "TEXT", description: "Email" },
          { column: "membership", type: "TEXT", description: "Membership tier" }
        ],
        orders: [
          { column: "order_id", type: "INTEGER", description: "Order ID" },
          { column: "customer_id", type: "INTEGER", description: "FK to customers" },
          { column: "product", type: "TEXT", description: "Product name" },
          { column: "total", type: "REAL", description: "Order total" },
          { column: "order_date", type: "TEXT", description: "Order date" }
        ]
      },
      lesson: `# INNER JOIN\n\n\`\`\`sql\nSELECT c.name, o.total\nFROM customers c\nINNER JOIN orders o ON c.customer_id = o.customer_id;\n\`\`\``,
      questions: [
        { id: "d16q1", difficulty: "easy", points: 5, title: "Basic Join", description: "Join customers and orders. Show customer name and order total.", dataset: "ecommerce", solution: "SELECT customers.name, orders.total FROM customers INNER JOIN orders ON customers.customer_id = orders.customer_id;", alternativeSolutions: ["SELECT c.name, o.total FROM customers c INNER JOIN orders o ON c.customer_id = o.customer_id;"], expectedResult: { columns: ["name", "total"], rowCount: 40, preview: [["John Smith", 1299.99], ["Emma Wilson", 99.98], ["Michael Brown", 349.99]], note: "40 orders with customer names" }, explanation: "INNER JOIN connects tables where customer_id matches in both." },
        { id: "d16q2", difficulty: "easy-medium", points: 10, title: "Join with Aliases", description: "Same query using c and o as table aliases.", dataset: "ecommerce", solution: "SELECT c.name, o.total FROM customers c INNER JOIN orders o ON c.customer_id = o.customer_id;", alternativeSolutions: [], expectedResult: { columns: ["name", "total"], rowCount: 40, preview: [["John Smith", 1299.99]], note: "Shorter with aliases" }, explanation: "Aliases make queries shorter and more readable." },
        { id: "d16q3", difficulty: "medium", points: 15, title: "Multiple Columns", description: "Show customer name, membership, product, and order_date.", dataset: "ecommerce", solution: "SELECT c.name, c.membership, o.product, o.order_date FROM customers c INNER JOIN orders o ON c.customer_id = o.customer_id;", alternativeSolutions: [], expectedResult: { columns: ["name", "membership", "product", "order_date"], rowCount: 40, preview: [["John Smith", "Gold", "Laptop Pro", "2024-01-15"]], note: "Columns from both tables" }, explanation: "After JOIN, you can SELECT any column from either table." },
        { id: "d16q4", difficulty: "medium-hard", points: 20, title: "Join with Filter", description: "Find orders over $200. Show customer name and total.", dataset: "ecommerce", solution: "SELECT c.name, o.total FROM customers c INNER JOIN orders o ON c.customer_id = o.customer_id WHERE o.total > 200;", alternativeSolutions: [], expectedResult: { columns: ["name", "total"], rowCount: 15, preview: [["John Smith", 1299.99], ["Michael Brown", 349.99]], note: "15 orders over $200" }, explanation: "WHERE filters the joined results." },
        { id: "d16q5", difficulty: "hard", points: 25, title: "Join with Aggregation", description: "For each customer, show name and total_spent (SUM of order totals).", dataset: "ecommerce", solution: "SELECT c.name, SUM(o.total) AS total_spent FROM customers c INNER JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.name;", alternativeSolutions: ["SELECT c.name, SUM(o.total) AS total_spent FROM customers c INNER JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id;"], expectedResult: { columns: ["name", "total_spent"], rowCount: 10, preview: [["John Smith", 3339.92], ["Emma Wilson", 979.95]], note: "10 customers with orders" }, explanation: "JOIN + GROUP BY calculates per-customer totals." }
      ]
    },

    // ============================================================
    // DAY 17: LEFT JOIN
    // ============================================================
    {
      day: 17, week: 3, title: "LEFT JOIN", description: "Include all rows from left table",
      concepts: ["LEFT JOIN", "NULL in joins", "Finding missing"],
      dataset: "ecommerce",
      tablesUsed: ["customers", "orders"],
      lesson: `# LEFT JOIN\n\nReturns ALL left table rows, NULL for missing matches.\n\n\`\`\`sql\nSELECT c.name, o.total\nFROM customers c\nLEFT JOIN orders o ON c.customer_id = o.customer_id;\n\`\`\``,
      questions: [
        { id: "d17q1", difficulty: "easy", points: 5, title: "Basic Left Join", description: "LEFT JOIN to show all customers and their orders (including those with none).", dataset: "ecommerce", solution: "SELECT c.name, o.total FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id;", alternativeSolutions: [], expectedResult: { columns: ["name", "total"], rowCount: 43, preview: [["John Smith", 1299.99], ["Amy Taylor", null]], note: "43 rows: 40 orders + 3 customers without" }, explanation: "LEFT JOIN includes all customers, even those with no orders." },
        { id: "d17q2", difficulty: "easy-medium", points: 10, title: "Count with Left Join", description: "Show all customers with their order_count (0 if none).", dataset: "ecommerce", solution: "SELECT c.name, COUNT(o.order_id) AS order_count FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.name;", alternativeSolutions: ["SELECT c.name, COUNT(o.order_id) AS order_count FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id;"], expectedResult: { columns: ["name", "order_count"], rowCount: 13, preview: [["John Smith", 7], ["Amy Taylor", 0]], note: "All 13 customers shown" }, explanation: "COUNT(o.order_id) gives 0 for customers without orders." },
        { id: "d17q3", difficulty: "medium", points: 15, title: "Find No Orders", description: "Find customers who have never placed an order.", dataset: "ecommerce", solution: "SELECT c.name FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id WHERE o.order_id IS NULL;", alternativeSolutions: [], expectedResult: { columns: ["name"], rowCount: 3, preview: [["Amy Taylor"], ["Mark Johnson"], ["Nina Patel"]], note: "3 customers with no orders" }, explanation: "WHERE o.order_id IS NULL finds unmatched rows." },
        { id: "d17q4", difficulty: "medium-hard", points: 20, title: "Complete Summary", description: "All customers: name, order_count, total_spent (0 if no orders). Use COALESCE.", dataset: "ecommerce", solution: "SELECT c.name, COUNT(o.order_id) AS order_count, COALESCE(SUM(o.total), 0) AS total_spent FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.name;", alternativeSolutions: [], expectedResult: { columns: ["name", "order_count", "total_spent"], rowCount: 13, preview: [["John Smith", 7, 3339.92], ["Amy Taylor", 0, 0]], note: "Complete customer summary" }, explanation: "COALESCE replaces NULL with 0 for customers without orders." },
        { id: "d17q5", difficulty: "hard", points: 25, title: "High-Value Only", description: "Show all customers with their total_spent. Only include those who spent over $500 OR have no orders.", dataset: "ecommerce", solution: "SELECT c.name, COALESCE(SUM(o.total), 0) AS total_spent FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.name HAVING total_spent > 500 OR total_spent = 0;", alternativeSolutions: [], expectedResult: { columns: ["name", "total_spent"], rowCount: 8, preview: [["John Smith", 3339.92], ["Amy Taylor", 0]], note: "Big spenders + inactive customers" }, explanation: "HAVING filters grouped results after aggregation." }
      ]
    },

    // ============================================================
    // DAY 18: UNION
    // ============================================================
    {
      day: 18, week: 3, title: "UNION & UNION ALL", description: "Combine results from multiple queries",
      concepts: ["UNION", "UNION ALL", "Set operations"],
      dataset: "titanic",
      tableUsed: "passengers",
      lesson: `# UNION\n\nUNION removes duplicates. UNION ALL keeps all rows.`,
      questions: [
        { id: "d18q1", difficulty: "easy", points: 5, title: "Simple Union", description: "Get names of first class OR survivors using UNION.", solution: "SELECT Name FROM passengers WHERE Pclass = 1 UNION SELECT Name FROM passengers WHERE Survived = 1;", alternativeSolutions: [], expectedResult: { columns: ["Name"], rowCount: 422, preview: [["Cumings, Mrs. John Bradley"]], note: "422 unique names" }, explanation: "UNION removes duplicates." },
        { id: "d18q2", difficulty: "easy-medium", points: 10, title: "Union All", description: "Same with UNION ALL to keep duplicates.", solution: "SELECT Name FROM passengers WHERE Pclass = 1 UNION ALL SELECT Name FROM passengers WHERE Survived = 1;", alternativeSolutions: [], expectedResult: { columns: ["Name"], rowCount: 558, preview: [["Cumings, Mrs. John Bradley"]], note: "558 rows (136 duplicates)" }, explanation: "UNION ALL: 216 + 342 = 558." },
        { id: "d18q3", difficulty: "medium", points: 15, title: "Labeled Summary", description: "Show 'First Class' and 'Survivors' counts as labeled rows.", solution: "SELECT 'First Class' AS category, COUNT(*) AS count FROM passengers WHERE Pclass = 1 UNION ALL SELECT 'Survivors', COUNT(*) FROM passengers WHERE Survived = 1;", alternativeSolutions: [], expectedResult: { columns: ["category", "count"], rowCount: 2, preview: [["First Class", 216], ["Survivors", 342]], fullResult: true, note: "Labeled summary report" }, explanation: "Labels make reports readable." },
        { id: "d18q4", difficulty: "medium-hard", points: 20, title: "Three-Way Union", description: "Count each class as three labeled rows.", solution: "SELECT 'First' AS class, COUNT(*) AS count FROM passengers WHERE Pclass = 1 UNION ALL SELECT 'Second', COUNT(*) FROM passengers WHERE Pclass = 2 UNION ALL SELECT 'Third', COUNT(*) FROM passengers WHERE Pclass = 3;", alternativeSolutions: [], expectedResult: { columns: ["class", "count"], rowCount: 3, preview: [["First", 216], ["Second", 184], ["Third", 491]], fullResult: true, note: "Class breakdown" }, explanation: "Chain multiple UNIONs." },
        { id: "d18q5", difficulty: "hard", points: 25, title: "Survival Matrix", description: "Create: Male Survivors, Female Survivors, Male Deaths, Female Deaths.", solution: "SELECT 'Male Survivors' AS category, COUNT(*) AS count FROM passengers WHERE Sex = 'male' AND Survived = 1 UNION ALL SELECT 'Female Survivors', COUNT(*) FROM passengers WHERE Sex = 'female' AND Survived = 1 UNION ALL SELECT 'Male Deaths', COUNT(*) FROM passengers WHERE Sex = 'male' AND Survived = 0 UNION ALL SELECT 'Female Deaths', COUNT(*) FROM passengers WHERE Sex = 'female' AND Survived = 0;", alternativeSolutions: [], expectedResult: { columns: ["category", "count"], rowCount: 4, preview: [["Male Survivors", 109], ["Female Survivors", 233], ["Male Deaths", 468], ["Female Deaths", 81]], fullResult: true, note: "Complete survival breakdown" }, explanation: "Four-way gender × survival." }
      ]
    },

    // ============================================================
    // DAY 19: String Functions
    // ============================================================
    {
      day: 19, week: 3, title: "String Functions", description: "Manipulate text data",
      concepts: ["UPPER", "LOWER", "LENGTH", "SUBSTR", "REPLACE"],
      dataset: "titanic",
      tableUsed: "passengers",
      lesson: `# String Functions\n\nUPPER, LOWER, LENGTH, SUBSTR, REPLACE`,
      questions: [
        { id: "d19q1", difficulty: "easy", points: 5, title: "Uppercase", description: "Show names in UPPERCASE.", solution: "SELECT UPPER(Name) AS name_upper FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["name_upper"], rowCount: 891, preview: [["BRAUND, MR. OWEN HARRIS"]], note: "All uppercase" }, explanation: "UPPER converts to uppercase." },
        { id: "d19q2", difficulty: "easy-medium", points: 10, title: "Name Length", description: "Show Name and its length.", solution: "SELECT Name, LENGTH(Name) AS name_length FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "name_length"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 23]], note: "Character count" }, explanation: "LENGTH counts characters." },
        { id: "d19q3", difficulty: "medium", points: 15, title: "First 15 Characters", description: "Show first 15 characters as short_name.", solution: "SELECT SUBSTR(Name, 1, 15) AS short_name FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["short_name"], rowCount: 891, preview: [["Braund, Mr. Owe"]], note: "Truncated names" }, explanation: "SUBSTR extracts substring." },
        { id: "d19q4", difficulty: "medium-hard", points: 20, title: "Replace Title", description: "Replace 'Mr.' with 'Mister'.", solution: "SELECT REPLACE(Name, 'Mr.', 'Mister') AS formal_name FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["formal_name"], rowCount: 891, preview: [["Braund, Mister Owen Harris"]], note: "'Mr.' → 'Mister'" }, explanation: "REPLACE substitutes text." },
        { id: "d19q5", difficulty: "hard", points: 25, title: "Extract Last Name", description: "Extract last name (before comma).", solution: "SELECT SUBSTR(Name, 1, INSTR(Name, ',') - 1) AS last_name FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["last_name"], rowCount: 891, preview: [["Braund"], ["Cumings"]], note: "Text before comma" }, explanation: "INSTR finds comma position." }
      ]
    },

    // ============================================================
    // DAY 20: Math Functions
    // ============================================================
    {
      day: 20, week: 3, title: "Math Functions & ROUND", description: "Calculations and rounding",
      concepts: ["ROUND", "ABS", "Arithmetic"],
      dataset: "titanic",
      tableUsed: "passengers",
      lesson: `# Math Functions\n\nROUND(value, decimals), ABS(value)`,
      questions: [
        { id: "d20q1", difficulty: "easy", points: 5, title: "Round Fare", description: "Show Fare rounded to whole numbers.", solution: "SELECT Name, ROUND(Fare, 0) AS fare_rounded FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "fare_rounded"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 7]], note: "Rounded to integers" }, explanation: "ROUND(value, 0) = nearest integer." },
        { id: "d20q2", difficulty: "easy-medium", points: 10, title: "Two Decimals", description: "Show Fare rounded to 2 decimal places.", solution: "SELECT Name, ROUND(Fare, 2) AS fare_rounded FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "fare_rounded"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 7.25]], note: "2 decimal places" }, explanation: "ROUND with precision." },
        { id: "d20q3", difficulty: "medium", points: 15, title: "Family Size", description: "Calculate family_size = SibSp + Parch + 1.", solution: "SELECT Name, SibSp + Parch + 1 AS family_size FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "family_size"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 2]], note: "Including self" }, explanation: "Simple arithmetic." },
        { id: "d20q4", difficulty: "medium-hard", points: 20, title: "Fare Per Person", description: "Fare / family_size, rounded to 2 decimals.", solution: "SELECT Name, ROUND(Fare / (SibSp + Parch + 1), 2) AS fare_per_person FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "fare_per_person"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 3.63]], note: "Cost per family member" }, explanation: "Division with rounding." },
        { id: "d20q5", difficulty: "hard", points: 25, title: "Rounded Statistics", description: "avg_fare, min_fare, max_fare, fare_range - all rounded.", solution: "SELECT ROUND(AVG(Fare), 2) AS avg_fare, ROUND(MIN(Fare), 2) AS min_fare, ROUND(MAX(Fare), 2) AS max_fare, ROUND(MAX(Fare) - MIN(Fare), 2) AS fare_range FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["avg_fare", "min_fare", "max_fare", "fare_range"], rowCount: 1, preview: [[32.2, 0, 512.33, 512.33]], fullResult: true, note: "Fare statistics" }, explanation: "Multiple aggregates with ROUND." }
      ]
    },

    // ============================================================
    // DAY 21: Window Functions - ROW_NUMBER
    // ============================================================
    {
      day: 21, week: 3, title: "ROW_NUMBER", description: "Number rows without grouping",
      concepts: ["ROW_NUMBER", "OVER", "PARTITION BY"],
      dataset: "titanic",
      tableUsed: "passengers",
      lesson: `# ROW_NUMBER\n\nROW_NUMBER() OVER (ORDER BY col) assigns sequential numbers.`,
      questions: [
        { id: "d21q1", difficulty: "easy", points: 5, title: "Simple Row Number", description: "Add row_num ordered by passenger_id.", solution: "SELECT Name, passenger_id, ROW_NUMBER() OVER (ORDER BY passenger_id) AS row_num FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "passenger_id", "row_num"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 1, 1], ["Cumings, Mrs. John Bradley", 2, 2]], note: "1-891 sequential" }, explanation: "ROW_NUMBER assigns sequential numbers." },
        { id: "d21q2", difficulty: "easy-medium", points: 10, title: "Rank by Fare", description: "Rank by Fare descending.", solution: "SELECT Name, Fare, ROW_NUMBER() OVER (ORDER BY Fare DESC) AS fare_rank FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare", "fare_rank"], rowCount: 891, preview: [["Ward, Miss. Anna", 512.33, 1]], note: "Highest fare = rank 1" }, explanation: "DESC for highest first." },
        { id: "d21q3", difficulty: "medium", points: 15, title: "Top 5 Fares", description: "Find top 5 by fare using subquery.", solution: "SELECT * FROM (SELECT Name, Fare, ROW_NUMBER() OVER (ORDER BY Fare DESC) AS rank FROM passengers) WHERE rank <= 5;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare", "rank"], rowCount: 5, preview: [["Ward, Miss. Anna", 512.33, 1]], note: "Top 5 highest fares" }, explanation: "Filter window results in subquery." },
        { id: "d21q4", difficulty: "medium-hard", points: 20, title: "Youngest Ranked", description: "Rank by Age ascending (youngest = 1).", solution: "SELECT Name, Age, ROW_NUMBER() OVER (ORDER BY Age ASC) AS age_rank FROM passengers WHERE Age IS NOT NULL;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Age", "age_rank"], rowCount: 714, preview: [["Thomas, Master. Assad Alexander", 0.42, 1]], note: "Youngest first" }, explanation: "Youngest gets rank 1." },
        { id: "d21q5", difficulty: "hard", points: 25, title: "Rank Within Class", description: "Rank by Fare within each Pclass.", solution: "SELECT Name, Pclass, Fare, ROW_NUMBER() OVER (PARTITION BY Pclass ORDER BY Fare DESC) AS class_rank FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Pclass", "Fare", "class_rank"], rowCount: 891, preview: [["Ward, Miss. Anna", 1, 512.33, 1]], note: "Separate ranking per class" }, explanation: "PARTITION BY creates separate rankings." }
      ]
    },

    // ============================================================
    // DAY 22: RANK and DENSE_RANK
    // ============================================================
    {
      day: 22, week: 4, title: "RANK vs DENSE_RANK", description: "Handle ties in rankings",
      concepts: ["RANK", "DENSE_RANK", "Handling ties"],
      dataset: "titanic",
      tableUsed: "passengers",
      lesson: `# RANK vs DENSE_RANK\n\nRANK: 1,2,2,4 (skips)\nDENSE_RANK: 1,2,2,3 (no skip)`,
      questions: [
        { id: "d22q1", difficulty: "easy", points: 5, title: "Basic RANK", description: "RANK by Fare descending.", solution: "SELECT Name, Fare, RANK() OVER (ORDER BY Fare DESC) AS rank FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare", "rank"], rowCount: 891, preview: [["Ward, Miss. Anna", 512.33, 1]], note: "Ties get same rank" }, explanation: "RANK handles ties." },
        { id: "d22q2", difficulty: "easy-medium", points: 10, title: "DENSE_RANK", description: "Same with DENSE_RANK.", solution: "SELECT Name, Fare, DENSE_RANK() OVER (ORDER BY Fare DESC) AS dense_rank FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare", "dense_rank"], rowCount: 891, preview: [["Ward, Miss. Anna", 512.33, 1]], note: "No gaps after ties" }, explanation: "DENSE_RANK doesn't skip." },
        { id: "d22q3", difficulty: "medium", points: 15, title: "Compare Both", description: "Show both RANK and DENSE_RANK.", solution: "SELECT Name, Fare, RANK() OVER (ORDER BY Fare DESC) AS rank, DENSE_RANK() OVER (ORDER BY Fare DESC) AS dense_rank FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare", "rank", "dense_rank"], rowCount: 891, preview: [["Ward, Miss. Anna", 512.33, 1, 1]], note: "Compare rankings" }, explanation: "See how ties differ." },
        { id: "d22q4", difficulty: "medium-hard", points: 20, title: "Top 3 Per Class", description: "Top 3 fares in each class.", solution: "SELECT * FROM (SELECT Name, Pclass, Fare, DENSE_RANK() OVER (PARTITION BY Pclass ORDER BY Fare DESC) AS dr FROM passengers) WHERE dr <= 3;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Pclass", "Fare", "dr"], rowCount: 9, preview: [["Ward, Miss. Anna", 1, 512.33, 1]], note: "Top 3 per class" }, explanation: "Top N per group pattern." },
        { id: "d22q5", difficulty: "hard", points: 25, title: "Percentile", description: "Show fare percentile.", solution: "SELECT Name, Fare, ROUND(PERCENT_RANK() OVER (ORDER BY Fare) * 100, 1) AS percentile FROM passengers WHERE Fare > 0;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare", "percentile"], rowCount: 876, preview: [], note: "Percentile ranking" }, explanation: "PERCENT_RANK for percentiles." }
      ]
    },

    // ============================================================
    // DAY 23: LAG and LEAD
    // ============================================================
    {
      day: 23, week: 4, title: "LAG and LEAD", description: "Access adjacent rows",
      concepts: ["LAG", "LEAD", "Row comparison"],
      dataset: "titanic",
      tableUsed: "passengers",
      lesson: `# LAG and LEAD\n\nLAG gets previous row. LEAD gets next row.`,
      questions: [
        { id: "d23q1", difficulty: "easy", points: 5, title: "Previous Fare", description: "Show fare and previous fare.", solution: "SELECT Name, Fare, LAG(Fare) OVER (ORDER BY passenger_id) AS prev_fare FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare", "prev_fare"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 7.25, null]], note: "NULL for first row" }, explanation: "LAG gets previous row." },
        { id: "d23q2", difficulty: "easy-medium", points: 10, title: "Next Fare", description: "Show fare and next fare.", solution: "SELECT Name, Fare, LEAD(Fare) OVER (ORDER BY passenger_id) AS next_fare FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare", "next_fare"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 7.25, 71.28]], note: "LEAD gets next" }, explanation: "LEAD gets next row." },
        { id: "d23q3", difficulty: "medium", points: 15, title: "Fare Difference", description: "Calculate difference from previous.", solution: "SELECT Name, Fare, Fare - LAG(Fare) OVER (ORDER BY passenger_id) AS fare_diff FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare", "fare_diff"], rowCount: 891, preview: [["Cumings, Mrs. John Bradley", 71.28, 64.03]], note: "Row-to-row difference" }, explanation: "Subtract for differences." },
        { id: "d23q4", difficulty: "medium-hard", points: 20, title: "LAG with Default", description: "prev_fare with 0 as default.", solution: "SELECT Name, Fare, LAG(Fare, 1, 0) OVER (ORDER BY passenger_id) AS prev_fare FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare", "prev_fare"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 7.25, 0]], note: "0 instead of NULL" }, explanation: "Third param is default." },
        { id: "d23q5", difficulty: "hard", points: 25, title: "Direction Indicator", description: "Show + or - vs previous.", solution: "SELECT Name, Fare, CASE WHEN Fare > LAG(Fare) OVER (ORDER BY passenger_id) THEN '+' WHEN Fare < LAG(Fare) OVER (ORDER BY passenger_id) THEN '-' ELSE '=' END AS vs_prev FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare", "vs_prev"], rowCount: 891, preview: [["Cumings, Mrs. John Bradley", 71.28, "+"]], note: "Direction indicators" }, explanation: "CASE with LAG." }
      ]
    },

    // ============================================================
    // DAY 24: Running Totals
    // ============================================================
    {
      day: 24, week: 4, title: "Running Totals", description: "Cumulative calculations",
      concepts: ["SUM OVER", "Running total", "Cumulative"],
      dataset: "titanic",
      tableUsed: "passengers",
      lesson: `# Running Totals\n\nSUM() OVER (ORDER BY col) creates running totals.`,
      questions: [
        { id: "d24q1", difficulty: "easy", points: 5, title: "Running Total", description: "Running total of Fare.", solution: "SELECT Name, Fare, SUM(Fare) OVER (ORDER BY passenger_id) AS running_total FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare", "running_total"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 7.25, 7.25]], note: "Cumulative sum" }, explanation: "Running total accumulates." },
        { id: "d24q2", difficulty: "easy-medium", points: 10, title: "Running Count", description: "Running count of passengers.", solution: "SELECT Name, COUNT(*) OVER (ORDER BY passenger_id) AS running_count FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "running_count"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 1]], note: "Running count" }, explanation: "COUNT in window function." },
        { id: "d24q3", difficulty: "medium", points: 15, title: "Running Average", description: "Running average of Fare.", solution: "SELECT Name, Fare, ROUND(AVG(Fare) OVER (ORDER BY passenger_id), 2) AS running_avg FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare", "running_avg"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 7.25, 7.25]], note: "Running average" }, explanation: "Running avg updates each row." },
        { id: "d24q4", difficulty: "medium-hard", points: 20, title: "Per-Class Running", description: "Running total within each class.", solution: "SELECT Name, Pclass, Fare, SUM(Fare) OVER (PARTITION BY Pclass ORDER BY passenger_id) AS class_total FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Pclass", "Fare", "class_total"], rowCount: 891, preview: [["Cumings, Mrs. John Bradley", 1, 71.28, 71.28]], note: "Per-class totals" }, explanation: "PARTITION BY resets totals." },
        { id: "d24q5", difficulty: "hard", points: 25, title: "Cumulative Percent", description: "Fare as % of running total.", solution: "SELECT Name, Fare, ROUND(Fare / SUM(Fare) OVER (ORDER BY passenger_id) * 100, 2) AS pct_of_running FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare", "pct_of_running"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 7.25, 100]], note: "First = 100%" }, explanation: "First row is 100% of itself." }
      ]
    },

    // ============================================================
    // DAY 25: CTEs
    // ============================================================
    {
      day: 25, week: 4, title: "CTEs (WITH)", description: "Named subqueries for cleaner code",
      concepts: ["WITH", "CTE", "Named subquery"],
      dataset: "titanic",
      tableUsed: "passengers",
      lesson: `# CTEs\n\nWITH name AS (query) SELECT ... FROM name;`,
      questions: [
        { id: "d25q1", difficulty: "easy", points: 5, title: "Simple CTE", description: "CTE for survivors, count them.", solution: "WITH survivors AS (SELECT * FROM passengers WHERE Survived = 1) SELECT COUNT(*) AS survivor_count FROM survivors;", alternativeSolutions: [], expectedResult: { columns: ["survivor_count"], rowCount: 1, preview: [[342]], fullResult: true, note: "342 survivors" }, explanation: "CTE creates named subquery." },
        { id: "d25q2", difficulty: "easy-medium", points: 10, title: "CTE with Aggregate", description: "First class avg fare via CTE.", solution: "WITH first_class AS (SELECT * FROM passengers WHERE Pclass = 1) SELECT ROUND(AVG(Fare), 2) AS avg_fare FROM first_class;", alternativeSolutions: [], expectedResult: { columns: ["avg_fare"], rowCount: 1, preview: [[84.15]], fullResult: true, note: "£84.15 average" }, explanation: "CTE simplifies query." },
        { id: "d25q3", difficulty: "medium", points: 15, title: "CTE with Filter", description: "Above-average fare passengers by class.", solution: "WITH above_avg AS (SELECT * FROM passengers WHERE Fare > (SELECT AVG(Fare) FROM passengers)) SELECT Pclass, COUNT(*) AS count FROM above_avg GROUP BY Pclass;", alternativeSolutions: [], expectedResult: { columns: ["Pclass", "count"], rowCount: 3, preview: [[1, 145]], note: "Count per class" }, explanation: "CTE can contain subqueries." },
        { id: "d25q4", difficulty: "medium-hard", points: 20, title: "Multiple CTEs", description: "Compare male vs female survival.", solution: "WITH males AS (SELECT * FROM passengers WHERE Sex = 'male'), females AS (SELECT * FROM passengers WHERE Sex = 'female') SELECT 'Male' AS sex, ROUND(AVG(Survived) * 100, 1) AS survival_rate FROM males UNION ALL SELECT 'Female', ROUND(AVG(Survived) * 100, 1) FROM females;", alternativeSolutions: [], expectedResult: { columns: ["sex", "survival_rate"], rowCount: 2, preview: [["Male", 18.9], ["Female", 74.2]], fullResult: true, note: "Gender comparison" }, explanation: "Multiple CTEs with comma." },
        { id: "d25q5", difficulty: "hard", points: 25, title: "CTE with Join", description: "Compare passengers to class average.", solution: "WITH class_stats AS (SELECT Pclass, AVG(Fare) AS avg_fare FROM passengers GROUP BY Pclass) SELECT p.Name, p.Pclass, p.Fare, ROUND(c.avg_fare, 2) AS class_avg FROM passengers p JOIN class_stats c ON p.Pclass = c.Pclass;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Pclass", "Fare", "class_avg"], rowCount: 891, preview: [["Cumings, Mrs. John Bradley", 1, 71.28, 84.15]], note: "Individual vs class avg" }, explanation: "CTEs can be joined." }
      ]
    },

    // ============================================================
    // DAYS 26-28: IN/EXISTS, COALESCE/NULLIF, BETWEEN
    // ============================================================
    {
      day: 26, week: 4, title: "IN and EXISTS", description: "Subquery filtering",
      concepts: ["IN", "NOT IN", "EXISTS"], dataset: "titanic", tableUsed: "passengers",
      lesson: `# IN and EXISTS\n\nIN checks list membership. EXISTS checks if subquery returns rows.`,
      questions: [
        { id: "d26q1", difficulty: "easy", points: 5, title: "Simple IN", description: "Passengers in class 1 or 2.", solution: "SELECT Name, Pclass FROM passengers WHERE Pclass IN (1, 2);", alternativeSolutions: [], expectedResult: { columns: ["Name", "Pclass"], rowCount: 400, preview: [["Cumings, Mrs. John Bradley", 1]], note: "400 passengers" }, explanation: "IN checks list." },
        { id: "d26q2", difficulty: "easy-medium", points: 10, title: "NOT IN", description: "NOT in class 3.", solution: "SELECT Name, Pclass FROM passengers WHERE Pclass NOT IN (3);", alternativeSolutions: [], expectedResult: { columns: ["Name", "Pclass"], rowCount: 400, preview: [["Cumings, Mrs. John Bradley", 1]], note: "Same result" }, explanation: "NOT IN excludes." },
        { id: "d26q3", difficulty: "medium", points: 15, title: "IN with Subquery", description: "From ports with avg fare > $30.", solution: "SELECT Name, Embarked FROM passengers WHERE Embarked IN (SELECT Embarked FROM passengers GROUP BY Embarked HAVING AVG(Fare) > 30);", alternativeSolutions: [], expectedResult: { columns: ["Name", "Embarked"], rowCount: 812, preview: [["Cumings, Mrs. John Bradley", "C"]], note: "High-fare ports" }, explanation: "Subquery returns list." },
        { id: "d26q4", difficulty: "medium-hard", points: 20, title: "High Max Classes", description: "Classes with max fare > $200.", solution: "SELECT Name, Pclass, Fare FROM passengers WHERE Pclass IN (SELECT Pclass FROM passengers GROUP BY Pclass HAVING MAX(Fare) > 200);", alternativeSolutions: [], expectedResult: { columns: ["Name", "Pclass", "Fare"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 3, 7.25]], note: "All classes!" }, explanation: "All classes had >$200." },
        { id: "d26q5", difficulty: "hard", points: 25, title: "Not Max Fare", description: "Not paying class max fare.", solution: "SELECT Name, Pclass, Fare FROM passengers WHERE Fare NOT IN (SELECT MAX(Fare) FROM passengers GROUP BY Pclass);", alternativeSolutions: [], expectedResult: { columns: ["Name", "Pclass", "Fare"], rowCount: 885, preview: [["Braund, Mr. Owen Harris", 3, 7.25]], note: "Excludes 6 top payers" }, explanation: "Excludes max per class." }
      ]
    },

    {
      day: 27, week: 4, title: "COALESCE and NULLIF", description: "Elegant NULL handling",
      concepts: ["COALESCE", "NULLIF"], dataset: "titanic", tableUsed: "passengers",
      lesson: `# COALESCE and NULLIF\n\nCOALESCE: first non-NULL. NULLIF: NULL if equal.`,
      questions: [
        { id: "d27q1", difficulty: "easy", points: 5, title: "Replace NULL", description: "NULL embarked → 'Unknown'.", solution: "SELECT name, COALESCE(embarked, 'Unknown') AS port FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["name", "port"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", "S"]], note: "NULL → 'Unknown'" }, explanation: "COALESCE provides default." },
        { id: "d27q2", difficulty: "easy-medium", points: 10, title: "Default Age", description: "NULL ages → 0.", solution: "SELECT Name, COALESCE(Age, 0) AS age FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "age"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 22]], note: "NULL → 0" }, explanation: "Replace NULL with 0." },
        { id: "d27q3", difficulty: "medium", points: 15, title: "Chain Defaults", description: "Empty string AND NULL → 'Unknown'.", solution: "SELECT Name, COALESCE(NULLIF(Embarked, ''), 'Unknown') AS port FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "port"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", "S"]], note: "Empty → NULL → default" }, explanation: "NULLIF converts empty to NULL." },
        { id: "d27q4", difficulty: "medium-hard", points: 20, title: "Average with Default", description: "Avg age treating NULL as 30.", solution: "SELECT ROUND(AVG(COALESCE(Age, 30)), 2) AS avg_age_filled FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["avg_age_filled"], rowCount: 1, preview: [[29.76]], fullResult: true, note: "NULLs counted as 30" }, explanation: "Fill before averaging." },
        { id: "d27q5", difficulty: "hard", points: 25, title: "Safe Division", description: "Fare per person avoiding div/0.", solution: "SELECT Name, Fare, SibSp + Parch + 1 AS family, Fare / NULLIF(SibSp + Parch + 1, 0) AS fare_per_person FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare", "family", "fare_per_person"], rowCount: 891, preview: [["Braund, Mr. Owen Harris", 7.25, 2, 3.625]], note: "Safe division" }, explanation: "NULLIF prevents div/0." }
      ]
    },

    {
      day: 28, week: 4, title: "BETWEEN", description: "Range filtering",
      concepts: ["BETWEEN", "NOT BETWEEN"], dataset: "titanic", tableUsed: "passengers",
      lesson: `# BETWEEN\n\nBETWEEN is inclusive: 20 AND 40 means 20 ≤ x ≤ 40.`,
      questions: [
        { id: "d28q1", difficulty: "easy", points: 5, title: "Age Range", description: "Passengers aged 20-30.", solution: "SELECT Name, Age FROM passengers WHERE Age BETWEEN 20 AND 30;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Age"], rowCount: 220, preview: [["Braund, Mr. Owen Harris", 22]], note: "220 passengers" }, explanation: "BETWEEN is inclusive." },
        { id: "d28q2", difficulty: "easy-medium", points: 10, title: "Fare Range", description: "Fares $50-$100.", solution: "SELECT Name, Fare FROM passengers WHERE Fare BETWEEN 50 AND 100;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare"], rowCount: 52, preview: [["Cumings, Mrs. John Bradley", 71.28]], note: "52 in range" }, explanation: "Works with decimals." },
        { id: "d28q3", difficulty: "medium", points: 15, title: "NOT BETWEEN", description: "Ages NOT 18-60.", solution: "SELECT Name, Age FROM passengers WHERE Age NOT BETWEEN 18 AND 60 AND Age IS NOT NULL;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Age"], rowCount: 151, preview: [["Palsson, Master. Gosta Leonard", 2]], note: "Children and seniors" }, explanation: "NOT BETWEEN for outside." },
        { id: "d28q4", difficulty: "medium-hard", points: 20, title: "Combined Filters", description: "Class 1/2, aged 30-50.", solution: "SELECT Name, Pclass, Age FROM passengers WHERE Pclass IN (1, 2) AND Age BETWEEN 30 AND 50;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Pclass", "Age"], rowCount: 150, preview: [["Cumings, Mrs. John Bradley", 1, 38]], note: "IN + BETWEEN" }, explanation: "Combine filters." },
        { id: "d28q5", difficulty: "hard", points: 25, title: "Fare Brackets", description: "Count in fare brackets: 0-20, 20-50, 50-100, 100+.", solution: "SELECT SUM(CASE WHEN Fare BETWEEN 0 AND 20 THEN 1 ELSE 0 END) AS budget, SUM(CASE WHEN Fare > 20 AND Fare <= 50 THEN 1 ELSE 0 END) AS standard, SUM(CASE WHEN Fare > 50 AND Fare <= 100 THEN 1 ELSE 0 END) AS premium, SUM(CASE WHEN Fare > 100 THEN 1 ELSE 0 END) AS luxury FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["budget", "standard", "premium", "luxury"], rowCount: 1, preview: [[635, 164, 52, 40]], fullResult: true, note: "Fare brackets" }, explanation: "CASE with BETWEEN." }
      ]
    },

    // ============================================================
    // DAY 29: Query Optimization
    // ============================================================
    {
      day: 29, week: 5, title: "Query Optimization", description: "Write efficient queries",
      concepts: ["Best practices", "Performance"], dataset: "titanic", tableUsed: "passengers",
      lesson: `# Query Optimization\n\n1. Select only needed columns\n2. Filter early\n3. Use LIMIT for testing`,
      questions: [
        { id: "d29q1", difficulty: "easy", points: 5, title: "Specific Columns", description: "Only Name and Fare for class 1.", solution: "SELECT Name, Fare FROM passengers WHERE Pclass = 1;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare"], rowCount: 216, preview: [["Cumings, Mrs. John Bradley", 71.28]], note: "2 columns, not *" }, explanation: "Specific > SELECT *" },
        { id: "d29q2", difficulty: "easy-medium", points: 10, title: "Filter First", description: "Top 5 first class fares.", solution: "SELECT Name, Fare FROM passengers WHERE Pclass = 1 ORDER BY Fare DESC LIMIT 5;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Fare"], rowCount: 5, preview: [["Ward, Miss. Anna", 512.33]], fullResult: false, note: "Filter, sort, limit" }, explanation: "Filter → sort → limit." },
        { id: "d29q3", difficulty: "medium", points: 15, title: "Test Sample", description: "Sample 10 passengers.", solution: "SELECT Name, Age, Fare FROM passengers ORDER BY passenger_id LIMIT 10;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Age", "Fare"], rowCount: 10, preview: [["Braund, Mr. Owen Harris", 22, 7.25]], note: "LIMIT for testing" }, explanation: "LIMIT for quick tests." },
        { id: "d29q4", difficulty: "medium-hard", points: 20, title: "Efficient Count", description: "Count first class survivors.", solution: "SELECT COUNT(*) AS first_class_survivors FROM passengers WHERE Pclass = 1 AND Survived = 1;", alternativeSolutions: [], expectedResult: { columns: ["first_class_survivors"], rowCount: 1, preview: [[136]], fullResult: true, note: "Direct filter" }, explanation: "WHERE faster than CASE." },
        { id: "d29q5", difficulty: "hard", points: 25, title: "Optimized Analysis", description: "Avg fare by class with 100+ passengers.", solution: "SELECT Pclass, ROUND(AVG(Fare), 2) AS avg_fare, COUNT(*) AS count FROM passengers GROUP BY Pclass HAVING COUNT(*) >= 100 ORDER BY Pclass;", alternativeSolutions: [], expectedResult: { columns: ["Pclass", "avg_fare", "count"], rowCount: 3, preview: [[1, 84.15, 216], [2, 20.66, 184], [3, 13.68, 491]], fullResult: true, note: "All classes qualify" }, explanation: "GROUP + HAVING + ORDER." }
      ]
    },

    // ============================================================
    // DAY 30: FINAL CHALLENGE
    // ============================================================
    {
      day: 30, week: 5, title: "Final Challenge", description: "Combine everything!",
      concepts: ["All concepts"], dataset: "titanic", tableUsed: "passengers",
      tableSchema: [
        { column: "passenger_id", type: "INTEGER", description: "Unique ID (1-891)" },
        { column: "Survived", type: "INTEGER", description: "0=Died, 1=Survived" },
        { column: "Pclass", type: "INTEGER", description: "1=First, 2=Second, 3=Third" },
        { column: "Name", type: "TEXT", description: "Full name with title" },
        { column: "Sex", type: "TEXT", description: "'male' or 'female'" },
        { column: "Age", type: "REAL", description: "Age in years (177 NULL)" },
        { column: "SibSp", type: "INTEGER", description: "Siblings/spouses aboard" },
        { column: "Parch", type: "INTEGER", description: "Parents/children aboard" },
        { column: "Fare", type: "REAL", description: "Ticket price (£)" },
        { column: "Embarked", type: "TEXT", description: "S/C/Q port code" }
      ],
      lesson: `# Final Challenge 🏆\n\nCongratulations on Day 30! Combine everything you've learned.`,
      questions: [
        { id: "d30q1", difficulty: "easy", points: 5, title: "Survival Summary", description: "Total, survivors, deaths, survival_rate (%).", solution: "SELECT COUNT(*) AS total, SUM(Survived) AS survivors, COUNT(*) - SUM(Survived) AS deaths, ROUND(AVG(Survived) * 100, 1) AS survival_rate FROM passengers;", alternativeSolutions: [], expectedResult: { columns: ["total", "survivors", "deaths", "survival_rate"], rowCount: 1, preview: [[891, 342, 549, 38.4]], fullResult: true, note: "Complete overview" }, explanation: "891 passengers, 342 survived (38.4%)." },
        { id: "d30q2", difficulty: "easy-medium", points: 10, title: "Class & Gender", description: "Survival rate by Pclass and Sex, ordered.", solution: "SELECT Pclass, Sex, COUNT(*) AS count, ROUND(AVG(Survived) * 100, 1) AS survival_rate FROM passengers GROUP BY Pclass, Sex ORDER BY survival_rate DESC;", alternativeSolutions: [], expectedResult: { columns: ["Pclass", "Sex", "count", "survival_rate"], rowCount: 6, preview: [[1, "female", 94, 96.8], [2, "female", 76, 92.1], [3, "female", 144, 50.0], [1, "male", 122, 36.9], [2, "male", 108, 15.7], [3, "male", 347, 13.5]], fullResult: true, note: "First class women: 97%!" }, explanation: "Class × gender survival analysis." },
        { id: "d30q3", difficulty: "medium", points: 15, title: "Age Groups", description: "Survival by Child/Adult/Senior.", solution: "SELECT CASE WHEN Age < 18 THEN 'Child' WHEN Age <= 60 THEN 'Adult' ELSE 'Senior' END AS age_group, COUNT(*) AS count, ROUND(AVG(Survived) * 100, 1) AS survival_rate FROM passengers WHERE Age IS NOT NULL GROUP BY CASE WHEN Age < 18 THEN 'Child' WHEN Age <= 60 THEN 'Adult' ELSE 'Senior' END ORDER BY survival_rate DESC;", alternativeSolutions: [], expectedResult: { columns: ["age_group", "count", "survival_rate"], rowCount: 3, preview: [["Child", 113, 54.0], ["Adult", 563, 38.4], ["Senior", 38, 22.7]], fullResult: true, note: "Children: 54% survival" }, explanation: "Age group analysis with CASE." },
        { id: "d30q4", difficulty: "medium-hard", points: 20, title: "Top Survivors", description: "Top 3 highest-paying survivors per class.", solution: "SELECT * FROM (SELECT Name, Pclass, Fare, ROW_NUMBER() OVER (PARTITION BY Pclass ORDER BY Fare DESC) AS rank FROM passengers WHERE Survived = 1) WHERE rank <= 3 ORDER BY Pclass, rank;", alternativeSolutions: [], expectedResult: { columns: ["Name", "Pclass", "Fare", "rank"], rowCount: 9, preview: [["Cardeza, Mr. Thomas Drake Martinez", 1, 512.33, 1], ["Ward, Miss. Anna", 1, 512.33, 2]], note: "Top 3 per class" }, explanation: "Window function + filter." },
        { id: "d30q5", difficulty: "hard", points: 25, title: "Port Analysis", description: "Per port: passengers, survivors, avg_fare, avg_age, common_class.", solution: "WITH port_stats AS (SELECT Embarked, COUNT(*) AS passengers, SUM(Survived) AS survivors, ROUND(AVG(Fare), 2) AS avg_fare, ROUND(AVG(Age), 1) AS avg_age FROM passengers WHERE Embarked IS NOT NULL AND Embarked != '' GROUP BY Embarked) SELECT p.*, (SELECT Pclass FROM passengers WHERE Embarked = p.Embarked GROUP BY Pclass ORDER BY COUNT(*) DESC LIMIT 1) AS common_class FROM port_stats p ORDER BY passengers DESC;", alternativeSolutions: [], expectedResult: { columns: ["Embarked", "passengers", "survivors", "avg_fare", "avg_age", "common_class"], rowCount: 3, preview: [["S", 644, 217, 27.08, 29.4, 3], ["C", 168, 93, 59.95, 30.8, 1], ["Q", 77, 30, 13.28, 28.1, 3]], fullResult: true, note: "Complete port analysis!" }, explanation: "CTE + aggregates + correlated subquery!" }
      ]
    }
  ];

  // Add days to main curriculum
  if (window.sqlChallenge30Days && window.sqlChallenge30Days.days) {
    window.sqlChallenge30Days.days = window.sqlChallenge30Days.days.concat(additionalDays);
  }

  console.log("Days 16-30 loaded: " + additionalDays.length + " days, " + (additionalDays.length * 5) + " questions");
})();

// Helper functions
window.getDayData = function(dayNum) {
  return window.sqlChallenge30Days?.days?.find(d => d.day === dayNum);
};

window.challengeScoring = {
  easy: { points: 5, hintPenalty: 2 },
  "easy-medium": { points: 10, hintPenalty: 3 },
  medium: { points: 15, hintPenalty: 5 },
  "medium-hard": { points: 20, hintPenalty: 6 },
  hard: { points: 25, hintPenalty: 8 },
  passRequirement: 3,
  perfectBonus: 10
};

console.log("30-Day SQL Challenge complete!");
