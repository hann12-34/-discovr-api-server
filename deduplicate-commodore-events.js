/**
 * Script to deduplicate Commodore Ballroom events in the database
 * This script identifies duplicate events and keeps only the best version
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const mongoose = require('mongoose');
const { v5: uuidv5 } = require('uuid');

// Namespace for deterministic UUIDs
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

async function deduplicateCommodoreEvents() {
  // Connect to MongoDB
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Import Event model
    const Event = require('./models/Event');

    // Find all Commodore Ballroom events
    console.log('🔍 Finding all Commodore Ballroom events...');
    
    const query = {
      $or: [
        { 'venue.name': { $regex: /commodore ballroom/i } },
        { dataSources: { $in: ['vancouver-commodore-ballroom'] } }
      ]
    };
    
    const events = await Event.find(query);
    console.log(`✅ Found ${events.length} Commodore Ballroom events`);

    if (events.length > 0) {
      // Group events by normalized title and date
      const eventGroups = {};
      
      // Further clean up titles
      events.forEach(event => {
        // Normalize the title (remove common prefixes, suffixes, and standardize format)
        let normalizedTitle = event.title
          .replace(/club level seating:?\s*/i, '')
          .replace(/\s*-?\s*suites.*/i, '')
          .replace(/\s*ball suites.*/i, '')
          .replace(/\s*w\..*guest.*/i, '')
          .replace(/\s*w\/.*guest.*/i, '')
          .replace(/\s*with.*guest.*/i, '')
          .replace(/\s*\(.*\)/i, '');
        
        // Remove tour names if they follow a colon
        if (normalizedTitle.includes(':')) {
          normalizedTitle = normalizedTitle.split(':')[0].trim();
        }
        
        // Create a key combining the normalized title and date
        const eventDate = new Date(event.startDate);
        const dateKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
        const groupKey = `${normalizedTitle.toLowerCase()}|${dateKey}`;
        
        if (!eventGroups[groupKey]) {
          eventGroups[groupKey] = [];
        }
        
        eventGroups[groupKey].push(event);
      });
      
      // Process each group to keep the best event and remove duplicates
      const toDelete = [];
      const toUpdate = [];
      
      for (const [groupKey, groupEvents] of Object.entries(eventGroups)) {
        if (groupEvents.length > 1) {
          console.log(`Found ${groupEvents.length} duplicates for "${groupKey}"`);
          
          // Sort events by title quality (prefer titles with more information)
          groupEvents.sort((a, b) => {
            // Prefer titles with tour names or additional info
            const aHasColon = a.title.includes(':');
            const bHasColon = b.title.includes(':');
            
            if (aHasColon && !bHasColon) return -1;
            if (!aHasColon && bHasColon) return 1;
            
            // Otherwise prefer longer titles as they may have more info
            return b.title.length - a.title.length;
          });
          
          // Keep the best event and mark others for deletion
          const bestEvent = groupEvents[0];
          
          // Update the best event with a better title if needed
          if (bestEvent.title.includes('Club Level Seating:') || 
              bestEvent.title.includes('Suites') || 
              bestEvent.title.includes('Ball Suites')) {
            
            // Find a better title from the group
            const betterTitleEvent = groupEvents.find(e => 
              !e.title.includes('Club Level Seating:') && 
              !e.title.includes('Suites') && 
              !e.title.includes('Ball Suites')
            );
            
            if (betterTitleEvent) {
              bestEvent.title = betterTitleEvent.title;
              toUpdate.push(bestEvent);
            }
          }
          
          // Mark duplicates for deletion
          for (let i = 1; i < groupEvents.length; i++) {
            toDelete.push(groupEvents[i]._id);
          }
        }
      }
      
      // Update events with better titles
      if (toUpdate.length > 0) {
        console.log(`Updating ${toUpdate.length} events with better titles...`);
        
        for (const event of toUpdate) {
          await Event.updateOne({ _id: event._id }, { $set: { title: event.title } });
        }
        
        console.log(`✅ Updated ${toUpdate.length} events with better titles`);
      }
      
      // Delete duplicate events
      if (toDelete.length > 0) {
        console.log(`Deleting ${toDelete.length} duplicate events...`);
        
        const deleteResult = await Event.deleteMany({ _id: { $in: toDelete } });
        console.log(`✅ Deleted ${deleteResult.deletedCount} duplicate events`);
      }
      
      console.log('✅ Deduplication complete!');
    } else {
      console.log('ℹ️ No Commodore Ballroom events found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

deduplicateCommodoreEvents().catch(console.error);
