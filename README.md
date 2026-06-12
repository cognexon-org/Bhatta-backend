# Cognexon Brick Kiln Management Backend

Backend API for the Brick Kiln Management System, covering the Manager Mobile App and Admin Web Panel.

---

## Included Modules

- JWT authentication and role-based access
- Admin, manager, and worker data models
- Worker categories and salary calculation
- Daily attendance with category-wise reports
- Kacchi/Pakki brick production tracking
- Stock categories, stock balances, manager stock update requests, admin approval/rejection, and audit logs
- Village/beat-wise customer management
- Orders, delivery status, and customer ledger
- Udhari/credit with due dates, partial payments, and full settlement
- Lead and follow-up reminders
- Voice remarks upload and playback URL
- Firebase/SMS notification hooks
- Activity logs
- Dashboard summaries
- Hindi/English constants support
- Cron jobs for due payments and follow-ups

---

## Tech Stack

| Component | Technology |
|---|---|
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Authentication | JWT |
| File Uploads | Multer / local storage by default |
| Notifications | Firebase / SMS hooks |
| Scheduled Jobs | Node Cron |
| Deployment | VPS / PM2 / Nginx |

---

## Quick Start

```bash
cp .env.example .env
npm install
npm run seed:admin
npm run dev
```

The API will run by default at:

```txt
http://localhost:5000/api/v1
```

---

## Environment Variables

Create a `.env` file using `.env.example`.

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/cognexon_brick_kiln
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=7d

ADMIN_NAME=Admin
ADMIN_MOBILE=9999999999
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@12345

APP_BASE_URL=http://localhost:5000
UPLOAD_DIR=uploads

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

SMS_API_KEY=
SMS_SENDER_ID=
```

---

## Seed Admin

After updating `.env`, run:

```bash
npm run seed:admin
```

Default admin credentials from `.env.example`:

```txt
Mobile: 9999999999
Email: admin@example.com
Password: Admin@12345
```

---

## Important Headers

Protected APIs require a JWT token.

```http
Authorization: Bearer <token>
Accept-Language: en
```

Use Hindi constants/messages where supported:

```http
Accept-Language: hi
```

---

## API Base URL

```txt
/api/v1
```

Example local URL:

```txt
http://localhost:5000/api/v1/auth/login
```

---

## Main API Routes

### Auth

```txt
POST   /auth/register-admin
POST   /auth/login
GET    /auth/me
PATCH  /auth/fcm-token
PATCH  /auth/change-password
```

### Users & Managers

```txt
POST   /users/managers
GET    /users
GET    /users/:id
PATCH  /users/:id
PATCH  /users/:id/deactivate
```

### Kilns

```txt
POST   /kilns
GET    /kilns
GET    /kilns/:id
PATCH  /kilns/:id
```

### Workers

```txt
POST   /workers
GET    /workers
GET    /workers/:id
PATCH  /workers/:id
GET    /workers/:id/attendance
GET    /workers/:id/salary-summary?month=2026-05
```

### Attendance

```txt
POST   /attendance
GET    /attendance?date=2026-05-23
GET    /attendance/category-wise?date=2026-05-23
GET    /attendance/history?workerId=<id>&from=2026-05-01&to=2026-05-31
POST   /attendance/:attendanceId/voice-remark
```

### Production

```txt
POST   /production
GET    /production
GET    /production/summary
GET    /production/worker/:workerId
```

### Stock

```txt
POST   /stock/categories
GET    /stock/categories
GET    /stock
POST   /stock/requests
GET    /stock/requests
PATCH  /stock/requests/:id/approve
PATCH  /stock/requests/:id/reject
GET    /stock/audit-logs
```

### Villages / Beats

```txt
POST   /villages
GET    /villages
GET    /villages/:id
PATCH  /villages/:id
```

### Customers

```txt
POST   /customers
GET    /customers
GET    /customers/:id
PATCH  /customers/:id
GET    /customers/:id/ledger
```

### Orders

```txt
POST   /orders
GET    /orders
GET    /orders/:id
PATCH  /orders/:id/status
```

### Udhari / Credit

```txt
POST   /udhari
GET    /udhari
GET    /udhari/overdue
GET    /udhari/:id
```

### Payments

```txt
POST   /payments
GET    /payments
GET    /payments/:id
```

### Leads

```txt
POST   /leads
GET    /leads
GET    /leads/:id
PATCH  /leads/:id/follow-up
```

### Voice Remarks

```txt
POST   /voice-remarks
GET    /voice-remarks
GET    /voice-remarks/:id
```

### Notifications

```txt
GET    /notifications
PATCH  /notifications/:id/read
```

### Dashboard

```txt
GET    /dashboard/admin
GET    /dashboard/manager
```

### Logs

```txt
GET    /logs
```

### Constants

```txt
GET    /constants
```

---

## Sample Login Request

```http
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "mobile": "9999999999",
  "password": "Admin@12345"
}
```

Sample response:

```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "Admin",
    "mobile": "9999999999",
    "role": "ADMIN",
    "languagePreference": "en"
  }
}
```

---

## Voice Notes

Use `multipart/form-data` with field name:

```txt
voiceNote
```

Local uploaded files are available under:

```txt
/uploads/<filename>
```

For production, replace local storage with one of the following:

- AWS S3
- Google Cloud Storage
- Cloudinary
- Azure Blob Storage

---

## Cron Jobs

The backend includes scheduled jobs for:

- Payment due reminders
- Overdue payment reminders
- Lead follow-up reminders
- Daily operational summaries

Cron jobs can be started automatically with the server or separated into a worker process for production.

---

## Deployment Notes

Recommended VPS deployment:

```bash
npm install --production
npm install -g pm2
pm2 start src/server.js --name brick-kiln-api
pm2 save
```

Use Nginx as a reverse proxy and enable HTTPS.

Recommended production setup:

- PM2 process manager
- Nginx reverse proxy
- SSL certificate using Certbot
- MongoDB backup schedule
- Upload/log rotation
- Secure `.env` permissions

---

## PM2 Commands

```bash
pm2 status
pm2 logs brick-kiln-api
pm2 restart brick-kiln-api
pm2 stop brick-kiln-api
```

---

## Suggested Nginx Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Notes for Frontend Integration

- Login first and store the JWT token.
- Send token in `Authorization` header for protected APIs.
- Use `Accept-Language: hi` for Hindi labels/constants.
- Use `multipart/form-data` for voice note upload.
- Use dashboard APIs for admin/manager overview screens.
- Use filters such as `date`, `from`, `to`, `managerId`, `villageId`, `status`, and `categoryCode` where supported.

---

## License

Private project for Cognexon Solutions Pvt. Ltd.

---

## Complete Kiln ERP Update

This repository now includes the complete MunimSarthi Brick Kiln / Bhatta ERP backend modules in addition to the earlier MVP modules.

### Core ERP flow

```txt
Pathai -> Kaccha Stock -> Sukhai -> Bharai -> Phukai -> Pakai -> Nikasi -> Chhantai -> Finished Stock -> Dispatch
```

### New major API modules

```txt
/api/v1/seasons
/api/v1/worker-categories
/api/v1/brick-categories
/api/v1/processes
/api/v1/process-entries
/api/v1/stock-ledger
/api/v1/worker-ledger
/api/v1/payroll
/api/v1/chambers
/api/v1/fuel
/api/v1/dispatches
/api/v1/customer-ledger
/api/v1/expenses
/api/v1/suppliers
/api/v1/purchases
/api/v1/supplier-ledger
/api/v1/vehicles
/api/v1/cashbook
/api/v1/reports
```

### Setup

```bash
cp .env.example .env
npm install
npm run seed:admin
npm run seed:erp
npm run dev
```

### Code check

```bash
npm run check
npm test
```

Full backend documentation is available at:

```txt
docs/COMPLETE_KILN_ERP_BACKEND_DOCUMENTATION.txt
```
