const axios = require('axios');
const cheerio = require('cheerio');

async function debugFields() {
    console.log('🔍 Debugging Baseball Savant field names...\n');
    
    try {
        const response = await axios.get('https://baseballsavant.mlb.com/leaderboard/statcast?year=2024&abs=50', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const scripts = $('script').toArray();
        
        for (const script of scripts) {
            const content = $(script).html();
            if (content && content.includes('leaderboard_data')) {
                const matches = content.match(/leaderboard_data\s*=\s*(\[.*?\]);/s);
                if (matches) {
                    const data = JSON.parse(matches[1]);
                    
                    console.log('✓ Sample player object keys:');
                    console.log(Object.keys(data[0]).sort());
                    
                    console.log('\n✓ First player full data:');
                    console.log(JSON.stringify(data[0], null, 2));
                    
                    console.log('\n✓ Fields that might be barrels:');
                    Object.keys(data[0]).forEach(key => {
                        if (key.toLowerCase().includes('barrel') || key.toLowerCase().includes('brl')) {
                            console.log(`  ${key}: ${data[0][key]}`);
                        }
                    });
                    
                    console.log('\n✓ Fields that might be wRC+:');
                    Object.keys(data[0]).forEach(key => {
                        if (key.toLowerCase().includes('wrc') || key.toLowerCase().includes('plus')) {
                            console.log(`  ${key}: ${data[0][key]}`);
                        }
                    });
                    
                    break;
                }
            }
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugFields();