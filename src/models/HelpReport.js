import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const HelpReport = db.define('HelpReport', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  firstName: { type: DataTypes.STRING(50), allowNull: false },
  lastName: { type: DataTypes.STRING(50), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: false, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING(20), allowNull: false },
  description: { type: DataTypes.STRING(300), allowNull: false },
  status: { type: DataTypes.ENUM('Pending', 'In_Review', 'Resolved'), defaultValue: 'Pending' },
  response: { type: DataTypes.TEXT, allowNull: true },
  respondedAt: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'help_reports', underscored: true });

export default HelpReport;
