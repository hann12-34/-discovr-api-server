/**
 * CLEAN FAKE "TODAY" EVENTS FROM DATABASE
 * Remove all events that have today's date but are actually from scrapers that returned null
 */

const mongoose = require('mongoose');

async function cleanFakeTodayEvents() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr-api-v2');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const eventsCollection = db.collection('events');

    // Get today's date range (00:00:00 to 23:59:59)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('\n🔍 SEARCHING FOR FAKE "TODAY" EVENTS...');
    console.log(`Today's date range: ${today.toISOString()} to ${tomorrow.toISOString()}`);

    // Find all events with today's date
    const todayEvents = await eventsCollection.find({
      $or: [
        { date: { $gte: today, $lt: tomorrow } },
        { startDate: { $gte: today, $lt: tomorrow } }
      ]
    }).toArray();

    console.log(`\nFound ${todayEvents.length} events with today's date`);

    if (todayEvents.length === 0) {
      console.log('✅ No fake events to clean!');
      await mongoose.connection.close();
      return;
    }

    // Group by venue to see which are likely fake
    const byVenue = todayEvents.reduce((acc, event) => {
      const venueName = event.venue?.name || 'Unknown';
      if (!acc[venueName]) acc[venueName] = [];
      acc[venueName].push(event);
      return acc;
    }, {});

    console.log('\n📊 EVENTS BY VENUE (showing today):');
    Object.entries(byVenue).forEach(([venue, events]) => {
      console.log(`   ${venue}: ${events.length} events`);
    });

    // Venues that commonly have fake dates (from our scraper analysis)
    const suspectVenues = [
      'Bard on the Beach',
      'Ballet BC',
      'Barclays Center',
      'Brooklyn Nets',
      'Aberdeen Centre',
      'Bell Performing Arts Centre'
      // Add more as needed
    ];

    // Count how many are from suspect venues
    const suspectEvents = todayEvents.filter(e => 
      suspectVenues.some(v => e.venue?.name?.includes(v))
    );

    console.log(`\n⚠️  ${suspectEvents.length} events from known problematic venues`);

    // Ask for confirmation
    console.log('\n🗑️  DELETION OPTIONS:');
    console.log('1. Delete ONLY events from known problematic venues');
    console.log('2. Delete ALL events with today\'s date');
    console.log('3. Skip deletion (just report)');

    // For automation, delete suspect events
    console.log('\n🔧 AUTO-MODE: Deleting events from known problematic venues...');

    const deleteResult = await eventsCollection.deleteMany({
      $and: [
        {
          $or: [
            { date: { $gte: today, $lt: tomorrow } },
            { startDate: { $gte: today, $lt: tomorrow } }
          ]
        },
        {
          'venue.name': { $in: suspectVenues }
        }
      ]
    });

    console.log(`\n✅ Deleted ${deleteResult.deletedCount} fake "today" events`);
    console.log(`✅ Remaining events: ${todayEvents.length - deleteResult.deletedCount}`);

    // Show final stats
    const remainingToday = await eventsCollection.countDocuments({
      $or: [
        { date: { $gte: today, $lt: tomorrow } },
        { startDate: { $gte: today, $lt: tomorrow } }
      ]
    });

    const totalEvents = await eventsCollection.countDocuments({});

    console.log('\n📊 FINAL DATABASE STATS:');
    console.log(`   Total events: ${totalEvents}`);
    console.log(`   Events showing "today": ${remainingToday}`);
    console.log(`   Percentage: ${((remainingToday / totalEvents) * 100).toFixed(2)}%`);

    await mongoose.connection.close();
    console.log('\n✅ Database cleaned successfully!');

  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    process.exit(1);
  }
}

cleanFakeTodayEvents();
