# Legacy Data Inspection & PostgreSQL Migration Strategy

## 1. Existing Data Sources Inspected

### A. MongoDB Schemas (`server/models/`)
1. **`User` (`server/models/User.js`)**
   - `name` (String, required)
   - `email` (String, required, unique)
   - `password` (String, required, `bcryptjs` hash)
   - `role` (`'admin' | 'student'`, default `'student'`)
   - `phone` (String, optional)
   - `seatNumber` (String, optional)
   - `membershipPlan` (`'daily' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly'`)
   - `joinDate` (Date, default `Date.now`)
   - `status` (`'active' | 'inactive'`, default `'active'`)
   - `createdAt`, `updatedAt` (Timestamps)
2. **`Fee` (`server/models/Fee.js`)**
   - `studentId` (ObjectId ref `User`, required)
   - `month` (String, required, e.g. `"January 2026"`)
   - `amount` (Number, required)
   - `status` (`'paid' | 'pending' | 'overdue'`, default `'pending'`)
   - `paymentDate` (Date)
   - `paymentMethod` (`'cash' | 'upi' | 'card' | 'bank_transfer'`)
   - `createdAt`, `updatedAt` (Timestamps)

*Local Status:* `mongod` is not installed locally; `server/index.js` previously fell back to `mongodb-memory-server` (ephemeral), so no local persistent MongoDB database exists in the workspace.

### B. Firebase Firestore (`admin.js`, `script.js`, `firestore.rules`)
1. **`students` collection** (Document ID = numeric seat/student ID string):
   - `name` (String), `phone` (String), `seat` (Number `1..75`)
   - `admissionDate` (String `YYYY-MM-DD`), `durationMonths` (Number)
   - `seatStatus` (`'Reserved' | 'Available'` or legacy `status`)
   - `monthlyFee` (Number), `totalFees` (Number), `amountPaid` (Number), `remainingAmount` (Number)
   - `paymentStatus` (`'Paid' | 'Partial' | 'Unpaid'` or legacy `feesStatus`)
2. **`inquiries` collection**:
   - `name`, `phone`, `email`, `exam`, `date`, `timestamp`
3. **`localStorage` recovery keys** referenced in `admin.js`:
   - `shivaay_students`, `students`, `shivaay_library_students`.

---

## 2. Preservation & Migration Mapping to PostgreSQL (Prisma)

| Legacy Source | Legacy Entity / Field | Target PostgreSQL Table(s) | Migration Rule |
|---|---|---|---|
| MongoDB `User` | `name`, `email`, `password`, `role`, `phone`, `status` | `users`, `student_profiles`, `admin_profiles` | Normalize email to lowercase. Preserve existing `$2a$`/`$2b$` bcrypt hashes with a `passwordAlgo = 'BCRYPT_LEGACY'` flag and transparently re-hash to **Argon2id** upon the user's next successful login. |
| MongoDB `User` | `seatNumber`, `membershipPlan`, `joinDate` | `seats`, `memberships`, `bookings` | Match `seatNumber` to `seats.seatNumber`, create active/inactive `Membership` linked to seeded `MembershipPlan`. |
| MongoDB `Fee` | `studentId`, `month`, `amount`, `status`, `paymentDate`, `paymentMethod` | `payments` | Map `paid` -> `CAPTURED`, `pending` -> `PENDING`, `overdue` -> `FAILED`/`PENDING`; preserve original `paymentDate` & `amount` (in paise/INR) with `provider = 'LEGACY_MANUAL'`. |
| Firestore `students` | `seat`, `name`, `phone`, `admissionDate`, `durationMonths`, `monthlyFee`, `totalFees`, `amountPaid`, `remainingAmount`, `paymentStatus`, `seatStatus` | `users`, `student_profiles`, `seats`, `memberships`, `bookings`, `payments` | Generate deterministic placeholder email if absent (`student.<seat>.<phone>@migrated.shivaaylibrary.local`) and mark `mustChangePassword = true`. Compute `endDate = admissionDate + durationMonths`. Assign `Seat` status (`OCCUPIED` / `RESERVED` / `AVAILABLE`), create `Booking`, and record `amountPaid` in `payments`. |
| Firestore `inquiries` | `name`, `phone`, `email`, `exam`, `date`, `timestamp` | `inquiries` | Preserve original submission timestamp and contact details. |

## 3. Execution & Rollback Safety
1. Legacy MongoDB files (`server/models/User.js`, `server/models/Fee.js`) and legacy root HTML/Firebase files remain untouched during migration.
2. `server/scripts/migrate-legacy-data.js` runs inside Prisma transactions (`$transaction`), is idempotent (upsert by `email` / `legacySourceId`), and supports `--dry-run` before committing records.
3. No fake or dummy records are ever seeded into production (`seed.js` only creates `LibrarySettings`, physical `Seat` rows `1..75`, standard `MembershipPlan` definitions, and the configured initial Admin if none exists).
