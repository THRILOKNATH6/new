const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./api/routes/authRoutes');
const profileRoutes = require('./api/routes/profileRoutes');
const hrRoutes = require('./api/routes/hrRoutes');
const itRoutes = require('./api/routes/itRoutes');
const ieRoutes = require('./api/routes/ieRoutes');
const cuttingRoutes = require('./api/routes/cuttingRoutes');
const path = require('path');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/it', itRoutes);
app.use('/api/ie', ieRoutes);
app.use('/api/cutting', cuttingRoutes);

// Static files for avatars
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

// Test DB Connection
const db = require('./config/db');
db.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ Database connected successfully at:', res.rows[0].now);
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
});
