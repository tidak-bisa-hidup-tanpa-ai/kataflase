const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Room extends Model {
    static associate(models) {
      Room.hasMany(models.RoomPlayer, {
        foreignKey: "roomId",
        onDelete: "CASCADE",
      });
    }
  }

  Room.init({
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    hostId: DataTypes.INTEGER,
    phase: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "WAITING",
    },
    revision: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isStarting: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lastWordPairHash: DataTypes.STRING(64),
  }, {
    sequelize,
    modelName: "Room",
  });

  return Room;
};
