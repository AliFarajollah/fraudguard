# FraudGuard — Agent Implementation Instructions

> **Read this entire file before writing a single line of code.**
> This is a licență (bachelor's) thesis project. Every decision must be defensible at an academic oral exam.
> Follow the instructions exactly. Do not add features not listed here. Do not remove or refactor existing working code unless explicitly told to.

---

## Project Overview

FraudGuard is a full-stack web platform for credit card fraud detection. It uses a polyglot microservices architecture:

- **React** (TypeScript, Vite, Tailwind CSS) — frontend, port 5173
- **NestJS** (TypeScript, TypeORM, PostgreSQL) — business-logic API, port 3000
- **FastAPI** (Python, scikit-learn, XGBoost) — ML inference microservice, port 8000
- **PostgreSQL** — relational database, port 5432

### What is already built and working (DO NOT TOUCH)

- `ml-service/` — entire Python ML pipeline and FastAPI service (complete, tested)
  - `notebooks/01_eda.py` — EDA script generating 5 PNG figures
  - `notebooks/02_preprocessing.py` — SMOTE, scaling, train/test split
  - `notebooks/03_training.py` — trains LR, RF, XGBoost; saves winner
  - `app/main.py`, `app/predictor.py`, `app/schemas.py` — FastAPI service
  - `models/fraud_model.pkl`, `models/scaler.pkl`, `models/model_metadata.json`
- `api/src/auth/` — complete auth module (register, login, JWT, guards, decorators)
- `api/src/users/` — User entity, UsersService, UsersModule
- `api/src/app.module.ts` — root module with TypeORM + ConfigModule
- `api/src/main.ts` — NestJS bootstrap with Swagger, ValidationPipe, CORS
- `frontend/src/pages/LoginPage.tsx` — login form
- `frontend/src/pages/RegisterPage.tsx` — register form
- `frontend/src/pages/DashboardPage.tsx` — model metrics dashboard
- `frontend/src/pages/ScorePage.tsx` — transaction scoring UI
- `frontend/src/components/NavBar.tsx` — navbar with links
- `frontend/src/components/MetricCard.tsx` — metric display card
- `frontend/src/components/ProtectedRoute.tsx` — auth guard
- `frontend/src/context/AuthContext.tsx` — global auth state
- `frontend/src/api/client.ts` — axios instances (apiClient + mlClient)
- `frontend/src/types/index.ts` — shared TypeScript types
- `frontend/src/fixtures/sampleTransactions.ts` — fraud/legit examples

### Tech stack versions (do not upgrade)

```
Node.js: 20+
TypeScript: 5.x
NestJS: 10.x
TypeORM: 0.3.x
PostgreSQL: 16
React: 18.x
Vite: 5.x
Tailwind CSS: 4.x
Python: 3.11+
FastAPI: 0.115.x
XGBoost: 2.x
```

---

## Database Schema

The PostgreSQL database is named `fraudguard`. The `users` table already exists via TypeORM synchronize. You must create these additional entities (TypeORM will auto-create the tables):

### `transactions` table

```typescript
@Entity({ name: 'transactions' })
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'timestamptz', name: 'occurred_at' })
  occurredAt: Date;

  @Column({ type: 'jsonb' })
  features: Record<string, number>; // stores V1-V28, Amount, Time

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'scored' | 'reviewed';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

### `predictions` table

```typescript
@Entity({ name: 'predictions' })
export class Prediction {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Transaction)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ type: 'numeric', precision: 5, scale: 4, name: 'fraud_probability' })
  fraudProbability: number;

  @Column({ type: 'boolean', name: 'predicted_label' })
  predictedLabel: boolean;

  @Column({ type: 'varchar', length: 50, name: 'model_version' })
  modelVersion: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

### `reviews` table

```typescript
@Entity({ name: 'reviews' })
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Prediction)
  @JoinColumn({ name: 'prediction_id' })
  prediction: Prediction;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'analyst_id' })
  analyst: User;

  @Column({
    type: 'varchar',
    length: 30,
    check: `decision IN ('confirmed_fraud', 'false_positive', 'needs_investigation')`
  })
  decision: 'confirmed_fraud' | 'false_positive' | 'needs_investigation';

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'reviewed_at', type: 'timestamptz' })
  reviewedAt: Date;
}
```

---

## What To Build — NestJS API Modules

### Module 1: Transactions

**File structure:**
```
api/src/transactions/
├── dto/
│   ├── create-transaction.dto.ts
│   └── bulk-score.dto.ts
├── entities/
│   └── transaction.entity.ts
├── transactions.controller.ts
├── transactions.service.ts
└── transactions.module.ts
```

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /transactions | JWT required | Create one transaction and immediately score it via FastAPI |
| POST | /transactions/bulk | JWT required | Accept CSV data (JSON array of transactions), score all via FastAPI |
| GET | /transactions | JWT required | List all transactions — paginated (page + limit query params), filterable by status and predictedLabel |
| GET | /transactions/:id | JWT required | Get one transaction with nested prediction and review |
| GET | /transactions/stats | JWT required | Return counts: total, pending, scored, confirmed_fraud, false_positive |

**Scoring flow (POST /transactions):**
1. Validate the request body with DTO
2. Save the Transaction entity with status = 'pending'
3. Call FastAPI `POST /predict` with the features using axios
4. Save the Prediction entity linked to the transaction
5. Update transaction status to 'scored'
6. Return the transaction with the nested prediction

**CSV bulk upload (POST /transactions/bulk):**
1. Accept body: `{ transactions: TransactionFeatureRow[] }` (array of feature objects)
2. For each transaction: save + call FastAPI + save prediction
3. Return summary: `{ processed: number, failed: number, results: [...] }`

**DTOs:**

```typescript
// create-transaction.dto.ts
export class CreateTransactionDto {
  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsDateString()
  occurredAt: string;

  @ApiProperty()
  @IsObject()
  features: Record<string, number>; // must contain Time, Amount, V1-V28
}
```

**Service notes:**
- Inject `HttpModule` / `HttpService` from `@nestjs/axios` to call FastAPI
- FastAPI URL comes from ConfigService: `ML_SERVICE_URL` (already in .env)
- Use `firstValueFrom` from `rxjs` to convert Observable to Promise
- Pagination: `skip = (page - 1) * limit`, use TypeORM `findAndCount`

---

### Module 2: Predictions

**File structure:**
```
api/src/predictions/
├── entities/
│   └── prediction.entity.ts
├── predictions.controller.ts
├── predictions.service.ts
└── predictions.module.ts
```

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /predictions | JWT required | List all predictions with nested transaction |
| GET | /predictions/flagged | JWT required | List predictions where predicted_label = true AND no review exists |
| GET | /predictions/stats | JWT required | Return: { total, fraud_count, legit_count, avg_fraud_probability, reviewed_count } |

**Flagged queue logic:**
```typescript
// Find predictions that are flagged but not yet reviewed
const flagged = await this.predictionsRepo
  .createQueryBuilder('p')
  .leftJoin('p.review', 'r')  // Note: you'll need to add @OneToOne back-reference
  .where('p.predicted_label = :label', { label: true })
  .andWhere('r.id IS NULL')
  .leftJoinAndSelect('p.transaction', 't')
  .orderBy('p.fraud_probability', 'DESC')
  .getMany();
```

---

### Module 3: Reviews

**File structure:**
```
api/src/reviews/
├── dto/
│   └── create-review.dto.ts
├── entities/
│   └── review.entity.ts
├── reviews.controller.ts
├── reviews.service.ts
└── reviews.module.ts
```

**Endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /reviews | JWT required, analyst or admin only | Submit a review decision for a flagged prediction |
| GET | /reviews | JWT required | List all reviews with nested prediction and analyst info |
| GET | /reviews/stats | JWT required | Return: { total, confirmed_fraud, false_positive, needs_investigation } |

**DTO:**
```typescript
export class CreateReviewDto {
  @ApiProperty()
  @IsNumber()
  predictionId: number;

  @ApiProperty({ enum: ['confirmed_fraud', 'false_positive', 'needs_investigation'] })
  @IsIn(['confirmed_fraud', 'false_positive', 'needs_investigation'])
  decision: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
```

**Service notes:**
- After creating the review, update the linked transaction's status to 'reviewed'
- Check that the prediction hasn't already been reviewed before creating — if yes, throw ConflictException

---

### Role-based guard

Create `api/src/auth/guards/roles.guard.ts`:

```typescript
// Guard that checks user.role against allowed roles
// Usage: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin', 'analyst')
```

Create `api/src/auth/decorators/roles.decorator.ts`:

```typescript
// @Roles('admin') decorator using SetMetadata
```

Apply to POST /reviews — only 'admin' and 'analyst' roles can submit reviews. 'viewer' gets 403.

---

### Swagger annotations

Every controller endpoint must have:
- `@ApiTags('transactions')` / `@ApiTags('predictions')` / `@ApiTags('reviews')`
- `@ApiOperation({ summary: '...' })`
- `@ApiResponse({ status: X, description: '...' })`
- `@ApiBearerAuth('JWT')` on protected endpoints

---

### Register all new modules in `app.module.ts`

Add `TransactionsModule`, `PredictionsModule`, `ReviewsModule` to the imports array. Do not remove existing imports.

---

## What To Build — React Frontend Pages

### Page 1: Transactions List (`/transactions`)

**File:** `frontend/src/pages/TransactionsPage.tsx`

**What it shows:**
- A table with columns: ID, Amount, Date, Status badge (color-coded: pending=gray, scored=blue, reviewed=green), Fraud Probability (shown as % with a small colored indicator — red if >50%, green if <50%), Actions
- Actions column: "View Details" link to `/transactions/:id`
- Above the table: filter bar with Status dropdown and Predicted Label dropdown (All / Fraud / Legitimate)
- Pagination at the bottom: Previous/Next buttons, showing "Page X of Y"
- A "Upload CSV" button at the top right that opens a modal

**Stats bar above the table (4 cards):**
- Total Transactions
- Flagged as Fraud (count)
- Confirmed Fraud (after review)
- Pending Review (flagged but unreviewed)

**Data fetching:**
- On mount, call `GET /transactions?page=1&limit=20` from apiClient
- Re-fetch when filters or page changes

---

### Page 2: Transaction Detail (`/transactions/:id`)

**File:** `frontend/src/pages/TransactionDetailPage.tsx`

**What it shows:**
Three panels:

**Panel 1 — Transaction info:**
- ID, Amount, Date, Status badge, Who uploaded it (email)

**Panel 2 — Prediction:**
- If prediction exists: fraud probability (large number, colored), predicted label badge, model version, date scored
- If no prediction: "Not scored yet" message

**Panel 3 — Review:**
- If reviewed: decision badge (confirmed fraud = red, false positive = green, needs investigation = yellow), analyst email, notes, date
- If flagged but not reviewed: "Review Required" section with three buttons: "Confirm Fraud", "Mark False Positive", "Needs Investigation" + optional notes textarea + Submit button
- If prediction is not fraud: "No review required — transaction classified as legitimate"

**Submit review flow:**
- Call `POST /reviews` with { predictionId, decision, notes }
- On success: re-fetch the transaction data and show updated state

---

### Page 3: Review Queue (`/reviews`)

**File:** `frontend/src/pages/ReviewQueuePage.tsx`

**What it shows:**
- A list of flagged-but-unreviewed predictions
- Each row shows: Transaction ID, Amount, Date, Fraud Probability (as red badge with %), a "Review" button that navigates to `/transactions/:id`
- If queue is empty: a green "All clear — no pending reviews" message
- Stats at the top: total flagged, reviewed today, pending

---

### Page 4: CSV Upload Modal

**File:** `frontend/src/components/BulkUploadModal.tsx`

**What it is:** A modal dialog (opens from the Transactions page "Upload CSV" button)

**What it does:**
1. User pastes a JSON array (or uploads a CSV — start with JSON paste for simplicity)
2. A "Preview" button shows the first 3 rows in a small table
3. An "Upload & Score All" button sends to `POST /transactions/bulk`
4. While processing: shows a progress message "Scoring N transactions..."
5. On complete: shows results summary "Processed: X, Failed: Y" and closes

**Provide a sample JSON payload** inside the modal that the user can copy-paste for demo purposes. Use the fraud example from `sampleTransactions.ts`.

---

### Update NavBar

Add these nav links (already has Dashboard + Score Transaction):
- **Transactions** → `/transactions`
- **Review Queue** → `/reviews`

---

### Update `App.tsx`

Add these routes (all protected with `<ProtectedRoute>`):
- `/transactions` → `<TransactionsPage />`
- `/transactions/:id` → `<TransactionDetailPage />`
- `/reviews` → `<ReviewQueuePage />`

---

## Styling Rules

- Use Tailwind CSS utility classes only — no custom CSS files
- Color conventions (already established, keep consistent):
  - Blue: primary actions, selected state
  - Green: legitimate, success, confirmed safe
  - Red: fraud, error, danger
  - Yellow/orange: needs investigation, warning
  - Gray: pending, neutral, disabled
- Card style: `bg-white rounded-lg shadow p-6`
- Table style: `min-w-full divide-y divide-slate-200` with `bg-slate-50` thead
- Badge style: `px-2 py-0.5 text-xs font-semibold rounded-full`
- All pages use `<NavBar />` at the top
- All pages have a `max-w-7xl mx-auto px-6 py-8` main content wrapper

---

## API Communication Rules

- All calls to NestJS use `apiClient` from `frontend/src/api/client.ts` (automatically attaches JWT)
- All calls to FastAPI use `mlClient` from the same file
- Always wrap calls in try/catch
- Show loading state while fetching (a simple "Loading…" text or spinner is fine)
- Show error state if fetch fails (red banner with message)
- Never call FastAPI directly for anything except model info and predict — all transaction storage goes through NestJS

---

## Error Handling Rules

### NestJS
- All services throw built-in NestJS exceptions: `NotFoundException`, `ConflictException`, `ForbiddenException`, `BadRequestException`
- Never throw raw `Error` objects
- All TypeORM operations in try/catch

### React
- All API calls in try/catch
- Use `axios.isAxiosError(err)` to parse error response
- Show error message from `err.response.data.message` (or fallback string)
- Never crash the app — always show a user-friendly error state

---

## Seed Data (for demo)

After building the Transaction module, create a seed script at `api/src/seed.ts`:

```typescript
// Creates 20 sample transactions (15 legitimate, 5 fraud)
// Calls FastAPI for each to get real predictions
// Saves everything to the database
// Run with: npx ts-node src/seed.ts
```

Use these 5 fraud transactions from the fixtures file and generate 15 legit ones with random small amounts (€5–€200) and random V feature values between -3 and 3.

---

## Environment Variables

The `.env` file at `api/.env` already contains:

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<existing value — do not change>
DB_NAME=fraudguard
JWT_SECRET=<existing value — do not change>
JWT_EXPIRES_IN=24h
ML_SERVICE_URL=http://localhost:8000
```

Do not add any new environment variables without noting them here.

---

## TypeScript Rules

- `verbatimModuleSyntax` is enabled — use `import type { X }` for type-only imports
- No `any` types except where absolutely necessary (document with a comment why)
- All entity properties must be initialized or marked as optional with `| null`
- All API response types must have corresponding interfaces in `frontend/src/types/index.ts`

---

## What NOT To Do

- Do not touch `ml-service/` — it is complete and working
- Do not refactor existing auth or user code
- Do not upgrade any package versions
- Do not add Docker or docker-compose (not needed for thesis)
- Do not add tests (out of scope for thesis timeline)
- Do not add a real CSV parser — use JSON input for bulk upload
- Do not add real-time websockets — polling is fine
- Do not add payment processing or external integrations
- Do not change the database name or schema of existing tables
- Do not change port numbers

---

## Implementation Order

Implement in exactly this order. Verify each step compiles and the server starts before moving to the next.

1. `Transaction` entity + `transactions.module.ts` (no endpoints yet)
2. `Prediction` entity + `predictions.module.ts` (no endpoints yet)
3. `Review` entity + `reviews.module.ts` (no endpoints yet)
4. Register all three modules in `app.module.ts` — verify server starts and tables appear in pgAdmin
5. `TransactionsService` + `TransactionsController` (all endpoints)
6. `PredictionsService` + `PredictionsController` (all endpoints)
7. `ReviewsService` + `ReviewsController` (all endpoints)
8. `RolesGuard` + `@Roles` decorator — apply to POST /reviews
9. Seed script
10. `TransactionsPage.tsx` (list + stats)
11. `TransactionDetailPage.tsx` (detail + review submission)
12. `ReviewQueuePage.tsx`
13. `BulkUploadModal.tsx`
14. Update `NavBar.tsx` with new links
15. Update `App.tsx` with new routes

---

## Verification Checklist

After implementation, verify each of these manually before declaring done:

### Backend
- [ ] NestJS starts without errors
- [ ] Three new tables visible in pgAdmin: `transactions`, `predictions`, `reviews`
- [ ] `POST /transactions` creates a transaction, calls FastAPI, saves prediction, returns both
- [ ] `GET /transactions` returns paginated list
- [ ] `GET /transactions/:id` returns transaction with nested prediction and review
- [ ] `GET /predictions/flagged` returns only fraud predictions without reviews
- [ ] `POST /reviews` creates a review, updates transaction status to 'reviewed'
- [ ] `POST /reviews` with 'viewer' role returns 403
- [ ] All endpoints visible in Swagger at `http://localhost:3000/api-docs`
- [ ] Swagger Authorize + test `/transactions` returns 401 without token, 200 with token

### Frontend
- [ ] `/transactions` loads and shows table (after seeding, shows 20 rows)
- [ ] Filters by status and predicted label work
- [ ] Pagination works
- [ ] `/transactions/1` shows detail with prediction panel
- [ ] Review submission form appears for flagged + unreviewed predictions
- [ ] Submitting a review updates the page to show the review
- [ ] `/reviews` shows the review queue
- [ ] NavBar shows all 4 links: Dashboard, Score Transaction, Transactions, Review Queue
- [ ] All pages redirect to /login when not authenticated

---

## Context For The Agent

This is a thesis project for a computer science bachelor's degree in Romania (ASE/CSIE). The project will be presented to a faculty coordinator and evaluated on:

- **C1 Completeness** — all use cases implemented
- **C2 Reliability** — no errors, proper validation everywhere
- **C3 Complexity** — microservices, two APIs, relational DB with relationships
- **C4 Originality** — ML pipeline, SMOTE, multi-model comparison

Every piece of code may be questioned at an oral exam. Write clean, readable code with comments on non-obvious decisions. Prefer explicit over implicit. Prefer simple over clever.

The student understands the codebase and will review everything you produce. Do not hide complexity — surface it clearly so it can be explained.
