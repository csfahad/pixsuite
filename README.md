# PixSuite

PixSuite is a private, browser-based AI photo editing product. Users upload images, apply stacked ImageKit AI transformations (background removal, generative edits, upscale, crop, and related tools), and export results. Access is gated by anonymous trial limits, Google sign-in, monthly upload quotas, and a credit system for paid plans. Billing is handled through **Razorpay** (INR). Media upload and transformation delivery are powered by **ImageKit**. Application state for users, subscriptions, and anonymous trials is stored in **MongoDB** via **Prisma**.

This document is an internal engineering and operator reference for the product codebase. It is not redistribution or project marketing material.

### Production URL and maintainer contact

|                     |                                                            |
| :------------------ | :--------------------------------------------------------- |
| **Live deployment** | [https://pixsuite.csfahad.in](https://pixsuite.csfahad.in) |
| **Developer (X)**   | [https://x.com/csfahad_x](https://x.com/csfahad_x)         |
| **Email**           | [csfahad.dev@gmail.com](mailto:csfahad.dev@gmail.com)      |

Use the production origin for `NEXTAUTH_URL`, Google OAuth authorized redirects, Razorpay webhook targets, and ImageKit CORS/referrer settings as applicable.

---

## Product surface

### Primary user journeys

| Journey            | Description                                                                                                                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Landing**        | Marketing home (`/`) with hero, feature highlights, pricing, and footer. Post-checkout redirects (`?upgraded=`, `?payment_failed=`, `?payment_cancelled=`) show toasts when `sessionStorage` confirms a real checkout flow. |
| **Editor**         | Full workspace at `/editor`: upload, tool palette grouped by category, prompt-driven tools, canvas with optional before/after compare, job status, short edit history, PNG/JPG download.                                    |
| **Authentication** | `/signin` — Google OAuth only; successful auth creates or loads a `users` row and redirects home.                                                                                                                           |
| **Account**        | `/account` — profile and plan/usage (backed by `/api/account` and usage endpoints).                                                                                                                                         |
| **Legal**          | `/terms`, `/privacy` — static policy pages.                                                                                                                                                                                 |

### Editor capabilities (implemented)

Images are uploaded to ImageKit (`pixsuite-uploads` folder). Edits are applied by chaining ImageKit `tr` transform segments on the CDN URL. Prompt-bearing tools encode the prompt into the transform string. Credits are deducted server-side per tool use (except zero-credit tools). Tools can be toggled off to rebuild the chain without that effect.

**AI transform**

- Remove background (`e-bgremove`)
- Remove BG — Pro quality (`e-removedotbg`, **Lite plan or higher**)
- Change background with optional text prompt (`e-changebg`)
- AI edit with text prompt (`e-edit`)
- Generative fill with text prompt (`bg-genfill`)

**Enhance**

- AI drop shadow (`e-dropshadow`)
- AI retouch (`e-retouch`)
- AI upscale 2× (`e-upscale`)
- Generate variations with optional prompt (`e-genvar`)

**Crop and resize**

- Face crop (`e-crop-face`) — fixed face-focused dimensions in transform
- Smart crop (`e-crop-smart`) — `fo-auto` framing

**UX details**

- Low-quality preview (`q-40`) loads first; client polls until loaded image.
- Compare mode: draggable slider between original and processed (canvas).
- Payment/upgrade modal when anonymous or signed-in upload limits are hit.

The landing **Features** module includes visual demos (e.g. upscale, watermark concept, background removal). Those demos are illustrative; the **executable** tool set is the one listed above in the editor routes and modules.

---

## Plans, credits, and billing (as implemented)

Plan tiers are defined in application code (`src/lib/plans.ts`) and mirrored on the user record in the database.

### Tier summary

| Plan        | Monthly credits                             | Monthly upload cap | Notes                                                                                  |
| ----------- | ------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------- |
| **Free**    | 0 (AI tools require sign-in + paid credits) | 3                  | Anonymous users: 3 uploads tracked per session/IP; signed-in free tier uses DB limits. |
| **Starter** | 3,000                                       | 500                |                                                                                        |
| **Lite**    | 10,000                                      | 5,000              | Unlocks **Remove BG (Pro)** (`e-removedotbg`).                                         |
| **Pro**     | 25,000                                      | 20,000             | Highest caps.                                                                          |

### Credit cost per feature

| Feature ID                    | Credits |
| ----------------------------- | ------: |
| `e-crop-face`, `e-crop-smart` |       0 |
| `e-bgremove`                  |      20 |
| `e-dropshadow`                |      40 |
| `e-upscale`                   |      60 |
| `e-retouch`                   |      70 |
| `e-changebg`                  |     100 |
| `bg-genfill`                  |     120 |
| `e-edit`                      |     120 |
| `e-genvar`                    |     160 |
| `e-removedotbg`               |     260 |

Maximum single-operation debit enforced server-side: **300** credits (`MAX_CREDITS_PER_EDIT`).

### Razorpay

- **Order creation** — `POST /api/create-razorpay-order`: authenticated users only; prevents downgrade and duplicate active same-tier subscription; amount uses **pro-rata** upgrade pricing from current paid tier (`getUpgradeAmount`).
- **Production activation** — only a signature-verified `payment.captured` webhook grants a subscription. The browser callback shows a pending state; it never activates a plan or calls the verification endpoint in production.
- **Development testing** — `POST /api/verify-razorpay-payment` is available only with `NODE_ENV=development` outside a production deployment. It checks the signed-in owner, HMAC, captured payment, and exact amount before using the same atomic activation path. It returns 404 in production and preview builds.
- **Webhooks** — `POST /api/razorpay-webhook` verifies the raw body with a timing-safe HMAC using `RAZORPAY_WEBHOOK_SECRET`. It fetches order metadata, validates owner/plan/amount, and grants the captured payment exactly once in a MongoDB transaction. An immutable `payment_activations` ledger prevents duplicate delivery from refilling allowances or extending expiry. `payment.failed` webhooks validate the failed attempt against its order and persist it once in `payment_failures`, with bounded gateway error details. Duplicate deliveries are acknowledged without repeated records or analytics; failures leave all existing subscriptions and allowances intact. Failure history never blocks a later valid capture.

Billing amounts in code are stored in **paise** (INR) in `PLAN_PRICES_PAISE`. The pricing UI may show approximate USD equivalents for display; **checkout is INR** via Razorpay.

### Subscription expiry

`GET /api/usage` downgrades users whose `subscriptionExpiresAt` is in the past (paid tier → Free, limits reset per `PLAN_UPLOAD_LIMITS.Free`).

---

## Architecture

```
Browser (Next.js App Router, React 19)
        │
        ├── NextAuth (JWT session, Google)
        ├── REST handlers under src/app/api/*
        └── Client → ImageKit CDN URLs (?tr=...) for transforms

        ▼
MongoDB (Prisma) — users, subscriptions, anonymous_sessions
        ▼
ImageKit — authenticated upload, on-the-fly transforms
        ▼
Razorpay — orders, checkout, webhooks
```

### Authentication and session model

- **Provider**: Google OAuth (`src/lib/auth.ts`).
- **Strategy**: JWT; custom session fields typed in `src/types/next-auth.d.ts`.
- **User provisioning**: On first Google profile callback, `users` row is created with default Free limits.
- **Note**: JWT callback in `authOptions` assigns `plan: "Free"` on token shape; **authoritative plan and credits** for the UI come from **`/api/usage`** (database), not from the session object alone.

### Anonymous trial

- Cookie: `pixsuite-anon` (httpOnly; secure in production).
- Collection: `anonymous_sessions` with `sessionId`, optional `ipAddress`, `usageCount` / `usageLimit` (default 3).
- **POST `/api/upload-auth`** atomically reserves one upload before issuing a unique ImageKit token valid for five minutes. Both signed-in and guest allowances are enforced here; `/api/usage` and `/api/free-usage` are read-only. A signature reservation consumes allowance even if the upload later fails.
- Guests share a canonical trial identity per trusted IP, so clearing cookies or simultaneous first requests cannot reset that budget. A shared network also shares the guest allowance. Vercel is detected automatically. Other hosts must provide an overwriting trusted proxy and set `TRUST_PROXY_HEADERS=true`; without a trusted IP, guest signing fails closed.
- **POST `/api/transfer-usage`** atomically merges the higher user/guest upload count after sign-in. The signing endpoint independently enforces this same shared three-upload trial, even if transfer is skipped. A new paid subscription resets upload/credit usage to zero and grants the full paid limits; neither trial usage nor its three-upload grant is added to the paid allowance. Paid requests never merge the guest record into paid counters.

---

## Data model (`prisma/schema.prisma`)

- **`users`**: identity, `plan` (`Free` | `Starter` | `Lite` | `Pro`), `role` (`User` | `Admin` | `Modaretor`), usage and credit counters, `subscriptionExpiresAt`, optional `razorpayCustomerId`.
- **`subscriptions`**: links `userId` to Razorpay order/payment identifiers and `expiresAt`.
- **`anonymous_sessions`**: guest quota tracking.
- **`payment_activations`**: immutable processed-payment receipts keyed by Razorpay order ID using MongoDB’s unique `_id`. The ledger and user/subscription writes commit together.
- **`payment_failures`**: immutable history of signed failed-payment attempts keyed by Razorpay payment ID, bound to the order owner and intended plan. This is an audit record, not a subscription status; captured payments remain authoritative.

User, subscription, and guest records use MongoDB ObjectIds (`@db.ObjectId`); activation and failure ledger keys are Razorpay order/payment ID strings.

---

## HTTP API (application)

| Method    | Path                           | Purpose                                                                  |
| --------- | ------------------------------ | ------------------------------------------------------------------------ |
| GET/POST  | `/api/auth/[...nextauth]`      | NextAuth                                                                 |
| POST      | `/api/upload-auth`             | Atomically reserve quota, then issue one-use ImageKit upload credentials |
| GET       | `/api/usage`                   | Authenticated: credits, uploads, plan, `canUpload`, subscription date    |
| GET       | `/api/free-usage`              | Anonymous quota read (+ set cookie if new)                               |
| POST      | `/api/transfer-usage`          | Merge anonymous usage into user on login                                 |
| POST      | `/api/deduct-credits`          | Validate plan, balance; deduct feature cost                              |
| GET/PATCH | `/api/account`                 | Read profile; PATCH name (Zod-validated)                                 |
| POST      | `/api/create-razorpay-order`   | Create Razorpay order for upgrade                                        |
| POST      | `/api/verify-razorpay-payment` | Development-only payment testing; 404 in production                      |
| POST/GET  | `/api/razorpay-webhook`        | Razorpay events + health GET                                             |

Authenticated routes use `getToken` from `next-auth/jwt`. The webhook uses the Razorpay signature. Upload signing checks the authenticated account or the canonical guest allowance before returning credentials.

---

## Project structure

```
pixsuite/
├── prisma/
│   ├── schema.prisma          # MongoDB models
│   └── migrations/            # Prisma migration path (see prisma.config.ts)
├── public/                    # Static assets, feature media, favicons
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # Route handlers
│   │   ├── account/           # Account UI
│   │   ├── editor/            # Main editor page
│   │   ├── signin/
│   │   ├── privacy/ | terms/
│   │   ├── layout.tsx         # Fonts (Poppins, Geist Mono), theme, navbar, toaster
│   │   ├── page.tsx           # Home (Hero, Features, Pricing, payment toasts)
│   │   ├── providers.tsx      # SessionProvider
│   │   └── globals.css
│   ├── components/            # Shared UI (navbar, footer, modals, shadcn-style ui/)
│   ├── hooks/                 # e.g. use-mobile
│   ├── lib/                   # auth, prisma client, plans, utils
│   ├── modules/
│   │   ├── editor/            # upload-zone, canvas-editor (used by /editor)
│   │   ├── hero/              # Landing hero + BeforeAfterSlider
│   │   ├── features/          # Bento marketing grid
│   │   └── pricing/           # Landing pricing + payment modal triggers
│   └── types/                 # next-auth module augmentation
├── components.json            # shadcn/ui style config
├── next.config.ts             # Remote image patterns (Unsplash for marketing)
├── prisma.config.ts           # Prisma 6 config + datasource from env
├── package.json
└── bun.lock                   # Lockfile (Bun); npm-compatible scripts also work
```

---

## Technology stack

| Layer           | Choice                                                                          |
| --------------- | ------------------------------------------------------------------------------- |
| Framework       | Next.js **16** (App Router)                                                     |
| UI              | React **19**, Tailwind CSS **4**, Motion, Radix-based primitives, Sonner toasts |
| Language        | TypeScript (strict)                                                             |
| Auth            | NextAuth **4** (Google)                                                         |
| Database        | MongoDB + Prisma **6.19**                                                       |
| Media           | ImageKit (upload + URL transforms)                                              |
| Payments        | Razorpay SDK                                                                    |
| Validation      | Zod (e.g. account name)                                                         |
| Package/runtime | `bun.lock` present; scripts use standard `next` CLI                             |

---

## Configuration (environment)

Create a local or deployment env file with secrets (never commit). Variables **referenced in code**:

| Variable                                       | Role                                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `DATABASE_URL`                                 | MongoDB connection string for Prisma                                               |
| `NEXTAUTH_SECRET`                              | NextAuth encryption                                                                |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`    | Google OAuth                                                                       |
| `NEXTAUTH_URL`                                 | **Required in production** for OAuth callback URL resolution (NextAuth convention) |
| `IMAGEKIT_PUBLIC_KEY` / `IMAGEKIT_PRIVATE_KEY` | Upload authentication and signing                                                  |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`      | Server-side Razorpay API                                                           |
| `RAZORPAY_WEBHOOK_SECRET`                      | Webhook HMAC verification                                                          |
| `TRUST_PROXY_HEADERS`                          | Opt-in trusted forwarded IP headers on non-Vercel hosts                            |

`NODE_ENV` controls cookie `secure` flag for anonymous sessions.

### External dashboard setup

- **Google Cloud Console**: OAuth client with authorized redirect URIs matching NextAuth (`/api/auth/callback/google`).
- **ImageKit**: Keys aligned with upload API; transformations must match the `tr` parameters used in the editor.

---

## Local development

**Prerequisites:** Node or Bun, MongoDB instance, and valid env vars for auth, ImageKit, and (for payment testing) Razorpay.

```bash
# Install dependencies (use your preferred client)
bun install
# or: npm install

# Generate Prisma client (also runs on build)
bunx prisma generate

# Development server
bun run dev
# or: npm run dev
```

Application default dev URL: `http://localhost:3000`. The deployed app runs at [https://pixsuite.csfahad.me](https://pixsuite.csfahad.me); use separate env files or dashboard secrets for each environment so production OAuth and webhooks keep pointing at the public hostname while local dev stays on localhost.

**Scripts (`package.json`):**

| Script  | Command                         |
| ------- | ------------------------------- |
| `dev`   | `next dev`                      |
| `build` | `prisma generate && next build` |
| `start` | `next start`                    |
| `lint`  | `eslint`                        |

---

## Operations and security notes

- **Payment integrity**: Production subscriptions activate only through verified captured-payment webhooks. Development verification is gated off in production; both authorized activation paths share an atomic, replay-safe ledger.
- **Upload auth**: A conditional atomic quota reservation precedes every signature; credentials are one-use, expire after five minutes, and are never cached. The private key stays server-only.
- **Credits**: Deducted atomically per request in `/api/deduct-credits`; feature availability and caps enforced server-side.
- **Anonymous allowance**: A canonical identity per trusted IP survives cookie resets and concurrent requests; trial usage increments atomically with an allowance condition. User/guest usage transfer cannot reopen the guest budget.
- **Schema**: Enum `Role` includes `Admin` / `Modaretor`; ensure any future admin tooling aligns with typo’d value if referenced in code.

---

## Branch and ownership

This repository is maintained as a private product codebase by the maintainer listed above. Treat credentials, customer data, and transformation URLs as confidential. Do not publish keys, real customer exports, or production database dumps in issues or documentation outside secure channels.
