
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
        const totalOrders = await orderModel.countDocuments();
  
        // Calculate total pages
        const totalPages = Math.ceil(totalOrders / itemsPerPage);
  
        // Fetch orders for the current page
        const orders = await orderModel.find({
          $or: [
            { orderId: { $regex: search, $options: 'i' } },
            { 'userId.username': { $regex: search, $options: 'i' } }
          ]
        })
        .skip((currentPage - 1) * itemsPerPage)
        .limit(itemsPerPage)
        .populate('userId', 'username email')
        .populate('items.productId', 'name');
  
        res.render('admin/Orders', {
          orders,
          admin: admin.username,
          currentPage,
          totalPages,
          search
        });
      } else {
        res.redirect("/admin/orders");
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

module.exports={getAllOrders,updateOrderStatus,updatestatus}