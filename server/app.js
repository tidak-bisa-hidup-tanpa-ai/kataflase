if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ quiet: true });
}

const express = require("express");
const cors = require("cors");
const router = require("./routers");
const app = express();

app.set("client origin", process.env.CLIENT_ORIGIN || "http://localhost:5173");
app.use(cors({ origin: app.get("client origin") }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(router);

module.exports = app;
