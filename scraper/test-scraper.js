const axios = require('axios');
const cheerio = require('cheerio');
const { getDatabase } = require('../database/init.js');

// Test scraping Baseball Savant leaderboards
async function testStatcastScraping() {
    console.log('🔄 Testing Baseball Savant Statcast leaderboard scraping...\n');
    
    try {
        // Test the main statcast leaderboard
        const response = await axios.get('https://baseballsavant.mlb.com/leaderboard/statcast?year=2024&abs=50', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        console.log(`✓ Got response from Baseball Savant (${response.status})`);
        console.log(`✓ Response size: ${Math.round(response.data.length / 1024)}KB`);
        
        // Parse the HTML
        const $ = cheerio.load(response.data);
        
        // Look for the data table
        const table = $('table').first();
        console.log(`✓ Found table element: ${table.length > 0 ? 'YES' : 'NO'}`);
        
        if (table.length > 0) {
            // Get headers
            const headers = [];
            $('thead tr th', table).each((i, el) => {
                headers.push($(el).text().trim());
            });
            console.log(`✓ Table headers (${headers.length}):`, headers.slice(0, 10));
            
            // Get first few rows
            const rows = [];
            $('tbody tr', table).slice(0, 5).each((i, row) => {
                const cells = [];
                $('td', row).each((j, cell) => {
                    cells.push($(cell).text().trim());
                });
                if (cells.length > 0) rows.push(cells);
            });
            
            console.log(`✓ Sample data rows: ${rows.length}`);
            rows.forEach((row, i) => {
                console.log(`  Row ${i + 1}:`, row.slice(0, 5));
            });
        }
        
        // Look for JSON data in script tags
        const scripts = $('script').toArray();
        let foundData = false;
        
        scripts.forEach((script, i) => {
            const content = $(script).html();
            if (content && content.includes('leaderboard_data') && !foundData) {
                console.log(`✓ Found potential JSON data in script tag ${i + 1}`);
                
                // Try to extract JSON
                const matches = content.match(/leaderboard_data\s*=\s*(\[.*?\]);/s);
                if (matches) {
                    try {
                        const data = JSON.parse(matches[1]);
                        console.log(`✓ Parsed JSON data: ${data.length} players`);
                        
                        if (data.length > 0) {
                            console.log('✓ Sample player data:');
                            const sample = data[0];
                            Object.keys(sample).slice(0, 10).forEach(key => {
                                console.log(`  ${key}: ${sample[key]}`);
                            });
                            foundData = true;
                        }
                    } catch (e) {
                        console.log(`  Failed to parse JSON: ${e.message}`);
                    }
                }
            }
        });
        
        if (!foundData) {
            console.log('⚠️  No JSON data found in script tags');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error scraping Baseball Savant:', error.message);
        return false;
    }
}

// Test MLB roster scraping for ages
async function testRosterScraping() {
    console.log('\n🔄 Testing MLB roster scraping for player ages...\n');
    
    try {
        // Test Angels roster page
        const response = await axios.get('https://www.mlb.com/angels/roster', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        console.log(`✓ Got response from MLB.com (${response.status})`);
        console.log(`✓ Response size: ${Math.round(response.data.length / 1024)}KB`);
        
        const $ = cheerio.load(response.data);
        
        // Look for player data with broader selectors
        const playerElements = $('[data-player], .player, .roster-item, tbody tr').slice(0, 5);
        console.log(`✓ Found player elements: ${playerElements.length}`);
        
        playerElements.each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 0) {
                console.log(`  Element ${i + 1}: ${text.substring(0, 100)}...`);
            }
        });
        
        // Also look for JSON data
        const scripts = $('script').toArray();
        let foundRosterData = false;
        
        scripts.forEach((script, i) => {
            const content = $(script).html();
            if (content && (content.includes('roster') || content.includes('player')) && content.includes('birth') && !foundRosterData) {
                console.log(`✓ Found potential roster JSON in script tag ${i + 1}`);
                foundRosterData = true;
            }
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ Error scraping MLB roster:', error.message);
        return false;
    }
}

// Test pitch movement leaderboard
async function testPitchMovementScraping() {
    console.log('\n🔄 Testing Baseball Savant pitch movement scraping...\n');
    
    try {
        const response = await axios.get('https://baseballsavant.mlb.com/leaderboard/pitch-movement?year=2024&pitch_type=FF&min=50', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        console.log(`✓ Got response from pitch movement page (${response.status})`);
        
        const $ = cheerio.load(response.data);
        const scripts = $('script').toArray();
        let foundPitchData = false;
        
        console.log(`✓ Checking ${scripts.length} script tags for data...`);
        
        scripts.forEach((script, i) => {
            const content = $(script).html();
            if (content && content.includes('leaderboard_data')) {
                console.log(`✓ Found leaderboard_data in script tag ${i + 1}`);
                
                // Try multiple regex patterns
                const patterns = [
                    /leaderboard_data\s*=\s*(\[.*?\]);/s,
                    /leaderboard_data\s*=\s*(\[.*?\])/s,
                    /"leaderboard_data":\s*(\[.*?\])/s
                ];
                
                for (const pattern of patterns) {
                    const matches = content.match(pattern);
                    if (matches) {
                        try {
                            const data = JSON.parse(matches[1]);
                            console.log(`✓ Parsed pitch data: ${data.length} pitchers`);
                            
                            if (data.length > 0) {
                                const sample = data[0];
                                console.log('✓ Sample pitcher data:');
                                console.log('  Available keys:', Object.keys(sample).slice(0, 10));
                                foundPitchData = true;
                                break;
                            }
                        } catch (e) {
                            console.log(`  Pattern failed: ${e.message}`);
                        }
                    }
                }
            }
        });
        
        return foundPitchData;
        
    } catch (error) {
        console.error('❌ Error scraping pitch movement:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🧪 TESTING DATA SCRAPING FEASIBILITY\n');
    console.log('=' .repeat(50));
    
    const statcastResult = await testStatcastScraping();
    const rosterResult = await testRosterScraping();
    const pitchResult = await testPitchMovementScraping();
    
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST RESULTS:');
    console.log(`✓ Statcast hitting data: ${statcastResult ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✓ MLB roster/age data: ${rosterResult ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✓ Pitch movement data: ${pitchResult ? 'SUCCESS' : 'FAILED'}`);
    
    const overallSuccess = statcastResult && rosterResult && pitchResult;
    console.log(`\n🎯 OVERALL: ${overallSuccess ? 'DATA SCRAPING IS VIABLE' : 'NEED TO INVESTIGATE ISSUES'}`);
    
    if (overallSuccess) {
        console.log('\n✅ Ready to build full scraper!');
    } else {
        console.log('\n⚠️  Need to debug failed scraping attempts');
    }
}

// Run if called directly
if (require.main === module) {
    runAllTests();
}

module.exports = { testStatcastScraping, testRosterScraping, testPitchMovementScraping };