You are a senior full-stack developer. I want you to scaffold a 
complete Next.js project called "Waste to Worth" — a smart circular 
e-waste management platform. Below is the complete context, 
database schema, and project structure.

---

## TECH STACK
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- ORM: Prisma
- Database: PostgreSQL
- Auth: JWT + bcrypt

---

## PROJECT OVERVIEW
Waste to Worth is a web platform that manages e-waste collection 
in Makassar, Indonesia. It connects citizens who want to dispose 
of e-waste properly with a government-backed collection system. 
Citizens earn points from verified e-waste submissions which can 
be redeemed for rewards (electricity tokens, public transport 
credits, electronics service vouchers).

---

## USER ROLES
1. **Citizen** — submits e-waste, earns points, redeems rewards
2. **Admin** — verifies submissions, manages dropboxes, manages 
   pickup schedules, manages rewards
3. **Public** — views impact dashboard (no login required)

---

## CORE FEATURES & FLOWS

### 1. Dropbox Submission Flow
- Citizen arrives at physical dropbox location
- Citizen opens app → scans QR code on the dropbox
- App auto-identifies dropbox location and shows available boxes
- Citizen manually inputs box number (format: WTW-[dropbox_code]-[number], globally unique)
- Citizen declares item types and quantity
- Citizen packs e-waste into box on the spot and drops it
- Items are batched per dropbox
- Admin collects batch on schedule → weighs items → verifies submission
- Points assigned after admin verification based on item type × weight

### 2. Pickup Submission Flow
- Citizen opens app → fills pickup form
- Citizen inputs pickup address + selects their district from dropdown
- System shows available pickup batch schedule for that district
- Citizen confirms submission
- Pickup is done in batches per district, piggybacking on 
  existing government (Dinas Lingkungan Hidup) routine 
  trash collection schedule
- Admin verifies after collection → weighs items → assigns points

### 3. Points System
- Points calculated by: item_type × weight_kg
- Point rules are configurable by admin (points_per_kg per item type)
- All items assumed to be broken/non-functional (no condition tracking)
- Points assigned only AFTER admin verification
- Points tracked in point_transactions table

### 4. Reward & Redemption System
- Citizen redeems points for rewards
- Reward types: token_listrik (electricity token), transum 
  (public transport credit), voucher_bengkel (electronics 
  service voucher)
- For voucher_bengkel type, reward stores bengkel_name, 
  bengkel_address, bengkel_phone
- Admin approves redemption requests manually
- After approval, admin inputs reward_code (token number or 
  voucher code) into the system
- Citizen can see reward_code in their dashboard after approved

### 5. Batch System
- Both dropbox and pickup use a batch system
- Dropbox batch: per dropbox location, opens when first 
  submission comes in, closes when admin marks as collected
- Pickup batch: per district schedule, defined by pickup_schedules
- Batch statuses: open → collecting → verifying → completed

### 6. Dropbox Capacity
- Each dropbox holds max 20 boxes
- current_box_count tracked in real-time
- When dropbox is full (20 boxes), new submissions are disabled 
  for that dropbox
- Warning shown at 15 boxes (75% full)
- Resets to 0 after admin marks batch as collected

### 7. Public Impact Dashboard
- No login required
- Shows: total e-waste collected (kg), total active contributors, 
  e-waste per district breakdown, estimated environmental impact, 
  progress toward targets

---

## DATABASE SCHEMA (Prisma)

Create the following models in schema.prisma:

```prisma
model User {
  id             String   @id @default(cuid())
  name           String
  email          String   @unique
  password       String
  role           Role     @default(CITIZEN)
  phone          String?
  pointsBalance  Int      @default(0)
  createdAt      DateTime @default(now())

  submissions        Submission[]
  pointTransactions  PointTransaction[]
  redemptions        Redemption[]
  verifiedSubmissions Submission[] @relation("VerifiedBy")
}

enum Role {
  CITIZEN
  ADMIN
}

model District {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())

  pickupSchedules         PickupSchedule[]
  pickupSubmissionDetails PickupSubmissionDetail[]
}

model DropboxLocation {
  id              String   @id @default(cuid())
  name            String
  address         String
  lat             Float
  lng             Float
  qrCode          String   @unique
  maxCapacity     Int      @default(20)
  currentBoxCount Int      @default(0)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())

  boxes                   Box[]
  dropboxSubmissionDetails DropboxSubmissionDetail[]
  batches                 Batch[]
}

model Box {
  id          String   @id @default(cuid())
  boxNumber   String   @unique
  dropboxId   String
  isAvailable Boolean  @default(true)
  createdAt   DateTime @default(now())

  dropbox                 DropboxLocation          @relation(fields: [dropboxId], references: [id])
  dropboxSubmissionDetails DropboxSubmissionDetail[]
}

model PickupSchedule {
  id            String         @id @default(cuid())
  districtId    String
  scheduledDate DateTime
  status        ScheduleStatus @default(UPCOMING)
  createdAt     DateTime       @default(now())

  district                District                 @relation(fields: [districtId], references: [id])
  pickupSubmissionDetails PickupSubmissionDetail[]
  batches                 Batch[]
}

enum ScheduleStatus {
  UPCOMING
  IN_PROGRESS
  COMPLETED
}

model Batch {
  id              String      @id @default(cuid())
  type            BatchType
  dropboxId       String?
  pickupScheduleId String?
  status          BatchStatus @default(OPEN)
  collectedAt     DateTime?
  createdAt       DateTime    @default(now())

  dropbox         DropboxLocation? @relation(fields: [dropboxId], references: [id])
  pickupSchedule  PickupSchedule?  @relation(fields: [pickupScheduleId], references: [id])
  submissions     Submission[]
}

enum BatchType {
  DROPBOX
  PICKUP
}

enum BatchStatus {
  OPEN
  COLLECTING
  VERIFYING
  COMPLETED
}

model Submission {
  id               String           @id @default(cuid())
  userId           String
  batchId          String
  method           SubmissionMethod
  status           SubmissionStatus @default(PENDING)
  totalPointsEarned Int             @default(0)
  submittedAt      DateTime         @default(now())
  verifiedAt       DateTime?
  verifiedBy       String?
  notes            String?

  user                    User                     @relation(fields: [userId], references: [id])
  batch                   Batch                    @relation(fields: [batchId], references: [id])
  verifier                User?                    @relation("VerifiedBy", fields: [verifiedBy], references: [id])
  submissionItems         SubmissionItem[]
  dropboxSubmissionDetail DropboxSubmissionDetail?
  pickupSubmissionDetail  PickupSubmissionDetail?
  pointTransactions       PointTransaction[]
}

enum SubmissionMethod {
  DROPBOX
  PICKUP
}

enum SubmissionStatus {
  PENDING
  VERIFIED
  REJECTED
}

model SubmissionItem {
  id           String   @id @default(cuid())
  submissionId String
  itemType     String
  quantity     Int
  weightKg     Float?
  pointsEarned Int      @default(0)
  createdAt    DateTime @default(now())

  submission Submission @relation(fields: [submissionId], references: [id])
}

model DropboxSubmissionDetail {
  id           String   @id @default(cuid())
  submissionId String   @unique
  dropboxId    String
  boxId        String
  createdAt    DateTime @default(now())

  submission Submission      @relation(fields: [submissionId], references: [id])
  dropbox    DropboxLocation @relation(fields: [dropboxId], references: [id])
  box        Box             @relation(fields: [boxId], references: [id])
}

model PickupSubmissionDetail {
  id               String   @id @default(cuid())
  submissionId     String   @unique
  pickupScheduleId String
  address          String
  districtId       String
  createdAt        DateTime @default(now())

  submission     Submission     @relation(fields: [submissionId], references: [id])
  pickupSchedule PickupSchedule @relation(fields: [pickupScheduleId], references: [id])
  district       District       @relation(fields: [districtId], references: [id])
}

model PointRule {
  id          String   @id @default(cuid())
  itemType    String   @unique
  pointsPerKg Int
  createdAt   DateTime @default(now())
}

model PointTransaction {
  id          String          @id @default(cuid())
  userId      String
  amount      Int
  type        TransactionType
  referenceId String?
  createdAt   DateTime        @default(now())

  user User @relation(fields: [userId], references: [id])
}

enum TransactionType {
  EARN
  REDEEM
}

model Reward {
  id             String     @id @default(cuid())
  name           String
  type           RewardType
  pointsRequired Int
  stock          Int        @default(0)
  isActive       Boolean    @default(true)
  bengkelName    String?
  bengkelAddress String?
  bengkelPhone   String?
  createdAt      DateTime   @default(now())

  redemptions Redemption[]
}

enum RewardType {
  TOKEN_LISTRIK
  TRANSUM
  VOUCHER_BENGKEL
}

model Redemption {
  id          String           @id @default(cuid())
  userId      String
  rewardId    String
  status      RedemptionStatus @default(PENDING)
  rewardCode  String?
  createdAt   DateTime         @default(now())

  user   User   @relation(fields: [userId], references: [id])
  reward Reward @relation(fields: [rewardId], references: [id])
}

enum RedemptionStatus {
  PENDING
  APPROVED
  DELIVERED
}
```

---

## PROJECT STRUCTURE

Scaffold the following folder and file structure:
waste-to-worth/
├── prisma/
│   ├── schema.prisma        ← use schema above
│   └── seed.ts              ← seed: 3 districts, 2 dropboxes,
│                               10 boxes each, 3 point rules,
│                               3 rewards, 1 admin user
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   │
│   │   ├── (citizen)/
│   │   │   ├── layout.tsx        ← citizen navbar
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── submit/
│   │   │   │   ├── dropbox/page.tsx
│   │   │   │   └── pickup/page.tsx
│   │   │   ├── history/page.tsx
│   │   │   └── rewards/page.tsx
│   │   │
│   │   ├── (admin)/
│   │   │   ├── layout.tsx        ← admin sidebar
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── batches/page.tsx
│   │   │   ├── dropboxes/page.tsx
│   │   │   ├── schedules/page.tsx
│   │   │   └── rewards/page.tsx
│   │   │
│   │   ├── (public)/
│   │   │   ├── page.tsx          ← landing page
│   │   │   └── impact/page.tsx   ← public dashboard
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   └── register/route.ts
│   │       ├── submissions/
│   │       │   ├── dropbox/route.ts
│   │       │   └── pickup/route.ts
│   │       ├── batches/
│   │       │   └── route.ts
│   │       ├── dropboxes/
│   │       │   └── route.ts
│   │       ├── rewards/
│   │       │   └── route.ts
│   │       ├── redemptions/
│   │       │   └── route.ts
│   │       ├── points/
│   │       │   └── route.ts
│   │       └── impact/
│   │           └── route.ts
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── Modal.tsx
│   │   ├── citizen/
│   │   │   ├── PointsCard.tsx
│   │   │   ├── SubmissionHistory.tsx
│   │   │   └── RewardCard.tsx
│   │   ├── admin/
│   │   │   ├── BatchTable.tsx
│   │   │   ├── VerificationForm.tsx
│   │   │   └── StatsCard.tsx
│   │   └── public/
│   │       ├── ImpactCounter.tsx
│   │       ├── DistrictMap.tsx
│   │       └── HowItWorks.tsx
│   │
│   ├── lib/
│   │   ├── prisma.ts          ← Prisma client singleton
│   │   ├── auth.ts            ← JWT sign/verify + bcrypt helpers
│   │   ├── points.ts          ← points calculation logic
│   │   └── utils.ts           ← general helpers
│   │
│   ├── middleware.ts          ← protect /citizen and /admin routes
│   │
│   └── types/
│       └── index.ts           ← shared TypeScript types
│
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json

---

## WHAT TO SCAFFOLD

Please do the following:

1. **Initialize the project** with Next.js 14, TypeScript, Tailwind CSS, 
   Prisma, and required dependencies (bcryptjs, jsonwebtoken, 
   @types/bcryptjs, @types/jsonwebtoken)

2. **Create prisma/schema.prisma** with the complete schema above

3. **Create prisma/seed.ts** with:
   - 3 districts (Tamalanrea, Panakkukang, Rappocini)
   - 2 dropbox locations with lat/lng in Makassar
   - 10 boxes per dropbox (format: WTW-MKS01-001 etc)
   - 3 point rules (smartphone: 100pts/kg, laptop: 150pts/kg, 
     kabel: 50pts/kg)
   - 3 rewards (1 token_listrik, 1 transum, 1 voucher_bengkel)
   - 1 admin user (email: admin@waste2worth.id, password: admin123)

4. **Create src/lib/prisma.ts** — Prisma client singleton

5. **Create src/lib/auth.ts** — JWT helpers (signToken, verifyToken, 
   hashPassword, comparePassword)

6. **Create src/lib/points.ts** — calculatePoints(itemType, weightKg) 
   function that queries point_rules

7. **Create src/middleware.ts** — protect (citizen) and (admin) 
   route groups based on JWT role

8. **Create src/types/index.ts** — TypeScript interfaces for all 
   main entities

9. **Create all API routes** with basic GET/POST handlers and 
   proper error handling

10. **Create all page files** with basic layout and placeholder 
    content so the routing works

11. **Create .env.example** with:
    DATABASE_URL=
    JWT_SECRET=
    NEXTAUTH_URL=

Make sure:
- All files use TypeScript
- Tailwind CSS is properly configured
- Prisma client is singleton pattern
- JWT stored in httpOnly cookies
- All API routes have try/catch error handling
- Middleware properly redirects unauthorized users
- Code is clean, readable, and well-commented