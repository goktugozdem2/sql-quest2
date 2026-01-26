// ============================================================
// SQL QUEST: 30-DAY CHALLENGE - DAYS 11-30
// Continuation of the curriculum
// ============================================================

// Merge with days 1-10 from thirty-day-questions-1.js
(function() {
  // Days 11-30 to be added to the main curriculum
  const additionalDays = [
    
    // ========== DAY 11: LIKE Pattern Matching ==========
    {
      day: 11,
      week: 2,
      title: "LIKE & Pattern Matching",
      description: "Search for patterns in text data",
      concepts: ["LIKE", "%", "_", "Pattern matching"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers", relevantColumns: ["Name", "Ticket", "Cabin"], totalRows: 891 },
      lesson: `# Pattern Matching with LIKE 🔎

## Wildcards
- **%** matches any sequence (0+ characters)
- **_** matches exactly one character

\`\`\`sql
SELECT * FROM passengers WHERE Name LIKE 'A%';     -- Starts with A
SELECT * FROM passengers WHERE Name LIKE '%son';   -- Ends with son
SELECT * FROM passengers WHERE Name LIKE '%Mrs.%'; -- Contains Mrs.
\`\`\``,
      questions: [
        { id: "d11q1", difficulty: "easy", title: "Names Starting With", description: "Find passengers whose **Name starts with 'B'**.", hint: "LIKE 'B%'", solution: "SELECT Name FROM passengers WHERE Name LIKE 'B%';", alternativeSolutions: [], expectedOutput: { columns: ["Name"], rowCount: 72, sampleRows: [["Braund, Mr. Owen Harris"], ["Bonnell, Miss. Elizabeth"]] }, explanation: "LIKE 'B%' finds names starting with B." },
        { id: "d11q2", difficulty: "easy-medium", title: "Contains Pattern", description: "Find passengers whose **Name contains 'Mrs.'**.", hint: "Use % on both sides: '%Mrs.%'", solution: "SELECT Name FROM passengers WHERE Name LIKE '%Mrs.%';", alternativeSolutions: [], expectedOutput: { columns: ["Name"], rowCount: 129, sampleRows: [["Cumings, Mrs. John Bradley"]] }, explanation: "% on both sides finds pattern anywhere." },
        { id: "d11q3", difficulty: "medium", title: "Ends With Pattern", description: "Find passengers whose **Name ends with 'son'**.", hint: "LIKE '%son'", solution: "SELECT Name FROM passengers WHERE Name LIKE '%son';", alternativeSolutions: [], expectedOutput: { columns: ["Name"], rowCount: 32, sampleRows: [["Andersson, Mr. Anders Johan"]] }, explanation: "Many Scandinavian names end in 'son'." },
        { id: "d11q4", difficulty: "medium-hard", title: "Title Search", description: "Find all passengers with **'Master'** in their name (young boys).", hint: "%Master%", solution: "SELECT Name, Age FROM passengers WHERE Name LIKE '%Master%';", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Age"], rowCount: 40, sampleRows: [["Palsson, Master. Gosta Leonard", 2]] }, explanation: "'Master' was title for young boys." },
        { id: "d11q5", difficulty: "hard", title: "Complex Pattern", description: "Find passengers whose name **starts with 'S'** and **contains 'Miss'**.", hint: "LIKE 'S%' AND LIKE '%Miss%'", solution: "SELECT Name FROM passengers WHERE Name LIKE 'S%' AND Name LIKE '%Miss%';", alternativeSolutions: [], expectedOutput: { columns: ["Name"], rowCount: 12, sampleRows: [["Sandstrom, Miss. Marguerite Rut"]] }, explanation: "Combine multiple LIKE conditions." }
      ]
    },

    // ========== DAY 12: NULL Handling ==========
    {
      day: 12,
      week: 2,
      title: "Working with NULL",
      description: "Handle missing values in queries",
      concepts: ["NULL", "IS NULL", "IS NOT NULL", "COALESCE"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers", relevantColumns: ["Name", "Age", "Cabin", "Embarked"], totalRows: 891 },
      lesson: `# Handling NULL Values ❓

NULL means "unknown" - NOT the same as 0 or empty string.

\`\`\`sql
SELECT * FROM passengers WHERE Age IS NULL;      -- Find NULLs
SELECT * FROM passengers WHERE Age IS NOT NULL;  -- Exclude NULLs
SELECT COALESCE(Age, 0) FROM passengers;         -- Replace NULL with 0
\`\`\``,
      questions: [
        { id: "d12q1", difficulty: "easy", title: "Find Missing Ages", description: "Find passengers with **unknown age** (NULL).", hint: "WHERE Age IS NULL", solution: "SELECT Name FROM passengers WHERE Age IS NULL;", alternativeSolutions: [], expectedOutput: { columns: ["Name"], rowCount: 177, sampleRows: [["Storey, Mr. Thomas"]] }, explanation: "IS NULL finds missing values." },
        { id: "d12q2", difficulty: "easy-medium", title: "Known Ages", description: "Find passengers with **known age** (NOT NULL).", hint: "WHERE Age IS NOT NULL", solution: "SELECT Name, Age FROM passengers WHERE Age IS NOT NULL;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Age"], rowCount: 714, sampleRows: [["Braund, Mr. Owen Harris", 22]] }, explanation: "714 of 891 have recorded ages." },
        { id: "d12q3", difficulty: "medium", title: "Has Cabin", description: "Count passengers **with** a cabin assigned.", hint: "WHERE Cabin IS NOT NULL", solution: "SELECT COUNT(*) AS has_cabin FROM passengers WHERE Cabin IS NOT NULL;", alternativeSolutions: [], expectedOutput: { columns: ["has_cabin"], rowCount: 1, sampleRows: [[204]] }, explanation: "Only 204 had cabin numbers recorded." },
        { id: "d12q4", difficulty: "medium-hard", title: "Replace NULL Age", description: "Show Name and Age, **replacing NULL with 0**.", hint: "COALESCE(Age, 0)", solution: "SELECT Name, COALESCE(Age, 0) AS age_filled FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "age_filled"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 22]] }, explanation: "COALESCE provides default for NULL." },
        { id: "d12q5", difficulty: "hard", title: "NULL Statistics", description: "Count NULL vs NOT NULL ages in one query.", hint: "SUM with CASE WHEN", solution: "SELECT SUM(CASE WHEN Age IS NULL THEN 1 ELSE 0 END) AS null_count, SUM(CASE WHEN Age IS NOT NULL THEN 1 ELSE 0 END) AS not_null_count FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["null_count", "not_null_count"], rowCount: 1, sampleRows: [[177, 714]] }, explanation: "CASE inside SUM counts conditionally." }
      ]
    },

    // ========== DAY 13: CASE Statements ==========
    {
      day: 13,
      week: 2,
      title: "CASE Statements",
      description: "Add conditional logic to queries",
      concepts: ["CASE", "WHEN", "THEN", "ELSE", "END"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers", relevantColumns: ["Name", "Age", "Pclass", "Fare", "Survived"], totalRows: 891 },
      lesson: `# Conditional Logic with CASE 🔀

\`\`\`sql
SELECT Name,
  CASE 
    WHEN Age < 18 THEN 'Child'
    WHEN Age < 65 THEN 'Adult'
    ELSE 'Senior'
  END AS age_group
FROM passengers;
\`\`\``,
      questions: [
        { id: "d13q1", difficulty: "easy", title: "Survival Status", description: "Show status: 'Survived' or 'Died' based on Survived column.", hint: "CASE WHEN Survived = 1 THEN 'Survived' ELSE 'Died' END", solution: "SELECT Name, CASE WHEN Survived = 1 THEN 'Survived' ELSE 'Died' END AS status FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "status"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", "Died"]] }, explanation: "CASE transforms codes into labels." },
        { id: "d13q2", difficulty: "easy-medium", title: "Class Names", description: "Show class_name: 'First', 'Second', or 'Third'.", hint: "CASE Pclass WHEN 1 THEN 'First'...", solution: "SELECT Name, CASE Pclass WHEN 1 THEN 'First' WHEN 2 THEN 'Second' ELSE 'Third' END AS class_name FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "class_name"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", "Third"]] }, explanation: "Simple CASE for value mapping." },
        { id: "d13q3", difficulty: "medium", title: "Age Groups", description: "Create age_group: 'Child' (<18), 'Adult' (18-59), 'Senior' (60+).", hint: "CASE WHEN with multiple conditions", solution: "SELECT Name, CASE WHEN Age < 18 THEN 'Child' WHEN Age < 60 THEN 'Adult' ELSE 'Senior' END AS age_group FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "age_group"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", "Adult"]] }, explanation: "WHEN conditions checked in order." },
        { id: "d13q4", difficulty: "medium-hard", title: "Fare Categories", description: "Categorize: 'Budget' (<20), 'Standard' (20-100), 'Premium' (>100).", hint: "Three WHEN clauses based on Fare", solution: "SELECT Name, Fare, CASE WHEN Fare < 20 THEN 'Budget' WHEN Fare <= 100 THEN 'Standard' ELSE 'Premium' END AS fare_category FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "fare_category"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 7.25, "Budget"]] }, explanation: "CASE creates categories from numbers." },
        { id: "d13q5", difficulty: "hard", title: "Count by Category", description: "Count passengers in each age_group (Child/Adult/Senior).", hint: "SUM(CASE WHEN ... THEN 1 ELSE 0 END)", solution: "SELECT SUM(CASE WHEN Age < 18 THEN 1 ELSE 0 END) AS children, SUM(CASE WHEN Age >= 18 AND Age < 60 THEN 1 ELSE 0 END) AS adults, SUM(CASE WHEN Age >= 60 THEN 1 ELSE 0 END) AS seniors FROM passengers WHERE Age IS NOT NULL;", alternativeSolutions: [], expectedOutput: { columns: ["children", "adults", "seniors"], rowCount: 1, sampleRows: [[113, 563, 38]] }, explanation: "CASE inside SUM for pivot-style counts." }
      ]
    },

    // ========== DAY 14: Subqueries Basics ==========
    {
      day: 14,
      week: 2,
      title: "Introduction to Subqueries",
      description: "Use queries inside other queries",
      concepts: ["Subquery", "Nested query", "Scalar subquery"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers", relevantColumns: ["Name", "Age", "Fare", "Pclass"], totalRows: 891 },
      lesson: `# Subqueries - Query Inside Query 🎭

\`\`\`sql
SELECT * FROM passengers
WHERE Fare > (SELECT AVG(Fare) FROM passengers);
\`\`\`

The inner query runs first, outer query uses the result.`,
      questions: [
        { id: "d14q1", difficulty: "easy", title: "Above Average Fare", description: "Find passengers who paid **more than average fare**.", hint: "WHERE Fare > (SELECT AVG(Fare) ...)", solution: "SELECT Name, Fare FROM passengers WHERE Fare > (SELECT AVG(Fare) FROM passengers);", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare"], rowCount: 164, sampleRows: [["Cumings, Mrs. John Bradley", 71.28]] }, explanation: "164 paid more than $32 average." },
        { id: "d14q2", difficulty: "easy-medium", title: "Above Average Age", description: "Find passengers **older than average age**.", hint: "WHERE Age > (SELECT AVG(Age) ...)", solution: "SELECT Name, Age FROM passengers WHERE Age > (SELECT AVG(Age) FROM passengers);", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Age"], rowCount: 303, sampleRows: [["Cumings, Mrs. John Bradley", 38]] }, explanation: "303 were older than ~30 average." },
        { id: "d14q3", difficulty: "medium", title: "Maximum Fare", description: "Find passenger(s) who paid the **maximum fare**.", hint: "WHERE Fare = (SELECT MAX(Fare) ...)", solution: "SELECT Name, Fare FROM passengers WHERE Fare = (SELECT MAX(Fare) FROM passengers);", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare"], rowCount: 3, sampleRows: [["Ward, Miss. Anna", 512.33]] }, explanation: "3 passengers shared max fare." },
        { id: "d14q4", difficulty: "medium-hard", title: "First Class Above Average", description: "Find **first class** passengers above overall average fare.", hint: "WHERE Pclass = 1 AND Fare > (SELECT AVG(Fare) ...)", solution: "SELECT Name, Pclass, Fare FROM passengers WHERE Pclass = 1 AND Fare > (SELECT AVG(Fare) FROM passengers);", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Pclass", "Fare"], rowCount: 160, sampleRows: [["Cumings, Mrs. John Bradley", 1, 71.28]] }, explanation: "Most first class paid above average." },
        { id: "d14q5", difficulty: "hard", title: "Oldest Passenger", description: "Find the passenger with **maximum age**.", hint: "WHERE Age = (SELECT MAX(Age) ...)", solution: "SELECT Name, Age FROM passengers WHERE Age = (SELECT MAX(Age) FROM passengers);", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Age"], rowCount: 1, sampleRows: [["Barkworth, Mr. Algernon Henry Wilson", 80]] }, explanation: "One person was 80 years old." }
      ]
    },

    // ========== DAY 15: INNER JOIN ==========
    {
      day: 15,
      week: 3,
      title: "INNER JOIN",
      description: "Combine data from multiple tables",
      concepts: ["INNER JOIN", "ON", "Table aliases"],
      dataset: "ecommerce",
      tableInfo: { tables: ["customers", "orders"], relevantColumns: { customers: ["id", "name"], orders: ["customer_id", "total"] } },
      lesson: `# JOINs - Combining Tables 🔗

\`\`\`sql
SELECT c.name, o.total
FROM customers c
INNER JOIN orders o ON c.id = o.customer_id;
\`\`\`

INNER JOIN returns only matching rows from both tables.`,
      questions: [
        { id: "d15q1", difficulty: "easy", title: "Basic Join", description: "Join customers and orders. Show name and total.", hint: "INNER JOIN orders ON customers.id = orders.customer_id", solution: "SELECT customers.name, orders.total FROM customers INNER JOIN orders ON customers.id = orders.customer_id;", alternativeSolutions: ["SELECT c.name, o.total FROM customers c INNER JOIN orders o ON c.id = o.customer_id;"], expectedOutput: { columns: ["name", "total"], rowCount: 50, sampleRows: [["Alice Johnson", 150.00]] }, explanation: "JOIN connects tables via foreign key." },
        { id: "d15q2", difficulty: "easy-medium", title: "Join with Aliases", description: "Same query using **c** and **o** as aliases.", hint: "FROM customers c INNER JOIN orders o", solution: "SELECT c.name, o.total FROM customers c INNER JOIN orders o ON c.id = o.customer_id;", alternativeSolutions: [], expectedOutput: { columns: ["name", "total"], rowCount: 50, sampleRows: [["Alice Johnson", 150.00]] }, explanation: "Aliases make queries shorter." },
        { id: "d15q3", difficulty: "medium", title: "Join Multiple Columns", description: "Show customer name, city, order total, and order_date.", hint: "Select from both tables after JOIN", solution: "SELECT c.name, c.city, o.total, o.order_date FROM customers c INNER JOIN orders o ON c.id = o.customer_id;", alternativeSolutions: [], expectedOutput: { columns: ["name", "city", "total", "order_date"], rowCount: 50, sampleRows: [["Alice Johnson", "New York", 150.00, "2024-01-15"]] }, explanation: "Access any column after JOIN." },
        { id: "d15q4", difficulty: "medium-hard", title: "Join with Filter", description: "Find orders **over $100**. Show name and total.", hint: "WHERE o.total > 100", solution: "SELECT c.name, o.total FROM customers c INNER JOIN orders o ON c.id = o.customer_id WHERE o.total > 100;", alternativeSolutions: [], expectedOutput: { columns: ["name", "total"], rowCount: 20, sampleRows: [["Alice Johnson", 150.00]] }, explanation: "WHERE filters joined results." },
        { id: "d15q5", difficulty: "hard", title: "Join with Aggregation", description: "For each customer, show name and **total_spent** (SUM of orders).", hint: "GROUP BY c.name with SUM(o.total)", solution: "SELECT c.name, SUM(o.total) AS total_spent FROM customers c INNER JOIN orders o ON c.id = o.customer_id GROUP BY c.name;", alternativeSolutions: [], expectedOutput: { columns: ["name", "total_spent"], rowCount: 25, sampleRows: [["Alice Johnson", 450.00]] }, explanation: "JOIN + GROUP BY for customer totals." }
      ]
    },

    // ========== DAY 16: LEFT JOIN ==========
    {
      day: 16,
      week: 3,
      title: "LEFT JOIN",
      description: "Include all rows from left table",
      concepts: ["LEFT JOIN", "NULL in joins", "Finding missing"],
      dataset: "ecommerce",
      tableInfo: { tables: ["customers", "orders"] },
      lesson: `# LEFT JOIN 📋

\`\`\`sql
SELECT c.name, o.total
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id;
\`\`\`

Returns ALL customers, even those without orders (total = NULL).`,
      questions: [
        { id: "d16q1", difficulty: "easy", title: "Basic Left Join", description: "LEFT JOIN to show all customers and their orders (NULL if none).", hint: "LEFT JOIN keeps all left table rows", solution: "SELECT c.name, o.total FROM customers c LEFT JOIN orders o ON c.id = o.customer_id;", alternativeSolutions: [], expectedOutput: { columns: ["name", "total"], rowCount: 55, sampleRows: [["Alice Johnson", 150.00], ["New Customer", null]] }, explanation: "LEFT JOIN includes customers without orders." },
        { id: "d16q2", difficulty: "easy-medium", title: "Count Orders", description: "Show all customers with their order count (0 if none).", hint: "COUNT(o.id) counts non-NULL", solution: "SELECT c.name, COUNT(o.id) AS order_count FROM customers c LEFT JOIN orders o ON c.id = o.customer_id GROUP BY c.name;", alternativeSolutions: [], expectedOutput: { columns: ["name", "order_count"], rowCount: 30, sampleRows: [["Alice Johnson", 3], ["New Customer", 0]] }, explanation: "COUNT(column) ignores NULL." },
        { id: "d16q3", difficulty: "medium", title: "Find No Orders", description: "Find customers who **never ordered**.", hint: "WHERE o.id IS NULL", solution: "SELECT c.name FROM customers c LEFT JOIN orders o ON c.id = o.customer_id WHERE o.id IS NULL;", alternativeSolutions: [], expectedOutput: { columns: ["name"], rowCount: 5, sampleRows: [["New Customer"]] }, explanation: "NULL check finds missing orders." },
        { id: "d16q4", difficulty: "medium-hard", title: "Customer Summary", description: "All customers: name, order_count, total_spent (0 if none).", hint: "COALESCE(SUM(...), 0)", solution: "SELECT c.name, COUNT(o.id) AS order_count, COALESCE(SUM(o.total), 0) AS total_spent FROM customers c LEFT JOIN orders o ON c.id = o.customer_id GROUP BY c.name;", alternativeSolutions: [], expectedOutput: { columns: ["name", "order_count", "total_spent"], rowCount: 30, sampleRows: [["Alice Johnson", 3, 450.00]] }, explanation: "COALESCE handles NULL sums." },
        { id: "d16q5", difficulty: "hard", title: "No Cabin Passengers", description: "Find Titanic passengers with no cabin (NULL or empty).", hint: "WHERE Cabin IS NULL OR Cabin = ''", solution: "SELECT Name FROM passengers WHERE Cabin IS NULL OR Cabin = '';", alternativeSolutions: [], expectedOutput: { columns: ["Name"], rowCount: 687, sampleRows: [["Braund, Mr. Owen Harris"]] }, explanation: "Finding missing data pattern." }
      ]
    },

    // ========== DAY 17: UNION ==========
    {
      day: 17,
      week: 3,
      title: "UNION & UNION ALL",
      description: "Combine results from multiple queries",
      concepts: ["UNION", "UNION ALL", "Set operations"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers" },
      lesson: `# UNION - Combining Results 📋

\`\`\`sql
SELECT Name FROM passengers WHERE Pclass = 1
UNION
SELECT Name FROM passengers WHERE Survived = 1;
\`\`\`

UNION removes duplicates. UNION ALL keeps all rows.`,
      questions: [
        { id: "d17q1", difficulty: "easy", title: "Simple Union", description: "Get names of first class OR survivors using UNION.", hint: "Two SELECT statements with UNION", solution: "SELECT Name FROM passengers WHERE Pclass = 1 UNION SELECT Name FROM passengers WHERE Survived = 1;", alternativeSolutions: [], expectedOutput: { columns: ["Name"], rowCount: 422, sampleRows: [["Cumings, Mrs. John Bradley"]] }, explanation: "UNION combines and removes duplicates." },
        { id: "d17q2", difficulty: "easy-medium", title: "Union All", description: "Same query with UNION ALL (keep duplicates).", hint: "UNION ALL doesn't remove duplicates", solution: "SELECT Name FROM passengers WHERE Pclass = 1 UNION ALL SELECT Name FROM passengers WHERE Survived = 1;", alternativeSolutions: [], expectedOutput: { columns: ["Name"], rowCount: 558, sampleRows: [["Cumings, Mrs. John Bradley"]] }, explanation: "558 vs 422: 136 are in both groups." },
        { id: "d17q3", difficulty: "medium", title: "Labeled Union", description: "Show 'First Class' count and 'Survivors' count as two rows.", hint: "SELECT 'First Class' AS category, COUNT(*)", solution: "SELECT 'First Class' AS category, COUNT(*) AS count FROM passengers WHERE Pclass = 1 UNION ALL SELECT 'Survivors', COUNT(*) FROM passengers WHERE Survived = 1;", alternativeSolutions: [], expectedOutput: { columns: ["category", "count"], rowCount: 2, sampleRows: [["First Class", 216], ["Survivors", 342]] }, explanation: "Labels make summary reports readable." },
        { id: "d17q4", difficulty: "medium-hard", title: "Three-Way Union", description: "Count each class as three labeled rows.", hint: "Three SELECTs with UNION ALL", solution: "SELECT 'First' AS class, COUNT(*) AS count FROM passengers WHERE Pclass = 1 UNION ALL SELECT 'Second', COUNT(*) FROM passengers WHERE Pclass = 2 UNION ALL SELECT 'Third', COUNT(*) FROM passengers WHERE Pclass = 3;", alternativeSolutions: [], expectedOutput: { columns: ["class", "count"], rowCount: 3, sampleRows: [["First", 216], ["Second", 184], ["Third", 491]] }, explanation: "Chain multiple UNIONs." },
        { id: "d17q5", difficulty: "hard", title: "Survival Report", description: "Create: Male Survivors, Female Survivors, Male Deaths, Female Deaths.", hint: "Four SELECTs with Sex and Survived conditions", solution: "SELECT 'Male Survivors' AS category, COUNT(*) AS count FROM passengers WHERE Sex = 'male' AND Survived = 1 UNION ALL SELECT 'Female Survivors', COUNT(*) FROM passengers WHERE Sex = 'female' AND Survived = 1 UNION ALL SELECT 'Male Deaths', COUNT(*) FROM passengers WHERE Sex = 'male' AND Survived = 0 UNION ALL SELECT 'Female Deaths', COUNT(*) FROM passengers WHERE Sex = 'female' AND Survived = 0;", alternativeSolutions: [], expectedOutput: { columns: ["category", "count"], rowCount: 4, sampleRows: [["Male Survivors", 109], ["Female Survivors", 233]] }, explanation: "Comprehensive survival breakdown." }
      ]
    },

    // ========== DAY 18: String Functions ==========
    {
      day: 18,
      week: 3,
      title: "String Functions",
      description: "Manipulate text data",
      concepts: ["UPPER", "LOWER", "LENGTH", "SUBSTR", "REPLACE"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers", relevantColumns: ["Name"] },
      lesson: `# String Functions 📝

\`\`\`sql
SELECT UPPER(Name) FROM passengers;   -- UPPERCASE
SELECT LOWER(Name) FROM passengers;   -- lowercase
SELECT LENGTH(Name) FROM passengers;  -- character count
SELECT SUBSTR(Name, 1, 10) FROM passengers; -- first 10 chars
\`\`\``,
      questions: [
        { id: "d18q1", difficulty: "easy", title: "Uppercase Names", description: "Show all names in **UPPERCASE**.", hint: "UPPER(Name)", solution: "SELECT UPPER(Name) AS name_upper FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["name_upper"], rowCount: 891, sampleRows: [["BRAUND, MR. OWEN HARRIS"]] }, explanation: "UPPER converts to uppercase." },
        { id: "d18q2", difficulty: "easy-medium", title: "Name Length", description: "Show Name and its **length**.", hint: "LENGTH(Name)", solution: "SELECT Name, LENGTH(Name) AS name_length FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "name_length"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 24]] }, explanation: "LENGTH counts characters." },
        { id: "d18q3", difficulty: "medium", title: "First 15 Characters", description: "Show **first 15 characters** of each name.", hint: "SUBSTR(Name, 1, 15)", solution: "SELECT SUBSTR(Name, 1, 15) AS short_name FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["short_name"], rowCount: 891, sampleRows: [["Braund, Mr. Owe"]] }, explanation: "SUBSTR extracts substring." },
        { id: "d18q4", difficulty: "medium-hard", title: "Replace Text", description: "Replace **'Mr.'** with **'Mister'** in names.", hint: "REPLACE(Name, 'Mr.', 'Mister')", solution: "SELECT REPLACE(Name, 'Mr.', 'Mister') AS formal_name FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["formal_name"], rowCount: 891, sampleRows: [["Braund, Mister Owen Harris"]] }, explanation: "REPLACE substitutes text." },
        { id: "d18q5", difficulty: "hard", title: "Extract Last Name", description: "Extract the **last name** (text before comma).", hint: "SUBSTR with INSTR to find comma", solution: "SELECT SUBSTR(Name, 1, INSTR(Name, ',')-1) AS last_name FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["last_name"], rowCount: 891, sampleRows: [["Braund"], ["Cumings"]] }, explanation: "INSTR finds position of character." }
      ]
    },

    // ========== DAY 19: Math Functions ==========
    {
      day: 19,
      week: 3,
      title: "Math Functions",
      description: "Perform calculations and rounding",
      concepts: ["ROUND", "ABS", "Arithmetic"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers", relevantColumns: ["Name", "Age", "Fare", "SibSp", "Parch"] },
      lesson: `# Math Functions 🔢

\`\`\`sql
SELECT ROUND(Fare, 2) FROM passengers;  -- 2 decimals
SELECT ROUND(Fare, 0) FROM passengers;  -- whole number
SELECT ABS(-5);  -- 5 (absolute value)
\`\`\``,
      questions: [
        { id: "d19q1", difficulty: "easy", title: "Round Fare", description: "Show Name and Fare **rounded to whole numbers**.", hint: "ROUND(Fare, 0)", solution: "SELECT Name, ROUND(Fare, 0) AS fare_rounded FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "fare_rounded"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 7]] }, explanation: "ROUND to nearest integer." },
        { id: "d19q2", difficulty: "easy-medium", title: "Two Decimals", description: "Show Fare rounded to **2 decimal places**.", hint: "ROUND(Fare, 2)", solution: "SELECT Name, ROUND(Fare, 2) AS fare_rounded FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "fare_rounded"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 7.25]] }, explanation: "ROUND with precision." },
        { id: "d19q3", difficulty: "medium", title: "Family Size", description: "Calculate **family_size** = SibSp + Parch + 1.", hint: "Simple addition", solution: "SELECT Name, SibSp + Parch + 1 AS family_size FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "family_size"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 2]] }, explanation: "Add columns for family total." },
        { id: "d19q4", difficulty: "medium-hard", title: "Fare Per Person", description: "Calculate fare_per_person = Fare / family_size, rounded to 2 decimals.", hint: "ROUND(Fare / (SibSp + Parch + 1), 2)", solution: "SELECT Name, ROUND(Fare / (SibSp + Parch + 1), 2) AS fare_per_person FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "fare_per_person"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 3.63]] }, explanation: "Division with rounding." },
        { id: "d19q5", difficulty: "hard", title: "Fare Statistics", description: "Calculate avg_fare, min_fare, max_fare, fare_range (all rounded).", hint: "Multiple aggregates with ROUND", solution: "SELECT ROUND(AVG(Fare), 2) AS avg_fare, ROUND(MIN(Fare), 2) AS min_fare, ROUND(MAX(Fare), 2) AS max_fare, ROUND(MAX(Fare) - MIN(Fare), 2) AS fare_range FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["avg_fare", "min_fare", "max_fare", "fare_range"], rowCount: 1, sampleRows: [[32.2, 0, 512.33, 512.33]] }, explanation: "Statistical summary with rounding." }
      ]
    },

    // ========== DAY 20: Date Functions ==========
    {
      day: 20,
      week: 3,
      title: "Date Functions",
      description: "Work with dates in SQL",
      concepts: ["date()", "strftime()", "Date arithmetic"],
      dataset: "ecommerce",
      tableInfo: { tables: ["orders"], relevantColumns: ["order_date", "total"] },
      lesson: `# Date Functions 📅

\`\`\`sql
SELECT date('now');  -- today
SELECT strftime('%Y', order_date) AS year FROM orders;  -- extract year
SELECT strftime('%m', order_date) AS month FROM orders; -- extract month
\`\`\``,
      questions: [
        { id: "d20q1", difficulty: "easy", title: "Current Date", description: "Select today's date.", hint: "date('now')", solution: "SELECT date('now') AS today;", alternativeSolutions: [], expectedOutput: { columns: ["today"], rowCount: 1, sampleRows: [["2024-01-15"]] }, explanation: "date('now') returns current date." },
        { id: "d20q2", difficulty: "easy-medium", title: "Extract Year", description: "Extract the **year** from order_date.", hint: "strftime('%Y', order_date)", solution: "SELECT order_date, strftime('%Y', order_date) AS year FROM orders;", alternativeSolutions: [], expectedOutput: { columns: ["order_date", "year"], rowCount: 50, sampleRows: [["2024-01-15", "2024"]] }, explanation: "strftime extracts date parts." },
        { id: "d20q3", difficulty: "medium", title: "Year and Month", description: "Extract **year** and **month** from order_date.", hint: "%Y for year, %m for month", solution: "SELECT strftime('%Y', order_date) AS year, strftime('%m', order_date) AS month FROM orders;", alternativeSolutions: [], expectedOutput: { columns: ["year", "month"], rowCount: 50, sampleRows: [["2024", "01"]] }, explanation: "Multiple date extractions." },
        { id: "d20q4", difficulty: "medium-hard", title: "Orders by Month", description: "Count orders per **month**.", hint: "GROUP BY year-month", solution: "SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS order_count FROM orders GROUP BY strftime('%Y-%m', order_date);", alternativeSolutions: [], expectedOutput: { columns: ["month", "order_count"], rowCount: 6, sampleRows: [["2024-01", 12]] }, explanation: "Group by year-month for monthly totals." },
        { id: "d20q5", difficulty: "hard", title: "Recent Orders", description: "Find orders from **last 30 days** (conceptually).", hint: "WHERE order_date >= date('now', '-30 days')", solution: "SELECT * FROM orders WHERE order_date >= date('now', '-30 days');", alternativeSolutions: [], expectedOutput: { columns: ["id", "customer_id", "order_date", "total", "status"], rowCount: 15, sampleRows: [] }, explanation: "Date arithmetic for filtering." }
      ]
    },

    // ========== DAY 21: Window Functions - ROW_NUMBER ==========
    {
      day: 21,
      week: 3,
      title: "Window Functions: ROW_NUMBER",
      description: "Number and rank rows",
      concepts: ["ROW_NUMBER", "OVER", "PARTITION BY"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers" },
      lesson: `# Window Functions 🪟

\`\`\`sql
SELECT Name, Fare,
  ROW_NUMBER() OVER (ORDER BY Fare DESC) AS rank
FROM passengers;
\`\`\`

Numbers rows based on ORDER BY.`,
      questions: [
        { id: "d21q1", difficulty: "easy", title: "Simple Row Number", description: "Add row_num ordered by PassengerId.", hint: "ROW_NUMBER() OVER (ORDER BY PassengerId)", solution: "SELECT Name, PassengerId, ROW_NUMBER() OVER (ORDER BY PassengerId) AS row_num FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "PassengerId", "row_num"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 1, 1]] }, explanation: "ROW_NUMBER assigns sequential numbers." },
        { id: "d21q2", difficulty: "easy-medium", title: "Rank by Fare", description: "Rank passengers by Fare descending.", hint: "ORDER BY Fare DESC in OVER", solution: "SELECT Name, Fare, ROW_NUMBER() OVER (ORDER BY Fare DESC) AS fare_rank FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "fare_rank"], rowCount: 891, sampleRows: [["Ward, Miss. Anna", 512.33, 1]] }, explanation: "Highest fare = rank 1." },
        { id: "d21q3", difficulty: "medium", title: "Top 5 Fares", description: "Find **top 5** by fare using ROW_NUMBER.", hint: "Subquery with WHERE rank <= 5", solution: "SELECT * FROM (SELECT Name, Fare, ROW_NUMBER() OVER (ORDER BY Fare DESC) AS rank FROM passengers) WHERE rank <= 5;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "rank"], rowCount: 5, sampleRows: [["Ward, Miss. Anna", 512.33, 1]] }, explanation: "Filter window function in subquery." },
        { id: "d21q4", difficulty: "medium-hard", title: "Youngest Passengers", description: "Rank by Age ascending (youngest = 1).", hint: "ORDER BY Age ASC, exclude NULL", solution: "SELECT Name, Age, ROW_NUMBER() OVER (ORDER BY Age ASC) AS age_rank FROM passengers WHERE Age IS NOT NULL;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Age", "age_rank"], rowCount: 714, sampleRows: [["Thomas, Master. Assad Alexander", 0.42, 1]] }, explanation: "Youngest gets rank 1." },
        { id: "d21q5", difficulty: "hard", title: "Rank Within Class", description: "Rank by Fare **within each Pclass**.", hint: "PARTITION BY Pclass", solution: "SELECT Name, Pclass, Fare, ROW_NUMBER() OVER (PARTITION BY Pclass ORDER BY Fare DESC) AS class_rank FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Pclass", "Fare", "class_rank"], rowCount: 891, sampleRows: [["Ward, Miss. Anna", 1, 512.33, 1]] }, explanation: "PARTITION BY creates separate rankings." }
      ]
    },

    // ========== DAY 22: RANK and DENSE_RANK ==========
    {
      day: 22,
      week: 4,
      title: "RANK vs DENSE_RANK",
      description: "Handle ties in rankings",
      concepts: ["RANK", "DENSE_RANK", "Ties"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers" },
      lesson: `# RANK vs DENSE_RANK

\`\`\`sql
-- RANK: 1, 2, 2, 4 (skips after ties)
-- DENSE_RANK: 1, 2, 2, 3 (no skip)
\`\`\``,
      questions: [
        { id: "d22q1", difficulty: "easy", title: "Basic RANK", description: "RANK passengers by Fare descending.", hint: "RANK() OVER (ORDER BY Fare DESC)", solution: "SELECT Name, Fare, RANK() OVER (ORDER BY Fare DESC) AS rank FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "rank"], rowCount: 891, sampleRows: [["Ward, Miss. Anna", 512.33, 1]] }, explanation: "RANK handles ties." },
        { id: "d22q2", difficulty: "easy-medium", title: "DENSE_RANK", description: "Same query with DENSE_RANK.", hint: "DENSE_RANK() instead", solution: "SELECT Name, Fare, DENSE_RANK() OVER (ORDER BY Fare DESC) AS dense_rank FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "dense_rank"], rowCount: 891, sampleRows: [["Ward, Miss. Anna", 512.33, 1]] }, explanation: "DENSE_RANK doesn't skip." },
        { id: "d22q3", difficulty: "medium", title: "Compare Both", description: "Show both RANK and DENSE_RANK.", hint: "Include both functions", solution: "SELECT Name, Fare, RANK() OVER (ORDER BY Fare DESC) AS rank, DENSE_RANK() OVER (ORDER BY Fare DESC) AS dense_rank FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "rank", "dense_rank"], rowCount: 891, sampleRows: [["Ward, Miss. Anna", 512.33, 1, 1]] }, explanation: "See how ties differ." },
        { id: "d22q4", difficulty: "medium-hard", title: "Top 3 Per Class", description: "Find top 3 fares in each class using DENSE_RANK.", hint: "PARTITION BY Pclass, filter <= 3", solution: "SELECT * FROM (SELECT Name, Pclass, Fare, DENSE_RANK() OVER (PARTITION BY Pclass ORDER BY Fare DESC) AS dr FROM passengers) WHERE dr <= 3;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Pclass", "Fare", "dr"], rowCount: 9, sampleRows: [["Ward, Miss. Anna", 1, 512.33, 1]] }, explanation: "Top N per group pattern." },
        { id: "d22q5", difficulty: "hard", title: "Percentile", description: "Show fare percentile (how many paid less).", hint: "PERCENT_RANK or manual calculation", solution: "SELECT Name, Fare, ROUND(PERCENT_RANK() OVER (ORDER BY Fare) * 100, 1) AS percentile FROM passengers WHERE Fare > 0;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "percentile"], rowCount: 876, sampleRows: [] }, explanation: "Percentile ranking." }
      ]
    },

    // ========== DAY 23: LAG and LEAD ==========
    {
      day: 23,
      week: 4,
      title: "LAG and LEAD",
      description: "Access previous and next row values",
      concepts: ["LAG", "LEAD", "Row comparison"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers" },
      lesson: `# LAG & LEAD

\`\`\`sql
LAG(Fare) OVER (ORDER BY PassengerId)  -- previous row
LEAD(Fare) OVER (ORDER BY PassengerId) -- next row
\`\`\``,
      questions: [
        { id: "d23q1", difficulty: "easy", title: "Previous Fare", description: "Show each fare and the **previous** passenger's fare.", hint: "LAG(Fare) OVER (ORDER BY PassengerId)", solution: "SELECT Name, Fare, LAG(Fare) OVER (ORDER BY PassengerId) AS prev_fare FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "prev_fare"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 7.25, null]] }, explanation: "LAG gets previous row (NULL for first)." },
        { id: "d23q2", difficulty: "easy-medium", title: "Next Fare", description: "Show each fare and the **next** passenger's fare.", hint: "LEAD(Fare)", solution: "SELECT Name, Fare, LEAD(Fare) OVER (ORDER BY PassengerId) AS next_fare FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "next_fare"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 7.25, 71.28]] }, explanation: "LEAD gets next row." },
        { id: "d23q3", difficulty: "medium", title: "Fare Difference", description: "Calculate difference from previous fare.", hint: "Fare - LAG(Fare)", solution: "SELECT Name, Fare, Fare - LAG(Fare) OVER (ORDER BY PassengerId) AS fare_diff FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "fare_diff"], rowCount: 891, sampleRows: [["Cumings, Mrs. John Bradley", 71.28, 64.03]] }, explanation: "Subtract for differences." },
        { id: "d23q4", difficulty: "medium-hard", title: "LAG with Default", description: "Show prev_fare with **0** as default.", hint: "LAG(Fare, 1, 0)", solution: "SELECT Name, Fare, LAG(Fare, 1, 0) OVER (ORDER BY PassengerId) AS prev_fare FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "prev_fare"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 7.25, 0]] }, explanation: "Third parameter is default." },
        { id: "d23q5", difficulty: "hard", title: "Compare to Previous", description: "Show +/- if fare is more/less than previous.", hint: "CASE with LAG comparison", solution: "SELECT Name, Fare, CASE WHEN Fare > LAG(Fare) OVER (ORDER BY PassengerId) THEN '+' WHEN Fare < LAG(Fare) OVER (ORDER BY PassengerId) THEN '-' ELSE '=' END AS vs_prev FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "vs_prev"], rowCount: 891, sampleRows: [["Cumings, Mrs. John Bradley", 71.28, "+"]] }, explanation: "CASE with LAG for comparison." }
      ]
    },

    // ========== DAY 24: Running Totals ==========
    {
      day: 24,
      week: 4,
      title: "Running Totals",
      description: "Calculate cumulative values",
      concepts: ["SUM OVER", "Running total", "Cumulative"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers" },
      lesson: `# Running Totals 📈

\`\`\`sql
SELECT Name, Fare,
  SUM(Fare) OVER (ORDER BY PassengerId) AS running_total
FROM passengers;
\`\`\``,
      questions: [
        { id: "d24q1", difficulty: "easy", title: "Running Total", description: "Calculate running total of Fare.", hint: "SUM(Fare) OVER (ORDER BY PassengerId)", solution: "SELECT Name, Fare, SUM(Fare) OVER (ORDER BY PassengerId) AS running_total FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "running_total"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 7.25, 7.25]] }, explanation: "Cumulative sum." },
        { id: "d24q2", difficulty: "easy-medium", title: "Running Count", description: "Add a running count.", hint: "COUNT(*) OVER (ORDER BY PassengerId)", solution: "SELECT Name, COUNT(*) OVER (ORDER BY PassengerId) AS running_count FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "running_count"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 1]] }, explanation: "Running count." },
        { id: "d24q3", difficulty: "medium", title: "Running Average", description: "Calculate running average of Fare.", hint: "AVG(Fare) OVER (...)", solution: "SELECT Name, Fare, ROUND(AVG(Fare) OVER (ORDER BY PassengerId), 2) AS running_avg FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "running_avg"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 7.25, 7.25]] }, explanation: "Running average." },
        { id: "d24q4", difficulty: "medium-hard", title: "Running Total Per Class", description: "Running total within each Pclass.", hint: "PARTITION BY Pclass", solution: "SELECT Name, Pclass, Fare, SUM(Fare) OVER (PARTITION BY Pclass ORDER BY PassengerId) AS class_running_total FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Pclass", "Fare", "class_running_total"], rowCount: 891, sampleRows: [["Cumings, Mrs. John Bradley", 1, 71.28, 71.28]] }, explanation: "PARTITION BY resets totals." },
        { id: "d24q5", difficulty: "hard", title: "Cumulative Percentage", description: "Show fare as % of running total.", hint: "Fare / SUM(Fare) OVER (...) * 100", solution: "SELECT Name, Fare, ROUND(Fare / SUM(Fare) OVER (ORDER BY PassengerId) * 100, 2) AS pct_of_running FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "pct_of_running"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 7.25, 100]] }, explanation: "First row = 100% of itself." }
      ]
    },

    // ========== DAY 25: CTEs ==========
    {
      day: 25,
      week: 4,
      title: "Common Table Expressions (CTE)",
      description: "Write cleaner queries with WITH",
      concepts: ["WITH", "CTE", "Named subquery"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers" },
      lesson: `# CTEs - Clean Subqueries 📋

\`\`\`sql
WITH survivors AS (
  SELECT * FROM passengers WHERE Survived = 1
)
SELECT Pclass, COUNT(*) FROM survivors GROUP BY Pclass;
\`\`\``,
      questions: [
        { id: "d25q1", difficulty: "easy", title: "Simple CTE", description: "CTE for survivors, then count them.", hint: "WITH survivors AS (...) SELECT COUNT(*)", solution: "WITH survivors AS (SELECT * FROM passengers WHERE Survived = 1) SELECT COUNT(*) AS survivor_count FROM survivors;", alternativeSolutions: [], expectedOutput: { columns: ["survivor_count"], rowCount: 1, sampleRows: [[342]] }, explanation: "CTE creates named subquery." },
        { id: "d25q2", difficulty: "easy-medium", title: "CTE with Aggregation", description: "CTE for first class, calculate avg fare.", hint: "WITH first_class AS (...)", solution: "WITH first_class AS (SELECT * FROM passengers WHERE Pclass = 1) SELECT ROUND(AVG(Fare), 2) AS avg_fare FROM first_class;", alternativeSolutions: [], expectedOutput: { columns: ["avg_fare"], rowCount: 1, sampleRows: [[84.15]] }, explanation: "CTE simplifies main query." },
        { id: "d25q3", difficulty: "medium", title: "CTE for Filtering", description: "CTE for above-average fare, count by class.", hint: "Subquery inside CTE", solution: "WITH above_avg AS (SELECT * FROM passengers WHERE Fare > (SELECT AVG(Fare) FROM passengers)) SELECT Pclass, COUNT(*) AS count FROM above_avg GROUP BY Pclass;", alternativeSolutions: [], expectedOutput: { columns: ["Pclass", "count"], rowCount: 3, sampleRows: [[1, 145]] }, explanation: "CTE can contain subqueries." },
        { id: "d25q4", difficulty: "medium-hard", title: "Multiple CTEs", description: "CTEs for male and female, compare survival.", hint: "WITH males AS (...), females AS (...)", solution: "WITH males AS (SELECT * FROM passengers WHERE Sex = 'male'), females AS (SELECT * FROM passengers WHERE Sex = 'female') SELECT 'Male' AS sex, ROUND(AVG(Survived) * 100, 1) AS survival_rate FROM males UNION ALL SELECT 'Female', ROUND(AVG(Survived) * 100, 1) FROM females;", alternativeSolutions: [], expectedOutput: { columns: ["sex", "survival_rate"], rowCount: 2, sampleRows: [["Male", 18.9], ["Female", 74.2]] }, explanation: "Multiple CTEs with comma." },
        { id: "d25q5", difficulty: "hard", title: "CTE with Join", description: "CTE for class avg fare, join to show each passenger vs class avg.", hint: "CTE with GROUP BY, then JOIN", solution: "WITH class_stats AS (SELECT Pclass, AVG(Fare) AS avg_fare FROM passengers GROUP BY Pclass) SELECT p.Name, p.Pclass, p.Fare, ROUND(c.avg_fare, 2) AS class_avg FROM passengers p JOIN class_stats c ON p.Pclass = c.Pclass;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Pclass", "Fare", "class_avg"], rowCount: 891, sampleRows: [["Cumings, Mrs. John Bradley", 1, 71.28, 84.15]] }, explanation: "CTEs can be joined." }
      ]
    },

    // ========== DAY 26: IN and EXISTS ==========
    {
      day: 26,
      week: 4,
      title: "IN and EXISTS",
      description: "Filter using subquery results",
      concepts: ["IN", "NOT IN", "EXISTS"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers" },
      lesson: `# IN and EXISTS

\`\`\`sql
SELECT * FROM passengers
WHERE Pclass IN (1, 2);

SELECT * FROM passengers
WHERE Pclass IN (SELECT Pclass FROM passengers WHERE AVG(Survived) > 0.5);
\`\`\``,
      questions: [
        { id: "d26q1", difficulty: "easy", title: "Simple IN", description: "Find passengers in class 1 or 2.", hint: "WHERE Pclass IN (1, 2)", solution: "SELECT Name, Pclass FROM passengers WHERE Pclass IN (1, 2);", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Pclass"], rowCount: 400, sampleRows: [["Cumings, Mrs. John Bradley", 1]] }, explanation: "IN checks list membership." },
        { id: "d26q2", difficulty: "easy-medium", title: "NOT IN", description: "Find passengers NOT in class 3.", hint: "NOT IN (3)", solution: "SELECT Name, Pclass FROM passengers WHERE Pclass NOT IN (3);", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Pclass"], rowCount: 400, sampleRows: [["Cumings, Mrs. John Bradley", 1]] }, explanation: "NOT IN excludes values." },
        { id: "d26q3", difficulty: "medium", title: "IN with Subquery", description: "Find passengers from ports where avg fare > $30.", hint: "WHERE Embarked IN (SELECT...)", solution: "SELECT Name, Embarked FROM passengers WHERE Embarked IN (SELECT Embarked FROM passengers GROUP BY Embarked HAVING AVG(Fare) > 30);", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Embarked"], rowCount: 812, sampleRows: [["Cumings, Mrs. John Bradley", "C"]] }, explanation: "Subquery returns port list." },
        { id: "d26q4", difficulty: "medium-hard", title: "Classes with High Max Fare", description: "Find passengers whose class has max fare > $200.", hint: "HAVING MAX(Fare) > 200", solution: "SELECT Name, Pclass, Fare FROM passengers WHERE Pclass IN (SELECT Pclass FROM passengers GROUP BY Pclass HAVING MAX(Fare) > 200);", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Pclass", "Fare"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 3, 7.25]] }, explanation: "All classes had someone >$200!" },
        { id: "d26q5", difficulty: "hard", title: "Not Maximum Fare", description: "Find passengers NOT paying max fare for their class.", hint: "NOT IN with MAX(Fare) per class", solution: "SELECT Name, Pclass, Fare FROM passengers WHERE Fare NOT IN (SELECT MAX(Fare) FROM passengers GROUP BY Pclass);", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Pclass", "Fare"], rowCount: 885, sampleRows: [["Braund, Mr. Owen Harris", 3, 7.25]] }, explanation: "Excludes top fare per class." }
      ]
    },

    // ========== DAY 27: COALESCE and NULLIF ==========
    {
      day: 27,
      week: 4,
      title: "COALESCE and NULLIF",
      description: "Handle NULL values elegantly",
      concepts: ["COALESCE", "NULLIF"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers" },
      lesson: `# COALESCE & NULLIF

\`\`\`sql
COALESCE(Cabin, 'No Cabin')  -- first non-NULL
NULLIF(Fare, 0)              -- NULL if equal
\`\`\``,
      questions: [
        { id: "d27q1", difficulty: "easy", title: "Replace NULL", description: "Replace NULL cabins with 'Unknown'.", hint: "COALESCE(Cabin, 'Unknown')", solution: "SELECT Name, COALESCE(Cabin, 'Unknown') AS cabin FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "cabin"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", "Unknown"]] }, explanation: "COALESCE provides default." },
        { id: "d27q2", difficulty: "easy-medium", title: "Default Age", description: "Use 0 for NULL ages.", hint: "COALESCE(Age, 0)", solution: "SELECT Name, COALESCE(Age, 0) AS age FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "age"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 22]] }, explanation: "Replace NULL with 0." },
        { id: "d27q3", difficulty: "medium", title: "Chain Defaults", description: "Handle empty strings and NULL for Embarked.", hint: "COALESCE(NULLIF(Embarked, ''), 'Unknown')", solution: "SELECT Name, COALESCE(NULLIF(Embarked, ''), 'Unknown') AS port FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "port"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", "S"]] }, explanation: "NULLIF converts empty to NULL." },
        { id: "d27q4", difficulty: "medium-hard", title: "Average with Default", description: "Average age, treating NULL as 30.", hint: "AVG(COALESCE(Age, 30))", solution: "SELECT ROUND(AVG(COALESCE(Age, 30)), 2) AS avg_age_filled FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["avg_age_filled"], rowCount: 1, sampleRows: [[29.76]] }, explanation: "Fill NULLs before averaging." },
        { id: "d27q5", difficulty: "hard", title: "Safe Division", description: "Fare per person, avoiding division by zero.", hint: "NULLIF for denominator", solution: "SELECT Name, Fare, SibSp + Parch + 1 AS family, Fare / NULLIF(SibSp + Parch + 1, 0) AS fare_per_person FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare", "family", "fare_per_person"], rowCount: 891, sampleRows: [["Braund, Mr. Owen Harris", 7.25, 2, 3.625]] }, explanation: "NULLIF prevents div/0." }
      ]
    },

    // ========== DAY 28: BETWEEN ==========
    {
      day: 28,
      week: 4,
      title: "BETWEEN and Advanced Filtering",
      description: "Efficient range filtering",
      concepts: ["BETWEEN", "NOT BETWEEN"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers" },
      lesson: `# BETWEEN - Inclusive Range

\`\`\`sql
SELECT * FROM passengers WHERE Age BETWEEN 20 AND 40;
-- Same as: Age >= 20 AND Age <= 40
\`\`\``,
      questions: [
        { id: "d28q1", difficulty: "easy", title: "Age Range", description: "Find passengers aged 20-30.", hint: "BETWEEN 20 AND 30", solution: "SELECT Name, Age FROM passengers WHERE Age BETWEEN 20 AND 30;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Age"], rowCount: 220, sampleRows: [["Braund, Mr. Owen Harris", 22]] }, explanation: "BETWEEN is inclusive." },
        { id: "d28q2", difficulty: "easy-medium", title: "Fare Range", description: "Find fares between $50 and $100.", hint: "BETWEEN 50 AND 100", solution: "SELECT Name, Fare FROM passengers WHERE Fare BETWEEN 50 AND 100;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare"], rowCount: 52, sampleRows: [["Cumings, Mrs. John Bradley", 71.28]] }, explanation: "Works with decimals." },
        { id: "d28q3", difficulty: "medium", title: "NOT BETWEEN", description: "Find ages NOT between 18 and 60.", hint: "NOT BETWEEN", solution: "SELECT Name, Age FROM passengers WHERE Age NOT BETWEEN 18 AND 60 AND Age IS NOT NULL;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Age"], rowCount: 151, sampleRows: [["Palsson, Master. Gosta Leonard", 2]] }, explanation: "NOT BETWEEN for outside range." },
        { id: "d28q4", difficulty: "medium-hard", title: "Combined Filters", description: "First/second class aged 30-50.", hint: "IN and BETWEEN combined", solution: "SELECT Name, Pclass, Age FROM passengers WHERE Pclass IN (1, 2) AND Age BETWEEN 30 AND 50;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Pclass", "Age"], rowCount: 150, sampleRows: [["Cumings, Mrs. John Bradley", 1, 38]] }, explanation: "Combine IN and BETWEEN." },
        { id: "d28q5", difficulty: "hard", title: "Fare Brackets", description: "Count passengers in fare brackets: 0-20, 20-50, 50-100, 100+.", hint: "CASE with BETWEEN", solution: "SELECT SUM(CASE WHEN Fare BETWEEN 0 AND 20 THEN 1 ELSE 0 END) AS budget, SUM(CASE WHEN Fare > 20 AND Fare <= 50 THEN 1 ELSE 0 END) AS standard, SUM(CASE WHEN Fare > 50 AND Fare <= 100 THEN 1 ELSE 0 END) AS premium, SUM(CASE WHEN Fare > 100 THEN 1 ELSE 0 END) AS luxury FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["budget", "standard", "premium", "luxury"], rowCount: 1, sampleRows: [[635, 164, 52, 40]] }, explanation: "Bracket counting with CASE." }
      ]
    },

    // ========== DAY 29: Query Optimization ==========
    {
      day: 29,
      week: 5,
      title: "Query Optimization",
      description: "Write efficient queries",
      concepts: ["Best practices", "Performance"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers" },
      lesson: `# Query Optimization ⚡

Best Practices:
1. Select only needed columns (not *)
2. Filter early with WHERE
3. Use LIMIT for testing
4. Avoid functions on indexed columns`,
      questions: [
        { id: "d29q1", difficulty: "easy", title: "Specific Columns", description: "Select only Name and Fare for first class (not *).", hint: "Name specific columns", solution: "SELECT Name, Fare FROM passengers WHERE Pclass = 1;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare"], rowCount: 216, sampleRows: [["Cumings, Mrs. John Bradley", 71.28]] }, explanation: "Specific columns > SELECT *" },
        { id: "d29q2", difficulty: "easy-medium", title: "Filter First", description: "Top 5 first class fares.", hint: "WHERE before ORDER BY/LIMIT", solution: "SELECT Name, Fare FROM passengers WHERE Pclass = 1 ORDER BY Fare DESC LIMIT 5;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Fare"], rowCount: 5, sampleRows: [["Ward, Miss. Anna", 512.33]] }, explanation: "Filter, then sort, then limit." },
        { id: "d29q3", difficulty: "medium", title: "Test with LIMIT", description: "Sample 10 passengers for testing.", hint: "LIMIT 10", solution: "SELECT Name, Age, Fare FROM passengers ORDER BY PassengerId LIMIT 10;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Age", "Fare"], rowCount: 10, sampleRows: [["Braund, Mr. Owen Harris", 22, 7.25]] }, explanation: "LIMIT for testing." },
        { id: "d29q4", difficulty: "medium-hard", title: "Efficient Count", description: "Count first class survivors efficiently.", hint: "Direct WHERE vs CASE", solution: "SELECT COUNT(*) AS first_class_survivors FROM passengers WHERE Pclass = 1 AND Survived = 1;", alternativeSolutions: [], expectedOutput: { columns: ["first_class_survivors"], rowCount: 1, sampleRows: [[136]] }, explanation: "WHERE often faster than CASE." },
        { id: "d29q5", difficulty: "hard", title: "Optimized Analysis", description: "Avg fare by class for classes with 100+ passengers.", hint: "GROUP BY with HAVING", solution: "SELECT Pclass, ROUND(AVG(Fare), 2) AS avg_fare, COUNT(*) AS count FROM passengers GROUP BY Pclass HAVING COUNT(*) >= 100 ORDER BY Pclass;", alternativeSolutions: [], expectedOutput: { columns: ["Pclass", "avg_fare", "count"], rowCount: 3, sampleRows: [[1, 84.15, 216]] }, explanation: "All classes have 100+ passengers." }
      ]
    },

    // ========== DAY 30: Final Challenge ==========
    {
      day: 30,
      week: 5,
      title: "Final Challenge: Complete Analysis",
      description: "Combine everything you've learned",
      concepts: ["All concepts"],
      dataset: "titanic",
      tableInfo: { tableName: "passengers" },
      lesson: `# Final Challenge 🏆

Congratulations on reaching Day 30!

Today combines everything: SELECT, WHERE, ORDER BY, LIMIT, Aggregates, GROUP BY, HAVING, JOINs, Subqueries, CTEs, Window functions, and more.

Show what you've learned!`,
      questions: [
        { id: "d30q1", difficulty: "easy", title: "Survival Summary", description: "Show total, survivors, deaths, survival rate %.", hint: "COUNT, SUM, AVG * 100", solution: "SELECT COUNT(*) AS total, SUM(Survived) AS survivors, COUNT(*) - SUM(Survived) AS deaths, ROUND(AVG(Survived) * 100, 1) AS survival_rate FROM passengers;", alternativeSolutions: [], expectedOutput: { columns: ["total", "survivors", "deaths", "survival_rate"], rowCount: 1, sampleRows: [[891, 342, 549, 38.4]] }, explanation: "Complete survival overview." },
        { id: "d30q2", difficulty: "easy-medium", title: "Class & Gender", description: "Survival rate by Pclass and Sex. Order by rate descending.", hint: "GROUP BY Pclass, Sex", solution: "SELECT Pclass, Sex, COUNT(*) AS count, ROUND(AVG(Survived) * 100, 1) AS survival_rate FROM passengers GROUP BY Pclass, Sex ORDER BY survival_rate DESC;", alternativeSolutions: [], expectedOutput: { columns: ["Pclass", "Sex", "count", "survival_rate"], rowCount: 6, sampleRows: [[1, "female", 94, 96.8]] }, explanation: "First class women: 97% survival!" },
        { id: "d30q3", difficulty: "medium", title: "Age Groups", description: "Survival rate by age group (Child/Adult/Senior).", hint: "CASE for age groups, GROUP BY", solution: "SELECT CASE WHEN Age < 18 THEN 'Child' WHEN Age <= 60 THEN 'Adult' ELSE 'Senior' END AS age_group, COUNT(*) AS count, ROUND(AVG(Survived) * 100, 1) AS survival_rate FROM passengers WHERE Age IS NOT NULL GROUP BY CASE WHEN Age < 18 THEN 'Child' WHEN Age <= 60 THEN 'Adult' ELSE 'Senior' END ORDER BY survival_rate DESC;", alternativeSolutions: [], expectedOutput: { columns: ["age_group", "count", "survival_rate"], rowCount: 3, sampleRows: [["Child", 113, 54.0]] }, explanation: "Children had highest survival." },
        { id: "d30q4", difficulty: "medium-hard", title: "Top Survivors Per Class", description: "Top 3 highest-paying survivors in each class.", hint: "Window function + subquery filter", solution: "SELECT * FROM (SELECT Name, Pclass, Fare, ROW_NUMBER() OVER (PARTITION BY Pclass ORDER BY Fare DESC) AS rank FROM passengers WHERE Survived = 1) WHERE rank <= 3 ORDER BY Pclass, rank;", alternativeSolutions: [], expectedOutput: { columns: ["Name", "Pclass", "Fare", "rank"], rowCount: 9, sampleRows: [["Cardeza, Mr. Thomas Drake Martinez", 1, 512.33, 1]] }, explanation: "Top N per group pattern." },
        { id: "d30q5", difficulty: "hard", title: "Complete Report", description: "Per port: passengers, survivors, avg_fare, avg_age, most common class.", hint: "CTE with aggregates + correlated subquery", solution: "WITH port_stats AS (SELECT Embarked, COUNT(*) AS passengers, SUM(Survived) AS survivors, ROUND(AVG(Fare), 2) AS avg_fare, ROUND(AVG(Age), 1) AS avg_age FROM passengers WHERE Embarked IS NOT NULL AND Embarked != '' GROUP BY Embarked) SELECT p.*, (SELECT Pclass FROM passengers WHERE Embarked = p.Embarked GROUP BY Pclass ORDER BY COUNT(*) DESC LIMIT 1) AS common_class FROM port_stats p ORDER BY passengers DESC;", alternativeSolutions: [], expectedOutput: { columns: ["Embarked", "passengers", "survivors", "avg_fare", "avg_age", "common_class"], rowCount: 3, sampleRows: [["S", 644, 217, 27.08, 29.4, 3]] }, explanation: "Complete port analysis combining CTE, aggregates, and subquery!" }
      ]
    }
  ];

  // Add to main curriculum if it exists
  if (window.thirtyDayQuestions && window.thirtyDayQuestions.days) {
    window.thirtyDayQuestions.days = window.thirtyDayQuestions.days.concat(additionalDays);
  } else {
    // Create the structure
    window.sqlCurriculum30Days = window.sqlCurriculum30Days || { days: [] };
    window.sqlCurriculum30Days.days = additionalDays;
  }
  
  console.log("Days 11-30 loaded: " + additionalDays.length + " additional days");
})();

// Scoring configuration
window.challengeConfig = {
  scoring: {
    "easy": { points: 5, hintPenalty: 2 },
    "easy-medium": { points: 10, hintPenalty: 3 },
    "medium": { points: 15, hintPenalty: 5 },
    "medium-hard": { points: 20, hintPenalty: 6 },
    "hard": { points: 25, hintPenalty: 8 }
  },
  dailyMax: 75,
  passRequirement: 3,
  perfectBonus: 10,
  weeklyBonus: [100, 150, 200, 250, 300],
  completionBonus: 500,
  weeks: [
    { id: 1, name: "SQL Fundamentals", days: [1,2,3,4,5,6,7], color: "from-blue-500 to-cyan-500", icon: "📊" },
    { id: 2, name: "Intermediate SQL", days: [8,9,10,11,12,13,14], color: "from-purple-500 to-pink-500", icon: "🚀" },
    { id: 3, name: "Advanced Queries", days: [15,16,17,18,19,20,21], color: "from-orange-500 to-red-500", icon: "🔥" },
    { id: 4, name: "Analytics & Windows", days: [22,23,24,25,26,27,28], color: "from-green-500 to-teal-500", icon: "📈" },
    { id: 5, name: "Mastery", days: [29,30], color: "from-yellow-500 to-amber-500", icon: "👑" }
  ]
};
