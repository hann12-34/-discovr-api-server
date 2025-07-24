require('dotenv').config();
const mongoose = require('mongoose');

async function fixPriceFieldTypes() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // First, find all events with numeric price fields
        const eventsWithNumberPrices = await mongoose.connection.db.collection('events')
            .find({ 
                price: { $type: "number" } 
            })
            .toArray();

        console.log(`\n📊 Found ${eventsWithNumberPrices.length} events with numeric price fields`);

        if (eventsWithNumberPrices.length === 0) {
            console.log('✅ No events with numeric price fields found. Nothing to fix!');
            await mongoose.disconnect();
            return;
        }

        // Show examples before conversion
        console.log('\n📝 Examples of events that will be modified:');
        eventsWithNumberPrices.slice(0, 5).forEach((event, index) => {
            console.log(`${index + 1}. "${event.title}" - price: ${event.price} (${typeof event.price})`);
        });

        console.log('\n🔄 Converting all numeric price fields to strings...');

        // Convert each numeric price to string
        let modifiedCount = 0;
        const bulkOps = [];

        for (const event of eventsWithNumberPrices) {
            const stringPrice = event.price.toString();
            bulkOps.push({
                updateOne: {
                    filter: { _id: event._id },
                    update: { $set: { price: stringPrice } }
                }
            });
        }

        // Execute bulk operations
        if (bulkOps.length > 0) {
            const result = await mongoose.connection.db.collection('events').bulkWrite(bulkOps);
            modifiedCount = result.modifiedCount;
        }

        console.log('\n✅ OPERATION COMPLETED SUCCESSFULLY!');
        console.log(`📊 Modified ${modifiedCount} events`);

        // Verify the fix by checking if any events still have numeric price fields
        const remainingNumericPrices = await mongoose.connection.db.collection('events')
            .countDocuments({ price: { $type: "number" } });

        if (remainingNumericPrices === 0) {
            console.log('🎉 SUCCESS: No events with numeric price fields remain!');
            console.log('🚀 Mobile app parsing error should now be resolved!');
            
            // Show some examples of the converted prices
            console.log('\n📝 Examples of converted prices:');
            const convertedEvents = await mongoose.connection.db.collection('events')
                .find({ 
                    _id: { $in: eventsWithNumberPrices.slice(0, 3).map(e => e._id) }
                })
                .toArray();
            
            convertedEvents.forEach((event, index) => {
                console.log(`${index + 1}. "${event.title}" - price: "${event.price}" (${typeof event.price})`);
            });
        } else {
            console.log(`⚠️  Warning: ${remainingNumericPrices} events still have numeric price fields`);
        }

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run the fix
console.log('🔧 Starting fix for price field type mismatch...');
console.log('🎯 Converting all numeric price fields to strings');
fixPriceFieldTypes();
