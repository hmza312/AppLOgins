import cors from "cors";
import env from "dotenv";
import express from "express";
import authRoutes from "./routes/auth_routes.js";
import passport from "passport";
import FacebookStrategy from "passport-facebook";
import GoogleStrategy from "passport-google-oauth";
import InstagramStrategy from "passport-instagram";
import session from "express-session";
import cookieParser from "cookie-parser";
import request from "request";
import axios from "axios";
import imageToBase64 from "image-to-base64";
import TikTokStrategy from "passport-tiktok-auth";
import pkceChallenge from "pkce-challenge";
import ig from "instagram-scraping";
import { requireSignIn } from "./middlewares/auth_middleware.js";
// const InstagramStrategy = Instagram.Strategy;
const GoogleStrategys = GoogleStrategy.OAuth2Strategy;
const TikTokStrategys = TikTokStrategy.Strategy;
env.config();
const redirectURI = "http://localhost:4000/auth//tiktok/callback";
const app = express();
app.set("view engine", "ejs");
const allowedOrigins = ["http://localhost:3001", "http://localhost:3000"];

app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      // allow requests with no origin
      // (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not " +
          "allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);
app.use(cookieParser());
const APP_ID = process.env.FACEBOOK_CLIENT_ID;
const APP_SECRET = process.env.FACEBOOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.FACEBOOK_CALLBACK_URL;
const REDIRECT_URI_TITOK = process.env.TIK_CALLBACK_URL;

const PORT = process.env.PORT;
app.use(express.json());

//routes

app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: "SECRET",

    cookie: { maxAge: 259200000, httpOnly: true },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use("/api/v1/auth", authRoutes);

// Default Route
app.get("/", async (req, res) => {
  // const sessionData = req.session;
  // console.log(sessionData);
  res.render("pages/index.ejs");
});
passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
    },
    function (accessToken, refreshToken, profile, done) {
      // console.log(accessToken, refreshToken, profile);
      // req.session.user = accessToken;
      return done(null, profile);
    }
  )
);
passport.use(
  new InstagramStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: "http://localhost:4000",
    },
    (accessToken, refreshToken, profile, done) => {
      // console.log(accessToken, refreshToken, profile);
      return done(null, profile);
    }
  )
);
passport.use(
  new GoogleStrategys(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:4000/api/v1/auth/google/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      // console.log(accessToken, refreshToken, profile);
      // console.log(profile);
      return done(null, profile);
    }
  )
);

// TikTok app credentials
const TIKTOK_CLIENT_ID = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

// Generate a PKCE challenge and verifier
let challenge;
const generatePKCE = () => {
  const { code_verifier, code_challenge } = pkceChallenge();
  challenge = { code_verifier, code_challenge };
};
generatePKCE();

// Passport configuration
passport.use(
  new TikTokStrategys(
    {
      clientID: TIKTOK_CLIENT_ID,
      clientSecret: TIKTOK_CLIENT_SECRET,
      callbackURL:
        "https://applogins-production.up.railway.app/auth/tiktok/callback",
      scope: ["user.info.basic"],
      state: true,

      codeChallengeMethod: "S256",
      codeChallenge: challenge.code_challenge,
    },
    async function (accessToken, refreshToken, profile, done) {
      // Save or use the user profile here
      const user = await db.execute("INSERT INTO token (token) VALUES (?)", [
        accessToken || "",
      ]);
      console.log(accessToken);
      return done(null, profile);
    }
  )
);
app.get("/auth/tiktok", (req, res, next) => {
  generatePKCE(); // Generate a new PKCE challenge for each login attempt
  passport.authenticate("tiktok", {
    codeChallenge: challenge.code_challenge,
    codeChallengeMethod: "S256",
  })(req, res, next);
});
app.get("/success", async function (req, res) {
  console.log(req.data);
  // const { name, email } = req.user._json;
  // const { id } = req.user;
  // // console.log(name, id, email);
  try {
    res.send(`<h1>Welcome!</h1><a href="/auth/tiktok">Login with TikTok</a>`);
    //   const [existingUser] = await db.execute(
    //     "SELECT * FROM users WHERE email = ?",
    //     [email]
    //   );
    //   if (existingUser.length > 0) {
    //     return res.status(400).json({ message: "Email is already taken." });
    //   }
    //   // Hash the password
    //   const hashedPassword = "";
    //   const emailForServer = email === undefined ? "" : email;
    //   // Insert the new user into the database
    //   const user = await db.execute(
    //     "INSERT INTO users (email, password,username,googleId) VALUES (?, ?,?,?)",
    //     [emailForServer, hashedPassword, name, id || ""]
    //   );
    //   const token = jwt.sign({ _id: user[0].insertId }, process.env.JWT_SECRET, {
    //     expiresIn: "8d",
    //   });
    //   // res.status(201).json({
    //   //   success: true,
    //   //   token,
    //   //   message: "Registration successful.",
    //   // });
    // res.render("pages/success.ejs", {
    //   user: req.user, // get the user out of session and pass to template
    // });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }

  // res.status(200).send(req.user);
});
app.get(
  "/auth/tiktok/callback",
  passport.authenticate("tiktok", {
    failureRedirect: "http://localhost:4000/success",
  }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("http://localhost:4000/success");
  }
);
// app.get("/oauth", (req, res) => {
//   const csrfState = Math.random().toString(36).substring(2);
//   res.cookie("csrfState", csrfState, { maxAge: 60000 });
//   let url = "https://www.tiktok.com/v2/auth/authorize/";
//   // the following params need to be in `application/x-www-form-urlencoded` format.
//   url += `?client_key=${process.env.TIKTOK_CLIENT_KEY}`;
//   url += "&scope=user.info.basic,user.info.profile,user.info.stats,video.list";
//   url += "&response_type=code";
//   url += `&redirect_uri=${process.env.TIK_CALLBACK_URL}`;
//   url += "&state=" + csrfState;
//   res.json({ url: url });
// });
const getBase64 = async (link) => {
  const base64 = await imageToBase64(link);
  return `data:image/jpeg;base64,${base64}`;
};
const getdata = async (items) => {
  var videosData = [];
  for (let i = 0; i < items.length; i++) {
    console.log(items[i].id.videoId);
    const url1 = `https://www.googleapis.com/youtube/v3/videos?key=AIzaSyB-TpUlPx2ZMcmfqIC-9MgZL088W5Xcfts&type=video&&part=contentDetails,snippet&id=${items[i].id.videoId}`;
    const response1 = await axios.get(url1);
    // console.log(`https://www.youtube.com/watch?v=${item.id.videoId}`);
    const obj = {
      url: `https://www.youtube.com/watch?v=${items[i].id.videoId}`,
      snippet: response1.data.items,
    };
    // console.log(obj);
    videosData.push(obj);
  }
  return videosData;
};
// requireSignIn
app.get("/get-videos", async (req, res) => {
  try {
    const query = req.query.search;
    const url = `  https://www.googleapis.com/youtube/v3/search?key=AIzaSyB-TpUlPx2ZMcmfqIC-9MgZL088W5Xcfts&type=video&&part=snippet&q=${query}`;
    const response = await axios.get(url);
    const videosData = await getdata(response.data.items);
    // console.log(videosData);
    res.send({
      data: videosData,
    });
  } catch (err) {
    // next(err);
  }
});
app.get("/posts/:username", async (req, res) => {
  console.log(req.params.username);
  try {
    // Get user ID from username
    const userId = await getUserId(req.params.username);

    // Fetch recent posts by user ID
    const posts = await fetchUserPosts(userId);

    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error.message);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Function to get Instagram user ID from username
async function getUserId(username) {
  try {
    const response = await axios.get(
      `https://graph.instagram.com/v12.0/${username}?fields=id&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`
    );
    console.log(response);
    return response.data.id;
  } catch (error) {
    throw new Error(`Error getting user ID for ${username}: ${error.message}`);
  }
}

// Function to fetch user's recent posts
async function fetchUserPosts(userId) {
  try {
    const response = await axios.get(
      `https://graph.instagram.com/v12.0/${userId}/media?fields=id,caption,media_type,media_url,permalink,timestamp&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`
    );
    return response.data.data;
  } catch (error) {
    throw new Error(
      `Error fetching posts for user ID ${userId}: ${error.message}`
    );
  }
}

app.get("/get-videosTiktok", async (req, res) => {
  const data = localStorage.getItem("aaaa");
  console.log(data);
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer act.example12345Example12345Example",
    };
    const data = { max_count: 20 };
    const url = `https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,duration,cover_image_url,embed_link`;
    axios
      .post(url, data, {
        headers: headers,
      })
      .then((response) => {
        res.send({
          data: response,
        });
      })
      .catch((error) => {
        res.send({
          data: error,
        });
      });
  } catch (err) {
    res.send(err);
  }
});
app.get("/oauth", (req, res) => {
  // const authUrl = `https://open-api.tiktok.com/platform/oauth/connect?client_key=${process.env.TIKTOK_CLIENT_KEY}&response_type=code&scope=user.info.basic&redirect_uri=${REDIRECT_URI_TITOK}`;
  const csrfState = Math.random().toString(36).substring(2);
  res.cookie("csrfState", csrfState, { maxAge: 60000 });
  let url = "https://www.tiktok.com/v2/auth/authorize/";
  // the following params need to be in `application/x-www-form-urlencoded` format.
  url += `?client_key=awcfverlqghe2cts`;
  url += "&scope=user.info.basic";
  url += "&response_type=code";
  url += `&redirect_uri=https://applogins-production.up.railway.app/auth/tiktok/callback`;
  url += "&state=" + "state";
  // res.json({ url: url });
  res.redirect(url);
});

// app.get("/auth/tiktok/callback", async (req, res) => {
//   const { code } = req.query;

//   try {
//     const tokenResponse = await axios.post(
//       "https://open-api.tiktok.com/oauth/access_token/",
//       qs.stringify({
//         client_key: process.env.TIKTOK_CLIENT_KEY,
//         client_secret: process.env.TIKTOK_CLIENT_SECRET,
//         code,
//         grant_type: "authorization_code",
//         redirect_uri: REDIRECT_URI_TITOK,
//       })
//     );

//     const accessToken = tokenResponse.data.data.access_token;

//     // Fetch user info with the access token
//     const userInfoResponse = await axios.get(
//       "https://open-api.tiktok.com/user/info/",
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       }
//     );

//     const userInfo = userInfoResponse.data.data;
//     res.send(userInfo);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Authentication failed");
//   }
// });
// Function to exchange authorization code for access token
async function exchangeCodeForAccessToken(code) {
  try {
    const response = await axios.post(
      "https://open-api.tiktok.com/platform/oauth/access_token",
      querystring.stringify({
        client_id: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectURI,
      })
    );

    return response.data.access_token;
  } catch (error) {
    throw new Error(`Error exchanging code for access token: ${error.message}`);
  }
}
app.get("/video/:username", async (req, res) => {
  const username = req.params.username;
  console.log(username);
  // const embedCode = generateTikTokEmbed(username); // Generate embed code here
  const resp = await axios.get(
    `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@${username}/video/7054879716615933210`
  );
  // console.log(resp.data);
  res.send(resp.data);
  // Render the page with embedded TikTok video
  // res.render("pages/video.ejs", resp.data.html);
});

// Example function to generate TikTok embed code
async function generateTikTokEmbed(username) {
  // Example embed code (replace with actual TikTok embed code)
  return `<iframe src="https://www.tiktok.com/@${username}/video/7054879716615933210" width="100%" height="600" style="border:none;" allowfullscreen></iframe>`;
}
app.listen(PORT, async () => {
  console.log(`Application is running on the ${PORT}`);
});
export default app;
