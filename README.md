# URL Shortener v2.0

A professional URL shortening service with user authentication, custom short URLs, and analytics.

## Features

- 🔐 Secure user authentication with email verification
- 🔗 Custom short URL generation
- ⏱️ Configurable URL expiration
- 📊 Click tracking and analytics
- 👤 User dashboard with URL management
- 🎨 Modern, responsive UI with dark mode
- 🔒 Secure secret code registration system

## Tech Stack

- Node.js & Express.js
- MongoDB with Mongoose
- EJS templating
- TailwindCSS for styling
- JWT for authentication
- Nodemailer for email verification

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- SMTP server for email verification

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/urlshortener-v2.git
cd urlshortener-v2
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
# Database Configuration
MONGODB_URI=your_mongodb_uri

# JWT Configuration
JWT_SECRET=your_jwt_secret

# Server Configuration
PORT=3000
NODE_ENV=development

# Secret Code for Registration
SECRET_CODE=your_secret_code

# Email Configuration
EMAIL_HOST=your_smtp_host
EMAIL_PORT=your_smtp_port
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
```

4. Start the development server:
```bash
npm run dev
```

## Production Deployment

1. Set up environment variables on your hosting platform
2. Build the application:
```bash
npm run build
```
3. Start the production server:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/logout` - User logout
- `POST /auth/send-otp` - Send OTP for email verification
- `POST /auth/verify-otp` - Verify OTP

### URL Management
- `POST /shorten` - Create short URL
- `GET /:shortUrl` - Redirect to original URL
- `DELETE /urls/:urlId` - Delete URL
- `DELETE /urls/delete-all` - Delete all user URLs

## Security Features

- Email verification with OTP
- JWT-based authentication
- Secure password hashing
- Rate limiting
- XSS protection
- CSRF protection
- Secure cookie handling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Version History

- v2.0.0
  - Added user authentication
  - Added email verification
  - Added custom short URLs
  - Added URL expiration
  - Added analytics
  - Improved UI/UX
  - Added admin dashboard

## Acknowledgments

- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [JWT](https://jwt.io/) 