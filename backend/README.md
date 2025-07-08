# Backend - Bull-Mart

---

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Express-green?logo=node.js" />
  <img src="https://img.shields.io/badge/MongoDB-Database-brightgreen?logo=mongodb" />
  <img src="https://img.shields.io/badge/JWT-Auth-yellow?logo=jsonwebtokens" />
</p>

---

## 🏗️ Backend Architecture

```mermaid
flowchart TD
  FE[Frontend (React)] -- REST API --> BE[Backend (Express)]
  BE -- MongoDB Driver --> DB[(MongoDB)]
  BE -- JWT Auth --> User[User]
  BE -- CRUD --> Product[Product]
```

---

## 🔌 API Endpoints

```mermaid
flowchart LR
  A[POST /api/auth/register] --> B[Create User]
  C[POST /api/auth/login] --> D[Issue JWT]
  E[GET /api/products] --> F[Product List]
  G[POST /api/products] --> H[Create Product]
  I[PUT /api/products/:id] --> J[Update Product]
  K[DELETE /api/products/:id] --> L[Delete Product]
```

---

## 🔒 Authentication Flow

1. User registers or logs in via `/api/auth` endpoints.
2. On login, backend issues a **JWT** (JSON Web Token).
3. Protected routes require `Authorization: Bearer <token>` header.
4. Middleware validates JWT and enforces role-based access (user/admin).

---

## 🗄️ Data Models

- **User:** name, email, password (hashed), role, location, createdAt
- **Product:** name, description, price, location, createdBy, createdAt

---

## ⚡ Quickstart

```sh
cd backend
cp .env.example .env # Add your MongoDB URI and JWT secret
npm install
npm run dev
```

---

## 🧩 Integration

- Exposes REST APIs for the frontend React app
- Handles authentication, product CRUD, and location data
- Connects to MongoDB for persistent storage

---

## 📞 Contact

For backend issues, open an issue or contact the maintainer. 