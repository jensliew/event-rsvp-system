# Event RSVP System

A production-grade, full-stack event management and RSVP platform built on AWS serverless infrastructure. The system supports event browsing, real-time attendance tracking, RSVP submission, and integrated payment processing for paid events — all deployed via automated CI/CD pipelines.

> Live Demo: https://d2uvl29py5b87v.cloudfront.net

---

## Table of Contents

- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [AWS Infrastructure](#aws-infrastructure)
- [Payment Gateway Integration](#payment-gateway-integration)
- [CI/CD Pipeline](#cicd-pipeline)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Database Design](#database-design)
- [Security Design](#security-design)
- [Setup Guide](#setup-guide)

---

## System Overview

The Event RSVP System is a serverless web application that enables event organisers to manage events and participants to register their attendance. Key capabilities include:

- Browse upcoming events with banners, descriptions, venue and date
- Real-time RSVP statistics (attending vs not attending)
- RSVP form with duplicate prevention per email per event
- Attendee list with response filtering
- Payment gateway integration for paid events — participants are redirected to Stripe Checkout before their RSVP is confirmed
- Free and paid events coexist — payment is only triggered when an event has a registration fee configured

---

## Architecture

```
User Browser
     │
     ▼
Amazon CloudFront (CDN)
     │
     ▼
Amazon S3 (Static Frontend)
app.js / events.js / utils.js / index.html / style.css / payment-success.html
     │
     │ API calls
     ▼
Amazon API Gateway (HTTP API)
     │
     ▼
AWS Lambda (Node.js 24 — single function, multi-route handler)
     │
     ├──── Amazon RDS MySQL (event metadata)
     │         events table: title, venue, date, fee, payment_link
     │
     ├──── Amazon DynamoDB (RSVP responses)
     │         event-rsvp-responses table: attendee records, payment status
     │
     └──── Stripe Payment Links (external — browser redirect, no Lambda call)
               Stripe hosted checkout → payment-success.html → Lambda confirms RSVP
```

### Key Architectural Decisions

**Hybrid database strategy:** Event metadata (structured, relational) is stored in RDS MySQL. RSVP responses (high write throughput, key-value access pattern) are stored in DynamoDB. This separates concerns and optimises each storage layer for its use case.

**VPC-constrained Lambda:** Lambda runs inside a VPC to access the private RDS instance. DynamoDB is accessed via a VPC Endpoint, keeping all AWS service traffic off the public internet. Stripe integration uses a browser-redirect Payment Link pattern to avoid requiring outbound internet access from Lambda — eliminating the need for a NAT Gateway and keeping the architecture within AWS Free Tier.

**Single Lambda function:** All API routes are handled by one Lambda function using path-based routing. This reduces cold start overhead and simplifies deployment.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6 modules) |
| Backend | AWS Lambda, Node.js 24 |
| Event Database | AWS RDS MySQL |
| RSVP Database | AWS DynamoDB |
| API Layer | AWS API Gateway (HTTP API v2) |
| CDN | AWS CloudFront |
| Static Hosting | AWS S3 |
| Payment | Stripe Payment Links |
| CI/CD | GitHub Actions |
| Networking | AWS VPC, Subnets, Security Groups, VPC Endpoints |

---

## AWS Infrastructure

### Amazon RDS MySQL
- Hosts the `events` table containing event metadata
- Deployed inside a private VPC subnet — not publicly accessible
- Lambda connects via private VPC routing
- Schema managed via versioned SQL migration files

### Amazon DynamoDB
- Hosts the `event-rsvp-responses` table
- Composite key design: `pk = EVENT#<id>`, `sk = RESPONDENT#<email>` for individual records
- Aggregate counters stored at `sk = RESPONSE#Yes` and `sk = RESPONSE#No`
- Accessed from Lambda via a VPC Gateway Endpoint — traffic never leaves AWS network
- Conditional writes enforce one RSVP per email per event (duplicate prevention)
- Transactional writes (`TransactWriteItems`) ensure atomic updates to both the individual record and the aggregate counter

### AWS Lambda
- Runtime: Node.js 24
- Single function handles all 7 API routes
- Deployed inside VPC for private RDS access
- IAM execution role scoped to minimum required DynamoDB actions
- Environment variables: `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `REGION`

### Amazon API Gateway (HTTP API v2)
- Routes all HTTP requests to Lambda
- CORS configured to allow requests from CloudFront origin
- Routes: `GET /events`, `GET /event/{event_id}`, `GET /stats/{event_id}`, `GET /attendees/{event_id}`, `POST /rsvp`, `POST /rsvp-pending`, `POST /payment-success`

### Amazon S3 + CloudFront
- S3 bucket hosts all static frontend assets
- CloudFront distribution serves assets globally with caching
- Cache invalidation triggered automatically on every deployment via GitHub Actions

### VPC & Networking
- Lambda and RDS deployed within the same VPC
- RDS in private subnet — no public IP, no internet exposure
- Lambda security group: outbound port 3306 to RDS security group only
- DynamoDB VPC Gateway Endpoint: DynamoDB traffic routed internally, not via internet

---

## Payment Gateway Integration

### Overview

Paid events require participants to complete a Stripe payment before their RSVP is confirmed. The integration uses Stripe Payment Links — a no-code hosted checkout solution — to avoid requiring Lambda to make outbound calls to Stripe's API (which would require a NAT Gateway in the VPC setup).

### Payment Flow

```
1. User fills RSVP form and selects "I'm Attending"
        │
        ▼
2. Frontend detects registration_fee > 0 on the event
        │
        ▼
3. POST /rsvp-pending → Lambda writes RSVP with payment_status = "pending" to DynamoDB
        │
        ▼
4. Frontend saves {event_id, full_name, email} to localStorage
        │
        ▼
5. Browser redirects to Stripe Payment Link URL (prefilled_email appended)
        │
        ▼
6. User completes payment on Stripe hosted checkout
        │
        ▼
7. Stripe redirects to payment-success.html
        │
        ▼
8. Frontend reads localStorage, calls POST /payment-success
        │
        ▼
9. Lambda updates DynamoDB record: payment_status = "paid", increments Yes count
        │
        ▼
10. User sees confirmation with name, email, and paid status
```

### Why This Architecture

Standard Stripe integration requires a server-side API call to create a Checkout Session. Lambda inside a VPC without a NAT Gateway cannot make outbound calls to `api.stripe.com`. Rather than introducing a NAT Gateway (which incurs cost and breaks Free Tier), the integration uses Stripe Payment Links — pre-created in the Stripe Dashboard — which are simple redirect URLs requiring no server-side Stripe API call.

### Per-Event Configuration

Each paid event requires:
1. A product and Payment Link created in the Stripe Dashboard
2. `registration_fee` set in the RDS `events` table (e.g. `25.00`)
3. `payment_link` set in the RDS `events` table (e.g. `https://buy.stripe.com/xxx`)

Free events have `registration_fee = NULL` and follow the standard RSVP flow with no payment step.

---

## CI/CD Pipeline

Both frontend and backend deployments are fully automated via GitHub Actions. Pushing to the `main` branch triggers the relevant pipeline based on which files changed.

### Frontend Pipeline (deploy-frontend.yml)

**Trigger:** Push to `main` affecting any of: `app.js`, `events.js`, `utils.js`, `index.html`, `style.css`, `payment-success.html`

**Steps:**
1. Checkout repository
2. Configure AWS credentials via GitHub Secrets
3. Upload each frontend file to S3 using `aws s3 cp`
4. Invalidate CloudFront cache (`/*`) to ensure users receive the latest version immediately

### Backend Pipeline (deploy-backend.yml)

**Trigger:** Push to `main` affecting `backend/**`

**Steps:**
1. Checkout repository
2. Configure AWS credentials via GitHub Secrets
3. Set up Node.js 18
4. Run `npm install --production` to install dependencies
5. Zip entire `backend/` directory into `lambda-function.zip`
6. Deploy to Lambda via `aws lambda update-function-code`
7. Wait for update to complete (`lambda wait function-updated`)
8. Publish new Lambda version

### GitHub Secrets Required

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `AWS_REGION` | AWS region (e.g. `ap-southeast-1`) |
| `S3_BUCKET_NAME` | S3 bucket name for frontend assets |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID |
| `LAMBDA_FUNCTION_NAME` | Lambda function name |

---

## Project Structure

```
event-rsvp-system/
├── index.html                          # Main SPA entry point
├── app.js                              # Application logic, view management, form handling
├── events.js                           # Event API calls, rendering, payment redirect
├── utils.js                            # Shared utilities: fetch wrapper, validation, formatting
├── style.css                           # Responsive styling
├── payment-success.html                # Post-payment confirmation page
│
├── backend/
│   ├── index.js                        # Lambda handler — all API routes
│   ├── package.json                    # Node.js dependencies
│   ├── package-lock.json
│   └── migrations/
│       ├── add_registration_fee.sql    # Adds registration_fee + payment_link columns
│       └── cleanup_unused_columns.sql  # Removes deprecated columns
│
└── .github/
    └── workflows/
        ├── deploy-frontend.yml         # S3 + CloudFront deployment pipeline
        └── deploy-backend.yml          # Lambda deployment pipeline
```

---

## API Reference

### GET /events
Returns all upcoming events ordered by date.

**Response:**
```json
[
  {
    "event_id": "aws-meetup-kl-2026",
    "title": "AWS User Group KL Meetup",
    "description": "...",
    "start_at": "2026-04-15T09:00:00",
    "venue": "Kuala Lumpur",
    "banner_url": "https://...",
    "registration_fee": "30.00",
    "payment_link": "https://buy.stripe.com/test_xxx"
  }
]
```

### GET /event/{event_id}
Returns full details for a single event.

### GET /stats/{event_id}
Returns RSVP counts for an event.

**Response:** `{ "Yes": 12, "No": 3 }`

### GET /attendees/{event_id}?response=Yes
Returns attendee list, optionally filtered by response (`Yes` or `No`).

### POST /rsvp
Submits a free event RSVP. Prevents duplicate submissions per email per event.

**Body:** `{ "event_id", "full_name", "email", "response" }`

### POST /rsvp-pending
Saves a pending RSVP record before redirecting to Stripe. Called by frontend prior to payment redirect.

**Body:** `{ "event_id", "full_name", "email" }`

### POST /payment-success
Confirms a paid RSVP after successful Stripe payment. Updates `payment_status` from `pending` to `paid` and increments the Yes attendance counter.

**Body:** `{ "event_id", "full_name", "email" }`

---

## Database Design

### RDS MySQL — `events` table

| Column | Type | Description |
|---|---|---|
| `event_id` | VARCHAR | Primary key, URL-friendly slug |
| `title` | VARCHAR | Event name |
| `description` | TEXT | Event description |
| `start_at` | DATETIME | Event date and time |
| `venue` | VARCHAR | Event location |
| `banner_url` | VARCHAR | S3/CloudFront image URL |
| `registration_fee` | DECIMAL(10,2) | NULL = free, value = paid |
| `payment_link` | VARCHAR(500) | Stripe Payment Link URL |

### DynamoDB — `event-rsvp-responses` table

| pk | sk | Description |
|---|---|---|
| `EVENT#<id>` | `RESPONDENT#<email>` | Individual RSVP record |
| `EVENT#<id>` | `RESPONSE#Yes` | Aggregate Yes counter |
| `EVENT#<id>` | `RESPONSE#No` | Aggregate No counter |

**Attributes on RSVP record:** `full_name`, `email`, `response`, `payment_status` (`pending` / `paid`), `timestamp`

---

## Security Design

- **RDS** is deployed in a private subnet with no public IP. Access is restricted to Lambda's security group on port 3306 only.
- **DynamoDB** is accessed via a VPC Gateway Endpoint. Traffic never traverses the public internet.
- **Lambda IAM role** is scoped to minimum required actions: `BatchGetItem`, `Query`, `TransactWriteItems`, `UpdateItem` on the specific DynamoDB table ARN only.
- **Stripe secret key** is never used in the frontend or exposed to the browser. Payment Links use only a pre-created URL with no sensitive credentials.
- **API Gateway** has CORS configured to restrict allowed origins.
- **GitHub Secrets** store all credentials — no hardcoded keys in source code.

---

## Setup Guide

### Prerequisites
- AWS account with appropriate IAM permissions
- Stripe account (free)
- GitHub repository

### 1. AWS Resources

Create the following in order:
1. VPC with private subnet (for RDS) and public subnet
2. RDS MySQL instance in private subnet
3. DynamoDB table `event-rsvp-responses` with `pk` (String) and `sk` (String) keys
4. S3 bucket with static website hosting enabled
5. CloudFront distribution pointing to S3
6. Lambda function (Node.js 24, inside VPC)
7. DynamoDB VPC Gateway Endpoint associated with Lambda's subnet route table
8. API Gateway HTTP API with all routes integrated to Lambda

### 2. Run Database Migrations

```sql
ALTER TABLE events ADD COLUMN registration_fee DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE events ADD COLUMN payment_link VARCHAR(500) DEFAULT NULL;
```

### 3. Lambda Environment Variables

Set in Lambda console → Configuration → Environment variables:

```
DB_HOST     = your-rds-endpoint.rds.amazonaws.com
DB_USER     = your-db-username
DB_PASS     = your-db-password
DB_NAME     = your-database-name
REGION      = ap-southeast-1
```

### 4. Configure Stripe (for paid events)

1. Create a product in Stripe Dashboard → set price in MYR
2. Create a Payment Link → set redirect URL to `https://your-cloudfront-domain/payment-success.html`
3. Copy the Payment Link URL
4. Update the event in RDS: `UPDATE events SET registration_fee = 30.00, payment_link = 'https://buy.stripe.com/xxx' WHERE event_id = 'your-event-id'`

### 5. GitHub Secrets

Add all secrets listed in the CI/CD section to your repository.

### 6. Deploy

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

GitHub Actions handles the rest.

---

*Last updated: March 2026*
