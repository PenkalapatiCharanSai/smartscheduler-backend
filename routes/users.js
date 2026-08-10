const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Middleware to verify HOD role
const verifyHOD = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    if (decoded.role !== "HOD") {
      return res.status(403).json({ message: "Only HOD can perform this action" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// GET all professors
router.get("/professors", async (req, res) => {
  try {
    const professors = await User.find(
      { role: { $regex: /^professor$/i } },
      "user_id username fullName subjects role"
    ).sort({ user_id: 1, username: 1 });
    res.json(professors);
  } catch (error) {
    console.error("Error fetching professors:", error);
    res.status(500).json({ message: "Server error while fetching professors" });
  }
});

// GET all users
router.get("/all", async (req, res) => {
  try {
    const users = await User.find({}, "user_id username fullName subjects role").sort({ user_id: 1, username: 1 });
    res.json(users);
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ message: "Server error while fetching users" });
  }
});

// Register Professor Route
router.post("/register-professor", verifyHOD, async (req, res) => {
  const { user_id, username, fullName, password, subjects } = req.body;

  try {
    const existingUser = await User.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, "i") } });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const professor = new User({
      user_id,
      username,
      fullName,
      password,
      role: "PROFESSOR",
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