# Firebase Admin Auth Setup

## 1. Authentication
- In Firebase Console, open Authentication.
- Enable Email/Password sign-in.
- Create each admin user with email and password.

## 2. Firestore admins collection
Create a collection named `admins`.
For each admin user, create a document whose ID equals the Firebase Authentication `uid`.
Use this structure:

```json
{
  "displayName": "Admin Name",
  "employeeId": "EMP001",
  "email": "admin@example.com",
  "role": "admin",
  "active": true
}
```

## 3. Firestore rules
This project now uses `firestore.rules`.
Deploy with:

```bash
firebase deploy --only firestore:rules
```

## 4. Storage rules
This project now also includes `storage.rules`.
Deploy with:

```bash
firebase deploy --only storage
```

Current behavior is intentionally compatible with the existing frontend upload flow:
- public forms can upload attachments under `attachments/`
- only images and PDFs are allowed
- max file size is 10 MB
- update/delete is restricted to admins

Important:
- read is still open at the Storage rules level because the current frontend stores `getDownloadURL()` values in Firestore and uses them directly in admin review/print pages
- if you want attachments to become truly admin-only, the next migration step is to stop storing public download URLs and store storage paths instead

## 5. Admin login flow
- Open `admin-login.html`
- Sign in with the Firebase Authentication email/password
- Access is granted only if the corresponding `admins/{uid}` document exists and contains:
  - `role: "admin"`
  - `active: true`

## 6. Admin document example

Example document path:

```text
admins/<firebase-auth-uid>
```

Example document body:

```json
{
  "displayName": "Fatma Admin",
  "employeeId": "EMP001",
  "email": "admin@example.com",
  "role": "admin",
  "active": true
}
```

## 7. Important note
Current public forms still create documents in `formSubmissions` without authentication.
Admin read/update/delete is protected by Firestore rules.
Attachment uploads are size/type restricted by Storage rules, but attachment reads are not fully private yet because the app still persists public download URLs.
