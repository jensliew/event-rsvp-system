# Event RSVP System with Integrated Payment Gateway

> A production-deployed, serverless full-stack web application built entirely on AWS — featuring real-time RSVP management, hybrid database architecture, VPC-secured infrastructure, Stripe payment integration, and fully automated CI/CD pipelines.

**Live:** https://d2uvl29py5b87v.cloudfront.net

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

After successful payment, participants are redirected to a confirmation page. The frontend reads registration details from `localStorage` and calls the backend to upgrade the RSVP status from `pending` to `paid` in DynamoDB.

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

Triggered on push to `main` for any frontend file change. Uploads assets to S3 and invalidates the CloudFront cache automatically.

![GitHub Actions Frontend](assets/screenshots/GitHub%20Actions%20—%20frontend%20workflow.png)

---

### Backend Deployment Pipeline

Triggered on push to `main` for any change under `backend/`. Installs dependencies, packages the Lambda function, deploys to AWS, and publishes a new version.

![GitHub Actions Backend](assets/screenshots/GitHub%20Actions%20—%20backend%20workflow%20.png)

---

## Architecture Overview

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

*Built and deployed by [Jens Liew] — April 2026*
