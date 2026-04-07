const state = {
  token: localStorage.getItem("wealthwise_token"),
  user: JSON.parse(localStorage.getItem("wealthwise_user") || "null"),
  authMode: "login",
  summary: null,
  transactions: [],
  goals: [],
  users: []
};

const elements = {
  sidebar: document.querySelector("#sidebar"),
  toolbar: document.querySelector("#toolbar"),
  guestView: document.querySelector("#guestView"),
  toolbarTitle: document.querySelector("#toolbarTitle"),
  authStatus: document.querySelector("#authStatus"),
  authModal: document.querySelector("#authModal"),
  authForm: document.querySelector("#authForm"),
  authTitle: document.querySelector("#authTitle"),
  authSubmitButton: document.querySelector("#authSubmitButton"),
  authHelper: document.querySelector("#authHelper"),
  closeModal: document.querySelector("#closeModal"),
  nameField: document.querySelector("#nameField"),
  incomeField: document.querySelector("#incomeField"),
  riskField: document.querySelector("#riskField"),
  profileName: document.querySelector("#profileName"),
  profileEmail: document.querySelector("#profileEmail"),
  userInitial: document.querySelector("#userInitial"),
  rolePill: document.querySelector("#rolePill"),
  adminNav: document.querySelector("#adminNav"),
  logoutButton: document.querySelector("#logoutButton"),
  toast: document.querySelector("#toast"),
  summaryGrid: document.querySelector("#summaryGrid"),
  spendingChart: document.querySelector("#spendingChart"),
  recentTransactions: document.querySelector("#recentTransactions"),
  transactionList: document.querySelector("#transactionList"),
  goalList: document.querySelector("#goalList"),
  insightCards: document.querySelector("#insightCards"),
  adminUsers: document.querySelector("#adminUsers"),
  transactionForm: document.querySelector("#transactionForm"),
  goalForm: document.querySelector("#goalForm")
};

const views = {
  dashboard: document.querySelector("#dashboardView"),
  transactions: document.querySelector("#transactionsView"),
  goals: document.querySelector("#goalsView"),
  insights: document.querySelector("#insightsView"),
  admin: document.querySelector("#adminView")
};

document.querySelectorAll("[data-open-auth]").forEach((button) => {
  button.addEventListener("click", () => openAuthModal(button.dataset.openAuth));
});

document.querySelector("#demoLogin").addEventListener("click", async () => {
  await login({
    email: "demo@wealthwise.local",
    password: "Demo@123"
  });
});

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    if (view === "admin" && state.user?.role !== "admin") {
      return;
    }
    activateView(view);
  });
});

elements.closeModal.addEventListener("click", () => elements.authModal.close());
elements.logoutButton.addEventListener("click", logout);

elements.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.authForm);
  const payload = Object.fromEntries(formData.entries());

  if (state.authMode === "register") {
    await register(payload);
  } else {
    await login(payload);
  }
});

elements.transactionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.transactionForm);
  const payload = Object.fromEntries(formData.entries());
  await api("/api/transactions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  elements.transactionForm.reset();
  showToast("Transaction saved successfully.");
  await loadAppData();
  activateView("transactions");
});

elements.goalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.goalForm);
  const payload = Object.fromEntries(formData.entries());
  await api("/api/goals", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  elements.goalForm.reset();
  showToast("Goal created successfully.");
  await loadAppData();
  activateView("goals");
});

async function bootstrap() {
  if (state.token) {
    try {
      const response = await api("/api/auth/me");
      state.user = response.user;
      localStorage.setItem("wealthwise_user", JSON.stringify(state.user));
      await loadAppData();
      setAuthenticatedLayout(true);
      activateView("dashboard");
      return;
    } catch (_error) {
      logout();
    }
  }

  setAuthenticatedLayout(false);
}

function openAuthModal(mode) {
  state.authMode = mode;
  const isRegister = mode === "register";
  elements.authTitle.textContent = isRegister ? "Create Account" : "Login";
  elements.authSubmitButton.textContent = isRegister ? "Create Account" : "Login";
  elements.authHelper.textContent = isRegister
    ? "Create your account to access dashboard analytics, secure APIs, and goal tracking."
    : "Demo user: demo@wealthwise.local / Demo@123";
  elements.nameField.classList.toggle("hidden", !isRegister);
  elements.incomeField.classList.toggle("hidden", !isRegister);
  elements.riskField.classList.toggle("hidden", !isRegister);
  elements.authModal.showModal();
}

async function register(payload) {
  const response = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  handleAuthSuccess(response, "Account created successfully.");
}

async function login(payload) {
  const response = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  handleAuthSuccess(response, "Welcome back to WealthWise.");
}

function handleAuthSuccess(response, message) {
  state.token = response.token;
  state.user = response.user;
  localStorage.setItem("wealthwise_token", response.token);
  localStorage.setItem("wealthwise_user", JSON.stringify(response.user));
  elements.authModal.close();
  showToast(message);
  loadAppData().then(() => {
    setAuthenticatedLayout(true);
    activateView("dashboard");
  });
}

function logout() {
  state.token = null;
  state.user = null;
  state.summary = null;
  state.transactions = [];
  state.goals = [];
  state.users = [];
  localStorage.removeItem("wealthwise_token");
  localStorage.removeItem("wealthwise_user");
  setAuthenticatedLayout(false);
  activateView("dashboard");
  showToast("You have been logged out.");
}

function setAuthenticatedLayout(isAuthenticated) {
  elements.sidebar.classList.toggle("hidden", !isAuthenticated);
  elements.toolbar.classList.toggle("hidden", !isAuthenticated);
  elements.guestView.classList.toggle("hidden", isAuthenticated);
  elements.logoutButton.classList.toggle("hidden", !isAuthenticated);
  elements.adminNav.classList.toggle("hidden", !isAuthenticated || state.user?.role !== "admin");
  elements.authStatus.textContent = isAuthenticated
    ? `Signed in as ${state.user?.role || "user"}`
    : "Protected APIs Enabled";

  if (isAuthenticated && state.user) {
    elements.profileName.textContent = state.user.name;
    elements.profileEmail.textContent = state.user.email;
    elements.userInitial.textContent = state.user.name.charAt(0).toUpperCase();
    elements.rolePill.textContent = `${state.user.role.toUpperCase()} ACCESS`;
  } else {
    elements.profileName.textContent = "Welcome";
    elements.profileEmail.textContent = "Sign in to continue";
    elements.userInitial.textContent = "W";
    elements.rolePill.textContent = "Guest Mode";
  }
}

async function loadAppData() {
  const [summaryResponse, transactionResponse, goalResponse] = await Promise.all([
    api("/api/dashboard/summary"),
    api("/api/transactions"),
    api("/api/goals")
  ]);

  state.summary = summaryResponse;
  state.transactions = transactionResponse.items;
  state.goals = goalResponse.items;

  if (state.user?.role === "admin") {
    const adminResponse = await api("/api/admin/users");
    state.users = adminResponse.items;
  }

  renderSummary();
  renderTransactions();
  renderGoals();
  renderInsights();
  renderAdminUsers();
}

function activateView(viewName) {
  Object.entries(views).forEach(([key, node]) => {
    const shouldShow = state.user ? key === viewName : false;
    node.classList.toggle("hidden", !shouldShow);
  });

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  const titleMap = {
    dashboard: "Dashboard Overview",
    transactions: "Transaction Management",
    goals: "Savings Goals",
    insights: "Financial Insights",
    admin: "Admin Console"
  };

  elements.toolbarTitle.textContent = titleMap[viewName] || "WealthWise";
}

function renderSummary() {
  if (!state.summary) {
    return;
  }

  const cards = [
    { label: "Total Income", value: formatCurrency(state.summary.totals.income), variant: "positive" },
    { label: "Total Expenses", value: formatCurrency(state.summary.totals.expense), variant: "warning" },
    { label: "Net Savings", value: formatCurrency(state.summary.totals.savings), variant: "positive" },
    { label: "Savings Rate", value: `${state.summary.totals.savingsRate}%`, variant: "danger" }
  ];

  elements.summaryGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="summary-card ${card.variant}">
          <span>${card.label}</span>
          <strong>${card.value}</strong>
          <p>${summaryHint(card.label)}</p>
        </article>
      `
    )
    .join("");

  const maxCategoryTotal = Math.max(...state.summary.spendingByCategory.map((item) => item.total), 1);
  elements.spendingChart.innerHTML = state.summary.spendingByCategory
    .map(
      (item) => `
        <div class="chart-row">
          <strong>${item.category}</strong>
          <div class="chart-bar">
            <span class="chart-bar-fill" style="--width: ${(item.total / maxCategoryTotal) * 100}%"></span>
          </div>
          <span>${formatCurrency(item.total)}</span>
        </div>
      `
    )
    .join("");

  elements.recentTransactions.innerHTML = state.summary.recentTransactions
    .map(
      (item) => `
        <article class="activity-item">
          <div>
            <strong>${item.title}</strong>
            <p>${item.category} · ${formatDate(item.transactionDate)}</p>
          </div>
          <div>
            <span class="badge ${item.type}">${item.type}</span>
            <strong>${formatCurrency(item.amount)}</strong>
          </div>
        </article>
      `
    )
    .join("");
}

function renderTransactions() {
  elements.transactionList.innerHTML = state.transactions
    .map(
      (item) => `
        <article class="table-line">
          <div>
            <strong>${item.title}</strong>
            <p>${item.category} · ${formatDate(item.transactionDate)}</p>
          </div>
          <div>
            <span class="badge ${item.type}">${item.type}</span>
            <strong>${formatCurrency(item.amount)}</strong>
          </div>
        </article>
      `
    )
    .join("");
}

function renderGoals() {
  elements.goalList.innerHTML = state.goals
    .map(
      (goal) => `
        <article class="goal-card">
          <div class="goal-top">
            <div>
              <h4>${goal.title}</h4>
              <p>Target date: ${formatDate(goal.targetDate)}</p>
            </div>
            <span class="badge ${goal.status}">${goal.status}</span>
          </div>
          <p>${formatCurrency(goal.savedAmount)} saved of ${formatCurrency(goal.targetAmount)}</p>
          <div class="goal-progress">
            <span style="--goal-progress: ${goal.progress}%"></span>
          </div>
          <button class="goal-action" data-goal-id="${goal.id}">
            Add 5,000 progress
          </button>
        </article>
      `
    )
    .join("");

  elements.goalList.querySelectorAll("[data-goal-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const goal = state.goals.find((item) => item.id === Number(button.dataset.goalId));
      const nextAmount = Number(goal.savedAmount) + 5000;
      await api(`/api/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ savedAmount: nextAmount })
      });
      showToast("Goal progress updated.");
      await loadAppData();
      activateView("goals");
    });
  });
}

function renderInsights() {
  elements.insightCards.innerHTML = (state.summary?.insights || [])
    .map(
      (item) => `
        <article class="insight-card glass-panel">
          <p class="eyebrow">Insight</p>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </article>
      `
    )
    .join("");
}

function renderAdminUsers() {
  if (state.user?.role !== "admin") {
    elements.adminUsers.innerHTML = "";
    return;
  }

  elements.adminUsers.innerHTML = state.users
    .map(
      (user) => `
        <article class="user-card">
          <div class="admin-meta">
            <div>
              <h4>${user.name}</h4>
              <p>${user.email}</p>
            </div>
            <span class="badge ${user.role}">${user.role}</span>
          </div>
          <p>Monthly income: ${formatCurrency(user.monthlyIncome)}</p>
          <p>Risk profile: ${user.riskProfile}</p>
          <p>Transactions: ${user.transactionCount}</p>
          <p>Income vs Expense: ${formatCurrency(user.totalIncome)} / ${formatCurrency(user.totalExpense)}</p>
        </article>
      `
    )
    .join("");
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Something went wrong." }));
    showToast(error.message || "Request failed.");
    throw new Error(error.message || "Request failed.");
  }

  return response.json();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function summaryHint(label) {
  const hints = {
    "Total Income": "All recorded income sources from the database.",
    "Total Expenses": "Living costs, investing outflow, and tracked spending.",
    "Net Savings": "Income minus expenses across all transactions.",
    "Savings Rate": "Percentage of income retained after spending."
  };
  return hints[label];
}

let toastTimeout;
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, 2600);
}

bootstrap();
