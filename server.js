const express = require('express');
const path = require('path');
const cors = require('cors');
const { getDatabase } = require('./database/init.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const db = getDatabase();

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Debug endpoint to check database status
app.get('/api/debug', (req, res) => {
    // Check if database file exists and tables are created
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='stat_packages'", [], (err, row) => {
        if (err) {
            res.json({ error: 'Database error', details: err.message });
            return;
        }
        
        if (!row) {
            res.json({ error: 'stat_packages table does not exist', dbPath: process.env.NODE_ENV === 'production' ? '/tmp/baseball_draft.db' : 'local' });
            return;
        }
        
        // Count rows in stat_packages
        db.get("SELECT COUNT(*) as count FROM stat_packages", [], (err, countRow) => {
            if (err) {
                res.json({ error: 'Error counting stat packages', details: err.message });
                return;
            }
            
            res.json({ 
                status: 'Database OK', 
                tableExists: true, 
                statPackageCount: countRow.count,
                dbPath: process.env.NODE_ENV === 'production' ? '/tmp/baseball_draft.db' : 'local'
            });
        });
    });
});

// Get all stat packages
app.get('/api/stat-packages', (req, res) => {
    console.log('Fetching stat packages...');
    
    db.all('SELECT * FROM stat_packages', [], (err, rows) => {
        if (err) {
            console.error('Database error:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        
        console.log(`Found ${rows.length} stat packages`);
        
        if (rows.length === 0) {
            res.status(500).json({ error: 'No stat packages found - database may not be initialized' });
            return;
        }
        
        try {
            // Parse JSON strings back to arrays
            const packages = rows.map(pkg => ({
                ...pkg,
                hitting_categories: JSON.parse(pkg.hitting_categories),
                pitching_categories: JSON.parse(pkg.pitching_categories)
            }));
            
            res.json(packages);
        } catch (parseErr) {
            console.error('JSON parse error:', parseErr.message);
            res.status(500).json({ error: 'Error parsing stat package data' });
        }
    });
});

// Create new draft room
app.post('/api/rooms', (req, res) => {
    const { name, creator_name, max_teams, stat_package } = req.body;
    
    // Generate unique room ID
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const sql = `INSERT INTO draft_rooms (id, name, creator_name, max_teams, stat_package)
                 VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [roomId, name, creator_name, max_teams, stat_package], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({ 
            roomId,
            message: 'Draft room created successfully',
            shareUrl: `${req.protocol}://${req.get('host')}/join/${roomId}`
        });
    });
});

// Get room details
app.get('/api/rooms/:roomId', (req, res) => {
    const { roomId } = req.params;
    
    db.get('SELECT * FROM draft_rooms WHERE id = ?', [roomId], (err, room) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!room) {
            res.status(404).json({ error: 'Room not found' });
            return;
        }
        
        // Get stat package details
        db.get('SELECT * FROM stat_packages WHERE id = ?', [room.stat_package], (err, statPkg) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            res.json({
                ...room,
                stat_package_details: statPkg ? {
                    ...statPkg,
                    hitting_categories: JSON.parse(statPkg.hitting_categories),
                    pitching_categories: JSON.parse(statPkg.pitching_categories)
                } : null
            });
        });
    });
});

// Get players (for draft interface later)
app.get('/api/players', (req, res) => {
    const { position, limit = 50 } = req.query;
    
    let sql = `SELECT p.*, h.barrels, h.xwoba, h.max_exit_velocity, h.hard_hit_percent 
               FROM players p 
               JOIN hitting_stats h ON p.id = h.player_id 
               WHERE h.season = 2025`;
    
    const params = [];
    
    if (position && position !== 'ALL') {
        sql += ' AND p.primary_position = ?';
        params.push(position);
    }
    
    sql += ' ORDER BY h.barrels DESC LIMIT ?';
    params.push(parseInt(limit));
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Serve static pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/join/:roomId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'join.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Database connected with ${db ? 'success' : 'error'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('✓ Database connection closed');
        }
        process.exit(0);
    });
});