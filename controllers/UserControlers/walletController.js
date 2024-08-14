require("dotenv").config();
const userModal = require('../../models/userModel')
const transactionModel = require('../../models/transactionModel')
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const getWalletInfo = async (req, res) => {
    try {
      if (req.session.isAuth) {
        const user = await userModal.findOne({ email: req.session.user.email });
        if (!user) {
          return res.status(404).send('User not found');
        }
  
        const transactions = await transactionModel.find({ userId: user._id }).sort({ date: -1 });
  
        res.render('user/wallet', {bal:user.balance, user: user.username , transactions });
      } else {
        res.redirect('/login'); // Redirect to login if not authenticated
      }
    } catch (error) {
      console.error('Error fetching wallet information:', error); // Log error for debugging
      res.status(500).send('Server Error'); // Send a generic error message to the user
    }
  };

// Route to create a Razorpay order
const createOrder = async (req, res) => {
    const { amount } = req.body;
    
    const options = {
        amount: amount * 100, // amount in the smallest currency unit (paise)
        currency: "INR",
        receipt: "receipt_order_" + Date.now(),
    };

    try {
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        res.status(500).send(error);
    }
};

const crypto = require('crypto');

const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
        const user = await userModal.findOne({ email: req.session.user.email });

        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }

        const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generatedSignature === razorpay_signature) {
            // Payment successful
            user.balance += parseFloat(amount);
            await user.save();  // Save the updated balance to the database

            // Create a new transaction
            const transaction = new transactionModel({
                userId: user._id,
                amount: parseFloat(amount),
                type: 'credit',
                description: 'Added funds to wallet'
            });

            await transaction.save();

            // Fetch updated user transactions
            
            // Render wallet page with updated balance and transactions
            res.json({ 
                status: "success", 
                message: "Payment verified successfully", 
                newBalance: user.balance 
            });
        } else {
            // Payment failed
            res.status(400).json({ status: "error", message: "Payment verification failed" });
        }
    } catch (err) {
        console.error("Error during payment verification:", err);
        res.status(500).json({ status: "error", message: "Failed to verify payment" });
    }
};


module.exports={createOrder,verifyPayment,getWalletInfo}

