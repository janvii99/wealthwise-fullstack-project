# WealthWise

WealthWise is a secure full-stack personal finance application built for academic submission requirements around frontend design, backend development, database connectivity, and authentication/security implementation.

## Coverage

- Frontend design and development with a polished responsive interface
- Minimum 5 strong screens available for screenshots:
  - Landing page
  - Dashboard
  - Transactions
  - Goals
  - Admin console
- Backend development using Express.js
- Database connectivity using MongoDB
- JWT-based authentication
- Password hashing using `bcryptjs`
- Role-based access control for admin-only APIs and UI
- Environment variable usage through `.env`
- Fully functional full-stack application
- Git-ready source code with documentation

## Demo Accounts

- Admin
  - Email: `admin@wealthwise.local`
  - Password: `Admin@123`
- User
  - Email: `demo@wealthwise.local`
  - Password: `Demo@123`

You can also register a new account from the UI.

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Security: JWT, bcrypt

## Features

- User registration and login
- Secure password hashing
- JWT-protected routes
- Personal dashboard with:
  - income
  - expense
  - savings
  - savings rate
  - recent transactions
  - spending insights
- Transaction management
- Savings goal tracking
- Admin dashboard for viewing all users
- Responsive modern UI suitable for presentation screenshots
- Seeded demo data for fast evaluation

## Project Structure

```text
wealthwise/
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── src/
│   ├── auth.js
│   ├── config.js
│   ├── db.js
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Start the app:

```bash
npm start
```

4. Open:

```text
http://localhost:4000
```

## Environment Variables

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=wealthwise
JWT_SECRET=change-this-in-production
JWT_EXPIRES_IN=7d
ADMIN_NAME=WealthWise Admin
ADMIN_EMAIL=admin@wealthwise.local
ADMIN_PASSWORD=Admin@123
```

## API Overview

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Finance Data

- `GET /api/dashboard/summary`
- `GET /api/transactions`
- `POST /api/transactions`
- `GET /api/goals`
- `POST /api/goals`
- `PATCH /api/goals/:goalId`

### Admin

- `GET /api/admin/users`

## Security Implementation

- Passwords are hashed with bcrypt before storage
- JWT tokens are required for protected routes
- Role-based middleware restricts admin routes
- Secrets and config are loaded from environment variables
- MongoDB collections store users, transactions, and goal
  



## Notes

- The first run seeds admin and demo data automatically.
- You must have MongoDB running locally or provide a MongoDB Atlas URI in `.env`.
- The UI is intentionally designed to look stronger than a basic academic CRUD project and give you better screenshot evidence.
