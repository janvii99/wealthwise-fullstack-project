# WealthWise

WealthWise is a secure full-stack personal finance application built for academic submission requirements around frontend design, backend development, database connectivity, and authentication/security implementation.

## Submission Checklist Coverage

- Frontend design and development with a polished responsive interface
- Minimum 5 strong screens available for screenshots:
  - Landing page
  - Dashboard
  - Transactions
  - Goals
  - Admin console
- Backend development using Express.js
- Database connectivity using SQLite
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
- Database: SQLite via `node:sqlite`
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

## Suggested Screenshots For Submission

Take screenshots after logging in with the demo account:

1. Landing page
2. Dashboard overview
3. Transaction management view
4. Goal tracking view
5. Admin panel using the admin account

For stronger marks, keep the browser in full-screen desktop view and make sure the sidebar, cards, and charts are visible in each shot.

## GitHub Submission Steps

```bash
git add .
git commit -m "Build WealthWise full-stack finance app"
```

Then create a GitHub repository, add it as remote, and push:

```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

Suggested repository name:

```text
wealthwise-fullstack-project
```

Suggested README headline for GitHub:

```text
WealthWise - Secure Full-Stack Personal Finance Management System
```

## Deployment Recommendation

Render is the easiest option for this structure because the frontend and backend are served from the same Node app.

- Build command: `npm install`
- Start command: `npm start`
- Add the environment variables from `.env.example`
- A ready-to-use `render.yaml` file is included
- Health check path: `/api/health`

After deployment, use the generated public URL as your deployed application link.

## Exact Render Steps

1. Push this project to GitHub.
2. Log into Render.
3. Click `New +` and choose `Blueprint` or `Web Service`.
4. Connect your GitHub repository.
5. If using `render.yaml`, Render will auto-detect the service settings.
6. If using manual setup:
   - Build command: `npm install`
   - Start command: `npm start`
7. Add environment variables:
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `ADMIN_NAME`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
8. Deploy and wait for the public URL.
9. Open the deployed URL and test login once before submission.

## ZIP Submission Checklist

Before submitting, make sure you include:

- Source code ZIP from this project folder
- GitHub repository link
- Deployed Render link
- Minimum 5 screenshots
- README in the repository

Do not include:

- `node_modules`
- `.env`
- personal system files

## Viva / Explanation Points

If your faculty asks you to explain the project, these are the strongest points:

- Frontend is responsive and divided into dashboard, transactions, goals, insights, and admin views
- Backend is built with Express and exposes protected REST APIs
- SQLite is used for persistent storage of users, transactions, and goals
- Authentication uses JWT tokens
- Passwords are hashed before storing with bcrypt
- Role-based access control prevents normal users from opening admin data
- Environment variables are used for secrets and admin credentials
- The application is deployable as a full-stack Node service

## Notes

- The first run seeds admin and demo data automatically.
- SQLite storage is created inside the `data/` directory.
- The UI is intentionally designed to look stronger than a basic academic CRUD project and give you better screenshot evidence.
