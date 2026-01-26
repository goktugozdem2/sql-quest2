// Sample Questions for Day 1 & Day 2
// 5 questions per day with progressive difficulty

window.sampleDayQuestions = {
  
  // ============ DAY 1: Introduction to SQL ============
  // Topic: Basic SELECT, FROM, retrieving data
  day1: {
    title: "Introduction to SQL",
    lesson: "SELECT basics, retrieving all data, understanding tables",
    dataset: "titanic",
    questions: [
      {
        id: "d1q1",
        difficulty: "easy",
        points: 5,
        hintPenalty: 2,
        title: "Your First Query",
        description: "Write a query to select **all columns** from the **passengers** table.",
        hint: "Use SELECT * to get all columns. The table name is 'passengers'.",
        solution: "SELECT * FROM passengers;",
        alternativeSolutions: [
          "SELECT * FROM passengers",
          "select * from passengers;",
          "select * from passengers"
        ],
        expectedRowCount: 891,
        explanation: "SELECT * FROM table_name retrieves all columns and all rows from a table. The asterisk (*) is a wildcard meaning 'everything'."
      },
      {
        id: "d1q2",
        difficulty: "easy-medium",
        points: 10,
        hintPenalty: 3,
        title: "Selecting Specific Columns",
        description: "Select only the **Name** and **Age** columns from the passengers table.",
        hint: "List the column names separated by commas after SELECT.",
        solution: "SELECT Name, Age FROM passengers;",
        alternativeSolutions: [
          "SELECT Name, Age FROM passengers",
          "select name, age from passengers;",
          "SELECT Name,Age FROM passengers;"
        ],
        expectedColumns: ["Name", "Age"],
        explanation: "Instead of *, you can list specific column names to retrieve only the data you need. This is more efficient for large tables."
      },
      {
        id: "d1q3",
        difficulty: "medium",
        points: 15,
        hintPenalty: 5,
        title: "Multiple Columns",
        description: "Select the **PassengerId**, **Name**, **Sex**, and **Survived** columns from the passengers table.",
        hint: "List all four columns separated by commas. Column names are case-sensitive.",
        solution: "SELECT PassengerId, Name, Sex, Survived FROM passengers;",
        alternativeSolutions: [
          "SELECT PassengerId, Name, Sex, Survived FROM passengers"
        ],
        expectedColumns: ["PassengerId", "Name", "Sex", "Survived"],
        explanation: "You can select any number of columns by listing them. The order you list them is the order they'll appear in results."
      },
      {
        id: "d1q4",
        difficulty: "medium-hard",
        points: 20,
        hintPenalty: 6,
        title: "Column Order Matters",
        description: "Select **Survived**, **Pclass**, and **Name** (in that exact order) from the passengers table.",
        hint: "The columns should appear in your results in the order: Survived, Pclass, Name.",
        solution: "SELECT Survived, Pclass, Name FROM passengers;",
        alternativeSolutions: [
          "SELECT Survived, Pclass, Name FROM passengers"
        ],
        validateColumnOrder: true,
        expectedColumns: ["Survived", "Pclass", "Name"],
        explanation: "The order of columns in SELECT determines the order in your output. This matters when preparing data for reports or applications."
      },
      {
        id: "d1q5",
        difficulty: "hard",
        points: 25,
        hintPenalty: 8,
        title: "All Passenger Details",
        description: "Select **Name**, **Age**, **Sex**, **Pclass**, **Fare**, and **Embarked** from the passengers table. These are the key details about each passenger.",
        hint: "List all six columns. Watch for typos - column names must match exactly (case-sensitive).",
        solution: "SELECT Name, Age, Sex, Pclass, Fare, Embarked FROM passengers;",
        alternativeSolutions: [
          "SELECT Name, Age, Sex, Pclass, Fare, Embarked FROM passengers"
        ],
        expectedColumns: ["Name", "Age", "Sex", "Pclass", "Fare", "Embarked"],
        explanation: "Selecting multiple specific columns is a common real-world task. You often need a subset of columns for analysis, not the entire table."
      }
    ]
  },

  // ============ DAY 2: Understanding Databases and Tables ============
  // Topic: Column aliases, expressions, DISTINCT
  day2: {
    title: "Understanding Databases and Tables",
    lesson: "Column aliases with AS, expressions, DISTINCT for unique values",
    dataset: "titanic",
    questions: [
      {
        id: "d2q1",
        difficulty: "easy",
        points: 5,
        hintPenalty: 2,
        title: "Simple Alias",
        description: "Select the **Name** column but display it as **passenger_name** using an alias.",
        hint: "Use AS to create an alias: SELECT column AS alias_name",
        solution: "SELECT Name AS passenger_name FROM passengers;",
        alternativeSolutions: [
          "SELECT Name AS passenger_name FROM passengers",
          "SELECT Name as passenger_name FROM passengers;",
          "SELECT Name passenger_name FROM passengers;"
        ],
        expectedColumns: ["passenger_name"],
        explanation: "AS creates an alias - a temporary name for a column in your results. This makes output more readable."
      },
      {
        id: "d2q2",
        difficulty: "easy-medium",
        points: 10,
        hintPenalty: 3,
        title: "Multiple Aliases",
        description: "Select **Name** as **passenger** and **Fare** as **ticket_price** from the passengers table.",
        hint: "Use AS for each column you want to rename.",
        solution: "SELECT Name AS passenger, Fare AS ticket_price FROM passengers;",
        alternativeSolutions: [
          "SELECT Name AS passenger, Fare AS ticket_price FROM passengers",
          "SELECT Name as passenger, Fare as ticket_price FROM passengers;"
        ],
        expectedColumns: ["passenger", "ticket_price"],
        explanation: "You can alias multiple columns in the same query. Aliases are especially useful when column names are unclear or too long."
      },
      {
        id: "d2q3",
        difficulty: "medium",
        points: 15,
        hintPenalty: 5,
        title: "Find Unique Values",
        description: "Find all **unique passenger classes** (Pclass) in the dataset. Each class should appear only once.",
        hint: "Use DISTINCT before the column name to remove duplicates.",
        solution: "SELECT DISTINCT Pclass FROM passengers;",
        alternativeSolutions: [
          "SELECT DISTINCT Pclass FROM passengers",
          "select distinct pclass from passengers;",
          "SELECT DISTINCT(Pclass) FROM passengers;"
        ],
        expectedRowCount: 3,
        explanation: "DISTINCT removes duplicate values. The Titanic had 3 classes (1st, 2nd, 3rd), so this returns exactly 3 rows."
      },
      {
        id: "d2q4",
        difficulty: "medium-hard",
        points: 20,
        hintPenalty: 6,
        title: "Distinct with Alias",
        description: "Select all **unique embarkation ports** (Embarked column) and display the column as **port**.",
        hint: "Combine DISTINCT with AS: SELECT DISTINCT column AS alias",
        solution: "SELECT DISTINCT Embarked AS port FROM passengers;",
        alternativeSolutions: [
          "SELECT DISTINCT Embarked AS port FROM passengers",
          "SELECT DISTINCT Embarked as port FROM passengers;"
        ],
        expectedColumns: ["port"],
        explanation: "You can combine DISTINCT with aliases. The Embarked column has values: S (Southampton), C (Cherbourg), Q (Queenstown), and some NULL."
      },
      {
        id: "d2q5",
        difficulty: "hard",
        points: 25,
        hintPenalty: 8,
        title: "Unique Combinations",
        description: "Find all **unique combinations** of **Pclass** and **Survived**. Display them as **class** and **survived**.",
        hint: "DISTINCT can work on multiple columns: SELECT DISTINCT col1, col2. Add aliases to both.",
        solution: "SELECT DISTINCT Pclass AS class, Survived AS survived FROM passengers;",
        alternativeSolutions: [
          "SELECT DISTINCT Pclass AS class, Survived AS survived FROM passengers",
          "SELECT DISTINCT Pclass as class, Survived as survived FROM passengers;"
        ],
        expectedRowCount: 6,
        expectedColumns: ["class", "survived"],
        explanation: "DISTINCT on multiple columns finds unique combinations. With 3 classes × 2 survival outcomes, there are 6 possible combinations."
      }
    ]
  }
};

// Scoring summary
window.dayQuestionScoring = {
  difficulties: {
    "easy": { points: 5, hintPenalty: 2 },
    "easy-medium": { points: 10, hintPenalty: 3 },
    "medium": { points: 15, hintPenalty: 5 },
    "medium-hard": { points: 20, hintPenalty: 6 },
    "hard": { points: 25, hintPenalty: 8 }
  },
  maxPointsPerDay: 75, // 5 + 10 + 15 + 20 + 25
  passRequirement: 3,  // Must answer at least 3 correctly to pass
  bonusAllCorrect: 10  // Bonus XP for getting all 5 correct
};

/*
SUMMARY:
=========

Day 1: Introduction to SQL
  Q1 (Easy):        Select all columns (SELECT *)
  Q2 (Easy-Medium): Select 2 specific columns
  Q3 (Medium):      Select 4 specific columns
  Q4 (Medium-Hard): Select 3 columns in specific order
  Q5 (Hard):        Select 6 columns correctly

Day 2: Understanding Databases and Tables  
  Q1 (Easy):        Simple column alias
  Q2 (Easy-Medium): Multiple column aliases
  Q3 (Medium):      DISTINCT for unique values
  Q4 (Medium-Hard): DISTINCT with alias
  Q5 (Hard):        DISTINCT on multiple columns with aliases

Progression:
- Easy: Direct application of lesson concept
- Easy-Medium: Small variation or addition
- Medium: Core concept with more complexity
- Medium-Hard: Combining concepts
- Hard: Full mastery, combining everything learned

*/
