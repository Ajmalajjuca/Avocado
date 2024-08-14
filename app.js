require('dotenv').config();

  let  express = require('express');
  let  app = express();
  const PORT = process.env.PORT || 8080;
  const nocache = require("nocache");
  const session = require("express-session");
  const userRouter = require("./routers/userRouter");
  const adminRouter = require("./routers/adminRouter");
  const mongoose = require("mongoose");
  const flash = require("connect-flash")
  const path = require('path');
  const sharp = require('sharp');
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  const passport = require('passport');
  const userModal = require("./models/userModel")
  const Middleware = require('./Middleware');



  const connect = mongoose.connect("mongodb://localhost:27017/Avocado");

  connect.then(()=>{
      console.log("User Database connected Successfully");
  })
  .catch(()=>{
      console.log(" Database cannot be connected");
  })


  app.use(express.static(path.join(__dirname, 'public')));
  app.use(nocache());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.use(flash())

  // set the view engine to ejs
  app.set('view engine', 'ejs');


  app.use(session({
    secret: 'your_session_secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
  }));


    app.use(passport.initialize());
    app.use(passport.session());
    
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:8080/auth/google/callback"
    },
    async function(accessToken, refreshToken, profile, done) {
      try {
        // Check if user already exists in your database
        let user = await userModal.findOne({ email: profile.emails[0].value });
        
        if (user) {
          if (user.blocked) {
            return done(null, false, { message: "Blocked Google authenticated user. Please contact support." });
          }
          // If user exists, update their Google ID if it's not set
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
        } else {
          // If user doesn't exist, create a new user
          user = new userModal({
            googleId: profile.id,
            username: profile.displayName,
            email: profile.emails[0].value,
            // You might want to set a default password or mark this account as "Google authenticated"
            password: Math.random().toString(36).slice(-8), // Generate a random password
            isGoogleAuth: true // Add this field to your user schema if not already present
          });
          await user.save();
        }
        
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
    
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });
    
    passport.deserializeUser(async (id, done) => {
      try {
        const user = await userModal.findById(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });




  // User routes
  app.use("/", userRouter); 



  // Admin routes
  app.use("/admin",adminRouter); 

  app.use((req, res, next) => {
    res.status(404).render('user/404Error', { title: '404 - Page Not Found' });
  });

  app.use((req, res, next) => {
    res.locals.messages = req.flash();
    next();
  });


  app.use(Middleware.checkBlockedUser);



  app.listen(PORT, () => {
      console.log(`running....http://localhost:${PORT}`);
    });