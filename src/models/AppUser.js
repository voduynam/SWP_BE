const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const appUserSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  org_unit_id: {
    type: String,
    required: true,
    ref: 'OrgUnit'
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false,
    minlength: 6
  },
  full_name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  _id: false,
  timestamps: false
});

// Hash password before saving
appUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
appUserSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('AppUser', appUserSchema, 'app_user');
