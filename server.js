const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DIST_DIR = path.join(__dirname, 'dist');

app.use(express.static(DIST_DIR));

app.get('/*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
