import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const UserToken = db.define('UserToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('password_reset', 'email_verification'),
    allowNull: false
  },
  tokenHash: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'user_tokens',
  underscored: true,
  updatedAt: false
});

export default UserToken;