# Security Specification: Patient Portal & Booking Engine

This document details the security assertions, invariant schemas, and negative testing payloads ("Dirty Dozen") designed to stress-test the Zero-Trust Firestore Security posture of Vitalis Health Portal.

## 1. Core Data Invariants

1. **User Ownership**:
   - A user profile under `/users/{userId}` can only be read, created, or updated by the user whose authenticated `request.auth.uid` matches `{userId}` exactly.
   - Profile deletion is disabled as profiles are permanent archival healthcare entities.

2. **Appointment Identity**:
   - Outpatient records can be booked in two modes: authenticated patient or unauthenticated guest.
   - If authenticated, the document's `userId` field MUST match the request initiator's authenticated UID.
   - An appointment booked by a patient under their UID cannot be listed, read, modified, or deleted by any other user.

3. **Immutable Auditing Constraints**:
   - Both profiles and appointments contain a `createdAt` timestamp. Once recorded, this field cannot be updated under any circumstances.
   - The original document ID (`id` or `uid`) is strictly immutable.

4. **Action-Based Transitions (State Locking)**:
   - Status transitions are limited to changing the `status` field strictly and exclusively.
   - Only the values `'Confirmed'` or `'Cancelled'` are allowed for status operations.
   - Users cannot inject shadow elements (e.g., modifying patient email, doctor IDs, date, or appointment notes) during cancellation requests.

---

## 2. The "Dirty Dozen" Payloads (Aesthetic Anti-Patterns)

The following JSON payloads are engineered to attempt bypasses on authentication, integrity bounds, or structural locks. All must return `PERMISSION_DENIED`.

### Pillar 1: Identity Spoofing & Profiling
#### Payload 1: Hijack Profile Creation (Cross-User Write)
- Attempting to write a profile under User B's UID while logged in as User A.
```json
{
  "path": "/users/user_B_uid",
  "auth": { "uid": "user_A_uid" },
  "data": {
    "uid": "user_B_uid",
    "name": "Intruder User",
    "createdAt": "2026-06-23T00:00:00.000Z"
  }
}
```

#### Payload 2: Self-Promotion (Profile Spoofing)
- Attempting to set an admin role field (unsupported field injection) inside user profile.
```json
{
  "path": "/users/user_A_uid",
  "auth": { "uid": "user_A_uid" },
  "data": {
    "uid": "user_A_uid",
    "name": "Spoofed User",
    "isAdmin": true,
    "createdAt": "2026-06-23T00:00:00.000Z"
  }
}
```

### Pillar 2: Appointment Authentication Hijacking
#### Payload 3: Authenticated Account as Guest Double
- Trying to book an appointment with `userId` = `null` when actually logged in, hoping to hide account audit links.
```json
{
  "path": "/appointments/APT-999999",
  "auth": { "uid": "patient_A_uid" },
  "data": {
    "id": "APT-999999",
    "userId": null,
    "patientName": "Fake Guest",
    "patientPhone": "1234567890",
    "patientEmail": "guest@test.com",
    "doctorId": "doc-1",
    "doctorName": "Dr. House",
    "departmentId": "diagnostics",
    "departmentName": "Diagnostics",
    "date": "2026-06-24",
    "timeSlot": "09:00 AM",
    "status": "Confirmed",
    "createdAt": "2026-06-23T00:00:00.000Z"
  }
}
```

#### Payload 4: Booking on Behalf of Another Patient
- Logging in as Patient A, but writing Patient B's UID into the `userId` field to register charges or history onto B.
```json
{
  "path": "/appointments/APT-888888",
  "auth": { "uid": "patient_A_uid" },
  "data": {
    "id": "APT-888888",
    "userId": "patient_B_uid",
    "patientName": "Patient B",
    "patientPhone": "9999999999",
    "patientEmail": "patientB@clinic.com",
    "doctorId": "doc-1",
    "doctorName": "Dr. House",
    "departmentId": "diagnostics",
    "departmentName": "Diagnostics",
    "date": "2026-06-24",
    "timeSlot": "09:00 AM",
    "status": "Confirmed",
    "createdAt": "2026-06-23T00:00:00.000Z"
  }
}
```

### Pillar 3: Schema Poisoning & Resource Exhaustion (Denial-of-Wallet)
#### Payload 5: Bloated String Sizing (ID Poisoning)
- Writing a 10KB string into the `id` or `patientName` field to overload disk consumption and drive up query scanning costs.
```json
{
  "path": "/appointments/APT-777777",
  "auth": { "uid": "patient_A_uid" },
  "data": {
    "id": "APT-777777",
    "userId": "patient_A_uid",
    "patientName": "LOOOOOOOOOOOOOOOOOOOOOOONG_STRING(10KB)...",
    "patientPhone": "9999999999",
    "patientEmail": "patientA@clinic.com",
    "doctorId": "doc-1",
    "doctorName": "Dr. House",
    "departmentId": "diagnostics",
    "departmentName": "Diagnostics",
    "date": "2026-06-24",
    "timeSlot": "09:00 AM",
    "status": "Confirmed",
    "createdAt": "2026-06-23T00:00:00.000Z"
  }
}
```

#### Payload 6: Invalid Email Formatting Injection
- Bypassing syntactic checks by supplying numeric integers or maps into text fields.
```json
{
  "path": "/appointments/APT-666666",
  "auth": { "uid": "patient_A_uid" },
  "data": {
    "id": "APT-666666",
    "userId": "patient_A_uid",
    "patientName": "Patient A",
    "patientPhone": "99912",
    "patientEmail": { "malicious_nested_object": "hack" },
    "doctorId": "doc-1",
    "doctorName": "Dr. House",
    "departmentId": "diagnostics",
    "departmentName": "Diagnostics",
    "date": "2026-06-24",
    "timeSlot": "09:00 AM",
    "status": "Confirmed",
    "createdAt": "2026-06-23T00:00:00.000Z"
  }
}
```

### Pillar 4: Shadow Update Attacks (The "Anti-Update-Gap")
#### Payload 7: Update-Gap Poisoning (Modifying Medical Logs During Cancellation)
- Patient attempts to cancel their slot but quietly alters the target Doctor ID and Appointment Notes as well.
```json
{
  "path": "/appointments/APT-511521",
  "auth": { "uid": "patient_A_uid" },
  "existing_data": {
    "id": "APT-511521",
    "userId": "patient_A_uid",
    "patientName": "Patient A",
    "patientPhone": "9999999999",
    "patientEmail": "patientA@clinic.com",
    "doctorId": "doc-1",
    "doctorName": "Dr. House",
    "departmentId": "diagnostics",
    "departmentName": "Diagnostics",
    "date": "2026-06-24",
    "timeSlot": "09:00 AM",
    "status": "Confirmed",
    "createdAt": "2026-06-23T00:00:00.000Z"
  },
  "update_data": {
    "doctorId": "malicious-doc-99",
    "doctorName": "Malicious Attacker",
    "status": "Cancelled"
  }
}
```

#### Payload 8: Immutable Metadata Manipulation (createdAt Mutation)
- An attacker tries to reset or backdate the appointment creation date.
```json
{
  "path": "/appointments/APT-511521",
  "auth": { "uid": "patient_A_uid" },
  "existing_data": {
    "id": "APT-511521",
    "userId": "patient_A_uid",
    "patientName": "Patient A",
    "createdAt": "2026-06-23T00:00:00.000Z"
  },
  "update_data": {
    "createdAt": "2000-01-01T00:00:00.000Z",
    "status": "Cancelled"
  }
}
```

### Pillar 5: Path Variable ID Poisoning
#### Payload 9: Invalid Character Path Injection
- Attempting to bypass path rules using control sequences or special characters in appointment document ID.
```json
{
  "path": "/appointments/APT$$$--HACKED",
  "auth": { "uid": "patient_A_uid" },
  "data": {
    "id": "APT$$$--HACKED",
    "userId": "patient_A_uid",
    "patientName": "Patient A",
    "patientPhone": "1234567890",
    "patientEmail": "pat@a.com",
    "doctorId": "doc-1",
    "doctorName": "Dr. House",
    "departmentId": "diagnostics",
    "departmentName": "Diagnostics",
    "date": "2026-06-24",
    "timeSlot": "09:00 AM",
    "status": "Confirmed",
    "createdAt": "2026-06-23T00:00:00.000Z"
  }
}
```

### Pillar 6: Unauthorized Listing & Collection Scraping
#### Payload 10: General Query Scrape (Delegating Security to Client)
- Querying `/appointments` without matching `userId` filter constraints, attempting to read all bookings on the platform.
```json
{
  "query": "/appointments",
  "auth": { "uid": "patient_A_uid" },
  "action": "list"
}
```

#### Payload 11: Cross-User Document Peek
- Attempting to execute a `get` document request directly on User B's private medical booking metadata by guessing its ID.
```json
{
  "path": "/appointments/APT-USERB-111",
  "auth": { "uid": "patient_A_uid" },
  "existing_data": {
    "id": "APT-USERB-111",
    "userId": "patient_B_uid"
  },
  "action": "get"
}
```

### Pillar 7: Deletion Safeguards
#### Payload 12: Anonymous/Unlogged User Deleting Live Bookings
- Trying to remove appointment logs as an unauthorized or unlogged guest actor.
```json
{
  "path": "/appointments/APT-511521",
  "auth": null,
  "existing_data": {
    "id": "APT-511521",
    "userId": "patient_A_uid"
  },
  "action": "delete"
}
```

---

## 3. Security Rule Integration Validation Report

| Matrix Area | Risk Vector / Attack Vector | Defensive Helper Guard Logic | Status |
| :--- | :--- | :--- | :--- |
| **Authentication** | Request Spoofing / Identity Theft | `request.auth.uid == userId` & `existing().userId == request.auth.uid` | **SECURED** |
| **Integrity Bounds** | Resource Overrun / 1MB bloat strings | `.size() <= N` bounds on clinical string attributes | **SECURED** |
| **Integrity Constraints** | Key Injection & Schema Mutations | Maps verification with `.diff().affectedKeys()` constraints | **SECURED** |
| **Temporal Flow**| Read Back-Dating or Forward-Offsetting | `createdAt` and `uid` made immutable upon first document storage | **SECURED** |
