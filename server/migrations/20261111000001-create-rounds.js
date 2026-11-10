"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Rounds", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      roomId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "Rooms", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      category: { type: Sequelize.STRING, allowNull: false },
      source: { type: Sequelize.STRING, allowNull: false },
      players: { type: Sequelize.JSONB, allowNull: false },
      turnOrder: { type: Sequelize.JSONB, allowNull: false },
      turnIndex: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      playerWords: { type: Sequelize.JSONB, allowNull: false },
      impostorId: { type: Sequelize.INTEGER, allowNull: false },
      clues: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      chat: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      votes: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      result: { type: Sequelize.JSONB, allowNull: true },
      deadlineAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Rounds");
  },
};
