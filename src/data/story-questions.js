// SQL Quest - Story Mode Questions
// Real-life scenario-based SQL challenges with immersive narratives
// Each story places you in a real role solving real problems with SQL

window.storyQuestionsData = [
  // ============================================
  // STORY 1: The Coffee Chain Crisis
  // ============================================
  {
    id: "story_1",
    title: "The Coffee Chain Crisis",
    difficulty: "Easy",
    category: "SELECT + WHERE",
    skills: ["SELECT", "WHERE", "ORDER BY"],
    xpReward: 30,
    estimatedTime: "5 min",
    role: "Data Analyst at BrewRight Coffee",
    setting: "Corporate HQ, Monday morning emergency meeting",
    story: `You're a data analyst at **BrewRight Coffee**, a chain with 200+ locations nationwide. At 7 AM Monday, the CEO bursts into the analytics room holding a newspaper: **"The Daily Tribune just published that we have health code violations at multiple stores!"**

The PR team needs answers in 30 minutes before the press conference. The VP of Operations pulls up the internal inspection database and turns to you: **"Which stores failed their health inspections last quarter? We need the store name, city, and the violation score — worst offenders first."**

Every minute counts. The company's reputation is on the line.`,
    question: "Write a query to find all stores where `inspection_score` is below 70 (failing grade). Return the `store_name`, `city`, and `inspection_score`, ordered from worst to best score.",
    tables: ["stores"],
    tableSchema: {
      stores: {
        columns: ["store_id", "store_name", "city", "state", "region", "manager", "opened_date", "inspection_score", "monthly_revenue", "employee_count"],
        data: [
          [1, "BrewRight Downtown", "Chicago", "IL", "Midwest", "Maria Santos", "2019-03-15", 45, 82000, 12],
          [2, "BrewRight Lakeside", "Chicago", "IL", "Midwest", "Tom Chen", "2020-06-01", 92, 95000, 15],
          [3, "BrewRight Midtown", "New York", "NY", "Northeast", "Sarah Kim", "2018-01-10", 61, 120000, 18],
          [4, "BrewRight SoHo", "New York", "NY", "Northeast", "James Wright", "2021-02-20", 88, 110000, 14],
          [5, "BrewRight Venice", "Los Angeles", "CA", "West", "Ana Lopez", "2019-11-05", 55, 78000, 11],
          [6, "BrewRight Hollywood", "Los Angeles", "CA", "West", "Mike Johnson", "2020-08-12", 95, 105000, 16],
          [7, "BrewRight Pearl", "Portland", "OR", "West", "Emily Park", "2017-04-22", 38, 65000, 9],
          [8, "BrewRight Pioneer", "Portland", "OR", "West", "David Lee", "2022-01-15", 91, 72000, 10],
          [9, "BrewRight Capitol", "Austin", "TX", "South", "Rachel Green", "2020-03-08", 67, 88000, 13],
          [10, "BrewRight Sixth", "Austin", "TX", "South", "Carlos Rivera", "2019-07-19", 82, 91000, 14],
          [11, "BrewRight Buckhead", "Atlanta", "GA", "South", "Nina Patel", "2021-05-30", 73, 79000, 11],
          [12, "BrewRight Decatur", "Atlanta", "GA", "South", "Omar Hassan", "2018-09-14", 58, 68000, 10]
        ]
      }
    },
    hint: "Filter where inspection_score < 70, select the three columns asked for, and ORDER BY inspection_score ASC to show worst first.",
    solution: "SELECT store_name, city, inspection_score FROM stores WHERE inspection_score < 70 ORDER BY inspection_score ASC",
    dataset: "story"
  },

  // ============================================
  // STORY 2: The Hospital Staffing Emergency
  // ============================================
  {
    id: "story_2",
    title: "The Hospital Staffing Emergency",
    difficulty: "Easy",
    category: "Aggregation",
    skills: ["SELECT", "GROUP BY", "Aggregation", "ORDER BY"],
    xpReward: 35,
    estimatedTime: "6 min",
    role: "Healthcare Data Coordinator",
    setting: "Metro General Hospital, flu season surge",
    story: `It's January and the worst flu season in a decade has hit the city. **Metro General Hospital** is overwhelmed — the ER wait times have tripled and nurses are working double shifts.

The Chief Nursing Officer calls you into her office: **"I need to know how many nurses we have in each department RIGHT NOW. Some departments might be critically understaffed. If any department has fewer than 5 nurses on active duty, we need to pull travel nurses immediately."**

She adds: **"Sort it so I can see the most understaffed departments first. I'm presenting this to the hospital board in an hour and I need to request emergency funding."**

The staffing crisis is real — patient safety depends on your query.`,
    question: "Write a query to count the number of nurses in each `department`. Return the `department` and nurse count as `nurse_count`, ordered from fewest nurses to most.",
    tables: ["staff"],
    tableSchema: {
      staff: {
        columns: ["staff_id", "name", "role", "department", "shift", "hire_date", "hourly_rate", "status"],
        data: [
          [1, "Lisa Chang", "Nurse", "Emergency", "Day", "2019-03-15", 42, "Active"],
          [2, "Robert Miles", "Doctor", "Emergency", "Day", "2015-06-01", 95, "Active"],
          [3, "Amy Torres", "Nurse", "Emergency", "Night", "2020-01-10", 45, "Active"],
          [4, "John Smith", "Nurse", "Emergency", "Day", "2021-08-20", 40, "Active"],
          [5, "Karen White", "Nurse", "ICU", "Day", "2018-04-05", 48, "Active"],
          [6, "Derek Brown", "Nurse", "ICU", "Night", "2019-11-12", 48, "Active"],
          [7, "Priya Sharma", "Doctor", "ICU", "Day", "2016-02-28", 110, "Active"],
          [8, "Michelle Lee", "Nurse", "ICU", "Day", "2022-03-01", 43, "Active"],
          [9, "James Wilson", "Nurse", "Pediatrics", "Day", "2020-07-15", 41, "Active"],
          [10, "Sarah Connor", "Nurse", "Pediatrics", "Night", "2017-09-22", 44, "Active"],
          [11, "Tom Hardy", "Doctor", "Pediatrics", "Day", "2014-05-10", 100, "Active"],
          [12, "Nina Patel", "Nurse", "Surgery", "Day", "2019-01-08", 50, "Active"],
          [13, "Alex Johnson", "Nurse", "Surgery", "Night", "2021-06-14", 50, "Active"],
          [14, "Maria Garcia", "Nurse", "Surgery", "Day", "2018-10-30", 52, "Active"],
          [15, "Chris Evans", "Nurse", "Surgery", "Night", "2020-04-18", 49, "Active"],
          [16, "Diana Prince", "Nurse", "Surgery", "Day", "2022-01-05", 47, "Active"],
          [17, "Rachel Kim", "Nurse", "Maternity", "Day", "2019-08-25", 43, "Active"],
          [18, "Paul Adams", "Doctor", "Maternity", "Night", "2017-03-12", 98, "Active"],
          [19, "Helen Troy", "Nurse", "Maternity", "Night", "2021-11-01", 42, "Active"],
          [20, "Ben Carter", "Nurse", "Emergency", "Night", "2022-05-20", 41, "Active"]
        ]
      }
    },
    hint: "You need to filter for role = 'Nurse' first with WHERE, then GROUP BY department, use COUNT(*) as nurse_count, and ORDER BY nurse_count ASC.",
    solution: "SELECT department, COUNT(*) as nurse_count FROM staff WHERE role = 'Nurse' GROUP BY department ORDER BY nurse_count ASC",
    dataset: "story"
  },

  // ============================================
  // STORY 3: The E-Commerce Fraud Ring
  // ============================================
  {
    id: "story_3",
    title: "The E-Commerce Fraud Ring",
    difficulty: "Medium",
    category: "GROUP BY + HAVING",
    skills: ["SELECT", "GROUP BY", "HAVING", "Aggregation"],
    xpReward: 50,
    estimatedTime: "8 min",
    role: "Fraud Analyst at ShopSafe Inc.",
    setting: "Fraud Investigation Unit, pattern detected",
    story: `You work on the fraud team at **ShopSafe**, a major online marketplace. The automated fraud detection system flagged an unusual spike over the weekend — **$2.3 million in suspicious transactions**.

Your team lead pulls you aside: **"We think there's an organized fraud ring using stolen credit cards. The pattern is always the same — a single customer account places a suspiciously high number of orders in a short period. Legitimate customers rarely place more than 3 orders in a single day."**

She continues: **"I need you to find every customer who placed more than 3 orders on the same day. Give me the customer ID, the date, and how many orders they placed. We need to freeze these accounts before they do more damage."**

Law enforcement is waiting for your findings.`,
    question: "Find customers who placed **more than 3 orders on the same day**. Return `customer_id`, `order_date`, and the order count as `order_count`. Only include groups where the count exceeds 3.",
    tables: ["transactions"],
    tableSchema: {
      transactions: {
        columns: ["transaction_id", "customer_id", "order_date", "amount", "product_category", "payment_method", "shipping_city", "status"],
        data: [
          [1001, "C-441", "2024-12-14", 299.99, "Electronics", "Credit Card", "Miami", "Completed"],
          [1002, "C-441", "2024-12-14", 549.00, "Electronics", "Credit Card", "Miami", "Completed"],
          [1003, "C-441", "2024-12-14", 1299.99, "Electronics", "Credit Card", "Miami", "Completed"],
          [1004, "C-441", "2024-12-14", 899.00, "Electronics", "Credit Card", "Miami", "Completed"],
          [1005, "C-441", "2024-12-14", 449.99, "Electronics", "Credit Card", "Miami", "Completed"],
          [1006, "C-227", "2024-12-14", 35.50, "Books", "Debit Card", "Denver", "Completed"],
          [1007, "C-227", "2024-12-14", 22.99, "Books", "Debit Card", "Denver", "Completed"],
          [1008, "C-892", "2024-12-15", 799.00, "Electronics", "Credit Card", "Houston", "Completed"],
          [1009, "C-892", "2024-12-15", 1199.00, "Electronics", "Credit Card", "Houston", "Completed"],
          [1010, "C-892", "2024-12-15", 649.99, "Electronics", "Credit Card", "Houston", "Completed"],
          [1011, "C-892", "2024-12-15", 999.00, "Electronics", "Credit Card", "Houston", "Completed"],
          [1012, "C-892", "2024-12-15", 459.00, "Electronics", "Credit Card", "Houston", "Pending"],
          [1013, "C-115", "2024-12-15", 89.99, "Clothing", "PayPal", "Seattle", "Completed"],
          [1014, "C-115", "2024-12-16", 45.00, "Clothing", "PayPal", "Seattle", "Completed"],
          [1015, "C-330", "2024-12-16", 2499.99, "Electronics", "Credit Card", "Atlanta", "Completed"],
          [1016, "C-330", "2024-12-16", 1899.00, "Electronics", "Credit Card", "Atlanta", "Completed"],
          [1017, "C-330", "2024-12-16", 3299.99, "Electronics", "Credit Card", "Atlanta", "Completed"],
          [1018, "C-330", "2024-12-16", 799.00, "Electronics", "Credit Card", "Atlanta", "Completed"],
          [1019, "C-330", "2024-12-16", 1599.00, "Electronics", "Credit Card", "Atlanta", "Completed"],
          [1020, "C-330", "2024-12-16", 999.99, "Electronics", "Credit Card", "Atlanta", "Completed"],
          [1021, "C-556", "2024-12-16", 129.99, "Home", "Debit Card", "Chicago", "Completed"],
          [1022, "C-556", "2024-12-16", 79.50, "Home", "Debit Card", "Chicago", "Completed"],
          [1023, "C-556", "2024-12-16", 199.99, "Home", "Debit Card", "Chicago", "Completed"],
          [1024, "C-663", "2024-12-17", 59.99, "Toys", "Credit Card", "Boston", "Completed"]
        ]
      }
    },
    hint: "GROUP BY customer_id and order_date, use COUNT(*) as order_count, then filter groups with HAVING COUNT(*) > 3.",
    solution: "SELECT customer_id, order_date, COUNT(*) as order_count FROM transactions GROUP BY customer_id, order_date HAVING COUNT(*) > 3",
    dataset: "story"
  },

  // ============================================
  // STORY 4: The School District Budget Cuts
  // ============================================
  {
    id: "story_4",
    title: "The School District Budget Cuts",
    difficulty: "Medium",
    category: "JOIN",
    skills: ["SELECT", "JOIN", "WHERE", "ORDER BY"],
    xpReward: 55,
    estimatedTime: "10 min",
    role: "Data Analyst, City Education Department",
    setting: "Board of Education meeting, budget season",
    story: `The city's education budget has been slashed by 15%, and the **Board of Education** needs to make painful decisions about which programs to cut. Before any cuts are made, the superintendent wants data.

She addresses the room: **"We cannot make cuts blindly. I need to see which teachers are in which schools, and specifically — I want to see teachers earning above $65,000 along with their school's overall performance rating. If a high-performing school has highly-paid teachers, we protect them. But if a low-performing school has high salaries, we need to investigate."**

She turns to you: **"Join the teacher records with the school data. Show me teacher name, salary, school name, and school performance rating for every teacher making over $65,000. Sort by salary, highest first."**

The livelihoods of educators depend on this analysis being accurate.`,
    question: "Join the `teachers` and `schools` tables. Return `teacher_name`, `salary`, `school_name`, and `performance_rating` for teachers with salary > 65000. Order by salary descending.",
    tables: ["teachers", "schools"],
    tableSchema: {
      teachers: {
        columns: ["teacher_id", "teacher_name", "subject", "school_id", "salary", "years_experience", "certification_level"],
        data: [
          [1, "Angela Morrison", "Math", 101, 72000, 15, "Senior"],
          [2, "David Park", "English", 101, 58000, 8, "Standard"],
          [3, "Catherine Obi", "Science", 102, 81000, 20, "Master"],
          [4, "Marcus Thompson", "History", 102, 63000, 10, "Standard"],
          [5, "Jennifer Liu", "Math", 103, 69000, 12, "Senior"],
          [6, "Robert Franklin", "PE", 103, 52000, 5, "Standard"],
          [7, "Samantha Wells", "English", 104, 78000, 18, "Master"],
          [8, "Brian O'Connell", "Science", 104, 67000, 11, "Senior"],
          [9, "Patricia Nguyen", "Art", 105, 55000, 7, "Standard"],
          [10, "William Hayes", "Math", 105, 91000, 25, "Master"],
          [11, "Linda Martinez", "History", 101, 66000, 13, "Senior"],
          [12, "Steven Clark", "Science", 106, 74000, 16, "Senior"]
        ]
      },
      schools: {
        columns: ["school_id", "school_name", "district", "student_count", "performance_rating", "funding_level"],
        data: [
          [101, "Lincoln Elementary", "North", 450, "A", "High"],
          [102, "Washington Middle", "North", 680, "B+", "Medium"],
          [103, "Jefferson High", "South", 1200, "C+", "Low"],
          [104, "Roosevelt Academy", "East", 520, "A-", "High"],
          [105, "Kennedy Prep", "West", 380, "D", "Low"],
          [106, "Adams Charter", "South", 290, "B", "Medium"]
        ]
      }
    },
    hint: "Use JOIN ... ON teachers.school_id = schools.school_id, add WHERE salary > 65000, and ORDER BY salary DESC.",
    solution: "SELECT teacher_name, salary, school_name, performance_rating FROM teachers JOIN schools ON teachers.school_id = schools.school_id WHERE salary > 65000 ORDER BY salary DESC",
    dataset: "story"
  },

  // ============================================
  // STORY 5: The Airline Overbooking Disaster
  // ============================================
  {
    id: "story_5",
    title: "The Airline Overbooking Disaster",
    difficulty: "Medium",
    category: "Subquery",
    skills: ["SELECT", "Subquery", "Aggregation", "WHERE"],
    xpReward: 60,
    estimatedTime: "10 min",
    role: "Operations Analyst at SkyBound Airlines",
    setting: "Operations center, holiday travel chaos",
    story: `It's the day before Thanksgiving, and **SkyBound Airlines** is in crisis mode. Multiple flights have been overbooked, and angry passengers are flooding social media with complaints. The PR nightmare is escalating by the hour.

The VP of Operations needs to identify the most problematic routes. He calls an emergency meeting: **"Flights that are booked beyond their capacity are the ones causing gate confrontations. I need to know which flights have more bookings than the average number of bookings across all flights."**

He slams the table: **"These are the flights where we're most likely to have incidents. Find them NOW so we can proactively offer rebooking incentives before passengers arrive at the gate."**

Your query will determine which gates get extra staff and which passengers get upgraded.`,
    question: "Find all flights where the `bookings` count is **greater than the average bookings** across all flights. Return `flight_number`, `route`, `bookings`, and `capacity`.",
    tables: ["flights"],
    tableSchema: {
      flights: {
        columns: ["flight_id", "flight_number", "route", "departure_time", "bookings", "capacity", "aircraft_type", "status"],
        data: [
          [1, "SB-101", "NYC → LAX", "2024-11-27 06:00", 185, 180, "Boeing 737", "On Time"],
          [2, "SB-204", "NYC → Chicago", "2024-11-27 07:30", 142, 150, "Airbus A320", "On Time"],
          [3, "SB-315", "LAX → Denver", "2024-11-27 08:00", 198, 180, "Boeing 737", "Delayed"],
          [4, "SB-410", "Chicago → Miami", "2024-11-27 09:15", 120, 150, "Airbus A320", "On Time"],
          [5, "SB-522", "Denver → NYC", "2024-11-27 10:00", 165, 160, "Boeing 737", "On Time"],
          [6, "SB-618", "Miami → LAX", "2024-11-27 11:30", 95, 150, "Airbus A320", "Cancelled"],
          [7, "SB-707", "NYC → Atlanta", "2024-11-27 12:00", 210, 200, "Boeing 777", "On Time"],
          [8, "SB-830", "Atlanta → Denver", "2024-11-27 13:45", 130, 150, "Airbus A320", "Delayed"],
          [9, "SB-915", "LAX → NYC", "2024-11-27 14:30", 192, 180, "Boeing 737", "On Time"],
          [10, "SB-1020", "Chicago → LAX", "2024-11-27 16:00", 155, 160, "Boeing 737", "On Time"],
          [11, "SB-1105", "Denver → Miami", "2024-11-27 17:30", 88, 150, "Airbus A320", "On Time"],
          [12, "SB-1212", "Atlanta → NYC", "2024-11-27 19:00", 175, 200, "Boeing 777", "On Time"]
        ]
      }
    },
    hint: "Use a subquery: WHERE bookings > (SELECT AVG(bookings) FROM flights). The subquery calculates the average, and the outer query filters flights above it.",
    solution: "SELECT flight_number, route, bookings, capacity FROM flights WHERE bookings > (SELECT AVG(bookings) FROM flights)",
    dataset: "story"
  },

  // ============================================
  // STORY 6: The Startup Salary Equity Audit
  // ============================================
  {
    id: "story_6",
    title: "The Startup Salary Equity Audit",
    difficulty: "Medium",
    category: "GROUP BY + Aggregation",
    skills: ["SELECT", "GROUP BY", "Aggregation", "ROUND"],
    xpReward: 50,
    estimatedTime: "8 min",
    role: "People Analytics Lead at TechNova",
    setting: "HR department, annual equity review",
    story: `**TechNova**, a fast-growing startup with 200 employees, just received a complaint filed with the Equal Employment Opportunity Commission alleging **gender pay disparity**. The CEO is taking this very seriously.

The Head of HR meets with you urgently: **"We need to run a full salary equity audit TODAY. The board and our legal team need to see the average salary broken down by department and gender. If there are significant gaps, we need to know now — not when the lawsuit hits."**

She adds: **"Round the averages to two decimal places. And make sure it's grouped clearly so we can see the comparison side by side. This will go directly into the legal brief."**

This isn't just an analytics exercise — it's about fairness and the company's future.`,
    question: "Calculate the **average salary by department and gender**. Return `department`, `gender`, and the average salary as `avg_salary` rounded to 2 decimal places. Order by department, then gender.",
    tables: ["employees"],
    tableSchema: {
      employees: {
        columns: ["emp_id", "name", "department", "gender", "title", "salary", "hire_date", "performance_score"],
        data: [
          [1, "Alice Chen", "Engineering", "Female", "Senior Engineer", 145000, "2020-03-15", 4.5],
          [2, "Bob Smith", "Engineering", "Male", "Senior Engineer", 152000, "2019-06-01", 4.2],
          [3, "Carol Davis", "Engineering", "Female", "Engineer", 118000, "2021-01-10", 4.0],
          [4, "Dan Wilson", "Engineering", "Male", "Engineer", 125000, "2021-03-20", 3.8],
          [5, "Eva Martinez", "Engineering", "Female", "Lead Engineer", 168000, "2018-04-05", 4.8],
          [6, "Frank Lee", "Engineering", "Male", "Lead Engineer", 175000, "2017-11-12", 4.6],
          [7, "Grace Kim", "Marketing", "Female", "Marketing Manager", 95000, "2020-07-15", 4.3],
          [8, "Henry Brown", "Marketing", "Male", "Marketing Manager", 102000, "2019-09-22", 4.1],
          [9, "Iris Patel", "Marketing", "Female", "Content Lead", 82000, "2021-05-10", 3.9],
          [10, "Jack Turner", "Marketing", "Male", "SEO Specialist", 78000, "2022-01-08", 3.7],
          [11, "Kate Johnson", "Sales", "Female", "Sales Director", 130000, "2018-10-30", 4.7],
          [12, "Leo Garcia", "Sales", "Male", "Sales Director", 138000, "2018-06-14", 4.4],
          [13, "Mia Wang", "Sales", "Female", "Account Executive", 72000, "2022-03-25", 3.6],
          [14, "Nathan Cole", "Sales", "Male", "Account Executive", 75000, "2021-08-01", 4.0],
          [15, "Olivia Scott", "HR", "Female", "HR Manager", 88000, "2020-02-12", 4.2],
          [16, "Peter Zhang", "HR", "Male", "HR Specialist", 68000, "2022-06-05", 3.5]
        ]
      }
    },
    hint: "Use GROUP BY department, gender with ROUND(AVG(salary), 2) as avg_salary. Add ORDER BY department, gender.",
    solution: "SELECT department, gender, ROUND(AVG(salary), 2) as avg_salary FROM employees GROUP BY department, gender ORDER BY department, gender",
    dataset: "story"
  },

  // ============================================
  // STORY 7: The Restaurant Health Inspector
  // ============================================
  {
    id: "story_7",
    title: "The Restaurant Health Inspector",
    difficulty: "Hard",
    category: "Window Functions",
    skills: ["SELECT", "Window Functions", "RANK", "JOIN"],
    xpReward: 80,
    estimatedTime: "12 min",
    role: "Senior Inspector, City Health Department",
    setting: "Health department, quarterly enforcement review",
    story: `You're a senior data analyst at the **City Health Department**. The department conducts restaurant inspections quarterly, and the results are public record. A local investigative journalist has filed a Freedom of Information request asking: **"Which restaurants have been getting progressively worse over time?"**

The department director needs to prepare the response: **"I need you to rank each restaurant's inspection scores within their inspection history — most recent first. This way we can see if scores are declining. Use a window function to rank the scores by date for each restaurant."**

She warns: **"This data will be published. It needs to be bulletproof. Show me the restaurant name, inspection date, score, and the rank of each inspection within that restaurant's history."**

The public's right to know about food safety depends on this analysis.`,
    question: "For each restaurant, rank their inspections by date (most recent = rank 1). Return `restaurant_name`, `inspection_date`, `score`, and the rank as `inspection_rank` using ROW_NUMBER() partitioned by restaurant_id and ordered by inspection_date DESC.",
    tables: ["inspections"],
    tableSchema: {
      inspections: {
        columns: ["inspection_id", "restaurant_id", "restaurant_name", "inspection_date", "score", "inspector", "violation_count", "status"],
        data: [
          [1, 201, "Golden Dragon", "2024-01-15", 92, "J. Martinez", 1, "Pass"],
          [2, 201, "Golden Dragon", "2024-04-20", 85, "K. Patel", 3, "Pass"],
          [3, 201, "Golden Dragon", "2024-07-10", 71, "J. Martinez", 5, "Conditional"],
          [4, 201, "Golden Dragon", "2024-10-05", 62, "L. Thompson", 7, "Fail"],
          [5, 302, "Mama Rosa's", "2024-02-10", 88, "K. Patel", 2, "Pass"],
          [6, 302, "Mama Rosa's", "2024-05-15", 91, "J. Martinez", 1, "Pass"],
          [7, 302, "Mama Rosa's", "2024-08-22", 94, "L. Thompson", 0, "Pass"],
          [8, 302, "Mama Rosa's", "2024-11-01", 96, "K. Patel", 0, "Pass"],
          [9, 403, "Burger Barn", "2024-03-05", 78, "L. Thompson", 4, "Conditional"],
          [10, 403, "Burger Barn", "2024-06-18", 72, "J. Martinez", 5, "Conditional"],
          [11, 403, "Burger Barn", "2024-09-25", 68, "K. Patel", 6, "Fail"],
          [12, 504, "Sushi Express", "2024-01-28", 95, "K. Patel", 0, "Pass"],
          [13, 504, "Sushi Express", "2024-04-30", 93, "L. Thompson", 1, "Pass"],
          [14, 504, "Sushi Express", "2024-08-12", 90, "J. Martinez", 2, "Pass"],
          [15, 605, "The Grill House", "2024-02-22", 55, "J. Martinez", 8, "Fail"],
          [16, 605, "The Grill House", "2024-06-01", 64, "L. Thompson", 6, "Fail"],
          [17, 605, "The Grill House", "2024-09-15", 76, "K. Patel", 4, "Conditional"]
        ]
      }
    },
    hint: "Use ROW_NUMBER() OVER (PARTITION BY restaurant_id ORDER BY inspection_date DESC) as inspection_rank.",
    solution: "SELECT restaurant_name, inspection_date, score, ROW_NUMBER() OVER (PARTITION BY restaurant_id ORDER BY inspection_date DESC) as inspection_rank FROM inspections",
    dataset: "story"
  },

  // ============================================
  // STORY 8: The Insurance Claim Investigation
  // ============================================
  {
    id: "story_8",
    title: "The Insurance Claim Investigation",
    difficulty: "Hard",
    category: "Subquery + JOIN",
    skills: ["SELECT", "Subquery", "JOIN", "Aggregation", "HAVING"],
    xpReward: 75,
    estimatedTime: "12 min",
    role: "Claims Investigator at SafeGuard Insurance",
    setting: "Special Investigations Unit, suspected fraud network",
    story: `The **Special Investigations Unit** at SafeGuard Insurance has noticed a troubling pattern. Several policyholders in the same region have filed claims after suspiciously similar "accidents." The lead investigator suspects an organized fraud ring involving certain auto repair shops.

He briefs the team: **"We think certain repair shops are colluding with policyholders. The red flag is when a shop has processed claims with a total value exceeding $50,000 — that's way above normal for our network. I need to cross-reference our claims data with the repair shop records."**

He looks at you: **"Find every claim that was serviced by a repair shop whose total claim amounts exceed $50,000. Show me the claim ID, the policyholder name, the claim amount, and the shop name. This goes to the district attorney's office tomorrow."**`,
    question: "Find all claims serviced by repair shops whose **total claim amounts exceed $50,000**. Join `claims` with `repair_shops`, and use a subquery or HAVING to identify the suspicious shops. Return `claim_id`, `policyholder`, `claim_amount`, and `shop_name`.",
    tables: ["claims", "repair_shops"],
    tableSchema: {
      claims: {
        columns: ["claim_id", "policyholder", "claim_date", "claim_amount", "shop_id", "claim_type", "status"],
        data: [
          [5001, "John Doe", "2024-08-15", 8500, 10, "Collision", "Approved"],
          [5002, "Jane Miller", "2024-08-22", 12000, 10, "Collision", "Approved"],
          [5003, "Tom Harris", "2024-09-01", 15500, 10, "Collision", "Under Review"],
          [5004, "Amy Clark", "2024-09-10", 9200, 10, "Collision", "Approved"],
          [5005, "Chris Lee", "2024-09-18", 11000, 10, "Collision", "Approved"],
          [5006, "Sarah Kim", "2024-08-05", 4500, 20, "Fender Bender", "Approved"],
          [5007, "Mike Brown", "2024-08-28", 3200, 20, "Fender Bender", "Approved"],
          [5008, "Lisa Wong", "2024-09-12", 5800, 20, "Collision", "Approved"],
          [5009, "David Chen", "2024-09-25", 7100, 30, "Collision", "Approved"],
          [5010, "Nina Patel", "2024-10-01", 18500, 30, "Total Loss", "Under Review"],
          [5011, "Oscar Reyes", "2024-10-08", 13200, 30, "Collision", "Approved"],
          [5012, "Paul Adams", "2024-10-15", 22000, 30, "Total Loss", "Approved"],
          [5013, "Rachel Green", "2024-08-10", 2800, 40, "Windshield", "Approved"],
          [5014, "Steve Jobs", "2024-09-05", 4100, 40, "Fender Bender", "Approved"],
          [5015, "Uma White", "2024-10-20", 6500, 40, "Collision", "Approved"]
        ]
      },
      repair_shops: {
        columns: ["shop_id", "shop_name", "address", "city", "owner", "license_status"],
        data: [
          [10, "QuickFix Auto Body", "123 Main St", "Tampa", "Victor Kozlov", "Active"],
          [20, "City Auto Repair", "456 Oak Ave", "Tampa", "Maria Santos", "Active"],
          [30, "Premier Collision Center", "789 Pine Rd", "Clearwater", "Dmitri Volkov", "Under Review"],
          [40, "Sunshine Auto Glass", "321 Beach Blvd", "St. Petersburg", "Helen Park", "Active"]
        ]
      }
    },
    hint: "Use a subquery to find shop_ids with SUM(claim_amount) > 50000, then JOIN claims with repair_shops WHERE shop_id IN that subquery.",
    solution: "SELECT c.claim_id, c.policyholder, c.claim_amount, r.shop_name FROM claims c JOIN repair_shops r ON c.shop_id = r.shop_id WHERE c.shop_id IN (SELECT shop_id FROM claims GROUP BY shop_id HAVING SUM(claim_amount) > 50000)",
    dataset: "story"
  },

  // ============================================
  // STORY 9: The Pandemic Contact Tracer
  // ============================================
  {
    id: "story_9",
    title: "The Pandemic Contact Tracer",
    difficulty: "Easy",
    category: "WHERE + Multiple Conditions",
    skills: ["SELECT", "WHERE", "AND", "OR", "ORDER BY"],
    xpReward: 30,
    estimatedTime: "5 min",
    role: "Data Analyst, County Public Health",
    setting: "County health office, outbreak containment",
    story: `A new respiratory virus variant has emerged in the county, and the **Public Health Department** has activated its contact tracing protocol. You're part of the emergency data team.

The epidemiologist in charge is tracking an outbreak cluster: **"We've identified that the most contagious period is between December 1st and December 10th. I need a list of all individuals who tested positive during that window AND who reported attending large gatherings."**

She adds urgently: **"We also need anyone who tested positive and is in a high-risk category — aged 65 or above. These people need immediate follow-up calls. Give me their name, age, test date, and whether they attended a gathering. Sort by test date so we can trace the timeline."**`,
    question: "Find all individuals who tested positive AND either `attended_gathering` = 'Yes' OR `age` >= 65. Only include records where `test_date` is between '2024-12-01' and '2024-12-10'. Return `name`, `age`, `test_date`, and `attended_gathering`, ordered by test_date.",
    tables: ["test_records"],
    tableSchema: {
      test_records: {
        columns: ["record_id", "name", "age", "test_date", "result", "attended_gathering", "zip_code", "symptoms", "vaccinated"],
        data: [
          [1, "Margaret Ellis", 72, "2024-12-01", "Positive", "Yes", "30301", "Cough, Fever", "Yes"],
          [2, "James Young", 34, "2024-12-01", "Negative", "Yes", "30302", "None", "Yes"],
          [3, "Dorothy Hall", 68, "2024-12-02", "Positive", "No", "30301", "Fever", "No"],
          [4, "William Clark", 45, "2024-12-03", "Positive", "Yes", "30303", "Cough", "Yes"],
          [5, "Betty Adams", 81, "2024-12-03", "Positive", "No", "30304", "Shortness of Breath", "Yes"],
          [6, "Richard Lee", 29, "2024-12-04", "Positive", "No", "30302", "Headache", "No"],
          [7, "Susan Wright", 55, "2024-12-05", "Positive", "Yes", "30301", "Cough, Fatigue", "Yes"],
          [8, "Charles King", 41, "2024-12-06", "Negative", "Yes", "30303", "None", "Yes"],
          [9, "Patricia Moore", 77, "2024-12-07", "Positive", "Yes", "30304", "Fever, Cough", "No"],
          [10, "Thomas Scott", 38, "2024-12-08", "Positive", "Yes", "30302", "Sore Throat", "Yes"],
          [11, "Nancy Green", 66, "2024-12-09", "Positive", "No", "30301", "Fatigue", "Yes"],
          [12, "Daniel Baker", 52, "2024-12-10", "Positive", "Yes", "30303", "Cough", "Yes"],
          [13, "Karen Nelson", 43, "2024-12-11", "Positive", "Yes", "30302", "Fever", "Yes"],
          [14, "George Hill", 70, "2024-12-12", "Positive", "No", "30304", "Cough", "No"]
        ]
      }
    },
    hint: "Use WHERE result = 'Positive' AND test_date BETWEEN '2024-12-01' AND '2024-12-10' AND (attended_gathering = 'Yes' OR age >= 65). Remember the parentheses around the OR condition!",
    solution: "SELECT name, age, test_date, attended_gathering FROM test_records WHERE result = 'Positive' AND test_date BETWEEN '2024-12-01' AND '2024-12-10' AND (attended_gathering = 'Yes' OR age >= 65) ORDER BY test_date",
    dataset: "story"
  },

  // ============================================
  // STORY 10: The Music Streaming Royalty Dispute
  // ============================================
  {
    id: "story_10",
    title: "The Music Streaming Royalty Dispute",
    difficulty: "Hard",
    category: "Window Functions + CTE",
    skills: ["SELECT", "Window Functions", "CTE", "Aggregation", "ROUND"],
    xpReward: 85,
    estimatedTime: "15 min",
    role: "Data Engineer at WaveStream Music",
    setting: "Legal department, artist royalty dispute",
    story: `**WaveStream Music**, a streaming platform with 50 million users, is facing a class-action lawsuit from independent artists who claim they're being underpaid. The artists allege that major label artists receive a disproportionate share of royalty payouts relative to their actual streams.

The legal team needs hard evidence for court. The lead attorney tells you: **"I need you to calculate each artist's percentage of total streams AND their percentage of total royalties. If an artist has 10% of streams but only 2% of royalties, that's the smoking gun."**

She emphasizes: **"Use a CTE to calculate the totals first, then compute each artist's share. Round everything to 2 decimal places. This is going in front of a federal judge — the numbers must be precise."**

Millions of dollars in back-royalties hang in the balance.`,
    question: "Using a CTE, calculate each artist's `stream_percentage` (their streams as % of total streams) and `royalty_percentage` (their royalties as % of total royalties). Return `artist_name`, `label_type`, `total_streams`, `total_royalties`, `stream_percentage`, and `royalty_percentage`, all rounded to 2 decimal places. Order by stream_percentage DESC.",
    tables: ["artist_earnings"],
    tableSchema: {
      artist_earnings: {
        columns: ["artist_id", "artist_name", "label_type", "genre", "total_streams", "total_royalties", "country", "verified"],
        data: [
          [1, "Luna Park", "Major", "Pop", 85000000, 425000, "US", 1],
          [2, "The Wavelengths", "Independent", "Rock", 42000000, 84000, "UK", 1],
          [3, "DJ Prism", "Major", "Electronic", 67000000, 335000, "US", 1],
          [4, "Sierra Gold", "Independent", "Country", 28000000, 42000, "US", 1],
          [5, "Neon Cascade", "Major", "Pop", 93000000, 511500, "US", 1],
          [6, "Acoustic Roots", "Independent", "Folk", 15000000, 18750, "Canada", 1],
          [7, "Metro Pulse", "Major", "Hip-Hop", 120000000, 660000, "US", 1],
          [8, "Ember & Ash", "Independent", "Indie", 31000000, 46500, "US", 1],
          [9, "Crystal Method", "Major", "Electronic", 78000000, 390000, "UK", 1],
          [10, "Wildflower", "Independent", "Folk", 19000000, 22800, "US", 1],
          [11, "Thunder Road", "Independent", "Rock", 35000000, 52500, "Australia", 1],
          [12, "Velvet Echo", "Major", "R&B", 55000000, 275000, "US", 1]
        ]
      }
    },
    hint: "Start with: WITH totals AS (SELECT SUM(total_streams) as all_streams, SUM(total_royalties) as all_royalties FROM artist_earnings). Then SELECT from artist_earnings, computing ROUND(total_streams * 100.0 / all_streams, 2) as stream_percentage and similar for royalties.",
    solution: "WITH totals AS (SELECT SUM(total_streams) as all_streams, SUM(total_royalties) as all_royalties FROM artist_earnings) SELECT artist_name, label_type, total_streams, total_royalties, ROUND(total_streams * 100.0 / (SELECT all_streams FROM totals), 2) as stream_percentage, ROUND(total_royalties * 100.0 / (SELECT all_royalties FROM totals), 2) as royalty_percentage FROM artist_earnings ORDER BY stream_percentage DESC",
    dataset: "story"
  },

  // ============================================
  // STORY 11: The Missing Shipments Mystery
  // ============================================
  {
    id: "story_11",
    title: "The Missing Shipments Mystery",
    difficulty: "Easy",
    category: "COUNT + WHERE",
    skills: ["SELECT", "Aggregation", "WHERE"],
    xpReward: 30,
    estimatedTime: "5 min",
    role: "Logistics Coordinator at GlobalShip Corp",
    setting: "Distribution center, inventory discrepancy",
    story: `**GlobalShip Corp** moves 50,000 packages a day through its distribution center. This morning, the warehouse manager noticed something alarming — the inventory counts don't match the shipping records. Packages are going missing.

He pulls you into the control room: **"We've got a problem. I need to know exactly how many shipments are marked as 'Lost' in our system, and what the total value of those lost shipments is. The insurance company needs a number by end of day, and corporate is breathing down my neck."**

He adds: **"If the total value is over $100,000, we have to file a federal report. So get me the count AND the total dollar value of all lost shipments. Quickly."**`,
    question: "Find the total **count** of shipments with status = 'Lost' and the **sum** of their `declared_value`. Return `lost_count` and `total_lost_value`.",
    tables: ["shipments"],
    tableSchema: {
      shipments: {
        columns: ["shipment_id", "tracking_number", "origin", "destination", "declared_value", "weight_lbs", "ship_date", "status"],
        data: [
          [1, "GS-10001", "Chicago", "Miami", 2500, 45, "2024-11-01", "Delivered"],
          [2, "GS-10002", "NYC", "LA", 18000, 120, "2024-11-02", "Lost"],
          [3, "GS-10003", "Denver", "Seattle", 850, 22, "2024-11-03", "Delivered"],
          [4, "GS-10004", "Atlanta", "Houston", 32000, 200, "2024-11-04", "Lost"],
          [5, "GS-10005", "Boston", "Phoenix", 4200, 55, "2024-11-05", "In Transit"],
          [6, "GS-10006", "Seattle", "Chicago", 15500, 88, "2024-11-06", "Lost"],
          [7, "GS-10007", "Miami", "NYC", 7800, 65, "2024-11-07", "Delivered"],
          [8, "GS-10008", "LA", "Denver", 950, 18, "2024-11-08", "Delivered"],
          [9, "GS-10009", "Houston", "Atlanta", 28000, 150, "2024-11-09", "Lost"],
          [10, "GS-10010", "Phoenix", "Boston", 3300, 42, "2024-11-10", "In Transit"],
          [11, "GS-10011", "Chicago", "Seattle", 11000, 95, "2024-11-11", "Lost"],
          [12, "GS-10012", "NYC", "Miami", 6700, 58, "2024-11-12", "Delivered"],
          [13, "GS-10013", "Denver", "LA", 42000, 250, "2024-11-13", "Lost"],
          [14, "GS-10014", "Atlanta", "Boston", 1800, 30, "2024-11-14", "Delivered"],
          [15, "GS-10015", "Seattle", "Houston", 9500, 72, "2024-11-15", "In Transit"]
        ]
      }
    },
    hint: "Use COUNT(*) as lost_count and SUM(declared_value) as total_lost_value, with WHERE status = 'Lost'.",
    solution: "SELECT COUNT(*) as lost_count, SUM(declared_value) as total_lost_value FROM shipments WHERE status = 'Lost'",
    dataset: "story"
  },

  // ============================================
  // STORY 12: The Election Night Data Room
  // ============================================
  {
    id: "story_12",
    title: "The Election Night Data Room",
    difficulty: "Medium",
    category: "CASE + Aggregation",
    skills: ["SELECT", "CASE", "Aggregation", "GROUP BY"],
    xpReward: 55,
    estimatedTime: "10 min",
    role: "Data Analyst at City Election Commission",
    setting: "Election headquarters, results night",
    story: `It's election night for the city's mayoral race, and you're in the data room at **City Election Commission** headquarters. Three candidates — Rivera, Chen, and Okafor — are in a tight race. The networks are calling you every 10 minutes for updated numbers.

The Election Director turns to you: **"I need a district-by-district summary showing how many votes each candidate received. But here's the thing — I want it as columns, not rows. Each district should be one row, with separate columns for Rivera's votes, Chen's votes, and Okafor's votes."**

She adds: **"This is the format the TV networks need for their graphics. Use CASE expressions to pivot the data. And add a total_votes column too. We go live in 20 minutes."**

Democracy runs on accurate data tonight.`,
    question: "Create a **pivot table** showing votes by district. For each `district`, show `rivera_votes`, `chen_votes`, `okafor_votes` (using SUM + CASE), and `total_votes`. Group by district and order by district.",
    tables: ["votes"],
    tableSchema: {
      votes: {
        columns: ["vote_id", "district", "candidate", "vote_count", "precinct", "reporting_time"],
        data: [
          [1, "North", "Rivera", 3200, "N-1", "2024-11-05 20:00"],
          [2, "North", "Chen", 2800, "N-1", "2024-11-05 20:00"],
          [3, "North", "Okafor", 1500, "N-1", "2024-11-05 20:00"],
          [4, "North", "Rivera", 2100, "N-2", "2024-11-05 20:30"],
          [5, "North", "Chen", 3400, "N-2", "2024-11-05 20:30"],
          [6, "North", "Okafor", 1800, "N-2", "2024-11-05 20:30"],
          [7, "South", "Rivera", 4500, "S-1", "2024-11-05 20:15"],
          [8, "South", "Chen", 2200, "S-1", "2024-11-05 20:15"],
          [9, "South", "Okafor", 3100, "S-1", "2024-11-05 20:15"],
          [10, "South", "Rivera", 3800, "S-2", "2024-11-05 20:45"],
          [11, "South", "Chen", 2900, "S-2", "2024-11-05 20:45"],
          [12, "South", "Okafor", 3500, "S-2", "2024-11-05 20:45"],
          [13, "East", "Rivera", 2600, "E-1", "2024-11-05 21:00"],
          [14, "East", "Chen", 4100, "E-1", "2024-11-05 21:00"],
          [15, "East", "Okafor", 2000, "E-1", "2024-11-05 21:00"],
          [16, "West", "Rivera", 1900, "W-1", "2024-11-05 21:15"],
          [17, "West", "Chen", 3600, "W-1", "2024-11-05 21:15"],
          [18, "West", "Okafor", 4200, "W-1", "2024-11-05 21:15"]
        ]
      }
    },
    hint: "Use SUM(CASE WHEN candidate = 'Rivera' THEN vote_count ELSE 0 END) as rivera_votes, and similar for each candidate. GROUP BY district.",
    solution: "SELECT district, SUM(CASE WHEN candidate = 'Rivera' THEN vote_count ELSE 0 END) as rivera_votes, SUM(CASE WHEN candidate = 'Chen' THEN vote_count ELSE 0 END) as chen_votes, SUM(CASE WHEN candidate = 'Okafor' THEN vote_count ELSE 0 END) as okafor_votes, SUM(vote_count) as total_votes FROM votes GROUP BY district ORDER BY district",
    dataset: "story"
  }
];
