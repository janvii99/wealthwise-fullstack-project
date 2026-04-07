import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { comparePassword, hashPassword } from "./auth.js";
import { config, dataDir } from "./config.js";

const dbPath = `${dataDir}/wealthwise.db`;

fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'user')) DEFAULT 'user',
    monthly_income REAL NOT NULL DEFAULT 0,
    risk_profile TEXT NOT NULL DEFAULT 'Balanced',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    category TEXT NOT NULL,
    transaction_date TEXT NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    target_amount REAL NOT NULL,
    saved_amount REAL NOT NULL DEFAULT 0,
    target_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

const findUserByEmailStmt = db.prepare(
  "SELECT id, name, email, role, monthly_income AS monthlyIncome, risk_profile AS riskProfile, password_hash AS passwordHash, created_at AS createdAt FROM users WHERE email = ?"
);
const findUserByIdStmt = db.prepare(
  "SELECT id, name, email, role, monthly_income AS monthlyIncome, risk_profile AS riskProfile, created_at AS createdAt FROM users WHERE id = ?"
);
const createUserStmt = db.prepare(`
  INSERT INTO users (name, email, password_hash, role, monthly_income, risk_profile)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const listUsersStmt = db.prepare(`
  SELECT
    u.id,
    u.name,
    u.email,
    u.role,
    u.monthly_income AS monthlyIncome,
    u.risk_profile AS riskProfile,
    u.created_at AS createdAt,
    COUNT(t.id) AS transactionCount,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS totalIncome,
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS totalExpense
  FROM users u
  LEFT JOIN transactions t ON t.user_id = u.id
  GROUP BY u.id
  ORDER BY u.created_at DESC
`);
const createTransactionStmt = db.prepare(`
  INSERT INTO transactions (user_id, title, amount, type, category, transaction_date, note)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const listTransactionsStmt = db.prepare(`
  SELECT
    id,
    title,
    amount,
    type,
    category,
    transaction_date AS transactionDate,
    note,
    created_at AS createdAt
  FROM transactions
  WHERE user_id = ?
  ORDER BY transaction_date DESC, created_at DESC
`);
const createGoalStmt = db.prepare(`
  INSERT INTO goals (user_id, title, target_amount, saved_amount, target_date, status)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const listGoalsStmt = db.prepare(`
  SELECT
    id,
    title,
    target_amount AS targetAmount,
    saved_amount AS savedAmount,
    target_date AS targetDate,
    status,
    created_at AS createdAt
  FROM goals
  WHERE user_id = ?
  ORDER BY target_date ASC
`);
const updateGoalSavingsStmt = db.prepare(`
  UPDATE goals
  SET saved_amount = ?, status = ?
  WHERE id = ? AND user_id = ?
`);
const dashboardTotalsStmt = db.prepare(`
  SELECT
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS totalIncome,
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS totalExpense
  FROM transactions
  WHERE user_id = ?
`);
const spendingByCategoryStmt = db.prepare(`
  SELECT category, ROUND(SUM(amount), 2) AS total
  FROM transactions
  WHERE user_id = ? AND type = 'expense'
  GROUP BY category
  ORDER BY total DESC
`);

export async function seedDatabase() {
  const admin = findUserByEmailStmt.get(config.adminEmail);

  if (!admin) {
    const passwordHash = await hashPassword(config.adminPassword);
    const result = createUserStmt.run(
      config.adminName,
      config.adminEmail,
      passwordHash,
      "admin",
      125000,
      "Growth"
    );

    const adminId = Number(result.lastInsertRowid);
    seedUserData(adminId, "admin");
  }

  const demoEmail = "demo@wealthwise.local";
  const demo = findUserByEmailStmt.get(demoEmail);

  if (!demo) {
    const passwordHash = await hashPassword("Demo@123");
    const result = createUserStmt.run(
      "Janvi Demo",
      demoEmail,
      passwordHash,
      "user",
      68000,
      "Balanced"
    );

    const userId = Number(result.lastInsertRowid);
    seedUserData(userId, "user");
  }
}

function seedUserData(userId, variant) {
  const baseTransactions =
    variant === "admin"
      ? [
          ["Salary", 125000, "income", "Salary", "2026-04-01", "Monthly salary credited"],
          ["Mutual Fund SIP", 15000, "expense", "Investments", "2026-04-02", "Index fund SIP"],
          ["Rent", 26000, "expense", "Housing", "2026-04-03", "Apartment rental"],
          ["Groceries", 8200, "expense", "Food", "2026-04-04", "Monthly groceries"],
          ["Freelance", 18000, "income", "Side Hustle", "2026-04-05", "UI consulting project"],
          ["Travel Fund", 6000, "expense", "Travel", "2026-04-06", "Summer savings"]
        ]
      : [
          ["Salary", 68000, "income", "Salary", "2026-04-01", "Monthly salary credited"],
          ["Rent", 18000, "expense", "Housing", "2026-04-02", "Apartment rent"],
          ["Groceries", 5200, "expense", "Food", "2026-04-03", "Weekly groceries"],
          ["Stock Investment", 7000, "expense", "Investments", "2026-04-04", "Blue-chip stocks"],
          ["Freelance", 9500, "income", "Side Hustle", "2026-04-05", "Landing page redesign"],
          ["Gym", 2200, "expense", "Health", "2026-04-06", "Quarterly membership"]
        ];

  const baseGoals =
    variant === "admin"
      ? [
          ["Emergency Fund", 300000, 165000, "2026-12-31", "active"],
          ["Dubai Trip", 120000, 56000, "2026-09-15", "active"],
          ["New MacBook", 180000, 180000, "2026-06-30", "completed"]
        ]
      : [
          ["Emergency Fund", 180000, 72000, "2026-12-31", "active"],
          ["MBA Savings", 250000, 90000, "2027-05-31", "active"],
          ["iPhone Upgrade", 85000, 85000, "2026-08-10", "completed"]
        ];

  for (const transaction of baseTransactions) {
    createTransactionStmt.run(userId, ...transaction);
  }

  for (const goal of baseGoals) {
    createGoalStmt.run(userId, ...goal);
  }
}

export async function createUser({ name, email, password, monthlyIncome = 0, riskProfile = "Balanced", role = "user" }) {
  const existingUser = findUserByEmailStmt.get(email.toLowerCase());
  if (existingUser) {
    throw new Error("A user with this email already exists.");
  }

  const passwordHash = await hashPassword(password);
  const result = createUserStmt.run(
    name,
    email.toLowerCase(),
    passwordHash,
    role,
    monthlyIncome,
    riskProfile
  );

  return findUserById(Number(result.lastInsertRowid));
}

export function findUserByEmail(email) {
  return findUserByEmailStmt.get(email.toLowerCase()) || null;
}

export function findUserById(id) {
  return findUserByIdStmt.get(id) || null;
}

export async function validateUserCredentials(email, password) {
  const user = findUserByEmail(email);
  if (!user) {
    return null;
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export function listUsers() {
  return listUsersStmt.all();
}

export function createTransaction(userId, payload) {
  const result = createTransactionStmt.run(
    userId,
    payload.title,
    payload.amount,
    payload.type,
    payload.category,
    payload.transactionDate,
    payload.note || ""
  );

  return listTransactions(userId).find((transaction) => transaction.id === Number(result.lastInsertRowid));
}

export function listTransactions(userId) {
  return listTransactionsStmt.all(userId);
}

export function createGoal(userId, payload) {
  const result = createGoalStmt.run(
    userId,
    payload.title,
    payload.targetAmount,
    payload.savedAmount || 0,
    payload.targetDate,
    payload.status || "active"
  );

  return listGoals(userId).find((goal) => goal.id === Number(result.lastInsertRowid));
}

export function listGoals(userId) {
  return listGoalsStmt.all(userId).map((goal) => ({
    ...goal,
    progress: Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
  }));
}

export function updateGoalSavings(userId, goalId, savedAmount) {
  const goal = listGoals(userId).find((item) => item.id === Number(goalId));
  if (!goal) {
    return null;
  }

  const nextStatus = savedAmount >= goal.targetAmount ? "completed" : "active";
  updateGoalSavingsStmt.run(savedAmount, nextStatus, goal.id, userId);
  return listGoals(userId).find((item) => item.id === goal.id);
}

export function getDashboardSummary(userId) {
  const totals = dashboardTotalsStmt.get(userId);
  const goals = listGoals(userId);
  const transactions = listTransactions(userId);
  const spendingByCategory = spendingByCategoryStmt.all(userId);
  const savings = Number((totals.totalIncome - totals.totalExpense).toFixed(2));
  const savingsRate = totals.totalIncome > 0 ? Math.round((savings / totals.totalIncome) * 100) : 0;

  return {
    totals: {
      income: Number(totals.totalIncome.toFixed(2)),
      expense: Number(totals.totalExpense.toFixed(2)),
      savings,
      savingsRate
    },
    goals,
    recentTransactions: transactions.slice(0, 5),
    spendingByCategory,
    insights: buildInsights({ totals, goals, spendingByCategory, savingsRate })
  };
}

function buildInsights({ totals, goals, spendingByCategory, savingsRate }) {
  const topCategory = spendingByCategory[0];
  const activeGoals = goals.filter((goal) => goal.status === "active").length;
  const completedGoals = goals.filter((goal) => goal.status === "completed").length;

  return [
    {
      title: "Savings Efficiency",
      description:
        savingsRate >= 30
          ? `Excellent discipline. You are saving ${savingsRate}% of your income this cycle.`
          : `Your savings rate is ${savingsRate}%. Aim for 20-30% for stronger stability.`
    },
    {
      title: "Top Spending Category",
      description: topCategory
        ? `${topCategory.category} is your biggest expense area at INR ${topCategory.total}.`
        : "Add transactions to unlock category-level insights."
    },
    {
      title: "Goal Momentum",
      description: `${completedGoals} completed goals and ${activeGoals} active targets are being tracked.`
    },
    {
      title: "Cash Flow Health",
      description:
        totals.totalIncome > totals.totalExpense
          ? "Cash flow is positive, which supports investment and emergency planning."
          : "Expenses are exceeding income. Reduce discretionary spending immediately."
    }
  ];
}
