module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("RoomPlayers", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      roomId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Rooms", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      nickname: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sessionTokenHash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
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
    await queryInterface.dropTable("RoomPlayers");
  },
};
