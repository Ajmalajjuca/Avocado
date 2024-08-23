const productModel = require("../../models/productModel");
const cartModel = require("../../models/cartModel");
const userModal = require('../../models/userModel');
const couponModel = require('../../models/coupon');
const offerModel = require('../../models/offersModel');


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

    // Check for active offers
    const activeOffer = await offerModel.findOne({
      $or: [
        { productId: productId },
        { categoryId: product.category }
      ],
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    let price = product.price;
    if (activeOffer) {
      price = price * (1 - activeOffer.discount / 100);
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
      cart.items[productIndex].price = price;
      cart.items[productIndex].Product_total = Number((cart.items[productIndex].quantity * price).toFixed(2));
      cart.items[productIndex].stock = product.stock;
    } else {
      // Add new item
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
  const userId = req.user.id;

  try {
    const cart = await cartModel.findOne({ userId });
    if (!cart) {
      throw new Error('Cart not found');
    }

    const originalSubtotal = cart.Cart_total;

    // Validate the coupon code and calculate the discount
    const discountAmount = await validateAndCalculateDiscount(couponCode, originalSubtotal);
    
    // Apply the discount to the cart
    const updatedCart = await applyDiscountToCart(userId, discountAmount, couponCode);

    // Ensure the updatedCart includes the original subtotal
    updatedCart.originalSubtotal = originalSubtotal;

    res.json({ success: true, cart: updatedCart });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


async function validateAndCalculateDiscount(couponCode, cartTotal) {
  // Find the coupon in the database
try {
  const coupon = await couponModel.findOne({couponCode });
  
  

  if (!coupon) {
    throw new Error('Invalid coupon code');
  }

  // Check if the coupon is expired
  if (coupon.expirationDate < new Date()) {
    throw new Error('Coupon has expired');
  }

  // Check if the coupon has reached its usage limit
  if (coupon.usageCount >= coupon.maxUsage) {
    throw new Error('Coupon usage limit reached');
  }

  // Calculate the discount amount
  let discountAmount;
  
    discountAmount = (cartTotal * coupon.discount) / 100;
  
    
  

  // Apply maximum discount if applicable
  if (coupon.maxRedeem && discountAmount > coupon.maxRedeem) {
    discountAmount = coupon.maxRedeem;
  }

  // Ensure the discount doesn't exceed the cart total
  if (discountAmount > cartTotal) {
    discountAmount = cartTotal;
  }

  return discountAmount;
} catch (error) {
  console.error('error on discount caluclete>>>>>',error);
  
  
}
}


async function applyDiscountToCart(userId, discountAmount, couponCode) {
  // Find the user's cart
  const cart = await cartModel.findOne({ userId }).populate('items.productId');

  if (!cart) {
    throw new Error('Cart not found');
  }

  const totalBeforeDiscount = cart.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  // Apply the discount
  cart.discount = discountAmount;

  // Recalculate the total
  cart.Cart_total = totalBeforeDiscount - discountAmount;




  // Save the updated cart
  await cart.save();

  // Update the coupon usage count
  await couponModel.findOneAndUpdate(
    { code: couponCode },
    { $inc: { usageCount: 1 } }
  );

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

module.exports = { postcart, getcart, postremove, postupdate,cartcount,applyCoupon,checkStock };
