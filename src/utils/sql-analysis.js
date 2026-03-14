// Extract table names used in SQL query
const extractTablesFromSql = (sql, datasetTables) => {
  if (!sql || !datasetTables) return [];
  const upperSql = sql.toUpperCase();
  const tableNames = Object.keys(datasetTables);
  return tableNames.filter(table => {
    const upperTable = table.toUpperCase();
    const patterns = [
      new RegExp(`FROM\\s+${upperTable}\\b`, 'i'),
      new RegExp(`JOIN\\s+${upperTable}\\b`, 'i'),
      new RegExp(`${upperTable}\\.`, 'i')
    ];
    return patterns.some(p => p.test(upperSql));
  });
};

// Detect SQL topic from query/solution
const detectSqlTopic = (sql) => {
  if (!sql) return 'General';
  const upperSql = sql.toUpperCase();

  if (upperSql.includes('WINDOW') || upperSql.includes('OVER(') || upperSql.includes('OVER (')) return 'Window Functions';
  if (upperSql.includes('EXISTS') || upperSql.includes('NOT EXISTS')) return 'EXISTS';
  if (upperSql.includes('HAVING')) return 'GROUP BY & HAVING';
  if (upperSql.includes('GROUP BY')) return 'GROUP BY';
  if (upperSql.includes('LEFT JOIN') || upperSql.includes('LEFT OUTER JOIN')) return 'LEFT JOIN';
  if (upperSql.includes('RIGHT JOIN') || upperSql.includes('RIGHT OUTER JOIN')) return 'RIGHT JOIN';
  if (upperSql.includes('FULL JOIN') || upperSql.includes('FULL OUTER JOIN')) return 'FULL JOIN';
  if (upperSql.includes('INNER JOIN') || upperSql.includes('JOIN')) return 'JOIN';
  if (upperSql.includes('UNION')) return 'UNION';
  if (upperSql.includes('CASE WHEN') || upperSql.includes('CASE\n')) return 'CASE';
  if (upperSql.includes('LIKE')) return 'LIKE';
  if (upperSql.includes('IN (SELECT') || upperSql.includes('IN(SELECT')) return 'Subqueries';
  if (upperSql.includes('BETWEEN')) return 'BETWEEN';
  if (upperSql.includes('ORDER BY')) return 'ORDER BY';
  if (upperSql.includes('DISTINCT')) return 'DISTINCT';
  if (upperSql.includes('COUNT(') || upperSql.includes('SUM(') || upperSql.includes('AVG(') || upperSql.includes('MAX(') || upperSql.includes('MIN(')) return 'Aggregation';
  if (upperSql.includes('WHERE')) return 'WHERE';
  return 'SELECT';
};

// Detect ALL SQL concepts used in a query (returns array)
const detectAllSqlConcepts = (sql) => {
  if (!sql) return [];
  const upperSql = sql.toUpperCase();
  const concepts = [];

  // Window Functions
  if (upperSql.includes('ROW_NUMBER(')) concepts.push('ROW_NUMBER');
  if (upperSql.includes('RANK(')) concepts.push('RANK');
  if (upperSql.includes('DENSE_RANK(')) concepts.push('DENSE_RANK');
  if (upperSql.includes('LAG(')) concepts.push('LAG');
  if (upperSql.includes('LEAD(')) concepts.push('LEAD');
  if (upperSql.includes('NTILE(')) concepts.push('NTILE');
  if (upperSql.includes('OVER(') || upperSql.includes('OVER (')) concepts.push('Window Functions');

  // JOINs
  if (upperSql.includes('LEFT JOIN') || upperSql.includes('LEFT OUTER JOIN')) concepts.push('LEFT JOIN');
  if (upperSql.includes('RIGHT JOIN')) concepts.push('RIGHT JOIN');
  if (upperSql.includes('FULL JOIN') || upperSql.includes('FULL OUTER JOIN')) concepts.push('FULL JOIN');
  if (upperSql.includes('CROSS JOIN')) concepts.push('CROSS JOIN');
  if ((upperSql.includes('INNER JOIN') || upperSql.includes(' JOIN ')) && !concepts.some(c => c.includes('JOIN'))) concepts.push('JOIN');

  // Subqueries
  if (upperSql.includes('(SELECT')) concepts.push('Subquery');
  if (upperSql.includes('WITH ') && upperSql.includes(' AS (')) concepts.push('CTE');
  if (upperSql.includes('EXISTS')) concepts.push('EXISTS');
  if (upperSql.includes('NOT EXISTS')) concepts.push('NOT EXISTS');

  // Aggregations
  if (upperSql.includes('COUNT(')) concepts.push('COUNT');
  if (upperSql.includes('SUM(')) concepts.push('SUM');
  if (upperSql.includes('AVG(')) concepts.push('AVG');
  if (upperSql.includes('MAX(')) concepts.push('MAX');
  if (upperSql.includes('MIN(')) concepts.push('MIN');

  // Grouping & Filtering
  if (upperSql.includes('GROUP BY')) concepts.push('GROUP BY');
  if (upperSql.includes('HAVING')) concepts.push('HAVING');
  if (upperSql.includes('WHERE')) concepts.push('WHERE');
  if (upperSql.includes('ORDER BY')) concepts.push('ORDER BY');
  if (upperSql.includes('LIMIT')) concepts.push('LIMIT');

  // Operators & Functions
  if (upperSql.includes('CASE WHEN') || upperSql.includes('CASE\n')) concepts.push('CASE WHEN');
  if (upperSql.includes('COALESCE')) concepts.push('COALESCE');
  if (upperSql.includes('NULLIF')) concepts.push('NULLIF');
  if (upperSql.includes('BETWEEN')) concepts.push('BETWEEN');
  if (upperSql.includes('LIKE')) concepts.push('LIKE');
  if (upperSql.includes('IN (')) concepts.push('IN');
  if (upperSql.includes('DISTINCT')) concepts.push('DISTINCT');
  if (upperSql.includes('UNION')) concepts.push('UNION');

  // Date/String functions
  if (upperSql.includes('STRFTIME') || upperSql.includes('DATE(') || upperSql.includes('DATETIME(')) concepts.push('Date Functions');
  if (upperSql.includes('SUBSTR') || upperSql.includes('UPPER(') || upperSql.includes('LOWER(') || upperSql.includes('TRIM(')) concepts.push('String Functions');
  if (upperSql.includes('ROUND(') || upperSql.includes('ABS(') || upperSql.includes('CAST(')) concepts.push('Math/Conversion');

  return [...new Set(concepts)];
};

// Map topic to AI Tutor lesson index
const getAiLessonForTopic = (topic) => {
  const topicToLesson = {
    'SELECT': 0,
    'WHERE': 1,
    'ORDER BY': 2,
    'DISTINCT': 2,
    'Aggregation': 3,
    'GROUP BY': 4,
    'GROUP BY & HAVING': 4,
    'JOIN': 5,
    'LEFT JOIN': 6,
    'RIGHT JOIN': 6,
    'FULL JOIN': 6,
    'Subqueries': 7,
    'CASE': 8,
    'Window Functions': 9
  };
  return topicToLesson[topic] ?? 0;
};

export { extractTablesFromSql, detectSqlTopic, detectAllSqlConcepts, getAiLessonForTopic };
