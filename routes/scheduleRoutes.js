const express = require("express");
const router = express.Router();
const Schedule = require("../models/Schedule");
const User = require("../models/User");

const groupToRoomMap = {
  "1": "3-002", "2": "3-003", "3": "3-004", "4": "3-007",
  "5": "3-008", "6": "3-102", "7": "3-103", "8": "3-104"
};

const validTimes = [
  { start: "09:20", end: "10:30" },
  { start: "10:30", end: "11:40" },
  { start: "11:50", end: "13:00" },
  { start: "13:50", end: "14:40" },
  { start: "14:40", end: "15:30" },
  { start: "15:30", end: "16:20" },
];

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

router.get("/professors", async (req, res) => {
  try {
    const professors = await User.find({ role: "PROFESSOR" }, "username fullName subjects");
    if (!professors.length) {
      return res.status(404).json({ message: "No professors found" });
    }
    console.log("Professors fetched:", professors);
    res.json(professors);
  } catch (error) {
    console.error("Error fetching professors:", error);
    res.status(500).json({ error: "Failed to fetch professors" });
  }
});

router.get("/group/:groupNo", async (req, res) => {
  try {
    const { groupNo } = req.params;
    if (!groupToRoomMap[groupNo]) {
      return res.status(400).json({ error: "Invalid group number" });
    }
    const schedules = await Schedule.find({ groupNo }).sort({ date: 1, startTime: 1 });
    console.log(`Schedules fetched for Group ${groupNo}:`, schedules);
    res.json(schedules);
  } catch (error) {
    console.error("Error fetching group schedules:", error);
    res.status(500).json({ error: "Failed to fetch group schedules" });
  }
});

router.post("/assign", async (req, res) => {
  try {
    const { professor, subject, groupNo, startTime, endTime, date } = req.body;

    if (!professor || !subject || !groupNo || !startTime || !endTime || !date) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const isValidTime = validTimes.some(t => t.start === startTime && t.end === endTime);
    if (!isValidTime) {
      return res.status(400).json({ error: `Invalid time slot: ${startTime}-${endTime}` });
    }

    const roomNo = groupToRoomMap[groupNo];
    if (!roomNo) {
      return res.status(400).json({ error: `Invalid group number: ${groupNo}` });
    }

    const professorData = await User.findOne({ username: professor });
    if (!professorData) {
      return res.status(404).json({ error: `Professor not found: ${professor}` });
    }

    const subjectData = professorData.subjects.find(s => s.subjectName === subject);
    if (!subjectData) {
      return res.status(400).json({ error: `Subject '${subject}' not assigned to professor ${professor}` });
    }
    const subjectId = subjectData.subjectId;

    const startDate = new Date(date);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    const day = startDate.toLocaleString('en-us', { weekday: 'long' });

    // Check if the subject is already assigned to this group by a different professor
    const existingSubjectAssignment = await Schedule.findOne({
      groupNo,
      subject,
      professor: { $ne: professor } // Exclude the current professor
    });

    if (existingSubjectAssignment) {
      return res.status(400).json({
        error: `Subject '${subject}' is already assigned to Group ${groupNo} by another professor`,
        aiMessage: `Duplicate Subject Assignment: ${existingSubjectAssignment.professor} has already been assigned to teach ${subject} for Group ${groupNo} on ${existingSubjectAssignment.date} from ${existingSubjectAssignment.startTime} to ${existingSubjectAssignment.endTime}.`
      });
    }

    const schedules = [];
    const newStartMinutes = timeToMinutes(startTime);
    const newEndMinutes = timeToMinutes(endTime);

    for (let i = 0; i < 4; i++) {
      const scheduleDate = new Date(startDate);
      scheduleDate.setDate(startDate.getDate() + i * 7);
      const dateStr = scheduleDate.toISOString().split("T")[0];

      // Check daily limit (max 3 classes per day per professor)
      const dailyClasses = await Schedule.countDocuments({ professor, date: dateStr });
      if (dailyClasses >= 3) {
        return res.status(400).json({
          error: `Professor ${professor} has reached daily limit of 3 classes on ${dateStr}`
        });
      }

      // Check for conflicts (room or group already booked)
      const existingSchedules = await Schedule.find({
        date: dateStr,
        $or: [{ roomNo }, { groupNo }]
      });

      let hasConflict = false;
      for (const existing of existingSchedules) {
        const existingStartMinutes = timeToMinutes(existing.startTime);
        const existingEndMinutes = timeToMinutes(existing.endTime);

        if (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes) {
          hasConflict = true;
          return res.status(400).json({
            error: `Conflict detected on ${dateStr} with ${existing.professor}`,
            aiMessage: `Conflict: ${existing.professor} is already scheduled in ${existing.roomNo} for Group ${existing.groupNo} from ${existing.startTime} to ${existing.endTime}.`
          });
        }
      }

      schedules.push({
        professor,
        subject,
        subjectId,
        groupNo,
        roomNo,
        startTime,
        endTime,
        date: dateStr,
        day,
        year: "3rd Year"
      });
    }

    const savedSchedules = await Schedule.insertMany(schedules);
    console.log(`Saved schedules for Group ${groupNo}:`, savedSchedules);
    res.status(200).json({
      message: "Schedules assigned successfully for one month",
      schedules: savedSchedules,
      aiMessage: `${professor} has been scheduled for ${subject} every ${day} for the next month.`
    });
  } catch (error) {
    console.error("Server Error in /assign:", error);
    res.status(500).json({ error: "Failed to assign schedules" });
  }
});

// Fetch schedules for a professor
router.get("/view/:professor", async (req, res) => {
  try {
    const { professor } = req.params;
    const schedules = await Schedule.find({ professor }).sort({ date: 1, startTime: 1 });
    if (!schedules || schedules.length === 0) {
      return res.status(404).json({ message: `No schedules assigned for professor ${professor}` });
    }
    console.log(`Schedules fetched for Professor ${professor}:`, schedules);
    res.json(schedules);
  } catch (error) {
    console.error("Server Error in /view:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update a single schedule
router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { professor, subject, groupNo, startTime, endTime, date } = req.body;

    if (!professor || !subject || !groupNo || !startTime || !endTime || !date) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const isValidTime = validTimes.some(t => t.start === startTime && t.end === endTime);
    if (!isValidTime) {
      return res.status(400).json({ error: "Invalid time slot" });
    }

    const roomNo = groupToRoomMap[groupNo];
    if (!roomNo) {
      return res.status(400).json({ error: "Invalid group number" });
    }

    const professorData = await User.findOne({ username: professor });
    if (!professorData) {
      return res.status(404).json({ error: "Professor not found" });
    }

    const subjectData = professorData.subjects.find(s => s.subjectName === subject);
    if (!subjectData) {
      return res.status(400).json({ error: "Subject not assigned to this professor" });
    }
    const subjectId = subjectData.subjectId;

    const scheduleDate = new Date(date);
    const day = scheduleDate.toLocaleString('en-us', { weekday: 'long' });

    const updatedData = {
      professor,
      subject,
      subjectId,
      groupNo,
      roomNo,
      startTime,
      endTime,
      date: scheduleDate.toISOString().split("T")[0],
      day,
      year: "3rd Year"
    };

    const schedule = await Schedule.findByIdAndUpdate(id, updatedData, { new: true });
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    console.log("Schedule updated:", schedule);
    res.json({ message: "Schedule updated successfully", schedule });
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(500).json({ error: "Failed to update schedule" });
  }
});

// Delete a single schedule
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await Schedule.findByIdAndDelete(id);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    console.log("Schedule deleted:", schedule);
    res.json({ message: "Schedule deleted successfully" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

// Updated endpoint for analytics data
router.get("/analytics", async (req, res) => {
  try {
    // 1. Classes per Professor
    const classesPerProfessor = await Schedule.aggregate([
      { $group: { _id: "$professor", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // 2. Classes per Group
    const classesPerGroup = await Schedule.aggregate([
      { $group: { _id: "$groupNo", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // 3. Classes per Day
    const classesPerDay = await Schedule.aggregate([
      { $group: { _id: "$day", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // 4. Subject Distribution
    const subjectDistribution = await Schedule.aggregate([
      { $group: { _id: "$subject", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // 5. Classes per Professor per Group (New Metric)
    const classesPerProfessorPerGroup = await Schedule.aggregate([
      { $group: { _id: { professor: "$professor", groupNo: "$groupNo" }, count: { $sum: 1 } } },
      { $sort: { "_id.professor": 1, "_id.groupNo": 1 } }
    ]);

    // Fetch professor full names to display in the chart
    const professors = await User.find({ role: "PROFESSOR" }, "username fullName");
    const professorNameMap = professors.reduce((map, prof) => {
      map[prof.username] = prof.fullName;
      return map;
    }, {});

    // Format the data for the frontend
    const analyticsData = {
      classesPerProfessor: classesPerProfessor.map(item => ({
        professor: professorNameMap[item._id] || item._id,
        count: item.count
      })),
      classesPerGroup: classesPerGroup.map(item => ({
        group: item._id,
        count: item.count
      })),
      classesPerDay: classesPerDay.map(item => ({
        day: item._id,
        count: item.count
      })),
      subjectDistribution: subjectDistribution.map(item => ({
        subject: item._id,
        count: item.count
      })),
      classesPerProfessorPerGroup: classesPerProfessorPerGroup.map(item => ({
        professor: professorNameMap[item._id.professor] || item._id.professor,
        groupNo: item._id.groupNo,
        count: item.count
      }))
    };

    res.json(analyticsData);
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    res.status(500).json({ error: "Failed to fetch analytics data" });
  }
});

module.exports = router;