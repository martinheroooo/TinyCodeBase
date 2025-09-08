const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FileAnalysis = sequelize.define('FileAnalysis', {
    analysis: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    language: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'analyzing', 'completed', 'failed'),
      defaultValue: 'pending'
    }
  });

  return FileAnalysis;
};