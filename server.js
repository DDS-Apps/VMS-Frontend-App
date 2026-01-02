const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const DIST_DIR = path.join(__dirname, 'dist');

app.disable('x-powered-by');

app.use(function(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

app.get('/health', function(req, res) {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use(express.static(DIST_DIR, {
  maxAge: 0,
  etag: true,
  index: 'index.html'
}));

app.use(function(req, res) {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not built. Run: npx expo export --platform web');
  }
});

app.listen(PORT, '0.0.0.0', function() {
  console.log('Production server running on http://0.0.0.0:' + PORT);
  console.log('Serving Expo web app from: ' + DIST_DIR);
});
