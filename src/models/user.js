const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  credits: { type: Number, default: 0 },
  savedFeeds: [
    {
      title: { type: String },
      url: { type: String },
      source: { type: String },
    }
  ],
  
  profileComplete: { type: Boolean, default: false },
  lastLogin: { type: Date },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  recentActivity: [
    {
      action: { type: String }, 
      title: { type: String },
      date: { type: Date, default: Date.now }
    }
  ],
  profile: {
    bio: { type: String, default: '' },  
    profilePicture: { type: String, default: '' },
  },
});

module.exports = mongoose.model('User', UserSchema);
