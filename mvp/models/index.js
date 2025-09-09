const { Sequelize, Op } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false
});

const User = require('./User')(sequelize);
const KnowledgeBase = require('./KnowledgeBase')(sequelize);
const DirectoryStructure = require('./DirectoryStructure')(sequelize);
const FileAnalysis = require('./FileAnalysis')(sequelize);

// Define relationships
User.hasMany(KnowledgeBase, { foreignKey: 'user_id' });
KnowledgeBase.belongsTo(User, { foreignKey: 'user_id' });

KnowledgeBase.hasMany(DirectoryStructure, { foreignKey: 'knowledge_base_id' });
DirectoryStructure.belongsTo(KnowledgeBase, { foreignKey: 'knowledge_base_id' });

DirectoryStructure.hasMany(FileAnalysis, { foreignKey: 'directory_structure_id' });
FileAnalysis.belongsTo(DirectoryStructure, { foreignKey: 'directory_structure_id' });

module.exports = {
  sequelize,
  User,
  KnowledgeBase,
  DirectoryStructure,
  FileAnalysis,
  Op
};