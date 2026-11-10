const { createServer } = require("node:http");
const { Server } = require("socket.io");
const app = require("../app");
const registerRoomEvents = require("../sockets/room");

const port = Number(process.env.PORT || 3000);
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: app.get("client origin") },
});
registerRoomEvents(io).then(() => {
  httpServer.listen(port, () => {
    console.log(`Kataflase server listening on port ${httpServer.address().port}`);
  });
}).catch((error) => {
  console.error("Kataflase server could not restore room sessions:", error.name);
  process.exit(1);
});
