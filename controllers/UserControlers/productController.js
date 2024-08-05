const productModel = require('../../models/productModel');
const categoriesModel = require("../../models/categorieModel")


const getProductDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await productModel.findById(productId).populate('category').exec();
        const categories = await categoriesModel.find({status: true });
        const products = await productModel.find({ status: true });
        const relatedProducts = await productModel.find({
            category: product.category,
            _id: { $ne: product._id } // Exclude the current product
        }).limit(4);

        if (!product) {
            return res.status(404).render('404', { pageTitle: 'Product Not Found' });
        }

        res.render('user/productDetails', { product:product,products:products,categories:categories,relatedProducts:relatedProducts });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.render("user/404Error");
    }
};

const getcategoriesProduct=async (req,res)=>{
    try {
        const category = await categoriesModel.findById(req.params.id);
    const categories = await categoriesModel.find();
    const products = await productModel.find({ category: req.params.id });
        if (!category) {
          return res.status(404).send('Category not found');
        }
    
        
        res.render('user/particularProduct', { category, products,categories }); // Assume you have a 'category.ejs' template
      } catch (error) {
        console.error(error);
        res.render("user/404Error");
      }
}

module.exports = { getProductDetails,getcategoriesProduct };