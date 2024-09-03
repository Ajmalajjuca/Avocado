
const orderModel = require('../../models/orderModel');
const userModel = require('../../models/userModel');

const getAllOrders = async (req, res) => {
    try {
      if (req.session.isAdmin) {
        const admin = req.session.admin;
        const currentPage = parseInt(req.query.page) || 1;
        const itemsPerPage = 20; // You can change this number as needed
        const search = req.query.search || '';
  
        // Fetch total count of orders
        const totalOrders = await orderModel.countDocuments({
          $or: [
            { orderId: { $regex: search, $options: 'i' } },
            { 'userId.username': { $regex: search, $options: 'i' } }
          ]
        });
  
        // Calculate total pages
        const totalPages = Math.ceil(totalOrders / itemsPerPage);
  
        // Fetch orders for the current page
        let orders = await orderModel.find({
          $or: [
            { orderId: { $regex: search, $options: 'i' } },
            { 'userId.username': { $regex: search, $options: 'i' } }
          ]
        })
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * itemsPerPage)
        .limit(itemsPerPage)
        .populate('userId', 'username email')
        .populate({
          path: 'items.productId',
          model: 'Product',
          select: 'name',
          populate: {
            path: 'category',
            model: 'categories',
            select: 'name'
          }
        })
        .lean()  // Convert to plain JavaScript objects
        .exec();
        
        orders = orders.map(order => ({
          ...order,
          items: order.items.filter(item => !item.isCancelled)
        }));
  
        res.render('admin/Orders', {
          orders,
          admin: admin.username,
          currentPage,
          totalPages,
          search,
           activePage: 'orders'
        });
      } else {
        res.redirect("/admin");
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).send('Server Error');
    }
  };
  

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    await orderModel.findByIdAndUpdate(orderId, { status });
    res.redirect('/admin/orders');
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).send('Server Error');
  }
};

const updatestatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;

        const updatedOrder = await orderModel.findByIdAndUpdate(orderId, { status: status }, { new: true });

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, message: 'Order status updated successfully', order: updatedOrder });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const orderDetails = async (req, res) => {
  try {
      const order = await orderModel.findById(req.params.orderId)
          .populate('userId')
          .populate('items.productId') 
          .exec();
      if (order) {
          res.json({ success: true, order });
      } else {
          res.json({ success: false, message: 'Order not found' });
      }
  } catch (error) {
      console.error('Error fetching order details:', error);
      res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports={getAllOrders,updateOrderStatus,updatestatus,orderDetails}