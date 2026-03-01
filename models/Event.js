const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  location: {
    city: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    coordinates: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
  },
  date: { type: Date, required: true },
  endDate: { type: Date },
  image: { type: String, default: "" },        // Cloudinary URL
  imagePublicId: { type: String, default: "" }, // Cloudinary public_id
  price: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: "INR" },
  offer: { type: String, default: "" },
  category: {
    type: String,
    enum: ["adventure", "culture", "food", "music", "sports", "wellness", "other"],
    default: "other",
  },
  tags: [{ type: String, trim: true }],
  capacity: { type: Number, default: 0 }, // 0 = unlimited
  host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  hostName: { type: String },
  hostEmail: { type: String },
  // Analytics
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bookmarks: { type: Number, default: 0 },
  bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // Status
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Geospatial index
eventSchema.index({ "location.coordinates": "2dsphere" });
// Text search index
eventSchema.index({ title: "text", description: "text", "location.city": "text" });
// Compound index for sorting/filtering
eventSchema.index({ createdAt: -1, views: -1, likes: -1 });

// Trending score virtual
eventSchema.virtual("trendingScore").get(function () {
  const hoursSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 48 - hoursSinceCreation) / 48;
  return this.likes * 3 + this.views * 1 + recencyScore * 20;
});

eventSchema.pre("save", function () {
  this.updatedAt = new Date();
});
module.exports = mongoose.model("Event", eventSchema);
