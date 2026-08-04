# Contribution Guide - SIGMUI
Thank you for taking the time to contribute to **SIGMUI**! This document contains the architectural guidelines, coding standards, and instructions needed to collaborate on the development of the parking management system in an organized manner.

### 1. Prerequisites and Local Installation Make sure you have the following tools installed on your computer before you begin:

* **Node.js** (Version 22 or higher)
* **MySQL** (local or containerized database server)
* **Git**
* **Git Bash** (version 2.5)
* **npm** (version 11)

### Steps to set up the environment:
1. Clone the official repository or your fork locally:
```bash git clone [https://github.com/tu-usuario/SIGMUI_ADSO3231252_GROUP004.git]
cd SIGMUI_ADSO3231252_GROUP004

2. Install the project’s basic dependencies

npm install
npm i

(sequelize, cors, express, nodemailer, dontev, mysql2, pug)

Development dependencies
(nodemon, tailwind.css)

**All in their latest versions, if possible**


### Start the server:
npm run dev

3. Create the environment variables:

cp .env.example .env
# Database information

DB_NAME=
DB_USER=
DB_PASS=
DB_HOST=
DB_PORT=

# Email configuration
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=

# Outbound port
PORT=

# JWT token
JWT_SECRET=

cp .gitignore
/node_modules
.env

* **Project structure**

SIGMUI_ADSO3231252_GROUP004/
├── node_modules/
├── src/
│   ├── config/             # Database configuration, nodemailer, etc.
│   ├── controllers/        # Controller logic (requests / responses)
│   ├── models/             # Sequelize data models
│   ├── public/             # Publicly accessible static files
│   │   ├── css/            # Compiled style.css (ignored in Git)
│   │   └── js/
│   ├── routes/             # Express route definitions
│   ├── styles/             # Source CSS (input.css with @import “tailwindcss”)
│   └── views/              # Views in Pug
│       ├── auth/           # Login, Sign Up, Password Recovery
│       ├── layouts/        # Base HTML template (Header, Nav, Footer)
│       └── templates/      # Reusable components (alerts, modals)
├── .env.example
├── .gitignore
├── CONTRIBUTING.md
├── index.js                # Entry point for the Express application
└── package.json

4. Coding Standards and Conventions
To maintain consistency throughout the project, the entire team must follow these style guidelines:

4.1. File and Folder Names
Use kebab-case (lowercase words separated by hyphens) for files and directories.

Example: auth-controller.js, user-routes.js, sign-in.pug.

4.2. JavaScript (Node.js & Express)
Variables and Functions: Use camelCase.

Example: const getVehicle = async () => {}, let licensePlate;

Sequelize Classes and Models: Use PascalCase.

Example: const User = db.define(‘user’, ...)

Global Constants and Environment Variables: Use UPPER_SNAKE_CASE.

Example: process.env.DB_PORT

Asynchronous Handling: Prioritize the use of async/await along with try/catch blocks for clean error handling.

4.3. Database (MySQL / Sequelize)
Tables and Columns: Use lowercase snake_case.

Example: Table `registro_parqueadero`, column `hora_ingreso`.

Queries: Always use ORM (Sequelize) methods or prepared statements to prevent SQL injection vulnerabilities.


5. Styles and Views (Tailwind CSS v4 & Pug)
CSS Configuration: The src/styles/input.css file must begin with the v4 directive:

CSS
@import “tailwindcss”;

###

6. Development Scripts
Start the Express server in development mode:

-Bash-
npm run dev
Compile Tailwind CSS v4 in watch mode:

-Bash-
npm run build:css
(Be sure to define the following in package.json: “build:css”: “npx @tailwindcss/cli -i ./src/styles/input.css -o ./src/public/css/style.css --watch”) 
This command can also be run in the Bash terminal.

## 7. Git Workflow (Git Flow & Commits)

To keep the Git history clean and organized, we follow the **Conventional Commits** standard and work using feature branches.

### 7.1. Branch Naming Conventions
Always create a separate branch from the main branch (`main`) based on the task you’re going to perform:

* `feat/feature-name` → For new features (e.g., `feat/login-auth`, `feat/vehicle-registration`).
* `fix/bug-name` → For bug fixes (e.g., `fix/db-connection-error`).
* `docs/doc-name` → Documentation changes (e.g., `docs/update-readme`).
* `style/change-name` → Visual adjustments to the UI or Tailwind that do not affect logic.

### 7.2. Commit Messages
Use the following structure for your commits:

```bash
# Examples:
git commit -m “feat(auth): add JWT token validation to middleware”
git commit -m “fix(vehicles): fix time format in check-out log”
git commit -m “docs(contributing): add coding and Git guidelines”

8. Process for Submitting Changes (Pull Requests)

* Synchronize your branch: Before pushing your changes, make sure to fetch the latest updates from the main branch:

Bash
git checkout main
git pull origin main
git checkout your-branch
git merge main

* Test locally: Verify that the application starts without errors (npm run dev) and that the compiled styles load correctly.

Create the Pull Request (PR):

Push your branch to the remote repository (git push origin feat/your-branch).

Open a PR against the main branch.

Include a brief description of the changes you made and screenshots if you modified the user interface.

Request a review from at least one teammate before merging.
