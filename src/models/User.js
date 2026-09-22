import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  failed_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lockout_until: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

export default User;