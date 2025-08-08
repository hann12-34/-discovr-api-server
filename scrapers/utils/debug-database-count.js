require('../../temp-env-config');
const mongoose = require('mongoose');
const Event = require('../../models/Event');

async function countEventsByCity() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB.');

    const results = await Event.aggregate([
      {
        $group: {
          _id: '$venue.city',
          count: { $sum: 1 },
          samples: { $push: { title: '$title', url: '$url', venueName: '$venue.name' } }
        }
      },
      {
        $addFields: {
          samples: { $slice: ['$samples', 3] } // Get first 3 samples
        }
      },
      {
        $sort: { count: -1 },
      },
    ]);

    console.log('📊 Event counts by city:');
    let totalEvents = 0;
    if (results.length > 0) {
      results.forEach(result => {
        const cityName = result._id || 'Uncategorized';
        console.log(`\n- ${cityName}: ${result.count}`);
        totalEvents += result.count;

        if (cityName === 'Uncategorized' || !['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'New York'].includes(cityName)) {
            console.log('  Samples:');
            result.samples.forEach(sample => {
                console.log(`    - Title: ${sample.title}, Venue: ${sample.venueName}, URL: ${sample.url}`);
            });
        }
      });
    } else {
      console.log('No events found in the database.');
    }
    console.log(`\n📈 Total events in database: ${totalEvents}`);

  } catch (error) {
    console.error('❌ Error counting events by city:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB.');
  }
}

countEventsByCity();
