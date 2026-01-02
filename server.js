const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const DIST_DIR = path.join(__dirname, 'dist');

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static(DIST_DIR, {
  maxAge: 0,
  etag: false,
}));

app.get('/{*splat}', (req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).send('Application is starting. Please wait for build to complete.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving static files from: ${DIST_DIR}`);
  if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.log('index.html found - ready to serve');
  } else {
    console.log('Warning: index.html not found in dist folder');
  }
});
