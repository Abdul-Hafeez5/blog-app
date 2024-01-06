const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const UserSchema = new Schema({
  username: { type: String, unique: true, required: true, min: 3 },
  password: { type: String, required: true, min: 3 },
});

const User = model("User", UserSchema);

module.exports = User;
