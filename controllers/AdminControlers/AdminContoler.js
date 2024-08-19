const userModel = require("../../models/userModel");
const orderModel = require('../../models/orderModel');
const productModel = require('../../models/productModel');
const {
  generateWeeklyReport,
  generateMonthlyReport,
  generateYearlyReport,
  generateCustomReport
} = require('./reportGenerator');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

const bcrypt = require("bcrypt");


const getLogin = async (req, res) => {
        try{
                if (req.session.isAdmin) {
                        const user = await userModel.findOne({email:req.session.user.email})
                        res.redirect("/admin/dashboard",{user:user.username});
                      } else {
                        res.render("admin/adminLogin",{error:req.flash("error")});
                      }
        }catch(err){
                console.log("rendering error:",err);     
        }
  
};
const getLogout = async(req,res)=>{
    req.session.destroy((err)=>{
      if(err){
        console.log("Logout error:",err);
        return res.status(500).send("Unable to logout. Please try again.");

      }
      res.redirect("/admin")
    })
}
const postLogin = async (req, res) => {
        try {
          if (!req.session.isAdmin) {
            const { email, password } = req.body;
      
            // Logging for debugging
            
      
            const user = await userModel.findOne({ email });
      
            // Logging for debugging
            console.log("User: ", user);
      
            if (!user) {
              req.flash("error", "Invalid email");
              return res.redirect("/admin");
            }
            if (!user.isAdmin) {
              req.flash("error", "You are not an admin");
              return res.redirect("/admin");
            }
      
            // Ensure that user.password is defined
            if (!user.password) {
              req.flash("error", "User password not found");
              return res.redirect("/admin");
            }
      
            
      
            const isValidPassword = await bcrypt.compare(password, user.password);
      
            if (!isValidPassword) {
              req.flash("error", "Invalid password");
              return res.redirect("/admin");
            }
      
            req.session.isAdmin = true;
            req.session.admin = user;
            return res.redirect("/admin/dashboard");
          } else {
            return res.redirect("/admin/dashboard");
          }
        } catch (err) {
          console.error("Error logging in Admin login: ", err);
          req.flash("error", "Something went wrong");
          return res.redirect("/admin");
        }
      };
      

const getDashboard = async (req, res) => {
  try {
    if (req.session.isAdmin) {
        const users = await userModel.findOne({isAdmin:false})
        const admin = req.session.admin;
        const totalSalesData = await orderModel.aggregate([
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalSales = totalSalesData.length > 0 ? totalSalesData[0].total : 0;

        const totalDiscountData = await orderModel.aggregate([
          { $group: { _id: null, total: { $sum: "$totalSavings" } } }
        ]);
        const totalDiscount = totalDiscountData.length > 0 ? totalDiscountData[0].total : 0;
    
        // Get total number of orders
        const orderCount = await orderModel.countDocuments();
    
        // Get total number of products
        const productCount = await productModel.countDocuments();
    
        // Get monthly earning (assuming current month)
        const currentDate = new Date();
        const monthlyEarningData = await orderModel.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                $lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
              }
            }
          },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const monthlyEarning = monthlyEarningData.length > 0 ? monthlyEarningData[0].total : 0; 
        const totalUser =   await userModel.countDocuments()    
        const pendingOrder = await orderModel.find({status:"Pending"}).countDocuments()  
        const ConfirmedOrder = await orderModel.find({status:"Confirmed"}).countDocuments()
       
        res.render("admin/Dashboard",{
          users:users,
          admin:admin.username,
          activePage: 'dashboard',
          totalSales,
          orderCount,
          productCount,
          monthlyEarning,
          totalUser,
          pendingOrder,
          ConfirmedOrder,
          totalDiscount
        })
    }else{
        redirect("/admin")
    }
  } catch (err) {
        console.error("Error accuerd is getDashbard",err)
        req.flash("error", "something Went Wrong");
        return res.redirect("/admin");
  }
};




// const getOrders=async(req,res)=>{
//         try {
//                 if (req.session.isAdmin) {
//                     const users = await userModel.findOne({isAdmin:false})
//                     const admin = req.session.admin;
                   
//                     res.render("admin/Orders",{users:users,admin:admin.username})
//                 }else{
//                     redirect("/admin")
//                 }
//               } catch (err) {
//                     console.error("Error accuerd is getDashbard",err)
//                     req.flash("error", "something Went Wrong");
//                     return res.redirect("/admin");
//               }
// }

// const getaddProducts=async(req,res)=>{
//         try {
//                 if (req.session.isAdmin) {
//                     const users = await userModel.findOne({isAdmin:false})
//                     const admin = req.session.admin;
                   
//                     res.render("Admin/addProducts",{users:users,admin:admin.username})
//                 }else{
//                     redirect("/admin")
//                 }
//               } catch (err) {
//                     console.error("Error accuerd is getDashbard",err)
//                     req.flash("error", "something Went Wrong");
//                     return res.redirect("/admin");
//               }
// }


const generateReport = async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.body;
    let report;

    switch (reportType) {
      case 'weekly':
        report = await generateWeeklyReport();
        break;
      case 'monthly':
        report = await generateMonthlyReport();
        break;
      case 'yearly':
        report = await generateYearlyReport();
        break;
      case 'custom':
        report = await generateCustomReport(startDate, endDate);
        break;
      default:
        throw new Error('Invalid report type');
    }
    req.session.report = report;

    res.json({ success: true });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ success: false, error: 'Error generating report' });  }
};

const report = (req, res) => {
  const report = req.session.report;
  if (!report) {
    return res.redirect('/admin/dashboard');
  }
  console.log('report>>>',report);
  
  res.render('admin/report', { 
    report,
    getStatusColor: (status) => {
      switch(status) {
        case 'Delivered': return 'success';
        case 'Pending': return 'warning';
        case 'ReturnConfirm': return 'info';
        case 'Cancelled': return 'danger';
        default: return 'secondary';
      }
    }
  });
};



const downloadReport = (req, res) => {
  const report = req.session.report;
  const format = req.query.format;

  if (!report) {
    return res.status(400).send('No report data available');
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
    
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Sales Report', { align: 'center' });
    doc.moveDown();

    // Date Range
    doc.fontSize(12).text(`From: ${new Date(report.startDate).toLocaleDateString()} To: ${new Date(report.endDate).toLocaleDateString()}`);
    doc.moveDown();

    // Summary
    doc.fontSize(14).text('Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Sales: ₹${report.totalSales.toFixed(2)}`);
    doc.text(`Total Orders: ${report.orderCount}`);
    doc.text(`Total Coupon Amount: ₹${report.totalCouponAmount.toFixed(2)}`);
    doc.text(`Total Revenue: ₹${(report.totalSales - report.totalCouponAmount).toFixed(2)}`);
    doc.moveDown();

    // Order Status
    doc.fontSize(14).text('Order Status', { underline: true });
    doc.fontSize(12);
    Object.entries(report.statusCounts).forEach(([status, count]) => {
      doc.text(`${status}: ${count}`);
    });
    doc.moveDown();

    // Table
    const table = {
      headers: ['Order ID', 'Date', 'User', 'Shipped To', 'Products', 'Total Amount', 'Payment', 'Status'],
      rows: report.orders.map(order => [
        order.orderId || 'N/A',
        new Date(order.createdAt).toLocaleDateString(),
        `${order.userName || 'N/A'}`,
        order.shippedTo || 'N/A',
        (order.products || []).map(p => `${p.name || 'N/A'} - ₹${p.rate || 0} x ${p.quantity || 0} = ₹${p.total || 0}`).join('\n'),
        `₹${order.amount ? order.amount.toFixed(2) : 'N/A'}`,
        order.payment || 'N/A',
        order.status || 'N/A'
      ])
    };

    doc.fontSize(14).text('Order Details', { underline: true });
    doc.moveDown();
    doc.fontSize(8);

    const startX = 30;
    const startY = doc.y;
    const pageWidth = doc.page.width - 60;
    const columnWidths = [60, 60, 100, 120, 180, 70, 70, 70];
    const rowHeight = 20;

    const drawLine = (x1, y1, x2, y2) => {
      doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
    };

    // Draw headers
    let currentX = startX;
    table.headers.forEach((header, i) => {
      doc.text(header, currentX, startY, { width: columnWidths[i], align: 'center' });
      currentX += columnWidths[i];
    });

    // Draw horizontal line after headers
    drawLine(startX, startY + rowHeight, startX + pageWidth, startY + rowHeight);

    // Draw rows
    let currentY = startY + rowHeight;
    table.rows.forEach((row, rowIndex) => {
      const maxRowHeight = Math.max(...row.map(cell => doc.heightOfString(cell, { width: columnWidths[row.indexOf(cell)] })));
      
      if (currentY + maxRowHeight > doc.page.height - 30) {
        doc.addPage();
        currentY = 30;
        // Redraw headers on new page
        currentX = startX;
        table.headers.forEach((header, i) => {
          doc.text(header, currentX, currentY, { width: columnWidths[i], align: 'center' });
          currentX += columnWidths[i];
        });
        currentY += rowHeight;
        drawLine(startX, currentY, startX + pageWidth, currentY);
      }

      currentX = startX;
      row.forEach((cell, i) => {
        doc.text(cell, currentX, currentY, { width: columnWidths[i], align: 'left' });
        currentX += columnWidths[i];
      });

      currentY += maxRowHeight + 5;
      
      // Draw horizontal line after each row
      drawLine(startX, currentY, startX + pageWidth, currentY);
    });

    // Draw vertical lines
    let lineX = startX;
    columnWidths.forEach(width => {
      drawLine(lineX, startY, lineX, currentY);
      lineX += width;
    });
    drawLine(lineX, startY, lineX, currentY);

    doc.end();
  } else if (format === 'csv')  {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.csv');

    const csvRows = [];

    // Header
    csvRows.push('Sales Report');
    csvRows.push(`From: ${new Date(report.startDate).toLocaleDateString()} To: ${new Date(report.endDate).toLocaleDateString()}`);
    csvRows.push('');

    // Summary
    csvRows.push('Summary');
    csvRows.push(`Total Sales, ₹${report.totalSales.toFixed(2)}`);
    csvRows.push(`Total Orders, ${report.orderCount}`);
    csvRows.push(`Total Coupon Amount, ₹${report.totalCouponAmount.toFixed(2)}`);
    csvRows.push(`Total Revenue, ₹${(report.totalSales - report.totalCouponAmount).toFixed(2)}`);
    csvRows.push('');

    // Order Status
    csvRows.push('Order Status');
    Object.entries(report.statusCounts).forEach(([status, count]) => {
      csvRows.push(`${status}, ${count}`);
    });
    csvRows.push('');

    // Table Headers
    csvRows.push(['Order ID', 'Date', 'User', 'Shipped To', 'Products', 'Total Amount', 'Payment', 'Status'].join(','));

    // Table Rows
    report.orders.forEach(order => {
      const products = (order.products || []).map(p => `${p.name || 'N/A'} - ₹${p.rate || 0} x ${p.quantity || 0} = ₹${p.total || 0}`).join(' | ');
      csvRows.push([
        order.orderId || 'N/A',
        new Date(order.createdAt).toLocaleDateString(),
        `${order.userName || 'N/A'}`,
        order.shippedTo || 'N/A',
        `"${products}"`, // Wrapping in quotes to handle potential commas in product details
        `₹${order.amount ? order.amount.toFixed(2) : 'N/A'}`,
        order.payment || 'N/A',
        order.status || 'N/A'
      ].join(','));
    });

    res.send(csvRows.join('\n'));
  } else {
    res.status(400).send('Invalid format specified');
  }
};

module.exports = { getLogin, postLogin, getDashboard ,getLogout,generateReport, report, downloadReport};
