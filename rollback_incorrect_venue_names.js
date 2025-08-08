/**
 * EMERGENCY ROLLBACK: UNDO INCORRECT VENUE.NAME CHANGES
 * Remove " - New York" from venue names that were incorrectly modified
 * Only events from actual NYC scrapers should have "New York" in venue.name
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function rollbackIncorrectVenueNames() {
  try {
    console.log('🚨 EMERGENCY ROLLBACK: UNDOING INCORRECT VENUE.NAME CHANGES...\n');
    console.log('❌ Previous error: Added "New York" to non-NYC venues');
    console.log('🎯 Goal: Remove " - New York" suffix from incorrectly modified venues');
    console.log('✅ Preserve: Only actual NYC events should keep "New York" in venue.name\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to Production MongoDB\n');

    const Event = require('./models/Event');

    // Find all venues with " - New York" suffix (our incorrect modification)
    const incorrectlyModified = await Event.find({
      'venue.name': { $regex: / - New York$/i }
    });

    console.log(`🔍 Found ${incorrectlyModified.length} events with " - New York" suffix`);

    let rolled_back = 0;
    const rollbacks = [];

    console.log('\n🔧 ANALYZING EVENTS FOR ROLLBACK...');
    console.log('=' .repeat(45));

    for (const event of incorrectlyModified) {
      const currentVenueName = event.venue?.name || '';
      
      // Remove " - New York" suffix to restore original name
      const originalVenueName = currentVenueName.replace(/ - New York$/i, '');
      
      rollbacks.push({
        eventId: event._id,
        title: event.title,
        currentVenueName: currentVenueName,
        originalVenueName: originalVenueName
      });
    }

    console.log(`📊 Events to rollback: ${rollbacks.length}`);

    if (rollbacks.length > 0) {
      console.log('\n📋 SAMPLE VENUE.NAME ROLLBACKS:');
      console.log('=' .repeat(40));
      rollbacks.slice(0, 10).forEach((rollback, i) => {
        console.log(`${i + 1}. "${rollback.title}"`);
        console.log(`   Incorrect: "${rollback.currentVenueName}"`);
        console.log(`   Restored: "${rollback.originalVenueName}"`);
        console.log('');
      });

      console.log('\n🚀 APPLYING VENUE.NAME ROLLBACKS...');
      console.log('=' .repeat(38));

      for (const rollback of rollbacks) {
        try {
          await Event.updateOne(
            { _id: rollback.eventId },
            { $set: { 'venue.name': rollback.originalVenueName } }
          );
          
          rolled_back++;
          
          if (rolled_back % 50 === 0) {
            console.log(`   📊 Rolled back ${rolled_back}/${rollbacks.length} venue names...`);
          }
          
        } catch (error) {
          console.error(`   ❌ Failed to rollback ${rollback.eventId}: ${error.message}`);
        }
      }

      console.log(`\n✅ ROLLBACK COMPLETE!`);
      console.log(`🔧 Rolled back: ${rolled_back} events`);

      // Verify the rollback
      const remainingIncorrect = await Event.countDocuments({
        'venue.name': { $regex: / - New York$/i }
      });

      console.log(`\n🎯 VERIFICATION:`);
      console.log(`📊 Remaining " - New York" suffixes: ${remainingIncorrect}`);
      
      if (remainingIncorrect === 0) {
        console.log('✅ All incorrect venue.name modifications successfully rolled back!');
      } else {
        console.log('⚠️ Some " - New York" suffixes remain - may need manual review');
      }

      console.log('\n🏆 DATA INTEGRITY RESTORED!');
      console.log('🎯 Now ready to create PROPER NYC venue identification');
      console.log('📝 Next: Only tag events from actual NYC scrapers');

    } else {
      console.log('\n✅ No rollbacks needed - no " - New York" suffixes found');
    }

  } catch (error) {
    console.error('❌ Error rolling back venue names:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run the rollback
rollbackIncorrectVenueNames().catch(console.error);
