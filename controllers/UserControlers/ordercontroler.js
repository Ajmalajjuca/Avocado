const orderModel = require('../../models/orderModel')
const userModel = require("../../models/userModel");
const transactionModel = require('../../models/transactionModel');
const productModel = require('../../models/productModel');



const getUserOrders = async (req, res) => {
  try {
      if (req.session.isAuth) {
          const user = await userModel.findOne({ email: req.session.user.email });
          
          if (!user) {
              return res.status(404).send('User not found');
          }
          
          // Populate the product details in order items and address if needed
          const orders = await orderModel.find({ userId: user._id })
          .populate({
            path: 'items.productId',
          select: 'name category images',
          populate: {
            path: 'category',
            model: 'categories',  // Make sure this matches your category model name
            select: 'name'// Select the category name
            }
        })
          .sort({ createdAt: -1 }) // Sorts by createdAt field in descending order (most recent first)
          .exec();
          
          

          
          
          
        if (orders.length > 0 && orders[0].items.length > 0) {
        }
          
          res.render('user/order', { orders, user: user.username, });
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
      
      // Find the order by ID
      const order = await orderModel.findById(req.params.orderId)
          .populate('userId')
          .populate('items.productId') 
          .exec();
  
      if (!order) {
        return res.json({ success: false, message: 'Order not found' });
      }
  
      res.json({ success: true, order });// Send order data as JSON
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
  
      // Update the order status
      order.status = "Canceled";
      order.return.push({ reason, status: 'Pending' });
      await order.save();
      
      if (order.paymentstatus === "Confirmed") {
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
      await order.save();

      if (order.paymentstatus === "Confirmed") {
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

  module.exports = { getOrderid,postOrderCancel,postOrderReturn,getUserOrders };