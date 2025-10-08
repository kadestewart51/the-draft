-- Players table with age and comprehensive info
CREATE TABLE players (
    id INTEGER PRIMARY KEY,
    savant_id TEXT UNIQUE,
    name TEXT NOT NULL,
    team TEXT,
    primary_position TEXT,
    birthdate TEXT, -- YYYY-MM-DD format
    age INTEGER,
    height TEXT,
    weight INTEGER,
    bats TEXT, -- L/R/S
    throws TEXT, -- L/R
    mlb_debut_date TEXT,
    active BOOLEAN DEFAULT TRUE,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Advanced hitting stats
CREATE TABLE hitting_stats (
    id INTEGER PRIMARY KEY,
    player_id INTEGER,
    season INTEGER DEFAULT 2024,
    
    -- Basic counting stats
    games_played INTEGER DEFAULT 0,
    plate_appearances INTEGER DEFAULT 0,
    at_bats INTEGER DEFAULT 0,
    hits INTEGER DEFAULT 0,
    runs INTEGER DEFAULT 0,
    rbi INTEGER DEFAULT 0,
    home_runs INTEGER DEFAULT 0,
    doubles INTEGER DEFAULT 0,
    triples INTEGER DEFAULT 0,
    stolen_bases INTEGER DEFAULT 0,
    walks INTEGER DEFAULT 0,
    strikeouts INTEGER DEFAULT 0,
    
    -- Advanced rate stats
    wrc_plus REAL, -- wRC+ (100 = league average)
    xwoba REAL, -- Expected weighted on-base average
    xba REAL, -- Expected batting average
    xslg REAL, -- Expected slugging
    
    -- Statcast metrics
    barrels INTEGER DEFAULT 0,
    hard_hit_percent REAL, -- Hard hit % (95+ mph exit velo)
    max_exit_velocity REAL,
    avg_exit_velocity REAL,
    max_distance REAL, -- Longest HR distance
    avg_launch_angle REAL,
    sweet_spot_percent REAL, -- Launch angle 8-32 degrees
    
    -- Batted ball profile
    ground_ball_rate REAL,
    fly_ball_rate REAL,
    line_drive_rate REAL,
    pull_rate REAL,
    opposite_field_rate REAL,
    
    -- Sprint speed
    sprint_speed REAL, -- ft/sec
    
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players (id)
);

-- Advanced pitching stats
CREATE TABLE pitching_stats (
    id INTEGER PRIMARY KEY,
    player_id INTEGER,
    season INTEGER DEFAULT 2024,
    
    -- Basic counting stats
    games_pitched INTEGER DEFAULT 0,
    games_started INTEGER DEFAULT 0,
    innings_pitched REAL DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    holds INTEGER DEFAULT 0,
    strikeouts INTEGER DEFAULT 0,
    walks INTEGER DEFAULT 0,
    hits_allowed INTEGER DEFAULT 0,
    home_runs_allowed INTEGER DEFAULT 0,
    
    -- Advanced rate stats
    era REAL,
    era_minus REAL, -- ERA- (100 = league average, lower is better)
    whip REAL,
    fip REAL, -- Fielding Independent Pitching
    xfip REAL, -- Expected FIP
    
    -- Statcast metrics
    avg_fastball_velocity REAL,
    max_fastball_velocity REAL,
    fastball_spin_rate REAL, -- RPM
    fastball_ivb REAL, -- Induced Vertical Break (inches)
    fastball_horizontal_break REAL, -- inches
    
    -- Plate discipline
    whiff_rate REAL, -- Swings and misses / swings
    chase_rate REAL, -- Swings at balls outside zone / balls outside zone
    zone_rate REAL, -- Pitches in strike zone / total pitches
    first_strike_rate REAL,
    
    -- Stuff metrics
    stuff_plus REAL, -- Stuff+ rating (100 = average)
    location_plus REAL, -- Location+ rating
    pitching_plus REAL, -- Overall pitching+ rating
    
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players (id)
);

-- Draft rooms
CREATE TABLE draft_rooms (
    id TEXT PRIMARY KEY, -- UUID
    name TEXT NOT NULL,
    creator_name TEXT,
    max_teams INTEGER DEFAULT 12,
    rounds INTEGER DEFAULT 23, -- Standard 23-round draft
    current_pick INTEGER DEFAULT 1,
    current_round INTEGER DEFAULT 1,
    draft_started BOOLEAN DEFAULT FALSE,
    draft_completed BOOLEAN DEFAULT FALSE,
    stat_package TEXT, -- 'stuff_kings', 'workhorses', 'sabermetric', 'traditional_plus', 'custom'
    
    -- Custom categories (JSON string if stat_package = 'custom')
    custom_hitting_categories TEXT,
    custom_pitching_categories TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Draft teams
CREATE TABLE draft_teams (
    id INTEGER PRIMARY KEY,
    room_id TEXT,
    team_name TEXT NOT NULL,
    manager_name TEXT,
    draft_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES draft_rooms (id)
);

-- Drafted players
CREATE TABLE drafted_players (
    id INTEGER PRIMARY KEY,
    room_id TEXT,
    team_id INTEGER,
    player_id INTEGER,
    pick_number INTEGER,
    round_number INTEGER,
    drafted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES draft_rooms (id),
    FOREIGN KEY (team_id) REFERENCES draft_teams (id),
    FOREIGN KEY (player_id) REFERENCES players (id)
);

-- Preset stat packages
CREATE TABLE stat_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    hitting_categories TEXT, -- JSON array of stat names
    pitching_categories TEXT, -- JSON array of stat names
    philosophy TEXT -- Description of what this package rewards
);

-- Insert preset packages
INSERT INTO stat_packages (id, name, description, hitting_categories, pitching_categories, philosophy) VALUES
('stuff_kings', 'Stuff Kings', 'Rewards elite talent and raw ability', 
 '["barrels", "hard_hit_percent", "max_exit_velocity", "xwoba", "sweet_spot_percent"]',
 '["fastball_ivb", "fastball_spin_rate", "whiff_rate", "stuff_plus", "strikeouts"]',
 'Values elite talent - the players with the best raw stuff and ability'),

('workhorses', 'Workhorses', 'Values durability and volume production',
 '["plate_appearances", "runs", "rbi", "wrc_plus", "games_played"]',
 '["innings_pitched", "strikeouts", "games_pitched", "era_minus", "whip"]',
 'Rewards players who stay healthy and accumulate stats through volume'),

('sabermetric', 'Sabermetric Special', 'Pure skill-based metrics that isolate player ability',
 '["xwoba", "xba", "barrels", "wrc_plus", "sprint_speed"]',
 '["xfip", "whiff_rate", "chase_rate", "stuff_plus", "era_minus"]',
 'Focuses on predictive metrics that measure true skill'),

('traditional_plus', 'Traditional Plus', 'Familiar categories with modern analytical additions',
 '["home_runs", "rbi", "stolen_bases", "wrc_plus", "runs"]',
 '["wins", "saves", "strikeouts", "era_minus", "whip"]',
 'Classic fantasy categories enhanced with key analytical stats');