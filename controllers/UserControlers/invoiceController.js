const userModel = require('../../models/userModel')
const orderModel = require('../../models/orderModel')
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { rgb } = require('pdf-lib');
const nodemailer = require('nodemailer');

// Download Invoice
const downloadInvoice = async (req, res) => {
  const { orderId } = req.params;
  
  try {
      // Fetch the invoice data from your database or generate the invoice
      const invoiceData = await getInvoiceData(orderId);
  
      // Generate the invoice PDF buffer
      const pdfBuffer = await generateInvoiceFile(invoiceData);

      // Set the appropriate headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);
      
      // Send the PDF buffer
      res.send(pdfBuffer);

  } catch (error) {
      console.error('Error in downloadInvoice:', error);
      res.status(500).send('Error generating invoice');
  }
};
  
  // Send Invoice
  const sendInvoice = async (req, res) => {
    const { orderId } = req.params;
    
    try {
      // Fetch the invoice data from your database or generate the invoice
      const invoiceData = await getInvoiceData(orderId);
      
      // Generate the PDF buffer
      const pdfBuffer = await generateInvoiceFile(invoiceData);
      
      // Send the email with the PDF attachment
      await sendInvoiceEmail({ ...invoiceData, pdfBuffer });
      
      console.log('Invoice sent successfully for order:', orderId);
      res.status(200).json({ message: 'Invoice sent successfully' });
        } catch (error) {
          console.error('Error sending invoice:', error);
          res.status(500).json({ error: 'Error sending invoice email', details: error.message });
    }
  };





  async function sendInvoiceEmail(invoiceData) {
    const { order, pdfBuffer } = invoiceData;
  
    // Create a transporter for sending emails
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  
    // Define the email options
    const mailOptions = {
      from: 'avocado.ajmal@gmail.com',
      to: order.address.email,
      subject: `Invoice #${order.orderId}`,
      text: `Dear ${order.address.name},
  
  Please find attached the invoice for your order #${order.orderId}.
  
  Thank you for your business.
  
  Best regards,
  Avocado Team`,
      attachments: [
        {
          filename: `invoice_${order.orderId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };
  
    // Send the email
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent: ' + info.response);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  const getInvoice =async (req,res)=>{
  
    try {
      
      
      const user = await userModel.findById(req.user._id).populate("address");
      const order = await orderModel
        .findById(req.params.id)
        .populate("items.productId");
  
      if (!order) {
        return res.status(404).send("Order not ");
      }
  
      // Calculate subtotal
      const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
      // Calculate total savings (including product discounts and coupon)
      const totalSavings = order.totalSavings || 0;
  
      // Calculate final total
      const finalTotal = subtotal - totalSavings;
  
      res.render("user/invoice", { 
        order,
        user: user.username,
        subtotal,
        totalSavings,
        finalTotal
      });
  } catch (error) {
    console.error("Error fetching Invoice:", error);
    res.status(500).send("An error occurred while fetching the Invoice");
    
  }
}




async function getInvoiceData(orderId) {
    try {
      // Check if the orderId is in a valid format
      if (!mongoose.isValidObjectId(orderId)) {
        throw new Error(`Invalid order ID: ${orderId}`);
      }
  
      const order = await orderModel.findById(orderId)
        .populate('items.productId')
        .exec();
  
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found.`);
      }
  
      const subtotal = order.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);
  
      const totalSavings = order.totalSavings; // Calculate the total savings, if any
  
      const finalTotal = subtotal - totalSavings;
      
      return {
        order,
        subtotal,
        totalSavings,
        finalTotal
      };
    } catch (error) {
      throw new Error(`Error fetching invoice data: ${error.message}`);
    }
  }

  function generateInvoiceFile(invoiceData) {
    return new Promise((resolve, reject) => {
        if (!invoiceData || !invoiceData.order) {
            reject(new Error('Invalid invoice data: order is missing'));
            return;
        }

        const { order, subtotal, totalSavings, finalTotal } = invoiceData;
        

        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
      });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            resolve(pdfBuffer);
        });

        doc.font('Helvetica');

        // Add content to the PDF
        let y = addInvoiceHeader(doc, order, 0);
        y = addInvoiceDetails(doc, order, y);
        y = addInvoiceTable(doc, order.items, y);
        y = addInvoiceSummary(doc, subtotal, totalSavings, finalTotal, y);
        addInvoiceFooter(doc, 'Thank you for your purchase!');

        doc.end();
    });
}
  
function addInvoiceHeader(doc, order, y) {
  // Add a background color to the header
  doc.rect(0, 0, doc.page.width, 150).fill('#f0f0f0');

  // Add logo
  const logoPath = path.join(__dirname, '..', '..', 'public', 'user', 'img', 'Avocado logo.png');
  try {
      doc.image(logoPath, 50, 30, { width: 100 });
  } catch (error) {
      console.error('Error loading logo:', error);
      doc.fontSize(24).text('AVOCADO', 50, 50);
  }

  // Add invoice title and number
  doc.fontSize(28).fillColor('#333333').text('INVOICE', 400, 50, { align: 'right' });
  doc.fontSize(12).fillColor('#666666').text(`#${order.orderId}`, 400, 80, { align: 'right' });

  // Add date
  doc.fontSize(10).fillColor('#666666').text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 400, 100, { align: 'right' });

  return 170; // Return new y position
}

function addInvoiceDetails(doc, order, y) {
  doc.fontSize(12).fillColor('#333333').text('Billed To:', 50, y);
  doc.fontSize(10).fillColor('#666666');
  y += 20;
  doc.text(order.address.name, 50, y);
  y += 15;
  doc.text(order.address.housename + ', ' + order.address.street, 50, y);
  y += 15;
  doc.text(order.address.city + ', ' + order.address.state + ' ' + order.address.pincode, 50, y);
  y += 15;
  doc.text(order.address.mobile, 50, y);
  y += 15;
  doc.text(order.address.email, 50, y);

  return y + 30;
}

function addInvoiceTable(doc, items, y) {
  // Table header
  doc.fillColor('#ffffff').rect(50, y, doc.page.width - 100, 20).fill('#4CAF50');
  doc.fontSize(10).fillColor('#ffffff');
  doc.text('Item', 60, y + 5);
  doc.text('Cost', 300, y + 5);
  doc.text('Qty', 400, y + 5);
  doc.text('Price', 500, y + 5);
  y += 25;

  // Table rows
  items.forEach((item, index) => {
      if (index % 2 === 0) {
          doc.fillColor('#f9f9f9').rect(50, y - 5, doc.page.width - 100, 20).fill();
      }
      doc.fillColor('#333333').fontSize(10);
      doc.text(item.productId.name, 60, y);
      doc.text(item.price.toFixed(2), 300, y);
      doc.text(item.quantity.toString(), 400, y);
      doc.text((item.price * item.quantity).toFixed(2), 500, y);
      y += 20;
  });

  return y + 10;
}

function addInvoiceSummary(doc, subtotal, totalSavings, finalTotal, y) {
  doc.fontSize(10).fillColor('#666666');
  doc.text(`Subtotal:`, 400, y);
  doc.text(`${subtotal.toFixed(2)}`, 500, y, { align: 'right' });
  y += 20;
  doc.text(`Discount:`, 400, y);
  doc.text(`${totalSavings.toFixed(2)}`, 500, y, { align: 'right' });
  y += 20;
  doc.text(`Tax:`, 400, y);
  doc.text(`₹ 0.00`, 500, y, { align: 'right' });
  y += 25;

  doc.fontSize(14).fillColor('#4CAF50');
  doc.text(`Total:`, 400, y);
  doc.text(`${finalTotal.toFixed(2)}`, 500, y, { align: 'right' });

  return y + 30;
}

function addInvoiceFooter(doc, note) {
  const footerY = doc.page.height - 100;
  doc.fillColor('#f0f0f0').rect(0, footerY, doc.page.width, 100).fill();
  
  doc.fontSize(9).fillColor('#666666');
  doc.text(note, 50, footerY + 20, { width: doc.page.width - 100, align: 'center' });
  
  doc.fontSize(8).fillColor('#999999');
  doc.text('Help us go green! Please consider the environment before printing this invoice.', 50, footerY + 40, { width: doc.page.width - 100, align: 'center' });
  
}


  module.exports={downloadInvoice,sendInvoice,getInvoice}