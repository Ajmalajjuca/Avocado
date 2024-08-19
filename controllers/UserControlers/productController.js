const productModel = require('../../models/productModel');
const categoriesModel = require("../../models/categorieModel")
const offerModel = require('../../models/offersModel');



const getProductDetails = async (req, res) => {
    try {
      const productId = req.params.id;
      const product = await productModel.findById(productId).populate('category').exec();
      const categories = await categoriesModel.find({ status: true });
      const products = await productModel.find({ status: true });
      const relatedProducts = await productModel.find({
        category: product.category,
        _id: { $ne: product._id }
      }).limit(4);
  
      if (!product) {
        return res.status(404).render('404', { pageTitle: 'Product Not Found' });
      }
  
      // Fetch active offers
      const activeOffers = await offerModel.find({
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      });
  
      // Apply offers to products
      const applyOffers = (products) => {
        return products.map(product => {
          const applicableOffer = activeOffers.find(offer =>
            (offer.offerType === 'product' && offer.productId.toString() === product._id.toString()) ||
            (offer.offerType === 'category' && offer.categoryId.toString() === product.category._id.toString())
          );
  
          if (applicableOffer) {
            const discountedPrice = product.price * (1 - applicableOffer.discount / 100);
            return {
              ...product.toObject(),
              offerPrice: discountedPrice,
              offer: applicableOffer
            };
          }
  
          return product;
        });
      };
  
      const productWithOffer = applyOffers([product])[0];
      const relatedProductsWithOffers = applyOffers(relatedProducts);
  
      res.render('user/productDetails', {
        product: productWithOffer,
        products: products,
        categories: categories,
        relatedProducts: relatedProductsWithOffers
      });
    } catch (error) {
      console.error('Error fetching product details:', error);
      res.render("user/404Error");
    }
  };

const getcategoriesProduct = async (req, res) => {
    try {
      const category = await categoriesModel.findById(req.params.id);
      const categories = await categoriesModel.find();
      const products = await productModel.find({ category: req.params.id });
  
      if (!category) {
        return res.status(404).send('Category not found');
      }
  
      // Fetch active offers
      const activeOffers = await offerModel.find({
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      });
  
      // Apply offers to products
      const applyOffers = (products) => {
        return products.map(product => {
          const applicableOffer = activeOffers.find(offer =>
            (offer.offerType === 'product' && offer.productId.toString() === product._id.toString()) ||
            (offer.offerType === 'category' && offer.categoryId.toString() === product.category._id.toString())
          );
  
          if (applicableOffer) {
            const discountedPrice = product.price * (1 - applicableOffer.discount / 100);
            return {
              ...product.toObject(),
              offerPrice: discountedPrice,
              offer: applicableOffer
            };
          }
  
          return product;
        });
      };
  
      const productsWithOffers = applyOffers(products);
  
      res.render('user/particularProduct', { category, products: productsWithOffers, categories });
    } catch (error) {
      console.error(error);
      res.render("user/404Error");
    }
  };

module.exports = { getProductDetails,getcategoriesProduct };