const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${err.stack || err.message}`);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: messages.join(". ") });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({ error: `${field} already exists.` });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ error: "Invalid ID format." });
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal server error.",
  });
};

module.exports = errorHandler;
