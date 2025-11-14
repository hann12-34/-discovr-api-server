const mongoose = require('mongoose');

// Event schema definition
const EventSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  title: { type: String, required: true },
  description: String,
  startDate: { type: Date, required: true },
  endDate: Date,
  image: String,
  imageUrl: String, // Event poster/image URL
  venue: {
    name: { type: String, required: true },
    address: String,
    city: String,
    state: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  category: { type: String, default: 'music' },
  categories: [String],
  city: String, // City where the event takes place
  sourceURL: String,
  ticketURL: String,
  location: String, // Legacy field for compatibility
  lastUpdated: { type: Date, default: Date.now }
});

// Create compound index on title and venue.name for faster lookups
EventSchema.index({ title: 1, 'venue.name': 1 });

// Create index on startDate for date range queries
EventSchema.index({ startDate: 1 });
EventSchema.index({ endDate: 1 });

// Create index on venue.name for venue filtering
EventSchema.index({ 'venue.name': 1 });

// Export model
const Event = mongoose.model('Event', EventSchema);

module.exports = Event;
