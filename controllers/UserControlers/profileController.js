const orderModel = require("../../models/orderModel")
const userModal = require("../../models/userModel");
const transactionModel = require("../../models/transactionModel");
const userModel = require("../../models/userModel");
const bcrypt = require("bcrypt");
const {isValidPassword,} = require("../../validation/regexValidation");




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
                  select: 'name' // Adjust to include fields you need from Product schema
              })
              .exec();
          
          res.render('user/order', { orders, user: user.username });
      } else {
          res.redirect('/login'); 
      }
  } catch (error) {
      console.error('Error fetching user orders:', error); 
      res.status(500).send('Server Error'); 
  }
};



  

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
  
  const addFunds = async (req, res) => {
    try {
      if (req.session.isAuth) {
        const { amount } = req.body;
        const user = await userModal.findOne({ email: req.session.user.email });
  
        // Ensure amount is a positive number
        if (amount <= 0) {
          return res.status(400).send('Invalid amount');
        }
  
        // Log current balance
  
        // Update user's balance
        user.balance += parseFloat(amount);
        await user.save();
  
        // Log updated balance
  
        // Create a new transaction
        const transaction = new transactionModel({
          userId: user._id,
          amount: parseFloat(amount),
          type: 'credit',
          description: 'Added funds to wallet'
        });
  
        await transaction.save();
  
        // Fetch updated user information
        const updatedUser = await userModel.findOne({ email: req.session.user.email });
  
        // Fetch user transactions
        const transactions = await transactionModel.find({ userId: user._id }).sort({ date: -1 });
  
        // Log updated user balance
  
        res.render('user/wallet', {  bal:user.balance, user:user.username , transactions });
      } else {
        res.redirect('/login'); // Redirect to login if not authenticated
      }
    } catch (error) {
      console.error('Error adding funds:', error); // Log error for debugging
      res.status(500).send('Server Error'); // Send a generic error message to the user
    }
  };
  const ChangePass = async(req,res)=>{
    try {
      const messages = {
        error: req.flash('error'),
        info: req.flash('info'),
        success: req.flash('success')
      };
      if(req.session.isAuth){
        const user = await userModal.findOne({ email: req.session.user.email });
        if(!user){
          return res.status(404).send('User not found');
        }
        res.render('user/ChangePass',{user:user.username,messages})
      }else{
        res.redirect('/login')
      }
    } catch (error) {
      console.error('Error adding funds:', error); // Log error for debugging
      res.status(500).send('Server Error');
      
    }
  }


const changePassword = async (req, res) => {
  try {
    const {  newPassword, confirmPassword } = req.body;
    if(!isValidPassword(newPassword)){
      req.flash('error', 'Invalid password');
      return res.redirect('/ChangePass');
    }
    // Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      req.flash('error', 'New password and confirm password do not match.');
      return res.redirect('/ChangePass');
    }

    // Get the current user
    const user = await userModal.findById(req.user._id);

    // Check if the current password is correct
    

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    req.flash('success', 'Password changed successfully.');
    res.redirect('/logout'); // Or wherever you want to redirect after successful password change
  } catch (error) {
    console.error('Error changing password:', error);
    req.flash('error', 'An error occurred while changing your password.');
    res.redirect('/ChangePass');
  }
};


  
  

  module.exports = {
    getUserOrders,
    getWalletInfo,
    addFunds,
    ChangePass,
    changePassword,
    
  }