# PicDo Architecture Overview

## System Architecture

PicDo is built as a client-server architecture with the following components:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│   Mobile App    │◄──►│   Express.js     │◄──►│    MongoDB      │
│  (React Native)│    │     Server       │    │   Database      │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   External APIs  │
                       │                  │
                       │ • Google Vision  │
                       │ • OpenAI GPT-4o  │
                       └──────────────────┘
```

## Mobile App Architecture

### Technology Stack
- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context + Hooks
- **Storage**: AsyncStorage for local persistence
- **Internationalization**: i18next with RTL support
- **UI/UX**: Custom components with design system

### Key Components

```
mobile/
├── app/                    # Expo Router screens
│   ├── _layout.js         # Root layout with providers
│   ├── index.js           # Entry point with routing logic
│   ├── onboarding.js      # First-time user experience
│   ├── upload.js          # Processing screen with progress
│   ├── result.js          # Main result screen with CTA
│   └── (tabs)/            # Tab-based navigation
│       ├── _layout.js     # Tab navigator configuration
│       ├── home.js        # Empty state + image picker
│       ├── history.js     # Past items with filters
│       └── settings.js    # Language, theme, help
├── src/
│   ├── contexts/          # React Context providers
│   │   ├── ThemeContext.js    # Dark/light mode + colors
│   │   └── LanguageContext.js # i18n + RTL support
│   ├── services/
│   │   └── api.js         # HTTP client with error handling
│   ├── utils/
│   │   ├── storage.js     # AsyncStorage wrapper
│   │   ├── permissions.js # Device permissions handling
│   │   ├── actions.js     # Native actions (calendar, contacts)
│   │   └── i18n.js        # Translation configuration
│   └── constants/
│       └── config.js      # Design tokens + API config
└── assets/               # Icons, images, fonts
```

### Data Flow

1. **User picks image** → Image picker API
2. **Image uploaded** → API service with UUID header
3. **Poll for results** → Periodic API calls
4. **Display results** → Result screen with editable fields
5. **Execute action** → Native APIs (Calendar, Contacts, Maps)
6. **Mark as applied** → Server notification

## Server Architecture

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Image Processing**: Sharp for compression/thumbnails
- **OCR**: Google Cloud Vision API
- **AI**: OpenAI GPT-4o mini
- **File Upload**: Multer middleware

### API Design

```
server/src/
├── index.js              # Express app setup + middleware
├── models/               # MongoDB schemas
│   ├── User.js          # User profiles with language/settings
│   └── Job.js           # Processing jobs with status tracking
├── routes/               # API endpoints
│   ├── jobs.js          # CRUD operations for processing jobs
│   └── history.js       # User history + statistics
├── services/             # Business logic
│   ├── visionService.js # Google Cloud Vision integration
│   ├── aiService.js     # OpenAI GPT classification
│   └── imageService.js  # Image compression + thumbnails
└── middleware/
    └── rateLimiter.js   # Monthly usage limits
```

### Processing Pipeline

```
Image Upload → Rate Limit Check → Job Creation → Background Processing
                                                        │
                                                        ▼
Response (202)                                 OCR (Google Vision)
                                                        │
                                                        ▼
Client Polls ◄── Job Status Updates ◄── AI Classification (OpenAI)
                                                        │
                                                        ▼
Result Ready                                   Store Results + Thumbnail
```

## Data Models

### User Document
```javascript
{
  userId: String,           // UUID generated on first app launch
  lang: "en" | "ar",       // User's preferred language
  pushToken: String,       // Optional: for push notifications
  createdAt: Date
}
```

### Job Document
```javascript
{
  jobId: String,           // Unique job identifier
  userId: String,          // Reference to user
  status: String,          // "received" | "ocr_in_progress" | "ready" | "failed"
  source: String,          // "picker" | "share"
  ocrText: String,         // Extracted text from image
  type: String,            // "event" | "expense" | "contact" | "address"
  classification: Object,   // Raw AI response
  fields: Object,          // Normalized fields by type
  summary: String,         // Human-readable summary
  thumb: String,           // Base64 thumbnail (optional)
  action: {
    applied: Boolean,      // Has user executed the action?
    type: String,          // "calendar" | "expense" | "contact" | "maps"
    appliedAt: Date        // When action was executed
  },
  error: {
    code: String,          // Error code for failed jobs
    message: String        // Human-readable error message
  },
  createdAt: Date,
  updatedAt: Date
}
```

## API Contract

### Core Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/jobs` | Upload image for processing |
| `GET` | `/jobs/:id` | Get job status and results |
| `POST` | `/jobs/:id/mark-action` | Mark action as applied |
| `GET` | `/history` | Get user's processing history |
| `GET` | `/history/stats` | Get usage statistics |
| `GET` | `/health` | Server health check |

### Authentication
- **Header-based**: `x-user-id` with UUID
- **No passwords**: Device-generated UUID persisted locally
- **Language header**: `accept-language` for i18n

### Rate Limiting
- **Monthly limit**: 50 successful jobs per user
- **Enforcement**: Server-side with MongoDB aggregation
- **Reset**: Automatic at month boundary
- **Error response**: HTTP 429 with friendly message

## External Integrations

### Google Cloud Vision API
- **Purpose**: OCR text extraction from images
- **Method**: DOCUMENT_TEXT_DETECTION for structured text
- **Authentication**: Service account JSON key
- **Error handling**: Graceful fallback with user feedback

### OpenAI GPT-4o Mini
- **Purpose**: Intelligent classification of extracted text
- **Model**: Cost-effective GPT-4o mini variant
- **Prompt engineering**: Structured JSON response format
- **Schema validation**: Strict output format enforcement

### Mobile Platform APIs
- **Calendar**: Expo Calendar for event creation
- **Contacts**: Expo Contacts for contact saving
- **Maps**: Deep links to Apple/Google Maps
- **Camera**: Expo ImagePicker for image selection
- **Storage**: AsyncStorage for local persistence

## Security & Privacy

### Data Protection
- **No image storage**: Only OCR text and small thumbnails
- **Minimal data**: UUID-based users, no PII
- **Local actions**: Calendar/contacts saved on device
- **HTTPS**: Encrypted API communication

### Rate Limiting
- **Monthly caps**: Prevent API abuse
- **Per-user tracking**: MongoDB aggregation
- **Graceful degradation**: Friendly error messages

### Error Handling
- **Client-side**: Comprehensive error states
- **Server-side**: Structured error responses
- **Logging**: Minimal logging without PII
- **Fallbacks**: Graceful degradation on API failures

## Performance Considerations

### Image Processing
- **Compression**: Sharp library for size reduction
- **Thumbnails**: Small base64 previews for UI
- **Background processing**: Non-blocking job queue
- **Memory management**: Cleanup after processing

### Database Optimization
- **Indexes**: Optimized queries on userId, createdAt
- **Aggregation**: Efficient monthly usage calculation
- **Cleanup**: Optional job retention policies

### Mobile Performance
- **Lazy loading**: Images and heavy components
- **Caching**: AsyncStorage for offline support
- **Background processing**: Continue when app backgrounded
- **Polling strategy**: Exponential backoff for job status

## Scalability

### Horizontal Scaling
- **Stateless server**: Easy to replicate
- **Database**: MongoDB sharding support
- **Load balancing**: Standard HTTP load balancers
- **CDN**: Static assets via CDN

### Monitoring
- **Health checks**: `/health` endpoint
- **Logging**: Structured JSON logs
- **Metrics**: API usage, error rates
- **Alerts**: Failed jobs, API quota limits

## Deployment Architecture

### Development
```
Local MongoDB ◄── Local Express Server ◄── Expo Dev Server
                                                    │
                                                    ▼
                                            iOS/Android Simulator
```

### Production
```
MongoDB Atlas ◄── Railway/Heroku Server ◄── App Store/Google Play
                                                    │
                                                    ▼
                                              User Devices
```

This architecture provides a robust, scalable foundation for the PicDo MVP while maintaining simplicity and cost-effectiveness.
