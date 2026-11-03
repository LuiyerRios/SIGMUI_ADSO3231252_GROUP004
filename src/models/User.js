import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const User = db.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  fullName: { type: DataTypes.STRING(100), allowNull: false },
  identityDocument: { type: DataTypes.STRING(20), allowNull: true, unique: true },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  primaryAddress: { type: DataTypes.STRING(255), allowNull: true },
  preferredLanguage: {
  type: DataTypes.STRING(10),
  allowNull: false,
  defaultValue: 'en'
},
preferredTheme: {
  type: DataTypes.STRING(10),
  allowNull: false,
  defaultValue: 'light'
},
notifyAccountActivity: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue: true
},
notifySystemEvents: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue: true
},
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('driver', 'agent', 'admin'), allowNull: false, defaultValue: 'driver' },
  emailVerifiedAt: { type: DataTypes.DATE, allowNull: true },
  failedAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  lockoutUntil: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'users', underscored: true });

export default User;
