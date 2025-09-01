# PicDo Quick Start 🚀

Get PicDo running in 5 minutes!

## Prerequisites ✅

- Node.js 18+ installed
- MongoDB running (local or Atlas)
- Google Cloud Vision API key
- OpenAI API key

## 1. Install Everything

```bash
npm run setup
```

## 2. Configure Server

```bash
cd server
cp env.example .env
```

Edit `.env` with your API keys:

```env
MONGODB_URI=mongodb://localhost:27017/picdo
OPENAI_API_KEY=sk-your-openai-key-here
GOOGLE_APPLICATION_CREDENTIALS=./google-service-account.json
```

## 3. Add Google Service Account

1. Download your Google Cloud service account JSON
2. Save it as `server/google-service-account.json`

## 4. Start Development

```bash
npm run dev
```

This starts both server and mobile app!

## 5. Test It

1. Open Expo app on your phone
2. Scan the QR code
3. Complete onboarding
4. Pick an image with text
5. Watch the magic happen! ✨

## Troubleshooting 🔧

**"Google Cloud Vision credentials not configured"**
- Make sure `google-service-account.json` exists in server folder

**"MongoDB connection failed"**
- Start MongoDB: `brew services start mongodb-community` (macOS)

**"Network request failed"**
- Make sure server is running on port 3000

## What's Next? 

Check out the full [README.md](./README.md) for detailed documentation!

---

**PicDo - Turn any screenshot into instant action!** 📱✨
