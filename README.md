# Event RSVP System

A full-stack event management and RSVP system built with vanilla JavaScript frontend and AWS Lambda backend, deployed to production using GitHub Actions CI/CD.

## 📋 Table of Contents

- [System Overview](#system-overview)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

The Event RSVP System allows users to:
- View upcoming events with details (date, venue, description, banner image)
- See real-time RSVP statistics (Yes/No attendance counts)
- Submit RSVP responses with email validation
- View attendee lists filtered by response type

**Tech Stack:**
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6 modules)
- **Backend:** AWS Lambda (Node.js 18), Express-style routing
- **Database:** AWS RDS MySQL (events), AWS DynamoDB (RSVP responses)
- **Storage:** AWS S3 (banners), AWS CloudFront CDN
- **CI/CD:** GitHub Actions (auto-deploy on git push)
- **Infrastructure:** AWS API Gateway, IAM roles/policies

---

## 📦 Prerequisites

### Required Tools
- **Git** — version control
- **Node.js 18+** — for local Lambda testing and deployment
- **Python 3** — for running local dev server
- **AWS Account** — with appropriate permissions
- **GitHub Account** — repository hosting and Actions

### AWS Resources Needed
1. **RDS MySQL Database** — for events table
   - Table: `events` with columns: `event_id`, `title`, `description`, `start_at`, `venue`, `banner_url`, `created_at`

2. **DynamoDB Table** — for RSVP responses
   - Name: `event-rsvp-responses`
   - Partition key: `pk` (String)
   - Sort key: `sk` (String)

3. **S3 Bucket** — for banner images (public read access)

4. **CloudFront Distribution** — CDN for banners

5. **Lambda Function** — backend API (Node.js 18.x)

6. **API Gateway HTTP API** — with routes: `/events`, `/event/{event_id}`, `/stats/{event_id}`, `/attendees/{event_id}`, `/rsvp`

### Lambda Execution Role Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:BatchGetItem",
        "dynamodb:Query",
        "dynamodb:TransactWriteItems",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:ap-southeast-1:*:table/event-rsvp-responses"
    }
  ]
}
```

---

## 📁 Project Structure

```
event-rsvp-tutorial/
├── app.js                          # Main app logic, view switching
├── events.js                       # Event API calls, rendering
├── utils.js                        # Utilities: fetch, formatting, validation
├── index.html                      # Single-page app HTML
├── style.css                       # Responsive CSS styling
│
├── backend/
│   ├── index.js                    # Lambda handler, all API endpoints
│   ├── package.json                # Dependencies
│   └── package-lock.json
│
├── .github/workflows/
│   ├── deploy-frontend.yml         # Frontend S3 + CloudFront deployment
│   └── deploy-backend.yml          # Backend Lambda deployment
│
├── .gitignore                      # Git ignore rules
└── README.md                       # This file
```

---

## 🚀 Setup Instructions

### Step 1: Clone Repository

```bash
git clone https://github.com/jensliew/event-rsvp-system.git
cd event-rsvp-system
```

### Step 2: Configure AWS Resources

1. Create RDS MySQL database and events table
2. Create DynamoDB table `event-rsvp-responses` with `pk` and `sk` keys
3. Create S3 bucket and enable static website hosting
4. Create CloudFront distribution pointing to S3
5. Create Lambda function with Node.js 18.x runtime
6. Create API Gateway HTTP API with all required routes
7. Attach DynamoDB permissions to Lambda execution role

### Step 3: Update Environment Variables

**`events.js` — Frontend API endpoint:**
```javascript
const API_BASE_URL = 'https://YOUR_API_GATEWAY_DOMAIN.execute-api.ap-southeast-1.amazonaws.com';
```

**Lambda environment variables (via Lambda console):**
```
DB_HOST=your-rds-endpoint
DB_USER=admin
DB_PASS=your-password
DB_NAME=events_db
REGION=ap-southeast-1
```

### Step 4: Add GitHub Secrets

Go to repo → Settings → Secrets and Variables → Actions:

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
S3_BUCKET_NAME
CLOUDFRONT_DISTRIBUTION_ID
LAMBDA_FUNCTION_NAME
```

### Step 5: Push Code

```bash
git add .
git commit -m "Initial setup"
git push origin main
```

GitHub Actions will auto-deploy to S3/CloudFront and Lambda.

---

## 💻 Local Development

### Run Frontend Locally

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

### Backend Testing

```bash
cd backend
npm install
# Test with AWS SAM or Lambda testing tools
```

---

## 🔄 Deployment

### Automatic (GitHub Actions)

- **Frontend:** Triggered by changes to `app.js`, `events.js`, `utils.js`, `index.html`, `style.css`
- **Backend:** Triggered by changes to `backend/**`

### Manual

**Frontend:**
```bash
aws s3 sync . s3://bucket --exclude 'backend/*' --exclude '.git/*'
aws cloudfront create-invalidation --distribution-id ID --paths "/*"
```

**Backend:**
```bash
cd backend && npm install --production && zip -r lambda-function.zip .
aws lambda update-function-code --function-name NAME --zip-file fileb://lambda-function.zip
```

---

## 🔌 API Endpoints

### GET /events
List all events

### GET /event/{event_id}
Single event details

### GET /stats/{event_id}
RSVP counts: `{"Yes": 5, "No": 2}`

### GET /attendees/{event_id}?response=Yes
Attendee list (optionally filtered)

### POST /rsvp
Submit RSVP: `{"event_id", "full_name", "email", "response"}`

---

## 🐛 Troubleshooting

**Events not loading:**
- Verify `API_BASE_URL` in `events.js`
- Check Lambda CloudWatch logs
- Confirm CORS headers in Lambda response

**500 errors on /stats:**
1. Check CloudWatch logs: `/aws/lambda/your-function`
2. Verify DynamoDB table `event-rsvp-responses` exists
3. Confirm Lambda execution role has DynamoDB permissions
4. Test: `curl https://your-api/stats/event-id`

**Images not showing:**
- Verify S3 bucket public read access
- Check CloudFront URL in database

**"Resource not found" error:**
- Verify API Gateway routes are created and deployed
- Confirm Lambda integration on each route

---

## 📝 Key Implementation Notes

1. **HTTP API Gateway**: Uses path parsing since HTTP API doesn't populate `pathParameters`:
   ```javascript
   const eventId = event.requestContext.http.path.split('/').pop();
   ```

2. **DynamoDB Design**: Composite keys for efficient queries
   - Partition: `EVENT#id`, Sort: `RESPONSE#Yes/No` or `RESPONDENT#email`

3. **Duplicate Prevention**: DynamoDB conditional writes ensure one email per event

4. **CORS**: Enabled for all origins to support CloudFront and localhost

---

Last updated: March 28, 2026
