const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RoomPlayer extends Model {
    static associate(models) {
      RoomPlayer.belongsTo(models.Room, {
        foreignKey: "roomId",
        onDelete: "CASCADE",
      });
    }
  }

  RoomPlayer.init({
    roomId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nickname: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sessionTokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    disconnectExpiresAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: "RoomPlayer",
  });

  return RoomPlayer;
};
