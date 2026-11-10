const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Round extends Model {
    static associate(models) {
      Round.belongsTo(models.Room, { foreignKey: "roomId", onDelete: "CASCADE" });
    }
  }

  Round.init({
    id: { type: DataTypes.UUID, primaryKey: true },
    roomId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    category: { type: DataTypes.STRING, allowNull: false },
    source: { type: DataTypes.STRING, allowNull: false },
    players: { type: DataTypes.JSONB, allowNull: false },
    turnOrder: { type: DataTypes.JSONB, allowNull: false },
    turnIndex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    playerWords: { type: DataTypes.JSONB, allowNull: false },
    impostorId: { type: DataTypes.INTEGER, allowNull: false },
    clues: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    chat: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    votes: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    result: DataTypes.JSONB,
    deadlineAt: DataTypes.DATE,
  }, { sequelize, modelName: "Round" });

  return Round;
};
