# Village API - Full Stack Application

A production-grade SaaS platform providing REST API for India's village-level geographical data.

## Tech Stack

### Backend
- Node.js + Express.js
- PostgreSQL (NeonDB) with Prisma ORM
- Authentication: API Key + Secret
- Rate Limiting & Logging

### Frontend
- React 18
- Vite
- Tailwind CSS
- Recharts for data visualization
- React Router for navigation
- Axios for API calls

## Project Structure

```
capstone-project/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── logger.js
│   │   │   └── rateLimit.js
│   │   └── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Search.jsx
│   │   │   ├── ApiKeys.jsx
│   │   │   └── Usage.jsx
│   │   ├── utils/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── dataset/
    └── normalized_data/
```

## 🔑 Demo Credentials & Documentation

To evaluate the system, you can use the pre-seeded admin account or register a new business user:

### 👤 Administrative Panel Access
- **URL**: `http://localhost:5173/admin`
- **Email**: `admin@villageapi.com`
- **Password**: `admin12345`

### 🏢 B2B Client Registration
- **URL**: `http://localhost:5173/register`
- *Note: Registration requires a business email domain (e.g., `@yourcompany.com`). Public domains like Gmail/Yahoo are blocked.*

### 📚 Interactive API Documentation (Swagger UI)
- **URL**: `http://localhost:3000/docs`

---

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
DATABASE_URL="postgresql://user:password@host:5432/database"
PORT=3000
```

4. Run Prisma migrations:
```bash
npx prisma migrate dev
```

5. Import data (if needed):
```bash
node src/import_data.js
```

6. Start the server:
```bash
node src/server.js
```

Backend will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login

### Data Endpoints (Require API Key)
- `GET /api/states` - List all states
- `GET /api/districts?stateCode=XX` - Get districts by state
- `GET /api/subdistricts?districtCode=XX` - Get sub-districts
- `GET /api/villages?subDistrictCode=XX` - Get villages
- `GET /api/search?q=query` - Search villages
- `GET /api/autocomplete?q=query` - Autocomplete suggestions

### User Management
- `GET /api/usage` - Get API usage stats
- `GET /api/api-keys` - List user's API keys
- `POST /api/revoke-key` - Revoke an API key

## Features

### Frontend Features
- ✅ User Registration & Login
- ✅ Dashboard with usage statistics
- ✅ Village search with autocomplete
- ✅ API key management
- ✅ Usage monitoring with charts
- ✅ Responsive design with Tailwind CSS

### Backend Features
- ✅ RESTful API with Express
- ✅ API Key + Secret authentication
- ✅ Rate limiting per plan type
- ✅ Request logging
- ✅ Hierarchical data structure
- ✅ Pagination support
- ✅ Search functionality

## Usage

1. **Register**: Create an account at `/register`
2. **Login**: Sign in at `/login`
3. **Get API Keys**: View your credentials in the API Keys page
4. **Test Search**: Use the Search page to test village lookup
5. **Monitor Usage**: Check your API consumption in the Usage page

## API Authentication

Include these headers in all API requests:

```bash
curl -X GET "http://localhost:3000/api/search?q=village" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET"
```

## Rate Limits

| Plan | Daily Requests |
|------|----------------|
| FREE | 100 |
| PRO | 10,000 |
| ENTERPRISE | Unlimited |

## Development

### Backend Development
```bash
cd backend
npm install
node src/server.js
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Build for Production
```bash
cd frontend
npm run build
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
PORT=3000
```

### Frontend
No environment variables needed for local development. API proxy is configured in `vite.config.js`.

## License

MIT
