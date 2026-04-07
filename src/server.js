import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publicDir, config } from "./config.js";
import { signToken, verifyToken } from "./auth.js";
import {
  createGoal,
  createTransaction,
  createUser,
  findUserById,
  getDashboardSummary,
  listGoals,
  listTransactions,
  listUsers,
  seedDatabase,
  updateGoalSavings,
  validateUserCredentials
} from "./db.js";

const app = express();

app.use(express.json());
app.use(express.static(publicDir));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "WealthWise" });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, monthlyIncome, riskProfile } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    const user = await createUser({
      name: String(name).trim(),
      email: String(email).trim(),
      password: String(password),
      monthlyIncome: Number(monthlyIncome || 0),
      riskProfile: String(riskProfile || "Balanced")
    });

    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to register user." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = await validateUserCredentials(String(email).trim(), String(password));
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const token = signToken(user);
  res.json({ token, user });
});

app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/dashboard/summary", authenticate, (req, res) => {
  res.json(getDashboardSummary(req.user.id));
});

app.get("/api/transactions", authenticate, (req, res) => {
  res.json({ items: listTransactions(req.user.id) });
});

app.post("/api/transactions", authenticate, (req, res) => {
  const { title, amount, type, category, transactionDate, note } = req.body;

  if (!title || !amount || !type || !category || !transactionDate) {
    return res.status(400).json({ message: "All transaction fields except note are required." });
  }

  const transaction = createTransaction(req.user.id, {
    title: String(title).trim(),
    amount: Number(amount),
    type: String(type),
    category: String(category).trim(),
    transactionDate: String(transactionDate),
    note: String(note || "")
  });

  res.status(201).json({ transaction });
});

app.get("/api/goals", authenticate, (req, res) => {
  res.json({ items: listGoals(req.user.id) });
});

app.post("/api/goals", authenticate, (req, res) => {
  const { title, targetAmount, savedAmount, targetDate } = req.body;

  if (!title || !targetAmount || !targetDate) {
    return res.status(400).json({ message: "Title, target amount, and target date are required." });
  }

  const goal = createGoal(req.user.id, {
    title: String(title).trim(),
    targetAmount: Number(targetAmount),
    savedAmount: Number(savedAmount || 0),
    targetDate: String(targetDate)
  });

  res.status(201).json({ goal });
});

app.patch("/api/goals/:goalId", authenticate, (req, res) => {
  const updatedGoal = updateGoalSavings(req.user.id, req.params.goalId, Number(req.body.savedAmount || 0));
  if (!updatedGoal) {
    return res.status(404).json({ message: "Goal not found." });
  }

  res.json({ goal: updatedGoal });
});

app.get("/api/admin/users", authenticate, authorize("admin"), (_req, res) => {
  res.json({ items: listUsers() });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication token missing." });
  }

  try {
    const payload = verifyToken(token);
    const user = findUserById(Number(payload.sub));

    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    req.user = user;
    next();
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired token." });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied for this role." });
    }

    next();
  };
}

await seedDatabase();

if (process.argv.includes("--seed-only")) {
  console.log("Database seeded successfully.");
  process.exit(0);
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const currentModulePath = fileURLToPath(import.meta.url);

if (entryPath === currentModulePath) {
  app.listen(config.port, () => {
    console.log(`WealthWise is running at http://localhost:${config.port}`);
  });
}

export default app;
