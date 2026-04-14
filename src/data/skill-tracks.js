// SQL Quest - Skill-Based Learning Tracks
// Routes users through challenges based on their SQL level
// Each track builds on the previous one

window.skillTracksData = [
  {
    id: "fundamentals",
    title: "SQL Fundamentals",
    icon: "BookOpen",
    level: "Beginner",
    description: "Start here. Learn SELECT, WHERE, ORDER BY, and basic aggregation.",
    color: "#22c55e",
    prerequisites: [],
    challengeIds: [91, 92, 93, 94, 95, 96, 97, 101, 102, 103, 104, 98, 99, 100],
    unlockMessage: "You can now read, filter, sort, and summarize data. Ready for JOINs!"
  },
  {
    id: "aggregation",
    title: "Aggregation & Grouping",
    icon: "BarChart3",
    level: "Beginner+",
    description: "COUNT, SUM, AVG, GROUP BY, HAVING — the tools of data analysis.",
    color: "#22c55e",
    prerequisites: ["fundamentals"],
    challengeIds: [1, 5, 62, 64, 100, 107, 109, 113, 8, 14],
    unlockMessage: "You can group and summarize data like an analyst. Time to connect tables!"
  },
  {
    id: "joins",
    title: "JOINs & Relationships",
    icon: "Link",
    level: "Intermediate",
    description: "Connect tables with INNER JOIN, LEFT JOIN, and self-joins.",
    color: "#3b82f6",
    prerequisites: ["fundamentals"],
    challengeIds: [105, 106, 34, 114, 42, 43, 17, 19, 35, 27],
    unlockMessage: "You can combine data across tables. Subqueries are next!"
  },
  {
    id: "subqueries",
    title: "Subqueries & CTEs",
    icon: "Code",
    level: "Intermediate",
    description: "Scalar subqueries, correlated subqueries, CTEs, and derived tables.",
    color: "#3b82f6",
    prerequisites: ["aggregation"],
    challengeIds: [108, 3, 111, 115, 16, 33, 36, 10, 18, 31],
    unlockMessage: "You think in layers now. Window functions will blow your mind."
  },
  {
    id: "window-functions",
    title: "Window Functions",
    icon: "TrendingUp",
    level: "Advanced",
    description: "ROW_NUMBER, RANK, LAG/LEAD, running totals, and frame clauses.",
    color: "#a855f7",
    prerequisites: ["subqueries"],
    challengeIds: [112, 23, 67, 40, 2, 59, 47, 24, 55, 50, 78, 22, 13, 87],
    unlockMessage: "You've mastered window functions. FAANG-level patterns await."
  },
  {
    id: "advanced-joins",
    title: "Advanced JOINs & Set Operations",
    icon: "Database",
    level: "Advanced",
    description: "Self-joins, non-equi joins, anti-joins, UNION, INTERSECT, EXCEPT.",
    color: "#a855f7",
    prerequisites: ["joins", "subqueries"],
    challengeIds: [69, 21, 26, 83, 49, 74, 58, 20, 29, 79],
    unlockMessage: "You can solve any JOIN problem. You're interview-ready."
  },
  {
    id: "analytics-patterns",
    title: "Analytics & Product Metrics",
    icon: "Target",
    level: "Expert",
    description: "MoM growth, retention cohorts, funnels, DAU, and Pareto analysis.",
    color: "#f59e0b",
    prerequisites: ["window-functions"],
    challengeIds: [84, 30, 90, 60, 11, 82, 88, 61, 71, 80],
    unlockMessage: "You think like a data analyst at a top tech company."
  },
  {
    id: "faang-patterns",
    title: "FAANG Interview Patterns",
    icon: "Trophy",
    level: "Expert",
    description: "Gaps-and-islands, sessionization, recursive CTEs, relational division, median.",
    color: "#f59e0b",
    prerequisites: ["window-functions", "advanced-joins"],
    challengeIds: [68, 85, 9, 72, 73, 77, 81, 44, 89, 48, 12, 86],
    unlockMessage: "You can solve the hardest SQL interview questions. Go get that offer."
  }
];
