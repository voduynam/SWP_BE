const mongoose = require('mongoose');

const userRoleSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    ref: 'AppUser'
  },
  role_id: {
    type: String,
    required: true,
    ref: 'Role'
  }
}, {
  timestamps: false
});

userRoleSchema.index({ user_id: 1, role_id: 1 }, { unique: true });

module.exports = mongoose.model('UserRole', userRoleSchema, 'user_role');
