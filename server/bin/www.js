const { createServer } = require("node:http");
const { Server } = require("socket.io");
const app = require("../app");
const registerRoomEvents = require("../sockets/room");

const port = Number(process.env.PORT || 3000);
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: app.get("client origin") },
});
registerRoomEvents(io);
httpServer.listen(port, () => {
  console.log(`Kataflase server listening on port ${httpServer.address().port}`);
});
