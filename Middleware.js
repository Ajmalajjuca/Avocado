const cartModel = require("./models/cartModel");
const userModel = require('./models/userModel')

const findCartByUser = async (req, res, next) => {
    if (!req.user) {
      return res.status(401).send('User not authenticated');
    }
  
    try {
      let cart = await cartModel.findOne({ userId: req.user._id }).populate('items.productId');
      if (!cart) {
        cart = new cartModel({ 
          userId: req.user._id, 
          items: [], 
          Cart_total: 0 
        });
        await cart.save();
      }
      req.cart = cart;
      next();
    } catch (error) {
      console.error('Error in findCartByUser middleware:', error);
      res.status(500).send('Internal server error');
    }
  };
  
  const authMiddleware = async (req, res, next) => {
    if (req.isAuthenticated()) {
        // Google authentication
        return next();
    } else if (req.session && req.session.user) {
        // Non-Google authentication
        const user = await userModel.findOne({ email: req.session.user.email });
        if (user) {
            req.user = user;
            return next();
        }
    }
    res.redirect('/login'); // Redirect to login if not authenticated
};




const checkBlockedUser = async (req, res, next) => {
  if (req.isAuthenticated()) {
    const user = await userModel.findById(req.user._id);
    if (user && user.blocked) {
      req.logout((err) => {
        if (err) {
          console.error("Error logging out user: ", err);
        }
        req.flash("error", "Your account has been blocked. Please contact support.");
        return res.redirect("/login");
      });
    } else {
      next();
    }
  } else if (req.session.isAuth && req.session.user) {
    const user = await userModel.findById(req.session.user._id);
    if (user && user.blocked) {
      req.session.destroy(err => {
        if (err) {
          console.error("Error destroying session: ", err);
        }
        req.flash("error", "Your account has been blocked. Please contact support.");
        return res.redirect("/login");
      });
    } else {
      next();
    }
  } else {
    next();
  }
};

module.exports = {findCartByUser, authMiddleware,checkBlockedUser};