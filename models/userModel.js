const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    require: true,
  },
  email: {
    type: String,
    require: true,
    unique: true,
  },

  password: {
    type: String,
    require: true,
  },
  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'address'
  },

  isAdmin: {
    type: Boolean,
    require: true,
    default: false,
  },
  blocked: {
    type: Boolean,
    require: true,
    default: false,
  },
  googleId: String,
  isGoogleAuth: { type: Boolean, default: false },
  balance: {
    type: Number,
    default: 0, // default balance is 0
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});

const userModel = new mongoose.model("userDetails", userSchema);

module.exports = userModel;
