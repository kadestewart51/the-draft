const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Initialize database
function initDatabase() {
    const dbPath = process.env.NODE_ENV === 'production' 
        ? '/tmp/baseball_draft.db' 
        : path.join(__dirname, 'baseball_draft.db');
    
    // Remove existing database for fresh start (only in development)
    if (process.env.NODE_ENV !== 'production' && fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log('Removed existing database');
    }
    
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database:', err.message);
            return;
        }
        console.log('Connected to SQLite database');
    });
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements and execute
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    db.serialize(() => {
        statements.forEach((statement, index) => {
            db.run(statement + ';', (err) => {
                if (err) {
                    console.error(`Error executing statement ${index + 1}:`, err.message);
                    console.error('Statement:', statement.substring(0, 100) + '...');
                } else {
                    console.log(`✓ Executed statement ${index + 1}`);
                }
            });
        });
    });
    
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('✓ Database initialized successfully');
            console.log('Database location:', dbPath);
        }
    });
}

// Database connection helper
function getDatabase() {
    // Use /tmp for writable storage on Render
    const dbPath = process.env.NODE_ENV === 'production' 
        ? '/tmp/baseball_draft.db' 
        : path.join(__dirname, 'baseball_draft.db');
    
    return new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error connecting to database:', err.message);
        }
    });
}

module.exports = { initDatabase, getDatabase };

// Run initialization if called directly
if (require.main === module) {
    initDatabase();
}