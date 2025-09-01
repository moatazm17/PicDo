# Railway Deployment Guide 🚂

Deploy PicDo server to Railway in minutes!

## Prerequisites

- GitHub account
- Railway account (free tier available)
- Your API keys ready (Google Vision + OpenAI)

## 🚀 Quick Deploy

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial PicDo commit"
git branch -M main
git remote add origin https://github.com/yourusername/picdo.git
git push -u origin main
```

### 2. Connect to Railway

1. Go to [Railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your PicDo repository
6. Railway will auto-detect and deploy!

### 3. Configure Environment Variables

In Railway dashboard, go to your project → Variables tab and add:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/picdo
OPENAI_API_KEY=sk-your-openai-api-key-here
GOOGLE_CLOUD_VISION_KEY={"type":"service_account","project_id":"your-project",...}
MONTHLY_LIMIT=50
```

**Important**: Use `GOOGLE_CLOUD_VISION_KEY` with the full JSON content instead of a file path for Railway.

### 4. Update Mobile App

Update the API URL in your mobile app:

```javascript
// mobile/src/constants/config.js
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000'
  : 'https://your-railway-app.railway.app'; // Replace with your Railway URL
```

## 📋 Railway Configuration Files

The project includes these Railway-specific files:

### `railway.json`
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd server && npm install"
  },
  "deploy": {
    "startCommand": "cd server && npm start",
    "healthcheckPath": "/health"
  }
}
```

### `nixpacks.toml`
Configures the build environment with Node.js 18.

### `Procfile`
Fallback process definition for Railway.

## 🔧 Environment Variables Setup

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | Database connection | `mongodb+srv://...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `GOOGLE_CLOUD_VISION_KEY` | Google Vision JSON | `{"type":"service_account",...}` |
| `MONTHLY_LIMIT` | Usage limit | `50` |

### Google Cloud Vision Setup for Railway

Instead of using a file, paste the entire JSON content:

1. Open your `google-service-account.json`
2. Copy the entire JSON content
3. Paste it as the value for `GOOGLE_CLOUD_VISION_KEY`
4. Make sure it's properly escaped (Railway handles this automatically)

## 🏗️ Build Process

Railway will:

1. **Detect**: Auto-detect Node.js project
2. **Install**: Run `npm install` in server directory
3. **Build**: No build step needed (pure Node.js)
4. **Deploy**: Start with `npm start`
5. **Health Check**: Monitor `/health` endpoint

## 🌐 Custom Domain (Optional)

1. In Railway dashboard → Settings
2. Click "Generate Domain" for free `.railway.app` subdomain
3. Or add your custom domain

## 📊 Monitoring

Railway provides:

- **Logs**: Real-time application logs
- **Metrics**: CPU, memory, network usage
- **Health Checks**: Automatic restart on failures
- **Deploy History**: Rollback to previous versions

## 🔒 Security

### Environment Variables
- All secrets stored securely in Railway
- Never commit API keys to Git
- Use Railway's built-in variable management

### CORS Configuration
Update server CORS for production:

```javascript
// server/src/index.js
app.use(cors({
  origin: [
    'http://localhost:8081', 
    'exp://192.168.1.100:8081',
    'https://your-production-domain.com' // Add your production domains
  ],
  credentials: true
}));
```

## 🚨 Troubleshooting

### "Google Cloud Vision credentials not configured"
- Ensure `GOOGLE_CLOUD_VISION_KEY` contains valid JSON
- Check the JSON is properly formatted
- Verify the service account has Vision API permissions

### "MongoDB connection failed"
- Use MongoDB Atlas (free tier available)
- Ensure connection string includes username/password
- Whitelist Railway's IP addresses in MongoDB Atlas

### "Build failed"
- Check Railway build logs
- Ensure `server/package.json` has correct dependencies
- Verify Node.js version compatibility

### "Health check failed"
- Ensure `/health` endpoint returns 200 status
- Check server starts without errors
- Verify PORT environment variable usage

## 💡 Pro Tips

1. **Use MongoDB Atlas**: Free tier perfect for MVP
2. **Monitor Usage**: Check Railway usage to avoid overages
3. **Environment Branches**: Use Railway's branch deployments for staging
4. **Database Backups**: Set up MongoDB Atlas automated backups
5. **Error Monitoring**: Add error tracking service (Sentry, etc.)

## 🔄 CI/CD

Railway automatically:
- **Deploys** on every push to main branch
- **Rebuilds** when dependencies change
- **Restarts** on configuration changes
- **Scales** based on traffic (paid plans)

## 📱 Mobile App Update

After Railway deployment, update mobile app config:

```javascript
// mobile/src/constants/config.js
export const API_BASE_URL = 'https://picdo-production.railway.app';
```

Then rebuild and redeploy your mobile app.

## 🎉 You're Live!

Your PicDo server is now running on Railway! 

Test it:
```bash
curl https://your-railway-app.railway.app/health
```

---

**Railway + PicDo = Instant AI-powered screenshot processing in the cloud!** 🚂✨
