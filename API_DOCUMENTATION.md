# NCF Research Nexus — API Documentation

> Base URL: `http://localhost:3000/api/v1` (dev)  
> Auth: `Authorization: Bearer <accessToken>` on protected routes  
> Global prefix: `/api/v1`  
> Swagger UI: `http://localhost:3000/api/docs`

---

## Auth Quick Reference

| Endpoint | Auth | Method |
|---|---|---|
| `POST /auth/register` | ❌ Public | `POST` |
| `POST /auth/login` | ❌ Public | `POST` |
| `POST /auth/refresh` | ❌ Public | `POST` |
| `GET /auth/verify-email` | ❌ Public | `GET` |
| `POST /auth/forgot-password` | ❌ Public | `POST` |
| `POST /auth/reset-password` | ❌ Public | `POST` |
| `GET /auth/me` | ✅ Protected (any) | `GET` |

### POST /auth/register

```json
// Request
{
  "firstName": "John",
  "middleName": "D",
  "lastName": "Doe",
  "suffix": "",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "roleId": 2,
  "programId": 1,
  "institutionId": 1
}

// Response 201
{
  "message": "Registration successful. Please check your email to verify your account.",
  "userId": 1
}

// Response 409
{ "error": "Email already registered", "code": "EMAIL_EXISTS" }
```

```typescript
// Next.js fetch
const res = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'John', lastName: 'Doe', email: 'john@example.com',
    password: 'SecurePass123!',
  }),
});
```

### POST /auth/login

```json
// Request
{ "email": "john.doe@example.com", "password": "SecurePass123!" }

// Response 200
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJl...",
  "user": {
    "id": 1, "firstName": "John", "lastName": "Doe",
    "email": "john.doe@example.com", "role": "ncf_user"
  }
}

// Response 401
{ "error": "Invalid email or password", "code": "INVALID_CREDENTIALS" }
```

```typescript
// Next.js — store both tokens, attach accessToken to future requests
const { accessToken, refreshToken, user } = await res.json();
// localStorage.setItem('accessToken', accessToken);
// localStorage.setItem('refreshToken', refreshToken);
```

### POST /auth/refresh

```json
// Request
{ "refreshToken": "dGhpcyBpcyBhIHJlZnJl..." }

// Response 200
{ "accessToken": "eyJ...", "refreshToken": "bmV3..." }
```

### GET /auth/verify-email

```
GET /api/v1/auth/verify-email?token=eyJhbGciOiJIUzI1NiIs...

Response 200: { "message": "Email verified successfully" }
Response 400: { "error": "Invalid or expired verification token", "code": "TOKEN_INVALID" }
```

### POST /auth/forgot-password

```json
// Request
{ "email": "john.doe@example.com" }

// Response 200 (always same — prevents email enumeration)
{ "message": "If the email exists, a password reset link has been sent" }
```

### POST /auth/reset-password

```json
// Request
{ "token": "a1b2c3d4e5f6...", "newPassword": "NewSecurePass456!" }

// Response 200
{ "message": "Password reset successfully" }
```

### GET /auth/me

**Headers**: `Authorization: Bearer <accessToken>`

```json
// Response 200
{
  "id": 1, "firstName": "John", "middleName": "D", "lastName": "Doe",
  "email": "john.doe@example.com", "role": "ncf_user",
  "isVerified": true, "createdAt": "2026-06-01T00:00:00.000Z"
}
```

---

## Users

| Endpoint | Auth | Method |
|---|---|---|
| `GET /users` | 🔒 Admin | `GET` |
| `GET /users/:id` | ✅ Protected (self/admin) | `GET` |
| `PATCH /users/:id` | ✅ Protected (self/admin) | `PATCH` |
| `DELETE /users/:id` | 🔒 Admin | `DELETE` |
| `POST /users/heartbeat` | ✅ Protected | `POST` |
| `GET /users/online` | 🔒 Admin | `GET` |

### GET /users

**Headers**: `Authorization: Bearer <adminToken>`

**Query**: `?page=1&limit=20&search=john&sortBy=createdAt&order=desc`

```json
// Response 200
{
  "data": [
    {
      "id": 1, "firstName": "John", "lastName": "Doe",
      "email": "john.doe@example.com", "roleId": 2,
      "isVerified": true, "createdAt": "2026-06-01T00:00:00.000Z"
    }
  ],
  "meta": { "total": 45, "page": 1, "limit": 20, "totalPages": 3 }
}
```

### GET /users/:id

```json
// Response 200
{
  "id": 1, "firstName": "John", "middleName": "D", "lastName": "Doe",
  "suffix": "", "email": "john.doe@example.com", "roleId": 2,
  "programId": 1, "institutionId": 1, "isVerified": true,
  "lastActive": "2026-06-10T14:30:00.000Z", "createdAt": "2026-06-01T00:00:00.000Z"
}
```

### PATCH /users/:id

```json
// Request (partial update — only send changed fields)
{ "firstName": "Jonathan", "lastName": "Smith" }

// Response 200
{ "message": "Profile updated successfully" }
```

### DELETE /users/:id

```json
// Response 200
{ "message": "User deleted successfully" }
```

### POST /users/heartbeat

```json
// Request (body can be empty — user ID from JWT)
{}

// Response 200
{ "message": "Heartbeat updated" }
```

### GET /users/online

```json
// Response 200
{
  "onlineUsers": [
    { "id": 1, "firstName": "John", "lastName": "Doe", "email": "john@example.com", "lastActive": "2026-06-10T14:35:00.000Z" }
  ],
  "count": 1
}
```

---

## Researches

| Endpoint | Auth | Method |
|---|---|---|
| `POST /researches` | ✅ Protected | `POST` |
| `GET /researches` | ❌ Public | `GET` |
| `GET /researches/:id` | ❌ Public | `GET` |
| `PATCH /researches/:id` | ✅ Protected (owner/admin) | `PATCH` |
| `DELETE /researches/:id` | ✅ Protected (owner/admin) | `DELETE` |
| `PATCH /researches/:id/privacy` | ✅ Protected (owner/admin) | `PATCH` |
| `POST /researches/:id/download` | ❌ Public | `POST` |
| `POST /researches/:id/cite` | ❌ Public | `POST` |
| `POST /researches/:id/view` | ❌ Public | `POST` |

### POST /researches

**Headers**: `Authorization: Bearer <accessToken>`  
**Content-Type**: `application/json`

```json
// Request
{
  "title": "Machine Learning in Modern Education",
  "abstract": "This paper explores the impact of AI on modern teaching methods...",
  "authors": [
    { "name": "John Doe", "email": "john@example.com" },
    { "name": "Jane Smith", "email": "jane@example.com" }
  ],
  "categories": ["Education", "Technology"],
  "keywords": ["machine learning", "AI", "education"],
  "filePrivacy": "public"
}

// Response 201
{ "message": "Research uploaded successfully", "id": 1 }
```

```typescript
// Next.js — note: file upload uses multipart/form-data, metadata as JSON
// For JSON-only creation (without file), use above body
```

### GET /researches

**Query**: `?page=1&limit=20&category=1&keyword=2&author=3&search=machine&sortBy=date&order=desc`

```json
// Response 200
{
  "data": [
    {
      "id": 1, "title": "Machine Learning in Modern Education",
      "abstract": "This paper explores...",
      "authors": [{ "id": 1, "name": "John Doe", "email": "john@example.com" }],
      "categories": ["Education", "Technology"],
      "keywords": ["machine learning", "AI"],
      "status": "approved", "filePrivacy": "public",
      "viewCount": 1024,
      "publishDate": "2026-05-15T00:00:00.000Z",
      "totalDownloads": 150, "totalCitations": 12
    }
  ],
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

### GET /researches/:id

```json
// Response 200
{
  "id": 1, "title": "Machine Learning in Modern Education",
  "abstract": "This paper explores...",
  "filename": "research_1.pdf", "status": "approved", "filePrivacy": "public",
  "authors": [{ "id": 1, "name": "John Doe", "email": "john@example.com" }],
  "categories": ["Education", "Technology"],
  "keywords": ["machine learning", "AI", "education"],
  "uploader": { "id": 1, "firstName": "John", "lastName": "Doe", "email": "john.doe@example.com" },
  "viewCount": 1024,
  "totalDownloads": 150, "totalCitations": 12,
  "publishDate": "2026-05-15T00:00:00.000Z", "createdAt": "2026-05-10T00:00:00.000Z"
}
```

### PATCH /researches/:id

```json
// Request (send only fields to update)
{ "title": "Updated Title", "abstract": "Updated abstract..." }

// Response 200
{ "message": "Research updated successfully" }
```

### DELETE /researches/:id

```json
// Response 200
{ "message": "Research deleted successfully" }
```

### PATCH /researches/:id/privacy

```json
// Request
{ "privacy": "private" }

// Response 200
{ "message": "Privacy updated to private" }
```

### POST /researches/:id/download

```json
// Response 200
{ "message": "Download counted" }
```

### POST /researches/:id/cite

```json
// Response 200
{ "message": "Citation counted" }
```

### POST /researches/:id/view

```json
// Response 200
{ "message": "View counted" }
```

---

## Files (Cloudflare R2)

| Endpoint | Auth | Method |
|---|---|---|
| `GET /files/pdf/:researchId` | ❌ Public | `GET` |
| `POST /files/pdf/:researchId` | ✅ Protected (owner/admin) | `POST` |
| `POST /files/profile-picture` | ✅ Protected | `POST` |
| `GET /files/profile-picture/:userId` | ❌ Public | `GET` |

### GET /files/pdf/:researchId

Streams the PDF binary. Use as an `<iframe src="...">` or `fetch` with blob response.

```typescript
// Next.js — stream and display PDF
const res = await fetch(`/api/v1/files/pdf/${researchId}`);
const blob = await res.blob();
const url = URL.createObjectURL(blob);
// <iframe src={url} /> or <embed src={url} type="application/pdf" />
```

### POST /files/pdf/:researchId

**Content-Type**: `multipart/form-data`

```bash
# cURL example
curl -X POST http://localhost:3000/api/v1/files/pdf/1 \
  -H "Authorization: Bearer <token>" \
  -F "file=@updated-research.pdf"
```

```typescript
// Next.js
const formData = new FormData();
formData.append('file', pdfFile); // File from <input type="file">
const res = await fetch(`/api/v1/files/pdf/${researchId}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
  body: formData,
});
```

### POST /files/profile-picture

**Content-Type**: `multipart/form-data`

```bash
curl -X POST http://localhost:3000/api/v1/files/profile-picture \
  -H "Authorization: Bearer <token>" \
  -F "file=@avatar.jpg"
```

```typescript
// Next.js
const formData = new FormData();
formData.append('file', imageFile);
const res = await fetch('/api/v1/files/profile-picture', {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
  body: formData,
});
const { url } = await res.json(); // R2 object key
```

### GET /files/profile-picture/:userId

Streams the profile picture binary (JPG/PNG).

```typescript
// Next.js — use as <img src={url} />
const profilePicUrl = `/api/v1/files/profile-picture/${userId}`;
// <img src={profilePicUrl} alt="Profile" />
```

---

## Search

| Endpoint | Auth | Method |
|---|---|---|
| `GET /search` | ❌ Public | `GET` |
| `POST /search/log` | ✅ Protected | `POST` |

### GET /search

**Query**: `?q=machine+learning&category=1&author=3&page=1&limit=20`

```json
// Response 200
{
  "data": [
    { "id": 1, "title": "Machine Learning in Modern Education", "abstract": "...", "relevance": 0.95 }
  ],
  "meta": { "total": 10, "page": 1, "limit": 20, "totalPages": 1 }
}
```

### POST /search/log

```json
// Request
{ "researchId": 1, "query": "machine learning" }

// Response 200
{ "message": "Search logged" }
```

---

## Analytics

All analytics endpoints are public.

| Endpoint | Method |
|---|---|
| `GET /analytics/top-downloads?limit=10` | `GET` |
| `GET /analytics/trending?limit=10` | `GET` |
| `GET /analytics/most-cited` | `GET` |
| `GET /analytics/most-viewed` | `GET` |
| `GET /analytics/totals` | `GET` |
| `GET /analytics/daily?startDate=2026-01-01&endDate=2026-06-10` | `GET` |
| `GET /analytics/user/:userId` | `GET` |

### GET /analytics/top-downloads

```json
// Response 200
{
  "data": [
    { "researchId": 1, "title": "Machine Learning in Modern Education", "downloadCount": 150 }
  ]
}
```

### GET /analytics/trending

```json
// Response 200
{
  "data": [
    { "researchId": 1, "title": "Machine Learning in Modern Education", "searchCount": 45 }
  ]
}
```

### GET /analytics/most-cited

```json
// Response 200
{
  "data": [
    { "researchId": 1, "title": "Machine Learning in Modern Education", "citationCount": 25 }
  ]
}
```

### GET /analytics/most-viewed

```json
// Response 200
{
  "data": [
    { "researchId": 1, "title": "Machine Learning in Modern Education", "viewCount": 1024 }
  ]
}
```

### GET /analytics/totals

```json
// Response 200
{
  "totalResearches": 150, "totalUsers": 45,
  "totalDownloads": 3200, "totalCitations": 450, "totalViews": 12000
}
```

### GET /analytics/:metric

`:metric` = `downloads` | `citations` | `views`

**Query**: `?granularity=daily&startDate=2026-01-01&endDate=2026-06-10`

```json
// Response 200
{
  "data": [
    { "date": "2026-06-01", "count": 15 },
    { "date": "2026-06-02", "count": 22 }
  ]
}
```

### GET /analytics/user/:userId

```json
// Response 200
{ "totalResearches": 5 }
```

---

## Notifications

| Endpoint | Auth | Method |
|---|---|---|
| `GET /notifications` | ✅ Protected | `GET` |
| `PATCH /notifications/read` | ✅ Protected | `PATCH` |
| `PATCH /notifications/:id/read` | ✅ Protected | `PATCH` |

### GET /notifications

**Query**: `?page=1&limit=20`

```json
// Response 200
{
  "data": [
    {
      "id": 1, "message": "Your research 'Machine Learning in Education' has been approved",
      "researchId": 1, "opened": false, "createdAt": "2026-06-08T10:00:00.000Z"
    }
  ],
  "meta": { "total": 3, "page": 1, "limit": 20, "totalPages": 1 }
}
```

### PATCH /notifications/read

```json
// Request — specify IDs, or omit to mark all as read
{ "ids": [1, 2, 3] }

// Response 200
{ "message": "Notifications marked as read", "affected": 3 }
```

### PATCH /notifications/:id/read

```json
// Response 200
{ "message": "Notification marked as read" }
```

---

## Collections (Bookmarks)

| Endpoint | Auth | Method |
|---|---|---|
| `GET /collections` | ✅ Protected | `GET` |
| `POST /collections` | ✅ Protected | `POST` |
| `DELETE /collections/:researchId` | ✅ Protected | `DELETE` |

### GET /collections

```json
// Response 200
{
  "data": [
    { "researchId": 1, "title": "Machine Learning in Modern Education", "abstract": "This paper..." }
  ]
}
```

### POST /collections

```json
// Request
{ "researchId": 1 }

// Response 200
{ "message": "Added to collection" }
```

### DELETE /collections/:researchId

```json
// Response 200
{ "message": "Removed from collection" }
```

---

## PDF Requests

| Endpoint | Auth | Method |
|---|---|---|
| `POST /requests/pdf` | ❌ Public | `POST` |
| `GET /requests/pdf` | ✅ Protected | `GET` |
| `PATCH /requests/pdf/:id/approve` | ✅ Protected | `PATCH` |
| `PATCH /requests/pdf/:id/reject` | ✅ Protected | `PATCH` |

### POST /requests/pdf

```json
// Request
{
  "researchId": 1,
  "requesterName": "Alice Wang",
  "requesterEmail": "alice@example.com",
  "purpose": "Academic research"
}

// Response 201
{ "message": "PDF request submitted. Authors have been notified.", "requestId": 1 }
```

### GET /requests/pdf

```json
// Response 200
{
  "data": [
    {
      "id": 1, "researchId": 1, "researchTitle": "Machine Learning in Modern Education",
      "requesterName": "Alice Wang", "requesterEmail": "alice@example.com",
      "purpose": "Academic research", "status": "pending",
      "createdAt": "2026-06-09T00:00:00.000Z"
    }
  ]
}
```

### PATCH /requests/pdf/:id/approve

```json
// Response 200
{ "message": "Request approved. PDF has been sent to requester's email." }
```

### PATCH /requests/pdf/:id/reject

```json
// Request
{ "reason": "This paper is currently under review for journal publication." }

// Response 200
{ "message": "Request rejected. Requester has been notified." }
```

---

## Admin

All admin endpoints require `role: "admin"`.

| Endpoint | Method |
|---|---|
| `GET /admin/researches/pending?page=1&limit=20` | `GET` |
| `GET /admin/researches/rejected?page=1&limit=20` | `GET` |
| `PATCH /admin/researches/:id/approve` | `PATCH` |
| `PATCH /admin/researches/:id/reject` | `PATCH` |
| `GET /admin/uploader-stats` | `GET` |
| `GET /admin/categories` | `GET` |
| `POST /admin/categories` | `POST` |
| `PATCH /admin/categories/:id` | `PATCH` |
| `DELETE /admin/categories/:id` | `DELETE` |
| `GET /admin/keywords` | `GET` |
| `POST /admin/keywords` | `POST` |
| `PATCH /admin/keywords/:id` | `PATCH` |
| `DELETE /admin/keywords/:id` | `DELETE` |
| `GET /admin/institutions` | `GET` |
| `POST /admin/institutions` | `POST` |
| `PATCH /admin/institutions/:id` | `PATCH` |
| `DELETE /admin/institutions/:id` | `DELETE` |

### GET /admin/researches/pending

```json
// Response 200 — paginated list of pending researches
{ "data": [...], "meta": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 } }
```

### PATCH /admin/researches/:id/approve

```json
// Response 200
{ "message": "Research approved successfully" }
```

### PATCH /admin/researches/:id/reject

```json
// Request
{ "reason": "Insufficient methodology section. Please revise and resubmit." }

// Response 200
{ "message": "Research rejected. Notification sent to uploader." }
```

### GET /admin/uploader-stats

```json
// Response 200
{
  "data": [
    { "roleId": 1, "uploads": 25 },
    { "roleId": 2, "uploads": 100 },
    { "roleId": 3, "uploads": 15 }
  ]
}
```

### CRUD: Categories / Keywords / Institutions

All follow the same pattern:

```json
// GET /admin/categories
{ "data": [{ "id": 1, "name": "Education" }, { "id": 2, "name": "Technology" }] }

// POST /admin/categories — body: { "name": "Biology" }
{ "id": 3, "name": "Biology" }

// PATCH /admin/categories/3 — body: { "name": "Life Sciences" }
{ "message": "Category updated" }

// DELETE /admin/categories/3
{ "message": "Category deleted" }
```

---

## Reference Data (Public)

| Endpoint | Method |
|---|---|
| `GET /roles` | `GET` |
| `GET /programs` | `GET` |
| `GET /authors?page=1&limit=50&search=john` | `GET` |
| `GET /authors/:id` | `GET` |
| `GET /authors/:id/researches?page=1&limit=10` | `GET` |

### GET /roles

```json
{ "data": [{ "id": 1, "name": "admin" }, { "id": 2, "name": "ncf_user" }, { "id": 3, "name": "non_ncf_user" }] }
```

### GET /programs

```json
{ "data": [{ "id": 1, "name": "BS Computer Science" }] }
```

### GET /authors

```json
// Response 200
{
  "data": [
    { "id": 1, "name": "John Doe", "email": "john@example.com", "documentCount": 3 }
  ],
  "meta": { "total": 50, "page": 1, "limit": 50, "totalPages": 1 }
}
```

### GET /authors/:id

```json
// Response 200
{ "id": 1, "name": "John Doe", "email": "john@example.com" }
```

### GET /authors/:id/researches

```json
// Response 200 — paginated list of author's approved researches
{ "data": [...], "meta": { "total": 5, "page": 1, "limit": 10, "totalPages": 1 } }
```

---

## Next.js Integration Patterns

### Auth Context Provider

```typescript
// lib/auth.ts
export async function login(email: string, password: string) {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await res.json().then((d) => d.error));
  return res.json(); // { accessToken, refreshToken, user }
}

export async function refreshToken(token: string) {
  const res = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token }),
  });
  if (!res.ok) throw new Error('Session expired');
  return res.json(); // { accessToken, refreshToken }
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const accessToken = localStorage.getItem('accessToken');
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (res.status === 401) {
    // Try refresh
    const refreshTokenVal = localStorage.getItem('refreshToken');
    if (!refreshTokenVal) throw new Error('No refresh token');
    const { accessToken: newAccess, refreshToken: newRefresh } = await refreshToken(refreshTokenVal);
    localStorage.setItem('accessToken', newAccess);
    localStorage.setItem('refreshToken', newRefresh);
    // Retry
    return fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${newAccess}`, 'Content-Type': 'application/json' },
    });
  }
  return res;
}
```

### Protected Layout (Next.js App Router)

```typescript
// app/(dashboard)/layout.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setUser)
      .catch(() => router.push('/login'));
  }, []);

  return user ? children : <div>Loading...</div>;
}
```

### File Upload

```typescript
// app/researches/create/page.tsx
'use client';
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  const formData = new FormData();
  formData.append('file', pdfFile);
  formData.append('title', title);
  formData.append('authors', JSON.stringify(authors));
  formData.append('categories', JSON.stringify(categories));

  await fetch('/api/v1/researches', {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    body: formData,
  });
}
```
