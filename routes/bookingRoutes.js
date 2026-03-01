const express = require("express");
const { Booking } = require("../models/index");
const Event = require("../models/Event");
const { verifyToken } = require("../middleware/authMiddleware");
const router = express.Router();

// POST /api/bookings — create booking with full traveler details
router.post("/", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "traveler") {
      return res.status(403).json({ error: "Only travelers can book events." });
    }
    const { eventId, attendees = 1, phone, specialRequests, emergencyContact } = req.body;
    if (!eventId) return res.status(400).json({ error: "eventId is required." });
    if (!phone) return res.status(400).json({ error: "Phone number is required." });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found." });

    // Check capacity
    if (event.capacity > 0) {
      const existingCount = await Booking.countDocuments({ event: eventId, status: { $ne: "cancelled" } });
      if (existingCount + Number(attendees) > event.capacity) {
        return res.status(400).json({ error: "Not enough spots available." });
      }
    }

    const booking = await Booking.create({
      event: eventId,
      traveler: req.user._id,
      travelerName: req.user.name,
      travelerEmail: req.user.email,
      travelerPhone: phone,
      attendees: Number(attendees),
      totalPrice: event.price * Number(attendees),
      specialRequests: specialRequests || "",
      emergencyContact: emergencyContact || "",
      status: "confirmed",
    });

    console.log(`Booking: ${req.user.name} booked "${event.title}"`);
    res.status(201).json({ message: "Booked successfully!", booking });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: "You already booked this event." });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/my — traveler's bookings
router.get("/my", verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ traveler: req.user._id })
      .populate("event").sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/bookings/upcoming — traveler's upcoming events for homepage
router.get("/upcoming", verifyToken, async (req, res) => {
  try {
    const now = new Date();
    const bookings = await Booking.find({
      traveler: req.user._id,
      status: { $ne: "cancelled" },
    }).populate({
      path: "event",
      match: { date: { $gte: now } },
    }).sort({ createdAt: -1 }).limit(3);

    // Filter out nulls (events that didn't match the date filter)
    const upcoming = bookings.filter(b => b.event !== null);
    res.json(upcoming);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/bookings/check/:eventId — check if traveler already booked
router.get("/check/:eventId", verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      event: req.params.eventId,
      traveler: req.user._id,
      status: { $ne: "cancelled" },
    });
    res.json({ booked: !!booking, bookingId: booking?._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/bookings/my-event-bookings — host sees all bookings for their events
router.get("/my-event-bookings", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "host" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Hosts only." });
    }
    const myEventIds = await Event.find({ host: req.user._id }).distinct("_id");
    const bookings = await Booking.find({ event: { $in: myEventIds } })
      .populate("event", "title location date image price")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/bookings/:id/status — host updates booking status
router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Status must be confirmed or cancelled." });
    }
    const booking = await Booking.findById(req.params.id).populate("event");
    if (!booking) return res.status(404).json({ error: "Booking not found." });

    // Only host of that event or the traveler themselves can update
    const isHost = booking.event?.host?.toString() === req.user._id.toString();
    const isTraveler = booking.traveler.toString() === req.user._id.toString();
    if (!isHost && !isTraveler) return res.status(403).json({ error: "Not authorized." });

    booking.status = status;
    await booking.save();
    res.json({ message: `Booking ${status}.`, booking });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/bookings/:id — traveler cancels
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ error: "Booking not found." });
    if (b.traveler.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized." });
    }
    await b.deleteOne();
    res.json({ message: "Booking cancelled." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
