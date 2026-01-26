// 30-Day SQL Challenge - Complete Question Bank
// 150 Questions with Progressive Difficulty

window.thirtyDayQuestions = {
  
  // ==========================================
  // TABLE SCHEMAS REFERENCE
  // ==========================================
  schemas: {
    passengers: {
      name: "passengers",
      dataset: "titanic",
      description: "Titanic passenger manifest with survival data",
      columns: [
        { name: "PassengerId", type: "INTEGER", description: "Unique passenger ID (1-891)" },
        { name: "Survived", type: "INTEGER", description: "0 = No, 1 = Yes" },
        { name: "Pclass", type: "INTEGER", description: "Ticket class: 1 = 1st, 2 = 2nd, 3 = 3rd" },
        { name: "Name", type: "TEXT", description: "Passenger name" },
        { name: "Sex", type: "TEXT", description: "'male' or 'female'" },
        { name: "Age", type: "REAL", description: "Age in years (some NULL)" },
        { name: "SibSp", type: "INTEGER", description: "# of siblings/spouses aboard" },
        { name: "Parch", type: "INTEGER", description: "# of parents/children aboard" },
        { name: "Ticket", type: "TEXT", description: "Ticket number" },
        { name: "Fare", type: "REAL", description: "Passenger fare in pounds" },
        { name: "Cabin", type: "TEXT", description: "Cabin number (many NULL)" },
        { name: "Embarked", type: "TEXT", description: "Port: C=Cherbourg, Q=Queenstown, S=Southampton" }
      ],
      sampleRows: [
        [1, 0, 3, "Braund, Mr. Owen Harris", "male", 22, 1, 0, "A/5 21171", 7.25, null, "S"],
        [2, 1, 1, "Cumings, Mrs. John Bradley", "female", 38, 1, 0, "PC 17599", 71.28, "C85", "C"]
      ]
    },
    customers: {
      name: "customers",
      dataset: "ecommerce",
      description: "Customer information",
      columns: [
        { name: "id", type: "INTEGER", description: "Unique customer ID" },
        { name: "name", type: "TEXT", description: "Customer full name" },
        { name: "email", type: "TEXT", description: "Email address" },
        { name: "city", type: "TEXT", description: "City" },
        { name: "country", type: "TEXT", description: "Country" },
        { name: "created_at", type: "TEXT", description: "Account creation date" }
      ]
    },
    orders: {
      name: "orders",
      dataset: "ecommerce",
      description: "Order transactions",
      columns: [
        { name: "id", type: "INTEGER", description: "Unique order ID" },
        { name: "customer_id", type: "INTEGER", description: "References customers.id" },
        { name: "order_date", type: "TEXT", description: "Date of order" },
        { name: "total", type: "REAL", description: "Order total amount" },
        { name: "status", type: "TEXT", description: "pending, shipped, delivered, cancelled" }
      ]
    },
    products: {
      name: "products",
      dataset: "ecommerce",
      description: "Product catalog",
      columns: [
        { name: "id", type: "INTEGER", description: "Unique product ID" },
        { name: "name", type: "TEXT", description: "Product name" },
        { name: "category", type: "TEXT", description: "Product category" },
        { name: "price", type: "REAL", description: "Unit price" },
        { name: "stock", type: "INTEGER", description: "Quantity in stock" }
      ]
    },
    order_items: {
      name: "order_items",
      dataset: "ecommerce",
      description: "Items within each order",
      columns: [
        { name: "id", type: "INTEGER", description: "Unique line item ID" },
        { name: "order_id", type: "INTEGER", description: "References orders.id" },
        { name: "product_id", type: "INTEGER", description: "References products.id" },
        { name: "quantity", type: "INTEGER", description: "Quantity ordered" },
        { name: "price", type: "REAL", description: "Price at time of order" }
      ]
    }
  },

  // ==========================================
  // DAY 1: Introduction to SQL
  // ==========================================
  day1: {
    day: 1,
    title: "Introduction to SQL",
    topic: "SELECT basics - retrieving data from tables",
    dataset: "titanic",
    tables: ["passengers"],
    
    tableInfo: `
## Table: passengers
| Column | Type | Description |
|--------|------|-------------|
| PassengerId | INTEGER | Unique ID (1-891) |
| Survived | INTEGER | 0=No, 1=Yes |
| Pclass | INTEGER | Class: 1, 2, or 3 |
| Name | TEXT | Full name |
| Sex | TEXT | 'male' or 'female' |
| Age | REAL | Age in years |
| Fare | REAL | Ticket price |
| Embarked | TEXT | Port: S, C, or Q |
    `,
    
    questions: [
      {
        id: "d1q1",
        difficulty: "easy",
        points: 5,
        hintPenalty: 2,
        title: "Your First Query",
        description: "Write a query to select **all columns** from the **passengers** table.",
        tableUsed: "passengers",
        hint: "Use SELECT * to get all columns. The syntax is: SELECT * FROM table_name;",
        solution: "SELECT * FROM passengers;",
        alternativeSolutions: ["SELECT * FROM passengers", "select * from passengers;"],
        expectedOutput: {
          columns: ["PassengerId", "Survived", "Pclass", "Name", "Sex", "Age", "SibSp", "Parch", "Ticket", "Fare", "Cabin", "Embarked"],
          sampleRows: [
            [1, 0, 3, "Braund, Mr. Owen Harris", "male", 22.0, 1, 0, "A/5 21171", 7.25, null, "S"],
            [2, 1, 1, "Cumings, Mrs. John Bradley", "female", 38.0, 1, 0, "PC 17599", 71.28, "C85", "C"],
            [3, 1, 3, "Heikkinen, Miss. Laina", "female", 26.0, 0, 0, "STON/O2. 3101282", 7.925, null, "S"]
          ],
          totalRows: 891
        },
        explanation: "SELECT * FROM table_name retrieves all columns and rows. The * is a wildcard meaning 'everything'."
      },
      {
        id: "d1q2",
        difficulty: "easy-medium",
        points: 10,
        hintPenalty: 3,
        title: "Selecting Specific Columns",
        description: "Select only the **Name** and **Age** columns from the passengers table.",
        tableUsed: "passengers",
        hint: "List column names separated by commas: SELECT col1, col2 FROM table;",
        solution: "SELECT Name, Age FROM passengers;",
        alternativeSolutions: ["SELECT Name, Age FROM passengers", "select name, age from passengers;"],
        expectedOutput: {
          columns: ["Name", "Age"],
          sampleRows: [
            ["Braund, Mr. Owen Harris", 22.0],
            ["Cumings, Mrs. John Bradley", 38.0],
            ["Heikkinen, Miss. Laina", 26.0]
          ],
          totalRows: 891
        },
        explanation: "Selecting specific columns is more efficient than SELECT * and returns only the data you need."
      },
      {
        id: "d1q3",
        difficulty: "medium",
        points: 15,
        hintPenalty: 5,
        title: "Multiple Columns",
        description: "Select **PassengerId**, **Name**, **Sex**, and **Survived** from the passengers table.",
        tableUsed: "passengers",
        hint: "List all four column names separated by commas. Column names are case-sensitive!",
        solution: "SELECT PassengerId, Name, Sex, Survived FROM passengers;",
        alternativeSolutions: ["SELECT PassengerId, Name, Sex, Survived FROM passengers"],
        expectedOutput: {
          columns: ["PassengerId", "Name", "Sex", "Survived"],
          sampleRows: [
            [1, "Braund, Mr. Owen Harris", "male", 0],
            [2, "Cumings, Mrs. John Bradley", "female", 1],
            [3, "Heikkinen, Miss. Laina", "female", 1]
          ],
          totalRows: 891
        },
        explanation: "You can select any number of columns. The order you list them determines the order in your results."
      },
      {
        id: "d1q4",
        difficulty: "medium-hard",
        points: 20,
        hintPenalty: 6,
        title: "Column Order Matters",
        description: "Select **Survived**, **Pclass**, and **Name** columns (in that exact order) from passengers.",
        tableUsed: "passengers",
        hint: "List columns in the order you want them displayed: Survived first, then Pclass, then Name.",
        solution: "SELECT Survived, Pclass, Name FROM passengers;",
        alternativeSolutions: ["SELECT Survived, Pclass, Name FROM passengers"],
        validateColumnOrder: true,
        expectedOutput: {
          columns: ["Survived", "Pclass", "Name"],
          sampleRows: [
            [0, 3, "Braund, Mr. Owen Harris"],
            [1, 1, "Cumings, Mrs. John Bradley"],
            [1, 3, "Heikkinen, Miss. Laina"]
          ],
          totalRows: 891
        },
        explanation: "Column order in SELECT determines output order. This matters for reports and data exports."
      },
      {
        id: "d1q5",
        difficulty: "hard",
        points: 25,
        hintPenalty: 8,
        title: "Passenger Profile",
        description: "Select a passenger profile: **Name**, **Age**, **Sex**, **Pclass**, **Fare**, and **Embarked** columns.",
        tableUsed: "passengers",
        hint: "Six columns total. Double-check spelling: Pclass (not Class), Embarked (not Port).",
        solution: "SELECT Name, Age, Sex, Pclass, Fare, Embarked FROM passengers;",
        alternativeSolutions: ["SELECT Name, Age, Sex, Pclass, Fare, Embarked FROM passengers"],
        expectedOutput: {
          columns: ["Name", "Age", "Sex", "Pclass", "Fare", "Embarked"],
          sampleRows: [
            ["Braund, Mr. Owen Harris", 22.0, "male", 3, 7.25, "S"],
            ["Cumings, Mrs. John Bradley", 38.0, "female", 1, 71.28, "C"],
            ["Heikkinen, Miss. Laina", 26.0, "female", 3, 7.925, "S"]
          ],
          totalRows: 891
        },
        explanation: "Selecting multiple specific columns is common in real work - you rarely need all columns from a table."
      }
    ]
  },

  // ==========================================
  // DAY 2: Column Aliases and DISTINCT
  // ==========================================
  day2: {
    day: 2,
    title: "Column Aliases and DISTINCT",
    topic: "Renaming columns with AS, finding unique values",
    dataset: "titanic",
    tables: ["passengers"],
    
    tableInfo: `
## Table: passengers
| Column | Type | Description |
|--------|------|-------------|
| PassengerId | INTEGER | Unique ID |
| Pclass | INTEGER | Class: 1, 2, or 3 |
| Name | TEXT | Full name |
| Sex | TEXT | 'male' or 'female' |
| Age | REAL | Age in years |
| Fare | REAL | Ticket price |
| Embarked | TEXT | Port: S, C, or Q |
    `,
    
    questions: [
      {
        id: "d2q1",
        difficulty: "easy",
        points: 5,
        hintPenalty: 2,
        title: "Simple Alias",
        description: "Select the **Name** column and display it as **passenger_name** using an alias.",
        tableUsed: "passengers",
        hint: "Use AS to create an alias: SELECT column AS new_name FROM table;",
        solution: "SELECT Name AS passenger_name FROM passengers;",
        alternativeSolutions: ["SELECT Name AS passenger_name FROM passengers", "SELECT Name as passenger_name FROM passengers;", "SELECT Name passenger_name FROM passengers;"],
        expectedOutput: {
          columns: ["passenger_name"],
          sampleRows: [
            ["Braund, Mr. Owen Harris"],
            ["Cumings, Mrs. John Bradley"],
            ["Heikkinen, Miss. Laina"]
          ],
          totalRows: 891
        },
        explanation: "AS creates an alias - a display name for the column. The actual data isn't changed, just how it appears."
      },
      {
        id: "d2q2",
        difficulty: "easy-medium",
        points: 10,
        hintPenalty: 3,
        title: "Multiple Aliases",
        description: "Select **Name** as **passenger** and **Fare** as **ticket_price**.",
        tableUsed: "passengers",
        hint: "Apply AS to each column: SELECT col1 AS alias1, col2 AS alias2 FROM table;",
        solution: "SELECT Name AS passenger, Fare AS ticket_price FROM passengers;",
        alternativeSolutions: ["SELECT Name AS passenger, Fare AS ticket_price FROM passengers"],
        expectedOutput: {
          columns: ["passenger", "ticket_price"],
          sampleRows: [
            ["Braund, Mr. Owen Harris", 7.25],
            ["Cumings, Mrs. John Bradley", 71.28],
            ["Heikkinen, Miss. Laina", 7.925]
          ],
          totalRows: 891
        },
        explanation: "You can alias multiple columns in one query. Aliases make output more readable and meaningful."
      },
      {
        id: "d2q3",
        difficulty: "medium",
        points: 15,
        hintPenalty: 5,
        title: "Find Unique Classes",
        description: "Find all **unique passenger classes** (Pclass). Each class should appear only once.",
        tableUsed: "passengers",
        hint: "Use DISTINCT before the column name: SELECT DISTINCT column FROM table;",
        solution: "SELECT DISTINCT Pclass FROM passengers;",
        alternativeSolutions: ["SELECT DISTINCT Pclass FROM passengers", "SELECT DISTINCT(Pclass) FROM passengers;"],
        expectedOutput: {
          columns: ["Pclass"],
          sampleRows: [[1], [2], [3]],
          totalRows: 3
        },
        explanation: "DISTINCT removes duplicate values. Titanic had 3 classes, so this returns exactly 3 rows."
      },
      {
        id: "d2q4",
        difficulty: "medium-hard",
        points: 20,
        hintPenalty: 6,
        title: "DISTINCT with Alias",
        description: "Find all **unique embarkation ports** (Embarked) and display the column as **port**.",
        tableUsed: "passengers",
        hint: "Combine DISTINCT and AS: SELECT DISTINCT column AS alias FROM table;",
        solution: "SELECT DISTINCT Embarked AS port FROM passengers;",
        alternativeSolutions: ["SELECT DISTINCT Embarked AS port FROM passengers"],
        expectedOutput: {
          columns: ["port"],
          sampleRows: [["S"], ["C"], ["Q"], [null]],
          totalRows: 4
        },
        explanation: "Ports: S=Southampton, C=Cherbourg, Q=Queenstown. NULL means unknown port for some passengers."
      },
      {
        id: "d2q5",
        difficulty: "hard",
        points: 25,
        hintPenalty: 8,
        title: "Unique Combinations",
        description: "Find all **unique combinations** of **Pclass** and **Survived**. Display as **class** and **survived_status**.",
        tableUsed: "passengers",
        hint: "DISTINCT works on multiple columns: SELECT DISTINCT col1, col2 FROM table. Add aliases to both.",
        solution: "SELECT DISTINCT Pclass AS class, Survived AS survived_status FROM passengers;",
        alternativeSolutions: ["SELECT DISTINCT Pclass AS class, Survived AS survived_status FROM passengers"],
        expectedOutput: {
          columns: ["class", "survived_status"],
          sampleRows: [[1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1]],
          totalRows: 6
        },
        explanation: "3 classes × 2 survival states = 6 combinations. DISTINCT on multiple columns finds unique pairs."
      }
    ]
  },

  // ==========================================
  // DAY 3: SELECT Statement Mastery
  // ==========================================
  day3: {
    day: 3,
    title: "SELECT Statement Mastery",
    topic: "Expressions, calculations, and string concatenation",
    dataset: "titanic",
    tables: ["passengers"],
    
    tableInfo: `
## Table: passengers
| Column | Type | Description |
|--------|------|-------------|
| Name | TEXT | Full name |
| Age | REAL | Age in years |
| Fare | REAL | Ticket price in £ |
| SibSp | INTEGER | Siblings/spouses aboard |
| Parch | INTEGER | Parents/children aboard |
    `,
    
    questions: [
      {
        id: "d3q1",
        difficulty: "easy",
        points: 5,
        hintPenalty: 2,
        title: "Simple Calculation",
        description: "Select **Name** and **Fare**, and add a third column showing **Fare** multiplied by 2 as **double_fare**.",
        tableUsed: "passengers",
        hint: "You can do math in SELECT: SELECT column, column * 2 AS alias FROM table;",
        solution: "SELECT Name, Fare, Fare * 2 AS double_fare FROM passengers;",
        alternativeSolutions: ["SELECT Name, Fare, Fare * 2 AS double_fare FROM passengers"],
        expectedOutput: {
          columns: ["Name", "Fare", "double_fare"],
          sampleRows: [
            ["Braund, Mr. Owen Harris", 7.25, 14.5],
            ["Cumings, Mrs. John Bradley", 71.28, 142.56]
          ],
          totalRows: 891
        },
        explanation: "SQL can perform calculations. The result becomes a new column in your output."
      },
      {
        id: "d3q2",
        difficulty: "easy-medium",
        points: 10,
        hintPenalty: 3,
        title: "Currency Conversion",
        description: "Select **Name** and **Fare**, plus convert fare to dollars (multiply by 1.25) as **fare_usd**.",
        tableUsed: "passengers",
        hint: "Multiply Fare by 1.25 and give it an alias.",
        solution: "SELECT Name, Fare, Fare * 1.25 AS fare_usd FROM passengers;",
        alternativeSolutions: ["SELECT Name, Fare, Fare * 1.25 AS fare_usd FROM passengers"],
        expectedOutput: {
          columns: ["Name", "Fare", "fare_usd"],
          sampleRows: [
            ["Braund, Mr. Owen Harris", 7.25, 9.0625],
            ["Cumings, Mrs. John Bradley", 71.28, 89.1]
          ],
          totalRows: 891
        },
        explanation: "Calculations in SELECT are useful for conversions, markups, and derived values."
      },
      {
        id: "d3q3",
        difficulty: "medium",
        points: 15,
        hintPenalty: 5,
        title: "Family Size",
        description: "Calculate **family_size** by adding **SibSp** + **Parch** + 1 (for the passenger). Show Name and family_size.",
        tableUsed: "passengers",
        hint: "Add the columns together: SibSp + Parch + 1. Don't forget the +1 for the passenger themselves!",
        solution: "SELECT Name, SibSp + Parch + 1 AS family_size FROM passengers;",
        alternativeSolutions: ["SELECT Name, SibSp + Parch + 1 AS family_size FROM passengers", "SELECT Name, (SibSp + Parch + 1) AS family_size FROM passengers;"],
        expectedOutput: {
          columns: ["Name", "family_size"],
          sampleRows: [
            ["Braund, Mr. Owen Harris", 2],
            ["Cumings, Mrs. John Bradley", 2],
            ["Heikkinen, Miss. Laina", 1]
          ],
          totalRows: 891
        },
        explanation: "SibSp = siblings/spouse, Parch = parents/children. Adding 1 includes the passenger in the family count."
      },
      {
        id: "d3q4",
        difficulty: "medium-hard",
        points: 20,
        hintPenalty: 6,
        title: "Fare Per Person",
        description: "Calculate **fare_per_person** by dividing **Fare** by family size (SibSp + Parch + 1). Show Name, Fare, and fare_per_person.",
        tableUsed: "passengers",
        hint: "Divide Fare by the family size expression: Fare / (SibSp + Parch + 1). Use parentheses!",
        solution: "SELECT Name, Fare, Fare / (SibSp + Parch + 1) AS fare_per_person FROM passengers;",
        alternativeSolutions: ["SELECT Name, Fare, Fare / (SibSp + Parch + 1) AS fare_per_person FROM passengers"],
        expectedOutput: {
          columns: ["Name", "Fare", "fare_per_person"],
          sampleRows: [
            ["Braund, Mr. Owen Harris", 7.25, 3.625],
            ["Cumings, Mrs. John Bradley", 71.28, 35.64]
          ],
          totalRows: 891
        },
        explanation: "Families often shared tickets. Dividing by family size estimates individual fare costs."
      },
      {
        id: "d3q5",
        difficulty: "hard",
        points: 25,
        hintPenalty: 8,
        title: "Complete Profile",
        description: "Create a passenger profile: **Name**, **Age**, **Pclass** as **class**, family size as **family_size**, and fare per person as **individual_fare**.",
        tableUsed: "passengers",
        hint: "Combine multiple columns and calculations with aliases. Family size = SibSp + Parch + 1.",
        solution: "SELECT Name, Age, Pclass AS class, SibSp + Parch + 1 AS family_size, Fare / (SibSp + Parch + 1) AS individual_fare FROM passengers;",
        alternativeSolutions: ["SELECT Name, Age, Pclass AS class, SibSp + Parch + 1 AS family_size, Fare / (SibSp + Parch + 1) AS individual_fare FROM passengers"],
        expectedOutput: {
          columns: ["Name", "Age", "class", "family_size", "individual_fare"],
          sampleRows: [
            ["Braund, Mr. Owen Harris", 22.0, 3, 2, 3.625],
            ["Cumings, Mrs. John Bradley", 38.0, 1, 2, 35.64]
          ],
          totalRows: 891
        },
        explanation: "Real queries often combine multiple techniques: aliases, calculations, and careful column selection."
      }
    ]
  },

  // ==========================================
  // DAY 4: WHERE Clause Basics
  // ==========================================
  day4: {
    day: 4,
    title: "WHERE Clause Basics",
    topic: "Filtering rows with conditions",
    dataset: "titanic",
    tables: ["passengers"],
    
    tableInfo: `
## Table: passengers
| Column | Type | Values/Description |
|--------|------|-----|
| Survived | INTEGER | 0=No, 1=Yes |
| Pclass | INTEGER | 1, 2, or 3 |
| Sex | TEXT | 'male' or 'female' |
| Age | REAL | Age in years |
| Fare | REAL | Ticket price |
    `,
    
    questions: [
      {
        id: "d4q1",
        difficulty: "easy",
        points: 5,
        hintPenalty: 2,
        title: "Filter by Class",
        description: "Select all columns for passengers in **first class** (Pclass = 1).",
        tableUsed: "passengers",
        hint: "Add WHERE after FROM: SELECT * FROM passengers WHERE Pclass = 1;",
        solution: "SELECT * FROM passengers WHERE Pclass = 1;",
        alternativeSolutions: ["SELECT * FROM passengers WHERE Pclass = 1"],
        expectedOutput: {
          columns: ["PassengerId", "Survived", "Pclass", "Name", "Sex", "Age", "SibSp", "Parch", "Ticket", "Fare", "Cabin", "Embarked"],
          sampleRows: [
            [2, 1, 1, "Cumings, Mrs. John Bradley", "female", 38.0, 1, 0, "PC 17599", 71.28, "C85", "C"]
          ],
          totalRows: 216
        },
        explanation: "WHERE filters rows. Only passengers with Pclass = 1 are returned (216 first-class passengers)."
      },
      {
        id: "d4q2",
        difficulty: "easy-medium",
        points: 10,
        hintPenalty: 3,
        title: "Filter by Survival",
        description: "Select **Name**, **Age**, and **Sex** for passengers who **survived** (Survived = 1).",
        tableUsed: "passengers",
        hint: "SELECT specific columns, then filter with WHERE Survived = 1",
        solution: "SELECT Name, Age, Sex FROM passengers WHERE Survived = 1;",
        alternativeSolutions: ["SELECT Name, Age, Sex FROM passengers WHERE Survived = 1"],
        expectedOutput: {
          columns: ["Name", "Age", "Sex"],
          sampleRows: [
            ["Cumings, Mrs. John Bradley", 38.0, "female"],
            ["Heikkinen, Miss. Laina", 26.0, "female"]
          ],
          totalRows: 342
        },
        explanation: "342 passengers survived (Survived = 1). The query returns only their names, ages, and genders."
      },
      {
        id: "d4q3",
        difficulty: "medium",
        points: 15,
        hintPenalty: 5,
        title: "Filter by Text",
        description: "Select **Name** and **Fare** for all **female** passengers.",
        tableUsed: "passengers",
        hint: "Text values need quotes: WHERE Sex = 'female'. Use single quotes!",
        solution: "SELECT Name, Fare FROM passengers WHERE Sex = 'female';",
        alternativeSolutions: ["SELECT Name, Fare FROM passengers WHERE Sex = 'female'"],
        expectedOutput: {
          columns: ["Name", "Fare"],
          sampleRows: [
            ["Cumings, Mrs. John Bradley", 71.28],
            ["Heikkinen, Miss. Laina", 7.925]
          ],
          totalRows: 314
        },
        explanation: "Text/string values must be in single quotes. 314 female passengers were aboard."
      },
      {
        id: "d4q4",
        difficulty: "medium-hard",
        points: 20,
        hintPenalty: 6,
        title: "Comparison Operators",
        description: "Find passengers who paid **more than 100** for their ticket. Show **Name**, **Pclass**, and **Fare**.",
        tableUsed: "passengers",
        hint: "Use > for greater than: WHERE Fare > 100",
        solution: "SELECT Name, Pclass, Fare FROM passengers WHERE Fare > 100;",
        alternativeSolutions: ["SELECT Name, Pclass, Fare FROM passengers WHERE Fare > 100"],
        expectedOutput: {
          columns: ["Name", "Pclass", "Fare"],
          sampleRows: [
            ["Cardeza, Mr. Thomas Drake Martinez", 1, 512.33],
            ["Ward, Miss. Anna", 1, 512.33]
          ],
          totalRows: 34
        },
        explanation: "Use >, <, >=, <=, = for comparisons. Only 34 passengers paid over 100 pounds."
      },
      {
        id: "d4q5",
        difficulty: "hard",
        points: 25,
        hintPenalty: 8,
        title: "Age Range",
        description: "Find passengers **aged 18 or younger**. Show **Name**, **Age**, and **Survived**.",
        tableUsed: "passengers",
        hint: "Use <= for 'less than or equal to': WHERE Age <= 18",
        solution: "SELECT Name, Age, Survived FROM passengers WHERE Age <= 18;",
        alternativeSolutions: ["SELECT Name, Age, Survived FROM passengers WHERE Age <= 18"],
        expectedOutput: {
          columns: ["Name", "Age", "Survived"],
          sampleRows: [
            ["Palsson, Master. Gosta Leonard", 2.0, 0],
            ["Johnson, Miss. Eleanor Ileen", 1.0, 1]
          ],
          totalRows: 139
        },
        explanation: "139 passengers were 18 or younger. This includes children and teenagers."
      }
    ]
  },

  // ==========================================
  // DAY 5: AND, OR, NOT Operators
  // ==========================================
  day5: {
    day: 5,
    title: "Logical Operators",
    topic: "Combining conditions with AND, OR, NOT",
    dataset: "titanic",
    tables: ["passengers"],
    
    tableInfo: `
## Table: passengers
| Column | Type | Values |
|--------|------|--------|
| Survived | INTEGER | 0 or 1 |
| Pclass | INTEGER | 1, 2, or 3 |
| Sex | TEXT | 'male' or 'female' |
| Age | REAL | Age in years |
| Embarked | TEXT | 'S', 'C', or 'Q' |
    `,
    
    questions: [
      {
        id: "d5q1",
        difficulty: "easy",
        points: 5,
        hintPenalty: 2,
        title: "Simple AND",
        description: "Find **female** passengers who **survived**. Show Name, Sex, and Survived.",
        tableUsed: "passengers",
        hint: "Combine conditions with AND: WHERE Sex = 'female' AND Survived = 1",
        solution: "SELECT Name, Sex, Survived FROM passengers WHERE Sex = 'female' AND Survived = 1;",
        alternativeSolutions: ["SELECT Name, Sex, Survived FROM passengers WHERE Sex = 'female' AND Survived = 1"],
        expectedOutput: {
          columns: ["Name", "Sex", "Survived"],
          sampleRows: [
            ["Cumings, Mrs. John Bradley", "female", 1],
            ["Heikkinen, Miss. Laina", "female", 1]
          ],
          totalRows: 233
        },
        explanation: "AND requires both conditions to be true. 233 women survived."
      },
      {
        id: "d5q2",
        difficulty: "easy-medium",
        points: 10,
        hintPenalty: 3,
        title: "Simple OR",
        description: "Find passengers from **first OR second class**. Show Name, Pclass.",
        tableUsed: "passengers",
        hint: "Use OR: WHERE Pclass = 1 OR Pclass = 2",
        solution: "SELECT Name, Pclass FROM passengers WHERE Pclass = 1 OR Pclass = 2;",
        alternativeSolutions: ["SELECT Name, Pclass FROM passengers WHERE Pclass = 1 OR Pclass = 2"],
        expectedOutput: {
          columns: ["Name", "Pclass"],
          sampleRows: [
            ["Cumings, Mrs. John Bradley", 1],
            ["Futrelle, Mrs. Jacques Heath", 1]
          ],
          totalRows: 400
        },
        explanation: "OR requires at least one condition to be true. 216 + 184 = 400 passengers in 1st or 2nd class."
      },
      {
        id: "d5q3",
        difficulty: "medium",
        points: 15,
        hintPenalty: 5,
        title: "Combined AND/OR",
        description: "Find **female survivors** OR **male passengers in first class**. Show Name, Sex, Pclass, Survived.",
        tableUsed: "passengers",
        hint: "Use parentheses to group: (condition1 AND condition2) OR (condition3 AND condition4)",
        solution: "SELECT Name, Sex, Pclass, Survived FROM passengers WHERE (Sex = 'female' AND Survived = 1) OR (Sex = 'male' AND Pclass = 1);",
        alternativeSolutions: ["SELECT Name, Sex, Pclass, Survived FROM passengers WHERE (Sex = 'female' AND Survived = 1) OR (Sex = 'male' AND Pclass = 1)"],
        expectedOutput: {
          columns: ["Name", "Sex", "Pclass", "Survived"],
          sampleRows: [
            ["Cumings, Mrs. John Bradley", "female", 1, 1],
            ["Allen, Mr. William Henry", "male", 1, 0]
          ],
          totalRows: 355
        },
        explanation: "Parentheses control evaluation order. Without them, results might be unexpected."
      },
      {
        id: "d5q4",
        difficulty: "medium-hard",
        points: 20,
        hintPenalty: 6,
        title: "NOT Operator",
        description: "Find passengers who did **NOT** embark from Southampton (Embarked != 'S'). Show Name, Embarked.",
        tableUsed: "passengers",
        hint: "Use != or <> for 'not equal': WHERE Embarked != 'S'",
        solution: "SELECT Name, Embarked FROM passengers WHERE Embarked != 'S';",
        alternativeSolutions: ["SELECT Name, Embarked FROM passengers WHERE Embarked != 'S'", "SELECT Name, Embarked FROM passengers WHERE Embarked <> 'S';", "SELECT Name, Embarked FROM passengers WHERE NOT Embarked = 'S';"],
        expectedOutput: {
          columns: ["Name", "Embarked"],
          sampleRows: [
            ["Cumings, Mrs. John Bradley", "C"],
            ["Fortune, Mr. Charles Alexander", "C"]
          ],
          totalRows: 270
        },
        explanation: "!= means 'not equal'. This finds passengers from Cherbourg (C) and Queenstown (Q)."
      },
      {
        id: "d5q5",
        difficulty: "hard",
        points: 25,
        hintPenalty: 8,
        title: "Complex Logic",
        description: "Find passengers who: **(survived AND were under 18)** OR **(were in 1st class AND paid over 200)**. Show Name, Age, Pclass, Fare, Survived.",
        tableUsed: "passengers",
        hint: "Two groups with OR: (Survived = 1 AND Age < 18) OR (Pclass = 1 AND Fare > 200)",
        solution: "SELECT Name, Age, Pclass, Fare, Survived FROM passengers WHERE (Survived = 1 AND Age < 18) OR (Pclass = 1 AND Fare > 200);",
        alternativeSolutions: ["SELECT Name, Age, Pclass, Fare, Survived FROM passengers WHERE (Survived = 1 AND Age < 18) OR (Pclass = 1 AND Fare > 200)"],
        expectedOutput: {
          columns: ["Name", "Age", "Pclass", "Fare", "Survived"],
          sampleRows: [
            ["Johnson, Miss. Eleanor Ileen", 1.0, 3, 11.1333, 1],
            ["Cardeza, Mr. Thomas Drake Martinez", 36.0, 1, 512.33, 1]
          ],
          totalRows: 74
        },
        explanation: "Complex queries combine multiple conditions. Parentheses ensure correct logic grouping."
      }
    ]
  },

  // ==========================================
  // DAY 6: ORDER BY
  // ==========================================
  day6: {
    day: 6,
    title: "Sorting with ORDER BY",
    topic: "Sorting results ascending and descending",
    dataset: "titanic",
    tables: ["passengers"],
    
    tableInfo: `
## Table: passengers
| Column | Type | Description |
|--------|------|-------------|
| Name | TEXT | Full name |
| Age | REAL | Age in years |
| Fare | REAL | Ticket price |
| Pclass | INTEGER | 1, 2, or 3 |
    `,
    
    questions: [
      {
        id: "d6q1",
        difficulty: "easy",
        points: 5,
        hintPenalty: 2,
        title: "Sort by Age",
        description: "Select **Name** and **Age**, sorted by **Age** (youngest first).",
        tableUsed: "passengers",
        hint: "Add ORDER BY at the end: SELECT ... FROM ... ORDER BY Age;",
        solution: "SELECT Name, Age FROM passengers ORDER BY Age;",
        alternativeSolutions: ["SELECT Name, Age FROM passengers ORDER BY Age", "SELECT Name, Age FROM passengers ORDER BY Age ASC;"],
        expectedOutput: {
          columns: ["Name", "Age"],
          sampleRows: [
            ["Thomas, Master. Assad Alexander", 0.42],
            ["Johnson, Miss. Eleanor Ileen", 1.0],
            ["Aks, Master. Philip Frank", 0.83]
          ],
          totalRows: 891,
          note: "NULL ages appear last"
        },
        explanation: "ORDER BY sorts results. Default is ASC (ascending = smallest to largest)."
      },
      {
        id: "d6q2",
        difficulty: "easy-medium",
        points: 10,
        hintPenalty: 3,
        title: "Descending Order",
        description: "Select **Name** and **Fare**, sorted by **Fare** descending (highest first).",
        tableUsed: "passengers",
        hint: "Add DESC after the column: ORDER BY Fare DESC",
        solution: "SELECT Name, Fare FROM passengers ORDER BY Fare DESC;",
        alternativeSolutions: ["SELECT Name, Fare FROM passengers ORDER BY Fare DESC"],
        expectedOutput: {
          columns: ["Name", "Fare"],
          sampleRows: [
            ["Cardeza, Mr. Thomas Drake Martinez", 512.33],
            ["Ward, Miss. Anna", 512.33],
            ["Lesurer, Mr. Gustave J", 512.33]
          ],
          totalRows: 891
        },
        explanation: "DESC reverses the order (largest to smallest). The highest fare was £512.33."
      },
      {
        id: "d6q3",
        difficulty: "medium",
        points: 15,
        hintPenalty: 5,
        title: "Sort by Text",
        description: "Select **Name** and **Pclass**, sorted alphabetically by **Name**.",
        tableUsed: "passengers",
        hint: "Text sorts alphabetically with ORDER BY. A comes before Z in ASC order.",
        solution: "SELECT Name, Pclass FROM passengers ORDER BY Name;",
        alternativeSolutions: ["SELECT Name, Pclass FROM passengers ORDER BY Name", "SELECT Name, Pclass FROM passengers ORDER BY Name ASC;"],
        expectedOutput: {
          columns: ["Name", "Pclass"],
          sampleRows: [
            ["Abbing, Mr. Anthony", 3],
            ["Abbott, Mr. Rossmore Edward", 3],
            ["Abbott, Mrs. Stanton", 3]
          ],
          totalRows: 891
        },
        explanation: "ORDER BY works on text too, sorting alphabetically."
      },
      {
        id: "d6q4",
        difficulty: "medium-hard",
        points: 20,
        hintPenalty: 6,
        title: "Multiple Sort Columns",
        description: "Sort passengers by **Pclass** (ascending), then by **Fare** (descending) within each class. Show Pclass, Name, Fare.",
        tableUsed: "passengers",
        hint: "List multiple columns: ORDER BY Pclass ASC, Fare DESC",
        solution: "SELECT Pclass, Name, Fare FROM passengers ORDER BY Pclass ASC, Fare DESC;",
        alternativeSolutions: ["SELECT Pclass, Name, Fare FROM passengers ORDER BY Pclass ASC, Fare DESC", "SELECT Pclass, Name, Fare FROM passengers ORDER BY Pclass, Fare DESC;"],
        expectedOutput: {
          columns: ["Pclass", "Name", "Fare"],
          sampleRows: [
            [1, "Cardeza, Mr. Thomas Drake Martinez", 512.33],
            [1, "Ward, Miss. Anna", 512.33],
            [2, "Fahlstrom, Mr. Arne Jonas", 13.0]
          ],
          totalRows: 891
        },
        explanation: "First sorts by Pclass (1,2,3), then within each class, sorts by Fare (highest first)."
      },
      {
        id: "d6q5",
        difficulty: "hard",
        points: 25,
        hintPenalty: 8,
        title: "Sort with Filter",
        description: "Find **female survivors**, sorted by **Age** (oldest first). Show Name, Age, Survived. Handle NULL ages.",
        tableUsed: "passengers",
        hint: "First WHERE to filter, then ORDER BY. NULLs in Age will sort to end with DESC.",
        solution: "SELECT Name, Age, Survived FROM passengers WHERE Sex = 'female' AND Survived = 1 ORDER BY Age DESC;",
        alternativeSolutions: ["SELECT Name, Age, Survived FROM passengers WHERE Sex = 'female' AND Survived = 1 ORDER BY Age DESC"],
        expectedOutput: {
          columns: ["Name", "Age", "Survived"],
          sampleRows: [
            ["Crosby, Mrs. Edward Gifford", 64.0, 1],
            ["Warren, Mrs. Frank Manley", 60.0, 1]
          ],
          totalRows: 233
        },
        explanation: "WHERE filters first, then ORDER BY sorts the results. The oldest female survivor was 64."
      }
    ]
  },

  // ==========================================
  // DAY 7: LIMIT and OFFSET
  // ==========================================
  day7: {
    day: 7,
    title: "LIMIT and OFFSET",
    topic: "Restricting and paginating results",
    dataset: "titanic",
    tables: ["passengers"],
    
    tableInfo: `
## Table: passengers
| Column | Type | Description |
|--------|------|-------------|
| PassengerId | INTEGER | Unique ID |
| Name | TEXT | Full name |
| Age | REAL | Age in years |
| Fare | REAL | Ticket price |
    `,
    
    questions: [
      {
        id: "d7q1",
        difficulty: "easy",
        points: 5,
        hintPenalty: 2,
        title: "Simple LIMIT",
        description: "Select the **first 5 passengers** (all columns).",
        tableUsed: "passengers",
        hint: "Add LIMIT at the end: SELECT * FROM passengers LIMIT 5;",
        solution: "SELECT * FROM passengers LIMIT 5;",
        alternativeSolutions: ["SELECT * FROM passengers LIMIT 5"],
        expectedOutput: {
          columns: ["PassengerId", "Survived", "Pclass", "Name", "Sex", "Age", "SibSp", "Parch", "Ticket", "Fare", "Cabin", "Embarked"],
          totalRows: 5
        },
        explanation: "LIMIT restricts the number of rows returned. Great for previewing large tables."
      },
      {
        id: "d7q2",
        difficulty: "easy-medium",
        points: 10,
        hintPenalty: 3,
        title: "Top N with ORDER BY",
        description: "Find the **10 oldest passengers**. Show Name and Age.",
        tableUsed: "passengers",
        hint: "First ORDER BY Age DESC, then LIMIT 10. The order matters!",
        solution: "SELECT Name, Age FROM passengers ORDER BY Age DESC LIMIT 10;",
        alternativeSolutions: ["SELECT Name, Age FROM passengers ORDER BY Age DESC LIMIT 10"],
        expectedOutput: {
          columns: ["Name", "Age"],
          sampleRows: [
            ["Barkworth, Mr. Algernon Henry Wilson", 80.0],
            ["Goldschmidt, Mr. George B", 71.0]
          ],
          totalRows: 10
        },
        explanation: "ORDER BY + LIMIT finds 'Top N' or 'Bottom N'. The oldest passenger was 80 years old."
      },
      {
        id: "d7q3",
        difficulty: "medium",
        points: 15,
        hintPenalty: 5,
        title: "Highest Fares",
        description: "Find the **5 highest fares** paid. Show Name, Pclass, and Fare.",
        tableUsed: "passengers",
        hint: "ORDER BY Fare DESC, then LIMIT 5. Select the three requested columns.",
        solution: "SELECT Name, Pclass, Fare FROM passengers ORDER BY Fare DESC LIMIT 5;",
        alternativeSolutions: ["SELECT Name, Pclass, Fare FROM passengers ORDER BY Fare DESC LIMIT 5"],
        expectedOutput: {
          columns: ["Name", "Pclass", "Fare"],
          sampleRows: [
            ["Cardeza, Mr. Thomas Drake Martinez", 1, 512.33],
            ["Ward, Miss. Anna", 1, 512.33],
            ["Lesurer, Mr. Gustave J", 1, 512.33]
          ],
          totalRows: 5
        },
        explanation: "Three passengers paid the highest fare of £512.33 - they likely shared a luxury suite."
      },
      {
        id: "d7q4",
        difficulty: "medium-hard",
        points: 20,
        hintPenalty: 6,
        title: "OFFSET for Pagination",
        description: "Get passengers **11-20** (skip first 10, then get 10). Show PassengerId, Name.",
        tableUsed: "passengers",
        hint: "LIMIT 10 OFFSET 10. OFFSET skips rows, then LIMIT takes rows after that.",
        solution: "SELECT PassengerId, Name FROM passengers LIMIT 10 OFFSET 10;",
        alternativeSolutions: ["SELECT PassengerId, Name FROM passengers LIMIT 10 OFFSET 10"],
        expectedOutput: {
          columns: ["PassengerId", "Name"],
          sampleRows: [
            [11, "Sandstrom, Miss. Marguerite Rut"],
            [12, "Bonnell, Miss. Elizabeth"]
          ],
          totalRows: 10
        },
        explanation: "OFFSET 10 skips rows 1-10, LIMIT 10 returns rows 11-20. This is pagination!"
      },
      {
        id: "d7q5",
        difficulty: "hard",
        points: 25,
        hintPenalty: 8,
        title: "Complex Pagination",
        description: "Find the **3rd through 7th highest fares** among **survivors**. Show Name, Fare, Survived.",
        tableUsed: "passengers",
        hint: "First filter (WHERE Survived = 1), then sort (ORDER BY Fare DESC), then LIMIT 5 OFFSET 2.",
        solution: "SELECT Name, Fare, Survived FROM passengers WHERE Survived = 1 ORDER BY Fare DESC LIMIT 5 OFFSET 2;",
        alternativeSolutions: ["SELECT Name, Fare, Survived FROM passengers WHERE Survived = 1 ORDER BY Fare DESC LIMIT 5 OFFSET 2"],
        expectedOutput: {
          columns: ["Name", "Fare", "Survived"],
          totalRows: 5
        },
        explanation: "Combines WHERE, ORDER BY, LIMIT, OFFSET. The clause order matters: WHERE → ORDER BY → LIMIT/OFFSET."
      }
    ]
  },

  // ==========================================
  // DAY 8: Aggregate Functions - COUNT, SUM
  // ==========================================
  day8: {
    day: 8,
    title: "Aggregate Functions: COUNT and SUM",
    topic: "Counting rows and summing values",
    dataset: "titanic",
    tables: ["passengers"],
    
    tableInfo: `
## Table: passengers (891 rows)
| Column | Type | Description |
|--------|------|-------------|
| Survived | INTEGER | 0=No, 1=Yes |
| Pclass | INTEGER | 1, 2, or 3 |
| Sex | TEXT | 'male' or 'female' |
| Age | REAL | Age (some NULL) |
| Fare | REAL | Ticket price |
    `,
    
    questions: [
      {
        id: "d8q1",
        difficulty: "easy",
        points: 5,
        hintPenalty: 2,
        title: "Count All Rows",
        description: "Count the **total number of passengers** in the dataset.",
        tableUsed: "passengers",
        hint: "Use COUNT(*) to count all rows: SELECT COUNT(*) FROM passengers;",
        solution: "SELECT COUNT(*) FROM passengers;",
        alternativeSolutions: ["SELECT COUNT(*) FROM passengers", "SELECT COUNT(*) AS total FROM passengers;"],
        expectedOutput: {
          columns: ["COUNT(*)"],
          sampleRows: [[891]],
          totalRows: 1
        },
        explanation: "COUNT(*) counts all rows regardless of NULL values. The Titanic dataset has 891 passengers."
      },
      {
        id: "d8q2",
        difficulty: "easy-medium",
        points: 10,
        hintPenalty: 3,
        title: "Count with Alias",
        description: "Count the total passengers and display the result as **total_passengers**.",
        tableUsed: "passengers",
        hint: "Add an alias: SELECT COUNT(*) AS total_passengers FROM passengers;",
        solution: "SELECT COUNT(*) AS total_passengers FROM passengers;",
        alternativeSolutions: ["SELECT COUNT(*) AS total_passengers FROM passengers"],
        expectedOutput: {
          columns: ["total_passengers"],
          sampleRows: [[891]],
          totalRows: 1
        },
        explanation: "Aliases make aggregate results more readable and meaningful."
      },
      {
        id: "d8q3",
        difficulty: "medium",
        points: 15,
        hintPenalty: 5,
        title: "Sum of Survivors",
        description: "Calculate the **total number of survivors** using SUM on the Survived column.",
        tableUsed: "passengers",
        hint: "Since Survived is 0 or 1, SUM(Survived) counts survivors: SELECT SUM(Survived) AS survivors FROM passengers;",
        solution: "SELECT SUM(Survived) AS survivors FROM passengers;",
        alternativeSolutions: ["SELECT SUM(Survived) AS survivors FROM passengers"],
        expectedOutput: {
          columns: ["survivors"],
          sampleRows: [[342]],
          totalRows: 1
        },
        explanation: "Since Survived is 0 or 1, SUM gives the count of survivors (342 people)."
      },
      {
        id: "d8q4",
        difficulty: "medium-hard",
        points: 20,
        hintPenalty: 6,
        title: "Total Revenue",
        description: "Calculate the **total fare revenue** (SUM of all Fare values). Display as **total_revenue**.",
        tableUsed: "passengers",
        hint: "SUM(Fare) adds up all ticket prices.",
        solution: "SELECT SUM(Fare) AS total_revenue FROM passengers;",
        alternativeSolutions: ["SELECT SUM(Fare) AS total_revenue FROM passengers"],
        expectedOutput: {
          columns: ["total_revenue"],
          sampleRows: [[28693.95]],
          totalRows: 1
        },
        explanation: "SUM adds numeric values. Total fare collected was about £28,694."
      },
      {
        id: "d8q5",
        difficulty: "hard",
        points: 25,
        hintPenalty: 8,
        title: "Multiple Aggregates",
        description: "In one query, show: **total_passengers** (COUNT), **survivors** (SUM of Survived), and **total_fare** (SUM of Fare).",
        tableUsed: "passengers",
        hint: "Combine multiple aggregates: SELECT COUNT(*) AS a, SUM(col1) AS b, SUM(col2) AS c FROM table;",
        solution: "SELECT COUNT(*) AS total_passengers, SUM(Survived) AS survivors, SUM(Fare) AS total_fare FROM passengers;",
        alternativeSolutions: ["SELECT COUNT(*) AS total_passengers, SUM(Survived) AS survivors, SUM(Fare) AS total_fare FROM passengers"],
        expectedOutput: {
          columns: ["total_passengers", "survivors", "total_fare"],
          sampleRows: [[891, 342, 28693.95]],
          totalRows: 1
        },
        explanation: "You can use multiple aggregate functions in one SELECT to get a summary dashboard."
      }
    ]
  },

  // ==========================================
  // DAY 9: Aggregate Functions - AVG, MIN, MAX
  // ==========================================
  day9: {
    day: 9,
    title: "Aggregate Functions: AVG, MIN, MAX",
    topic: "Calculating averages and finding extremes",
    dataset: "titanic",
    tables: ["passengers"],
    
    tableInfo: `
## Table: passengers
| Column | Type | Description |
|--------|------|-------------|
| Age | REAL | Age (some NULL) |
| Fare | REAL | Ticket price |
| Survived | INTEGER | 0 or 1 |
    `,
    
    questions: [
      {
        id: "d9q1",
        difficulty: "easy",
        points: 5,
        hintPenalty: 2,
        title: "Average Age",
        description: "Calculate the **average age** of passengers. Display as **avg_age**.",
        tableUsed: "passengers",
        hint: "Use AVG(Age): SELECT AVG(Age) AS avg_age FROM passengers;",
        solution: "SELECT AVG(Age) AS avg_age FROM passengers;",
        alternativeSolutions: ["SELECT AVG(Age) AS avg_age FROM passengers"],
        expectedOutput: {
          columns: ["avg_age"],
          sampleRows: [[29.7]],
          totalRows: 1
        },
        explanation: "AVG calculates the mean. The average passenger age was about 29.7 years. NULL ages are ignored."
      },
      {
        id: "d9q2",
        difficulty: "easy-medium",
        points: 10,
        hintPenalty: 3,
        title: "Min and Max Age",
        description: "Find the **youngest** and **oldest** passenger ages. Display as **youngest** and **oldest**.",
        tableUsed: "passengers",
        hint: "Use MIN(Age) and MAX(Age) in the same query.",
        solution: "SELECT MIN(Age) AS youngest, MAX(Age) AS oldest FROM passengers;",
        alternativeSolutions: ["SELECT MIN(Age) AS youngest, MAX(Age) AS oldest FROM passengers"],
        expectedOutput: {
          columns: ["youngest", "oldest"],
          sampleRows: [[0.42, 80.0]],
          totalRows: 1
        },
        explanation: "MIN finds the smallest value (0.42 years = ~5 months old baby), MAX finds largest (80 years)."
      },
      {
        id: "d9q3",
        difficulty: "medium",
        points: 15,
        hintPenalty: 5,
        title: "Fare Statistics",
        description: "Calculate **min_fare**, **max_fare**, and **avg_fare** for all passengers.",
        tableUsed: "passengers",
        hint: "Combine MIN, MAX, and AVG in one query with aliases.",
        solution: "SELECT MIN(Fare) AS min_fare, MAX(Fare) AS max_fare, AVG(Fare) AS avg_fare FROM passengers;",
        alternativeSolutions: ["SELECT MIN(Fare) AS min_fare, MAX(Fare) AS max_fare, AVG(Fare) AS avg_fare FROM passengers"],
        expectedOutput: {
          columns: ["min_fare", "max_fare", "avg_fare"],
          sampleRows: [[0.0, 512.33, 32.2]],
          totalRows: 1
        },
        explanation: "Some passengers had free tickets (£0), highest was £512.33, average was ~£32."
      },
      {
        id: "d9q4",
        difficulty: "medium-hard",
        points: 20,
        hintPenalty: 6,
        title: "Survival Rate",
        description: "Calculate the **survival rate** as a percentage (AVG of Survived * 100). Display as **survival_rate**.",
        tableUsed: "passengers",
        hint: "Since Survived is 0 or 1, AVG(Survived) gives the proportion. Multiply by 100 for percentage.",
        solution: "SELECT AVG(Survived) * 100 AS survival_rate FROM passengers;",
        alternativeSolutions: ["SELECT AVG(Survived) * 100 AS survival_rate FROM passengers"],
        expectedOutput: {
          columns: ["survival_rate"],
          sampleRows: [[38.4]],
          totalRows: 1
        },
        explanation: "AVG of a 0/1 column gives the proportion. About 38.4% of passengers survived."
      },
      {
        id: "d9q5",
        difficulty: "hard",
        points: 25,
        hintPenalty: 8,
        title: "Complete Statistics",
        description: "Create a statistics summary: **total** (COUNT), **survivors** (SUM), **survival_rate** (AVG*100), **avg_age** (AVG), **avg_fare** (AVG).",
        tableUsed: "passengers",
        hint: "Combine all aggregates in one SELECT. Round values aren't required but are nice.",
        solution: "SELECT COUNT(*) AS total, SUM(Survived) AS survivors, AVG(Survived) * 100 AS survival_rate, AVG(Age) AS avg_age, AVG(Fare) AS avg_fare FROM passengers;",
        alternativeSolutions: ["SELECT COUNT(*) AS total, SUM(Survived) AS survivors, AVG(Survived) * 100 AS survival_rate, AVG(Age) AS avg_age, AVG(Fare) AS avg_fare FROM passengers"],
        expectedOutput: {
          columns: ["total", "survivors", "survival_rate", "avg_age", "avg_fare"],
          sampleRows: [[891, 342, 38.4, 29.7, 32.2]],
          totalRows: 1
        },
        explanation: "This gives a dashboard-style summary of the entire dataset in one query."
      }
    ]
  },

  // ==========================================
  // DAY 10: GROUP BY Basics
  // ==========================================
  day10: {
    day: 10,
    title: "GROUP BY Basics",
    topic: "Grouping data for aggregate analysis",
    dataset: "titanic",
    tables: ["passengers"],
    
    tableInfo: `
## Table: passengers
| Column | Type | Values |
|--------|------|--------|
| Pclass | INTEGER | 1, 2, or 3 |
| Sex | TEXT | 'male' or 'female' |
| Survived | INTEGER | 0 or 1 |
| Age | REAL | Age in years |
| Fare | REAL | Ticket price |
    `,
    
    questions: [
      {
        id: "d10q1",
        difficulty: "easy",
        points: 5,
        hintPenalty: 2,
        title: "Count by Class",
        description: "Count how many passengers were in **each class**. Show Pclass and count.",
        tableUsed: "passengers",
        hint: "GROUP BY Pclass: SELECT Pclass, COUNT(*) FROM passengers GROUP BY Pclass;",
        solution: "SELECT Pclass, COUNT(*) AS count FROM passengers GROUP BY Pclass;",
        alternativeSolutions: ["SELECT Pclass, COUNT(*) AS count FROM passengers GROUP BY Pclass", "SELECT Pclass, COUNT(*) FROM passengers GROUP BY Pclass;"],
        expectedOutput: {
          columns: ["Pclass", "count"],
          sampleRows: [[1, 216], [2, 184], [3, 491]],
          totalRows: 3
        },
        explanation: "GROUP BY creates buckets. 216 in 1st class, 184 in 2nd, 491 in 3rd."
      },
      {
        id: "d10q2",
        difficulty: "easy-medium",
        points: 10,
        hintPenalty: 3,
        title: "Count by Gender",
        description: "Count passengers by **Sex**. Show Sex and the count as **total**.",
        tableUsed: "passengers",
        hint: "GROUP BY Sex and use COUNT(*) with an alias.",
        solution: "SELECT Sex, COUNT(*) AS total FROM passengers GROUP BY Sex;",
        alternativeSolutions: ["SELECT Sex, COUNT(*) AS total FROM passengers GROUP BY Sex"],
        expectedOutput: {
          columns: ["Sex", "total"],
          sampleRows: [["female", 314], ["male", 577]],
          totalRows: 2
        },
        explanation: "314 women and 577 men were aboard."
      },
      {
        id: "d10q3",
        difficulty: "medium",
        points: 15,
        hintPenalty: 5,
        title: "Average Fare by Class",
        description: "Calculate the **average fare** for each **Pclass**. Show Pclass and avg_fare.",
        tableUsed: "passengers",
        hint: "Use AVG(Fare) with GROUP BY Pclass.",
        solution: "SELECT Pclass, AVG(Fare) AS avg_fare FROM passengers GROUP BY Pclass;",
        alternativeSolutions: ["SELECT Pclass, AVG(Fare) AS avg_fare FROM passengers GROUP BY Pclass"],
        expectedOutput: {
          columns: ["Pclass", "avg_fare"],
          sampleRows: [[1, 84.15], [2, 20.66], [3, 13.68]],
          totalRows: 3
        },
        explanation: "First class paid ~£84 on average, second ~£21, third ~£14."
      },
      {
        id: "d10q4",
        difficulty: "medium-hard",
        points: 20,
        hintPenalty: 6,
        title: "Survival by Gender",
        description: "Calculate **survival rate** (AVG*100) and **survivor count** for each **Sex**. Show Sex, survival_rate, survivors.",
        tableUsed: "passengers",
        hint: "GROUP BY Sex, then use AVG(Survived)*100 and SUM(Survived).",
        solution: "SELECT Sex, AVG(Survived) * 100 AS survival_rate, SUM(Survived) AS survivors FROM passengers GROUP BY Sex;",
        alternativeSolutions: ["SELECT Sex, AVG(Survived) * 100 AS survival_rate, SUM(Survived) AS survivors FROM passengers GROUP BY Sex"],
        expectedOutput: {
          columns: ["Sex", "survival_rate", "survivors"],
          sampleRows: [["female", 74.2, 233], ["male", 18.9, 109]],
          totalRows: 2
        },
        explanation: "74% of women survived vs only 19% of men - 'women and children first' policy."
      },
      {
        id: "d10q5",
        difficulty: "hard",
        points: 25,
        hintPenalty: 8,
        title: "Class Statistics",
        description: "For each **Pclass**, show: **total** passengers, **survivors**, **survival_rate**, and **avg_age**.",
        tableUsed: "passengers",
        hint: "Combine COUNT(*), SUM(Survived), AVG(Survived)*100, AVG(Age) with GROUP BY Pclass.",
        solution: "SELECT Pclass, COUNT(*) AS total, SUM(Survived) AS survivors, AVG(Survived) * 100 AS survival_rate, AVG(Age) AS avg_age FROM passengers GROUP BY Pclass;",
        alternativeSolutions: ["SELECT Pclass, COUNT(*) AS total, SUM(Survived) AS survivors, AVG(Survived) * 100 AS survival_rate, AVG(Age) AS avg_age FROM passengers GROUP BY Pclass"],
        expectedOutput: {
          columns: ["Pclass", "total", "survivors", "survival_rate", "avg_age"],
          sampleRows: [
            [1, 216, 136, 63.0, 38.2],
            [2, 184, 87, 47.3, 29.9],
            [3, 491, 119, 24.2, 25.1]
          ],
          totalRows: 3
        },
        explanation: "First class had 63% survival, second 47%, third only 24%. Class mattered for survival."
      }
    ]
  }
};
