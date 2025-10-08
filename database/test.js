const { getDatabase } = require('./init.js');

// Test database functionality
function testDatabase() {
    const db = getDatabase();
    
    console.log('Testing database functionality...\n');
    
    // Test 1: Check if tables exist
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
        if (err) {
            console.error('Error querying tables:', err.message);
            return;
        }
        
        console.log('✓ Tables created:');
        rows.forEach(row => {
            console.log(`  - ${row.name}`);
        });
        console.log('');
        
        // Test 2: Check preset stat packages
        db.all("SELECT id, name, philosophy FROM stat_packages", [], (err, packages) => {
            if (err) {
                console.error('Error querying stat packages:', err.message);
                return;
            }
            
            console.log('✓ Preset stat packages:');
            packages.forEach(pkg => {
                console.log(`  - ${pkg.id}: ${pkg.name}`);
                console.log(`    ${pkg.philosophy}`);
            });
            console.log('');
            
            // Test 3: Insert a sample player and stats
            const samplePlayer = {
                savant_id: 'test_123',
                name: 'Test Player',
                team: 'TEST',
                primary_position: 'OF',
                birthdate: '1995-06-15',
                age: 28,
                bats: 'R',
                throws: 'R'
            };
            
            db.run(`INSERT INTO players (savant_id, name, team, primary_position, birthdate, age, bats, throws)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [samplePlayer.savant_id, samplePlayer.name, samplePlayer.team, 
                 samplePlayer.primary_position, samplePlayer.birthdate, samplePlayer.age,
                 samplePlayer.bats, samplePlayer.throws],
                function(err) {
                    if (err) {
                        console.error('Error inserting player:', err.message);
                        return;
                    }
                    
                    const playerId = this.lastID;
                    console.log(`✓ Inserted test player with ID: ${playerId}`);
                    
                    // Insert sample hitting stats
                    db.run(`INSERT INTO hitting_stats (player_id, barrels, wrc_plus, xwoba, hard_hit_percent)
                            VALUES (?, ?, ?, ?, ?)`,
                        [playerId, 25, 120, 0.365, 45.2],
                        (err) => {
                            if (err) {
                                console.error('Error inserting hitting stats:', err.message);
                                return;
                            }
                            console.log('✓ Inserted sample hitting stats');
                            
                            // Query back the data
                            db.all(`SELECT p.name, p.team, h.barrels, h.wrc_plus, h.xwoba 
                                   FROM players p 
                                   JOIN hitting_stats h ON p.id = h.player_id`,
                                [], (err, results) => {
                                    if (err) {
                                        console.error('Error querying data:', err.message);
                                        return;
                                    }
                                    
                                    console.log('✓ Sample data retrieved:');
                                    results.forEach(row => {
                                        console.log(`  ${row.name} (${row.team}): ${row.barrels} barrels, ${row.wrc_plus} wRC+, ${row.xwoba} xwOBA`);
                                    });
                                    
                                    console.log('\n✅ Database test completed successfully!');
                                    db.close();
                                });
                        });
                });
        });
    });
}

// Run test if called directly
if (require.main === module) {
    testDatabase();
}

module.exports = { testDatabase };