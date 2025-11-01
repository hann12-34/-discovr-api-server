/**
 * Clean up bad New York events from Electric Zoo scraper
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

async function cleanBadEvents() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    // Delete events with UI element titles
    const badTitles = [
      '12 events found.',
      'Select date.',
      'Hide filters',
      'List',
      'Month',
      'Day',
      'Week',
      'Photo',
      'Next Events',
      'Previous Events',
      'Events',
      'Google Calendar',
      'iCalendar',
      'Outlook 365',
      'Date',
      'Recurring Event',
      'See all'
    ];
    
    const deleteResult = await collection.deleteMany({
      city: 'New York',
      $or: [
        { title: { $in: badTitles } },
        { title: { $regex: /^\d{4}-\d{2}-\d{2}$/ } },  // Just dates as titles
        { title: { $regex: /^(function|var|const|let|if|else)/ } },  // JavaScript code
        { title: { $regex: /^(October|November|December|January|February) \d{1,2} @ \d/ } },  // Date-only titles
        { title: { $regex: /^(Randall's Island|Wild Oyster|Fall Cleanup|Winter Composting|Jesse Owens)/ }, venue: { name: 'Electric Zoo Festival' } }  // Wrong park events
      ]
    });
    
    console.log(`🗑️ Removed ${deleteResult.deletedCount} bad events`);
    
    // Count remaining New York events
    const remaining = await collection.countDocuments({ city: 'New York' });
    console.log(`✅ Remaining New York events: ${remaining}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

cleanBadEvents();
