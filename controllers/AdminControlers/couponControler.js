const couponModel = require("../../models/coupon");

const getCoupon = async ( req,res)=>{
    try {
        const admin = req.session.admin;
        const coupons = await couponModel.find({  });

        if (req.session.isAdmin) {
            res.render('admin/coupon',{
                activePage: 'coupon',
                admin:admin.username,
                coupons:coupons})
        }
    } catch (error) {
        console.log(error);
        
    }
}

const postCreateCoupon = async (req, res) => {
    try {
      const { couponCode, discount, minimumPrice, maxRedeem, expiry } = req.body;
  
      // Validation
      if (!couponCode || discount < 0 || minimumPrice < 0 || maxRedeem < 0 || !expiry) {
        return res.status(400).json({ success: false, message: 'Invalid input data' });
      }
  
      // Check if coupon code already exists
      const existingCoupon = await couponModel.findOne({ couponCode });
      if (existingCoupon) {
        return res.status(400).json({ success: false, message: 'Coupon code already exists' });
      }
  
      // Create new coupon
      const newCoupon = new couponModel({
        couponCode,
        discount,
        minimumPrice,
        maxRedeem,
        expiry: new Date(expiry),
        status: true, // default to active when created
      });
  
      // Save the coupon
      await newCoupon.save();
  
      return res.status(201).json({ success: true, message: 'Coupon created successfully' });
    } catch (error) {
      console.error('Error creating coupon:', error);
      return res.status(500).json({ success: false, message: 'Server error, please try again later' });
    }
  };




  const updateCoupon = async (req, res) => {
    try {
      const { couponCode, discount, minimumPrice, maxRedeem, expiry } = req.body;
  
      // Validation
      if (!couponCode || discount < 0 || minimumPrice < 0 || maxRedeem < 0 || !expiry) {
        return res.status(400).json({ success: false, message: 'Invalid input data' });
      }
  
      // Check if the coupon code already exists (excluding the current coupon)
      const existingCoupon = await couponModel.findOne({ 
        couponCode: couponCode, 
        _id: { $ne: req.params.id } 
      });
  
      if (existingCoupon) {
        return res.status(400).json({ success: false, message: 'Coupon code already exists' });
      }
  
      // Find and update the coupon
      const coupon = await couponModel.findByIdAndUpdate(
        req.params.id,
        {
          couponCode,
          discount,
          minimumPrice,
          maxRedeem,
          expiry: new Date(expiry),
        },
        { new: true } // Return the updated document
      );
  
      if (!coupon) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }
  
      return res.json({ success: true, message: 'Coupon updated successfully' });
    } catch (error) {
      console.error('Error updating coupon:', error);
      return res.status(500).json({ success: false, message: 'Server error, please try again later' });
    }
  };

  const updatestatus =  async (req, res) => {
    try {
      const coupon = await couponModel.findById(req.params.id);
    if (!coupon) {
      return res.json({ success: false, message: 'Coupon not found' });
    }

      coupon.status = !coupon.status;
    
    const updatedCoupon = await coupon.save();
    
    res.json({ 
      success: true, 
      message: 'Coupon status updated successfully',
      newStatus: updatedCoupon.status
    });
    } catch (error) {
      console.error(error);
      res.status(400).json({ success: false, message: 'Error updating coupon' });
    }
  };

 const getEditCoupon = async (req, res) => {
    try {
      const admin = req.session.admin;

      const coupon = await couponModel.findById(req.params.id);
      if (!coupon) {
        return res.status(404).send('Coupon not found');
      }
      res.render('admin/editCoupon', { coupon,activePage: 'coupon',admin:admin.username });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
    }
  };

  
module.exports={getCoupon,postCreateCoupon,getEditCoupon,updateCoupon,updatestatus}
