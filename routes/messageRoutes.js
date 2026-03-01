const express = require("express");
const { Message } = require("../models/index");
const Event = require("../models/Event");
const { verifyToken } = require("../middleware/authMiddleware");
const router = express.Router();

// Send message - works for both traveler→host and host→traveler
router.post("/", verifyToken, async (req, res) => {
  try {
    const { eventId, text, recipientId } = req.body;
    if (!eventId || !text) return res.status(400).json({ error: "eventId and text required." });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found." });

    // If recipientId given (host replying), use it; else default to event host
    const recipient = recipientId || event.host;
    const User = require("../models/User");
    const recipientUser = await User.findById(recipient).select("name");

    const msg = await Message.create({
      event: eventId,
      sender: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      recipient,
      recipientName: recipientUser?.name || "",
      text,
    });

    res.status(201).json({ message: "Sent.", data: msg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Thread between two users for one event
router.get("/thread/:eventId/:otherUserId", verifyToken, async (req, res) => {
  try {
    const { eventId, otherUserId } = req.params;
    const me = req.user._id;
    const msgs = await Message.find({
      event: eventId,
      $or: [
        { sender: me, recipient: otherUserId },
        { sender: otherUserId, recipient: me },
      ],
    }).sort({ createdAt: 1 });

    // Mark received messages as read
    await Message.updateMany(
      { event: eventId, sender: otherUserId, recipient: me, read: false },
      { $set: { read: true } }
    );

    res.json(msgs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// All messages sent TO current user (inbox)
router.get("/inbox", verifyToken, async (req, res) => {
  try {
    const msgs = await Message.find({ recipient: req.user._id })
      .populate("event", "title location image")
      .populate("sender", "name avatar")
      .sort({ createdAt: -1 });
    res.json(msgs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Unread count
router.get("/unread-count", verifyToken, async (req, res) => {
  try {
    const count = await Message.countDocuments({ recipient: req.user._id, read: false });
    res.json({ count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Conversations list — unique senders grouped
router.get("/conversations", verifyToken, async (req, res) => {
  try {
    const msgs = await Message.aggregate([
      {
        $match: {
          $or: [
            { recipient: req.user._id },
            { sender: req.user._id },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            event: "$event",
            other: {
              $cond: [{ $eq: ["$sender", req.user._id] }, "$recipient", "$sender"],
            },
          },
          lastMessage: { $first: "$$ROOT" },
          unread: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$recipient", req.user._id] }, { $eq: ["$read", false] }] },
                1, 0,
              ],
            },
          },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
      { $lookup: { from: "events", localField: "_id.event", foreignField: "_id", as: "event" } },
      { $lookup: { from: "users", localField: "_id.other", foreignField: "_id", as: "other" } },
      { $unwind: { path: "$event", preserveNullAndEmpty: true } },
      { $unwind: { path: "$other", preserveNullAndEmpty: true } },
    ]);
    res.json(msgs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
