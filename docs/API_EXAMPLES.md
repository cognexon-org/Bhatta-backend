# API Examples

## Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "mobile": "9999999999",
  "password": "Admin@12345"
}
```

## Create Manager

```http
POST /api/v1/users/managers
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Ramesh Muneem",
  "mobile": "9876543210",
  "password": "Manager@123",
  "assignedKilnId": "<kilnId>",
  "assignedVillages": ["<villageId>"]
}
```

## Add Worker

```http
POST /api/v1/workers
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Ram Prasad",
  "mobile": "9000000001",
  "categoryCode": "ETH_PATHAI",
  "salaryType": "DAILY",
  "dailyWage": 500,
  "assignedManagerId": "<managerId>",
  "kilnId": "<kilnId>"
}
```

## Mark Attendance

```http
POST /api/v1/attendance
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2026-05-23",
  "entries": [
    { "workerId": "<workerId>", "status": "PRESENT", "checkInTime": "2026-05-23T09:00:00.000Z" },
    { "workerId": "<workerId>", "status": "LATE", "lateRemark": "Transport issue" }
  ]
}
```

## Create Order with Udhari

```http
POST /api/v1/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "<customerId>",
  "items": [
    {
      "stockCategoryId": "<categoryId>",
      "categoryCode": "SEEDHA_MANJAL",
      "quantity": 10000,
      "ratePerThousand": 6500
    }
  ],
  "paidAmount": 20000,
  "dueAfterDays": 15,
  "udhariReason": "₹45,000 eta bikri payment due after 15 days"
}
```

## Partial Payment

```http
POST /api/v1/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "<customerId>",
  "udhariId": "<udhariId>",
  "amount": 10000,
  "paymentMode": "CASH",
  "textRemark": "Partial payment received"
}
```
