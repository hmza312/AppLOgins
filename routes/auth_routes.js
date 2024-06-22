import express from "express";
import {
  loginController,
  registerController,
  updatePassword,
  authenticatedUser,
  logout,
  refreshUser,
} from "../controllers/auth_controller.js";
import passport from "passport";
import axios from "axios";
import db from "../config/db.js";
import jwt from "jsonwebtoken";
import {
  comparePassword,
  hashPassword,
  validateUser,
} from "../helpers/auth_helper.js";
import env from "dotenv";
env.config();
//router objectim
const router = express.Router();

//routing
//REGISTER || METHOD POST

router.get("/", function (req, res) {
  res.render("pages/index.ejs"); // load the index.ejs file
});
router.get("/logout", logout);
router.get("/profile", async function (req, res) {
  // console.log(req.user);
  const { displayName, id, email } = req.user;
  console.log(displayName, id, email);
  try {
    const [existingUser] = await db.execute(
      "SELECT * FROM users WHERE username = ?",
      [displayName]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Username is already taken." });
    }

    // Hash the password
    const hashedPassword = "";
    const emailForServer = email === undefined ? "" : email;

    // Insert the new user into the database
    const user = await db.execute(
      "INSERT INTO users (email, password,username,facebookId) VALUES (?, ?,?,?)",
      [emailForServer, hashedPassword, displayName, id || ""]
    );
    const token = jwt.sign({ _id: user[0].insertId }, process.env.JWT_SECRET, {
      expiresIn: "8d",
    });
    res.render("pages/profile.ejs", {
      user: req.user, // get the user out of session and pass to template
    });
    // res.status(201).json({
    //   success: true,
    //   token,
    //   message: "Registration successful.",
    // });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }

  //   axios.get(req.user.media).then(function (response) {
  //   const data = response.data.data;
  //   let user = req.user;
  //   user.images = data.map((img) => img.images);
  //   res.send(user);
  // });
  // res.status(200).send(req.user);
});
router.get("/success", async function (req, res) {
  // console.log(req.user._json);
  const { name, email } = req.user._json;
  const { id } = req.user;
  // console.log(name, id, email);
  try {
    const [existingUser] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Email is already taken." });
    }

    // Hash the password
    const hashedPassword = "";
    const emailForServer = email === undefined ? "" : email;

    // Insert the new user into the database
    const user = await db.execute(
      "INSERT INTO users (email, password,username,googleId) VALUES (?, ?,?,?)",
      [emailForServer, hashedPassword, name, id || ""]
    );
    const token = jwt.sign({ _id: user[0].insertId }, process.env.JWT_SECRET, {
      expiresIn: "8d",
    });

    // res.status(201).json({
    //   success: true,
    //   token,
    //   message: "Registration successful.",
    // });
    res.render("pages/success.ejs", {
      user: req.user, // get the user out of session and pass to template
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }

  // res.status(200).send(req.user);
});

router.get("/error", function (req, res) {
  res.render("pages/error.ejs");
});

router.get(
  "/facebook",
  passport.authenticate("facebook", {
    scope: ["public_profile", "email"],
  })
);

router.get(
  "/facebook/callback",

  passport.authenticate("facebook", {
    successRedirect: "/api/v1/auth/profile",
    failureRedirect: "/error",
  })
);
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/api/v1/auth/error" }),
  function (req, res) {
    // Successful authentication, redirect success.
    res.redirect("/api/v1/auth/success");
  }
);
router.get("/instagram", (req, res) => {
  console.log(process.env.IMSTA_CALLBACK_URL);
  res.redirect(
    `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTA_CLIENT_ID}&redirect_uri=${process.env.IMSTA_CALLBACK_URL}&scope=user_profile,user_media&response_type=code`
  );
});

// router.get(
//   "/instagram/callback",
//   passport.authenticate("instagram", {
//     successRedirect: "/api/v1/auth/profile",
//     failure: "/",
//   })
// );
router.get("/instagram/callback", async (req, res) => {
  const code = req.query.code;

  try {
    // Exchange code for access token
    const { data } = await axios.post(
      "https://api.instagram.com/oauth/access_token",
      querystring.stringify({
        client_id: process.env.INSTA_CLIENT_ID,
        client_secret: process.env.INSTA_CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: "http://localhost:4000",
        code: code,
      })
    );

    // Handle data - data.access_token contains the access token
    console.log(data);

    // Redirect or respond with user data
    res.send("Logged in with Instagram!");
  } catch (error) {
    console.error("Error exchanging code for access token:", error.message);
    res.status(500).json({ error: "Failed to authenticate with Instagram" });
  }
});
router.post("/register", registerController);
router.post("/authenticatedUser", authenticatedUser);
router.post("/refreshUser", refreshUser);

router.post("/login", loginController);
router.post("/update-password", updatePassword);

export default router;
