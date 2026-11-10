module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Rooms", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      hostId: {
        type: Sequelize.INTEGER,
      },
      phase: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "WAITING",
      },
      revision: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isStarting: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      lastWordPairHash: {
        type: Sequelize.STRING(64),
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Rooms");
  },
};
