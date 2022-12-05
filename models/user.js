const mongoose = require("mongoose");

let userSchema = new mongoose.Schema(
  {
    username: String,
    email: String,
    dateCrawled: Date,
  },
  { versionKey: false }
);

let User = mongoose.model("User", userSchema);

module.exports = User;
