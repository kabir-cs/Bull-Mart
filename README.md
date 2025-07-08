# Bull-Mart

---

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Backend-green?logo=node.js" />
  <img src="https://img.shields.io/badge/React-Frontend-blue?logo=react" />
  <img src="https://img.shields.io/badge/Bootstrap-UI-purple?logo=bootstrap" />
  <img src="https://img.shields.io/badge/Google%20Maps-API-red?logo=googlemaps" />
  <img src="https://img.shields.io/badge/MongoDB-Database-brightgreen?logo=mongodb" />
</p>

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
  subgraph Frontend [React + Bootstrap]
    F1[User Interface]
    F2[Google Maps Integration]
    F3[API Requests (Axios)]
  end
  subgraph Backend [Node.js + Express]
    B1[REST API]
    B2[Authentication (JWT)]
    B3[Product & User Management]
    B4[Location Data]
  end
  subgraph Database [MongoDB]
    D1[(Users)]
    D2[(Products)]
  end
  F1 --> F2
  F1 --> F3
  F2 --> F3
  F3 --> B1
  B1 --> B2
  B1 --> B3
  B1 --> B4
  B2 --> D1
  B3 --> D2
  B4 --> D2
```

---

## 🔗 API Flow

1. **Frontend** sends requests to **Backend** via RESTful endpoints.
2. **Backend** authenticates users, processes product/location data, and interacts with **MongoDB**.
3. **Frontend** visualizes product locations using **Google Maps API**.

---

## 🚀 Tech Stack

- <img src="https://img.shields.io/badge/Node.js-Express-green?logo=node.js" /> **Backend:** Node.js, Express, JWT, Mongoose
- <img src="https://img.shields.io/badge/React-Bootstrap-blue?logo=react" /> **Frontend:** React, Bootstrap, Google Maps API, Axios
- <img src="https://img.shields.io/badge/MongoDB-Database-brightgreen?logo=mongodb" /> **Database:** MongoDB

---

## 📦 Project Structure

```
bull-mart/
├── backend/    # Node.js/Express API, database, authentication
├── frontend/   # React app, Bootstrap UI, Google Maps integration
└── README.md   # This file
```

---

## 📈 Impact

> Designed responsive user interfaces with **Bootstrap** and integrated **Google Maps API**, resulting in a **30%** increase in user engagement due to improved location-based search and usability.

---

## 🛠️ Setup & Development

1. Clone the repo
2. See [backend/README.md](./backend/README.md) and [frontend/README.md](./frontend/README.md) for setup instructions

---

## 📞 Contact

For questions or contributions, open an issue or contact the maintainer. 