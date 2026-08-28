# Sunaina Clinic

A modern, responsive website for Sunaina Clinic, built with React and Tailwind CSS, with a Node.js, Express and MongoDB backend for managing patient feedback and appointment bookings.

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Lucide React

### Backend

- Node.js
- Express
- MongoDB
- Mongoose

## Features

- Responsive clinic website
- Professional women’s healthcare content
- Doctor and clinic information
- Specialities and services
- Appointment booking
- Patient feedback submission
- Client-side and server-side validation
- Prevention of past appointment date selection
- Secure API configuration
- Responsive design for mobile, tablet and desktop

## Project Structure

```text
sunaina-clinic/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   └── assets/
│   └── package.json
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── .env.example
│   └── package.json
│
└── README.md
```

## Run Locally

### Backend

```bash
cd server
npm install
npm run dev
```

The API runs on:

```text
http://localhost:5000
```

### Frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

## Environment Variables

Create a `.env` file inside the `server` directory.

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
```

Keep your `.env` file private and never commit it to GitHub.

Use `server/.env.example` as a template when configuring environment variables for deployment.

## API Endpoints

### Health Check

```text
GET /api/health
```

### Feedback

```text
GET /api/feedback
POST /api/feedback
```

The feedback form validates:

- Name
- Service category
- Feedback story

Validation is performed on both the client and server.

### Appointments

```text
POST /api/appointment
```

The appointment request includes:

- Selected service
- Appointment date
- Preferred time slot
- Patient name
- Phone number
- Email address
- Reason for visit

The application prevents users from selecting past appointment dates.

## Security

The API includes:

- Helmet security headers
- CORS configuration
- API rate limiting
- Request body size limits
- Environment-based configuration
- Server-side validation
- Safe error responses

## Deployment

The application can be deployed using:

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

Before deployment, configure the production environment variables and update the frontend API configuration to point to the deployed backend.

## License

This project was developed for Sunaina Clinic.
