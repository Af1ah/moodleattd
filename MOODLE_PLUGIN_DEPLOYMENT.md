# Static Site Build for Moodle Plugin

## Overview
Your app has been built for server-side rendering, which is ideal for Moodle plugin deployment. The build output in `.next/` contains everything needed to run your attendance reporting app.

## Build Output Structure

```
.next/
├── server/          # Server-side code for Node.js
├── static/          # Pre-compiled static files (CSS, JS, images)
├── public/          # Public assets
└── required-server-files.json  # List of required files
```

## Deployment Options for Moodle Plugin

### Option 1: Node.js Server (Recommended for iframe/proxy embedding)
1. Install Node.js on your server
2. Copy the following to your Moodle plugin directory:
   - `.next/` folder
   - `node_modules/` folder (or install with npm install)
   - `package.json`

3. Start the server:
   ```bash
   npm install
   NODE_ENV=production node .next/standalone/server.js
   ```

### Option 2: Static Export with Limitations
If you need a pure static HTML/CSS/JS deployment without a Node.js server:
- The app currently supports server-side rendering for dynamic `/report/[reportId]` routes
- For static export, you'd need to pre-generate all possible report IDs at build time
- This is typically not feasible for Moodle plugins with dynamic content

### Option 3: Docker Containerization
Create a `Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY .next ./.next
COPY public ./public

EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
```

Then build and deploy:
```bash
docker build -t moodle-attendance:latest .
docker run -e NEXT_PUBLIC_MOODLE_TOKEN=xxx -e NEXT_PUBLIC_MOODLE_BASE_URL=xxx -p 3000:3000 moodle-attendance:latest
```

## Environment Variables for Moodle Plugin

The app requires these environment variables:

```bash
NEXT_PUBLIC_MOODLE_TOKEN=your_moodle_token  # Moodle API token
NEXT_PUBLIC_MOODLE_BASE_URL=https://your-moodle-domain.com  # Your Moodle instance URL
```

## Configuration for Moodle Integration

### In `next.config.ts`:
- ✅ **trailingSlash**: true (Moodle-friendly URLs)
- ✅ **images.unoptimized**: true (Works with Moodle proxy)
- ✅ Server-side rendering enabled (dynamic routes work)

### Moodle iframe Integration
```php
// In your Moodle plugin
$appUrl = 'http://your-app-server:3000';
$token = get_user_preferences('moodle_token');
$moodleUrl = $CFG->wwwroot;

// Embed in iframe
echo '<iframe src="' . $appUrl . '" width="100%" height="800"></iframe>';
```

### Environment Setup in Moodle
```php
// In config.php or .env.local
putenv('NEXT_PUBLIC_MOODLE_TOKEN=' . $token);
putenv('NEXT_PUBLIC_MOODLE_BASE_URL=' . $CFG->wwwroot);
```

## Build Size & Performance

Current build sizes:
- First Load JS: ~105 KB (home page)
- API route: ~102 KB
- Report page: ~115 KB
- Static pages are prerendered

## Key Features for Moodle Plugin

✅ Dynamic report routing (/report/[reportId])
✅ Server-side rendering (works with Moodle authentication)
✅ API proxy support (localhost API calls)
✅ Attendance data transformation
✅ CSV export capability
✅ Responsive design for mobile/tablet

## Testing Locally

```bash
npm run build
npm run start
# App runs on http://localhost:3000
```

## Troubleshooting

### Build Issues
- Clear cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Runtime Issues
- Check environment variables are set
- Verify Node.js version (20+ recommended)
- Check server logs for API connection errors

## Next Steps

1. **Set up a Node.js server** to host the app
2. **Configure environment variables** for your Moodle instance
3. **Test API connectivity** to your Moodle server
4. **Integrate with Moodle** via iframe or plugin integration
5. **Deploy to production** using Docker or direct Node.js hosting
