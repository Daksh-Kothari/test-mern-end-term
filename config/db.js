const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Directory for local file storage if MongoDB is offline
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'devflow_store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let isMongoConnected = false;

// Embedded Persistent JSON Database Store for zero-dependency execution
class MemoryStore {
  constructor() {
    this.data = {
      users: [],
      projects: [],
      projectmembers: [],
      tasks: [],
      comments: [],
      attachments: [],
      activities: [],
      aigenerations: []
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = { ...this.data, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('Could not read devflow_store.json, initializing clean store.');
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write to devflow_store.json:', e);
    }
  }

  generateId() {
    return crypto.randomBytes(12).toString('hex');
  }

  getCollection(name) {
    const collectionKey = name.toLowerCase();
    if (!this.data[collectionKey]) {
      this.data[collectionKey] = [];
    }
    return this.data[collectionKey];
  }

  setCollection(name, items) {
    const collectionKey = name.toLowerCase();
    this.data[collectionKey] = items;
    this.save();
  }
}

const memoryDb = new MemoryStore();

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devflow';
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000
    });
    isMongoConnected = true;
    console.log(`[Database] Connected to MongoDB at ${mongoUri}`);
  } catch (err) {
    isMongoConnected = false;
    console.warn(`[Database] MongoDB not detected (${err.message}). Using DevFlow Embedded Persistent Data Engine.`);
  }
};

module.exports = {
  connectDB,
  isMongoConnected: () => isMongoConnected,
  memoryDb
};
