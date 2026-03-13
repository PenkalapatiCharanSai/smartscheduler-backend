const express = require("express");
const router = express.Router();
const Schedule = require("../models/Schedule");

router.get("/professor-schedule/:username", async (req, res) => {
  try {
    const { username } = req.params;

    // Convert to lowercase for case-insensitive matching
    const schedules = await Schedule.find({
      professor: { $regex: new RegExp(`^${username}$`, "i") }
    });

    if (!schedules || schedules.length === 0) {
      return res.status(404).json({ message: "No schedules found for this professor." });
    }

    res.json(schedules);
  } catch (error) {
    console.error("Error fetching professor's schedule:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

module.exports = router;
