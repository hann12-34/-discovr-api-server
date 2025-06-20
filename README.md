# Discovr Events API Server

A centralized backend server for collecting and serving event data to the Discovr iOS application.

## Features

- REST API with MongoDB storage
- Automated web scrapers for event collection:
  - Eventbrite events
  - Meetup events
  - Tourism Vancouver events
- Event categorization by type and season
- Event status tracking (upcoming, active, ended)
- Simple API key authentication

## Getting Started

### Prerequisites

- Node.js v16+ and npm
- MongoDB (local or cloud instance)

### Installation

1. Clone/download this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure environment variables in `.env`:
   - Set `MONGODB_URI` to your MongoDB connection string
   - Set `API_KEY` to a secure API key
   - Optionally modify `PORT` (default: 3000)

### Running the API Server

**Development Mode (no scrapers):**
```
npm run dev
```

**Development Mode (with scrapers):**
```
ENABLE_SCRAPERS=true npm run dev
```

**Production Mode (with scrapers):**
```
NODE_ENV=production npm start
```

## Deployment

### Deploying to Heroku

1. Install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) if not already installed

2. Login to Heroku:
   ```
   heroku login
   ```

3. Create a new Heroku app:
   ```
   heroku create discovr-api-server
   ```
   Note: Replace "discovr-api-server" with your preferred app name

4. Add a MongoDB add-on or set up your own MongoDB database:
   ```
   heroku addons:create mongolab:sandbox
   ```
   Or set your existing MongoDB connection string:
   ```
   heroku config:set MONGODB_URI=your_mongodb_connection_string
   ```

5. Configure environment variables:
   ```
   heroku config:set NODE_ENV=production
   heroku config:set ENABLE_SCRAPERS=true
   heroku config:set JWT_SECRET=your_jwt_secret_key
   heroku config:set API_KEY=your_api_key
   ```

6. Deploy your app:
   ```
   git push heroku main
   ```
   Note: If your branch is not named "main", use `git push heroku your_branch:main`

7. Open your deployed app:
   ```
   heroku open
   ```
   
8. Check the logs if needed:
   ```
   heroku logs --tail
   ```

### Connect Your iOS App to the Deployed API

Update your iOS app's API base URL configuration to point to your Heroku app URL:

```swift
// In your API configuration file
let baseURL = "https://your-app-name.herokuapp.com/api/v1"
```

Your TestFlight users will now connect to your deployed API server instead of your local development server.

## API Documentation

The API requires an API key for authentication, sent as an `X-API-Key` header.

### Endpoints

#### Get Events

```
GET /api/v1/events
```

Query parameters:
- `type`: Filter by event type (music, food, culture, etc.)
- `season`: Filter by season (winter, spring, summer, fall)
- `status`: Filter by status (upcoming, active, ended)
- `source`: Filter by source website
- `startDate`: Filter events after this date (ISO format)
- `endDate`: Filter events before this date (ISO format)
- `limit`: Maximum number of events to return (default: 100)

#### Get Single Event

```
GET /api/v1/events/:id
```

#### Create Event

```
POST /api/v1/events
```

Include event data in request body.

#### Update Event

```
PUT /api/v1/events/:id
```

Include event data to update in request body.

#### Delete Event

```
DELETE /api/v1/events/:id
```

## Web Scrapers

The server includes automated scrapers for the following sources:
- Eventbrite
- Meetup
- Tourism Vancouver

Scrapers run:
- On server startup (if enabled)
- Daily at midnight (configurable in scraperManager.js)

## iOS App Integration

In the iOS app's `WebScraperService.swift`:
1. Set `apiBaseURL` to the URL of this server
2. Set `apiKey` to match the API key in the server's `.env` file
3. Use `fetchEventsFromAPI()` method to get events from the API

## Production Deployment

For production deployment, consider:
- Using a process manager like PM2
- Setting up a reverse proxy with Nginx
- Securing MongoDB with proper authentication
- Using environment variables for all sensitive info
