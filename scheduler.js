/**
 * Discovr Event Scraper Scheduler
 * Runs each city's scraper every 72 hours at 3 AM local time
 * Designed for Render.com deployment
 */

const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const IMPORT_DIR = path.join(__dirname, 'ImportFiles');
const LAST_RUN_FILE = path.join(__dirname, 'last-run-times.json');

// Load persisted last run times
function loadLastRunTimes() {
  try {
    if (fs.existsSync(LAST_RUN_FILE)) {
      return JSON.parse(fs.readFileSync(LAST_RUN_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading last run times:', e.message);
  }
  return {};
}

// Save last run times to file
function saveLastRunTimes(times) {
  try {
    fs.writeFileSync(LAST_RUN_FILE, JSON.stringify(times, null, 2));
  } catch (e) {
    console.error('Error saving last run times:', e.message);
  }
}

// City configurations with their timezones
const cities = [
  // Australia
  { name: 'sydney', file: 'import-all-sydney-events.js', timezone: 'Australia/Sydney' },
  { name: 'melbourne', file: 'import-all-melbourne-events.js', timezone: 'Australia/Melbourne' },
  { name: 'brisbane', file: 'import-all-brisbane-events.js', timezone: 'Australia/Brisbane' },
  { name: 'perth', file: 'import-all-perth-events.js', timezone: 'Australia/Perth' },
  { name: 'adelaide', file: 'import-all-adelaide-events.js', timezone: 'Australia/Adelaide' },
  { name: 'goldcoast', file: 'import-all-goldcoast-events.js', timezone: 'Australia/Brisbane' },
  
  // New Zealand
  { name: 'auckland', file: 'import-all-auckland-events.js', timezone: 'Pacific/Auckland' },
  { name: 'christchurch', file: 'import-all-christchurch-events.js', timezone: 'Pacific/Auckland' },
  { name: 'queenstown', file: 'import-all-queenstown-events.js', timezone: 'Pacific/Auckland' },
  { name: 'wellington', file: 'import-all-wellington-events.js', timezone: 'Pacific/Auckland' },
  
  // UK & Ireland
  { name: 'london', file: 'import-all-london-events.js', timezone: 'Europe/London' },
  { name: 'manchester', file: 'import-all-manchester-events.js', timezone: 'Europe/London' },
  { name: 'birmingham', file: 'import-all-birmingham-events.js', timezone: 'Europe/London' },
  { name: 'glasgow', file: 'import-all-glasgow-events.js', timezone: 'Europe/London' },
  { name: 'edinburgh', file: 'import-all-edinburgh-events.js', timezone: 'Europe/London' },
  { name: 'liverpool', file: 'import-all-liverpool-events.js', timezone: 'Europe/London' },
  { name: 'leeds', file: 'import-all-leeds-events.js', timezone: 'Europe/London' },
  { name: 'bristol', file: 'import-all-bristol-events.js', timezone: 'Europe/London' },
  { name: 'brighton', file: 'import-all-brighton-events.js', timezone: 'Europe/London' },
  { name: 'newcastle', file: 'import-all-newcastle-events.js', timezone: 'Europe/London' },
  { name: 'nottingham', file: 'import-all-nottingham-events.js', timezone: 'Europe/London' },
  { name: 'sheffield', file: 'import-all-sheffield-events.js', timezone: 'Europe/London' },
  { name: 'bournemouth', file: 'import-all-bournemouth-events.js', timezone: 'Europe/London' },
  { name: 'oxford', file: 'import-all-oxford-events.js', timezone: 'Europe/London' },
  { name: 'belfast', file: 'import-all-belfast-events.js', timezone: 'Europe/London' },
  { name: 'dublin', file: 'import-all-dublin-events.js', timezone: 'Europe/Dublin' },
  { name: 'cork', file: 'import-all-cork-events.js', timezone: 'Europe/Dublin' },
  { name: 'galway', file: 'import-all-galway-events.js', timezone: 'Europe/Dublin' },
  
  // Iceland
  { name: 'reykjavik', file: 'import-all-reykjavik-events.js', timezone: 'Atlantic/Reykjavik' },
  
  // US West Coast
  { name: 'losangeles', file: 'import-all-losangeles-events.js', timezone: 'America/Los_Angeles' },
  { name: 'sanfrancisco', file: 'import-all-sanfrancisco-events.js', timezone: 'America/Los_Angeles' },
  { name: 'sandiego', file: 'import-all-sandiego-events.js', timezone: 'America/Los_Angeles' },
  { name: 'seattle', file: 'import-all-seattle-events.js', timezone: 'America/Los_Angeles' },
  { name: 'portland', file: 'import-all-portland-events.js', timezone: 'America/Los_Angeles' },
  { name: 'lasvegas', file: 'import-all-lasvegas-events.js', timezone: 'America/Los_Angeles' },
  
  // US Central
  { name: 'austin', file: 'import-all-austin-events.js', timezone: 'America/Chicago' },
  { name: 'chicago', file: 'import-all-chicago-events.js', timezone: 'America/Chicago' },
  { name: 'minneapolis', file: 'import-all-minneapolis-events.js', timezone: 'America/Chicago' },
  
  // US East Coast
  { name: 'newyork', file: 'import-all-new-york-events.js', timezone: 'America/New_York' },
  { name: 'miami', file: 'import-all-miami-events.js', timezone: 'America/New_York' },
  { name: 'boston', file: 'import-all-boston-events.js', timezone: 'America/New_York' },
  { name: 'philadelphia', file: 'import-all-philadelphia-events.js', timezone: 'America/New_York' },
  
  // Canada West
  { name: 'vancouver', file: 'import-all-vancouver-events.js', timezone: 'America/Vancouver' },
  { name: 'calgary', file: 'import-all-calgary-events.js', timezone: 'America/Edmonton' },
  { name: 'edmonton', file: 'import-all-edmonton-events.js', timezone: 'America/Edmonton' },
  
  // Canada East
  { name: 'toronto', file: 'import-all-toronto-events.js', timezone: 'America/Toronto' },
  { name: 'montreal', file: 'import-all-montreal-events.js', timezone: 'America/Toronto' },
  { name: 'ottawa', file: 'import-all-ottawa-events.js', timezone: 'America/Toronto' },
];

// Track last run times (persisted to file)
let lastRunTimes = loadLastRunTimes();
console.log(`📂 Loaded ${Object.keys(lastRunTimes).length} previous run times`);

function runScraper(city) {
  return new Promise((resolve) => {
    const filePath = path.join(IMPORT_DIR, city.file);
    const now = new Date();
    
    console.log(`\n🕐 [${now.toISOString()}] Starting: ${city.name.toUpperCase()}`);
    
    exec(`node "${filePath}"`, { maxBuffer: 50 * 1024 * 1024, timeout: 600000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ [${city.name}] Error:`, error.message);
        resolve(false);
        return;
      }
      if (stderr) {
        console.error(`⚠️ [${city.name}] Stderr:`, stderr);
      }
      console.log(stdout);
      console.log(`✅ [${city.name}] Completed at ${new Date().toISOString()}`);
      lastRunTimes[city.name] = Date.now();
      saveLastRunTimes(lastRunTimes);
      resolve(true);
    });
  });
}

function shouldRun(cityName) {
  const lastRun = lastRunTimes[cityName];
  if (!lastRun) return true;
  const hoursSinceLastRun = (Date.now() - lastRun) / (1000 * 60 * 60);
  return hoursSinceLastRun >= 72;
}

// Schedule each city at 3 AM local time, staggered by 10 minutes
cities.forEach((city, index) => {
  const minute = (index * 10) % 60;
  const hour = 3 + Math.floor((index * 10) / 60);
  const schedule = `${minute} ${hour} * * *`;
  
  cron.schedule(schedule, () => {
    if (shouldRun(city.name)) {
      runScraper(city);
    } else {
      console.log(`⏭️ [${city.name}] Skipping - last run < 72 hours ago`);
    }
  }, { timezone: city.timezone });
  
  console.log(`📅 ${city.name}: ${schedule} (${city.timezone})`);
});

console.log('\n🚀 Discovr Scheduler Started on Render!');
console.log(`📊 ${cities.length} cities scheduled`);
console.log('⏰ Each city runs at 3 AM local time, every 72 hours\n');

// Keep alive for Render
const http = require('http');
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'running', 
    cities: cities.length,
    lastRuns: Object.keys(lastRunTimes).length
  }));
}).listen(PORT, () => {
  console.log(`🌐 Health check server on port ${PORT}`);
});
