
# University Attendance System

The **University Attendance System** is a comprehensive solution for managing university attendance, integrating a robust backend with a modern frontend. The system enables administrators, instructors, and students to manage classes, sections attendance records. It features QR code-based attendance verification, detailed statistics, and a user-friendly dashboard.

- **Backend**: Manages data, authentication, and QR code generation using Node.js, Express, TypeScript, and MongoDB.
- **Frontend**: Provides a dynamic interface for attendance tracking and leave requests using React, Next.js, TypeScript, Shadcn/ui, and Tailwind CSS.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technologies](#technologies)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)

## Overview

This project combines a scalable backend and a modern frontend to streamline university attendance management:
- **Backend**: Handles user authentication, class/section management, QR code attendance, and data export.
- **Frontend**: Offers a user-friendly interface for visualizing attendance, submitting leave requests, and managing user roles.

## Features

### Backend Features
- **User Authentication**: Secure registration, login, and password management using JWT.
- **Class Management**: Create, update, delete classes, and manage student enrollment (admin/instructor roles).
- **Section Management**: Create, update, delete sections within classes, and assign students.
- **QR Code Attendance**: Generate QR codes for sections, verify attendance with geolocation, and prevent duplicates.
- **Manual Attendance**: Record or update attendance manually.
- **Attendance Statistics**: View detailed statistics per class (present, absent, late counts).
- **Excel Export**: Export attendance data to Excel.
- **Role-Based Access**: Supports admin, instructor, and student roles.
- **Logging**: Comprehensive logging for debugging.
- **Security**: Includes helmet, CORS, rate limiting, and input validation.

### Frontend Features
- Employee absence management
- Leave request submission and approval workflow
- Attendance tracking and reporting
- User-friendly dashboard interface
- Role-based access control
- Real-time status updates


## Technologies

### Backend
- **Node.js**, **Express**, **TypeScript**
- **Database**: MongoDB with Mongoose
- **Authentication**: JSON Web Tokens (JWT)
- **Validation**: Zod
- **QR Code Generation**: `qrcode` library
- **Geolocation**: `geolib`
- **Excel Export**: `exceljs`
- **Logging**: Custom logger utility
- **Security**: Helmet, CORS, express-rate-limit
- **Other Libraries**: `uuid`, `dotenv`

### Frontend
- **TypeScript** (98.6%)
- **CSS** (1.3%)
- **JavaScript** (0.1%)
- **React**
- **Next.js** Framework
- **UI**: Shadcn/ui, Tailwind CSS

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: v14 or higher
- **npm** or **yarn** package manager
- **Git**
- **MongoDB**: Local or cloud instance (e.g., MongoDB Atlas)
- **Postman**: For API testing (optional)

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/ahmedharby13/FCI-Tanta-University-Attendance-System.git
cd FCI-Tanta-University-Attendance-System
```

### 2. Install Dependencies
- **Backend**:
  ```bash
  cd backend
  npm install
  ```
- **Frontend**:
  ```bash
  cd frontend
  pnpm install
  ```

### 3. Set Up MongoDB
- Ensure MongoDB is running locally or provide a MongoDB Atlas connection string.
- Update the `MONGODB_URI` in the backend `.env` file (see [Environment Variables](#environment-variables)).

## Environment Variables

### Backend (`.env` in `backend` directory)
Create a `.env` file in the `backend` directory with the following variables:
```env
NODE_ENV=<development or production>
PORT=<port number, e.g., 4000>
HOST=<host address, e.g., 0.0.0.0>
MONGO_URI=<your MongoDB connection string>
JWT_SECRET=<your secret key>
JWT_EXPIRE=<expiration time, e.g., 1w>
QR_CODE_INTERVAL_SECONDS=<interval in seconds, e.g., 60>
LOCATION_RADIUS=<radius in meters, e.g., 50>
DEFAULT_LONGITUDE=<default longitude, e.g., 30.82578942286358>
DEFAULT_LATITUDE=<default latitude, e.g., 30.996658114152897>
DEFAULT_LOCATION_NAME=<location name, e.g., University>
USE_HTTPS=<true or false>
CORS_ORIGIN=<allowed origins, e.g., http://localhost:4000>
```

> **Note**: Replace `<value>` placeholders with your actual values. Keep sensitive data (e.g., `MONGO_URI`, `JWT_SECRET`) out of version control by adding `.env` to `.gitignore`.

### Frontend (`.env.local` in `frontend` directory)
Create a `.env.local` file in the `frontend` directory with the following variable:
```env
NEXT_PUBLIC_NETWORK_HOST=<backend URL, e.g., http://localhost:4000>
```

> **Note for Ziyad**: If there are additional environment variables for the frontend (e.g., API keys, third-party service URLs), please add them here with a brief description.

## Running the Application

### 1. Start the Backend
- Navigate to the backend directory:
  ```bash
  cd backend
  ```
- Build TypeScript:
  ```bash
  npm run build
  ```
- Start the server:
  ```bash
  npm start
  ```
  - Or for development mode with hot reload:
    ```bash
    npm run dev
    ```
- The backend will run on `http://localhost:4000` (or the port specified in `PORT`).

### 2. Start the Frontend
- In a separate terminal, navigate to the frontend directory:
  ```bash
  cd frontend
  ```
- Start the development server:
  ```bash
  npm start
  #or
  pnpm run dev
  ```
- The frontend will run on `http://localhost:4000` (or the port specified by Next.js).

### 3. Access the Application
- Open your browser and go to `http://localhost:4000` to use the frontend.
- API routes are accessible at `http://localhost:4000/api`.

## Project Structure

```
FCI-Tanta-University-Attendance-System/
├── backend/                   # Backend application
│   ├── src/
│   │   ├── config/            # Database and configuration files
│   │   │   └── db.ts
│   │   ├── controllers/       # Business logic
│   │   │   ├── auth.ts
│   │   │   ├── class.ts
│   │   │   ├── section.ts
│   │   │   ├── attendance.ts
│   │   │   ├── qrCode.ts
│   │   │   ├── studentSection.ts
│   │   │   └── export.ts
│   │   ├── middlewares/       # Middleware
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── validate.ts
│   │   ├── models/            # Mongoose schemas
│   │   │   ├── user.ts
│   │   │   ├── class.ts
│   │   │   ├── section.ts
│   │   │   ├── attendance.ts
│   │   │   └── code.ts
│   │   ├── routes/            # API route definitions
│   │   │   ├── auth.ts
│   │   │   ├── class.ts
│   │   │   ├── attendance.ts
│   │   │   └── export.ts
│   │   ├── types/             # TypeScript types
│   │   │   └── AuthRequest.ts
│   │   ├── utils/             # Utility functions
│   │   │   ├── asyncHandler.ts
│   │   │   ├── appError.ts
│   │   │   ├── logger.ts
│   │   │   └── cleanup.ts
│   │   ├── validation/        # Request validation schemas
│   │   │   ├── attendance.ts
│   │   │   ├── auth.ts
│   │   │   ├── class.ts
│   │   │   └── export.ts
│   │   └── server.ts          # Express app setup
│   ├── .env                   # environment variables
│   ├── package.json           # Backend dependencies
│   └── tsconfig.json          # TypeScript configuration
├── frontend/                  # Frontend application
│   ├── app/                   # Next.js app directory (pages, layouts)
│   ├── components/            # Reusable UI components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   ├── public/                # Static assets
│   ├── styles/                # CSS and Tailwind styles
│   ├── .env.local             # Frontend environment variables
│   ├── .gitignore             # Git ignore file
│   ├── next.config.js         # Next.js configuration
│   ├── package.json           # Frontend dependencies
│   ├── tsconfig.json          # TypeScript configuration
│   └── README.md              # Frontend-specific documentation
├── .gitignore                 # Root-level Git ignore file
├── package-lock.json          # Dependency lock file
├── README.md                  # Unified project documentation (this file)
└── pnpm-lock.yaml             # pnpm lock file (if using pnpm)
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register`: Register a new user.
- `POST /login`: Authenticate and receive a JWT token.
- `PATCH /update-password`: Update user password.
- `GET /me`: Get authenticated user details.
- `GET /students`: Get all students (admin/instructor only).
- `GET /instructors`: Get all instructors (admin/instructor only).

### Class Management (`/api/class`)
- `POST /create`: Create a new class.
- `POST /add-students`: Add students to a class.
- `DELETE /remove-students`: Remove students from a class.
- `PATCH /update`: Update class details.
- `DELETE /delete`: Delete a class (admin only).
- `GET /my-classes`: Get classes based on user role.

### Section Management (`/api/attendance`)
- `POST /section/create`: Create a new section.
- `PATCH /section/update`: Update section details.
- `DELETE /section/delete`: Delete a section.
- `POST /section/add-students`: Add students to a section.
- `DELETE /section/remove-students`: Remove students from a section.

### QR Code and Attendance (`/api/attendance`)
- `POST /generate`: Generate a QR code for a section.
- `POST /close`: Close QR code generation and record absences.
- `POST /verify/:code`: Verify student attendance via QR code.
- `PATCH /manual`: Record manual attendance.
- `GET /`: Get attendance records (admin/instructor).
- `GET /student`: Get student’s attendance.
- `GET /statistics`: Get attendance statistics.

### Export (`/api/export`)
- `GET /`: Export attendance data to Excel.

## Testing

### Backend Testing
1. Use **Postman** to test API endpoints:
   - Register users (`POST /api/auth/register`) with roles: admin, instructor, student.
   - Log in (`POST /api/auth/login`) to obtain JWT tokens.
   - Test class/section management, QR code attendance, and data export.

### Frontend Testing
1. Start the frontend and backend as described above.
2. Interact with the dashboard to test attendance tracking and leave requests.
3. Use browser developer tools to debug frontend issues.


## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/YourFeature`).
3. Commit changes (`git commit -m 'Add YourFeature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a Pull Request with a clear description.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Contact

- **Ahmed Harby** (Full-Stack Developer): [@ahmedharby13](https://github.com/ahmedharby13)
- **Zeyad Hany** (Frontend Developer): [@zeyad_Hany](https://github.com/zeyadhanydev)
- **Mohammed Mansour** (Backend Developer): [@MohamedManosur](https://github.com/MohamedManosur)
- Project Link: [https://github.com/ahmedharby13/FCI-Tanta-University-Attendance-System](https://github.com/ahmedharby13/FCI-Tanta-University-Attendance-System)

## Acknowledgments

- All contributors who have helped this project grow.
- The open-source community for tools like Node.js, React, Next.js, and MongoDB.

---

⭐ Don't forget to star this repository if you find it helpful!
