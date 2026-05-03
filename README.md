# Cloud-Native Event Registration System

> A production-deployed, serverless full-stack web application built entirely on AWS — featuring real-time RSVP management, hybrid database architecture, VPC-secured infrastructure, Stripe payment integration, and fully automated CI/CD pipelines.

**Live Demo:** https://d2uvl29py5b87v.cloudfront.net

---

## Table of Contents

- [Project Summary](#project-summary)
- [Key Highlights](#key-highlights)
- [Application Screenshots](#application-screenshots)
- [AWS Infrastructure Screenshots](#aws-infrastructure-screenshots)
- [CI/CD Pipeline Screenshots](#cicd-pipeline-screenshots)
- [Architecture](#architecture)
- [Technical Decisions](#technical-decisions)
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

## Project Summary

This project demonstrates end-to-end ownership of a cloud-native application — from frontend development and backend API design, through to AWS infrastructure provisioning, network security configuration, payment gateway integration, and automated deployment pipelines.

The system allows event organisers to manage events and participants to register attendance. It supports both free and paid events, with paid registrations requiring Stripe payment confirmation before an RSVP is recorded.

---

## Key Highlights

- Serverless backend on AWS Lambda with multi-route API handling
- Hybrid storage: RDS MySQL for relational event data, DynamoDB for high-throughput RSVP writes
- VPC-secured architecture — RDS in private subnet, DynamoDB via VPC Gateway Endpoint
- Stripe Payment Link integration designed around VPC constraints — no NAT Gateway required
- Atomic DynamoDB transactions for duplicate-safe RSVP writes
- Fully automated CI/CD via GitHub Actions — separate pipelines for frontend and backend
- CloudFront CDN for global static asset delivery with automated cache invalidation

---

## Application Screenshots

### Events Listing Page

Displays all upcoming events with banners, venue, date, attendance statistics, and a registration fee badge where applicable.

![Events Listing Page](assets/screenshots/Events%20listing%20page.png)

---

### RSVP Form — Free Event

Standard RSVP flow for free events. Participants fill in their details and submit directly — no payment step involved.

![RSVP Form Free Event](assets/screenshots/RSVP%20form%20—%20free%20event%20selected.png)

---

### RSVP Form — Paid Event

When a paid event is selected, the registration fee is prominently displayed. Submitting "I'm Attending" initiates the payment flow.

![RSVP Form Paid Event](assets/screenshots/RSVP%20form%20—%20paid%20event%20selected.png)

---

### Stripe Checkout — MYR

Participants are redirected to a Stripe-hosted checkout page. The event name, amount in MYR, and prefilled email are passed through automatically.

![Stripe Checkout MYR](assets/screenshots/Stripe%20checkout%20page-%20MYR.png)

---

### Stripe Checkout — SGD

Stripe automatically localises the checkout experience based on the participant's region.

![Stripe Checkout SGD](assets/screenshots/Stripe%20checkout%20page-%20SGD.png)

---

### Payment Success Page

After successful payment, participants are redirected to a confirmation page. The frontend reads registration details from localStorage and calls the backend to upgrade the RSVP status from pending to paid in DynamoDB.

![Payment Success Page](assets/screenshots/Payment%20success%20page.png)

---

### Attendee List

Real-time attendee list with filter controls for All / Attending / Not Attending responses.

![Attendee List](assets/screenshots/Attendee%20list%20.png)

---

## AWS Infrastructure Screenshots

### Lambda Function

Single Lambda function handling all API routes. Deployed inside a VPC for private RDS access.

![Lambda Function Overview](assets/screenshots/Lambda%20function%20overview.png)

---

### API Gateway Routes

HTTP API v2 with 7 routes — covering event retrieval, RSVP submission, pending payment recording, and payment confirmation.

![API Gateway Routes](assets/screenshots/API%20Gateway%20routes.png)

---

### DynamoDB Table

`event-rsvp-responses` table using a composite key design. Individual RSVP records and aggregate response counters are stored in the same table using different sort key prefixes.

![DynamoDB Table](assets/screenshots/DynamoDB%20table.png)

---

### RDS Instance

MySQL instance deployed in a private VPC subnet. Not publicly accessible — only reachable from Lambda within the same VPC.

![RDS Instance](assets/screenshots/RDS%20instance%20.png)

---

### RDS VPC Configuration

RDS subnet group and VPC association confirming private network placement.

![RDS VPC](assets/screenshots/RDS%20instance%20VPC.png)

---

### S3 Bucket

Static frontend assets hosted in S3, serving as the origin for the CloudFront distribution.

![S3 Bucket](assets/screenshots/S3%20bucket.png)

---

### CloudFront Distribution

Global CDN distribution with S3 origin. Cache invalidation is triggered automatically on every frontend deployment.

![CloudFront Distribution](assets/screenshots/CloudFront%20distribution%20.png)

---

## CI/CD Pipeline Screenshots

### Frontend Deployment Pipeline

Triggered on push to main for any frontend file change. Uploads assets to S3 and invalidates the CloudFront cache automatically.

![GitHub Actions Frontend](assets/screenshots/GitHub%20Actions%20—%20frontend%20workflow.png)

---

### Backend Deployment Pipeline

Triggered on push to main for any change under backend/. Installs dependencies, packages the Lambda function, deploys to AWS, and publishes a new version.

![GitHub Actions Backend](assets/screenshots/GitHub%20Actions%20—%20backend%20workflow%20.png)

---

## Architecture

```
User Browser
     │
     ▼
Amazon CloudFront (CDN + Cache Invalidation)
     │
     ▼
Amazon S3 (Static Frontend Hosting)
     │
     │  API Requests
     ▼
Amazon API Gateway (HTTP API v2)
     │
     ▼
AWS Lambda (Node.js 24 — VPC-deployed)
     │
     ├──── Amazon RDS MySQL          (private subnet — event metadata)
     │
     ├──── Amazon DynamoDB           (via VPC Gateway Endpoint — RSVP records)
     │
     └──── Stripe Payment Links      (browser redirect — no Lambda outbound call)
                │
                └──── payment-success.html → POST /payment-success → DynamoDB update
```

### Key Architectural Decisions

**Hybrid database strategy:** Event metadata (structured, relational) is stored in RDS MySQL. RSVP responses (high write throughput, key-value access pattern) are stored in DynamoDB. This separates concerns and optimises each storage layer for its use case.

**VPC-constrained Lambda:** Lambda runs inside a VPC to access the private RDS instance. DynamoDB is accessed via a VPC Endpoint, keeping all AWS service traffic off the public internet. Stripe integration uses a browser-redirect Payment Link pattern to avoid requiring outbound internet access from Lambda — eliminating the need for a NAT Gateway and keeping the architecture within AWS Free Tier.

**Single Lambda function:** All API routes are handled by one Lambda function using path-based routing. This reduces cold start overhead and simplifies deployment.

---

## Technical Decisions

**Why hybrid RDS + DynamoDB?**
Event metadata is relational and queried with joins and filters — RDS MySQL is the right fit. RSVP responses are high-frequency writes with a simple key-value access pattern — DynamoDB handles this more efficiently and scales without schema changes.

**Why Stripe Payment Links instead of Stripe Checkout Sessions?**
Lambda runs inside a VPC without a NAT Gateway (to stay within AWS Free Tier). This means Lambda cannot make outbound calls to external APIs like Stripe. Stripe Payment Links are pre-created hosted URLs that require no server-side API call — the browser redirects directly to Stripe. A pending RSVP is written to DynamoDB before the redirect, and confirmed after Stripe redirects back to the success page.

**Why a single Lambda function?**
A single multi-route Lambda function reduces cold start frequency, simplifies deployment, and keeps the architecture easy to reason about at this scale. Path-based routing is handled in code.

**Why VPC Gateway Endpoint for DynamoDB?**
Keeps all DynamoDB traffic within the AWS private network. No data traverses the public internet, reducing latency and improving security posture without additional cost.

---

## Tech Stack

| Category | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6 Modules) |
| Backend | AWS Lambda, Node.js 24 |
| Relational Database | AWS RDS MySQL |
| NoSQL Database | AWS DynamoDB |
| API Layer | AWS API Gateway HTTP API v2 |
| CDN | AWS CloudFront |
| Static Hosting | AWS S3 |
| Networking | AWS VPC, Private Subnets, Security Groups, VPC Gateway Endpoint |
| Payment | Stripe Payment Links |
| CI/CD | GitHub Actions |

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
cloud-native-event-registration/
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
├── assets/
│   └── screenshots/                    # Project screenshots for documentation
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
    "payment_link": "https://buy.stripe.com/xxx"
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
Confirms a paid RSVP after successful Stripe payment. Updates payment_status from pending to paid and increments the Yes attendance counter.

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
4. Update the event in RDS:
```sql
UPDATE events SET registration_fee = 30.00, payment_link = 'https://buy.stripe.com/xxx' WHERE event_id = 'your-event-id';
```

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
