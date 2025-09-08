const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DirectoryStructure = sequelize.define('DirectoryStructure', {
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'DirectoryStructures',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('directory', 'file'),
      allowNull: false
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });

  return DirectoryStructure;
};