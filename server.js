"use strict";
require("dotenv").config();
const express = require("express");
const myDB = require("./connection");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const session = require("express-session");
const passport = require("passport");
const { ObjectID } = require("mongodb");
const LocalStrategy = require("passport-local");

const app = express();

fccTesting(app); //For FCC testing purposes
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "pug");
app.set("views", "./views/pug");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false },
  }),
);

passport.initialize();
passport.session();

myDB(async (client) => {
  const myDataBase = await client.db("database").collection("users");

  app.route("/").get((req, res) => {
    // Change the response to render the Pug template
    res.render("index", {
      title: "Connected to Databases",
      message: "Please login",
      showLogin: true,
    });
  });

  app
    .route("/login")
    .post(
      passport.authenticate("local", { failureRedirect: "/" }),
      (req, res) => {
        res.redirect("/profile");
      },
    );

  app.route("/profile").get((req, res) => {
    if (req.user) {
      res.render("profile", { username: req.user.username });
    } else {
      res.redirect("/");
    }
  });

  // we need to serialize and deserialize the users
  // serializing converts a user to be able to be stored in the session
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });
  // deserializing converts the session back to a user
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc);
    });
  });

  passport.use(
    new LocalStrategy((username, password, done) => {
      myDataBase.findOne({ username: username }, (err, user) => {
        console.log(`User ${username} attempted to log in.`);
        if (err) return done(err);
        if (!user) return done(null, false);
        if (password !== user.password) return done(null, false);
        return done(null, user);
      });
    }),
  );
}).catch((e) => {
  app.route("/").get((req, res) => {
    res.render("index", { title: e, message: "Unable to connect to database" });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});
