const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
  professor: { type: String, required: true },  // Professor Name
  subject: { type: String, required: true },  // Subject Name
  subjectId: { type: String, required: true },  // Auto-selected Subject ID
  groupNo: { type: Number, required: true },  // Selected Group No (SHOULD BE NUMBER)
  roomNo: { type: String, required: true },  // Auto-selected Room No
  startTime: { type: String, required: true },  // Class Start Time
  endTime: { type: String, required: true },  // Class End Time
  date: { type: String, required: true },  // Class Date
  day: { type: String, required: true },  // Auto-selected Day
}, { timestamps: true });

// Compound indexes for conflict checks
scheduleSchema.index({ date: 1, roomNo: 1, startTime: 1, endTime: 1 });
scheduleSchema.index({ date: 1, groupNo: 1, startTime: 1, endTime: 1 });


module.exports = mongoose.model("Schedule", scheduleSchema);
