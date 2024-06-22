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
import ig from "instagram-scraping";
import { requireSignIn } from "./middlewares/auth_middleware.js";
// const InstagramStrategy = Instagram.Strategy;
const GoogleStrategys = GoogleStrategy.OAuth2Strategy;
env.config();
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

app.get("/oauth", (req, res) => {
  const csrfState = Math.random().toString(36).substring(2);
  res.cookie("csrfState", csrfState, { maxAge: 60000 });
  let url = "https://www.tiktok.com/v2/auth/authorize/";
  // the following params need to be in `application/x-www-form-urlencoded` format.
  url += `?client_key=${process.env.TIKTOK_CLIENT_KEY}`;
  url += "&scope=user.info.basic,user.info.profile,user.info.stats,video.list";
  url += "&response_type=code";
  url += `&redirect_uri=${process.env.TIK_CALLBACK_URL}`;
  url += "&state=" + csrfState;
  res.json({ url: url });
});
const getBase64 = async (link) => {
  const base64 = await imageToBase64(link);
  return `data:image/jpeg;base64,${base64}`;
};

app.get("/get-videos", requireSignIn, async (req, res) => {
  try {
    const query = req.query.search;
    const url = `  https://www.googleapis.com/youtube/v3/search?key=AIzaSyB-TpUlPx2ZMcmfqIC-9MgZL088W5Xcfts&type=video&&part=snippet&q=${query}`;
    const response = await axios.get(url);
    res.send({
      data: response.data.items,
    });
  } catch (err) {
    next(err);
  }
});

// app.get("/get-instagram", async (req, res) => {
//   try {
//     var link = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTA_CLIENT_ID}
//   &redirect_uri=${process.env.IMSTA_CALLBACK_URL}
//   &scope=user_profile,user_media
//   &response_type=code
//   &state=1 `;
//     console.log(link);
//     const res = await axios.get(link);
//     // var url = `https://api.instagram.com/v1/users/backy/media/recent/?client_id=${process.env.INSTA_CLIENT_ID}`;

//     // request(url, function (err, response, body) {
//     //   // var dataGram = JSON.parse(body);
//     //   res.send(body);
//     //   // res.render("show", dataGram);
//     // });
//     res.send(res);
//     // console.log(res);
//   } catch (err) {
//     // next(err);
//   }
// });

app.post("/get-videosTiktok", async (req, res) => {
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

app.post("/tiktokaccesstoken", async (req, res) => {
  try {
    const { code } = req.body;
    const decode = decodeURI(code);
    const tokenEndpoint = "https://open.tiktokapis.com/v2/oauth/token/";
    const params = {
      client_key: `${process.env.TIKTOK_CLIENT_KEY}`,
      client_secret: ` ${process.env.TIKTOK_CLIENT_SECRET}`,
      code: decode,
      grant_type: "authorization_code",
      redirect_uri: ` ${process.env.TIK_CALLBACK_URL}`,
    };

    const response = await axios.post(
      tokenEndpoint,
      querystring.stringify(params),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cache-Control": "no-cache",
        },
      }
    );
    if (response.data.access_token) {
      const allvideosdata = await axios.post(
        "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,duration,cover_image_url,embed_link",
        {
          max_count: 20,
        },
        {
          headers: {
            Authorization: `Bearer ${response.data.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(allvideosdata.data.data.videos); //Lists all videos of user along with other details
      res.send(allvideosdata.data.data.videos);
    }
  } catch (error) {
    console.error("Error during callback:", error.message);
    res.status(500).send("An error occurred during the login process.");
  }
});
app.listen(PORT, async () => {
  console.log(`Application is running on the ${PORT}`);
});
export default app;
