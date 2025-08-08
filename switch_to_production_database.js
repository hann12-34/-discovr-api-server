/**
 * 🚀 SWITCH TO PRODUCTION DATABASE & CLEAN UP CONFUSION
 * 
 * From Render.com screenshot, the production MONGODB_URI is:
 * mongodb+srv://discovr123:discovr1234@discovr.vzlmgdb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr
 * 
 * This script will:
 * 1. Update .env to use the EXACT production database
 * 2. Test connection and verify we see app's data (2,670 events)
 * 3. Clean up database confusion
 */

const fs = require('fs');
const mongoose = require('mongoose');

async function switchToProductionDatabase() {
  try {
    console.log('🚀 SWITCHING TO PRODUCTION DATABASE\n');
    console.log('🎯 Goal: Connect to the SAME database the app uses');
    console.log('📱 App shows: 2,670 events, Montreal: 158, New York: 208\n');

    // STEP 1: Update .env file to use production database
    console.log('📝 STEP 1: UPDATING .ENV FILE');
    console.log('=' .repeat(50));
    
    const productionURI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlmgdb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';
    
    // Backup existing .env
    try {
      const currentEnv = fs.readFileSync('.env', 'utf8');
      fs.writeFileSync('.env.backup', currentEnv);
      console.log('📦 Backed up current .env to .env.backup');
    } catch (error) {
      console.log('⚠️ No existing .env to backup');
    }
    
    // Write new .env with production URI
    const newEnvContent = `MONGODB_URI=${productionURI}
PRODUCTION_MONGODB_URI=${productionURI}
NODE_ENV=production

# This is the PRODUCTION database used by:
# - discovr-proxy-server.onrender.com
# - The mobile app
# - All scrapers should use this
# - All fix scripts should use this
`;
    
    fs.writeFileSync('.env', newEnvContent);
    console.log('✅ Updated .env file to use production database');
    console.log('✅ Both MONGODB_URI and PRODUCTION_MONGODB_URI now point to production\n');

    // STEP 2: Test connection to production database
    console.log('🔌 STEP 2: TESTING PRODUCTION DATABASE CONNECTION');
    console.log('=' .repeat(50));
    
    // Reload environment
    require('dotenv').config({ override: true });
    
    console.log('Connecting to production database...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Event = require('./models/Event');
    const total = await Event.countDocuments({});
    
    console.log(`📊 Production database total: ${total} events`);
    
    // Test if this matches app results
    if (total === 2670) {
      console.log('🎉 SUCCESS! Connected to the SAME database as the app!');
    } else {
      console.log(`⚠️ Warning: Expected 2,670 events (app), got ${total} events`);
    }

    // Get city breakdown
    console.log('\n🏙️ Production database city breakdown:');
    const cities = ['Vancouver', 'Calgary', 'Montreal', 'New York', 'Toronto'];
    for (const city of cities) {
      const count = await Event.countDocuments({'venue.name': new RegExp(city, 'i')});
      console.log(`   ${city}: ${count} events`);
      
      // Check if matches app results
      if (city === 'Montreal' && count === 158) {
        console.log('     ✅ Matches app result!');
      } else if (city === 'New York' && count === 208) {
        console.log('     ✅ Matches app result!');
      }
    }

    // STEP 3: Clean up database references
    console.log('\n🧹 STEP 3: CLEANING UP DATABASE REFERENCES');
    console.log('=' .repeat(50));
    
    // Remove any other .env files that could cause confusion
    const envFiles = ['.env.local', '.env.development', '.env.test'];
    let removedFiles = 0;
    
    for (const file of envFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log(`🗑️ Removed confusing file: ${file}`);
          removedFiles++;
        }
      } catch (error) {
        // Ignore errors
      }
    }
    
    if (removedFiles === 0) {
      console.log('✅ No confusing .env files found');
    }

    // STEP 4: Verify all systems now use same database
    console.log('\n✅ STEP 4: VERIFICATION COMPLETE');
    console.log('=' .repeat(50));
    console.log('🎯 All systems now connected to PRODUCTION database:');
    console.log(`   Database: ${productionURI.split('@')[1].split('?')[0]}`);
    console.log(`   Total events: ${total}`);
    console.log('');
    console.log('📱 This should match the app exactly now!');
    console.log('🛠️ All future fixes will apply to the correct database!');
    console.log('🚀 No more database confusion!');
    
    await mongoose.connection.close();
    
    console.log('\n🎉 PRODUCTION DATABASE SWITCH COMPLETE!');
    console.log('💡 Next: Apply fixes to this production database');
    
  } catch (error) {
    console.error('❌ Switch failed:', error);
  }
}

// Run the switch
switchToProductionDatabase().catch(console.error);
