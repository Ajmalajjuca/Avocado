const orderModel = require('../../models/orderModel')


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
      console.log('reason is>>>',reason);
      
      // Find the order by ID
      const order = await orderModel.findById(orderId);
  
      if (!order) {
        return res.status(404).send('Order not found');
      }
  
      // Update the order status
      order.status = 'canceled';
      await order.save(); // Save the updated order
  
      res.sendStatus(200); // Send success response
    } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
    }
  };
  
 const postOrderReturn = async (req, res) => {
    try {
      const orderId = req.params.orderId;
      // Find the order by ID
      const order = await orderModel.findById(orderId);
  
      if (!order) {
        return res.status(404).send('Order not found');
      }
  
      // Update the order status
      order.status = 'returned'; // Ensure 'returned' status is defined in your system
      await order.save(); // Save the updated order
  
      res.sendStatus(200); // Send success response
    } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
    }
  };

  module.exports = { getOrderid,postOrderCancel,postOrderReturn };