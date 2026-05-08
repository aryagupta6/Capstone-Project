# Village API - Complete Documentation

## 📚 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Reference](#api-reference)
4. [Frontend Features](#frontend-features)
5. [Authentication](#authentication)
6. [Rate Limiting](#rate-limiting)
7. [Error Handling](#error-handling)
8. [Examples](#examples)

## Overview

Village API is a production-grade SaaS platform providing comprehensive REST API access to India's village-level geographical data. Built with Node.js, Express, PostgreSQL, React, and Tailwind CSS.

### Key Features
- 🗺️ Complete India village database (600,000+ villages)
- 🔍 Fast search and autocomplete
- 🔐 Secure API key authentication
- 📊 Usage monitoring and analytics
- 🎨 Modern React dashboard
- 📱 Responsive design
- ⚡ Rate limiting by plan type

## Architecture

### Tech Stack

**Backend:**
- Node.js + Express.js
- PostgreSQL with Prisma ORM
- bcrypt for password hashing
- crypto for API key generation

**Frontend:**
- React 18
- Vite (build tool)
- Tailwind CSS
- Recharts (data visualization)
- React Router (navigation)
- Axios (HTTP client)

**Database Schema:**
```
Country → State → District → SubDistrict → Village
User → ApiKey → ApiLog
```

## API Reference

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "businessName": "My Business"
}

Response:
{
  "success": true,
  "data": {
    "userId": 1,
    "email": "user@example.com",
    "apiKey": "ak_...",
    "apiSecret": "as_..."
  }
}
```

#### Login
```http
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

Response:
{
  "success": true,
  "data": {
    "userId": 1,
    "email": "user@example.com",
    "planType": "FREE"
  }
}
```

### Data Endpoints (Require API Key)

#### Search Villages
```http
GET /api/search?q=manibeli&page=1&limit=10
Headers:
  x-api-key: YOUR_API_KEY
  x-api-secret: YOUR_API_SECRET

Response:
{
  "success": true,
  "count": 1,
  "data": [
    {
      "value": "525002",
      "label": "Manibeli",
      "fullAddress": "Manibeli, Akkalkuwa, Nandurbar, Maharashtra, India",
      "hierarchy": {
        "village": "Manibeli",
        "subDistrict": "Akkalkuwa",
        "district": "Nandurbar",
        "state": "Maharashtra",
        "country": "India"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "requestId": "...",
    "responseTime": "45ms",
    "rateLimit": {
      "remaining": 99,
      "limit": 100
    }
  }
}
```

#### Autocomplete
```http
GET /api/autocomplete?q=man
Headers:
  x-api-key: YOUR_API_KEY
  x-api-secret: YOUR_API_SECRET

Response:
{
  "success": true,
  "data": [
    {
      "value": "525002",
      "label": "Manibeli (Maharashtra)"
    }
  ]
}
```

#### List States
```http
GET /api/states?page=1&limit=10
Headers:
  x-api-key: YOUR_API_KEY
  x-api-secret: YOUR_API_SECRET

Response:
{
  "success": true,
  "data": [
    {
      "stateCode": "27",
      "stateName": "Maharashtra"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "count": 1
  }
}
```

#### List Districts
```http
GET /api/districts?stateCode=27&page=1&limit=10
Headers:
  x-api-key: YOUR_API_KEY
  x-api-secret: YOUR_API_SECRET

Response:
{
  "success": true,
  "data": [
    {
      "districtCode": "497",
      "districtName": "Nandurbar"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "count": 1
  }
}
```

#### List Sub-Districts
```http
GET /api/subdistricts?districtCode=497&page=1&limit=10
Headers:
  x-api-key: YOUR_API_KEY
  x-api-secret: YOUR_API_SECRET

Response:
{
  "success": true,
  "data": [
    {
      "subDistrictCode": "03950",
      "subDistrictName": "Akkalkuwa"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "count": 1
  }
}
```

#### List Villages
```http
GET /api/villages?subDistrictCode=03950&page=1&limit=10
Headers:
  x-api-key: YOUR_API_KEY
  x-api-secret: YOUR_API_SECRET

Response:
{
  "success": true,
  "data": [
    {
      "villageCode": "525002",
      "villageName": "Manibeli"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "count": 1
  }
}
```

### User Management Endpoints

#### Get Usage Statistics
```http
GET /api/usage
Headers:
  x-api-key: YOUR_API_KEY
  x-api-secret: YOUR_API_SECRET

Response:
{
  "success": true,
  "data": {
    "plan": "FREE",
    "used": 45,
    "limit": 100,
    "remaining": 55
  }
}
```

#### List API Keys
```http
GET /api/api-keys
Headers:
  x-api-key: YOUR_API_KEY
  x-api-secret: YOUR_API_SECRET

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "apiKey": "ak_...",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### Revoke API Key
```http
POST /api/revoke-key
Headers:
  x-api-key: YOUR_API_KEY
  x-api-secret: YOUR_API_SECRET
Content-Type: application/json

{
  "apiKey": "ak_..."
}

Response:
{
  "success": true,
  "message": "API key revoked successfully"
}
```

## Frontend Features

### Pages

1. **Login Page** (`/login`)
   - User authentication
   - Redirect to dashboard on success

2. **Register Page** (`/register`)
   - New user registration
   - Automatic API key generation

3. **Dashboard** (`/`)
   - Usage statistics cards
   - Current plan display
   - Quick start guide

4. **Search Page** (`/search`)
   - Village search interface
   - Real-time results
   - Hierarchical display

5. **API Keys Page** (`/api-keys`)
   - View API credentials
   - Copy to clipboard
   - Usage instructions

6. **Usage Page** (`/usage`)
   - Usage charts (Recharts)
   - Pie chart for distribution
   - Line chart for trends

### Components

- **Layout**: Navigation and logout
- **Protected Routes**: Authentication guard
- **Responsive Design**: Mobile-friendly

## Authentication

### API Key Format
```
API Key:    ak_[32 hex characters]
API Secret: as_[32 hex characters]
```

### Security
- Secrets hashed with SHA-256
- Stored securely in database
- Never exposed in responses
- Validated on every request

### Headers Required
```http
x-api-key: YOUR_API_KEY
x-api-secret: YOUR_API_SECRET
```

## Rate Limiting

### Plan Limits

| Plan | Daily Requests | Burst Limit |
|------|----------------|-------------|
| FREE | 100 | 10/min |
| PRO | 10,000 | 100/min |
| ENTERPRISE | Unlimited | 1000/min |

### Rate Limit Response
```json
{
  "error": "Rate limit exceeded"
}
```
Status Code: 429

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error message"
}
```

### Common Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Missing or invalid parameters |
| 401 | Unauthorized | Missing API credentials |
| 403 | Forbidden | Invalid API key/secret |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

## Examples

### JavaScript (Axios)
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'x-api-secret': 'YOUR_API_SECRET'
  }
});

// Search villages
const searchVillages = async (query) => {
  const { data } = await api.get(`/search?q=${query}`);
  return data.data;
};

// Autocomplete
const autocomplete = async (query) => {
  const { data } = await api.get(`/autocomplete?q=${query}`);
  return data.data;
};
```

### Python (requests)
```python
import requests

API_KEY = 'YOUR_API_KEY'
API_SECRET = 'YOUR_API_SECRET'
BASE_URL = 'http://localhost:3000/api'

headers = {
    'x-api-key': API_KEY,
    'x-api-secret': API_SECRET
}

# Search villages
response = requests.get(
    f'{BASE_URL}/search',
    params={'q': 'manibeli'},
    headers=headers
)
data = response.json()
```

### cURL
```bash
# Search
curl -X GET "http://localhost:3000/api/search?q=manibeli" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET"

# Autocomplete
curl -X GET "http://localhost:3000/api/autocomplete?q=man" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET"
```

### React Component
```jsx
import { useState, useEffect } from 'react';
import api from './utils/api';

function VillageSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    const { data } = await api.get(`/search?q=${query}`);
    setResults(data.data);
  };

  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search villages..."
      />
      <button onClick={handleSearch}>Search</button>
      
      {results.map(result => (
        <div key={result.value}>
          <h3>{result.label}</h3>
          <p>{result.fullAddress}</p>
        </div>
      ))}
    </div>
  );
}
```

## Best Practices

1. **Cache Results**: Store frequently accessed data
2. **Debounce Autocomplete**: Wait 300ms before API call
3. **Handle Errors**: Always catch and display errors
4. **Secure Keys**: Never expose in client-side code
5. **Monitor Usage**: Track consumption regularly
6. **Pagination**: Use page/limit for large datasets
7. **Rate Limiting**: Implement client-side throttling

## Support

For issues or questions:
- Check QUICKSTART.md for setup help
- Review error messages carefully
- Test with demo client first
- Verify database connection

---

**Built with ❤️ for developers**
