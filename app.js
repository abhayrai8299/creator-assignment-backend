const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./src/config/database');
const { authenticateUser } = require('./src/middlewares/auth');
const { registerValidation, loginValidation } = require('./src/utils/validation');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./src/models/user');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const { loginAdmin } = require('./src/controllers/adminController'); 

dotenv.config();
const app = express();
const PORT =process.env.PORT || 8080;

connectDB();

const cors = require('cors');
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Register Route
app.post('/register', registerValidation, async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ username, email, password: hashedPassword });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
// Login Route
app.post('/login', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: 'User not found' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Invalid ' });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '4h' });

  const now = new Date();
  if (!user.lastLogin || user.lastLogin.toDateString() !== now.toDateString()) {
    user.credits += 10;
  }

  if (!user.profileComplete) {
    user.credits += 50;
    user.profileComplete = true;
  }

  user.lastLogin = now;
  await user.save();

  res.json({
    token,
    role: user.role,
  });
});



// Fetching Feed
app.get('/feed', authenticateUser(), async (req, res) => {
  try {
    const redditResponse = await axios.get('https://www.reddit.com/r/popular.json');
    const redditPosts = redditResponse.data.data.children.map(post => ({
      title: post.data.title,
      url: post.data.url,
      source: 'Reddit',
    }));
    const twitterResponse = await axios.get('https://api.sampleapis.com/futurama/characters');
    const twitterPosts = twitterResponse.data.slice(0, 5).map(post => ({
      title: post.name.first + ' ' + post.name.last,
      url: post.images.main,
      source: 'Twitter (Simulated)',
    }));

    const feed = [...redditPosts, ...twitterPosts];
    res.json(feed);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to fetch feed' });
  }
});

// Save Feed Item
app.post('/feed/save', authenticateUser(), async (req, res) => {
  const { feedItem } = req.body;
  const user = await User.findById(req.user.id);

  const alreadySaved = user.savedFeeds.some(feed => feed.url === feedItem.url);
  if (!alreadySaved) {
    user.savedFeeds.push(feedItem);
    user.credits += 5; 
    user.recentActivity.push({
      action: 'Saved',
      title: feedItem.title,
      date: new Date(),
    });
    await user.save();
  }
  const updatedUser = await User.findById(req.user.id).select('-password');
  res.json({
    message: 'Feed saved',
    credits: updatedUser.credits,
    savedFeeds: updatedUser.savedFeeds,
    recentActivity: updatedUser.recentActivity,
  });
});



// Share Feed Item 
app.post('/feed/share', authenticateUser(), async (req, res) => {
  const { feedItem } = req.body;
  const user = await User.findById(req.user.id);

  user.credits += 3; 
  user.recentActivity.push({
    action: 'Shared',
    title: feedItem.title,
    date: new Date(),
  });
  await user.save();
  const updatedUser = await User.findById(req.user.id).select('-password');
  res.json({
    message: 'Feed shared',
    credits: updatedUser.credits,
    savedFeeds: updatedUser.savedFeeds,
    recentActivity: updatedUser.recentActivity,
  });
});



// Report Feed Item
app.post('/feed/report', authenticateUser(), async (req, res) => {
  const { feedItem } = req.body;
  const user = await User.findById(req.user.id);

  user.credits -= 2; 
  user.recentActivity.push({
    action: 'Reported',
    title: feedItem.title,
    date: new Date(),
  });
  await user.save(); 
  const updatedUser = await User.findById(req.user.id).select('-password');
  res.json({
    message: 'Feed reported successfully',
    credits: updatedUser.credits,
    savedFeeds: updatedUser.savedFeeds,
    recentActivity: updatedUser.recentActivity,
  });
});



// Dashboard
app.get('/dashboard', authenticateUser(), async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

// Admin Routes
app.get('/admin/users', authenticateUser(['admin']), async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// Admin Login Route
app.post('/admin/login', loginAdmin,loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const admin = await User.findOne({ email });

  if (!admin) return res.status(404).json({ message: 'Admin not found' });

  if (admin.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized as admin' });
  }

  const isMatch = await bcrypt.compare(password, "test@12345");
  if (!isMatch) return res.status(400).json({ message: 'Invalid ' });

  const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '4h' });

  res.json({ token });
});
// Admin: Update user credits 
app.put('/admin/credits/:id', authenticateUser(['admin']), async (req, res) => {
  const { credits } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { credits }, { new: true });
  res.json({ message: 'Credits updated', user });
});

// Admin:View user feed activity
app.get('/admin/feed/activity', authenticateUser(['admin']), async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('email recentActivity');
    res.json(users);
  } catch (error) {
    console.error('Error fetching activity:', error.message);
    res.status(500).json({ message: 'Failed to fetch user activity' });
  }
});


//complete-profile
app.post('/complete-profile', async (req, res) => {
  const { userId, bio, profilePicture } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  let pointsAdded = 0;

  if (bio && bio !== user.profile.bio) {
    user.profile.bio = bio;
    pointsAdded += 5; 
  }

  if (profilePicture && profilePicture !== user.profile.profilePicture) {
    user.profile.profilePicture = profilePicture;
    pointsAdded += 5;
  }

  if (pointsAdded > 0) {
    user.isProfileComplete = true;
    user.credits += pointsAdded; 
    await user.save();
  }

  res.status(200).json({
    message: 'Profile updated successfully',
    credits: user.credits,
  });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
