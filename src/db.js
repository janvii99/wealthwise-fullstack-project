import mongoose from "mongoose";
import { comparePassword, hashPassword } from "./auth.js";
import { config } from "./config.js";

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    monthlyIncome: { type: Number, default: 0 },
    riskProfile: { type: String, default: "Balanced" }
  },
  { timestamps: true }
);

const transactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String, required: true, trim: true },
    transactionDate: { type: String, required: true },
    note: { type: String, default: "" }
  },
  { timestamps: true }
);

const goalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true },
    savedAmount: { type: Number, default: 0 },
    targetDate: { type: String, required: true },
    status: { type: String, enum: ["active", "completed"], default: "active" }
  },
  { timestamps: true }
);

const User = model("User", userSchema);
const Transaction = model("Transaction", transactionSchema);
const Goal = model("Goal", goalSchema);

export async function connectDatabase() {
  await mongoose.connect(config.mongoUri, {
    dbName: config.mongoDbName
  });
}

export async function seedDatabase() {
  await ensureSeedUser({
    name: config.adminName,
    email: config.adminEmail,
    password: config.adminPassword,
    role: "admin",
    monthlyIncome: 125000,
    riskProfile: "Growth"
  });

  await ensureSeedUser({
    name: "Janvi Demo",
    email: "demo@wealthwise.local",
    password: "Demo@123",
    role: "user",
    monthlyIncome: 68000,
    riskProfile: "Balanced"
  });
}

async function ensureSeedUser({ name, email, password, role, monthlyIncome, riskProfile }) {
  let user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    const passwordHash = await hashPassword(password);
    user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      monthlyIncome,
      riskProfile
    });
  }

  const transactionCount = await Transaction.countDocuments({ userId: user._id });
  const goalCount = await Goal.countDocuments({ userId: user._id });

  if (transactionCount === 0 && goalCount === 0) {
    await seedUserData(user._id, role);
  }
}

async function seedUserData(userId, variant) {
  const baseTransactions =
    variant === "admin"
      ? [
          { title: "Salary", amount: 125000, type: "income", category: "Salary", transactionDate: "2026-04-01", note: "Monthly salary credited" },
          { title: "Mutual Fund SIP", amount: 15000, type: "expense", category: "Investments", transactionDate: "2026-04-02", note: "Index fund SIP" },
          { title: "Rent", amount: 26000, type: "expense", category: "Housing", transactionDate: "2026-04-03", note: "Apartment rental" },
          { title: "Groceries", amount: 8200, type: "expense", category: "Food", transactionDate: "2026-04-04", note: "Monthly groceries" },
          { title: "Freelance", amount: 18000, type: "income", category: "Side Hustle", transactionDate: "2026-04-05", note: "UI consulting project" },
          { title: "Travel Fund", amount: 6000, type: "expense", category: "Travel", transactionDate: "2026-04-06", note: "Summer savings" }
        ]
      : [
          { title: "Salary", amount: 68000, type: "income", category: "Salary", transactionDate: "2026-04-01", note: "Monthly salary credited" },
          { title: "Rent", amount: 18000, type: "expense", category: "Housing", transactionDate: "2026-04-02", note: "Apartment rent" },
          { title: "Groceries", amount: 5200, type: "expense", category: "Food", transactionDate: "2026-04-03", note: "Weekly groceries" },
          { title: "Stock Investment", amount: 7000, type: "expense", category: "Investments", transactionDate: "2026-04-04", note: "Blue-chip stocks" },
          { title: "Freelance", amount: 9500, type: "income", category: "Side Hustle", transactionDate: "2026-04-05", note: "Landing page redesign" },
          { title: "Gym", amount: 2200, type: "expense", category: "Health", transactionDate: "2026-04-06", note: "Quarterly membership" }
        ];

  const baseGoals =
    variant === "admin"
      ? [
          { title: "Emergency Fund", targetAmount: 300000, savedAmount: 165000, targetDate: "2026-12-31", status: "active" },
          { title: "Dubai Trip", targetAmount: 120000, savedAmount: 56000, targetDate: "2026-09-15", status: "active" },
          { title: "New MacBook", targetAmount: 180000, savedAmount: 180000, targetDate: "2026-06-30", status: "completed" }
        ]
      : [
          { title: "Emergency Fund", targetAmount: 180000, savedAmount: 72000, targetDate: "2026-12-31", status: "active" },
          { title: "MBA Savings", targetAmount: 250000, savedAmount: 90000, targetDate: "2027-05-31", status: "active" },
          { title: "iPhone Upgrade", targetAmount: 85000, savedAmount: 85000, targetDate: "2026-08-10", status: "completed" }
        ];

  await Transaction.insertMany(baseTransactions.map((item) => ({ ...item, userId })));
  await Goal.insertMany(baseGoals.map((item) => ({ ...item, userId })));
}

export async function createUser({ name, email, password, monthlyIncome = 0, riskProfile = "Balanced", role = "user" }) {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error("A user with this email already exists.");
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    monthlyIncome,
    riskProfile
  });

  return normalizeUser(user);
}

export async function findUserByEmail(email) {
  const user = await User.findOne({ email: email.toLowerCase() }).lean();
  return user ? normalizeUser(user, true) : null;
}

export async function findUserById(id) {
  const user = await User.findById(id).lean();
  return user ? normalizeUser(user) : null;
}

export async function validateUserCredentials(email, password) {
  const user = await findUserByEmail(email);
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

export async function listUsers() {
  const users = await User.find().sort({ createdAt: -1 }).lean();

  return Promise.all(
    users.map(async (user) => {
      const summary = await Transaction.aggregate([
        { $match: { userId: user._id } },
        {
          $group: {
            _id: null,
            transactionCount: { $sum: 1 },
            totalIncome: {
              $sum: {
                $cond: [{ $eq: ["$type", "income"] }, "$amount", 0]
              }
            },
            totalExpense: {
              $sum: {
                $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0]
              }
            }
          }
        }
      ]);

      const totals = summary[0] || { transactionCount: 0, totalIncome: 0, totalExpense: 0 };

      return {
        ...normalizeUser(user),
        transactionCount: totals.transactionCount,
        totalIncome: Number(totals.totalIncome.toFixed(2)),
        totalExpense: Number(totals.totalExpense.toFixed(2))
      };
    })
  );
}

export async function createTransaction(userId, payload) {
  const transaction = await Transaction.create({
    userId,
    title: payload.title,
    amount: payload.amount,
    type: payload.type,
    category: payload.category,
    transactionDate: payload.transactionDate,
    note: payload.note || ""
  });

  return normalizeTransaction(transaction);
}

export async function listTransactions(userId) {
  const items = await Transaction.find({ userId }).sort({ transactionDate: -1, createdAt: -1 }).lean();
  return items.map(normalizeTransaction);
}

export async function createGoal(userId, payload) {
  const goal = await Goal.create({
    userId,
    title: payload.title,
    targetAmount: payload.targetAmount,
    savedAmount: payload.savedAmount || 0,
    targetDate: payload.targetDate,
    status: payload.status || "active"
  });

  return normalizeGoal(goal);
}

export async function listGoals(userId) {
  const goals = await Goal.find({ userId }).sort({ targetDate: 1 }).lean();
  return goals.map(normalizeGoal);
}

export async function updateGoalSavings(userId, goalId, savedAmount) {
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) {
    return null;
  }

  goal.savedAmount = savedAmount;
  goal.status = savedAmount >= goal.targetAmount ? "completed" : "active";
  await goal.save();

  return normalizeGoal(goal);
}

export async function getDashboardSummary(userId) {
  const [totalsResult] = await Transaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, "$amount", 0]
          }
        },
        totalExpense: {
          $sum: {
            $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0]
          }
        }
      }
    }
  ]);

  const spendingByCategory = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: "expense"
      }
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" }
      }
    },
    { $sort: { total: -1 } }
  ]);

  const totals = totalsResult || { totalIncome: 0, totalExpense: 0 };
  const goals = await listGoals(userId);
  const transactions = await listTransactions(userId);
  const savings = Number((totals.totalIncome - totals.totalExpense).toFixed(2));
  const savingsRate = totals.totalIncome > 0 ? Math.round((savings / totals.totalIncome) * 100) : 0;

  return {
    totals: {
      income: Number((totals.totalIncome || 0).toFixed(2)),
      expense: Number((totals.totalExpense || 0).toFixed(2)),
      savings,
      savingsRate
    },
    goals,
    recentTransactions: transactions.slice(0, 5),
    spendingByCategory: spendingByCategory.map((item) => ({
      category: item._id,
      total: Number(item.total.toFixed(2))
    })),
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
        ? `${topCategory._id} is your biggest expense area at INR ${Number(topCategory.total.toFixed(2))}.`
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

function normalizeUser(user, includePasswordHash = false) {
  const normalized = {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    monthlyIncome: user.monthlyIncome,
    riskProfile: user.riskProfile,
    createdAt: user.createdAt
  };

  if (includePasswordHash) {
    normalized.passwordHash = user.passwordHash;
  }

  return normalized;
}

function normalizeTransaction(transaction) {
  return {
    id: String(transaction._id),
    title: transaction.title,
    amount: transaction.amount,
    type: transaction.type,
    category: transaction.category,
    transactionDate: transaction.transactionDate,
    note: transaction.note,
    createdAt: transaction.createdAt
  };
}

function normalizeGoal(goal) {
  return {
    id: String(goal._id),
    title: goal.title,
    targetAmount: goal.targetAmount,
    savedAmount: goal.savedAmount,
    targetDate: goal.targetDate,
    status: goal.status,
    createdAt: goal.createdAt,
    progress: Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
  };
}
