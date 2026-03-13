const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs"); // For password hashing (optional)
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Login Route
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if user exists in DB
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: "Invalid username or password!" });
        }

        // Compare passwords (Note: Replace with bcrypt.compare in production)
        if (user.password !== password) {
            return res.status(401).json({ message: "Invalid username or password!" });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { user_id: user.user_id, username: user.username, role: user.role },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "1h" } // Token expires in 1 hour
        );

        // Return token, role, username, and fullName
        res.status(200).json({
            token,
            role: user.role,
            username: user.username,
            fullName: user.fullName // Include fullName in the response
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error!" });
    }
});

module.exports = router;
