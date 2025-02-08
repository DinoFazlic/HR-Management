# HR Management

This is an HR Management Application built with Node.js, Express.js, and PostgreSQL. The application allows users to register, log in, apply for jobs, and manage job postings. It also includes features for administrators to manage job postings and candidates.

## Features

- User Registration and Authentication
- Job Postings Management
- Apply for Jobs
- Admin Dashboard for Managing Job Postings and Candidates
- Email Notifications for Interview Invitations

## Technologies Used

- Node.js
- Express.js
- PostgreSQL
- EJS (Embedded JavaScript) for Templating
- Multer for File Uploads
- Nodemailer for Sending Emails
- bcrypt for Password Hashing
- JSON Web Tokens (JWT) for Authentication

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/DinoFazlic/HR-Management.git
    cd hr-management
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Set up environment variables:
    Create a [.env] file in the root directory and add the following variables:
    ```env
    DB_HOST=your_db_host
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_NAME=your_db_name
    DB_PORT=your_db_port
    JWT_SECRET=your_jwt_secret
    ```

4. Run the application:
    ```sh
    npm start
    ```


