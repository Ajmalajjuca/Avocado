const express = require("express");
const router = express.Router();
const userController = require("../controllers/UserControlers/userController");
const productController = require("../controllers/UserControlers/productController");
const profileController = require("../controllers/UserControlers/profileController")
const addressController = require("../controllers/UserControlers/addressController")
const cartController =require("../controllers/UserControlers/cartController")
const checkoutController = require("../controllers/UserControlers/checkoutController")
const { findCartByUser,authForCartAndWishlistMiddleware, authMiddleware } = require('../Middleware');
const passport = require("passport");
const userModel = require("../models/userModel");
const orderController = require('../controllers/UserControlers/ordercontroler')
const wishlistController = require('../controllers/UserControlers/wishlistController')
const walletController = require('../controllers/UserControlers/walletController')
const invoiceController = require('../controllers/UserControlers/invoiceController')


router.get("/", userController.getHome);
router.get("/shop", userController.getShop);
router.get('/shop/:categoryId?', userController.getShop);
router.get("/contact", userController.getContact);
router.get("/login", userController.getLogin);
router.get("/signup", userController.getSignup);
router.get("/forgot-password", userController.getForgotPassword);
router.post("/forgot-password",userController.forgotPassword)
router.post('/submit-contact', userController.submitContact);
router.get('/about',userController.getabout);


router.get('/profile', authMiddleware,userController.getProfile);
// router.get('/addresses',  userController.getUserAddresses);
router.get("/logout",userController.getlogout)
router.post('/resend-otp', userController.resendotp);


router.post("/signup", userController.UsersignupPost);
router.post("/verify-otp", userController.verifyotp);
router.get("/verify-otp", userController.getVerifyotp);
router.post("/login", userController.postLogin);

//forget password
router.post('/forgot-password', userController.forgotPassword);
router.get('/reset/:token', (req, res) => {
  const messages = {
    error: req.flash('error'),
    info: req.flash('info'),
    success: req.flash('success')
  };
  res.render('user/reset-password', { token: req.params.token,messages });
});
router.post('/reset-password', userController.resetPassword);

//product
router.get("/product/:id",productController.getProductDetails);

//Category
router.get("/categories/:id",productController.getcategoriesProduct)


//profile

router.get('/ChangePass',profileController.ChangePass)
router.post('/change-password',authMiddleware,profileController.changePassword)

//address
router.get('/address', addressController.getAddresses);
router.get('/addAddress', addressController.getAddAddresses);
router.post('/addAddress',authMiddleware, addressController.addAddress);
router.put('/editAddress/:id', addressController.editAddress);
router.delete('/deleteAddress/:id', addressController.deleteAddress);
router.get('/deleteAddress/:id', authMiddleware, addressController.deleteAddress);
router.post('/editAddress/:id', addressController.postEditAddress);
router.get('/address/:id', addressController.getEditAddress);

//cart
router.get('/cart', authMiddleware, findCartByUser, cartController.getcart);
router.post('/cart/add', authForCartAndWishlistMiddleware, findCartByUser, cartController.postcart);
router.post('/cart/remove', authMiddleware, findCartByUser, cartController.postremove);
router.post('/cart/update', authMiddleware, findCartByUser, cartController.postupdate);
router.get('/cart/count', authMiddleware, findCartByUser, cartController.cartcount);
router.post('/cart/apply-coupon',authMiddleware,findCartByUser,cartController.applyCoupon)
router.get('/product/check-stock/:productId/:quantity',authMiddleware,findCartByUser,cartController.checkStock);
router.post('/cart/remove-coupon',authMiddleware,cartController.removeCoupon);

//checkout
router.get('/checkout', authMiddleware, findCartByUser,checkoutController.getcheckout)
router.get('/order-confirmation/:orderId', authMiddleware, checkoutController.getOrderConfirmation);
router.post('/place-order', authMiddleware, findCartByUser, checkoutController.placeOrder);
// router.post('/update-order-status',authMiddleware,checkoutController.UpdateOrderStatus)
// router.post('/cancel-order',authMiddleware,checkoutController.CancelOrder)
router.post('/create-razorpay-order', authMiddleware, findCartByUser, checkoutController.createRazorpayOrder);
router.post('/remove-coupon',checkoutController.removeCoupon);



//wallet
router.get('/wallet',walletController.getWalletInfo,)
router.post('/create-order',walletController.createOrder);
router.post('/verify-payment',walletController.verifyPayment)


//order
router.get('/orders', orderController.getUserOrders);
router.get('/orders/:orderId/details',orderController.getOrderid)
router.post('/orders/:orderId/cancel',orderController.postOrderCancel)
router.post('/orders/:orderId/return',orderController.postOrderReturn)
router.post('/create-razorpay-order/:orderId', orderController.createRazorpayOrder);
router.post('/re-verify-payment', orderController.verifyPayment);
router.post('/cancel-product', orderController.cancelproduct);


//Wishlist
router.get('/wishlist', authMiddleware, wishlistController.getWishlist);
router.post('/wishlist/add', authForCartAndWishlistMiddleware, wishlistController.addToWishlist);
router.post('/wishlist/remove', authMiddleware, wishlistController.removeFromWishlist);
router.post('/wishlist/move-to-cart', authMiddleware, wishlistController.moveToCart);
router.get('/wishlist/count', authMiddleware, wishlistController.getWishlistCount);
router.post('/wishlist/toggle',authMiddleware,wishlistController.wishlistToggle);

//invoice
router.get('/invoice/:id',authMiddleware,invoiceController.getInvoice)
router.get('/download-invoice/:orderId',authMiddleware,invoiceController.downloadInvoice);
router.post('/send-invoice/:orderId',authMiddleware,invoiceController.sendInvoice);



router.get('/check-auth', (req, res) => {
  res.json({ isLoggedIn: req.session.isAuth || false });
});

//google
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login', failureFlash: true }),
    (req, res) => {
      req.session.isAuth = true;
      req.session.user = req.user;
      res.redirect('/');
    }
  );

router.get("/auth/google", userController.initiateGoogleAuth);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  userController.googleAuthCallback
);

// In your userRouter.js or wherever you define your routes
router.get('/check-user-status', authMiddleware, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    if (user && user.blocked) {
      req.logout((err) => {
        if (err) {
          console.error("Error logging out user: ", err);
        }
        res.json({ blocked: true });
      });
    } else {
      res.json({ blocked: false });
    }
  } catch (error) {
    console.error("Error checking user status: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
