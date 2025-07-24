require('dotenv').config();
const mongoose = require('mongoose');

async function debugPriceFields() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable not set');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all events 
        const events = await mongoose.connection.db.collection('events').find({}).toArray();
        
        console.log(`Total events found: ${events.length}`);
        
        // Check event #1136 specifically
        if (events.length >= 1137) {
            const event1136 = events[1136];
            console.log('\n=== EVENT 1136 (THE PROBLEMATIC ONE) ===');
            console.log('ID:', event1136._id);
            console.log('Title:', event1136.title);
            console.log('Price field type:', typeof event1136.price);
            console.log('Price field value:', JSON.stringify(event1136.price));
            
            // Check a few events around 1136 too
            console.log('\n=== CHECKING EVENTS 1134-1138 ===');
            for (let i = 1134; i <= 1138 && i < events.length; i++) {
                const event = events[i];
                console.log(`\nEvent ${i}:`);
                console.log('Title:', event.title);
                console.log('Price type:', typeof event.price);
                console.log('Price value:', JSON.stringify(event.price));
            }
        }
        
        // Analyze all price fields
        let totalEventsWithPrice = 0;
        let priceAsString = 0;
        let priceAsNumber = 0;
        let priceAsOther = 0;
        let priceUndefined = 0;
        
        const numberPriceExamples = [];
        const stringPriceExamples = [];
        const otherPriceExamples = [];
        
        events.forEach((event, index) => {
            if (event.price !== undefined && event.price !== null) {
                totalEventsWithPrice++;
                
                const priceType = typeof event.price;
                if (priceType === 'string') {
                    priceAsString++;
                    if (stringPriceExamples.length < 3) {
                        stringPriceExamples.push({
                            index,
                            title: event.title,
                            price: event.price
                        });
                    }
                } else if (priceType === 'number') {
                    priceAsNumber++;
                    if (numberPriceExamples.length < 5) {
                        numberPriceExamples.push({
                            index,
                            title: event.title,
                            price: event.price
                        });
                    }
                } else {
                    priceAsOther++;
                    if (otherPriceExamples.length < 3) {
                        otherPriceExamples.push({
                            index,
                            title: event.title,
                            price: event.price,
                            type: priceType
                        });
                    }
                }
            } else {
                priceUndefined++;
            }
        });
        
        console.log('\n=== PRICE FIELD ANALYSIS ===');
        console.log(`Events with price field: ${totalEventsWithPrice}`);
        console.log(`Price as string: ${priceAsString}`);
        console.log(`Price as number: ${priceAsNumber}`);
        console.log(`Price as other types: ${priceAsOther}`);
        console.log(`Price undefined/null: ${priceUndefined}`);
        
        if (numberPriceExamples.length > 0) {
            console.log('\n🚨 NUMBER PRICE EXAMPLES (CAUSING THE ERROR):');
            numberPriceExamples.forEach(example => {
                console.log(`Index ${example.index}: "${example.title}"`);
                console.log(`  Price: ${example.price} (number)`);
            });
        }
        
        if (stringPriceExamples.length > 0) {
            console.log('\n✅ STRING PRICE EXAMPLES (CORRECT FORMAT):');
            stringPriceExamples.forEach(example => {
                console.log(`Index ${example.index}: "${example.title}"`);
                console.log(`  Price: "${example.price}" (string)`);
            });
        }
        
        if (otherPriceExamples.length > 0) {
            console.log('\n❓ OTHER PRICE TYPE EXAMPLES:');
            otherPriceExamples.forEach(example => {
                console.log(`Index ${example.index}: "${example.title}"`);
                console.log(`  Price: ${JSON.stringify(example.price)} (${example.type})`);
            });
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

console.log('🔍 Debugging price field type mismatch...');
console.log('🎯 Analyzing event #1136 and all price field types');
debugPriceFields();
