const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// In-memory user storage (in production, this would be a database)
const users = new Map();

// Default users for demonstration
const initializeUsers = async () => {
  const defaultUsers = [
    {
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      permissions: ['upload', 'transcode', 'delete', 'manage_users', 'view_all']
    },
    {
      username: 'user1',
      password: 'user123',
      role: 'user',
      permissions: ['upload', 'transcode']
    },
    {
      username: 'viewer',
      password: 'viewer123',
      role: 'viewer',
      permissions: ['view']
    }
  ];

  for (const userData of defaultUsers) {
    if (!findUserByUsername(userData.username)) {
      await createUser(userData.username, userData.password, userData.role);
    }
  }
};

const findUserByUsername = (username) => {
  for (const user of users.values()) {
    if (user.username === username) {
      return user;
    }
  }
  return null;
};

const findUserById = (id) => {
  return users.get(id);
};

const createUser = async (username, password, role = 'user') => {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const permissions = getPermissionsForRole(role);
  
  const user = {
    id: uuidv4(),
    username,
    password: hashedPassword,
    role,
    permissions,
    createdAt: new Date(),
    settings: {
      defaultQuality: 'medium',
      notifications: true
    }
  };
  
  users.set(user.id, user);
  return user;
};

const getPermissionsForRole = (role) => {
  const rolePermissions = {
    admin: ['upload', 'transcode', 'delete', 'manage_users', 'view_all'],
    user: ['upload', 'transcode'],
    viewer: ['view']
  };
  
  return rolePermissions[role] || rolePermissions.user;
};

const getAllUsers = () => {
  return Array.from(users.values()).map(user => ({
    id: user.id,
    username: user.username,
    role: user.role,
    permissions: user.permissions,
    createdAt: user.createdAt
  }));
};

const updateUserSettings = (userId, settings) => {
  const user = users.get(userId);
  if (user) {
    user.settings = { ...user.settings, ...settings };
    return user;
  }
  return null;
};

// Initialize default users
initializeUsers();

module.exports = {
  users,
  findUserByUsername,
  findUserById,
  createUser,
  getAllUsers,
  updateUserSettings
};
