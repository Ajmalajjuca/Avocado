require("dotenv").config();

const userModel = require("../../models/userModel");
const addressModel = require("../../models/addressModel");
const orderModel = require("../../models/orderModel");
const productModel = require("../../models/productModel");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const getcheckout = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).populate("address");

    let addresses = [];
    if (user.address && user.address.address) {
      addresses = user.address.address;
    }

    res.render("user/checkout", {
      user: user.username,
      cart: req.cart,
      addresses,
    });
  } catch (error) {
    console.error("Error fetching user addresses:", error);
    res.status(500).send("An error occurred while loading the checkout page");
  }
};

const placeOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod } = req.body;
    const cart = req.cart;

    let shippingAddress;

    const user = await userModel.findById(req.user._id).populate("address");
    if (addressId === "new") {
      // Create new address
      if (!user.address) {
        const newAddressDoc = new addressModel({
          userId: user._id,
          address: [],
        });
        await newAddressDoc.save();
        user.address = newAddressDoc._id;
        await user.save();
      }

      const addressDoc = await addressModel.findById(user.address);

      const newAddress = {
        name: req.body.name,
        email: req.body.email,
        mobile: req.body.mobile,
        housename: req.body.housename,
        street: req.body.street,
        city: req.body.city,
        state: req.body.state,
        country: req.body.country,
        pincode: req.body.pincode,
        save_as: req.body.save_as,
      };

      addressDoc.address.push(newAddress);
      await addressDoc.save();

      shippingAddress = newAddress;
    } else {
      // Use existing address
      shippingAddress = user.address.address[parseInt(addressId)];
      if (!shippingAddress) {
        return res.status(400).send("Invalid address selected");
      }
    }

    // Check stock availability
    for (let item of cart.items) {
      const product = await productModel.findById(item.productId);
      if (!product) {
        return res
          .status(404)
          .send(`Product with ID ${item.productId} not found`);
      }
      if (product.stock < item.quantity) {
        return res
          .status(400)
          .send(`Insufficient stock for product: ${product.name}`);
      }
    }

    const orderItems = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
    }));

    // Create a new order with status "Pending"
    const order = new orderModel({
      userId: req.user._id,
      items: orderItems,
      address: shippingAddress,
      amount: cart.Cart_total,
      payment: paymentMethod,
      createdAt: new Date(),
      updated: new Date(),
      status: "Pending",
      paymentstatus: "Pending",
    });

    await order.save();

    // Handle payment method
    if (paymentMethod === "card") {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        order.paymentstatus = "Failed";
        await order.save();
        return res.status(400).json({ success: false, message: "Razorpay payment details are missing" });
      }

      const isPaymentVerified = verifyRazorpayPayment(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isPaymentVerified) {
        order.paymentstatus = "Failed";
        await order.save();
        return res.status(400).json({ success: false, message: "Payment verification failed" });
      }

      order.paymentstatus = "Confirmed";
      order.razorpay_order_id = razorpay_order_id;
      order.razorpay_payment_id = razorpay_payment_id;
    } else if (paymentMethod === "cod") {
      order.status = "Pending";
    }

    await order.save();

    // Reduce stock quantities
    for (let item of cart.items) {
      const product = await productModel.findById(item.productId);
      product.stock -= item.quantity;
      await product.save();
    }

    // Clear the user's cart
    cart.items = [];
    cart.Cart_total = 0;
    await cart.save();

    res.redirect("/order-confirmation/" + order._id);
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).send("An error occurred while placing your order");
  }
};

const getOrderConfirmation = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).populate("address");
    const order = await orderModel
      .findById(req.params.orderId)
      .populate("items.productId");
    if (!order) {
      return res.status(404).send("Order not found");
    }
    const total = order.items.reduce((sum, item) => sum + item.price, 0);
    order.total = total;
    res.render("user/order-confirmation", { order,user: user.username,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).send("An error occurred while fetching the order");
  }
};

const UpdateOrderStatus = async (req, res) => {
  try {
    const { orderId, newStatus } = req.body;
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const allowedStatusChanges = {
      pending: ["Canceled"],
      "in-transit": ["Canceled"],
      shipped: ["Canceled"],
      delivered: ["Returned"],
    };

    if (
      !allowedStatusChanges[order.status.toLowerCase()]?.includes(newStatus)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "This status change is not allowed" });
    }

    order.status = newStatus;
    await order.save();

    res.json({ success: true, message: "Order status updated successfully" });
  } catch (error) {
    console.error("Error updating order status:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while updating the order status",
      });
  }
};

const CancelOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.status.toLowerCase() !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "This order cannot be cancelled" });
    }

    order.status = "Canceled";
    await order.save();

    res.json({ success: true, message: "Order cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while cancelling the order",
      });
  }
};

const verifyRazorpayPayment = (
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature
) => {
  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(sign.toString())
    .digest("hex");

  return razorpay_signature === expectedSignature;
};

// New function to create Razorpay order
const createRazorpayOrder = async (req, res) => {
  try {
    const cart = req.cart;
    const options = {
      amount: cart.Cart_total * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: "order_receipt_" + Date.now(),
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: "Unable to create order" });
  }
};

module.exports = {
  getcheckout,
  placeOrder,
  getOrderConfirmation,
  UpdateOrderStatus,
  CancelOrder,
  createRazorpayOrder,
};
