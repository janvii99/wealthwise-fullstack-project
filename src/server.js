import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publicDir, config } from "./config.js";
import { signToken, verifyToken } from "./auth.js";
import {
  connectDatabase,
  createGoal,
  createTransaction,
  createUser,
  findUserByEmail,
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
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

app.use(express.json());
app.use(express.static(publicDir));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "WealthWise" });
});

app.post("/api/auth/register", asyncHandler(async (req, res) => {
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
}));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || "").trim();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const existingUser = await findUserByEmail(normalizedEmail);
  if (!existingUser) {
    return res.status(404).json({
      code: "EMAIL_NOT_REGISTERED",
      message: "No account found with this email address."
    });
  }

  const user = await validateUserCredentials(normalizedEmail, String(password));
  if (!user) {
    return res.status(401).json({
      code: "INVALID_PASSWORD",
      message: "Incorrect password. Please try again."
    });
  }

  const token = signToken(user);
  res.json({ token, user });
}));

app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/dashboard/summary", authenticate, asyncHandler(async (req, res) => {
  res.json(await getDashboardSummary(req.user.id));
}));

app.get("/api/transactions", authenticate, asyncHandler(async (req, res) => {
  res.json({ items: await listTransactions(req.user.id) });
}));

app.post("/api/transactions", authenticate, asyncHandler(async (req, res) => {
  const { title, amount, type, category, transactionDate, note } = req.body;

  if (!title || !amount || !type || !category || !transactionDate) {
    return res.status(400).json({ message: "All transaction fields except note are required." });
  }

  const transaction = await createTransaction(req.user.id, {
    title: String(title).trim(),
    amount: Number(amount),
    type: String(type),
    category: String(category).trim(),
    transactionDate: String(transactionDate),
    note: String(note || "")
  });

  res.status(201).json({ transaction });
}));

app.get("/api/goals", authenticate, asyncHandler(async (req, res) => {
  res.json({ items: await listGoals(req.user.id) });
}));

app.post("/api/goals", authenticate, asyncHandler(async (req, res) => {
  const { title, targetAmount, savedAmount, targetDate } = req.body;

  if (!title || !targetAmount || !targetDate) {
    return res.status(400).json({ message: "Title, target amount, and target date are required." });
  }

  const goal = await createGoal(req.user.id, {
    title: String(title).trim(),
    targetAmount: Number(targetAmount),
    savedAmount: Number(savedAmount || 0),
    targetDate: String(targetDate)
  });

  res.status(201).json({ goal });
}));

app.patch("/api/goals/:goalId", authenticate, asyncHandler(async (req, res) => {
  const updatedGoal = await updateGoalSavings(req.user.id, req.params.goalId, Number(req.body.savedAmount || 0));
  if (!updatedGoal) {
    return res.status(404).json({ message: "Goal not found." });
  }

  res.json({ goal: updatedGoal });
}));

app.get("/api/admin/users", authenticate, authorize("admin"), asyncHandler(async (_req, res) => {
  res.json({ items: await listUsers() });
}));

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication token missing." });
  }

  try {
    const payload = verifyToken(token);
    const user = await findUserById(payload.sub);

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

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Server error. Check your MongoDB connection and try again." });
});

await connectDatabase();
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
