# PicDo Setup Guide

This guide will walk you through setting up PicDo locally for development and testing.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** ([Download](https://nodejs.org/))
- **MongoDB** (Local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Google Cloud Account** with Vision API enabled
- **OpenAI Account** with API access
- **Expo CLI** (`npm install -g @expo/cli`)
- **Git** for version control

## 🚀 Quick Start (5 minutes)

### 1. Clone and Install Dependencies

```bash
git clone <your-repository-url>
cd PicDo
npm run install:all
```

### 2. Set Up Environment Variables

```bash
cd server
cp env.example .env
```

Edit the `.env` file with your credentials:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/picdo
OPENAI_API_KEY=sk-your-openai-api-key-here
GOOGLE_APPLICATION_CREDENTIALS=./google-service-account.json
MONTHLY_LIMIT=50
```

### 3. Start the Server

```bash
cd server
npm run dev
```

Server should start at `http://localhost:3000`

### 4. Start the Mobile App

```bash
cd mobile
npx expo start
```

Choose your platform:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go on your device

## 🔧 Detailed Setup

### MongoDB Setup

#### Option 1: Local MongoDB
```bash
# macOS with Homebrew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt install mongodb
sudo systemctl start mongodb

# Windows - Download from mongodb.com
```

#### Option 2: MongoDB Atlas (Recommended)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/picdo`
4. Update `MONGODB_URI` in `.env`

### Google Cloud Vision API Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing one

2. **Enable Vision API**
   - Navigate to APIs & Services > Library
   - Search for "Cloud Vision API"
   - Click Enable

3. **Create Service Account**
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Name: `picdo-vision-api`
   - Role: `Cloud Vision API Service Agent`

4. **Download Credentials**
   - Click on created service account
   - Go to Keys tab
   - Click "Add Key" > "Create new key" > JSON
   - Download and save as `server/google-service-account.json`

5. **Update Environment**
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./google-service-account.json
   ```

### OpenAI API Setup

1. **Create OpenAI Account**
   - Sign up at [OpenAI](https://platform.openai.com/)
   - Add billing information (required for API access)

2. **Generate API Key**
   - Go to API Keys section
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)

3. **Update Environment**
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

### Mobile Development Setup

#### iOS Development (macOS only)
```bash
# Install Xcode from App Store
# Install Xcode Command Line Tools
xcode-select --install

# Install iOS Simulator (if not included with Xcode)
```

#### Android Development
```bash
# Install Android Studio
# Set up Android SDK and emulator
# Add to PATH (add to ~/.bashrc or ~/.zshrc):
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## 🧪 Testing Your Setup

### 1. Test Server Health
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

### 2. Test API with Postman
1. Import `docs/PicDo-API.postman_collection.json`
2. Set `baseUrl` to `http://localhost:3000`
3. Set `userId` to any UUID (e.g., `test-user-12345`)
4. Run the "Health Check" request

### 3. Test Mobile App
1. Complete onboarding flow
2. Tap "Pick from Gallery"
3. Select an image with text (receipt, screenshot, etc.)
4. Verify processing flow works
5. Check that result screen shows extracted data

## 🔍 Troubleshooting

### Common Issues

#### "Google Cloud Vision credentials not configured"
**Solution:**
- Verify `google-service-account.json` exists in server directory
- Check file permissions: `chmod 600 google-service-account.json`
- Ensure service account has Vision API permissions

#### "OpenAI API error: 401 Unauthorized"
**Solution:**
- Verify API key is correct and active
- Check OpenAI account billing status
- Ensure sufficient API credits

#### "MongoDB connection failed"
**Solution:**
```bash
# Check if MongoDB is running
brew services list | grep mongodb  # macOS
sudo systemctl status mongodb      # Linux

# Start MongoDB if stopped
brew services start mongodb-community  # macOS
sudo systemctl start mongodb          # Linux
```

#### "Network request failed" in mobile app
**Solution:**
- Ensure server is running on `http://localhost:3000`
- Check `API_BASE_URL` in `mobile/src/constants/config.js`
- For physical device, use your computer's IP address instead of localhost

#### "Permission denied" for camera/photos
**Solution:**
- iOS: Settings > PicDo > Allow Photos/Camera
- Android: Settings > Apps > PicDo > Permissions

#### Expo/React Native issues
**Solution:**
```bash
# Clear Expo cache
npx expo start --clear

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
cd mobile
rm -rf node_modules
npm install
```

### Performance Issues

#### Slow OCR processing
- Check Google Cloud Vision API quotas
- Verify image size (should be < 2MB)
- Check network connection

#### High memory usage
- Restart MongoDB: `brew services restart mongodb-community`
- Clear old jobs from database (optional cleanup script)

## 📱 Device Testing

### iOS (Physical Device)
1. Install Expo Go from App Store
2. Ensure iPhone and computer are on same WiFi
3. Scan QR code from Expo CLI

### Android (Physical Device)
1. Install Expo Go from Google Play Store
2. Enable Developer Options and USB Debugging
3. Scan QR code from Expo CLI

## 🚀 Production Deployment

### Server (Railway)
1. Connect GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on git push

### Mobile App (App Stores)
```bash
# Build for iOS
npx expo build:ios

# Build for Android
npx expo build:android
```

## 📊 Monitoring

### Server Logs
```bash
cd server
npm run dev  # Shows real-time logs
```

### Database Monitoring
```bash
# Connect to MongoDB
mongosh

# Switch to picdo database
use picdo

# Check collections
show collections

# View recent jobs
db.jobs.find().sort({createdAt: -1}).limit(5)
```

## 🔒 Security Notes

- Never commit `.env` files to version control
- Rotate API keys regularly
- Use HTTPS in production
- Implement rate limiting in production
- Monitor API usage and costs

## 📞 Getting Help

If you encounter issues:

1. Check this troubleshooting guide
2. Review server logs for errors
3. Test API endpoints with Postman
4. Check GitHub issues
5. Contact support: support@picdo.app

---

**Happy coding! 🚀**
