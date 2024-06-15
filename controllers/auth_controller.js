import db from "../config/db.js";
import jwt from "jsonwebtoken";
import {
  comparePassword,
  hashPassword,
  validateUser,
} from "../helpers/auth_helper.js";
import env from "dotenv";
env.config();
import nodemailer from "nodemailer";

export const registerController = async (req, res) => {
  console.log(req.body);
  try {
    let { email, password, username } = req.body;
    const { error } = validateUser(req.body);
    if (error) return res.status(400).send(error.details[0].message);
    // Check if the username is already taken
    const [existingUser] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "email is already taken." });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Insert the new user into the database
    const user = await db.execute(
      "INSERT INTO users (email, password,username) VALUES (?, ?,?)",
      [email, hashedPassword, username || ""]
    );
    const token = jwt.sign({ _id: user[0].insertId }, process.env.JWT_SECRET, {
      expiresIn: "8d",
    });

    res.status(201).json({
      success: true,
      token,
      message: "Registration successful.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//POST LOGIN
export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);
    if (!email || !password) {
      return res.status(404).send({
        success: false,
        message: "Invalid email or password",
      });
    }
    // Check if the user exists
    const [user] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    console.log("User ", user[0]);
    if (!user || user.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Verify the password
    const passwordMatch = await comparePassword(password, user[0].password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const token = jwt.sign({ _id: user[0].id }, process.env.JWT_SECRET, {
      expiresIn: "8d",
    });
    console.log(token);
    req.session.user = token;
    console.log(req.session.user);
    req.session.save();
    res.status(200).send({
      token,
      success: true,
      message: "login successfully",
      user: {
        email: user[0].email,
        username: user[0].username,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }

  //token
};
// Update the password
export const updatePassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the user exists
    const [user] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (!user || user.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify the current password
    // const passwordMatch = await bcrypt.compare(currentPassword, user[0].password);
    // if (!passwordMatch) {
    //     return res.status(401).json({ message: 'Incorrect current password.' });
    // }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update the user's password in the database with the new password
    await db.execute("UPDATE users SET password = ? WHERE email = ?", [
      hashedPassword,
      email,
    ]);

    // Return a success message
    res
      .status(200)
      .json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
export const logout = async (req, res) => {
  const token = req.session.user;
  console.log(token);
  req.session.destroy();
  res.send("Your are logged out ");
};

export const authenticatedUser = async (req, res) => {
  const token = req.session.user;
  console.log(token);
  try {
    if (!token) {
      return res.status(401).send("Unauthorized request");
    }
    // let tokenSplit = token.split(" ")[1];
    let payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload) {
      return res.status(401).send("Unauthorized request");
    }
    const [user] = await db.execute("SELECT * FROM users WHERE id = ?", [
      payload._id,
    ]);
    res.status(200).send({
      user,
      success: true,
      message: "User fetch successfully",
    });
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }
};
export const refreshUser = async (req, res) => {
  const { _id } = req.body;
  try {
    const [user] = await db.execute("SELECT * FROM users WHERE id = ?", [_id]);
    const token = jwt.sign({ _id: user[0].id }, process.env.JWT_SECRET, {
      expiresIn: "8d",
    });
    console.log(token);
    req.session.user = token;
    console.log(req.session.user);
    req.session.save();
    res.status(200).send({
      token,
      success: true,
      message: "Token Refresh successfully",
    });
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }
};
