const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const initializeDatabase = require('./config/database');
const logger = require('./services/Logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Request logging middleware
app.use(async (req, res, next) => {
  const startTime = Date.now();
  
  // Log when response finishes
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    await logger.logRequest(req, res, duration);
  });
  
  next();
});

// Serve auth.html as default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/auth.html'));
});

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/knowledge-bases', require('./routes/knowledge-bases'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, async () => {
  await initializeDatabase();
  console.log(`Server running on port ${PORT}`);
});