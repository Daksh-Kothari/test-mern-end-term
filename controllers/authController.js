const jwt = require('jsonwebtoken');
const { UserRepository } = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'devflow_jwt_secret_key_987654321', {
    expiresIn: '7d'
  });
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required fields.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email address already exists.' });
    }

    const user = await UserRepository.create({ name, email, password });
    const token = generateToken(user._id || user.id);

    const userResponse = UserRepository.sanitize(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: 'Server error during user registration', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. User not found.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Password incorrect.' });
    }

    const token = generateToken(user._id || user.id);
    const userResponse = UserRepository.sanitize(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during authentication', error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = UserRepository.sanitize(req.user);
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving profile', error: error.message });
  }
};

const logout = async (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

const getAllUsers = async (req, res) => {
  try {
    const users = await UserRepository.findAll();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  getAllUsers
};
