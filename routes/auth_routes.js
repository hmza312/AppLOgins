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
//router object
const router = express.Router();

//routing
//REGISTER || METHOD POST

router.get("/", function (req, res) {
  res.render("pages/index.ejs"); // load the index.ejs file
});
router.get("/logout", logout);
router.get("/profile", function (req, res) {
  // res.render("pages/profile.ejs", {
  //   user: req.user, // get the user out of session and pass to template
  // });
  res.status(200).send(req.user);
});
router.get("/success", function (req, res) {
  res.render("pages/success.ejs", {
    user: req.user, // get the user out of session and pass to template
  });
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
router.get("/instagram", passport.authenticate("instagram"));
router.get(
  "/instagram/callback",
  passport.authenticate("instagram", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/");
  }
);
router.post("/register", registerController);
router.post("/authenticatedUser", authenticatedUser);
router.post("/refreshUser", refreshUser);

router.post("/login", loginController);
router.post("/update-password", updatePassword);

export default router;
