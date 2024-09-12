const productModel = require("../../models/productModel");
const cartModel = require("../../models/cartModel");
const userModal = require('../../models/userModel');
const couponModel = require('../../models/coupon');
const offerModel = require('../../models/offersModel');



const postcart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const product = await productModel.findById(productId);
    if(!req.session.isAuth){
      return res.status(404).json({ success: false, message: 'Please login and try', availableStock: product.stock });
    }
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ success: false, message: 'Not enough stock available', availableStock: product.stock });
    }

    // Check for active offers
    const activeOffer = await offerModel.findOne({
      $or: [
        { productId: productId },
        { categoryId: product.category }
      ],
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    const price = activeOffer ? product.price * (1 - activeOffer.discount / 100) : product.price;

    const cart = req.cart;

    console.log('Cart items before findIndex:', JSON.stringify(cart.items, null, 2));
    console.log('Looking for productId:', productId);

    const productIndex = cart.items.findIndex(item => {
      console.log('Comparing item.productId:', item.productId, 'with productId:', productId);
      console.log('Types - item.productId:', typeof item.productId, 'productId:', typeof productId);
      return item.productId._id.toString() === productId;
    });

    console.log('Product index is >>>', productIndex);

    if (productIndex > -1) {
      // Update existing item
      console.log("Updating existing item");
      const newQuantity = Number(cart.items[productIndex].quantity) + Number(quantity);
      if (newQuantity > product.stock) {
        return res.status(400).json({ success: false, message: 'Not enough stock available', availableStock: product.stock });
      }
      cart.items[productIndex].quantity = newQuantity;
      cart.items[productIndex].price = price;
      cart.items[productIndex].Product_total = Number((cart.items[productIndex].quantity * price).toFixed(2));
      cart.items[productIndex].stock = product.stock;
    } else {
      // Add new item
      console.log("Adding new item to cart");
      cart.items.push({
        productId: product._id,
        quantity: Number(quantity),
        price: price,
        Product_total: Number((Number(quantity) * price).toFixed(2)),
        stock: Number(product.stock)
      });
    }

      // Recalculate Cart_total
      cart.Cart_total = Number(cart.items.reduce((sum, item) => sum + (item.Product_total || 0), 0).toFixed(2));

      // Validate cart before saving
      const validationError = cart.validateSync();
      if (validationError) {
        console.error('Validation error:', validationError);
        return res.status(400).json({ success: false, message: 'Validation error', errors: validationError.errors });
      }

      
      await product.save();
      await cart.save();

      const cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

      return res.status(200).json({ success: true, message: 'Product added to cart successfully', cartItemCount });  
    } catch (error) {
      console.error('Server error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ success: false, message: 'Error adding product to cart' });
    }
  };
  
  const getcart = async (req, res) => {
    try {
      const user = await userModal.findOne({ email: req.user.email });
      res.render('user/cart', { user: user.username, cart: req.cart });
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).render("user/404Error");
    }
  };
  
  const postremove = async (req, res) => {
    try {
        const { productId } = req.body;
        const cart = req.cart;


        const itemIndex = cart.items.findIndex(item => 
            item.productId._id.toString() === productId
        );
        
        if (itemIndex > -1) {
            // Remove the item from the cart
            cart.items.splice(itemIndex, 1);
            
            // Recalculate Cart_total
            cart.Cart_total = Number(cart.items.reduce((sum, item) => sum + item.Product_total, 0).toFixed(2));

            await cart.save();
            res.status(200).json({ success: true, cart });
        } else {
            res.status(404).json({ success: false, message: 'Product not found in cart' });
        }
    } catch (error) {
        console.error("Error removing product from cart:", error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

const postupdate = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const cart = req.cart;


        const itemIndex = cart.items.findIndex(item => 
            item.productId._id.toString() === productId
        );


        if (itemIndex > -1) {
            // Update existing item
            const item = cart.items[itemIndex];
            item.quantity = Number(quantity);
            item.Product_total = Number((item.quantity * item.price).toFixed(2));
            
            // Recalculate Cart_total
            cart.Cart_total = Number(cart.items.reduce((sum, item) => sum + item.Product_total, 0).toFixed(2));

            await cart.save();
            res.status(200).json({ success: true, cart });
        } else {
            res.status(404).json({ success: false, message: 'Product not found in cart' });
        }
    } catch (error) {
        console.error("Error updating cart:", error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

const cartcount = async (req, res) => {
  try {
    if (!req.cart || !req.cart.items) {
      return res.json({ itemCount: 0, totalAmount: '0.00' });
    }

    const count = req.cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = req.cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    res.json({ 
      itemCount: count, 
      totalAmount: totalAmount.toFixed(2)
    });
  } catch (error) {
    console.error("Error fetching cart info:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const applyCoupon = async (req, res) => {
  const { couponCode } = req.body;
  const userId = req.user.id;

  try {
    const cart = await cartModel.findOne({ userId });
    if (!cart) {
      throw new Error('Cart not found');
    }

    // Check if a coupon is already applied
    if (cart.appliedCoupon) {
      throw new Error('A coupon is already applied. Please remove it first.');
    }

    const totalBeforeDiscount = cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    const { discountAmount, coupon } = await validateAndCalculateDiscount(couponCode, totalBeforeDiscount);
    const updatedCart = await applyDiscountToCart(userId, discountAmount, couponCode);

    res.json({ success: true, cart: updatedCart });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

async function validateAndCalculateDiscount(couponCode, cartTotal) {
  try {
    const coupon = await couponModel.findOne({ couponCode });

    if (!coupon) {
      throw new Error('Invalid coupon code');
    }

    if (coupon.expiry < new Date()) {
      throw new Error('Coupon has expired');
    }

    if (coupon.status === false) {
      throw new Error('This coupon is no longer active');
    }

    if (cartTotal < coupon.minimumPrice) {
      throw new Error(`Cart total must be at least ₹${coupon.minimumPrice} to use this coupon`);
    }

    let discountAmount = (cartTotal * coupon.discount) / 100;

    // Apply the lesser of discountAmount or maxRedeem
    discountAmount = Math.min(discountAmount, coupon.maxRedeem);

    if (discountAmount > cartTotal) {
      discountAmount = cartTotal;
    }

    return { discountAmount, coupon };
  } catch (error) {
    console.error('Error on discount calculate:', error);
    throw error;
  }
}

async function applyDiscountToCart(userId, discountAmount, couponCode) {
  const cart = await cartModel.findOne({ userId }).populate('items.productId');

  if (!cart) {
    throw new Error('Cart not found');
  }

  const totalBeforeDiscount = cart.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);

  cart.discount = discountAmount;
  cart.Cart_total = totalBeforeDiscount - discountAmount;
  cart.appliedCoupon = couponCode;  // Store the applied coupon code

  await cart.save();

  return cart;
}

async function clearCoupon(userId) {
  const cart = await cartModel.findOne({ userId });

  if (!cart) {
    throw new Error('Cart not found');
  }

  if (!cart.appliedCoupon) {
    throw new Error('No coupon applied to remove');
  }

  const totalBeforeDiscount = cart.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);

  cart.discount = 0;
  cart.Cart_total = totalBeforeDiscount;
  cart.appliedCoupon = null;  // Clear the applied coupon

  await cart.save();

  return cart;
} 

const checkStock = async (req, res) => {
  try {
      const { productId, quantity } = req.params;
      const product = await productModel.findById(productId);
      
      if (!product) {
          return res.json({ success: false, message: 'Product not found' });
      }

      if (product.stock < parseInt(quantity)) {
          return res.json({ success: false, message: `Only ${product.stock} items available in stock` });
      }

      return res.json({ success: true });
  } catch (error) {
      console.error('Error checking stock:', error);
      res.status(500).json({ success: false, message: 'Server error' });
  }
};

const removeCoupon = async (req, res) => {
  const userId = req.user.id;

  try {
    const updatedCart = await clearCoupon(userId);
    res.json({ success: true, cart: updatedCart });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { postcart, getcart, postremove, postupdate,cartcount,applyCoupon,checkStock, removeCoupon};
