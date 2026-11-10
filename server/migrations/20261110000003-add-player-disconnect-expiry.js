module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("RoomPlayers", "disconnectExpiresAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("RoomPlayers", "disconnectExpiresAt");
  },
};
