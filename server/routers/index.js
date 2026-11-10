const express = require("express");
const router = express.Router();
const { getAvailableCategories } = require("../helpers/wordBank");

router.get("/health", (_req, res) => {
  res.status(200).json({ data: { status: "ok" } });
});

router.get("/api/game-options", (_req, res) => {
  res.status(200).json({ data: { categories: getAvailableCategories() } });
});

module.exports = router;
