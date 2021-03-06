// ====================
// Modules
// ====================

let mongoose = require('mongoose');
let bcrypt = require('bcrypt');

// ====================
// Schema
// ====================

let Schema = mongoose.Schema;

let UserSchema = new Schema(
  {
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
  },
  {
    timestamps: true
  }
);

// ====================
// Before Actions
// ====================

const saltRounds = 10;

UserSchema.pre('save', function(next) { // can't use '=>' here!
  let user = this;

  if (user.isModified('password') || user.isNew) {
    bcrypt.hash(user.password, saltRounds, (err, hash) => {
      if (err) return next(err);

      user.password = hash;
      next();
    });
  } else return next();
});

// ====================
// Before Actions
// ====================

UserSchema.methods.checkPassword = function(password, done) { // can't use '=>' here!
  let user = this;

  bcrypt.compare(password, user.password, (err, isMatch) => {
    if (err) return done(err); 
    else done(null, isMatch);
  });
};

// ====================
// Export
// ====================

module.exports = mongoose.model('User', UserSchema);
