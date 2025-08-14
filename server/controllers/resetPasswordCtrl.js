const connection = require("../config/db");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// SEND RESET PASSWORD EMAIL
const resetPasswordTokenCtrl = async (req, res) => {
  try {
    const email = req.body.email;

    // Find user by email
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE username = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: `This Email: ${email} is not registered.`,
      });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const expires = Date.now() + 3600000; // 1 hour from now

    await connection.execute(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE username = ?",
      [token, expires, email]
    );

    const url = `http://localhost:8080/update-password/${token}`;
    await mailSender(
      email,
      "Password Reset",
      `Your link to reset the password: ${url}. Please click this link to continue.`
    );

    return res.json({
      success: true,
      message: "Email sent successfully. Check your inbox.",
    });
  } catch (error) {
    console.error("Error while sending password reset email:", error);
    return res.json({
      success: false,
      message: "Error sending password reset email.",
      error: error.message,
    });
  }
};

// RESET PASSWORD WITH TOKEN
const resetPasswordCtrl = async (req, res) => {
  try {
    const { password, confirmPassword, token } = req.body;

    if (password !== confirmPassword) {
      return res.json({
        success: false,
        message: "Password and Confirm Password do not match.",
      });
    }

    // Find user by token
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE reset_token = ?",
      [token]
    );

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: "Token is invalid.",
      });
    }

    const user = rows[0];

    // Check if token is expired
    if (user.reset_token_expires < Date.now()) {
      return res.status(403).json({
        success: false,
        message: "Token has expired. Please request a new one.",
      });
    }

    // Hash new password
    const encryptedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear token fields
    await connection.execute(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE reset_token = ?",
      [encryptedPassword, token]
    );

    res.json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("Error in resetPasswordCtrl:", error);
    res.json({
      success: false,
      message: "Error resetting password.",
      error: error.message,
    });
  }
};


module.exports = { resetPasswordTokenCtrl, resetPasswordCtrl };
