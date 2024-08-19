const orderModel = require('../../models/orderModel'); // Adjust the path as needed

async function generateWeeklyReport() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  return await generateReport(startDate, new Date());
}

async function generateMonthlyReport() {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  return await generateReport(startDate, new Date());
}

async function generateYearlyReport() {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  return await generateReport(startDate, new Date());
}

async function generateCustomReport(startDate, endDate) {
  return await generateReport(new Date(startDate), new Date(endDate));
}

async function generateReport(startDate, endDate) {
  const orders = await orderModel.find({
    createdAt: { $gte: startDate, $lte: endDate }
  }).populate('userId', 'username email')
  .populate('address')
  .populate('items.productId', 'name');

  let totalSales = 0;
  let totalCouponAmount = 0;
  let statusCounts = {
    Delivered: 0,
    Pending: 0,
    Returned: 0,
    Canceled: 0,
    Shipped: 0,
    ReturnConfirmed: 0,
    returned: 0,
    Intransit: 0
  };
  const totalDiscountData = await orderModel.aggregate([
    { $group: { _id: null, total: { $sum: "$totalSavings" } } }
  ]);
  const totalDiscount = totalDiscountData.length > 0 ? totalDiscountData[0].total : 0;

  const processedOrders = orders.map(order => {
    totalSales += order.amount;
    totalCouponAmount = totalDiscount
    statusCounts[order.status]++;

    return {
        ...order,
        createdAt: order.createdAt ? order.createdAt.toISOString() : new Date().toISOString(),
        userName: order.userId && order.userId.username ? order.userId.username : 'N/A',
        userEmail: order.userId && order.userId.email ? order.userId.email : 'N/A',
        shippedTo: order.address ? 
          `${order.address.street || ''}, ${order.address.city || ''}, ${order.address.state || ''}, ${order.address.pincode || ''}`.trim() : 
          'N/A',
        products: order.items && order.items.length > 0 ? order.items.map(item => ({
          name: item.productId && item.productId.name ? item.productId.name : 'N/A',
          rate: item.price || 0,
          quantity: item.quantity || 0,
          total: (item.price || 0) * (item.quantity || 0)
        })) : [],
        amount: order.amount || 0,
        payment: order.payment || 'N/A',
        status: order.status || 'N/A'
      };
    });
    return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalSales,
        totalCouponAmount,
        orderCount: orders.length,
        statusCounts,
        orders: processedOrders
      };
    }

module.exports = {
  generateWeeklyReport,
  generateMonthlyReport,
  generateYearlyReport,
  generateCustomReport
};