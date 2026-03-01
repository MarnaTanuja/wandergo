const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required." });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(400).json({ error: "Email already registered. Please login instead." });

    const user = new User({ name: name.trim(), email: email.toLowerCase().trim(), password, role: role || "traveler", lastLogin: new Date() });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    console.log("Registered:", user.email);
    res.status(201).json({ message: "Account created.", token, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: "" } });
  } catch (err) {
    console.error("REGISTER ERROR:", err.stack);
    if (err.code === 11000) return res.status(400).json({ error: "Email already registered." });
    res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ error: "No account found with this email." });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(400).json({ error: "Incorrect password." });
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    console.log("Login:", user.email);
    res.json({ message: "Login successful.", token, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar || "" } });
  } catch (err) {
    console.error("LOGIN ERROR:", err.stack);
    res.status(500).json({ error: "Login failed: " + err.message });
  }
});

router.get("/me", verifyToken, (req, res) => res.json({ user: req.user }));

router.patch("/profile", verifyToken, async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (bio !== undefined) updates.bio = bio;
    if (avatar) updates.avatar = avatar;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");
    res.json({ message: "Profile updated.", user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch("/wishlist", verifyToken, async (req, res) => {
  try {
    const { location } = req.body;
    if (!location) return res.status(400).json({ error: "location is required." });
    const user = await User.findById(req.user._id).select("wishlist");
    const idx = user.wishlist.indexOf(location);
    if (idx === -1) await User.findByIdAndUpdate(req.user._id, { $push: { wishlist: location } });
    else await User.findByIdAndUpdate(req.user._id, { $pull: { wishlist: location } });
    const updated = await User.findById(req.user._id).select("wishlist");
    res.json({ wishlist: updated.wishlist });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/wishlist", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("wishlist");
    res.json({ wishlist: user.wishlist });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
