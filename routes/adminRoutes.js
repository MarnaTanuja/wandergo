const express = require("express");
const User = require("../models/User");
const Event = require("../models/Event");
const { Booking } = require("../models/index");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/stats", verifyToken, isAdmin, async (req, res) => {
  try {
    const [users, events, bookings] = await Promise.all([User.countDocuments(), Event.countDocuments(), Booking.countDocuments()]);
    const travelers = await User.countDocuments({ role: "traveler" });
    const hosts = await User.countDocuments({ role: "host" });
    res.json({ users, events, bookings, travelers, hosts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/users", verifyToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch("/users/:id/toggle", verifyToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User ${user.isActive ? "activated" : "deactivated"}.`, isActive: user.isActive });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch("/events/:id/feature", verifyToken, isAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found." });
    event.isFeatured = !event.isFeatured;
    await event.save();
    res.json({ message: `Event ${event.isFeatured ? "featured" : "unfeatured"}.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;