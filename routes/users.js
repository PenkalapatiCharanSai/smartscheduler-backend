const express = require("express");
const router = express.Router();
const User = require("../models/User"); // Path to your User model
const jwt = require("jsonwebtoken");

// Middleware to verify HOD role
const verifyHOD = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Ensure JWT_SECRET is set in .env
    if (decoded.role !== "HOD") {
      return res.status(403).json({ message: "Only HOD can register professors" });
    }
    req.user = decoded; // Attach decoded user to request
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Register Professor Route
router.post("/register-professor", verifyHOD, async (req, res) => {
  const { user_id, username, fullName, password, subjects } = req.body;

  try {
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Create new professor
    const professor = new User({
      user_id,
      username,
      fullName,
      password,
      role: "PROFESSOR", // Hardcoded to PROFESSOR
      subjects
    });

    await professor.save();
    res.status(201).json({ message: "Professor registered successfully" });
  } catch (error) {
    console.error("Error registering professor:", error);
    res.status(500).json({ message: "Server error while registering professor" });
  }
});

module.exports = router;