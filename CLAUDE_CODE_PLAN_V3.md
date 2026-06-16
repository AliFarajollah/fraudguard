# FraudGuard — Real-World Features Plan v3
# All features justified by actual banking/fintech industry requirements
# Based on repo state at github.com/AliFarajollah/fraudguard (June 2026)

---

## CONTEXT

FraudGuard already has the core fraud detection workflow. This plan adds the
features that separate a "student project" from a "production-grade platform."
Every feature listed here exists in real commercial fraud platforms like
Feedzai, Sift Science, Stripe Radar, and NICE Actimize.

Each feature has:
- What it is
- Why it exists in real banking systems (the regulation or business need)
- What thesis criterion it strengthens
- Exact implementation spec for the agent

DO NOT TOUCH any existing working code. Only add new files and endpoints.

---

## NEW DATABASE ENTITIES

### Entity 1: AuditLog

```typescript
// api/src/audit/entities/audit-log.entity.ts
@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'user_id', nullable: true })
  userId: number | null;

  @Column({ type: 'varchar', length: 50 })
  action: string;
  // Examples: 'USER_LOGIN', 'TRANSACTION_SCORED', 'REVIEW_SUBMITTED',
  //           'USER_REGISTERED', 'BULK_UPLOAD', 'CSV_EXPORTED', 'THRESHOLD_UPDATED'

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'entity_type' })
  entityType: string | null;
  // Examples: 'transaction', 'prediction', 'review', 'user'

  @Column({ type: 'int', nullable: true, name: 'entity_id' })
  entityId: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
  // Flexible storage: { amount: 149.62, fraudProbability: 0.94 } etc.

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

### Entity 2: TransactionComment

```typescript
// api/src/comments/entities/transaction-comment.entity.ts
@Entity({ name: 'transaction_comments' })
export class TransactionComment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ name: 'transaction_id' })
  transactionId: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  authorId: number;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

### Entity 3: AlertSettings (extend User entity OR separate table)

Add these columns to the existing User entity via a separate settings table:

```typescript
// api/src/alert-settings/entities/alert-settings.entity.ts
@Entity({ name: 'alert_settings' })
export class AlertSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  // Fraud probability threshold (0.0-1.0). Transactions above this are "high alert"
  @Column({ type: 'numeric', precision: 3, scale: 2, name: 'fraud_threshold', default: 0.8 })
  fraudThreshold: number;

  // Whether to show browser notification badges
  @Column({ type: 'boolean', name: 'notifications_enabled', default: true })
  notificationsEnabled: boolean;

  // Email alerts (stored but not sent — acknowledged in thesis as future work)
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'alert_email' })
  alertEmail: string | null;

  @Column({ type: 'timestamptz', name: 'updated_at', nullable: true })
  updatedAt: Date;
}
```

---

## BACKEND MODULES TO BUILD

### Module 1: Audit Log

**Why it exists:** Banking regulations including PSD2 (Payment Services Directive 2),
GDPR Article 30, and Basel III operational risk frameworks all require financial
institutions to maintain complete audit trails of who did what and when.
Without an audit log, a fraud platform is not regulatory-compliant.

**Files to create:**
```
api/src/audit/
├── entities/audit-log.entity.ts
├── audit.service.ts
├── audit.controller.ts
└── audit.module.ts
```

**AuditService methods:**
```typescript
// log(action, userId?, entityType?, entityId?, metadata?, ipAddress?) → AuditLog
// findAll(page, limit, action?, userId?, entityType?) → paginated results
// findByEntity(entityType, entityId) → all actions on a specific entity
```

**AuditController endpoints:**
```
GET /audit                          → paginated activity feed (admin only)
GET /audit/my                       → current user's own activity
GET /audit/entity/:type/:id         → all actions on transaction/prediction/review
```

**Where to inject AuditService (add to existing modules):**
In TransactionsService.scoreOne:     log('TRANSACTION_SCORED', userId, 'transaction', id, { amount, fraudProbability })
In ReviewsService.create:            log('REVIEW_SUBMITTED', analystId, 'review', id, { decision })
In AuthService.login:                log('USER_LOGIN', userId, 'user', userId)
In AuthService.register:             log('USER_REGISTERED', userId, 'user', userId)
In TransactionsService.scoreBulk:    log('BULK_UPLOAD', userId, null, null, { count })

To inject without circular dependencies: inject AuditService directly into each
service that needs it. Register AuditModule as global or export AuditService.

---

### Module 2: Transaction Comments

**Why it exists:** In real fraud operations, multiple analysts work shifts.
An analyst who investigates a transaction at 9am needs to leave notes for the
analyst reviewing it at 3pm. Without case notes, knowledge is lost between shifts.
NICE Actimize and Feedzai both have this as a core feature.

**Files to create:**
```
api/src/comments/
├── dto/create-comment.dto.ts
├── entities/transaction-comment.entity.ts
├── comments.service.ts
├── comments.controller.ts
└── comments.module.ts
```

**CommentsController endpoints:**
```
POST /transactions/:id/comments     → add a comment to a transaction (JWT required)
GET  /transactions/:id/comments     → get all comments for a transaction (JWT required)
DELETE /comments/:id                → delete own comment (admin can delete any)
```

**DTO:**
```typescript
export class CreateCommentDto {
  @ApiProperty({ example: 'Transaction matches pattern from fraud ring #FG-2024-041' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  content: string;
}
```

**Note:** The TransactionDetailPage on the frontend needs a comments panel.
Add this to the existing TransactionDetailPage as Panel 4 at the bottom.

---

### Module 3: Alert Settings

**Why it exists:** Different financial institutions have different risk tolerances.
A retail bank may flag everything above 0.7. An investment bank may only care
about transactions above 0.95. Configurable thresholds are standard in every
real fraud platform. This is the "business rules" layer.

**Files to create:**
```
api/src/alert-settings/
├── dto/update-alert-settings.dto.ts
├── entities/alert-settings.entity.ts
├── alert-settings.service.ts
├── alert-settings.controller.ts
└── alert-settings.module.ts
```

**AlertSettingsController endpoints:**
```
GET  /alert-settings/me             → get current user's settings
PUT  /alert-settings/me             → update current user's settings
GET  /alert-settings/global         → get platform-wide default (admin only)
PUT  /alert-settings/global         → update platform-wide default (admin only)
```

**DTO:**
```typescript
export class UpdateAlertSettingsDto {
  @ApiPropertyOptional({ example: 0.8, minimum: 0.1, maximum: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  fraudThreshold?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @ApiPropertyOptional({ example: 'analyst@bank.com' })
  @IsOptional()
  @IsEmail()
  alertEmail?: string;
}
```

**Integration with predictions:** In PredictionsService, when checking flagged
predictions, compare `fraudProbability` against the user's `fraudThreshold`
rather than the hardcoded 0.5. This makes "flagged" dynamic per user.

---

### Extend existing endpoints

**Extend TransactionsController — search and filter:**

Update `GET /transactions` to accept additional query params:
```
?minAmount=100          → filter by minimum amount
?maxAmount=500          → filter by maximum amount
?startDate=2026-01-01   → filter by date range start
?endDate=2026-04-30     → filter by date range end
?minProbability=0.7     → filter by fraud probability threshold
?maxProbability=1.0     → filter by fraud probability upper bound
?search=149             → search by amount (partial match)
```

All filters are optional and combinable. Update TransactionsService.findAll
to build a TypeORM query with dynamic WHERE clauses using QueryBuilder.

**Add export endpoint to TransactionsController:**
```
GET /transactions/export            → returns CSV file
```

Response: Content-Type: text/csv, Content-Disposition: attachment; filename="fraudguard_transactions_{date}.csv"

CSV columns: id, amount, occurred_at, status, fraud_probability, predicted_label, model_version, decision, reviewer, reviewed_at

Implementation:
```typescript
@Get('export')
@UseGuards(JwtAuthGuard)
@Header('Content-Type', 'text/csv')
@Header('Content-Disposition', 'attachment; filename="transactions.csv"')
async exportCsv(@Res() res: Response) {
  const data = await this.transactionsService.findAllForExport();
  // Build CSV string manually (no library needed):
  const header = 'id,amount,occurred_at,status,fraud_probability,predicted_label,decision\n';
  const rows = data.map(t =>
    `${t.id},${t.amount},${t.occurredAt},${t.status},` +
    `${t.prediction?.fraudProbability ?? ''},${t.prediction?.predictedLabel ?? ''},` +
    `${t.review?.decision ?? ''}`
  ).join('\n');
  res.send(header + rows);
}
```

**Add model performance endpoint to PredictionsController:**
```
GET /predictions/performance        → model performance metrics over time
```

Returns:
```json
{
  "daily": [
    { "date": "2026-04-21", "total": 45, "flagged": 8, "confirmed_fraud": 5, "false_positive": 3 }
  ],
  "precision": 0.625,
  "recall": 0.867,
  "total_reviewed": 20
}
```

This endpoint computes real precision/recall from analyst feedback (reviews),
not just from the initial model metrics. This is the "model in production"
story that Pack&Go cannot match.

**Add SLA endpoint to ReviewsController:**
```
GET /reviews/sla                    → average time from scoring to review
```

Returns:
```json
{
  "avg_hours_to_review": 4.2,
  "under_1h": 3,
  "under_4h": 8,
  "under_24h": 12,
  "over_24h": 2
}
```

Computed by: `reviewedAt - prediction.createdAt` for each reviewed prediction.
SLA tracking is a real operational requirement in fraud departments.

**Add user profile endpoint to UsersController:**
```
GET  /users/me                      → get own profile
PATCH /users/me                     → update own profile (change password)
GET  /users/me/activity             → own recent activity from audit log
```

DTO for password change:
```typescript
export class UpdateProfileDto {
  @IsOptional()
  @MinLength(8)
  currentPassword?: string;

  @IsOptional()
  @MinLength(8)
  newPassword?: string;
}
```

---

## FRONTEND PAGES AND COMPONENTS TO BUILD

### Page 1: ProfilePage (`/profile`)

**Why it exists:** Every authenticated application allows users to manage
their own account. Without this, the authentication system feels incomplete.

**Layout:**
```
[NavBar]

[Profile header: avatar initial, email, role badge, member since date]

[Card 1 — Account Information]
  Email: test@example.com (read-only — shown with edit icon)
  Role: Analyst (read-only — only admin can change)
  Member since: April 21, 2026

[Card 2 — Change Password]
  Current password: [__________]
  New password: [__________]
  Confirm new password: [__________]
  [Save Changes button]
  - validate: newPassword === confirmPassword
  - validate: newPassword length >= 8
  - call PATCH /users/me on submit

[Card 3 — Alert Settings]
  Fraud Threshold: [slider 0.1 → 1.0, default 0.8]
  "Transactions above this probability are flagged for your review"
  Notifications enabled: [toggle]
  Alert email: [text input, optional]
  [Save Settings button]
  - call PUT /alert-settings/me on submit

[Card 4 — My Recent Activity]
  Table showing last 10 actions from GET /users/me/activity:
  Action | Entity | Date
  Reviewed Transaction #42 | confirmed_fraud | 2026-04-21 14:30
  Uploaded 20 transactions | bulk_upload | 2026-04-21 10:00
  Logged in | - | 2026-04-21 09:45
```

---

### Page 2: AuditLogPage (`/audit`) — admin only

**Why it exists:** Compliance officers and system administrators need to see
every action taken in the system for regulatory reporting and security auditing.

**Layout:**
```
[NavBar]

[Page title: "Activity Log" + subtitle: "Complete audit trail of all system actions"]

[Filter bar]
  Action type dropdown: All | Login | Transaction Scored | Review Submitted | Bulk Upload | Export | Settings Changed
  User dropdown: All users | [list of users]
  Date range: [from] → [to]
  [Apply Filters button]

[Activity table]
  Timestamp | User | Action | Entity | Details

  Example rows:
  2026-04-21 14:30 | analyst@fraud... | REVIEW_SUBMITTED | Transaction #42 | confirmed_fraud
  2026-04-21 10:00 | admin@fraudg... | BULK_UPLOAD | - | 20 transactions scored
  2026-04-21 09:45 | analyst@fraud... | USER_LOGIN | - | -

[Pagination]
```

---

### Page 3: ModelPerformancePage (`/model/performance`)

**Why it exists:** In production ML systems, model performance degrades over time
as fraud patterns change. This is called "model drift." Operations teams monitor
production metrics (real analyst feedback) separately from the initial test metrics.
This page shows the two side by side — a genuinely sophisticated ML operations
(MLOps) concept that no student thesis at CSIE will have.

**Layout:**
```
[NavBar]

[Page title: "Model Performance Monitoring"]
[Subtitle: "Comparing initial test metrics vs production analyst feedback"]

[Row 1: Summary cards — 4 metrics]
  Initial PR-AUC (from training) | Production Precision | Production Recall | Reviews Completed

[Row 2: Two charts side by side]
  Left: "Initial Test Results" — bar chart (Precision/Recall/F1/PR-AUC)
        Data from: GET /model/info (FastAPI)
  Right: "Production Feedback" — bar chart (same metrics)
         Data from: GET /predictions/performance (NestJS, computed from reviews)

[Row 3: Daily fraud rate trend]
  Line chart: x=date, y=fraud rate %
  Data from: GET /predictions/performance (daily array)
  "This chart tracks what percentage of scored transactions analysts confirmed as fraud"

[Row 4: SLA Compliance table]
  Review Time Distribution:
  < 1 hour: X transactions
  1-4 hours: X transactions
  4-24 hours: X transactions
  > 24 hours: X transactions
  Average review time: X hours
  Data from: GET /reviews/sla

[Row 5: Model Comparison reminder table]
  Same table as dashboard, frozen values from initial training
  "Reference: models evaluated at training time"
```

---

### Page 4: ReportsPage (`/reports`)

**Why it exists:** Fraud departments generate regular reports for management,
regulators, and risk committees. A platform without a reporting module is
incomplete for a banking context. Pack&Go had no reporting; you will.

**Layout:**
```
[NavBar]

[Page title: "Reports" + subtitle: "Generate and export compliance reports"]

[Report 1 — Fraud Summary Report]
  Card with:
  - Title: "Fraud Summary Report"
  - Description: "Overview of fraud detections, analyst reviews, and model performance"
  - Period selector: Last 7 days | Last 30 days | Custom range
  - [Generate Report] button → opens a modal/new page with the report

[Report 2 — Transaction Audit Report]
  Card with:
  - Title: "Transaction Audit Export"
  - Description: "Complete export of all transactions with predictions and review decisions"
  - Format: CSV
  - [Download CSV] button → calls GET /transactions/export

[Report 3 — Analyst Activity Report]
  Card with:
  - Title: "Analyst Activity Report"
  - Description: "Reviews completed per analyst, average review time, decision breakdown"
  - [Generate] button → shows table with per-analyst stats

[Report 4 — Model Performance Report]
  Card with:
  - Title: "Model Monitoring Report"
  - Description: "Production precision/recall vs initial test metrics"
  - [View Report] → navigates to /model/performance
```

**Fraud Summary Report Modal content (generated when button clicked):**
```
Generate by fetching:
- GET /transactions/stats → total, flagged, confirmed_fraud, false_positive
- GET /predictions/performance → daily trend, production precision/recall
- GET /reviews/sla → avg review time

Display as a print-friendly summary card:

FraudGuard — Fraud Summary Report
Period: April 14 – April 21, 2026
Generated: April 21, 2026 14:30

TRANSACTIONS
Total scored: 245
Flagged (>threshold): 32 (13.1%)
Reviewed: 28
Pending review: 4

ANALYST VERDICTS
Confirmed fraud: 18 (64.3%)
False positives: 7 (25.0%)
Needs investigation: 3 (10.7%)

MODEL PERFORMANCE (production)
Precision: 0.64
Recall: 0.90
Avg review time: 3.2 hours

[Print] [Close] buttons
```

---

### Component: FraudAlertBanner

A dismissible alert banner that appears at the top of every protected page
when there are unreviewed high-probability fraud transactions.

```tsx
// frontend/src/components/FraudAlertBanner.tsx

// Fetches GET /predictions/flagged on mount
// If count > 0:
//   Shows a red/orange banner below the NavBar:
//   "⚠ 5 high-probability fraud transactions require review"
//   [Review Now] button → navigates to /reviews
//   [Dismiss] button → hides for this session (sessionStorage)
// If count === 0: renders nothing

// Props: none (fetches its own data)
// Used in: DashboardPage, TransactionsPage, ReviewQueuePage
```

---

### Component: NotificationBadge in NavBar

Update the existing NavBar to show a red badge count on the "Review Queue" link.

```tsx
// In NavBar.tsx, fetch GET /predictions/flagged on mount
// Store count in state
// On the "Review Queue" NavLink, add:
<NavLink to="/reviews" className={navLinkClass}>
  Review Queue
  {pendingCount > 0 && (
    <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
      {pendingCount}
    </span>
  )}
</NavLink>
```

---

### Component: CommentSection (add to TransactionDetailPage)

Add as Panel 4 at the bottom of the existing TransactionDetailPage:

```tsx
// frontend/src/components/CommentSection.tsx

// Props: transactionId (number)
// Fetches: GET /transactions/:id/comments on mount

// Layout:
// [Section title: "Case Notes"]
// [Comment list, newest first]
//   Each comment:
//   [Author initial avatar] [Author email] [time ago]
//   [Comment content]
//   [Delete button — only shown if author === currentUser OR currentUser is admin]
// [Add comment form]
//   [Textarea: "Add a case note..."]
//   [Submit button] → POST /transactions/:id/comments → re-fetch comments
```

---

### Update App.tsx — add new routes

```tsx
import { ProfilePage } from './pages/ProfilePage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ModelPerformancePage } from './pages/ModelPerformancePage';
import { ReportsPage } from './pages/ReportsPage';

// Add routes:
<Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
<Route path="/audit" element={<ProtectedRoute requiredRole="admin"><AuditLogPage /></ProtectedRoute>} />
<Route path="/model/performance" element={<ProtectedRoute><ModelPerformancePage /></ProtectedRoute>} />
<Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
```

---

### Update NavBar — add new navigation links

Add to the nav links section (after existing links):
```tsx
<NavLink to="/reports" className={navLinkClass}>Reports</NavLink>
<NavLink to="/model/performance" className={navLinkClass}>Model Monitor</NavLink>
<NavLink to="/profile" className={navLinkClass}>Profile</NavLink>
// Admin only:
{user?.role === 'admin' && (
  <NavLink to="/audit" className={navLinkClass}>Audit Log</NavLink>
)}
```

---

### Update TransactionsPage — extended filters

Add to the existing filter bar:
```tsx
// Amount range:
<input type="number" placeholder="Min amount" value={minAmount} onChange={...} />
<span>to</span>
<input type="number" placeholder="Max amount" value={maxAmount} onChange={...} />

// Date range:
<input type="date" value={startDate} onChange={...} />
<span>to</span>
<input type="date" value={endDate} onChange={...} />

// Probability range:
<input type="number" placeholder="Min probability" step="0.1" min="0" max="1" />

// Export button (top right, next to Upload CSV):
<button onClick={handleExport} className="px-4 py-2 bg-slate-600 text-white ...">
  Export CSV
</button>

// handleExport:
const handleExport = async () => {
  const response = await apiClient.get('/transactions/export', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `fraudguard_transactions_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
};
```

---

## UPDATED DATABASE SCHEMA (complete picture)

After all additions, your DB has 7 tables with proper relationships:

```
users                    (auth, roles)
  ↓ 1:N
transactions             (raw transactions + features)
  ↓ 1:1
predictions              (ML scoring results)
  ↓ 1:1
reviews                  (analyst decisions)

users → 1:N → transaction_comments   (case notes per transaction)
users → 1:1 → alert_settings         (per-user fraud thresholds)
users → 1:N → audit_logs             (activity trail)
```

This is a genuinely normalized, well-structured relational schema.
At defense: "the schema is in Third Normal Form (3NF). No derived attributes,
all relationships properly managed through foreign keys, audit logging
separated from business data to avoid table bloat."

---

## IMPLEMENTATION ORDER

Follow exactly. Commit between each group.

### Group 1 — New entities + modules (backend)
```
1. AuditLog entity + AuditModule + AuditService + AuditController
2. TransactionComment entity + CommentsModule + CommentsService + CommentsController
3. AlertSettings entity + AlertSettingsModule + AlertSettingsService + AlertSettingsController
4. Register all 3 new modules in app.module.ts
5. Restart NestJS → verify 3 new tables in pgAdmin
6. git commit -m "Add audit log, comments, alert settings modules"
```

### Group 2 — Extend existing endpoints (backend)
```
7. Inject AuditService into AuthService (log login, register)
8. Inject AuditService into TransactionsService (log scoring, bulk upload)
9. Inject AuditService into ReviewsService (log review submission)
10. Extend GET /transactions with amount/date/probability filters
11. Add GET /transactions/export (CSV download)
12. Add GET /predictions/performance (production metrics)
13. Add GET /reviews/sla (review time statistics)
14. Add GET /users/me + PATCH /users/me + GET /users/me/activity
15. Restart NestJS → test all new endpoints in Swagger
16. git commit -m "Extend existing endpoints with search, export, metrics"
```

### Group 3 — Frontend components
```
17. FraudAlertBanner component
18. NotificationBadge in NavBar (fetch pending count)
19. CommentSection component
20. Add CommentSection to TransactionDetailPage as Panel 4
21. Add FraudAlertBanner to DashboardPage and TransactionsPage
22. Update TransactionsPage filter bar with extended filters
23. Add Export CSV button to TransactionsPage
24. Update NavBar with new links + notification badge
25. git commit -m "Add fraud alert banner, comments, extended filters, export"
```

### Group 4 — New frontend pages
```
26. ProfilePage (/profile)
27. AuditLogPage (/audit) — admin only
28. ModelPerformancePage (/model/performance)
29. ReportsPage (/reports)
30. Update App.tsx with 4 new routes
31. Test all new pages end-to-end
32. git commit -m "Add Profile, Audit Log, Model Performance, Reports pages"
```

### Group 5 — Previously planned tasks (from v2 plan)
```
33. Unit tests (3 spec files)
34. README.md
35. api/.env.example
36. ml-service/requirements.txt
37. docker-compose.yml + Dockerfiles
38. api/api.rest
39. Final commit -m "Complete FraudGuard — all features implemented"
```

---

## VERIFICATION CHECKLIST

### New backend endpoints
- [ ] POST /transactions/:id/comments → creates comment
- [ ] GET /transactions/:id/comments → returns comment list
- [ ] DELETE /comments/:id → deletes comment (own only, admin any)
- [ ] GET /audit → returns paginated audit log (admin only)
- [ ] GET /audit/my → current user's activity
- [ ] GET /alert-settings/me → current user's threshold settings
- [ ] PUT /alert-settings/me → updates settings, audit logged
- [ ] GET /transactions?minAmount=100&maxAmount=500 → filtered correctly
- [ ] GET /transactions?startDate=2026-04-01&endDate=2026-04-21 → filtered correctly
- [ ] GET /transactions/export → downloads a real CSV file with correct headers
- [ ] GET /predictions/performance → returns daily array + precision/recall
- [ ] GET /reviews/sla → returns time-to-review statistics
- [ ] GET /users/me → returns own profile
- [ ] PATCH /users/me with currentPassword + newPassword → changes password
- [ ] All new endpoints visible in Swagger at /api-docs
- [ ] All audit events logged (test: login, score, review, change settings)

### New frontend
- [ ] FraudAlertBanner appears on dashboard when flagged predictions exist
- [ ] FraudAlertBanner is dismissible (disappears on click, stays gone during session)
- [ ] NotificationBadge shows count on "Review Queue" nav link
- [ ] CommentSection appears on TransactionDetailPage
- [ ] Can add a comment, see it appear immediately
- [ ] Can delete own comment, cannot delete others'
- [ ] ProfilePage loads with user info + alert settings
- [ ] Password change validates correctly (length, match)
- [ ] Alert threshold slider updates via PUT /alert-settings/me
- [ ] AuditLogPage (admin): shows all activity, filter by action type works
- [ ] ModelPerformancePage: both charts load (initial + production metrics)
- [ ] Daily trend line chart displays correctly
- [ ] SLA table shows time distribution
- [ ] ReportsPage: all 4 report cards render
- [ ] Fraud Summary Report modal shows correct numbers
- [ ] Export CSV button downloads a real file that opens in Excel
- [ ] TransactionsPage amount filter works (enter 100-500, only those rows show)
- [ ] TransactionsPage date filter works
- [ ] All 4 new routes are accessible and redirect to /login when unauthenticated

---

## WHAT NOT TO TOUCH
- ml-service/ (complete)
- api/src/auth/ (complete)
- Existing entity files
- Existing page files (only add to them, don't replace)
- .env files
- Port numbers

---

## THESIS IMPACT OF THESE ADDITIONS

### Chapter 1 (Economic context) — new talking points:
- PSD2 compliance requirement for audit trails
- Banking SLA requirements for fraud investigation
- Configurable risk thresholds per institution

### Chapter 2 (Technologies) — new sections:
- CSV generation (no library needed — raw string building)
- Client-side file download via Blob API
- Session-based UI state (dismissed alerts)

### Chapter 3 (Design) — new diagrams:
- Updated ER diagram now has 7 tables (was 4)
- Updated class diagram includes AuditLog, Comment, AlertSettings
- Sequence diagram for comment flow and alert threshold flow

### Chapter 4 (Implementation) — new sections:
- Audit logging architecture
- Production model monitoring vs initial metrics (the key differentiator)
- CSV export implementation
- Configurable alert thresholds

### Chapter 5 (Conclusions + Future Work):
- Model drift detection (currently shows but doesn't auto-retrain)
- Real-time WebSocket notifications (currently polling)
- Email alert delivery (currently stored but not sent)
- Mobile app for analyst review on the go

---

## FINAL COMPLEXITY COMPARISON AFTER IMPLEMENTATION

| Dimension | Pack&Go | FraudGuard Final |
|---|---|---|
| DB entities | 5 | **7** |
| Backend modules | 5 | **9** |
| API endpoints | ~15 | **35+** |
| Frontend pages | 8 | **14** |
| External integrations | Stripe | FastAPI ML + Streamlit |
| ML/AI | ❌ | XGBoost + SMOTE + 3 models |
| Audit trail | ❌ | ✅ Full compliance logging |
| Model monitoring | ❌ | ✅ Production vs test metrics |
| Export/reporting | ❌ | ✅ CSV + report generation |
| Configurable rules | ❌ | ✅ Per-user thresholds |
| Case management | ❌ | ✅ Comments + audit |
| Dark/light theme | ❌ | ✅ ThemeContext |
| Unit tests | ✅ proposed | ✅ implemented |
| Deployment | Vercel | Docker Compose |

This is not a student project that mimics a tutorial.
This is a full fraud operations platform built by a licență student
who understands both software engineering and the business context.
