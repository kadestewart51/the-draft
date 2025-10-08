const axios = require('axios');
const cheerio = require('cheerio');
const { getDatabase } = require('../database/init.js');

// Baseball Savant scraping functions
class BaseballScraper {
    constructor() {
        this.db = getDatabase();
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
    }

    // Scrape Statcast hitting leaderboard
    async scrapeStatcastHitting() {
        console.log('🔄 Scraping Baseball Savant Statcast hitting data...');
        
        try {
            const response = await axios.get('https://baseballsavant.mlb.com/leaderboard/statcast?year=2025&abs=50', {
                headers: this.headers
            });

            const $ = cheerio.load(response.data);
            const scripts = $('script').toArray();
            
            for (const script of scripts) {
                const content = $(script).html();
                if (content && content.includes('leaderboard_data')) {
                    const matches = content.match(/leaderboard_data\s*=\s*(\[.*?\]);/s);
                    if (matches) {
                        const data = JSON.parse(matches[1]);
                        console.log(`✓ Found ${data.length} qualified hitters`);
                        
                        await this.saveHittingData(data);
                        return data.length;
                    }
                }
            }
            
            throw new Error('Could not find leaderboard data');
            
        } catch (error) {
            console.error('❌ Error scraping hitting data:', error.message);
            return 0;
        }
    }

    // Scrape batted ball data
    async scrapeBattedBallData() {
        console.log('🔄 Scraping batted ball profile data...');
        
        try {
            const response = await axios.get('https://baseballsavant.mlb.com/leaderboard/batted-ball?year=2025&abs=50', {
                headers: this.headers
            });

            const $ = cheerio.load(response.data);
            const scripts = $('script').toArray();
            
            for (const script of scripts) {
                const content = $(script).html();
                if (content && content.includes('leaderboard_data')) {
                    const matches = content.match(/leaderboard_data\s*=\s*(\[.*?\]);/s);
                    if (matches) {
                        const data = JSON.parse(matches[1]);
                        console.log(`✓ Found batted ball data for ${data.length} hitters`);
                        
                        await this.updateBattedBallData(data);
                        return data.length;
                    }
                }
            }
            
            console.log('⚠️  No batted ball data found');
            return 0;
            
        } catch (error) {
            console.error('❌ Error scraping batted ball data:', error.message);
            return 0;
        }
    }

    // Save hitting data to database
    async saveHittingData(players) {
        console.log('💾 Saving hitting data to database...');
        
        let playersInserted = 0;
        let statsInserted = 0;
        
        for (const player of players) {
            try {
                // Insert or update player
                await this.insertOrUpdatePlayer(player);
                playersInserted++;
                
                // Insert hitting stats
                await this.insertHittingStats(player);
                statsInserted++;
                
            } catch (error) {
                console.error(`Error saving data for ${player.entity_name}:`, error.message);
            }
        }
        
        console.log(`✓ Saved ${playersInserted} players and ${statsInserted} stat records`);
    }

    // Insert or update player record
    insertOrUpdatePlayer(player) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT OR REPLACE INTO players 
                        (savant_id, name, team, primary_position, active, last_updated)
                        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
            
            this.db.run(sql, [
                player.entity_id,
                player.entity_name,
                player.entity_team_name,
                this.mapPosition(player.pos),
                1
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    // Insert hitting stats
    insertHittingStats(player) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT OR REPLACE INTO hitting_stats 
                        (player_id, season, games_played, plate_appearances, at_bats, hits, runs, rbi,
                         home_runs, doubles, triples, stolen_bases, walks, strikeouts,
                         wrc_plus, xwoba, xba, xslg, barrels, hard_hit_percent, 
                         max_exit_velocity, avg_exit_velocity, max_distance, avg_launch_angle,
                         sweet_spot_percent, last_updated)
                        VALUES ((SELECT id FROM players WHERE savant_id = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
            
            this.db.run(sql, [
                player.entity_id,
                2025,
                player.g || 0,
                player.pa || 0,
                player.ab || 0,
                player.h || 0,
                player.r || 0,
                player.rbi || 0,
                player.hr || 0,
                player.doubles || 0,
                player.triples || 0,
                player.sb || 0,
                player.bb || 0,
                player.k || 0,
                null, // wRC+ not in this dataset
                player.est_woba || null,
                player.est_ba || null,
                player.est_slg || null,
                player.barrel_ct || 0,
                player.hard_hit_percent || null,
                player.exit_velocity_max || null,
                player.exit_velocity_avg || null,
                player.distance_max || null,
                player.launch_angle_avg || null,
                player.sweet_spot_percent || null
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    // Update batted ball data
    async updateBattedBallData(players) {
        console.log('💾 Updating batted ball data...');
        
        let updated = 0;
        for (const player of players) {
            try {
                await new Promise((resolve, reject) => {
                    const sql = `UPDATE hitting_stats 
                                SET ground_ball_rate = ?, fly_ball_rate = ?, line_drive_rate = ?,
                                    pull_rate = ?, opposite_field_rate = ?, last_updated = CURRENT_TIMESTAMP
                                WHERE player_id = (SELECT id FROM players WHERE savant_id = ?) AND season = 2025`;
                    
                    this.db.run(sql, [
                        player.gb_rate || null,
                        player.fb_rate || null,
                        player.ld_rate || null,
                        player.pull_rate || null,
                        player.oppo_rate || null,
                        player.savant_batter_id
                    ], function(err) {
                        if (err) reject(err);
                        else {
                            if (this.changes > 0) updated++;
                            resolve();
                        }
                    });
                });
            } catch (error) {
                console.error(`Error updating batted ball data for player ${player.savant_batter_id}:`, error.message);
            }
        }
        
        console.log(`✓ Updated batted ball data for ${updated} players`);
    }

    // Map position codes to readable positions
    mapPosition(posCode) {
        const positions = {
            '1': 'P', '2': 'C', '3': '1B', '4': '2B', '5': '3B', 
            '6': 'SS', '7': 'LF', '8': 'CF', '9': 'RF', '10': 'DH'
        };
        return positions[posCode] || 'OF';
    }

    // Get summary of scraped data
    async getDataSummary() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT 
                            COUNT(*) as total_players,
                            COUNT(CASE WHEN h.barrels > 0 THEN 1 END) as players_with_barrels,
                            AVG(h.wrc_plus) as avg_wrc_plus,
                            MAX(h.barrels) as max_barrels,
                            MAX(h.max_exit_velocity) as max_exit_velo
                        FROM players p 
                        LEFT JOIN hitting_stats h ON p.id = h.player_id 
                        WHERE h.season = 2025`;
            
            this.db.get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // Run full scraping process
    async runFullScrape() {
        console.log('🚀 Starting full Baseball Savant scraping process...\n');
        
        const hittingCount = await this.scrapeStatcastHitting();
        
        // Add delay to be respectful
        console.log('⏱️  Waiting 15 seconds before next request...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        const battedBallCount = await this.scrapeBattedBallData();
        
        console.log('\n📊 SCRAPING SUMMARY:');
        console.log(`✓ Statcast hitting data: ${hittingCount} players`);
        console.log(`✓ Batted ball data: ${battedBallCount} players`);
        
        const summary = await this.getDataSummary();
        console.log('\n💾 DATABASE SUMMARY:');
        console.log(`📈 Total players: ${summary.total_players}`);
        console.log(`🎯 Players with barrels: ${summary.players_with_barrels}`);
        console.log(`📊 Average wRC+: ${Math.round(summary.avg_wrc_plus || 0)}`);
        console.log(`💥 Max barrels: ${summary.max_barrels || 0}`);
        console.log(`🚀 Max exit velocity: ${summary.max_exit_velo || 0} mph`);
        
        console.log('\n✅ Scraping completed successfully!');
    }

    // Close database connection
    close() {
        this.db.close();
    }
}

// Run scraper if called directly
if (require.main === module) {
    const scraper = new BaseballScraper();
    scraper.runFullScrape()
        .then(() => {
            scraper.close();
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Scraping failed:', error);
            scraper.close();
            process.exit(1);
        });
}

module.exports = BaseballScraper;