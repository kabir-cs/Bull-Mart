<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/1/13/Official_USF_Bulls_Athletic_Logo.png" alt="USF Logo" width="180"/>
</p>

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

**Bull-Mart** is a modern, location-based marketplace platform. Discover, list, and manage products with seamless Google Maps integration and a responsive, intuitive UI.

---

## 🚀 Tech Stack

- **Backend:** Node.js, Express, JWT, Mongoose
- **Frontend:** React, Bootstrap, Google Maps API, Axios
- **Database:** MongoDB

---

## 🔗 API Flow

1. **Frontend** sends requests to **Backend** via RESTful endpoints.
2. **Backend** authenticates users, processes product/location data, and interacts with **MongoDB**.
3. **Frontend** visualizes product locations using **Google Maps API**.

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

### Why the frontend directory has an arrow and is not visible in the GitHub app

The arrow icon on GitHub and the inability to see the `frontend` directory in your local file explorer or the GitHub Desktop app is because **`frontend` is a Git submodule**. Here’s what that means and how to resolve it:

---

#### What is a Git submodule?
- A submodule is a reference to another Git repository inside your main repository.
- On GitHub, submodules appear as a folder with an arrow and a commit hash, not as a regular directory.
- Locally, if you haven’t initialized the submodule, the folder will be empty or missing.

---

#### How to make the frontend directory appear locally

1. **Initialize and update submodules:**
   Open your terminal in the project root and run:
   ```sh
   git submodule update --init --recursive
   ```
   This will download the actual contents of the `frontend` submodule.

2. **After running the command:**
   - The `frontend` directory will be populated with its files.
   - You’ll be able to see and open it in your file explorer, code editor, and the GitHub Desktop app.

---

#### Why does GitHub show an arrow?
- The arrow indicates that the folder is a submodule, not a regular directory.
- You can click the folder on GitHub to see which repository and commit it points to, but you won’t see the files directly in the main repo’s file tree.

---

#### Summary Table

| Where?                | What you see         | Why?                                 | How to fix locally?                |
|-----------------------|---------------------|--------------------------------------|------------------------------------|
| GitHub web            | Arrow + commit hash | It’s a submodule                     | N/A (can’t see files directly)     |
| Local (before update 