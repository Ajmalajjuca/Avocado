const userModal = require("../../models/userModel");
const bcrypt = require("bcrypt");
const {isValidPassword,} = require("../../validation/regexValidation");








  


  

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

    ChangePass,
    changePassword,
    
  }