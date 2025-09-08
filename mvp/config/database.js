const { sequelize } = require('../models');

async function initializeDatabase() {
  try {
    await sequelize.sync({ force: false });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing database:', error);
  }
}

module.exports = initializeDatabase;