const offerModele = require('../../models/offersModel');
const productModel = require('../../models/productModel');
const categorieModel = require('../../models/categorieModel')

const getAllOffers = async (req, res) => {
  try {
    if (req.session.isAdmin) {
    const admin = req.session.admin;
    const offers = await offerModele.find()
      .populate('productId')
      .populate('categoryId');

      const categories = await categorieModel.find({ status: true });
      const products = await productModel.find({ status: true });

    res.render('admin/offers', { offers, categories, products, activePage: 'offer',admin:admin.username,});
  } else {
    redirect("/admin");
  }
  } catch (error) {
    console.error('get offer error',error)
    req.flash("error", "something Went Wrong");
    return res.redirect("/admin");
  }
};

const getOfferById = async (req, res) => {
  try {
    const offer = await offerModele.findById(req.params.id)
      .populate('productId')
      .populate('categoryId');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching offer', error: error.message });
  }
};

const createOffer = async (req, res) => {
    try {
        const { offerName, discount, startDate, endDate, offerType, categoryId, productId } = req.body;
        
        const newOffer = new offerModele({
          offerName,
          discount,
          startDate,
          endDate,
          offerType,
          categoryId: offerType === 'category' ? categoryId : undefined,
          productId: offerType === 'product' ? productId : undefined
        });
    
        await newOffer.save();
        res.status(201).json({ message: 'Offer created successfully', offer: newOffer });
      }  catch (error) {
    res.status(400).json({ message: 'Error creating offer', error: error.message });
  }
};

const updateOffer = async (req, res) => {
    try {
      const { offerId, offerName, discount, startDate, endDate, offerType, categoryId, productId } = req.body;
      
      const updatedOffer = await offerModele.findByIdAndUpdate(offerId, {
        offerName,
        discount,
        startDate,
        endDate,
        offerType,
        categoryId: offerType === 'category' ? categoryId : undefined,
        productId: offerType === 'product' ? productId : undefined
      }, { new: true });
  
      if (!updatedOffer) {
        req.flash('error', 'Offer not found');
        return res.redirect('/admin/offer');
      }
      
      res.json({ message: 'Offer updated successfully', offer: updatedOffer });
    } catch (error) {
      console.error('Error updating offer:', error);
      req.flash('error', 'Error updating offer');
      res.redirect('/admin/offer');
    }
  };

const deleteOffer = async (req, res) => {
  try {
    const deletedOffer = await offerModele.findByIdAndDelete(req.params.id);
    if (!deletedOffer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting offer', error: error.message });
  }
};

module.exports={getAllOffers,getOfferById,createOffer,updateOffer,deleteOffer}