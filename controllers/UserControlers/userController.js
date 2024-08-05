const userModal = require("../../models/userModel");
const otpModel = require("../../models/otpModel");
const bcrypt = require("bcrypt");
const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const categoriesModel = require("../../models/categorieModel")
const productModel = require("../../models/productModel")
const crypto = require('crypto');
const address = require('../../models/addressModel')
const {
  isValidName,
  isValidPassword,
  isValidEmail,
} = require("../../validation/regexValidation");



const getHome = async (req, res) => {
  try {
    const categories = await categoriesModel.find({ status: true });
    const products = await productModel.find({ status: true }).populate('category');
    const LatestProducts = await productModel.find({ status: true })
    .sort({ createdAt: -1 })  // Sort by newest first
    .limit(9);   // Fetch latest 3 products

    
   
    if (req.session.isAuth) {
      const user = await userModal.findOne({ email: req.session.user.email }).populate("address");
      res.render("user/home", { user: user.username, categories, products,LatestProducts });
    } else {
      res.render("user/home", { error: req.flash("error"), categories, products,LatestProducts });
    }
  } catch (err) {
    console.error("rendering error:", err);
    res.render("user/404Error");
  }
};


const getProfile = async (req, res) => {
  try {
    if (req.session.isAuth) {
      const user = await userModal.findOne({ email: req.session.user.email });
      res.render("user/profile", { user: user.username,email:user.email });
    } else {
      res.redirect('/login');
    }
  } catch (err) {
    console.error("rendering error:", err);
    res.render("user/404Error");
  }
};

const  getlogout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).send("Unable to logout. Please try again.");
    }
    res.redirect('/');
  })
};

const getShop = async (req, res) => {
  try {
    const categories = await categoriesModel.find({ status: true });
    let products, category;

    if (req.params.categoryId) {
      category = await categoriesModel.findById(req.params.categoryId);
      if (!category) {
        return res.status(404).render("user/404Error");
      }
      products = await productModel.find({ status: true, category: category._id });
    } else {
      products = await productModel.find({ status: true });
    }

    const LatestProducts = await productModel.find({ status: true })
      .sort({ createdAt: -1 })
      .limit(9);

    const renderData = {
      categories: categories,
      products: products,
      LatestProducts: LatestProducts,
      category: category
    };

    if (req.session.isAuth) {
      const user = await userModal.findOne({ email: req.session.user.email });
      renderData.user = user.username;
    }

    res.render("user/shop", renderData);
  } catch (err) {
    console.error("rendering error:", err);
    res.render("user/404Error");
  }
};

const getContact = async (req, res) => {
  try {
    if (req.session.isAuth) {
      const user = await userModal.findOne({ email: req.session.user.email });

      res.render("user/contact", { user: user.username });
    } else {
      res.render("user/contact");
    }
  } catch (err) {
    console.error("rendering error:", err);
    res.render("user/404Error");
  }
};

const getLogin = async (req, res) => {
  try {
    const messages = {
      error: req.flash('error'),
      info: req.flash('info'),
      success: req.flash('success')
    };
    if (req.session.isAuth) {
      const user = await userModal.findOne({ email: req.session.user.email });

      res.render("user/home", { user: user.username });
    } else {
      res.render("user/auth-login-basic", { messages });
    }
  } catch (err) {
    console.error("rendering error:", err);
    res.render("user/404Error");
  }
};

const getForgotPassword = async (req, res) => {
  try {const messages = {
    error: req.flash('error'),
    info: req.flash('info'),
    success: req.flash('success')
  };
    if (req.session.isAuth) {
      const user = await userModal.findOne({ email: req.session.user.email });

      res.render("user/home", { user: user.username });
    } else {
      res.render("user/auth-forgot-password-basic",{messages});
    }
  } catch (err) {
    console.error("rendering error:", err);
    res.render("user/404Error");
  }
};

const getSignup = async (req, res) => {
  try {
    if (req.session.isAuth) {
      const user = await userModal.findOne({ email: req.session.user.email });

      res.render("user/home", { user: user.username });
    } else {
      res.render("user/auth-register-basic", { error: req.flash("error") });
    }
  } catch (err) {
    console.error("rendering error:", err);
    res.render("user/404Error");
  }
};

const generatorotp = () => {
  const otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });
  console.log("OTP generated: ", otp);
  return otp;
};

const sendmail = async (email, otp, user) => {
  try {
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER, // your SMTP username
        pass: process.env.SMTP_PASS, // your SMTP password
      },
    });
    transporter.verify(function (error, success) {
      if (error) {
        console.error(error);
      } else {
        console.log("Server is ready to take our messages");
      }
    });

    let mailOptions = {
      from: "avocado.ajmal@gmail.com",
      to: email,
      subject: "E-mail Verification",
      html: `<p>Dear ${user},</p>
<p>Thank you for signing up with <strong color: #ff0000;>Avocado!</strong> To complete your registration, please use the following OTP:</p>
<p style="font-size: 1.5em; font-weight: bold; color: #ff0000;">${otp}</p>
<p>Enter this OTP on our website to verify your email address and access your account.</p>
<p>If you did not sign up for <strong color: #ff0000;>Avocado!</strong>, please disregard this email.</p>
<p>Welcome Avocado!</p>
<p>Best regards,<br/>Ajmal C A</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (err) {
    console.error(err);
  }
};

const UsersignupPost = async (req, res) => {
  const { username, email, password, cpassword } = req.body;

  try {
    // Validate input fields
    if (!isValidName(username)) {
      req.flash("error", "Invalid username");
      return res.redirect("/signup");
    }
    if (!isValidEmail(email)) {
      req.flash("error", "Invalid email");
      return res.redirect("/signup");
    }
    if (!isValidPassword(password)) {
      req.flash("error", "Invalid password");
      return res.redirect("/signup");
    }
    if (password !== cpassword) {
      req.flash("error", "passwords do not match");
      return res.redirect("/signup");
    }

    // Check if email already exists
    const existingEmail = await userModal.findOne({ email: email });
    if (existingEmail) {
      req.flash("error", "Email alredy existed");
      return res.redirect("/signup");
    }

    // Create new user
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    req.session.user = {
      username: username,
      email: email,
      password: hashedPassword,
    };
    req.session.signup = true;

    const otp = generatorotp();
    const currTime = Date.now();
    const expTime = currTime + 60 * 1000;

    await otpModel.updateOne(
      { email },
      { $set: { email, otp, expiry: new Date(expTime) } },
      { upsert: true }
    );
    await sendmail(email, otp, username);
    // Redirect to login page or show success message
    return res.redirect("/verify-otp");
  } catch (error) {
    console.error("Error signing up user:", error);
    req.flash("error", "Unexpected error occured");
    return res.redirect("/signup");
  }
};

const getVerifyotp = async (req,res)=>{
  try {
    const messages = {
      error: req.flash('error'),
      info: req.flash('info'),
      success: req.flash('success')
    };
    const {  email,  } = req.body;

    res.render("user/two-step-verification",{email,messages});
  } catch (error) {
    console.error("Error signing up user:", error);
    req.flash("error", "Unexpected error occured");
    return res.redirect("/signup");
  }
}

const resendotp = async (req, res) => {
  try {
    const email = req.session.user.email;
    const otp = generatorotp();

    const currTime = Date.now();
    const expiry = currTime + 60 * 1000;
    await otpModel.updateOne(
      { email: email },
      { otp: otp, expiry: new Date(expiry) }
    );
    await sendmail(email, otp, req.session.user.username);
    res.json({ success: true });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.json({ success: false });
  }
};

const verifyotp = async (req, res) => {
  try {
    const enteredotp = req.body.otp;
    const Intotp = parseInt(enteredotp);

    if (!Intotp) {
      return res.status(400).json({ success: false, message: "OTP is required" });
    }

    const email = req.session.user.email;

    const userdb = await otpModel.findOne({ email: email });

    if (!userdb) {
      return res.status(400).json({ success: false, message: "Invalid OTP or expired" });
    }

    const storedOtp = userdb.otp;
    const expiry = userdb.expiry;

    if (Intotp === storedOtp && expiry.getTime() >= Date.now()) {
      if (req.session.signup) {
        const newUserData = req.session.user;
        delete newUserData.id;

        const newUser = await userModal.create(newUserData);

        req.session.userId = newUser.id;
        req.session.isAuth = true;
        req.session.signup = false;

        return res.status(200).json({ success: true });
      } else {
        return res.status(400).json({ success: false, message: "Signin failed" });
      }
    } else {
      return res.status(400).json({ success: false, message: "Invalid OTP or expired" });
    }
  } catch (error) {
    console.error("verifyotp error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};



const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email;
    const user = await userModal.findOne({ email });

    if (!user) {
      req.flash('error', 'No account with that email found.');
      return res.redirect('/forgot-password');
    }

    const token = crypto.randomBytes(20).toString('hex');

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 30000; // 5 minuts

    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.SMTP_USER, // your SMTP username
        pass: process.env.SMTP_PASS, // your SMTP password
      },
    });

    const mailOptions = {
      to: user.email,
      from: "avocado.ajmal@gmail.com",
      subject: 'Password Reset',
      html: `<p>Dear ${user.username},</p>
      <p>You are receiving this because you have requested the reset of the password for your account.</p>
      <p>Please click on the following link, or paste this into your browser to complete the process:</p>
      <p><a href="http://${req.headers.host}/reset/${token}">Reset Password</a></p>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      <p>Best regards,<br/>The Avocado Team</p>`
      
    };

    await transporter.sendMail(mailOptions);

    req.flash('info', `An email has been sent to ${user.email} with further instructions.`);
    res.redirect('/login');
    console.log('Password Reset Link >>>',`http://${req.headers.host}/reset/${token}`);
  } catch (error) {
    console.error("Forgot Password error:", error);
    res.render('user/404Error');
  }
};

const resetPassword = async (req, res) => {
  try {
    const token = req.body.token;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    const user = await userModal.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/login');
    }

    if (!isValidPassword(password)) {
      req.flash('error', 'Invalid password');
      return res.redirect(`/reset/${token}`);
    }

    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match');
      return res.redirect(`/reset/${token}`);
    }

    user.password = await bcrypt.hash(password, 10); // hash the password before saving
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    req.flash('success', 'Your password has been updated.');
    res.redirect('/login');
  } catch (error) {
    console.error('Reset Password error:', error);
    res.render('user/404Error');
  }
};


const postLogin = async (req, res) => {
  try {
    const user = await userModal.findOne({ email: req.body.email });
    if (!user) {
      req.flash("error", "Invalid user");
      return res.redirect("/login");
    }

    if (user.blocked) {
      req.flash("error", user.isGoogleAuth ? "Blocked Google authenticated user. Please contact support." : "User is blocked");
      return res.redirect("/login");
    }

    if (user.isGoogleAuth) {
      req.flash("error", "Please use Google to sign in");
      return res.redirect("/login");
    }

    const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);
    if (isPasswordMatch) {
      req.session.isAuth = true;
      req.session.user = user;
      console.log("login user is:",user);
      
      return res.redirect("/");
    } else {
      req.flash("error", "Wrong password");
      return res.redirect("/login");
    }
  } catch (error) {
    console.error("Error logging in user: ", error);
    req.flash("error", "Something went wrong");
    return res.redirect("/login");
  }
};




const initiateGoogleAuth = (req, res) => {
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
};

const googleAuthCallback = (req, res) => {
  res.redirect('/verify-otp');
};

module.exports = {
  getHome,
  getShop,
  getContact,
  getLogin,
  getSignup,
  getForgotPassword,
  sendmail,
  resendotp,
  generatorotp,
  UsersignupPost,
  verifyotp,
  postLogin,
  initiateGoogleAuth,
  googleAuthCallback,
  getProfile,
  getlogout,
  forgotPassword,
  resetPassword,
  getVerifyotp,
};
