if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ quiet: true });
}

const express = require("express");
const cors = require("cors");
const router = require("./routers");
const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN?.trim().replace(/\/+$/, "") || "http://localhost:5173";
app.set("client origin", clientOrigin);
app.use(cors({ origin: app.get("client origin") }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to Kataflase API");
});

app.use(router);

module.exports = app;
