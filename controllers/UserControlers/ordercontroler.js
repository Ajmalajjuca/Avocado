require("dotenv").config();

const orderModel = require('../../models/orderModel')
const userModel = require("../../models/userModel");
const transactionModel = require('../../models/transactionModel');
const productModel = require('../../models/productModel');
const Razorpay = require("razorpay");
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const getUserOrders = async (req, res) => {
  try {
    if (req.session.isAuth) {
      const user = await userModel.findOne({ email: req.session.user.email });
      
      if (!user) {
        return res.status(404).send('User not found');
      }
      
      // Fetch orders of the logged-in user
      const orders = await orderModel.find({ userId: user._id })
        .populate({
          path: 'items.productId',
          select: 'name category images',
          populate: {
            path: 'category',
            model: 'categories',
            select: 'name'
          }
        })
        .sort({ createdAt: -1 })
        .exec();

      // Add 'allItemsCancelled' and 'canRetryPayment' flags for each order
      orders.forEach(order => {
        // Check if all items are cancelled
        order.allItemsCancelled = order.items.every(item => item.isCancelled);

        // Check if retry is still possible for pending payments
        order.canRetryPayment = (order.paymentstatus === 'Pending' && order.paymentRetryDeadline > new Date());
      });

      // Render the 'user/order' view with necessary data
      res.render('user/order', { 
        orders, 
        user: user.username,
        userEmail: user.email,
        userMobile: user.mobile,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      });
    } else {
      res.redirect('/login'); 
    }
  } catch (error) {
    console.error('Error fetching user orders:', error); 
    res.status(500).send('Server Error'); 
  }
};


const getOrderid = async (req, res) => {
  try {
    // Find the order by ID and populate user and product details
    const order = await orderModel.findById(req.params.orderId)
      .populate('userId')
      .populate('items.productId')
      .exec();

    if (!order) {
      return res.json({ success: false, message: 'Order not found' });
    }

    // Check if all items are cancelled
    const allItemsCancelled = order.items.every(item => item.isCancelled);

    // If all items are cancelled, update the order status to 'Cancelled'
    if (allItemsCancelled && order.status !== 'Cancelled') {
      order.status = 'Cancelled';
      await order.save(); // Save the updated status in the database
    }

    // Send the order data and allItemsCancelled flag as JSON
    res.json({ success: true, order, allItemsCancelled });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};



  
const postOrderCancel  = async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const reason = req.body.reason;
      
      // Find the order by ID
      const order = await orderModel.findById(orderId);
  
      if (!order) {
        return res.status(404).send('Order not found');
      }

      if (order.status.toLowerCase() !== "pending") {
        return res.status(400).json({ success: false, message: "This order cannot be cancelled" });
      }
  

      for (let item of order.items) {
        const product = await productModel.findById(item.productId);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }


      // Update the order status
      order.status = "Canceled";
      order.return.push({ reason, status: 'Pending' });
      await order.save();
      
      if (order.paymentstatus === "Completed") {
        const user = await userModel.findById(order.userId);
        user.balance += order.amount;
        await user.save();

        const transaction = new transactionModel({
          userId: user._id,
          amount: order.amount,
          type: "credit",
          description: `Refund for cancelled order #${order.orderId}`,
          balance: user.balance
        });
        await transaction.save();
      }
  
      res.json({ success: true, message: "Order cancelled successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
    }
  };
  
 const postOrderReturn = async (req, res) => {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
      const order = await orderModel.findById(orderId);


      if (!order) {
        return res.status(404).send('Order not found');
      }

      if (order.status.toLowerCase() !== "delivered") {
        return res.status(400).json({ success: false, message: "This order cannot be returned" });
      }
  
      // Update the order status
      order.status = "Returned";
      
      order.returnReason = reason;
      // Restore stock for each product in the order
    for (const item of order.items) {
      const product = await productModel.findById(item.productId);
      if (product) {
        product.stock += item.quantity; // Restore the stock
        await product.save();
      }
    }
      await order.save();

      if (order.paymentstatus === "Completed") {
        const user = await userModel.findById(order.userId);
        user.balance += order.amount;
        await user.save();

        const transaction = new transactionModel({
          userId: user._id,
          amount: order.amount,
          type: "credit",
          description: `Refund for returned order #${order.orderId}`,
          balance: user.balance
        });
        await transaction.save();
      }
  
      res.json({ success: true, message: "Return initiated successfully" });
  
    } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
    }
  };

  const retryPayment = async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const order = await orderModel.findById(orderId);
  
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
  
      if (order.paymentstatus === 'Completed') {
        return res.status(400).json({ success: false, message: 'Payment already completed' });
      }
  
      // Create a new Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: order.amount * 100, // Razorpay expects amount in paise
        currency: 'INR',
        receipt: order._id.toString()
      });
  
      res.json({
        success: true,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      });
    } catch (error) {
      console.error('Error retrying payment:', error);
      res.status(500).json({ success: false, message: 'An error occurred while retrying payment' });
    }
  };
  

  const verifyPayment = async (req, res) => {
    try {
      const { originalOrderId, paymentId, razorpayOrderId, signature } = req.body;
      
      const isPaymentVerified = verifyRazorpayPayment(razorpayOrderId, paymentId, signature);
  
      if (isPaymentVerified) {
        
        const order = await orderModel.findById(originalOrderId); 
         // Use original order ID to find the order
        order.paymentstatus = 'Completed';
        order.razorpay_payment_id = paymentId;
        order.razorpay_order_id = razorpayOrderId;
        await order.save();
  
        res.json({ success: true, message: 'Payment verified successfully' });
      } else {
        res.status(400).json({ success: false, message: 'Payment verification failed' });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({ success: false, message: 'An error occurred while verifying payment' });
    }
  };
  

  const verifyRazorpayPayment = (razorpayOrderId, paymentId, signature) => {
    try {
      const secret = process.env.RAZORPAY_KEY_SECRET; // Replace with your Razorpay secret key
  
      // Create the hash (signature) using HMAC SHA256
      const generatedSignature = crypto.createHmac('sha256', secret)
        .update(razorpayOrderId + '|' + paymentId)
        .digest('hex');
  
      // Compare the generated signature with the one provided by Razorpay
      return generatedSignature === signature;
    } catch (error) {
      console.error('Error verifying Razorpay payment signature:', error);
      return false;
    }
  };

  const cancelproduct =  async (req, res) => {
    try {
      const { productId, orderId, reason } = req.body;
  
      // Find the order containing the product
      const order = await orderModel.findOne({ _id: orderId, 'items.productId': productId });
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order or product not found' });
      }
  
      // Find the item to cancel
      const item = order.items.find(item => item.productId.toString() === productId);
if (item && !item.isCancelled) {
  const product = await productModel.findById(productId);
      if (product) {
        product.stock += item.quantity; // Restore the stock
        await product.save();
      }

      item.isCancelled = true;
      item.cancelReason = reason;
        
        // Calculate the refund amount
        const refundAmount = item.price * item.quantity;
  
        // Update the user's balance
        const user = await userModel.findById(order.userId);
        user.balance += refundAmount;
  
        // Update the total order amount
        order.amount -= refundAmount;
  
        // Create a transaction record
        const transaction = new transactionModel({
          userId: user._id,
          amount: refundAmount,
          type: 'credit',
          description: `Refund for product cancellation `,
          balance: user.balance
        });
  
        // Save the updated user, order, and transaction
        await user.save();
        await order.save();
        await transaction.save();
  
        res.json({ success: true, message: 'Product cancelled and order amount updated.' });
      } else {
        res.status(400).json({ success: false, message: 'Product already cancelled or not found' });
      }
    } catch (error) {
      console.error('Error cancelling product:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };


  
  const createRazorpayOrder = async (req, res) => {
    try {
      const { orderId } = req.params;
  
      // Find the order
      const order = await orderModel.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
  
      // Check if the order's payment status is 'Failed'
      if (order.paymentstatus !== 'Failed') {
        return res.status(400).json({ success: false, message: 'This order does not require payment retry' });
      }
  
      // Find the user
      const user = await userModel.findById(order.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      // Create a new Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(order.amount * 100), // Razorpay expects amount in paise
        currency: 'INR',
        receipt: order.orderId,
        payment_capture: 1,
        notes: {
          orderType: 'retry_payment',
          originalOrderId: orderId
        }
      });
  
      // Update the order with the new Razorpay order ID
      order.razorpay_order_id = razorpayOrder.id;
      await order.save();
  
      // Send the response
      res.json({
        success: true,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: 'INR',
        orderId: order.orderId,
        customerName: order.address.name,
        customerEmail: order.address.email,
        customerPhone: order.address.mobile,
        userId: user._id.toString()
      });
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      res.status(500).json({ success: false, message: 'Error creating Razorpay order', error: error.message });
    }
  };
  
  module.exports = { getOrderid,postOrderCancel,postOrderReturn,getUserOrders,retryPayment,verifyPayment ,cancelproduct,createRazorpayOrder};