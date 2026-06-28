# API Documentation

Base URL: `http://localhost:3001/api`

Swagger UI: `http://localhost:3001/api/docs`

All responses are wrapped in `{ "data": ... }` by the transform interceptor, except paginated responses which return `{ "data": [...], "meta": { "total", "page", "totalPages" } }`.

**Authentication:** Include `Authorization: Bearer <accessToken>` header for protected endpoints.

---

## Auth (`/api/auth`)

All endpoints in this module are public (no token required).

### POST `/auth/register`

Register a new user. Sends a 6-digit verification code via email.

**Request:**
```json
{
  "email": "juan.delacruz@ncf.edu.ph",
  "password": "SecureP@ss123",
  "firstName": "Juan",
  "middleName": "Santos",
  "lastName": "Dela Cruz",
  "suffix": "Jr.",
  "institutionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "programId": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
}
```

**Response `201`:**
```json
{
  "data": {
    "message": "Registration successful. Check your email for a 6-digit code."
  }
}
```

**Errors:**
- `409` — Email already registered

---

### POST `/auth/verify-email`

Verify email address via the 6-digit code sent in the registration email.

**Request:**
```json
{
  "email": "juan.delacruz@ncf.edu.ph",
  "code": "123456"
}
```

**Response `200`:**
```json
{
  "data": {
    "message": "Email verified successfully"
  }
}
```

**Errors:**
- `400` — Invalid or expired code

---

### POST `/auth/resend-verification-code`

Request a new 6-digit email verification code. Returns a generic message to avoid exposing account state.

**Request:**
```json
{
  "email": "juan.delacruz@ncf.edu.ph"
}
```

**Response `201`:**
```json
{
  "data": {
    "message": "If the email needs verification, a code was sent."
  }
}
```

---

### POST `/auth/login`

Authenticate with email and password. Returns access + refresh tokens.

**Request:**
```json
{
  "email": "juan.delacruz@ncf.edu.ph",
  "password": "SecureP@ss123"
}
```

**Response `201`:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "email": "juan.delacruz@ncf.edu.ph",
      "role": "guest"
    }
  }
}
```

**Errors:**
- `401` — Invalid credentials / Email not verified / Account suspended

---

### POST `/auth/refresh`

Exchange a refresh token for a new access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response `201`:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors:**
- `401` — Invalid refresh token

---

### POST `/auth/forgot-password`

Send a 6-digit reset code to the user's email. Response is always the same to prevent email enumeration.

**Request:**
```json
{
  "email": "juan.delacruz@ncf.edu.ph"
}
```

**Response `201`:**
```json
{
  "data": {
    "message": "If the email exists, a reset code has been sent."
  }
}
```

---

### POST `/auth/verify-reset-code`

Validate the 6-digit code. Returns a short-lived token for the next step.

**Request:**
```json
{
  "email": "juan.delacruz@ncf.edu.ph",
  "code": "482916"
}
```

**Response `201`:**
```json
{
  "data": {
    "resetToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors:**
- `400` — Invalid or expired code

---

### POST `/auth/reset-password`

Set a new password using the reset token from the previous step.

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "newPassword": "NewSecureP@ss456"
}
```

**Response `201`:**
```json
{
  "data": {
    "message": "Password reset successfully"
  }
}
```

**Errors:**
- `400` — Invalid or expired reset token

---

## Users (`/api/users`)

All endpoints require authentication. Admin-only endpoints are marked.

### GET `/users/me`

Get the current authenticated user's profile.

**Response `200`:**
```json
{
  "data": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "email": "juan.delacruz@ncf.edu.ph",
    "firstName": "Juan",
    "middleName": "Santos",
    "lastName": "Dela Cruz",
    "suffix": "Jr.",
    "role": "user",
    "status": "active",
    "profilePicKey": "profile-pics/c3d4e5f6.../1718000000.jpg",
    "institutionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "programId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "createdAt": "2024-06-01T10:00:00.000Z",
    "updatedAt": "2024-06-15T14:30:00.000Z",
    "institution": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Naga College Foundation"
    },
    "program": {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "name": "Bachelor of Science in Computer Science"
    }
  }
}
```

---

### PATCH `/users/me`

Update the current user's profile.

**Request:**
```json
{
  "firstName": "Juan Carlos",
  "suffix": null
}
```

**Response `200`:**
```json
{
  "data": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "email": "juan.delacruz@ncf.edu.ph",
    "firstName": "Juan Carlos",
    "middleName": "Santos",
    "lastName": "Dela Cruz",
    "suffix": null,
    "role": "user",
    "status": "active",
    "profilePicKey": null,
    "institutionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "programId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "createdAt": "2024-06-01T10:00:00.000Z",
    "updatedAt": "2024-06-17T09:00:00.000Z"
  }
}
```

---

### POST `/users/me/profile-picture`

Get a presigned URL to upload a profile picture directly to R2.

**Request:** No body required.

**Response `201`:**
```json
{
  "data": {
    "uploadUrl": "https://your-account.r2.cloudflarestorage.com/nexus-pdfs/profile-pics/c3d4e5f6.../1718000000.jpg?X-Amz-Algorithm=...",
    "key": "profile-pics/c3d4e5f6-a7b8-9012-cdef-123456789012/1718000000.jpg"
  }
}
```

**Frontend usage:** `PUT` the image file to the `uploadUrl` with the correct `Content-Type` header.

---

### GET `/users` — Admin

List all users with pagination.

**Query params:** `?page=1&limit=20`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "email": "juan.delacruz@ncf.edu.ph",
      "firstName": "Juan",
      "lastName": "Dela Cruz",
      "role": "user",
      "status": "active",
      "institution": { "id": "...", "name": "Naga College Foundation" },
      "program": { "id": "...", "name": "BSCS" },
      "createdAt": "2024-06-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "totalPages": 3
  }
}
```

---

### GET `/users/:id` — Admin

Get any user by ID. Same response shape as `GET /users/me`.

---

### PATCH `/users/:id` — Admin

Admin update: can change role, institution, program, status.

**Request:**
```json
{
  "role": "user",
  "institutionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "active"
}
```

**Response:** Same shape as `PATCH /users/me`.

---

### DELETE `/users/:id` — Admin

**Response `200`:**
```json
{
  "data": {
    "message": "User deleted"
  }
}
```

---

## Research (`/api/research`)

### POST `/research` — Auth required

Create research metadata. This is step 1 of the upload flow.

**Request:**
```json
{
  "title": "Impact of AI on Philippine Education Systems",
  "abstract": "This study examines the integration of artificial intelligence tools in Philippine higher education institutions...",
  "publishDate": "2024-06-15",
  "authors": [
    { "name": "Juan Dela Cruz", "email": "juan@ncf.edu.ph" },
    { "name": "Maria Santos", "email": "maria@ncf.edu.ph" }
  ],
  "categoryIds": ["d4e5f6a7-b8c9-0123-defg-456789012345"],
  "keywordIds": [
    "e5f6a7b8-c9d0-1234-efgh-567890123456",
    "f6a7b8c9-d0e1-2345-fghi-678901234567"
  ]
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "11111111-2222-3333-4444-555555555555"
  }
}
```

---

### POST `/research/:id/upload-url` — Auth required

Step 2: Get a presigned URL to upload the PDF.

**Request:**
```json
{
  "filename": "ai-education-study.pdf",
  "contentType": "application/pdf"
}
```

**Response `201`:**
```json
{
  "data": {
    "uploadUrl": "https://your-account.r2.cloudflarestorage.com/nexus-pdfs/pdfs/11111111.../1718000000-ai-education-study.pdf?X-Amz-Algorithm=...",
    "key": "pdfs/11111111-2222-3333-4444-555555555555/1718000000-ai-education-study.pdf"
  }
}
```

**Frontend usage:** `PUT` the PDF file to `uploadUrl` with `Content-Type: application/pdf`.

---

### POST `/research/:id/confirm-upload` — Auth required

Step 3: Confirm the upload completed. Backend verifies the file exists in R2.

**Response `201`:**
```json
{
  "data": {
    "message": "Upload confirmed"
  }
}
```

**Errors:**
- `404` — No file key set / File not found in storage

---

### GET `/research` — Public

List approved researches with pagination.

**Query params:** `?page=1&limit=20`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "11111111-2222-3333-4444-555555555555",
      "title": "Impact of AI on Philippine Education Systems",
      "abstract": "This study examines...",
      "publishDate": "2024-06-15",
      "status": "approved",
      "filePrivacy": "public",
      "viewCount": 142,
      "downloadCount": 38,
      "citationCount": 5,
      "createdAt": "2024-06-15T08:00:00.000Z",
      "authors": [
        { "id": "...", "name": "Juan Dela Cruz", "email": "juan@ncf.edu.ph" },
        { "id": "...", "name": "Maria Santos", "email": "maria@ncf.edu.ph" }
      ],
      "categories": [
        { "id": "...", "name": "Education Technology" }
      ]
    }
  ],
  "meta": {
    "total": 89,
    "page": 1,
    "totalPages": 5
  }
}
```

---

### GET `/research/:id` — Public

Get a single research with full details.

**Response `200`:**
```json
{
  "data": {
    "id": "11111111-2222-3333-4444-555555555555",
    "title": "Impact of AI on Philippine Education Systems",
    "abstract": "This study examines the integration of artificial intelligence tools in Philippine higher education institutions...",
    "publishDate": "2024-06-15",
    "status": "approved",
    "filePrivacy": "public",
    "fileKey": "pdfs/11111111.../ai-education-study.pdf",
    "fileName": "ai-education-study.pdf",
    "uploadComplete": true,
    "uploaderId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "rejectionReason": null,
    "viewCount": 142,
    "downloadCount": 38,
    "citationCount": 5,
    "createdAt": "2024-06-15T08:00:00.000Z",
    "updatedAt": "2024-06-15T08:00:00.000Z",
    "uploader": {
      "id": "c3d4e5f6-...",
      "email": "juan.delacruz@ncf.edu.ph",
      "firstName": "Juan",
      "lastName": "Dela Cruz",
      "role": "user"
    },
    "authors": [
      { "id": "...", "name": "Juan Dela Cruz", "email": "juan@ncf.edu.ph" },
      { "id": "...", "name": "Maria Santos", "email": "maria@ncf.edu.ph" }
    ],
    "categories": [
      { "id": "...", "name": "Education Technology" }
    ],
    "keywords": [
      { "id": "...", "name": "Artificial Intelligence" },
      { "id": "...", "name": "Higher Education" }
    ]
  }
}
```

---

### GET `/research/my` — Auth required

List the current user's researches (all statuses).

**Query params:** `?page=1&limit=20`

**Response:** Same paginated format as `GET /research`, but includes pending/rejected papers with no author/category expansion.

---

### GET `/research/pending` — Admin

List all pending researches awaiting approval.

**Response:** Same paginated format as `GET /research`, with uploader info and authors.

---

### PATCH `/research/:id` — Auth required (owner only)

Update research metadata.

**Request:**
```json
{
  "title": "Updated Title: Impact of AI on Philippine Education",
  "abstract": "Updated abstract text..."
}
```

**Response `200`:** Returns the updated research object.

---

### PATCH `/research/:id/privacy` — Auth required (owner only)

Toggle file privacy between public and private.

**Request:**
```json
{
  "filePrivacy": "private"
}
```

**Response `200`:** Returns the updated research object.

---

### DELETE `/research/:id` — Auth required (owner only)

Delete a research and its PDF from R2.

**Response `200`:**
```json
{
  "data": {
    "message": "Research deleted"
  }
}
```

---

### PATCH `/research/:id/approve` — Admin

Approve a pending research. Creates a notification for the uploader.

**Response `200`:** Returns the updated research object with `"status": "approved"`.

---

### PATCH `/research/:id/reject` — Admin

Reject a research with a reason. Creates a notification for the uploader.

**Request:**
```json
{
  "reason": "Abstract does not meet minimum length requirements. Please expand the methodology section."
}
```

**Response `200`:** Returns the updated research object with `"status": "rejected"` and `"rejectionReason": "..."`.

---

### GET `/research/:id/pdf` — Public (respects privacy)

Get a presigned download URL for the PDF. For private PDFs, requires authentication as the owner.

**Response `200`:**
```json
{
  "data": {
    "url": "https://your-account.r2.cloudflarestorage.com/nexus-pdfs/pdfs/11111111.../ai-education-study.pdf?X-Amz-Algorithm=..."
  }
}
```

**Errors:**
- `403` — PDF is private and requester is not the owner
- `404` — PDF not found

---

### POST `/research/:id/view` — Public

Track a view event. Increments `viewCount`.

**Response `201`:**
```json
{
  "data": { "message": "view tracked" }
}
```

---

### POST `/research/:id/download` — Public

Track a download event. Increments `downloadCount`.

**Response `201`:**
```json
{
  "data": { "message": "download tracked" }
}
```

---

### POST `/research/:id/cite` — Public

Track a citation event. Increments `citationCount`.

**Response `201`:**
```json
{
  "data": { "message": "citation tracked" }
}
```

---

## Search (`/api/search`)

All search endpoints are public.

### GET `/search`

Full-text search with filters and pagination.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search query (searches title, abstract, keywords, authors) |
| `category` | UUID | Filter by category ID |
| `keyword` | UUID | Filter by keyword ID |
| `author` | UUID | Filter by author ID |
| `dateFrom` | date | Filter: published on or after (YYYY-MM-DD) |
| `dateTo` | date | Filter: published on or before (YYYY-MM-DD) |
| `sort` | enum | `relevance` (default), `date`, `views`, `downloads` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 20, max: 100) |

**Example:** `GET /api/search?q=machine+learning&category=d4e5f6a7-...&sort=relevance&page=1&limit=10`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "11111111-2222-3333-4444-555555555555",
      "title": "Machine Learning Applications in Philippine Agriculture",
      "abstract": "This research explores...",
      "publishDate": "2024-03-20",
      "viewCount": 89,
      "downloadCount": 23,
      "citationCount": 3,
      "createdAt": "2024-03-20T06:00:00.000Z",
      "rank": 0.8745
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "totalPages": 2
  }
}
```

The `rank` field is only present when `q` is provided. Higher = more relevant.

---

### GET `/search/suggestions?q=<partial>`

Autocomplete suggestions based on partial query. Uses `pg_trgm` similarity matching.

**Example:** `GET /api/search/suggestions?q=mach`

**Response `200`:**
```json
{
  "data": {
    "researches": [
      {
        "id": "11111111-...",
        "title": "Machine Learning Applications in Philippine Agriculture",
        "similarity": 0.35
      },
      {
        "id": "22222222-...",
        "title": "Machining Process Optimization Using Neural Networks",
        "similarity": 0.30
      }
    ],
    "authors": [
      { "id": "aaaa-...", "name": "Michael Machado" }
    ]
  }
}
```

---

## Categories (`/api/categories`)

### GET `/categories` — Public

List all categories with research count.

**Response `200`:**
```json
{
  "data": [
    { "id": "d4e5f6a7-...", "name": "Computer Science", "researchCount": 24 },
    { "id": "e5f6a7b8-...", "name": "Education Technology", "researchCount": 18 },
    { "id": "f6a7b8c9-...", "name": "Environmental Science", "researchCount": 11 }
  ]
}
```

---

### GET `/categories/:id` — Public

Get a category with its paginated researches.

**Query params:** `?page=1&limit=20`

**Response `200`:**
```json
{
  "data": {
    "id": "d4e5f6a7-...",
    "name": "Computer Science",
    "researches": [
      {
        "id": "11111111-...",
        "title": "Machine Learning Applications...",
        "abstract": "...",
        "status": "approved",
        "viewCount": 89
      }
    ]
  },
  "meta": {
    "total": 24,
    "page": 1,
    "totalPages": 2
  }
}
```

---

### POST `/categories` — Admin

**Request:**
```json
{ "name": "Data Science" }
```

**Response `201`:**
```json
{
  "data": { "id": "aabbccdd-...", "name": "Data Science" }
}
```

---

### PATCH `/categories/:id` — Admin

**Request:**
```json
{ "name": "Data Science & Analytics" }
```

**Response `200`:** Returns updated category.

---

### DELETE `/categories/:id` — Admin

**Response `200`:**
```json
{ "data": { "message": "Category deleted" } }
```

---

## Keywords (`/api/keywords`)

### GET `/keywords` — Public

```json
{
  "data": [
    { "id": "e5f6a7b8-...", "name": "Artificial Intelligence" },
    { "id": "f6a7b8c9-...", "name": "Deep Learning" },
    { "id": "a7b8c9d0-...", "name": "Natural Language Processing" }
  ]
}
```

### POST `/keywords` — Admin

**Request:** `{ "name": "Reinforcement Learning" }`

**Response `201`:** `{ "data": { "id": "...", "name": "Reinforcement Learning" } }`

### PATCH `/keywords/:id` — Admin

**Request:** `{ "name": "Updated Keyword Name" }`

### DELETE `/keywords/:id` — Admin

**Response:** `{ "data": { "message": "Keyword deleted" } }`

---

## Authors (`/api/authors`)

All endpoints are public.

### GET `/authors`

List authors with paper count. Supports search and pagination.

**Query params:** `?page=1&limit=20&search=dela+cruz`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "aaaa-bbbb-cccc-dddd",
      "name": "Juan Dela Cruz",
      "email": "juan@ncf.edu.ph",
      "paperCount": 5
    },
    {
      "id": "bbbb-cccc-dddd-eeee",
      "name": "Maria Dela Cruz",
      "email": "maria@example.com",
      "paperCount": 2
    }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "totalPages": 1
  }
}
```

---

### GET `/authors/:id`

**Response `200`:**
```json
{
  "data": {
    "id": "aaaa-bbbb-cccc-dddd",
    "name": "Juan Dela Cruz",
    "email": "juan@ncf.edu.ph",
    "paperCount": 5
  }
}
```

---

### GET `/authors/:id/papers`

Get an author's approved papers with pagination.

**Query params:** `?page=1&limit=20`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "11111111-...",
      "title": "Impact of AI on Philippine Education Systems",
      "abstract": "...",
      "status": "approved",
      "publishDate": "2024-06-15",
      "viewCount": 142
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "totalPages": 1
  }
}
```

---

## Collections (`/api/collections`)

All endpoints require authentication.

### GET `/collections`

Get the current user's saved research collection.

**Response `200`:**
```json
{
  "data": [
    {
      "userId": "c3d4e5f6-...",
      "researchId": "11111111-...",
      "createdAt": "2024-06-16T10:00:00.000Z",
      "research": {
        "id": "11111111-...",
        "title": "Impact of AI on Philippine Education Systems",
        "abstract": "...",
        "status": "approved",
        "researchAuthors": [
          { "author": { "id": "...", "name": "Juan Dela Cruz" } }
        ],
        "researchCategories": [
          { "category": { "id": "...", "name": "Education Technology" } }
        ]
      }
    }
  ]
}
```

---

### POST `/collections`

Add a research to the user's collection.

**Request:**
```json
{
  "researchId": "11111111-2222-3333-4444-555555555555"
}
```

**Response `201`:**
```json
{ "data": { "message": "Added to collection" } }
```

**Errors:**
- `409` — Already in collection

---

### DELETE `/collections/:researchId`

Remove a research from the collection.

**Response `200`:**
```json
{ "data": { "message": "Removed from collection" } }
```

---

## Notifications (`/api/notifications`)

All endpoints require authentication.

### GET `/notifications`

Get the current user's notifications with pagination.

**Query params:** `?page=1&limit=20`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "nnnn-oooo-pppp-qqqq",
      "userId": "c3d4e5f6-...",
      "researchId": "11111111-...",
      "message": "Your research \"Impact of AI on Philippine Education Systems\" has been approved.",
      "read": false,
      "createdAt": "2024-06-17T08:00:00.000Z",
      "research": {
        "id": "11111111-...",
        "title": "Impact of AI on Philippine Education Systems"
      }
    },
    {
      "id": "oooo-pppp-qqqq-rrrr",
      "userId": "c3d4e5f6-...",
      "researchId": "22222222-...",
      "message": "Your research \"Another Paper\" has been rejected. Reason: Incomplete abstract.",
      "read": true,
      "createdAt": "2024-06-16T14:00:00.000Z",
      "research": {
        "id": "22222222-...",
        "title": "Another Paper"
      }
    }
  ],
  "meta": {
    "total": 8,
    "page": 1,
    "totalPages": 1
  }
}
```

---

### PATCH `/notifications/read-all`

Mark all unread notifications as read.

**Response `200`:**
```json
{ "data": { "message": "All notifications marked as read" } }
```

---

### GET `/notifications/unread-count`

**Response `200`:**
```json
{ "data": { "count": 3 } }
```

---

## Analytics (`/api/analytics`)

### GET `/analytics/admin/overview` — Admin

System-wide aggregate stats.

**Response `200`:**
```json
{
  "data": {
    "totalResearches": 89,
    "totalUsers": 156,
    "totalViews": 4523,
    "totalDownloads": 1247,
    "totalCitations": 234
  }
}
```

---

### GET `/analytics/admin/trends` — Admin

Time-series data for charts.

**Query params:** `?period=daily&metric=views`

| Param | Values |
|-------|--------|
| `period` | `daily`, `weekly`, `monthly` |
| `metric` | `views`, `downloads`, `citations` |

**Response `200`:**
```json
{
  "data": [
    { "date": "2024-06-17T00:00:00.000Z", "count": 45 },
    { "date": "2024-06-16T00:00:00.000Z", "count": 38 },
    { "date": "2024-06-15T00:00:00.000Z", "count": 52 },
    { "date": "2024-06-14T00:00:00.000Z", "count": 29 }
  ]
}
```

---

### GET `/analytics/admin/uploads-by-role` — Admin

Upload counts grouped by user role.

**Response `200`:**
```json
{
  "data": [
    { "role": "user", "uploads": 67 },
    { "role": "admin", "uploads": 15 },
    { "role": "guest", "uploads": 7 }
  ]
}
```

---

### GET `/analytics/user/overview` — Auth required

Current user's own stats.

**Response `200`:**
```json
{
  "data": {
    "totalResearches": 5,
    "totalViews": 340,
    "totalDownloads": 89,
    "totalCitations": 23
  }
}
```

---

### GET `/analytics/user/trends` — Auth required

Current user's time-series data.

**Query params:** `?period=weekly&metric=downloads`

**Response:** Same format as admin trends, but scoped to the current user's researches.

---

## PDF Requests (`/api/pdf-requests`)

### POST `/pdf-requests` — Public

Submit a request for access to a private PDF. Sends an email notification to the research owner.

**Request:**
```json
{
  "researchId": "11111111-2222-3333-4444-555555555555",
  "name": "External Researcher",
  "email": "researcher@university.edu",
  "purpose": "I need this paper for my thesis on AI in education."
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "rrrr-ssss-tttt-uuuu",
    "researchId": "11111111-...",
    "requesterName": "External Researcher",
    "requesterEmail": "researcher@university.edu",
    "purpose": "I need this paper for my thesis on AI in education.",
    "status": "pending",
    "createdAt": "2024-06-17T10:00:00.000Z"
  }
}
```

---

### GET `/pdf-requests/my` — Auth required

List PDF requests for the current user's researches.

**Response `200`:**
```json
{
  "data": [
    {
      "request": {
        "id": "rrrr-ssss-tttt-uuuu",
        "researchId": "11111111-...",
        "requesterName": "External Researcher",
        "requesterEmail": "researcher@university.edu",
        "purpose": "I need this paper for my thesis...",
        "status": "pending",
        "createdAt": "2024-06-17T10:00:00.000Z"
      },
      "research": {
        "id": "11111111-...",
        "title": "Impact of AI on Philippine Education Systems"
      }
    }
  ]
}
```

---

### POST `/pdf-requests/:id/approve` — Auth required

Approve a PDF request. Sends a 24-hour download link to the requester via email.

**Response `201`:**
```json
{ "data": { "message": "Request approved, email sent" } }
```

---

### POST `/pdf-requests/:id/reject` — Auth required

Reject a PDF request. Sends a rejection email to the requester.

**Response `201`:**
```json
{ "data": { "message": "Request rejected, email sent" } }
```

---

## Institutions (`/api/institutions`)

### GET `/institutions` — Public

```json
{
  "data": [
    { "id": "a1b2c3d4-...", "name": "Naga College Foundation" },
    { "id": "b2c3d4e5-...", "name": "University of the Philippines" },
    { "id": "c3d4e5f6-...", "name": "Ateneo de Naga University" }
  ]
}
```

### POST `/institutions` — Admin

**Request:** `{ "name": "Bicol University" }`

**Response `201`:** `{ "data": { "id": "...", "name": "Bicol University" } }`

### PATCH `/institutions/:id` — Admin

**Request:** `{ "name": "Bicol University - Main Campus" }`

### DELETE `/institutions/:id` — Admin

**Response:** `{ "data": { "message": "Institution deleted" } }`

---

## Programs (`/api/programs`)

### GET `/programs` — Public

```json
{
  "data": [
    { "id": "b2c3d4e5-...", "name": "Bachelor of Science in Computer Science" },
    { "id": "c3d4e5f6-...", "name": "Bachelor of Science in Information Technology" },
    { "id": "d4e5f6a7-...", "name": "Bachelor of Science in Education" }
  ]
}
```

### POST `/programs` — Admin

**Request:** `{ "name": "Bachelor of Science in Nursing" }`

**Response `201`:** `{ "data": { "id": "...", "name": "Bachelor of Science in Nursing" } }`

### PATCH `/programs/:id` — Admin

**Request:** `{ "name": "Updated Program Name" }`

### DELETE `/programs/:id` — Admin

**Response:** `{ "data": { "message": "Program deleted" } }`

---

## Error Response Format

All errors follow this structure:

```json
{
  "statusCode": 400,
  "message": "Descriptive error message",
  "timestamp": "2024-06-17T10:00:00.000Z"
}
```

For validation errors (from class-validator):

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "timestamp": "2024-06-17T10:00:00.000Z"
}
```

Common status codes:
| Code | Meaning |
|------|---------|
| `400` | Validation error / Bad request |
| `401` | Missing or invalid token |
| `403` | Insufficient permissions (wrong role, not owner) |
| `404` | Resource not found |
| `409` | Conflict (duplicate email, already in collection) |

---

## Upload Flow (3-step process)

The frontend uploads files directly to Cloudflare R2, never through the backend. Here's the complete flow:

```
Step 1: POST /api/research
        → Send metadata (title, abstract, authors, categories, keywords)
        → Receive { id }

Step 2: POST /api/research/:id/upload-url
        → Send { filename, contentType }
        → Receive { uploadUrl, key }

Step 3: PUT <uploadUrl>    ← This goes directly to R2, NOT to the backend
        → Send the raw PDF file with Content-Type: application/pdf
        → R2 returns 200

Step 4: POST /api/research/:id/confirm-upload
        → Backend verifies file exists in R2
        → Receive { message: "Upload confirmed" }
```

**Frontend example (JavaScript):**
```javascript
// Step 1: Create research
const { data: { id } } = await api.post('/research', {
  title: 'My Research',
  abstract: '...',
  authors: [{ name: 'Author', email: 'a@b.com' }],
});

// Step 2: Get upload URL
const { data: { uploadUrl } } = await api.post(`/research/${id}/upload-url`, {
  filename: file.name,
  contentType: 'application/pdf',
});

// Step 3: Upload directly to R2 (no auth header!)
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': 'application/pdf' },
});

// Step 4: Confirm
await api.post(`/research/${id}/confirm-upload`);
```
