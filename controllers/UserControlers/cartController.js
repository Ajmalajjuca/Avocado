const productModel = require("../../models/productModel");
const cartModel = require("../../models/cartModel");
const userModal = require('../../models/userModel');
const couponModel = require('../../models/coupon');


const postcart = async (req, res) => {
  try {
      const { productId, quantity } = req.body;
      const product = await productModel.findById(productId);

      if (!product) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

      if (product.stock < quantity) {
          return res.status(400).json({ success: false, message: 'Not enough stock available', availableStock: product.stock });
      }

      const cart = req.cart;

      const productIndex = cart.items.findIndex(item =>
          item.productId.toString() === productId 
      );

      if (productIndex > -1) {
          // Update existing item
          const newQuantity = Number(cart.items[productIndex].quantity) + Number(quantity);
          if (newQuantity > product.stock) {
              return res.status(400).json({ success: false, message: 'Not enough stock available', availableStock: product.stock });
          }
          cart.items[productIndex].quantity = newQuantity;
          cart.items[productIndex].Product_total = Number((cart.items[productIndex].quantity * product.price).toFixed(2));
          cart.items[productIndex].stock = product.stock;
      } else {
          // Add new item
          cart.items.push({
              productId: product._id,
              quantity: Number(quantity),
              price: Number(product.price),
              Product_total: Number((Number(quantity) * Number(product.price)).toFixed(2)),
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

      product.stock -= quantity;
      await product.save();
      await cart.save();

      const cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

      res.status(200).json({ success: true, message: 'Product added to cart successfully', cartItemCount });  
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
  const userId = req.session.user;

  try {
    // Find the coupon
    const coupon = await couponModel.findOne({ couponCode, status: true });

    if (!coupon) {
      console.warn('Invalid or expired coupon:', couponCode);
      return res.json({ success: false, message: 'Invalid or expired coupon' });
    }

    // Find the cart
    const cart = await cartModel.findOne({ userId });

    if (!cart) {
      console.warn('Cart not found for user:', userId);
      return res.json({ success: false, message: 'Cart not found' });
    }

    // Original total
    const originalTotal = cart.Cart_total;
    if (isNaN(originalTotal)) {
      console.error('Cart total is not a number:', originalTotal);
      return res.json({ success: false, message: 'Invalid cart total' });
    }

    // Calculate discount
    const discountPercentage = coupon.discount;
    if (isNaN(discountPercentage)) {
      console.error('Discount percentage is not a number:', discountPercentage);
      return res.json({ success: false, message: 'Invalid discount percentage' });
    }

    const calculatedDiscountAmount = (originalTotal * discountPercentage) / 100;
    if (isNaN(calculatedDiscountAmount)) {
      console.error('Calculated discount amount is not a number:', calculatedDiscountAmount);
      return res.json({ success: false, message: 'Invalid discount calculation' });
    }

    const finalTotal = originalTotal - calculatedDiscountAmount;
    if (isNaN(finalTotal)) {
      console.error('Final total is not a number:', finalTotal);
      return res.json({ success: false, message: 'Invalid final total' });
    }

    // Validate minimum price requirement
    if (originalTotal < coupon.minimumPrice) {
      console.warn('Cart total is less than minimum price for coupon:', coupon.minimumPrice);
      return res.json({ success: false, message: 'Cart total is less than the minimum required for this coupon' });
    }

    // Update cart
    cart.Cart_total = finalTotal;
    cart.discount = calculatedDiscountAmount; // Ensure this field is in your schema
    
    await cart.save();

    console.log('Coupon applied successfully:', couponCode);
    res.json({
      success: true,
      cart: {
        ...cart.toObject(),
        discount: calculatedDiscountAmount
      }
    });
  } catch (error) {
    console.error('Failed to apply coupon:', error);
    res.json({ success: false, message: 'Failed to apply coupon' });
  }
};



module.exports = { postcart, getcart, postremove, postupdate,cartcount,applyCoupon };
