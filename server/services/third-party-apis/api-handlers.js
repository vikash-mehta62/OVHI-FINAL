const connection = require("../../config/db");
const logAudit = require("../../utils/logAudit");
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const joi = require('joi');
const registerUser = async (req, res) => {
    try {
      const { username, password } = req.body;
  
      // Check if user already exists
      const [existingUsers] = await connection.query(
        'SELECT user_id FROM users WHERE username = ? LIMIT 1',
        [username]
      );
  
      if (existingUsers.length > 0) {
        return res.status(409).json({ message: 'User already exists' });
      }
  
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Insert into users table
      const insertUserSQL = `
        INSERT INTO users (username, password, fk_roleid)
        VALUES (?, ?, 20)
      `;
      const [userResult] = await connection.query(insertUserSQL, [username, hashedPassword]); 
      const userId = userResult.insertId;
  
      // Generate client credentials
      const client_id = `client_${Date.now()}`;
      const client_secret = crypto.randomBytes(32).toString('hex');
  
      // Insert into oauth_clients table
      const insertClientSQL = `
        INSERT INTO oauth_clients (user_id, client_id, client_secret)
        VALUES (?, ?, ?)
      `;
      await connection.query(insertClientSQL, [userId, client_id, client_secret]);
      await logAudit(req, 'CREATE', 'USER', userId, `API CLIENT Registered: ${userId} - ${username}`);
      return res.status(201).json({
        message: 'User registered successfully',
        note: 'Please Store the client_id and client_secret And use it for generating access token',
        clientId:client_id,
        clientSecret:client_secret
      });
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({ message: 'Server error during registration' });
    }
};
const generateAccessToken = async (req, res) => {
    const { clientId, clientSecret } = req.body;
  
    if (!clientId || !clientSecret) {
      return res.status(400).json({ message: 'client_id, client_secret are required' });
    }
  
    try {
      // 1. Validate client credentials and user match
      const [clients] = await connection.query(
        'SELECT * FROM oauth_clients WHERE client_id = ? AND client_secret = ? LIMIT 1',
        [clientId, clientSecret]
      );
  
      if (clients.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials or mismatched user' });
      }
  
      // 2. Optional: validate user exists
      const [users] = await connection.query(
        'SELECT username FROM users WHERE user_id = ? LIMIT 1',
        [clients[0].user_id]
      );
      if (users.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // 3. Generate JWT token
      const payload = {
        clientId:clientId,
        user_id:clients[0].user_id
      };
  
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '1h'
      });
  
      // 4. Optional: store last access token + update timestamp
      await connection.query(
        'UPDATE oauth_clients SET access_token = ? WHERE client_id = ?',
        [token, clientId]
      );
      await logAudit(req, 'UPDATE', 'ACCESS_TOKEN', clients[0].user_id, `GENERATED NEW ACCESS TOKEN: ${clients[0].user_id} - ${users[0].username}`);
      return res.status(200).json({
        access_token: token,
        token_type: 'Bearer',
        expires_in: 3600
      });
    } catch (err) {
      console.error('Token generation error:', err);
      return res.status(500).json({ message: 'Server error while generating token' });
    }
  };
const getpatientDemographics = async (req, res) => {
    const requiredSchema = joi.object({
      patient_fname:joi.string().min(3).required(),
      patient_lname:joi.string().min(3).required(),
      patient_dob:joi.string().pattern(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/).required().messages({
        'string.pattern.base': 'Invalid date format. Please use YYYY-MM-DD.'
      })
    })
    const { error, value } = requiredSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
    
      return res.status(400).json({ errors });
    }
    let sql = `SELECT * FROM user_profiles WHERE firstname LIKE "%${value.patient_fname}%" AND lastname LIKE "%${value.patient_lname}%" AND dob = "${value.patient_dob}" LIMIT 1`;
    console.log(sql)
    try {
      const [demographics] = await connection.query(sql);
      // console.log(demographics)
      if (demographics.length == 0) {
        return res.status(404).json({ message: 'Patient demographics not found' });
      }
      return res.status(200).json({ demographics });
    } catch (err) {
      console.error('Error fetching patient demographics:', err);
      return res.status(500).json({ message: 'Server error while fetching patient demographics' });
    }
  };
  module.exports = {
    registerUser,
    generateAccessToken,
    getpatientDemographics
  } 