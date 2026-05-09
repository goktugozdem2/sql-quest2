// SQL Mock Interviews Data - Option A Freemium Model
// Free: 1 interview | Pro: Unlimited ($9.99/mo) | Lifetime: $49.99

window.mockInterviewsData = [
  // ============ FREE INTERVIEW ============
  {
    id: 'sql-fundamentals-free',
    title: 'SQL Fundamentals Assessment',
    company: 'General',
    role: 'Entry-Level Data Analyst',
    difficulty: 'Easy',
    totalTime: 25 * 60, // 25 minutes
    questionsCount: 4,
    isFree: true,
    description: 'Test your core SQL skills with fundamental queries. Perfect for beginners preparing for entry-level positions.',
    title_tr: 'SQL Temelleri Değerlendirmesi',
    description_tr: 'Temel sorgularla SQL becerilerini test et. Giriş seviyesi pozisyonlara hazırlanan başlangıç seviyeleri için ideal.',
    role_tr: 'Giriş Seviyesi Data Analyst',
    skills: ['SELECT', 'WHERE', 'ORDER BY', 'JOINs', 'Aggregation'],
    questions: [
      {
        id: 'free-q1',
        order: 1,
        title: 'Multi-column sort',
        title_tr: 'Çok kolonlu sıralama',
        description: 'The HR team wants a report on high earners. Find all employees with a salary over **$70,000**. Show their **name**, **department**, **position**, **salary**, and **performance_rating**. Sort by department A→Z first, then by salary within each department highest-first.',
        description_tr: 'IK ekibi yüksek kazananlar için bir rapor istiyor. Maaşı **$70,000**\'in üzerinde olan tüm çalışanları bul. **name**, **department**, **position**, **salary** ve **performance_rating** kolonlarını göster. Önce department\'a göre A→Z, sonra her department içinde salary\'e göre azalan sırada sırala.',
        timeLimit: 5 * 60,
        difficulty: 'Easy',
        points: 20,
        dataset: 'employees',
        solution: "SELECT name, department, position, salary, performance_rating FROM employees WHERE salary > 70000 ORDER BY department ASC, salary DESC",
        hints: [
          'SELECT the five columns: name, department, position, salary, performance_rating',
          'ORDER BY accepts multiple columns separated by commas — each can have its own ASC or DESC'
        ],
        hints_tr: [
          'Beş kolonu SELECT ile al: name, department, position, salary, performance_rating',
          'ORDER BY virgülle ayrılmış birden fazla kolon kabul eder — her biri kendi ASC veya DESC yönünü alabilir'
        ],
        concepts: ['SELECT', 'WHERE', 'ORDER BY', 'Multi-column sort']
      },
      {
        id: 'free-q2',
        order: 2,
        title: 'Department salary summary',
        title_tr: 'Department maaş özeti',
        description: 'Generate a salary summary for each department. Show **department**, **headcount** (number of employees), **avg_salary** (rounded to 2 decimal places), **max_salary**, and **min_salary**. Sort by average salary descending.',
        description_tr: 'Her department için bir maaş özeti üret. **department**, **headcount** (çalışan sayısı), **avg_salary** (2 ondalık basamağa yuvarlı), **max_salary** ve **min_salary** kolonlarını göster. Ortalama maaşa göre azalan sırada sırala.',
        timeLimit: 6 * 60,
        difficulty: 'Easy',
        points: 25,
        dataset: 'employees',
        solution: "SELECT department, COUNT(*) AS headcount, ROUND(AVG(salary), 2) AS avg_salary, MAX(salary) AS max_salary, MIN(salary) AS min_salary FROM employees GROUP BY department ORDER BY avg_salary DESC",
        hints: [
          'COUNT(*) gives total rows per group, AVG/MAX/MIN work on a column',
          'All four aggregate functions can sit in the same SELECT — GROUP BY still applies to all of them'
        ],
        hints_tr: [
          'COUNT(*) her gruptaki toplam satır sayısını verir; AVG/MAX/MIN bir kolon üzerinde çalışır',
          'Dört aggregate fonksiyon da aynı SELECT içinde yer alabilir — GROUP BY hepsine birden uygulanır'
        ],
        concepts: ['GROUP BY', 'COUNT', 'AVG', 'MAX', 'MIN', 'ROUND']
      },
      {
        id: 'free-q3',
        order: 3,
        title: 'High-value order report',
        title_tr: 'Yüksek tutarlı sipariş raporu',
        description: 'Customer support needs to prioritise big orders. List all orders with a total over **$200** showing the **order_id**, **customer name**, **product**, **quantity**, and **total**. Sort by total descending so the largest orders appear first.',
        description_tr: 'Müşteri destek ekibinin büyük siparişlere öncelik vermesi gerekiyor. Total\'i **$200**\'ün üzerinde olan tüm siparişleri **order_id**, **customer name**, **product**, **quantity** ve **total** kolonlarıyla listele. En büyük siparişler önce gelecek şekilde total\'e göre azalan sırada sırala.',
        timeLimit: 7 * 60,
        difficulty: 'Medium',
        points: 30,
        dataset: 'ecommerce',
        solution: "SELECT o.order_id, c.name AS customer_name, o.product, o.quantity, o.total FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE o.total > 200 ORDER BY o.total DESC",
        hints: [
          'JOIN orders and customers on customer_id — use table aliases (o, c) to keep it readable',
          'The WHERE clause filters rows BEFORE they are returned; ORDER BY sorts the final result'
        ],
        hints_tr: [
          'orders ve customers tablolarını customer_id üzerinden JOIN et — okunabilirlik için tablo alias\'ları (o, c) kullan',
          'WHERE clause satırları döndürülmeden ÖNCE filtreler; ORDER BY sonucun nihai sıralamasını yapar'
        ],
        concepts: ['JOIN', 'WHERE', 'ORDER BY', 'Table Aliases']
      },
      {
        id: 'free-q4',
        order: 4,
        title: 'WHERE vs HAVING — high-earning departments',
        title_tr: 'WHERE vs HAVING — yüksek kazançlı department\'lar',
        description: 'Finance needs two numbers per department: the count of employees earning above **$60,000** and what percentage of the department that represents. Show **department**, **high_earners** (count above $60k), and **pct_high_earners** (rounded to 1 decimal place). Only include departments where **more than 3** employees clear the threshold. This question tests the WHERE vs HAVING distinction — one of the most commonly confused concepts in SQL.',
        description_tr: 'Finans ekibi her department için iki sayı istiyor: **$60,000**\'in üzerinde kazanan çalışan sayısı ve bunun department\'ın yüzde kaçına denk geldiği. **department**, **high_earners** ($60k üzerindeki sayı) ve **pct_high_earners** (1 ondalık basamağa yuvarlı) kolonlarını göster. Sadece eşiği aşan çalışan sayısı **3\'ten fazla** olan department\'ları dahil et. Bu soru WHERE vs HAVING ayrımını sınar — SQL\'de en sık karıştırılan kavramlardan biridir.',
        timeLimit: 8 * 60,
        difficulty: 'Medium',
        points: 25,
        dataset: 'employees',
        solution: "SELECT department, COUNT(*) AS high_earners, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM employees e2 WHERE e2.department = employees.department), 1) AS pct_high_earners FROM employees WHERE salary > 60000 GROUP BY department HAVING COUNT(*) > 3 ORDER BY high_earners DESC",
        hints: [
          'WHERE salary > 60000 filters individual rows BEFORE grouping — only high earners enter the aggregation',
          'HAVING COUNT(*) > 3 filters whole groups AFTER aggregation — departments with 3 or fewer high earners are excluded',
          'For the percentage, a correlated subquery counts all employees in the same department regardless of the WHERE filter'
        ],
        hints_tr: [
          'WHERE salary > 60000 gruplama ÖNCESİ tek tek satırları filtreler — sadece yüksek kazananlar aggregation\'a girer',
          'HAVING COUNT(*) > 3 aggregation SONRASI grupların tamamını filtreler — 3 veya daha az yüksek kazananı olan department\'lar dışlanır',
          'Yüzde için correlated subquery, WHERE filtresinden bağımsız olarak aynı department\'taki tüm çalışanları sayar'
        ],
        concepts: ['WHERE', 'GROUP BY', 'HAVING', 'COUNT', 'Correlated Subquery', 'Percentage']
      }
    ],
    passingScore: 60
  },

  // ============ PRO INTERVIEWS ============
  {
    id: 'data-analyst-mid',
    title: 'Data Analyst Interview',
    company: 'Tech Startup',
    role: 'Mid-Level Data Analyst',
    difficulty: 'Medium',
    totalTime: 35 * 60,
    questionsCount: 5,
    isFree: false,
    description: 'Real-world data analyst interview focusing on business insights, reporting, and data manipulation.',
    title_tr: 'Data Analyst Mülakatı',
    description_tr: 'İş öngörüleri, raporlama ve veri işleme odaklı gerçek dünya data analyst mülakatı.',
    role_tr: 'Orta Seviye Data Analyst',
    skills: ['JOINs', 'Subqueries', 'Date Functions', 'CASE WHEN', 'Window Functions'],
    questions: [
      {
        id: 'da-q1',
        order: 1,
        title: 'Monthly revenue report',
        title_tr: 'Aylık ciro raporu',
        description: 'Build a monthly revenue summary across all available data. Show the **month** (YYYY-MM format), **total_orders** (count of orders), **revenue** (sum of totals), and **avg_order_value** (rounded to 2 decimal places). Sort chronologically.',
        description_tr: 'Tüm mevcut veri üzerinden aylık ciro özeti oluştur. **month** (YYYY-MM formatında), **total_orders** (sipariş sayısı), **revenue** (total\'lerin toplamı) ve **avg_order_value** (2 ondalık basamağa yuvarlı) kolonlarını göster. Kronolojik sırala.',
        timeLimit: 6 * 60,
        difficulty: 'Easy',
        points: 15,
        dataset: 'ecommerce',
        solution: "SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS total_orders, SUM(total) AS revenue, ROUND(AVG(total), 2) AS avg_order_value FROM orders GROUP BY month ORDER BY month",
        hints: [
          "strftime('%Y-%m', order_date) formats a date column as YYYY-MM",
          'You can use multiple aggregate functions (COUNT, SUM, AVG) in the same GROUP BY query'
        ],
        hints_tr: [
          "strftime('%Y-%m', order_date) bir tarih kolonunu YYYY-MM formatına çevirir",
          'Aynı GROUP BY sorgusu içinde birden fazla aggregate fonksiyon (COUNT, SUM, AVG) kullanabilirsin'
        ],
        concepts: ['Date Functions', 'strftime', 'COUNT', 'SUM', 'AVG', 'GROUP BY']
      },
      {
        id: 'da-q2',
        order: 2,
        title: 'Customer Segmentation',
        title_tr: 'Müşteri segmentasyonu',
        description: 'Categorize customers by total spending: **"VIP"** (>$500), **"Regular"** ($100-$500), **"Low"** (<$100). Show customer name and category.',
        description_tr: 'Müşterileri toplam harcamalarına göre sınıflandır: **"VIP"** (>$500), **"Regular"** ($100-$500), **"Low"** (<$100). Müşteri adını ve kategoriyi göster.',
        timeLimit: 7 * 60,
        difficulty: 'Medium',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT c.name, CASE WHEN COALESCE(SUM(o.total), 0) > 500 THEN 'VIP' WHEN COALESCE(SUM(o.total), 0) >= 100 THEN 'Regular' ELSE 'Low' END as category FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.name",
        hints: [
          'Use CASE WHEN for categorization',
          'LEFT JOIN includes customers with no orders'
        ],
        hints_tr: [
          'Sınıflandırma için CASE WHEN kullan',
          'LEFT JOIN sipariş vermemiş müşterileri de dahil eder'
        ],
        concepts: ['CASE WHEN', 'LEFT JOIN', 'COALESCE', 'GROUP BY']
      },
      {
        id: 'da-q3',
        order: 3,
        title: 'Inactive Customers',
        title_tr: 'Aktif olmayan müşteriler',
        description: 'Find customers who registered but have **never placed an order**. Show their name, email, and signup date.',
        description_tr: 'Kayıt olmuş ancak **hiç sipariş vermemiş** müşterileri bul. Adlarını, email\'lerini ve kayıt tarihlerini göster.',
        timeLimit: 6 * 60,
        difficulty: 'Medium',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT c.name, c.email, c.signup_date FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id WHERE o.order_id IS NULL",
        hints: [
          'LEFT JOIN keeps all customers',
          'NULL check finds those without orders'
        ],
        hints_tr: [
          'LEFT JOIN tüm müşterileri korur',
          'NULL kontrolü siparişi olmayanları bulur'
        ],
        concepts: ['LEFT JOIN', 'NULL Check', 'Filtering']
      },
      {
        id: 'da-q4',
        order: 4,
        title: 'Customer revenue ranking',
        title_tr: 'Müşteri ciro sıralaması',
        description: 'Rank **all customers** by total spending and show each customer\'s revenue share. Show **revenue_rank**, **customer name**, **total_spent**, and **pct_of_total** (their percentage of total company revenue, rounded to 2 decimal places). Unlike a simple TOP 5, this ranks all customers and calculates each one\'s contribution — which requires both RANK and a grand-total window.',
        description_tr: '**Tüm müşterileri** toplam harcamaya göre sırala ve her birinin ciro payını göster. **revenue_rank**, **customer name**, **total_spent** ve **pct_of_total** (toplam şirket cirosundaki yüzdesi, 2 ondalık basamağa yuvarlı) kolonlarını göster. Basit bir TOP 5\'in aksine bu, tüm müşterileri sıralar ve her birinin katkısını hesaplar — hem RANK hem de bir grand-total window gerektirir.',
        timeLimit: 10 * 60,
        difficulty: 'Hard',
        points: 25,
        dataset: 'ecommerce',
        solution: "WITH customer_revenue AS (SELECT c.customer_id, c.name, SUM(o.total) AS total_spent FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.name) SELECT RANK() OVER (ORDER BY total_spent DESC) AS revenue_rank, name, total_spent, ROUND(100.0 * total_spent / SUM(total_spent) OVER (), 2) AS pct_of_total FROM customer_revenue ORDER BY revenue_rank",
        hints: [
          'Use a CTE to first aggregate total_spent per customer',
          'RANK() OVER (ORDER BY total_spent DESC) gives the ranking',
          'SUM(total_spent) OVER () — with no ORDER BY and no PARTITION BY — computes the grand total across all rows',
          'Divide each customer total by the grand total and multiply by 100'
        ],
        hints_tr: [
          'Önce müşteri başına total_spent\'i bir CTE ile aggregate et',
          'RANK() OVER (ORDER BY total_spent DESC) sıralamayı verir',
          'SUM(total_spent) OVER () — ORDER BY ve PARTITION BY olmadan — tüm satırlar üzerinden grand total\'i hesaplar',
          'Her müşterinin total\'ini grand total\'e böl ve 100 ile çarp'
        ],
        concepts: ['RANK', 'SUM() OVER', 'Grand Total Window', 'CTE', 'Percentage of Total']
      },
      {
        id: 'da-q5',
        order: 5,
        title: 'Month-over-month revenue change',
        title_tr: 'Ay üstüne ay ciro değişimi',
        description: 'For every month in the dataset, calculate the **absolute revenue change** versus the previous month. Show **month** (YYYY-MM), **revenue**, **prev_revenue**, and **revenue_change** (current minus previous, rounded to 2 decimal places). Exclude the first month — it has no previous month to compare.',
        description_tr: 'Veri setindeki her ay için bir önceki aya göre **mutlak ciro değişimini** hesapla. **month** (YYYY-MM), **revenue**, **prev_revenue** ve **revenue_change** (mevcut eksi önceki, 2 ondalık basamağa yuvarlı) kolonlarını göster. İlk ayı hariç tut — karşılaştırılacak önceki ayı yok.',
        timeLimit: 9 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT month, revenue, prev_revenue, ROUND(revenue - prev_revenue, 2) AS revenue_change FROM (SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue, LAG(SUM(total)) OVER (ORDER BY strftime('%Y-%m', order_date)) AS prev_revenue FROM orders GROUP BY month) WHERE prev_revenue IS NOT NULL ORDER BY month",
        hints: [
          'First aggregate revenue by month in a subquery or CTE',
          'LAG(SUM(total)) inside the same window as GROUP BY — apply the window OVER the aggregated result',
          'Filter WHERE prev_revenue IS NOT NULL to drop the first row',
          'Revenue change = revenue - prev_revenue (no division needed — this is absolute, not percentage)'
        ],
        hints_tr: [
          'Önce bir subquery veya CTE içinde aya göre ciroyu aggregate et',
          'LAG(SUM(total)) — GROUP BY ile aynı window içinde — window\'u aggregate edilmiş sonucun ÜZERİNDE uygula',
          'İlk satırı düşürmek için WHERE prev_revenue IS NOT NULL filtrele',
          'Ciro değişimi = revenue - prev_revenue (bölme gerekmez — bu mutlak değer, yüzde değil)'
        ],
        concepts: ['LAG', 'Window over aggregate', 'Subquery', 'Date Functions', 'NULL filtering']
      }
    ],
    passingScore: 60
  },

  {
    id: 'backend-engineer-sql',
    title: 'Backend Engineer SQL Round',
    company: 'SaaS Company',
    role: 'Backend Engineer',
    difficulty: 'Hard',
    totalTime: 40 * 60,
    questionsCount: 5,
    isFree: false,
    description: 'Technical SQL interview for backend roles. Focus on complex queries, data integrity, and performance.',
    title_tr: 'Backend Engineer SQL Turu',
    description_tr: 'Backend rolleri için teknik SQL mülakatı. Karmaşık sorgular, veri bütünlüğü ve performans odaklı.',
    role_tr: 'Backend Engineer',
    skills: ['Complex JOINs', 'Subqueries', 'Window Functions', 'Data Integrity', 'Self-JOINs'],
    questions: [
      {
        id: 'be-q1',
        order: 1,
        title: 'Multi-table completed orders',
        title_tr: 'Çok tablolu tamamlanmış siparişler',
        description: 'Get a complete order summary: **order_id**, **customer name**, **product**, and **order total**. Only include orders with status = **\'completed\'** (lowercase). Sort by order_id ascending.',
        description_tr: 'Eksiksiz bir sipariş özeti çıkar: **order_id**, **customer name**, **product** ve **order total**. Sadece status = **\'completed\'** (küçük harf) olan siparişleri dahil et. order_id\'ye göre artan sırada sırala.',
        timeLimit: 7 * 60,
        difficulty: 'Medium',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT o.order_id, c.name AS customer_name, o.product, o.total FROM orders o JOIN customers c ON o.customer_id = c.customer_id WHERE o.status = 'completed' ORDER BY o.order_id",
        hints: [
          'JOIN orders and customers on customer_id',
          "Status values in the data are lowercase — use WHERE o.status = 'completed' not 'Completed'"
        ],
        hints_tr: [
          'orders ve customers tablolarını customer_id üzerinden JOIN et',
          "Veri içindeki status değerleri küçük harftir — WHERE o.status = 'completed' kullan, 'Completed' değil"
        ],
        concepts: ['JOIN', 'WHERE', 'Status filter', 'Table Aliases']
      },
      {
        id: 'be-q2',
        order: 2,
        title: 'Above Average Query',
        title_tr: 'Ortalama üstü sorgu',
        description: 'Find employees who earn **more than the average salary in their department**. Show name, department, salary, and department average.',
        description_tr: '**Kendi department\'larındaki ortalama maaştan daha fazla** kazanan çalışanları bul. Adı, department\'ı, salary\'i ve department ortalamasını göster.',
        timeLimit: 8 * 60,
        difficulty: 'Hard',
        points: 25,
        dataset: 'employees',
        solution: "SELECT e.name, e.department, e.salary, dept_avg.avg_sal FROM employees e JOIN (SELECT department, AVG(salary) as avg_sal FROM employees GROUP BY department) dept_avg ON e.department = dept_avg.department WHERE e.salary > dept_avg.avg_sal",
        hints: [
          'Subquery calculates average per department',
          'JOIN to compare individual vs average'
        ],
        hints_tr: [
          'Subquery her department için ortalamayı hesaplar',
          'Bireysel ve ortalama karşılaştırmak için JOIN kullan'
        ],
        concepts: ['Subquery', 'JOIN', 'AVG', 'Comparison']
      },
      {
        id: 'be-q3',
        order: 3,
        title: 'Employee–manager lookup (self-join)',
        title_tr: 'Çalışan–yönetici eşleştirme (self-join)',
        description: 'The org-chart tool needs manager names. For each employee, show their **name**, **department**, and their **manager_name**. Employees with no manager (NULL manager_id) should show **\'No Manager\'**. This is the **self-join pattern** — joining the employees table to itself using manager_id → emp_id.',
        description_tr: 'Organizasyon şeması aracı yönetici adlarına ihtiyaç duyuyor. Her çalışan için **name**, **department** ve **manager_name** göster. Yöneticisi olmayan (NULL manager_id) çalışanlar için **\'No Manager\'** göster. Bu, **self-join kalıbıdır** — employees tablosunu manager_id → emp_id üzerinden kendisiyle birleştirir.',
        timeLimit: 8 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'employees',
        solution: "SELECT e.name AS employee_name, e.department, COALESCE(m.name, 'No Manager') AS manager_name FROM employees e LEFT JOIN employees m ON e.manager_id = m.emp_id ORDER BY e.department, e.name",
        hints: [
          'Alias the same table twice: employees e (worker) and employees m (manager)',
          'JOIN condition: e.manager_id = m.emp_id — each employee\'s manager_id points to another employee\'s emp_id',
          'Use LEFT JOIN so employees with NULL manager_id still appear',
          "COALESCE(m.name, 'No Manager') returns the manager name, or 'No Manager' when NULL"
        ],
        hints_tr: [
          'Aynı tabloya iki farklı alias ver: employees e (çalışan) ve employees m (yönetici)',
          'JOIN koşulu: e.manager_id = m.emp_id — her çalışanın manager_id\'si başka bir çalışanın emp_id\'sine işaret eder',
          'NULL manager_id\'ye sahip çalışanların da görünmesi için LEFT JOIN kullan',
          "COALESCE(m.name, 'No Manager') yönetici adını döndürür, NULL ise 'No Manager' döndürür"
        ],
        concepts: ['Self-JOIN', 'LEFT JOIN', 'COALESCE', 'Table Aliases', 'Hierarchy']
      },
      {
        id: 'be-q4',
        order: 4,
        title: 'Running Total',
        title_tr: 'Kümülatif toplam',
        description: 'Calculate the **running total of daily revenue**. Show order_date, daily total, and cumulative total.',
        description_tr: '**Günlük cironun kümülatif toplamını** hesapla. order_date, günlük total ve kümülatif total\'i göster.',
        timeLimit: 9 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT order_date, SUM(total) as daily_revenue, SUM(SUM(total)) OVER (ORDER BY order_date ROWS UNBOUNDED PRECEDING) as running_total FROM orders GROUP BY order_date ORDER BY order_date",
        hints: [
          'First GROUP BY date, then apply window function',
          'SUM() OVER (ORDER BY ...) creates running total'
        ],
        hints_tr: [
          'Önce tarihe göre GROUP BY yap, sonra window function uygula',
          'SUM() OVER (ORDER BY ...) kümülatif toplam üretir'
        ],
        concepts: ['Window Functions', 'Running Total', 'GROUP BY']
      },
      {
        id: 'be-q5',
        order: 5,
        title: 'Duplicate email detection',
        title_tr: 'Yinelenen email tespiti',
        description: 'A data quality check has flagged potential duplicate accounts. Find all **email addresses shared by more than one customer**. Show the **email**, the **duplicate_count**, and a **customer_names** list (comma-separated) of everyone using that email. Sort by duplicate count descending. In production, this query would feed an alert pipeline.',
        description_tr: 'Bir veri kalitesi kontrolü olası yinelenen hesapları işaretledi. **Birden fazla müşteri tarafından paylaşılan tüm email adreslerini** bul. **email**, **duplicate_count** ve o email\'i kullanan herkesin virgülle ayrılmış **customer_names** listesini göster. duplicate count\'a göre azalan sırada sırala. Production\'da bu sorgu bir alert pipeline\'ını besleyebilir.',
        timeLimit: 9 * 60,
        difficulty: 'Medium',
        points: 15,
        dataset: 'ecommerce',
        solution: "SELECT email, COUNT(*) AS duplicate_count, GROUP_CONCAT(name, ', ') AS customer_names FROM customers GROUP BY email HAVING COUNT(*) > 1 ORDER BY duplicate_count DESC",
        hints: [
          'GROUP BY email collapses all customers sharing the same email into one row',
          'HAVING COUNT(*) > 1 keeps only groups with duplicates — WHERE would not work here (it runs before aggregation)',
          'GROUP_CONCAT(name, \', \') concatenates all names in the group into a single string'
        ],
        hints_tr: [
          'GROUP BY email aynı email\'i paylaşan tüm müşterileri tek bir satıra indirger',
          'HAVING COUNT(*) > 1 sadece yinelenen grupları tutar — WHERE burada çalışmaz (aggregation öncesinde devreye girer)',
          'GROUP_CONCAT(name, \', \') gruptaki tüm adları tek bir string\'de birleştirir'
        ],
        concepts: ['GROUP BY', 'HAVING', 'GROUP_CONCAT', 'Duplicate Detection', 'Data Quality']
      }
    ],
    passingScore: 55
  },

  {
    id: 'faang-sql-interview',
    title: 'FAANG-Style SQL Interview',
    company: 'Big Tech',
    role: 'Software Engineer / Data Engineer',
    difficulty: 'Hard',
    totalTime: 50 * 60,
    questionsCount: 5,
    isFree: false,
    description: 'Challenging interview simulating FAANG-level SQL questions. Tests advanced concepts and edge case handling.',
    title_tr: 'FAANG Tarzı SQL Mülakatı',
    description_tr: 'FAANG seviyesinde SQL sorularını simüle eden zorlu bir mülakat. İleri seviye kavramları ve uç durum yönetimini sınar.',
    role_tr: 'Software Engineer / Data Engineer',
    skills: ['Advanced Window Functions', 'CTEs', 'Complex Subqueries', 'Self-JOINs', 'Edge Cases'],
    questions: [
      {
        id: 'faang-q1',
        order: 1,
        title: 'Second highest salary',
        title_tr: 'İkinci en yüksek maaş',
        description: 'Find the **second highest distinct salary** in the employees table. Return a single column called **second_highest**. If every employee earns the same salary (no second distinct value), return NULL. Write the solution using **DENSE_RANK** — the approach expected in a senior interview — rather than a nested MAX subquery.',
        description_tr: 'employees tablosundaki **ikinci en yüksek farklı maaşı** bul. **second_highest** adında tek bir kolon döndür. Her çalışan aynı maaşı kazanıyorsa (ikinci bir farklı değer yoksa) NULL döndür. Çözümü iç içe bir MAX subquery yerine **DENSE_RANK** ile yaz — senior bir mülakatta beklenen yaklaşım budur.',
        timeLimit: 7 * 60,
        difficulty: 'Medium',
        points: 20,
        dataset: 'employees',
        solution: "SELECT salary AS second_highest FROM (SELECT DISTINCT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM employees) WHERE rnk = 2",
        hints: [
          'DISTINCT first — you want the second highest salary value, not the second highest row',
          'DENSE_RANK() OVER (ORDER BY salary DESC) gives rank 1 to the highest, 2 to the next distinct value',
          'Wrap in a subquery and filter WHERE rnk = 2',
          'If no second distinct salary exists, the outer query returns no rows — which is equivalent to NULL'
        ],
        hints_tr: [
          'Önce DISTINCT — ikinci en yüksek satırı değil, ikinci en yüksek maaş değerini istiyorsun',
          'DENSE_RANK() OVER (ORDER BY salary DESC) en yükseğe rank 1, bir sonraki farklı değere 2 verir',
          'Bir subquery içine sar ve WHERE rnk = 2 ile filtrele',
          'İkinci farklı bir maaş yoksa dış sorgu hiçbir satır döndürmez — bu NULL\'a eşdeğerdir'
        ],
        concepts: ['DENSE_RANK', 'DISTINCT', 'Subquery', 'NULL handling', 'Window Functions']
      },
      {
        id: 'faang-q2',
        order: 2,
        title: 'Consecutive Orders',
        title_tr: 'Ardışık siparişler',
        description: 'Find customers who placed orders on **at least 2 consecutive days**. Show customer name and their consecutive dates.',
        description_tr: '**En az 2 ardışık günde** sipariş veren müşterileri bul. Müşteri adını ve ardışık tarihlerini göster.',
        timeLimit: 12 * 60,
        difficulty: 'Hard',
        points: 25,
        dataset: 'ecommerce',
        solution: "SELECT DISTINCT c.name, o1.order_date as day1, o2.order_date as day2 FROM orders o1 JOIN orders o2 ON o1.customer_id = o2.customer_id AND DATE(o2.order_date) = DATE(o1.order_date, '+1 day') JOIN customers c ON o1.customer_id = c.customer_id",
        hints: [
          'Self-join orders to compare dates',
          "DATE(date, '+1 day') adds one day"
        ],
        hints_tr: [
          'Tarihleri karşılaştırmak için orders tablosuna self-join yap',
          "DATE(date, '+1 day') bir gün ekler"
        ],
        concepts: ['Self-JOIN', 'Date Arithmetic', 'DISTINCT']
      },
      {
        id: 'faang-q3',
        order: 3,
        title: 'Longest-tenured employee per department',
        title_tr: 'Department başına en kıdemli çalışan',
        description: 'Find the **most tenured employee in each department** — the one who joined earliest. Show **department**, **name**, **hire_date**, and **years_tenure** (years since hire_date, rounded to 1 decimal). Handle ties: if two people share the same earliest hire_date, show both. This is a PARTITION BY pattern with ascending date order — different from salary ranking.',
        description_tr: '**Her department\'taki en kıdemli çalışanı** bul — en erken işe başlayan kişi. **department**, **name**, **hire_date** ve **years_tenure** (hire_date\'ten bu yana geçen yıl, 1 ondalık basamağa yuvarlı) göster. Eşitlikleri ele al: en erken hire_date\'i paylaşan iki kişi varsa ikisini de göster. Bu artan tarih sırasıyla bir PARTITION BY kalıbıdır — maaş sıralamasından farklıdır.',
        timeLimit: 10 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'employees',
        solution: "SELECT department, name, hire_date, ROUND((julianday('now') - julianday(hire_date)) / 365.25, 1) AS years_tenure FROM (SELECT *, RANK() OVER (PARTITION BY department ORDER BY hire_date ASC) AS rk FROM employees) WHERE rk = 1 ORDER BY years_tenure DESC",
        hints: [
          'RANK() OVER (PARTITION BY department ORDER BY hire_date ASC) — ASC because the earliest date = most tenure',
          'Use RANK() not ROW_NUMBER() to surface tied employees with the same hire_date',
          'julianday() converts a date string to a day number; subtract to get the difference',
          'Divide by 365.25 (not 365) to account for leap years'
        ],
        hints_tr: [
          'RANK() OVER (PARTITION BY department ORDER BY hire_date ASC) — ASC çünkü en erken tarih = en yüksek kıdem',
          'Aynı hire_date\'e sahip eşit çalışanları yüzeye çıkarmak için ROW_NUMBER() yerine RANK() kullan',
          'julianday() bir tarih string\'ini gün sayısına çevirir; farkı almak için çıkarma yap',
          'Artık yılları hesaba katmak için 365 yerine 365.25\'e böl'
        ],
        concepts: ['RANK', 'PARTITION BY', 'Date Arithmetic', 'julianday', 'Tie handling']
      },
      {
        id: 'faang-q4',
        order: 4,
        title: 'Gap to Next',
        title_tr: 'Bir sonrakine fark',
        description: 'For each employee, find the **salary gap** to the next highest earner in their department. Show name, salary, and gap.',
        description_tr: 'Her çalışan için kendi department\'ındaki bir sonraki yüksek kazanana **maaş farkını** bul. Adı, salary\'i ve farkı göster.',
        timeLimit: 10 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'employees',
        solution: "SELECT name, department, salary, LEAD(salary) OVER (PARTITION BY department ORDER BY salary) - salary as gap_to_next FROM employees ORDER BY department, salary",
        hints: [
          'LEAD() gets next row value',
          'PARTITION BY for within-department'
        ],
        hints_tr: [
          'LEAD() bir sonraki satırın değerini alır',
          'Department içinde kalmak için PARTITION BY kullan'
        ],
        concepts: ['Window Functions', 'LEAD', 'PARTITION BY']
      },
      {
        id: 'faang-q5',
        order: 5,
        title: 'Percentile and quartile ranking',
        title_tr: 'Yüzdelik ve çeyreklik sıralama',
        description: 'Categorise every order by two different distribution metrics. Show **order_id**, **total**, **percentile** (0–100, using PERCENT_RANK, rounded to the nearest integer), and **quartile** (1–4, using NTILE). Sort by total descending. Understanding the difference between PERCENT_RANK and NTILE is a real senior interview differentiator — PERCENT_RANK places rows in relative position, NTILE divides them into equal-sized buckets.',
        description_tr: 'Her siparişi iki farklı dağılım metriğine göre sınıflandır. **order_id**, **total**, **percentile** (0–100, PERCENT_RANK ile, en yakın tam sayıya yuvarlı) ve **quartile** (1–4, NTILE ile) göster. total\'e göre azalan sırada sırala. PERCENT_RANK ile NTILE arasındaki farkı anlamak senior mülakatlarında gerçek bir ayrım noktasıdır — PERCENT_RANK satırları göreli konuma yerleştirir, NTILE onları eşit boyutlu kovalara böler.',
        timeLimit: 11 * 60,
        difficulty: 'Hard',
        points: 15,
        dataset: 'ecommerce',
        solution: "SELECT order_id, total, ROUND(PERCENT_RANK() OVER (ORDER BY total) * 100, 0) AS percentile, NTILE(4) OVER (ORDER BY total) AS quartile FROM orders ORDER BY total DESC",
        hints: [
          'PERCENT_RANK() returns a value from 0.0 to 1.0 — multiply by 100 and ROUND() to get 0–100',
          'NTILE(4) splits rows into 4 equal buckets (quartiles): 1 = bottom 25%, 4 = top 25%',
          'Both functions use the same ORDER BY total — they can share the same window expression',
          'The first row (lowest total) gets PERCENT_RANK = 0.0; the last gets 1.0'
        ],
        hints_tr: [
          'PERCENT_RANK() 0.0 ile 1.0 arasında bir değer döndürür — 0–100 elde etmek için 100 ile çarp ve ROUND() uygula',
          'NTILE(4) satırları 4 eşit kovaya (quartile) böler: 1 = en alttaki %25, 4 = en üstteki %25',
          'Her iki fonksiyon da aynı ORDER BY total\'i kullanır — aynı window ifadesini paylaşabilirler',
          'İlk satır (en düşük total) PERCENT_RANK = 0.0 alır; sonuncu 1.0 alır'
        ],
        concepts: ['PERCENT_RANK', 'NTILE', 'Window Functions', 'Percentile vs Quartile']
      }
    ],
    passingScore: 50
  },

  {
    id: 'business-analyst-sql',
    title: 'Business Analyst SQL Test',
    company: 'E-commerce Corp',
    role: 'Business Analyst',
    difficulty: 'Medium',
    totalTime: 30 * 60,
    questionsCount: 5,
    isFree: false,
    description: 'Business-focused SQL interview emphasizing KPIs, reporting, and actionable business insights.',
    title_tr: 'Business Analyst SQL Sınavı',
    description_tr: 'KPI\'lar, raporlama ve aksiyona dönüşebilir iş öngörülerine odaklanan iş odaklı SQL mülakatı.',
    role_tr: 'Business Analyst',
    skills: ['Reporting', 'KPIs', 'Aggregation', 'Percentages', 'Business Logic'],
    questions: [
      {
        id: 'ba-q1',
        order: 1,
        title: 'Daily customer and order metrics',
        title_tr: 'Günlük müşteri ve sipariş metrikleri',
        description: 'Build a daily dashboard row. For each order date, show the **order_date**, number of **unique_customers**, total **orders**, and **avg_order_value** (rounded to 2 decimal places). Sort by date ascending. This combines COUNT(*), COUNT(DISTINCT), and AVG in a single GROUP BY — a standard business reporting pattern.',
        description_tr: 'Günlük bir dashboard satırı oluştur. Her sipariş tarihi için **order_date**, **unique_customers** sayısı, toplam **orders** ve **avg_order_value** (2 ondalık basamağa yuvarlı) kolonlarını göster. Tarihe göre artan sırada sırala. Bu, tek bir GROUP BY içinde COUNT(*), COUNT(DISTINCT) ve AVG\'yi birleştirir — standart bir iş raporlama kalıbıdır.',
        timeLimit: 6 * 60,
        difficulty: 'Easy',
        points: 15,
        dataset: 'ecommerce',
        solution: "SELECT order_date, COUNT(DISTINCT customer_id) AS unique_customers, COUNT(*) AS orders, ROUND(AVG(total), 2) AS avg_order_value FROM orders GROUP BY order_date ORDER BY order_date",
        hints: [
          'COUNT(*) counts all rows (orders); COUNT(DISTINCT customer_id) counts unique customers',
          'AVG(total) calculates the mean order value — ROUND(..., 2) keeps it to 2 decimal places',
          'All three aggregate functions sit in the same SELECT with the same GROUP BY'
        ],
        hints_tr: [
          'COUNT(*) tüm satırları sayar (siparişler); COUNT(DISTINCT customer_id) benzersiz müşterileri sayar',
          'AVG(total) ortalama sipariş değerini hesaplar — ROUND(..., 2) 2 ondalık basamağa yuvarlar',
          'Üç aggregate fonksiyonun üçü de aynı SELECT içinde, aynı GROUP BY ile yer alır'
        ],
        concepts: ['COUNT DISTINCT', 'COUNT', 'AVG', 'GROUP BY', 'DAU metrics']
      },
      {
        id: 'ba-q2',
        order: 2,
        title: 'Average order value by country',
        title_tr: 'Ülkeye göre ortalama sipariş değeri',
        description: 'Calculate the **Average Order Value (AOV)** for each country. Show the **country** (from the orders table), the **order_count**, and **aov** rounded to 2 decimal places. Sort by AOV descending. Note: country is stored on the order, not the customer.',
        description_tr: 'Her ülke için **Average Order Value (AOV)** değerini hesapla. **country** (orders tablosundan), **order_count** ve 2 ondalık basamağa yuvarlanmış **aov** kolonlarını göster. AOV\'ye göre azalan sırada sırala. Not: country, customer\'da değil order üzerinde tutulur.',
        timeLimit: 6 * 60,
        difficulty: 'Easy',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT country, COUNT(*) AS order_count, ROUND(AVG(total), 2) AS aov FROM orders GROUP BY country ORDER BY aov DESC",
        hints: [
          'The country column lives on the orders table — no JOIN needed',
          'GROUP BY country, then apply COUNT(*) and AVG(total)',
          'ROUND(..., 2) keeps AOV to 2 decimal places'
        ],
        hints_tr: [
          'country kolonu orders tablosunda — JOIN gerekmez',
          'GROUP BY country yap, sonra COUNT(*) ve AVG(total) uygula',
          'ROUND(..., 2) AOV\'yi 2 ondalık basamakta tutar'
        ],
        concepts: ['GROUP BY', 'AVG', 'COUNT', 'ROUND', 'Business Metrics']
      },
      {
        id: 'ba-q3',
        order: 3,
        title: 'Repeat Purchase Rate',
        title_tr: 'Tekrar satın alma oranı',
        description: 'Calculate the **percentage of customers** who have placed more than one order. Return a single percentage value.',
        description_tr: 'Birden fazla sipariş vermiş **müşterilerin yüzdesini** hesapla. Tek bir yüzde değeri döndür.',
        timeLimit: 8 * 60,
        difficulty: 'Medium',
        points: 25,
        dataset: 'ecommerce',
        solution: "SELECT ROUND(100.0 * SUM(CASE WHEN order_count > 1 THEN 1 ELSE 0 END) / COUNT(*), 2) as repeat_rate FROM (SELECT customer_id, COUNT(*) as order_count FROM orders GROUP BY customer_id)",
        hints: [
          'First count orders per customer',
          'Then calculate % with more than 1'
        ],
        hints_tr: [
          'Önce müşteri başına sipariş sayısını hesapla',
          'Sonra 1\'den fazla olan oranını hesapla'
        ],
        concepts: ['Subquery', 'CASE WHEN', 'Percentage Calculation']
      },
      {
        id: 'ba-q4',
        order: 4,
        title: 'Order Status Breakdown',
        title_tr: 'Sipariş statüsü dağılımı',
        description: 'Show the **count and percentage** of orders in each status (pending, completed, cancelled).',
        description_tr: 'Her statü (pending, completed, cancelled) için **sipariş sayısını ve yüzdesini** göster.',
        timeLimit: 6 * 60,
        difficulty: 'Medium',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT status, COUNT(*) as count, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM orders), 2) as percentage FROM orders GROUP BY status ORDER BY count DESC",
        hints: [
          'Subquery gets total count',
          'Calculate percentage for each status'
        ],
        hints_tr: [
          'Subquery toplam sayıyı verir',
          'Her statü için yüzdeyi hesapla'
        ],
        concepts: ['GROUP BY', 'Subquery', 'Percentage']
      },
      {
        id: 'ba-q5',
        order: 5,
        title: 'Revenue and orders by day of week',
        title_tr: 'Haftanın günü bazında ciro ve siparişler',
        description: 'The marketing team wants to know which days drive the most business. For each day of the week show: **day_num** (0=Sunday, 6=Saturday), **day_name**, **total_orders**, **total_revenue**, and **avg_order_value** (rounded to 2 decimal places). Sort by day_num so the week reads in order. This requires SQLite date functions plus CASE WHEN to translate numbers to names.',
        description_tr: 'Pazarlama ekibi hangi günlerin en çok iş ürettiğini bilmek istiyor. Haftanın her günü için göster: **day_num** (0=Sunday, 6=Saturday), **day_name**, **total_orders**, **total_revenue** ve **avg_order_value** (2 ondalık basamağa yuvarlı). Hafta sırayla okunacak şekilde day_num\'a göre sırala. Bu, SQLite tarih fonksiyonlarını ve sayıları gün adlarına çevirmek için CASE WHEN gerektirir.',
        timeLimit: 7 * 60,
        difficulty: 'Medium',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT CAST(strftime('%w', order_date) AS INTEGER) AS day_num, CASE CAST(strftime('%w', order_date) AS INTEGER) WHEN 0 THEN 'Sunday' WHEN 1 THEN 'Monday' WHEN 2 THEN 'Tuesday' WHEN 3 THEN 'Wednesday' WHEN 4 THEN 'Thursday' WHEN 5 THEN 'Friday' ELSE 'Saturday' END AS day_name, COUNT(*) AS total_orders, ROUND(SUM(total), 2) AS total_revenue, ROUND(AVG(total), 2) AS avg_order_value FROM orders GROUP BY day_num ORDER BY day_num",
        hints: [
          "strftime('%w', order_date) returns the day-of-week as a text character ('0'=Sunday) — CAST to INTEGER first",
          'CASE WHEN maps each integer to a day name — cover all 7 values (0–6)',
          'GROUP BY day_num, then use COUNT(*), SUM(total), AVG(total) for the three metrics'
        ],
        hints_tr: [
          "strftime('%w', order_date) haftanın gününü metin karakteri olarak döndürür ('0'=Sunday) — önce INTEGER\'a CAST et",
          'CASE WHEN her tam sayıyı bir gün adına eşler — 7 değeri de (0–6) kapsa',
          'GROUP BY day_num yap, sonra üç metrik için COUNT(*), SUM(total), AVG(total) kullan'
        ],
        concepts: ['Date Functions', 'strftime', 'CASE WHEN', 'CAST', 'GROUP BY', 'Multiple Aggregates']
      }
    ],
    passingScore: 60
  },

  {
    id: 'senior-data-engineer',
    title: 'Senior Data Engineer Interview',
    company: 'Fintech',
    role: 'Senior Data Engineer',
    difficulty: 'Hard',
    totalTime: 55 * 60,
    questionsCount: 5,
    isFree: false,
    description: 'Advanced SQL interview for senior positions. Focus on optimization, complex transformations, and analytics.',
    title_tr: 'Senior Data Engineer Mülakatı',
    description_tr: 'Üst düzey pozisyonlar için ileri seviye SQL mülakatı. Optimizasyon, karmaşık dönüşümler ve analitik odaklı.',
    role_tr: 'Senior Data Engineer',
    skills: ['Advanced Window Functions', 'CTEs', 'Performance', 'Complex Analytics', 'Data Quality'],
    questions: [
      {
        id: 'sde-q1',
        order: 1,
        title: '7-day rolling average revenue',
        title_tr: '7 günlük hareketli ciro ortalaması',
        description: 'Calculate a **7-day rolling average of daily revenue** to smooth out day-to-day noise. Show **day** (DATE format), **daily_revenue**, and **rolling_7day_avg** (rounded to 2 decimal places). The first 6 rows will have a rolling average over fewer than 7 days — that is expected. This is one of the most common advanced window frame patterns in data engineering.',
        description_tr: 'Günden güne dalgalanmaları yumuşatmak için **günlük cironun 7 günlük hareketli ortalamasını** hesapla. **day** (DATE formatında), **daily_revenue** ve **rolling_7day_avg** (2 ondalık basamağa yuvarlı) kolonlarını göster. İlk 6 satır 7\'den az gün üzerinden hareketli ortalama içerecek — bu beklenen davranıştır. Bu, data engineering\'de en yaygın ileri seviye window frame kalıplarından biridir.',
        timeLimit: 10 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'ecommerce',
        solution: "WITH daily AS (SELECT DATE(order_date) AS day, SUM(total) AS daily_revenue FROM orders GROUP BY DATE(order_date)) SELECT day, daily_revenue, ROUND(AVG(daily_revenue) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS rolling_7day_avg FROM daily ORDER BY day",
        hints: [
          'First aggregate to one row per day using a CTE: GROUP BY DATE(order_date)',
          'AVG() OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) is the 7-day window',
          'ROWS BETWEEN 6 PRECEDING AND CURRENT ROW = current row + 6 previous rows = 7 rows',
          'The frame clause narrows the window — without it, AVG() OVER cumulates all prior rows'
        ],
        hints_tr: [
          'Önce bir CTE ile gün başına tek satıra aggregate et: GROUP BY DATE(order_date)',
          'AVG() OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) 7 günlük penceredir',
          'ROWS BETWEEN 6 PRECEDING AND CURRENT ROW = mevcut satır + önceki 6 satır = 7 satır',
          'Frame clause window\'u daraltır — onsuz AVG() OVER tüm önceki satırları kümülatif toplar'
        ],
        concepts: ['Rolling Average', 'Frame Clause', 'ROWS BETWEEN', 'AVG() OVER', 'CTE']
      },
      {
        id: 'sde-q2',
        order: 2,
        title: 'Customer Cohort',
        title_tr: 'Müşteri kohortu',
        description: 'Group customers by **signup month** and calculate how many orders each cohort placed in their first 30 days. Show signup month and order count.',
        description_tr: 'Müşterileri **kayıt ayına** göre grupla ve her kohortun ilk 30 günde kaç sipariş verdiğini hesapla. Kayıt ayını ve sipariş sayısını göster.',
        timeLimit: 12 * 60,
        difficulty: 'Hard',
        points: 25,
        dataset: 'ecommerce',
        solution: "SELECT strftime('%Y-%m', c.signup_date) as cohort, COUNT(o.order_id) as orders_in_30_days FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id AND julianday(o.order_date) - julianday(c.signup_date) BETWEEN 0 AND 30 GROUP BY cohort ORDER BY cohort",
        hints: [
          'JOIN with date range condition',
          'julianday() for date math'
        ],
        hints_tr: [
          'Tarih aralığı koşuluyla JOIN yap',
          'Tarih hesabı için julianday() kullan'
        ],
        concepts: ['Cohort Analysis', 'Date Math', 'LEFT JOIN']
      },
      {
        id: 'sde-q3',
        order: 3,
        title: 'Top 10% orders with category context',
        title_tr: 'Kategori bağlamıyla en üst %10 siparişler',
        description: 'Find all orders in the **top 10% by total value**. Show **order_id**, **category**, **total**, **percentile_rank** (0–100 rounded to 1 decimal), and **category_rank** (rank within the order\'s own category by total, highest first). This combines a global percentile filter with a within-group ranking — two different window partitions on the same query.',
        description_tr: '**Total değere göre en üst %10**\'daki tüm siparişleri bul. **order_id**, **category**, **total**, **percentile_rank** (0–100, 1 ondalık basamağa yuvarlı) ve **category_rank** (siparişin kendi category\'si içinde total\'e göre rank, en yüksek önce) göster. Bu, global bir yüzdelik filtreyi grup içi sıralamayla birleştirir — aynı sorguda iki farklı window partition.',
        timeLimit: 12 * 60,
        difficulty: 'Hard',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT order_id, category, total, ROUND(PERCENT_RANK() OVER (ORDER BY total) * 100, 1) AS percentile_rank, RANK() OVER (PARTITION BY category ORDER BY total DESC) AS category_rank FROM orders WHERE order_id IN (SELECT order_id FROM (SELECT order_id, PERCENT_RANK() OVER (ORDER BY total) AS pct FROM orders) WHERE pct >= 0.90) ORDER BY total DESC",
        hints: [
          'First identify the top-10% order_ids using a subquery: PERCENT_RANK() >= 0.90',
          'Then in the outer query, compute both window functions on the filtered set',
          'PERCENT_RANK() OVER (ORDER BY total) — no PARTITION BY — ranks across all orders globally',
          'RANK() OVER (PARTITION BY category ORDER BY total DESC) restarts the rank for each category',
          'You need two separate OVER clauses in the same SELECT — that is valid SQL'
        ],
        hints_tr: [
          'Önce bir subquery ile en üst %10 order_id\'leri belirle: PERCENT_RANK() >= 0.90',
          'Sonra dış sorguda her iki window function\'ı filtrelenmiş set üzerinde hesapla',
          'PERCENT_RANK() OVER (ORDER BY total) — PARTITION BY olmadan — tüm siparişler arasında global sıralar',
          'RANK() OVER (PARTITION BY category ORDER BY total DESC) her category için rank\'ı yeniden başlatır',
          'Aynı SELECT içinde iki farklı OVER clause kullanman gerekir — bu geçerli SQL\'dir'
        ],
        concepts: ['PERCENT_RANK', 'RANK', 'PARTITION BY', 'Multiple Windows', 'Subquery filter']
      },
      {
        id: 'sde-q4',
        order: 4,
        title: 'Gap Detection',
        title_tr: 'Boşluk tespiti',
        description: 'Find **gaps in order IDs** (missing sequence numbers). Show the start and end of each gap.',
        description_tr: '**order ID\'lerindeki boşlukları** bul (eksik sıra numaraları). Her boşluğun başlangıcını ve bitişini göster.',
        timeLimit: 12 * 60,
        difficulty: 'Very Hard',
        points: 20,
        dataset: 'ecommerce',
        solution: "SELECT order_id + 1 as gap_start, next_id - 1 as gap_end FROM (SELECT order_id, LEAD(order_id) OVER (ORDER BY order_id) as next_id FROM orders) WHERE next_id - order_id > 1",
        hints: [
          'LEAD() gets the next order_id',
          'Gap exists when difference > 1'
        ],
        hints_tr: [
          'LEAD() bir sonraki order_id\'yi alır',
          'Fark > 1 olduğunda boşluk vardır'
        ],
        concepts: ['Window Functions', 'LEAD', 'Gap Analysis']
      },
      {
        id: 'sde-q5',
        order: 5,
        title: 'Cumulative Distinct',
        title_tr: 'Kümülatif benzersiz',
        description: 'Calculate the **cumulative count of unique customers** over time. Show date and running unique customer count.',
        description_tr: 'Zaman içinde **benzersiz müşterilerin kümülatif sayısını** hesapla. Tarihi ve kümülatif benzersiz müşteri sayısını göster.',
        timeLimit: 11 * 60,
        difficulty: 'Very Hard',
        points: 15,
        dataset: 'ecommerce',
        solution: "SELECT order_date, (SELECT COUNT(DISTINCT o2.customer_id) FROM orders o2 WHERE o2.order_date <= o1.order_date) as cumulative_customers FROM (SELECT DISTINCT order_date FROM orders) o1 ORDER BY order_date",
        hints: [
          'Correlated subquery counts up to each date',
          'Cannot use simple window function for distinct'
        ],
        hints_tr: [
          'Correlated subquery her tarihe kadar sayar',
          'Distinct için basit window function kullanılamaz'
        ],
        concepts: ['Correlated Subquery', 'Cumulative Distinct', 'Advanced Analytics']
      }
    ],
    passingScore: 50
  },

  // ============ TOP 10 MOST ASKED ============
  {
    id: 'top-10-most-asked',
    title: 'Top 10 Most-Asked SQL Questions',
    company: 'FAANG',
    role: 'Data Analyst / Data Engineer',
    difficulty: 'Hard',
    totalTime: 90 * 60,
    questionsCount: 10,
    isFree: false,
    description: 'The 10 SQL patterns that appear most often in real FAANG interviews — based on hundreds of interview reports from Meta, Google, Amazon, Netflix and Stripe. Master these and you\'re ready for any data interview.',
    title_tr: 'En Çok Sorulan 10 SQL Sorusu',
    description_tr: 'Gerçek FAANG mülakatlarında en sık karşımıza çıkan 10 SQL kalıbı — Meta, Google, Amazon, Netflix ve Stripe\'tan yüzlerce mülakat raporuna dayanır. Bunlara hâkim olduğunda her veri mülakatına hazırsın.',
    role_tr: 'Data Analyst / Data Engineer',
    skills: ['Window Functions', 'CTEs', 'Anti-joins', 'Running Totals', 'Retention', 'Ranking', 'Consecutive Days', 'Conditional Aggregation', 'Median'],
    questions: [
      {
        id: 'top10-q1',
        order: 1,
        title: 'Top N per group',
        title_tr: 'Grup başına Top N',
        description: 'The single most common FAANG SQL pattern. Find the **top 2 highest-paid employees in each department**. Show department, name, salary, and their rank within the department. Handle ties so two employees with the same salary both appear.',
        description_tr: 'FAANG\'de en sık karşılaşılan tek bir SQL kalıbı. **Her department\'taki en yüksek maaşlı 2 çalışanı** bul. department, name, salary ve department içindeki rank\'larını göster. Eşitlikleri ele al — aynı maaşa sahip iki çalışan da görünmeli.',
        timeLimit: 10 * 60,
        difficulty: 'Hard',
        points: 10,
        dataset: 'employees',
        solution: "SELECT department, name, salary, rnk FROM (SELECT department, name, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk FROM employees) ranked WHERE rnk <= 2 ORDER BY department, rnk",
        hints: [
          'Use DENSE_RANK() not ROW_NUMBER() — ties should both appear',
          'PARTITION BY department restarts the rank for each department',
          'Filter rnk <= 2 in an outer query or subquery'
        ],
        hints_tr: [
          'ROW_NUMBER() yerine DENSE_RANK() kullan — eşit olanların ikisi de görünmeli',
          'PARTITION BY department her department için rank\'ı yeniden başlatır',
          'rnk <= 2\'yi dış sorguda veya subquery\'de filtrele'
        ],
        concepts: ['DENSE_RANK', 'PARTITION BY', 'Window Functions', 'Subquery']
      },
      {
        id: 'top10-q2',
        order: 2,
        title: 'Running total (cumulative sum)',
        title_tr: 'Kümülatif toplam (running total)',
        description: 'Calculate the **running total of revenue** across all orders, ordered by order date. Show order_id, order_date, total (for that order), and cumulative_revenue (running total up to and including that order).',
        description_tr: 'Sipariş tarihine göre sıralanmış tüm siparişler üzerinden **cironun kümülatif toplamını** hesapla. order_id, order_date, total (o sipariş için) ve cumulative_revenue (o sipariş dahil o noktaya kadar toplam) göster.',
        timeLimit: 8 * 60,
        difficulty: 'Medium',
        points: 10,
        dataset: 'ecommerce',
        solution: "SELECT order_id, order_date, total, SUM(total) OVER (ORDER BY order_date, order_id) AS cumulative_revenue FROM orders ORDER BY order_date, order_id",
        hints: [
          'SUM() OVER (ORDER BY ...) creates a running total',
          'Without PARTITION BY, the window covers all rows',
          'Add order_id as a tiebreaker when dates are equal'
        ],
        hints_tr: [
          'SUM() OVER (ORDER BY ...) running total üretir',
          'PARTITION BY olmadan window tüm satırları kapsar',
          'Tarihler eşit olduğunda tiebreaker olarak order_id ekle'
        ],
        concepts: ['SUM() OVER', 'Window Functions', 'Cumulative Sum']
      },
      {
        id: 'top10-q3',
        order: 3,
        title: 'Finding duplicates',
        title_tr: 'Yinelenenleri bulma',
        description: 'Find all **email addresses that are shared by more than one customer**. Return the email and how many customers share it, sorted by count descending. This tests GROUP BY + HAVING — the most commonly confused clause pair.',
        description_tr: '**Birden fazla müşteri tarafından paylaşılan tüm email adreslerini** bul. email\'i ve onu kaç müşterinin paylaştığını count\'a göre azalan sırada döndür. Bu, GROUP BY + HAVING\'i sınar — en sık karıştırılan clause çiftidir.',
        timeLimit: 6 * 60,
        difficulty: 'Easy',
        points: 10,
        dataset: 'ecommerce',
        solution: "SELECT email, COUNT(*) AS occurrences FROM customers GROUP BY email HAVING COUNT(*) > 1 ORDER BY occurrences DESC",
        hints: [
          'GROUP BY email to group per email',
          'HAVING filters after aggregation — WHERE would not work here',
          'COUNT(*) counts rows per group'
        ],
        hints_tr: [
          'Her email başına gruplamak için GROUP BY email',
          'HAVING aggregation sonrası filtreler — WHERE burada çalışmaz',
          'COUNT(*) grup başına satır sayısı verir'
        ],
        concepts: ['GROUP BY', 'HAVING', 'COUNT', 'Duplicates']
      },
      {
        id: 'top10-q4',
        order: 4,
        title: 'Employees with shared salaries',
        title_tr: 'Aynı maaşı paylaşan çalışanlar',
        description: 'Find all salaries that are **shared by more than one employee**. For each such salary, show the **salary**, how many employees **share_it**, and a comma-separated **employees_list** of their names. Order by salary descending. This tests CTE + HAVING + GROUP_CONCAT — a common pattern for detecting collisions and duplicates in real data.',
        description_tr: '**Birden fazla çalışan tarafından paylaşılan tüm maaşları** bul. Her böyle maaş için **salary**, kaç çalışanın **share_it** ettiğini ve adlarının virgülle ayrılmış **employees_list**\'ini göster. salary\'e göre azalan sırada sırala. Bu, CTE + HAVING + GROUP_CONCAT\'ı sınar — gerçek veride çakışmaları ve yinelemeleri tespit etmek için yaygın bir kalıptır.',
        timeLimit: 9 * 60,
        difficulty: 'Medium',
        points: 10,
        dataset: 'employees',
        solution: "WITH shared AS (SELECT salary, COUNT(*) AS share_it FROM employees GROUP BY salary HAVING COUNT(*) > 1) SELECT e.salary, s.share_it, GROUP_CONCAT(e.name, ', ') AS employees_list FROM employees e JOIN shared s ON e.salary = s.salary GROUP BY e.salary ORDER BY e.salary DESC",
        hints: [
          'Step 1 (CTE): GROUP BY salary, HAVING COUNT(*) > 1 finds salaries that appear more than once',
          'Step 2: JOIN employees back to the CTE to get the names',
          'GROUP_CONCAT(name, \', \') concatenates names within each salary group',
          'GROUP BY e.salary in the outer query collapses to one row per shared salary'
        ],
        hints_tr: [
          '1. Adım (CTE): GROUP BY salary, HAVING COUNT(*) > 1 birden fazla geçen maaşları bulur',
          '2. Adım: Adları almak için employees\'ı CTE\'ye JOIN et',
          'GROUP_CONCAT(name, \', \') her salary grubu içindeki adları birleştirir',
          'Dış sorguda GROUP BY e.salary, paylaşılan her maaş için tek satıra indirger'
        ],
        concepts: ['CTE', 'HAVING', 'GROUP_CONCAT', 'JOIN', 'Duplicate detection']
      },
      {
        id: 'top10-q5',
        order: 5,
        title: 'Month-over-month revenue growth',
        title_tr: 'Ay üstüne ay ciro büyümesi',
        description: 'Calculate the **month-over-month revenue growth rate** for each month. Show the month (YYYY-MM), that month\'s revenue, the previous month\'s revenue, and the percentage change rounded to 2 decimal places. Return NULL for the first month.',
        description_tr: 'Her ay için **ay üstüne ay ciro büyüme oranını** hesapla. month (YYYY-MM), o ayın ciroyu, önceki ayın ciroyu ve 2 ondalık basamağa yuvarlanmış yüzdelik değişim göster. İlk ay için NULL döndür.',
        timeLimit: 10 * 60,
        difficulty: 'Hard',
        points: 10,
        dataset: 'ecommerce',
        solution: "WITH monthly AS (SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue FROM orders GROUP BY month) SELECT month, revenue, LAG(revenue) OVER (ORDER BY month) AS prev_revenue, ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month)) / LAG(revenue) OVER (ORDER BY month), 2) AS pct_change FROM monthly ORDER BY month",
        hints: [
          'First aggregate revenue by month using a CTE',
          'LAG(revenue) OVER (ORDER BY month) gets the previous row',
          'Percentage change = (current - previous) / previous * 100',
          'LAG returns NULL for the first row — no special handling needed'
        ],
        hints_tr: [
          'Önce bir CTE kullanarak aya göre ciroyu aggregate et',
          'LAG(revenue) OVER (ORDER BY month) önceki satırı verir',
          'Yüzdelik değişim = (mevcut - önceki) / önceki * 100',
          'LAG ilk satır için NULL döndürür — özel bir yönetim gerekmez'
        ],
        concepts: ['LAG', 'CTE', 'Window Functions', 'Date Functions', 'Percentage Change']
      },
      {
        id: 'top10-q6',
        order: 6,
        title: 'Anti-join: ordered but never completed',
        title_tr: 'Anti-join: sipariş verdi ama hiç tamamlamadı',
        description: 'Find all customers who have **placed at least one order** but have **no completed orders** (status = \'completed\'). Return the customer name and their total number of orders. This tests the anti-join pattern — one of the most important SQL patterns for funnel analysis.',
        description_tr: '**En az bir sipariş vermiş** ama **hiç tamamlanmış siparişi olmayan** (status = \'completed\') tüm müşterileri bul. Müşteri adını ve toplam sipariş sayısını döndür. Bu, anti-join kalıbını sınar — funnel analizi için en önemli SQL kalıplarından biridir.',
        timeLimit: 9 * 60,
        difficulty: 'Medium',
        points: 10,
        dataset: 'ecommerce',
        solution: "SELECT c.name, COUNT(o.order_id) AS total_orders FROM customers c JOIN orders o ON c.customer_id = o.customer_id WHERE c.customer_id NOT IN (SELECT DISTINCT customer_id FROM orders WHERE status = 'completed') GROUP BY c.customer_id, c.name ORDER BY total_orders DESC",
        hints: [
          "Status values are lowercase in the data: use 'completed', 'pending', 'cancelled'",
          'The subquery finds every customer_id that has at least one completed order',
          'NOT IN on that subquery keeps only customers who never appear in completed orders',
          "Alternative approach: LEFT JOIN orders completed_orders ON c.customer_id = completed_orders.customer_id AND completed_orders.status = 'completed' WHERE completed_orders.customer_id IS NULL"
        ],
        hints_tr: [
          "Veride status değerleri küçük harftir: 'completed', 'pending', 'cancelled' kullan",
          'Subquery, en az bir tamamlanmış siparişi olan her customer_id\'yi bulur',
          'O subquery üzerine NOT IN, completed siparişlerde hiç görünmeyen müşterileri tutar',
          "Alternatif yaklaşım: LEFT JOIN orders completed_orders ON c.customer_id = completed_orders.customer_id AND completed_orders.status = 'completed' WHERE completed_orders.customer_id IS NULL"
        ],
        concepts: ['Anti-join', 'NOT IN', 'Subquery', 'JOIN', 'Funnel Analysis']
      },
      {
        id: 'top10-q7',
        order: 7,
        title: 'Consecutive days with orders (streak detection)',
        title_tr: 'Ardışık sipariş günleri (seri tespiti)',
        description: 'Find all customers who placed orders on **at least 3 consecutive days**. Return the customer name, the start date of their streak, and the streak length. This is the classic "gaps and islands" pattern.',
        description_tr: '**En az 3 ardışık günde** sipariş veren tüm müşterileri bul. Müşteri adını, serinin başlangıç tarihini ve seri uzunluğunu döndür. Bu klasik "gaps and islands" kalıbıdır.',
        timeLimit: 14 * 60,
        difficulty: 'Hard',
        points: 10,
        dataset: 'ecommerce',
        solution: "WITH daily AS (SELECT customer_id, DATE(order_date) AS day, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY DATE(order_date)) AS rn FROM orders GROUP BY customer_id, DATE(order_date)), grouped AS (SELECT customer_id, day, DATE(day, '-' || rn || ' days') AS grp FROM daily) SELECT c.name, MIN(g.day) AS streak_start, COUNT(*) AS streak_length FROM grouped g JOIN customers c ON g.customer_id = c.customer_id GROUP BY g.customer_id, g.grp HAVING COUNT(*) >= 3 ORDER BY streak_length DESC",
        hints: [
          'GROUP BY customer_id and date first to get one row per day',
          'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day) gives a sequential rank',
          'Subtract the row number from the date — consecutive days produce the same result',
          'GROUP BY that result and count rows >= 3'
        ],
        hints_tr: [
          'Önce gün başına tek satır almak için customer_id ve date\'e göre GROUP BY yap',
          'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day) sıralı bir rank verir',
          'Tarihten satır numarasını çıkar — ardışık günler aynı sonucu üretir',
          'O sonuca göre GROUP BY yap ve >= 3 satır olanları say'
        ],
        concepts: ['Gaps and Islands', 'ROW_NUMBER', 'Date Arithmetic', 'CTE', 'Self-Join Pattern']
      },
      {
        id: 'top10-q8',
        order: 8,
        title: 'Click-through rate (conditional aggregation)',
        title_tr: 'Click-through rate (koşullu aggregation)',
        description: 'From the orders table, calculate the **conversion rate by product category**: the percentage of orders with status = \'Completed\' out of all orders, per category. Show category, total_orders, completed_orders, and conversion_rate rounded to 1 decimal place.',
        description_tr: 'orders tablosundan **kategoriye göre conversion rate** hesapla: kategori başına tüm siparişler içinden status = \'Completed\' olan siparişlerin yüzdesi. category, total_orders, completed_orders ve 1 ondalık basamağa yuvarlanmış conversion_rate göster.',
        timeLimit: 8 * 60,
        difficulty: 'Medium',
        points: 10,
        dataset: 'ecommerce',
        solution: "SELECT category, COUNT(*) AS total_orders, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders, ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 1) AS conversion_rate FROM orders GROUP BY category ORDER BY conversion_rate DESC",
        hints: [
          'SUM(CASE WHEN status = \'Completed\' THEN 1 ELSE 0 END) counts completed rows',
          'Divide by COUNT(*) for the rate — multiply by 100.0 to avoid integer division',
          'ROUND(..., 1) gives one decimal place'
        ],
        hints_tr: [
          'SUM(CASE WHEN status = \'Completed\' THEN 1 ELSE 0 END) tamamlanmış satırları sayar',
          'Oran için COUNT(*)\'a böl — tam sayı bölmesinden kaçınmak için 100.0 ile çarp',
          'ROUND(..., 1) tek ondalık basamak verir'
        ],
        concepts: ['CASE WHEN', 'Conditional Aggregation', 'SUM', 'GROUP BY', 'Conversion Rate']
      },
      {
        id: 'top10-q9',
        order: 9,
        title: 'Median salary (without MEDIAN function)',
        title_tr: 'Medyan maaş (MEDIAN fonksiyonu olmadan)',
        description: 'Calculate the **median salary** across all employees. SQLite has no MEDIAN() function, so derive it manually. Return a single value labelled median_salary. This is a Google favourite and tests whether you understand window frame arithmetic.',
        description_tr: 'Tüm çalışanlar üzerinden **medyan maaşı** hesapla. SQLite\'da MEDIAN() fonksiyonu yok, bu yüzden manuel olarak türet. median_salary etiketli tek bir değer döndür. Bu Google\'ın favori sorularındandır ve window frame aritmetiğini anlayıp anlamadığını sınar.',
        timeLimit: 12 * 60,
        difficulty: 'Hard',
        points: 10,
        dataset: 'employees',
        solution: "WITH ranked AS (SELECT salary, ROW_NUMBER() OVER (ORDER BY salary) AS rn, COUNT(*) OVER () AS total FROM employees) SELECT ROUND(AVG(salary), 2) AS median_salary FROM ranked WHERE rn IN (CAST((total + 1) / 2 AS INT), CAST((total + 2) / 2 AS INT))",
        hints: [
          'ROW_NUMBER() OVER (ORDER BY salary) ranks each salary',
          'COUNT(*) OVER () gives total rows in every row',
          'For odd N: median is at position (N+1)/2',
          'For even N: median is average of positions N/2 and N/2+1',
          'Use IN (..., ...) to handle both odd and even cases'
        ],
        hints_tr: [
          'ROW_NUMBER() OVER (ORDER BY salary) her maaşı sıralar',
          'COUNT(*) OVER () her satırda toplam satır sayısını verir',
          'Tek N için: medyan (N+1)/2 konumundadır',
          'Çift N için: medyan N/2 ve N/2+1 konumlarının ortalamasıdır',
          'Hem tek hem çift durumları yönetmek için IN (..., ...) kullan'
        ],
        concepts: ['ROW_NUMBER', 'COUNT() OVER', 'Median', 'Window Functions', 'AVG']
      },
      {
        id: 'top10-q10',
        order: 10,
        title: 'Customer cohort retention (Day-1)',
        title_tr: 'Müşteri kohort retention (Day-1)',
        description: 'For each customer\'s **first order month** (their cohort), find how many customers placed another order **at least 30 days later**. Show the cohort month, total customers in that cohort, retained customers, and retention rate as a percentage. This is Meta\'s most famous interview question pattern.',
        description_tr: 'Her müşterinin **ilk sipariş ayı** (kohortu) için, **en az 30 gün sonra** başka bir sipariş veren kaç müşteri olduğunu bul. Kohort ayını, o kohorttaki toplam müşteri sayısını, retained müşterileri ve yüzde olarak retention rate\'i göster. Bu, Meta\'nın en ünlü mülakat soru kalıbıdır.',
        timeLimit: 14 * 60,
        difficulty: 'Hard',
        points: 10,
        dataset: 'ecommerce',
        solution: "WITH first_orders AS (SELECT customer_id, MIN(DATE(order_date)) AS first_date, strftime('%Y-%m', MIN(order_date)) AS cohort FROM orders GROUP BY customer_id), retained AS (SELECT f.customer_id, f.cohort FROM first_orders f JOIN orders o ON f.customer_id = o.customer_id WHERE DATE(o.order_date) >= DATE(f.first_date, '+30 days')) SELECT f.cohort, COUNT(DISTINCT f.customer_id) AS cohort_size, COUNT(DISTINCT r.customer_id) AS retained, ROUND(100.0 * COUNT(DISTINCT r.customer_id) / COUNT(DISTINCT f.customer_id), 1) AS retention_rate FROM first_orders f LEFT JOIN retained r ON f.customer_id = r.customer_id GROUP BY f.cohort ORDER BY f.cohort",
        hints: [
          'Step 1: find each customer\'s first order date (their cohort entry)',
          'Step 2: find customers who ordered again 30+ days after their first order',
          'Step 3: LEFT JOIN so customers with no return still appear (as 0)',
          'Use COUNT(DISTINCT) to avoid double-counting'
        ],
        hints_tr: [
          '1. Adım: her müşterinin ilk sipariş tarihini bul (kohort girişi)',
          '2. Adım: ilk siparişlerinden 30+ gün sonra tekrar sipariş veren müşterileri bul',
          '3. Adım: LEFT JOIN kullan ki dönüşü olmayan müşteriler de (0 olarak) görünsün',
          'Çift sayımdan kaçınmak için COUNT(DISTINCT) kullan'
        ],
        concepts: ['CTE', 'Cohort Analysis', 'Retention', 'LEFT JOIN', 'Date Arithmetic', 'COUNT DISTINCT']
      }
    ],
    passingScore: 60
  }
];

// Categories for filtering
window.interviewCategories = [
  { id: 'all', label: 'All Interviews', icon: '📋' },
  { id: 'free', label: 'Free', icon: '🆓' },
  { id: 'top10', label: 'Top 10 Most Asked', icon: '🔥' },
  { id: 'data-analyst', label: 'Data Analyst', icon: '📊' },
  { id: 'backend', label: 'Backend Engineer', icon: '⚙️' },
  { id: 'faang', label: 'FAANG-Style', icon: '🏢' },
  { id: 'senior', label: 'Senior Level', icon: '👨‍💼' }
];

// Get category for an interview
window.getInterviewCategory = (interview) => {
  if (interview.isFree) return 'free';
  if (interview.id === 'top-10-most-asked') return 'top10';
  if (interview.id.includes('analyst') || interview.id.includes('business')) return 'data-analyst';
  if (interview.id.includes('backend')) return 'backend';
  if (interview.id.includes('faang')) return 'faang';
  if (interview.id.includes('senior')) return 'senior';
  return 'all';
};
