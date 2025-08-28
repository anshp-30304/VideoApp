const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ===== User Schema =====
const userSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 }, // UUID
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user', 'viewer'], default: 'user' },
  permissions: [String],
  createdAt: { type: Date, default: Date.now },
  settings: {
    defaultQuality: { type: String, default: 'medium' },
    notifications: { type: Boolean, default: true }
  }
});

const User = mongoose.model('User', userSchema);

// ===== Helper functions =====
const getPermissionsForRole = (role) => {
  const rolePermissions = {
    admin: ['upload', 'transcode', 'delete', 'manage_users', 'view_all'],
    user: ['upload', 'transcode'],
    viewer: ['view']
  };
  return rolePermissions[role] || rolePermissions.user;
};

const createUser = async (username, password, role = 'user') => {
  const existingUser = await User.findOne({ username });
  if (existingUser) return existingUser;

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    username,
    password: hashedPassword,
    role,
    permissions: getPermissionsForRole(role)
  });

  return user.save();
};

const findUserByUsername = async (username) => {
  return User.findOne({ username });
};

const findUserById = async (id) => {
  return User.findOne({ id });
};

const getAllUsers = async () => {
  return User.find({}, { password: 0 }); // exclude password
};

const updateUserSettings = async (userId, settings) => {
  return User.findOneAndUpdate(
      { id: userId },
      { $set: { settings } },
      { new: true }
  );
};

// ===== Initialize default users =====
const initializeUsers = async () => {
  const defaultUsers = [
    {
      username: 'admin',
      password: 'admin123',
      role: 'admin'
    },
    {
      username: 'user1',
      password: 'user123',
      role: 'user'
    },
    {
      username: 'viewer',
      password: 'viewer123',
      role: 'viewer'
    }
  ];

  for (const userData of defaultUsers) {
    await createUser(userData.username, userData.password, userData.role);
  }
};

initializeUsers();

module.exports = {
  User,
  createUser,
  findUserByUsername,
  findUserById,
  getAllUsers,
  updateUserSettings
};
