const express = require("express");
const router = express.Router();
const adminControl = require("../controllers/AdminControlers/AdminContoler");
const productController = require("../controllers/AdminControlers/productController");
const categorieController = require("../controllers/AdminControlers/categorieControler");
const userController = require("../controllers/AdminControlers/showuserControler")
const orderControler = require('../controllers/AdminControlers/orderControler')
const couponControler = require('../controllers/AdminControlers/couponControler') 
const multer = require('multer');
const path = require('path');



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed (jpeg, jpg, png, gif)!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB file size limit
  fileFilter: fileFilter 
});

router.get("/", adminControl.getLogin);
router.post("/login", adminControl.postLogin);
router.get("/dashboard", adminControl.getDashboard);
router.get("/admin/logout",adminControl.getLogout)

// router.get("/orders", adminControl.getOrders);

//Products
router.get('/products', productController.getProducts);
router.get('/addProducts', productController.getAddProduct);
router.post('/addProducts', upload.array('images', 10), productController.addProduct); // Handle up to 10 files

router.get('/products/:productId/edit', productController.getEditProduct);
router.post('/products/:id', upload.array('newImages', 10), productController.updateProduct);

router.delete('/products/:id', productController.deleteProduct);
router.patch('/products/:productId/block', productController.blockUnblockProduct);


//categories
router.get("/categories",categorieController.getCategories);
router.post("/createCategory",categorieController.postCreateCategory)
router.get("/category/:id/edit",categorieController.getEditCategories)
router.post('/categories/:id/edit', categorieController.updateCategory);
router.patch('/category/:id/block',categorieController.blockcategory);
router.get('/admin/checkCategoryName/:name',categorieController. checkCategoryName);




//showUsers
router.get("/users",userController.getAllUser)
router.post('/users',userController.postUsers );
router.put('/users/:id',userController.putUsers);
router.get('/users/:id/edit', userController.getEditUser);
router.post('/users/:id/edit', userController.updateUser);
router.delete('/users/:id', userController.deleteUsers);
router.get('/createUser',userController.getcreateUser)
router.post('/createUser',userController.postcreateUser)
router.patch('/users/:id/block',userController.blockUser);

//showOrder
router.get('/orders',orderControler.getAllOrders)
router.post('/order/:id/update-status', orderControler.updatestatus);
router.get('/orders/:orderId/details', orderControler.orderDetails);


//show coupon

router.get('/coupon',couponControler.getCoupon);
router.post('/createCoupon',couponControler.postCreateCoupon)
router.get('/editCoupon/:id',couponControler.getEditCoupon)
router.post('/updateCoupon/:id',couponControler.updateCoupon)
router.patch('/coupons/:id/toggleStatus',couponControler.updatestatus)



module.exports = router;
