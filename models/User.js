const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  username: { type: String, required: true, unique: true },
  fullName: { type: String, required: true }, // Added full name
  password: { type: String, required: true },
  role: { type: String, enum: ["HOD", "PROFESSOR"], required: true },
  subjects: [{ // Added subjects array
    subjectName: { type: String, required: true },
    subjectId: { type: String, required: true }
  }]
});

// Hash password before saving
// UserSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

module.exports = mongoose.model("User", UserSchema);