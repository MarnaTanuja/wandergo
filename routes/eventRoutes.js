const express = require("express");
const Event = require("../models/Event");
const { verifyToken, isHost, optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// ── GET /api/events — list with search, filter, sort, pagination ──
router.get("/", optionalAuth, async (req, res) => {
  try {
    const {
      query = "", page = 1, limit = 9,
      city, category, minPrice, maxPrice,
      dateFrom, dateTo,
      sort = "newest",
    } = req.query;

    const filter = { isActive: true };

    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { "location.city": { $regex: query, $options: "i" } },
        { "location.country": { $regex: query, $options: "i" } },
      ];
    }

    if (city) filter["location.city"] = { $regex: city, $options: "i" };
    if (category) filter.category = category;
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      popular: { likes: -1, views: -1 },
      views: { views: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      upcoming: { date: 1 },
    };

    const sortQuery = sortMap[sort] || sortMap.newest;
    const skip = (Number(page) - 1) * Number(limit);

    const [events, total] = await Promise.all([
      Event.find(filter).sort(sortQuery).skip(skip).limit(Number(limit))
        .populate("host", "name avatar"),
      Event.countDocuments(filter),
    ]);

    res.json({
      events,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/events/trending ──
router.get("/trending", async (req, res) => {
  try {
    // Weighted: likes*3 + views + recency
    const events = await Event.aggregate([
      { $match: { isActive: true } },
      {
        $addFields: {
          hoursSinceCreation: {
            $divide: [{ $subtract: [new Date(), "$createdAt"] }, 3600000],
          },
        },
      },
      {
        $addFields: {
          trendingScore: {
            $add: [
              { $multiply: ["$likes", 3] },
              "$views",
              { $multiply: [{ $max: [{ $subtract: [48, "$hoursSinceCreation"] }, 0] }, 0.4] },
            ],
          },
        },
      },
      { $sort: { trendingScore: -1 } },
      { $limit: 6 },
      { $lookup: { from: "users", localField: "host", foreignField: "_id", as: "host" } },
      { $unwind: { path: "$host", preserveNullAndEmpty: true } },
    ]);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/events/nearby?lat=&lng=&radius=50 ──
router.get("/nearby", async (req, res) => {
  try {
    const { lat, lng, radius = 100 } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "lat and lng required." });

    const events = await Event.find({
      isActive: true,
      "location.coordinates": {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: Number(radius) * 1000,
        },
      },
    }).limit(9).populate("host", "name avatar");

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ── GET /api/events/host/my ──
router.get("/host/my", verifyToken, isHost, async (req, res) => {
  try {
    const events = await Event.find({ host: req.user._id }).sort({ createdAt: -1 });
    res.json(events);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/events/host/analytics ──
router.get("/host/analytics", verifyToken, isHost, async (req, res) => {
  try {
    const now = new Date();
    const stats = await Event.aggregate([
      { $match: { host: req.user._id } },
      { $group: { _id: null, totalEvents: { $sum: 1 }, totalViews: { $sum: "$views" }, totalLikes: { $sum: "$likes" }, totalBookmarks: { $sum: "$bookmarks" }, upcomingEvents: { $sum: { $cond: [{ $gte: ["$date", now] }, 1, 0] } }, pastEvents: { $sum: { $cond: [{ $lt: ["$date", now] }, 1, 0] } }, avgPrice: { $avg: "$price" } } }
    ]);
    const { Booking } = require("../models/index");
    const myEventIds = await Event.find({ host: req.user._id }).distinct("_id");
    const totalBookings = await Booking.countDocuments({ event: { $in: myEventIds } });
    res.json({ ...(stats[0] || {}), totalBookings });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/events/:id ──
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate("host", "name avatar bio email");

    if (!event) return res.status(404).json({ error: "Event not found." });

    const isLiked = req.user ? event.likedBy.includes(req.user._id) : false;
    const isBookmarked = req.user ? event.bookmarkedBy.includes(req.user._id) : false;

    res.json({ event, isLiked, isBookmarked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/events ──
router.post("/", verifyToken, isHost, async (req, res) => {
  try {
    const { title, description, city, country, address, lat, lng, date, endDate,
      image, price, currency, offer, category, tags, capacity } = req.body;

    if (!title || !description || !city || !date) {
      return res.status(400).json({ error: "title, description, city and date are required." });
    }

    const event = await Event.create({
      title, description,
      location: {
        city, country, address,
        coordinates: { type: "Point", coordinates: [parseFloat(lng) || 0, parseFloat(lat) || 0] },
      },
      date, endDate,
      image: image || "",
      price: parseFloat(price) || 0,
      currency: currency || "INR",
      offer, category, capacity,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(",").map(t => t.trim()) : []),
      host: req.user._id,
      hostName: req.user.name,
      hostEmail: req.user.email,
    });

    console.log(`Event created: "${event.title}" by ${req.user.email}`);
    res.status(201).json({ message: "Event created successfully.", event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/events/:id ──
router.put("/:id", verifyToken, isHost, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found." });
    if (event.host.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to edit this event." });
    }

    const { title, description, city, country, address, lat, lng, date, endDate,
      image, price, currency, offer, category, tags, capacity } = req.body;

    if (title) event.title = title;
    if (description) event.description = description;
    if (city) { event.location.city = city; event.location.country = country || ""; event.location.address = address || ""; }
    if (lat && lng) event.location.coordinates = { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] };
    if (date) event.date = date;
    if (endDate) event.endDate = endDate;
    if (image) event.image = image;
    if (price !== undefined) event.price = parseFloat(price);
    if (currency) event.currency = currency;
    if (offer !== undefined) event.offer = offer;
    if (category) event.category = category;
    if (capacity !== undefined) event.capacity = capacity;
    if (tags) event.tags = Array.isArray(tags) ? tags : tags.split(",").map(t => t.trim());

    await event.save();
    res.json({ message: "Event updated.", event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/events/:id ──
router.delete("/:id", verifyToken, isHost, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found." });
    if (event.host.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized." });
    }
    await event.deleteOne();
    res.json({ message: "Event deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/events/:id/like ──
router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found." });

    const alreadyLiked = event.likedBy.includes(req.user._id);
    if (alreadyLiked) {
      event.likedBy.pull(req.user._id);
      event.likes = Math.max(0, event.likes - 1);
    } else {
      event.likedBy.push(req.user._id);
      event.likes += 1;
    }
    await event.save();

    // Also update user's likedEvents
    const User = require("../models/User");
    if (alreadyLiked) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { likedEvents: event._id } });
    } else {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { likedEvents: event._id } });
    }

    res.json({ liked: !alreadyLiked, likes: event.likes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/events/:id/bookmark ──
router.post("/:id/bookmark", verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found." });

    const alreadyBookmarked = event.bookmarkedBy.includes(req.user._id);
    if (alreadyBookmarked) {
      event.bookmarkedBy.pull(req.user._id);
      event.bookmarks = Math.max(0, event.bookmarks - 1);
    } else {
      event.bookmarkedBy.push(req.user._id);
      event.bookmarks += 1;
    }
    await event.save();

    const User = require("../models/User");
    if (alreadyBookmarked) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { bookmarkedEvents: event._id } });
    } else {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { bookmarkedEvents: event._id } });
    }

    res.json({ bookmarked: !alreadyBookmarked, bookmarks: event.bookmarks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
