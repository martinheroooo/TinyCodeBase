const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const KnowledgeBase = sequelize.define('KnowledgeBase', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    source_url: {
      type: DataTypes.STRING,
      allowNull: false
    },
    branch: {
      type: DataTypes.STRING,
      defaultValue: 'main'
    },
    status: {
      type: DataTypes.ENUM('pending', 'cloning', 'scanning', 'analyzing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  });

  return KnowledgeBase;
};