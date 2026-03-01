const mongoose = require("mongoose");

// ── Booking ───────────────────────────────────────────────
const bookingSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  traveler: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  travelerName: String,
  travelerEmail: String,
  travelerPhone: String,
  attendees: { type: Number, default: 1 },
  totalPrice: { type: Number, default: 0 },
  specialRequests: { type: String, default: "" },
  emergencyContact: { type: String, default: "" },
  status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "confirmed" },
}, { timestamps: true });

bookingSchema.index({ event: 1, traveler: 1 }, { unique: true });

// ── Review ────────────────────────────────────────────────
const reviewSchema = new mongoose.Schema({
  location: { type: String, required: true, trim: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  authorName: String,
  authorAvatar: String,
  rating: { type: Number, min: 1, max: 5, required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  helpful: { type: Number, default: 0 },
}, { timestamps: true });

// ── Message ───────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  senderName: String,
  senderRole: { type: String, enum: ["traveler", "host", "admin"] },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipientName: String,
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  read: { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ event: 1, sender: 1, recipient: 1 });

module.exports = {
  Booking: mongoose.model("Booking", bookingSchema),
  Review: mongoose.model("Review", reviewSchema),
  Message: mongoose.model("Message", messageSchema),
};
