## [TASK-04,05,06] 2026-03-28 — Core Utilities: contactMapper, writeContact, pagination

### Thay đổi kỹ thuật

**TASK-04 — contactMapper.js + searchTokens.js**
- Tạo mới `functions/utils/searchTokens.js`:
  - `normalize(str)` — lowercase + NFD strip diacritics (hỗ trợ tiếng Việt: ễ, ă, ơ, ...)
  - `tokensFromText(text)` — prefix ngrams từ min 2 chars, bỏ 1-char
  - `buildSearchTokens({displayName, organization, primaryEmail, allEmails})` — dedup + sorted
- Tạo mới `functions/utils/contactMapper.js`:
  - `buildContactDocs(contactJson, options)` — transform về `{contactId, indexDoc, detailDoc, emailLookupDocs, udKeyUpdates}`
  - Hỗ trợ 2 input format: wrapped `{contact:{...}, userDefined:{...}}` và flat `{displayName, emails, ...}`
  - `encodeDocId(key)` — encode `.` → `,` cho Firestore document IDs
  - `extractEmails()`, `extractPhones()`, `extractDisplayName()`, `extractUdKeys()` — các helper extract fields
  - allEmails: dedup + lowercase; allDomains: extract domain từ mỗi email
  - Auto-generate contactId bằng `nanoid(12)` nếu không truyền
- Tạo mới `tests/contactMapper.test.js` — 35 unit tests, 100% pass

**TASK-05 — writeContact.js**
- Tạo mới `functions/utils/writeContact.js`:
  - `writeContact(contactJson, options)` — 1 Firestore batch: set index, set detail, delete cũ email_lookup, set mới email_lookup, arrayRemove cũ ud_key_lookup, arrayUnion mới ud_key_lookup
  - `deleteContact(contactId)` — đọc index → batch delete index + detail + email_lookups + arrayRemove ud_key_lookups
  - `bulkWriteContacts(array, {concurrency, onProgress})` — Promise.allSettled với chunk size 5
  - isUpdate=true: đọc allEmails + userDefinedKeys cũ để cleanup diff trước khi write
  - FieldValue.increment(-1/+1) trên ud_key_lookup.count

**TASK-06 — pagination.js**
- Tạo mới `functions/utils/pagination.js`:
  - `encodeCursor(docId)` / `decodeCursor(cursor)` — base64url
  - `parseQueryParams(req.query)` — validate + normalize: search, category, domain, email, udKey, hasUD, sort, order, limit (max 200), cursor
  - `buildQuery(params)` — Firestore query builder với ưu tiên filter: search > email > udKey > category > domain; support combo category+udKey
  - `paginateQuery(params)` — fetch limit+1, startAfter snapshot, trả `{data, nextCursor, hasMore, count}`
  - `buildListResponse()` — format response chuẩn với meta object

### Lý do
- TASK-04: Prerequisite cho mọi thứ — import script, write operations, API routes đều dùng contactMapper
- TASK-05: Đảm bảo 4 collections luôn consistent — không bao giờ write 1 collection mà thiếu collection kia
- TASK-06: Cursor pagination giải quyết vấn đề quota — offset-based là O(n) reads với Firestore

---

## [TASK-01,02,03] 2026-03-28 — Khởi tạo Firebase, Dependencies & Security Rules

### Thay đổi kỹ thuật

**TASK-01 — Firebase Admin SDK init**
- Tạo mới `functions/utils/firebase-admin.js` — singleton pattern, lazy init
  - Hỗ trợ 2 cách auth: `FIREBASE_SERVICE_ACCOUNT_PATH` hoặc `GOOGLE_APPLICATION_CREDENTIALS`
  - Fallback sang Application Default Credentials (dùng được trên Cloud Functions/Cloud Run)
  - Export: `getFirestore()`, `getRtdb()`, `FieldValue`, `Timestamp`, `admin`
- Tạo mới `firebase.json` — cấu hình Firestore rules/indexes, Realtime DB rules, Functions runtime nodejs18, Emulators (ports: auth 9099, functions 5001, firestore 8080, db 9000, ui 4000)
- Tạo mới `.env.example` — template biến môi trường với hướng dẫn

**TASK-02 — Dependencies & Project Structure**
- Tạo mới `package.json`:
  - Dependencies: `firebase-admin@^12`, `express@^4`, `nanoid@^3`, `cors@^2`, `dotenv@^16`
  - DevDependencies: `eslint@^8`, `jest@^29`, `nodemon@^3`
  - Scripts: `start`, `dev`, `test`, `lint`, `import`, `migrate`, `create-key`, `deploy:rules`, `deploy`
  - Jest config: testMatch `tests/**/*.test.js`
  - ESLint config inline (node + es2022)
- Cập nhật `.gitignore` — thêm Firebase debug logs, `.firebase/`, bổ sung pattern secrets
- Tạo cấu trúc thư mục:
  - `functions/routes/`, `functions/middleware/`, `functions/utils/`
  - `scripts/`, `docs/`, `tests/`
- Tạo placeholder files (TASK-04~06): `contactMapper.js`, `searchTokens.js`, `writeContact.js`, `pagination.js`

**TASK-03 — Firestore Security Rules & Indexes**
- Tạo mới `firestore.rules` — chặn toàn bộ client-side read/write (`allow read, write: if false`); Admin SDK bypass rules → chỉ backend được truy cập
- Tạo mới `firestore.indexes.json` — 7 composite indexes:
  1. `searchTokens CONTAINS` + `updatedAt DESC`
  2. `categories CONTAINS` + `updatedAt DESC`
  3. `allEmails CONTAINS` + `updatedAt DESC`
  4. `allDomains CONTAINS` + `updatedAt DESC`
  5. `userDefinedKeys CONTAINS` + `updatedAt DESC`
  6. `categories CONTAINS` + `userDefinedKeys CONTAINS` + `updatedAt DESC`
  7. `emailDomain ASC` + `displayName ASC`
- Tạo mới `database.rules.json` — chặn toàn bộ client access cho: `api_keys`, `sync_status`, `import_jobs`

### Lý do
- Foundation cho toàn bộ project — các TASK tiếp theo đều phụ thuộc vào nhóm này
- Admin SDK singleton tránh khởi tạo nhiều lần trong môi trường Cloud Functions
- Rules bảo vệ data ngay từ đầu — không để lộ Firestore khi test
- 7 indexes đủ để support tất cả query patterns trong `docs/database-architecture.md` section 5

---

## [TASK-00] 2026-03-28 — Khởi tạo dự án & Lên kế hoạch

### Thay đổi kỹ thuật
- Tạo mới `project_task.md` — danh sách 16 tasks với dependency graph, trạng thái, output files
- Tạo mới `template-task.md` — quy trình chuẩn cho agent thực hiện tasks
- Tạo mới `project_memory.md` — context toàn bộ project cho agent
- Tạo mới `Readme.md` — tài liệu dự án
- Tạo mới `CHANGE_LOGS.md` (file này)
- Tạo mới `CHANGE_LOGS_USER.md`
- Phân tích `docs/database-architecture.md` và chia nhỏ thành 16 tasks
- Xác định 6 nhóm task (Foundation, Core Utils, API Routes, Middleware, Scripts, Testing)
- Xây dựng dependency graph và nhóm song song

### Lý do
- Khởi tạo dự án từ tài liệu kiến trúc có sẵn
- Cần kế hoạch chi tiết để thực hiện tuần tự và song song hiệu quả

---
