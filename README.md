# <p align="center">🔗 LinkSnap v2.0</p>

<p align="center">
  <img src="public/images/banner.png" alt="LinkSnap Banner" width="100%">
</p>

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-v18%2B-green" alt="Node.js Version"></a>
  <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express-v4.18-blue" alt="Express Version"></a>
  <a href="https://www.mongodb.com/"><img src="https://img.shields.io/badge/MongoDB-v8.0-success" alt="MongoDB Version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow" alt="License"></a>
</p>

---

## 🌟 Overview

**LinkSnap** is a high-performance, professional-grade URL shortening service designed for modern digital ecosystems. Version 2.0 brings a complete architectural overhaul, introducing secure multi-user authentication, deep behavioral analytics, and a state-of-the-art administrative interface.

Whether you're a content creator tracking campaign performance or an enterprise managing thousands of links, LinkSnap provides the tools you need with a premium, glassmorphism-inspired UI.

---

## 🚀 What's New in Version 2.0?

LinkSnap v2.0 is a massive leap forward from the original release. Here's how it compares:

| Feature | Version 1.0 | Version 2.0 (Latest) |
| :--- | :---: | :---: |
| **Authentication** | ❌ None / Guest Only | ✅ JWT & Google OAuth Integration |
| **User Dashboard** | ❌ Static List | ✅ Interactive Management Suite |
| **Analytics** | ❌ Basic Count | ✅ OS, Browser, Device & IP Tracking |
| **Link Security** | ❌ None | ✅ Password-Protected Short Links |
| **QR Generation** | ❌ None | ✅ Instant QR Codes for every link |
| **Organization** | ❌ Flat List | ✅ Category-based Link Management |
| **UI/UX** | ⚠️ Basic | ✨ Premium Dark Theme (Glassmorphism) |
| **Admin Controls**| ❌ None | ✅ Super Admin Promotion & Management |

---

## ✨ Key Features

- **🔐 Robust Authentication**: Secure sign-up/login flow with email OTP verification and Google OAuth support.
- **📊 Granular Analytics**: Real-time tracking of clicks including device type, browser, operating system, and referrer data.
- **⚡ Custom Short URLs**: Create memorable alias for your long links (e.g., `linksnap.io/my-custom-slug`).
- **🛡️ Link Protection**: Secure sensitive URLs with high-entropy passwords.
- **📱 QR Code Suite**: Automatically generate high-quality QR codes for offline sharing.
- **📅 URL Expiration**: Set time-to-live (TTL) for temporary links to ensure data hygiene.
- **🏢 Super Admin Panel**: Dedicated interface for global system monitoring and user management.

---

## 🛠️ Tech Stack

### Backend
- **Node.js & Express.js**: High-concurrency server architecture.
- **MongoDB & Mongoose**: Flexible, schema-based data modeling.
- **JWT (JsonWebToken)**: Stateless, secure session management.
- **Bcrypt.js**: Industry-standard password hashing.

### Frontend
- **EJS Templating**: Dynamic server-side rendering.
- **TailwindCSS**: Utilitarian, responsive design framework.
- **FontAwesome**: Rich iconography system.

### Services & Utils
- **Nodemailer**: Transactional email & OTP delivery.
- **UAParser.js**: Deep device and browser detection.
- **Google Auth Library**: Seamless OAuth2 integration.

---

## 📦 Getting Started

### Prerequisites
- Node.js (v18.0 or higher)
- MongoDB (Local instance or Atlas)
- An SMTP server (e.g., Gmail, SendGrid) for email features.

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/linksnap-v2.git
   cd linksnap-v2
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory:
   ```env
   # Server
   PORT=3000
   NODE_ENV=development

   # Database
   MONGODB_URI=your_mongodb_connection_string

   # Security
   JWT_SECRET=your_complex_jwt_secret
   SECRET_CODE=your_registration_secret_code

   # Email (SMTP)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_specific_password

   # OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

---

## 🔒 Security & Performance

- **Rate Limiting**: Integrated protection against brute-force and DDoS attempts.
- **DNS Optimization**: Hardcoded reliable DNS servers to prevent `ECONNREFUSED` on lookups.
- **XSS & CSRF**: Helmet.js and Cookie-Parser integration for hardened headers.
- **Input Validation**: Strict schema validation using Validator.js.

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">
  Developed with ❤️ by the LinkSnap Team
</p>