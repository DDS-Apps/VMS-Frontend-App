# Backend Requirements — Visit Creation & Walk-In Registration

## 1. POST /api/v1/visits — Field Mapping Fix (HIGH PRIORITY)

### Current Problem
The frontend sends `CreateVisitPayload` to `POST /api/v1/visits` but gets HTTP 400:
```json
{
  "success": false,
  "message": "property date should not exist; property phone should not exist; property email should not exist",
  "error": "Validation Error",
  "statusCode": 400
}
```

### Frontend Payload Shape
```json
{
  "visitor": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+966501234567",
    "company": "Acme Corp"
  },
  "visitDate": "2026-07-14",
  "visitTime": "14:00",
  "endTime": "16:00",
  "duration": "2 hours",
  "purpose": "meeting",
  "communicationChannels": ["email", "qr_code"],
  "needsMeetingRoom": false,
  "needsBuffet": false
}
```

### Required Backend Changes
1. **Accept nested `visitor` object** with `fullName`, `email`, `phone`, `company`
2. **Accept `visitDate`** (not `date`)
3. **Accept `visitTime`** (map to internal `startTime` if needed)
4. **Accept `endTime`, `duration`, `purpose`, `communicationChannels`**
5. **Accept `needsMeetingRoom` and `needsBuffet`**
6. **Disable `forbidNonWhitelisted`** or whitelist all fields above
7. **Extract `hostId` from JWT token** (frontend does not send it)

---

## 2. POST /api/v1/reception/walk-in — Walk-In Registration Enhancements

### Current Frontend Payload
```json
{
  "visitorName": "John Doe",
  "visitorEmail": "john@example.com",
  "visitorCompany": "Acme Corp",
  "visitorPhone": "+966501234567",
  "hostId": "uuid",
  "hostName": "Jane Smith",
  "visitType": "general",
  "purpose": "general",
  "idType": "national_id",
  "idNumber": "1234567890"
}
```

### Required Backend Changes

#### A. ID Validation per Type
The backend must validate `idNumber` based on `idType`:

| ID Type | Validation Rule |
|---|---|
| `national_id` | Exactly 10 digits, numeric only |
| `iqama` | Max 10 digits, numeric only |
| `passport` | 6-12 alphanumeric characters (letters + numbers) |
| `driver_license` | Exactly 10 digits, numeric only |

If validation fails, return:
```json
{
  "success": false,
  "message": "Invalid ID number for the selected ID type",
  "error": "Validation Error",
  "statusCode": 400
}
```

#### B. Walk-In Status Flow — Host Approval Required

**Current:** Walk-ins are created with some default status.  
**Required:** Walk-ins must go through host approval.

**Status flow:**
1. Receptionist creates walk-in → status = `pending_host_approval`
2. Host receives notification/pending approval
3. Host approves → status = `walk_in_approved`
4. Host rejects → status = `rejected`

**Backend must:**
- Create walk-in with `status: "pending_host_approval"`
- Generate a notification to the host
- Support `POST /api/v1/visits/:id/host-approve` for host approval (already exists)
- Support `POST /api/v1/visits/:id/host-reject` for host rejection (already exists)
- Include `idType` and `idNumber` in the walk-in record/response

#### C. Phone as Primary Identifier
- `visitorPhone` is **required** for walk-ins
- `visitorEmail` is optional (secondary)
- Backend should normalize phone numbers (strip non-digits) for deduplication

#### D. No Duplicate Walk-Ins
- Same phone + same date → reject with duplicate error
- Same ID number + same date → reject with duplicate error
- Return existing visit details in error response

---

## 3. GET /api/v1/visits — Duplicate Check Endpoint

### Current Query Params
```
GET /api/v1/visits?date=2026-07-14&phone=+966501234567&email=john@example.com
```

### Required Changes
1. **Phone is primary identifier** — query by phone first
2. Check for active visits on the same date: `pending`, `pending_approval`, `approved`, `visitor_accepted`, `expected`, `checked_in`
3. Return matching visits so frontend can block creation

---

## 4. Notifications for Host Approval

When a walk-in is created with `pending_host_approval`:
1. Send push notification to host
2. Include visit ID, visitor name, and walk-in flag
3. Deep link to approval screen

---

## 5. Response Format Consistency

All endpoints should return errors in this format:
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Error category",
  "statusCode": 400,
  "details": { "field": "fieldName" }
}
```

---

## Test Checklist

- [ ] `POST /api/v1/visits` with full payload succeeds (no 400)
- [ ] Walk-in with invalid National ID (not 10 digits) → rejected
- [ ] Walk-in with invalid Iqama (11+ digits) → rejected
- [ ] Walk-in with invalid Passport (< 6 chars) → rejected
- [ ] Walk-in with invalid Driver's License (not 10 digits) → rejected
- [ ] Valid walk-in created with `pending_host_approval` status
- [ ] Host can approve walk-in via `POST /api/v1/visits/:id/host-approve`
- [ ] Host can reject walk-in via `POST /api/v1/visits/:id/host-reject`
- [ ] Duplicate walk-in (same phone + same date) → blocked
- [ ] Phone normalization: `+966501234567` and `0501234567` match
- [ ] `GET /api/v1/visits?date=...&phone=...` returns active visits
