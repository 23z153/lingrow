const mongoose = require('mongoose');
const badgeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
  }
);
module.exports = mongoose.model('Badge', badgeSchema);
