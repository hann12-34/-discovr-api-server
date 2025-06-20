const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
    default: 'Untitled Event',
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  venue: {
    name: {
      type: String,
      default: 'Unknown Venue'
    },
    address: {
      type: String,
      default: 'Address not provided'
    },
    city: {
      type: String,
      default: 'Seattle'
    },
    state: {
      type: String,
      default: 'WA'
    },
    zipCode: {
      type: String
    },
    venueType: {
      type: String,
      enum: ['music', 'theater', 'sports', 'outdoor', 'restaurant', 'bar', 'museum', 'gallery', 'other'],
      default: 'other'
    },
    website: {
      type: String
    },
    capacity: {
      type: Number
    }
  },
  location: {
    type: String,
    default: 'Seattle, WA'
  },
  latitude: {
    type: Number,
    default: 0
  },
  longitude: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  imageURL: {
    type: String
  },
  sourceURL: {
    type: String
  },
  type: {
    type: String,
    default: 'general'
  },
  price: {
    type: String,
    default: 'Free'
  },
  priceRange: {
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  ticketURL: {
    type: String
  },
  source: {
    type: String,
    default: 'manual',
    enum: ['manual', 'scraped', 'api']
  },
  season: {
    type: String,
    enum: ['winter', 'spring', 'summer', 'fall'],
    default: function() {
      const month = new Date().getMonth();
      if (month >= 2 && month <= 4) return 'spring';
      if (month >= 5 && month <= 7) return 'summer';
      if (month >= 8 && month <= 10) return 'fall';
      return 'winter';
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  accessibility: {
    wheelchairAccessible: {
      type: Boolean,
      default: false
    },
    assistiveListening: {
      type: Boolean,
      default: false
    },
    closedCaptions: {
      type: Boolean,
      default: false
    },
    signLanguage: {
      type: Boolean,
      default: false
    },
    serviceAnimalsAllowed: {
      type: Boolean,
      default: true
    },
    notes: {
      type: String
    }
  },
  status: {
    type: String,
    enum: ['active', 'upcoming', 'ended'],
    default: 'upcoming'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to update the updatedAt field
EventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Event', EventSchema);
