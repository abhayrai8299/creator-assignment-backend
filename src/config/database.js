const mongoose = require('mongoose');
const User = require('../models/user');
const bcrypt = require('bcryptjs');

const createAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingAdmin) {
      return; 
    }
    const hashedPassword = await bcrypt.hash('test@12345', 10);
    await User.create({
      username: 'admin',
      email: 'admin@gmail.com',
      password: hashedPassword,
      role: 'admin',
    });
    console.log('Default admin created: admin@gmail.com / test@12345');
  } catch (error) {
    console.error('Error while creating admin:', error.message);
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Database connected');

    await createAdmin(); 

  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
