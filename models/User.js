const mongoose = require('mongoose');
const { isMongoConnected, memoryDb } = require('../config/db');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  dailyStudyGoalMinutes: { type: Number, default: 60 }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const UserMongo = mongoose.model('User', userSchema);

class UserRepository {
  static async findByEmail(email) {
    const normalizedEmail = email.toLowerCase().trim();
    if (isMongoConnected()) {
      return await UserMongo.findOne({ email: normalizedEmail });
    }
    const collection = memoryDb.getCollection('users');
    const doc = collection.find(u => u.email === normalizedEmail);
    if (!doc) return null;
    return this.wrapDoc(doc);
  }

  static async findById(id) {
    if (isMongoConnected()) {
      return await UserMongo.findById(id);
    }
    const collection = memoryDb.getCollection('users');
    const doc = collection.find(u => u._id === id || u.id === id);
    if (!doc) return null;
    return this.wrapDoc(doc);
  }

  static async create({ name, email, password, avatar = '', role = 'user', dailyStudyGoalMinutes = 60 }) {
    const normalizedEmail = email.toLowerCase().trim();
    if (isMongoConnected()) {
      const user = new UserMongo({
        name,
        email: normalizedEmail,
        password,
        avatar,
        role,
        dailyStudyGoalMinutes
      });
      await user.save();
      return user;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const collection = memoryDb.getCollection('users');
    const id = memoryDb.generateId();
    const now = new Date();
    const newUser = {
      _id: id,
      id,
      name,
      email: normalizedEmail,
      password: hashedPassword,
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      role,
      dailyStudyGoalMinutes,
      createdAt: now,
      updatedAt: now
    };
    collection.push(newUser);
    memoryDb.save();
    return this.wrapDoc(newUser);
  }

  static async findAll() {
    if (isMongoConnected()) {
      return await UserMongo.find().select('-password');
    }
    const collection = memoryDb.getCollection('users');
    return collection.map(u => this.sanitize(u));
  }

  static sanitize(user) {
    if (!user) return null;
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.password;
    return {
      ...obj,
      _id: obj._id || obj.id,
      id: obj._id || obj.id
    };
  }

  static wrapDoc(doc) {
    return {
      _id: doc._id || doc.id,
      id: doc._id || doc.id,
      name: doc.name,
      email: doc.email,
      password: doc.password,
      avatar: doc.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(doc.name)}`,
      role: doc.role,
      dailyStudyGoalMinutes: doc.dailyStudyGoalMinutes || 60,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      comparePassword: async (candidatePassword) => {
        return await bcrypt.compare(candidatePassword, doc.password);
      }
    };
  }
}

module.exports = { UserMongo, UserRepository };
