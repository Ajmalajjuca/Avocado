const Usermodel = require('../../models/userModel');
const Productmodel = require('../../models/productModel');
const Wishlistmodel = require('../../models/wishlistModel');
const productModel = require('../../models/productModel');
const userModel = require('../../models/userModel');


 const getWishlist =  async (req, res) => {
    try {
      const user = await userModel.findById(req.user._id).populate("address");
      const userId = req.user._id;
      let wishlist = await Wishlistmodel.findOne({ userId }).populate('items.productId');
      console.log("Wishlist is >>>>>",wishlist);
      
      if (!wishlist) {
        wishlist = new Wishlistmodel({ userId, items: [] });
        await wishlist.save();
      }

      res.render('user/wishlist', { wishlist: wishlist,      user: user.username,
      });
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      res.status(500).json({ success: false, message: 'Error fetching wishlist' });
    }
  }

  // Add to wishlist
  const addToWishlist = async (req, res) => {
    try {
      const userId = req.user._id;
      const { productId } = req.body;

      const product = await productModel.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      let wishlist = await Wishlistmodel.findOne({ userId });
      if (!wishlist) {
        wishlist = new Wishlistmodel({ userId, items: [] });
      }

      const existingItem = wishlist.items.find(item => item.productId.toString() === productId);
      if (existingItem) {
        return res.status(400).json({ success: false, message: 'Product already in wishlist' });
      }

      wishlist.items.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.images[0] // Assuming the product has an images array
      });

      await wishlist.save();

      res.json({ success: true, message: 'Product added to wishlist', wishlist: wishlist.items });
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      res.status(500).json({ success: false, message: 'Error adding to wishlist' });
    }
  }

  // Remove from wishlist
  const removeFromWishlist =  async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId } = req.body;

        const wishlist = await Wishlistmodel.findOne({ userId });
        if (!wishlist) {
            return res.status(404).json({ success: false, message: 'Wishlist not found' });
        }

        wishlist.items = wishlist.items.filter(item => item.productId.toString() !== productId);
        await wishlist.save();

        // Fetch the updated wishlist with populated product data
        const updatedWishlist = await Wishlistmodel.findOne({ userId }).populate('items.productId');

        res.json({ success: true, message: 'Product removed from wishlist', wishlist: updatedWishlist.items });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ success: false, message: 'Error removing from wishlist' });
    }
};

  // Move item from wishlist to cart
  const moveToCart = async (req, res) => {
    try {
      const userId = req.user._id;
      const { productId } = req.body;

      const user = await Usermodel.findById(userId);
      const product = await Productmodel.findById(productId);

      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // Remove from wishlist
      user.wishlist = user.wishlist.filter(item => item.productId.toString() !== productId);

      // Add to cart
      const existingCartItem = user.cart.find(item => item.productId.toString() === productId);
      if (existingCartItem) {
        existingCartItem.quantity += 1;
      } else {
        user.cart.push({ productId: product._id, quantity: 1, price: product.price });
      }

      await user.save();

      const updatedUser = await Usermodel.findById(userId).populate('wishlist.productId').populate('cart.productId');
      res.json({ 
        success: true, 
        message: 'Product moved to cart', 
        wishlist: updatedUser.wishlist,
        cart: updatedUser.cart
      });
    } catch (error) {
      console.error('Error moving item to cart:', error);
      res.status(500).json({ success: false, message: 'Error moving item to cart' });
    }
  };

  const getWishlistCount = async (req, res) => {
    try {
        const userId = req.user._id;
        const wishlist = await Wishlistmodel.findOne({ userId });
        
        const itemCount = wishlist ? wishlist.items.length : 0;

        res.json({ itemCount });
    } catch (error) {
        console.error('Error getting wishlist count:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {getWishlist,addToWishlist,removeFromWishlist,moveToCart,getWishlistCount};