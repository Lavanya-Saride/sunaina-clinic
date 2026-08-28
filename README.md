# Sunaina Clinic

React + Tailwind frontend with Node.js, Express and MongoDB.

## Run

Backend:

```bash
cd server
npm install
npm run dev
```

Frontend:

```bash
cd client
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and the API runs on port `5000`.

## MongoDB

The local `server/.env` has been configured with the MongoDB connection details provided for this project. Keep this file private. Use `server/.env.example` as the template for deployment.

## API

- `GET /api/health`
- `GET /api/feedback`
- `POST /api/feedback`

The feedback form validates `name`, `service` and `story` on both client and server. The API includes CORS control, Helmet, request size limits, rate limiting, sanitization, safe error responses and environment-based configuration.
