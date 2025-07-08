# Backend - Bull-Mart

---

## 🛠️ Tech Stack

- **Node.js** + **Express**: RESTful API
- **MongoDB**: Database
- **JWT**: Authentication
- **Mongoose**: ODM for MongoDB

---

## 📚 Structure

```
backend/
├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── utils/
├── .env.example
├── package.json
└── README.md
```

---

## 🔗 Connections

- Serves API endpoints to the frontend
- Handles authentication, product, and user management
- Stores and retrieves location data for products

---

## 🚦 API Overview

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/products` - List products (with location filter)
- `POST /api/products` - Add product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

---

## 🔒 Authentication

- JWT-based
- Role-based access (user/admin)

---

## ⚡ Quickstart

1. `cd backend`
2. `cp .env.example .env` and fill in your MongoDB URI and JWT secret
3. `npm install`
4. `npm run dev`

---

## 🌐 API Docs

See [API documentation](#) for detailed endpoints and usage.

---

## 🧩 How it Connects

- The backend exposes REST APIs consumed by the frontend React app.
- Location data is used for Google Maps-based search in the frontend.

---

## 📞 Contact

For backend issues, open an issue or contact the maintainer. 