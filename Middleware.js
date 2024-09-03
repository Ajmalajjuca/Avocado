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
  
  const authForCartAndWishlistMiddleware = async (req, res, next) => {
    if (req.isAuthenticated()) {
        // Google authentication
        return next();
    } else if (req.session && req.session.user) {
        const user = await userModel.findOne({ email: req.session.user.email });
        if (user) {
            req.user = user;
            return next();
        }
    }
    // Send JSON response for unauthenticated requests
    return res.status(401).json({ success: false, message: 'Please login and try' });
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
  }else{
    return res.redirect('/login'); // Redirect to login if not authenticated
  }
  
};



const adminAuthMiddleware = async (req, res, next) => {
  try {
      if (req.session && req.session.isAdmin && req.session.admin) {
          // If the session indicates the user is an admin, proceed
          const adminUser = req.session.admin;
          // Optionally, you can verify the user in the database (e.g., to check if they still have admin rights)
          const user = await userModel.findById(adminUser._id);
          if (user && user.isAdmin) {
              req.user = user; // Attach the user to the request object
              return next(); // Proceed to the next middleware or route handler
          } else {
              // If the user is not found or not an admin anymore
              return res.status(403).json({ success: false, message: "Access denied. Admins only." });
          }
      } else {
          // No admin session found
          return res.redirect('/admin'); // Redirect to admin login if not authenticated
      }
  } catch (error) {
      console.error('Error in admin authentication middleware:', error);
      res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
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

module.exports = {findCartByUser,authForCartAndWishlistMiddleware, authMiddleware,checkBlockedUser,adminAuthMiddleware};