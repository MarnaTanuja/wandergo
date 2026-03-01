// reviewRoutes.js
const express = require("express");
const { Review } = require("../models/index");
const { verifyToken } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { location } = req.query;
    if (!location) return res.status(400).json({ error: "location required." });
    const reviews = await Review.find({ location: { $regex: location, $options: "i" } })
      .sort({ createdAt: -1 }).limit(20);
    const avg = reviews.length
      ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
      : null;
    res.json({ reviews, averageRating: avg, total: reviews.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    const { location, rating, text } = req.body;
    if (!location || !rating || !text) return res.status(400).json({ error: "location, rating and text required." });
    const review = await Review.create({
      location, rating: parseInt(rating), text,
      author: req.user._id, authorName: req.user.name, authorAvatar: req.user.avatar || "",
    });
    res.status(201).json({ message: "Review posted.", review });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
