// uploadRoutes.js
const express = require("express");
const multer = require("multer");
const { verifyToken } = require("../middleware/authMiddleware");
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/image", verifyToken, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image provided." });

    // Try Cloudinary if configured
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET &&
        CLOUDINARY_CLOUD_NAME !== "your_cloud_name") {
      const cloudinary = require("cloudinary").v2;
      cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET });
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: "wandergo" }, (err, result) => {
          if (err) reject(err); else resolve(result);
        });
        stream.end(req.file.buffer);
      });
      return res.json({ url: result.secure_url, publicId: result.public_id });
    }

    // Fallback: return a placeholder with the filename
    res.json({
      url: `https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80`,
      message: "Cloudinary not configured. Using placeholder image.",
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
