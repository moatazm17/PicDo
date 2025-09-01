# PicDo - Turn Screenshots into Actions

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

PicDo is a complete MVP that transforms any screenshot into actionable items using AI. Simply share or pick an image, and PicDo will extract text using Google Cloud Vision, classify it with OpenAI, and provide one-tap actions to add events to your calendar, save contacts, open addresses in maps, or track expenses.

## 🚀 Features

- **📱 Mobile App**: Cross-platform React Native app with Expo
- **🤖 AI Processing**: OCR with Google Cloud Vision + Classification with OpenAI GPT-4o mini
- **🌍 Multilingual**: English + Arabic with RTL support
- **📅 Calendar Integration**: Add events directly to device calendar
- **👥 Contact Management**: Save contacts to device address book
- **🗺️ Maps Integration**: Open addresses in Apple/Google Maps
- **💰 Expense Tracking**: Save and categorize expenses
- **📊 Usage Tracking**: Monthly limit of 50 processed images
- **🎨 Modern UI**: Beautiful gradient design with dark mode support

## 📁 Project Structure

```
PicDo/
├── mobile/                 # Expo React Native app
│   ├── app/               # Expo Router screens
│   ├── src/               # Source code
│   │   ├── contexts/      # React contexts (Theme, Language)
│   │   ├── services/      # API service
│   │   ├── utils/         # Utilities (storage, permissions, actions)
│   │   └── constants/     # Configuration and design tokens
│   └── assets/            # Images and fonts
├── server/                # Node.js Express server
│   └── src/
│       ├── models/        # MongoDB models
│       ├── routes/        # API routes
│       ├── services/      # Vision, AI, Image services
│       └── middleware/    # Rate limiting
└── docs/                  # Documentation and API collection
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+
- MongoDB (local or cloud)
- Google Cloud Vision API key
- OpenAI API key
- Expo CLI (`npm install -g @expo/cli`)

### 1. Clone and Install

```bash
git clone <repository-url>
cd PicDo
npm run install:all
```

### 2. Server Setup

```bash
cd server
cp env.example .env
```

Edit `.env` with your API keys:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/picdo
OPENAI_API_KEY=sk-your-openai-api-key-here
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
MONTHLY_LIMIT=50
```

**Google Cloud Vision Setup:**
1. Create a Google Cloud Project
2. Enable the Vision API
3. Create a service account and download the JSON key
4. Set `GOOGLE_APPLICATION_CREDENTIALS` to the path of your JSON key

**Start the server:**
```bash
npm run dev
```

The server will run on `http://localhost:3000`

### 3. Mobile App Setup

```bash
cd mobile
npx expo start
```

Choose your platform:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator  
- Scan QR code with Expo Go app on your device

## 📱 Mobile App Usage

### Core Flow

1. **Onboarding**: Beautiful gradient intro explaining the app
2. **Home**: Pick image from gallery or share to the app
3. **Upload**: Real-time processing with OCR → AI → Ready states
4. **Result**: View extracted data with editable fields + big CTA button
5. **History**: Browse past items with type filters

### Supported Actions

- **📅 Events**: Add to calendar with date, time, location
- **💰 Expenses**: Save with amount, merchant, currency  
- **👥 Contacts**: Save name and phone to device contacts
- **📍 Addresses**: Open in Maps (Apple/Google) with location query

### Features

- **🌍 Language Toggle**: Switch between English and Arabic (RTL)
- **🌙 Dark Mode**: Auto, light, or dark theme
- **📊 Smart Limits**: Friendly 50/month limit with reset info
- **⚡ Background Processing**: Continue processing when app is backgrounded
- **🔔 Toast Notifications**: Success/error feedback with haptics

## 🔧 API Documentation

### Base URL
```
http://localhost:3000
```

### Endpoints

#### POST /jobs
Upload and process an image.

**Headers:**
- `x-user-id`: UUID (auto-generated on first app launch)
- `accept-language`: `en` or `ar`

**Body (multipart/form-data):**
- `image`: Image file
- `wantThumb`: `true/false` (optional)
- `source`: `picker` or `share` (optional)

**Response:**
```json
{
  "jobId": "uuid",
  "status": "received"
}
```

**Error Response (429 - Rate Limited):**
```json
{
  "error": "limit_reached",
  "message": "You reached this month's limit (50). It resets next month."
}
```

#### GET /jobs/:jobId
Get job status and results.

**Response:**
```json
{
  "jobId": "uuid",
  "status": "ready",
  "type": "event",
  "fields": {
    "title": "Meeting with John",
    "date": "2024-01-15",
    "time": "14:00",
    "location": "Conference Room A"
  },
  "summary": "Meeting with John – 2024-01-15 14:00",
  "thumb": "base64-encoded-thumbnail",
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:05:00Z"
}
```

#### GET /history
Get user's processing history.

**Query Parameters:**
- `userId`: User UUID (or use `x-user-id` header)
- `limit`: Number of items (default: 50, max: 100)
- `cursor`: Pagination cursor
- `type`: Filter by type (`event`, `expense`, `contact`, `address`)

**Response:**
```json
{
  "items": [
    {
      "jobId": "uuid",
      "type": "expense",
      "summary": "Starbucks – $4.50",
      "fields": { "amount": 4.50, "merchant": "Starbucks" },
      "thumb": "base64-thumbnail",
      "action": { "applied": true, "type": "expense" },
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ],
  "nextCursor": "2024-01-01T11:00:00Z"
}
```

#### POST /jobs/:jobId/mark-action
Mark an action as applied.

**Body:**
```json
{
  "applied": true,
  "type": "calendar"
}
```

## 🏗️ Architecture

### Server Architecture

- **Express.js** with MongoDB for data persistence
- **Google Cloud Vision** for OCR text extraction
- **OpenAI GPT-4o mini** for intelligent classification
- **Sharp** for image compression and thumbnail generation
- **Rate limiting** with monthly usage caps per user

### Mobile Architecture

- **Expo Router** for navigation
- **React Context** for theme and language management
- **AsyncStorage** for local data persistence
- **Expo APIs** for calendar, contacts, camera, and maps integration
- **i18next** for internationalization with RTL support

### Data Flow

1. User picks/shares image → Mobile app
2. Image uploaded to server with user UUID
3. Server: Rate limit check → OCR → AI classification → Store results
4. Mobile app polls for completion
5. Results displayed with editable fields
6. User taps CTA → Native action executed
7. Action marked as applied on server

## 🔒 Privacy & Security

- **No image storage**: Only OCR text and small thumbnails stored
- **UUID-based users**: No personal information required
- **Local processing**: Actions executed on device
- **Rate limiting**: Prevents abuse with monthly limits
- **HTTPS ready**: Secure API communication

## 🚀 Deployment

### Server Deployment (Railway)

**Quick Deploy:**
1. Push code to GitHub
2. Connect repository to [Railway.app](https://railway.app)
3. Set environment variables in Railway dashboard:
   ```env
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/picdo
   OPENAI_API_KEY=sk-your-openai-api-key-here
   GOOGLE_CLOUD_VISION_KEY={"type":"service_account",...}
   MONTHLY_LIMIT=50
   ```
4. Railway auto-deploys on push!

**Detailed Guide:** See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

### Mobile App Deployment

**Development:**
```bash
cd mobile
npx expo start
```

**Production Build:**
```bash
# iOS
npx expo build:ios

# Android
npx expo build:android
```

**Update API URL:** After Railway deployment, update `mobile/src/constants/config.js` with your Railway URL.

## 📊 Monitoring & Analytics

### Health Check
```bash
GET /health
```

### Usage Stats
```bash
GET /history/stats?userId=<uuid>
```

Returns monthly usage, limits, and type breakdown.

## 🧪 Testing

### Manual E2E Test

1. Start server: `cd server && npm run dev`
2. Start mobile app: `cd mobile && npx expo start`
3. Complete onboarding flow
4. Pick a screenshot with text (receipt, event, contact)
5. Verify OCR extraction and AI classification
6. Test the CTA action (calendar, maps, contacts)
7. Check history screen for saved item
8. Test language switching and RTL layout

### API Testing

Import the Postman collection from `/docs/PicDo-API.postman_collection.json` for comprehensive API testing.

## 🐛 Troubleshooting

### Common Issues

**"Google Cloud Vision credentials not configured"**
- Ensure `GOOGLE_APPLICATION_CREDENTIALS` points to valid service account JSON
- Or set `GOOGLE_CLOUD_VISION_KEY` with JSON content directly

**"Network request failed"**
- Check server is running on `http://localhost:3000`
- Update `API_BASE_URL` in mobile app config if needed

**"Permission denied" errors**
- Grant camera, photo, calendar, contacts permissions in device settings
- Check app.json permissions configuration

**OCR not working**
- Ensure image has clear, readable text
- Check Google Cloud Vision API quotas and billing

**Rate limiting issues**
- Monthly limit resets automatically
- Check MongoDB for job count verification

## 📞 Support

For issues and feature requests:
- Create GitHub issues
- Email: support@picdo.app

## 📄 License

MIT License - see LICENSE file for details.

---

**PicDo** - Turn any screenshot into instant action! 📱✨
