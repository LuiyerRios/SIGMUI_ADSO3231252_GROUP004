import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const HelpReport = db.define('HelpReport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { isEmail: true }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(300),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Pending', 'In_Review', 'Resolved'),
    defaultValue: 'Pending'
  }
});

export default HelpReport;