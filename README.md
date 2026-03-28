# Event RSVP System

## Project Structure

```
event-rsvp-tutorial/
├── frontend/           # Frontend application
│   ├── index.html      # Main HTML page
│   ├── style.css       # Stylesheets
│   ├── app.js          # Main application logic
│   ├── events.js       # Event-related functions
│   └── utils.js        # Utility functions
├── backend/            # Backend API (if applicable)
│   ├── index.js        # Backend server code
│   ├── package.json    # Backend dependencies
│   └── package-lock.json
├── node_modules/       # Dependencies
└── REFACTORING_SUMMARY.md
```

## Running the Application

### Frontend
```bash
cd frontend
python3 -m http.server 8000
```
Then open http://localhost:8000

### Backend (if applicable)
```bash
cd backend
npm install
npm start
```

## API Integration

The frontend connects to AWS API Gateway at:
`https://zywjpx8a33.execute-api.ap-southeast-1.amazonaws.com`

Banner images are served from CloudFront:
`https://d2uvl29py5b87v.cloudfront.net/banner/`