const productModel = require("../../models/productModel")
const userModel = require("../../models/userModel");
const categoryModel  =   require("../../models/categorieModel")
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;











const getProducts = async (req, res) => {
    try {
      if (req.session.isAdmin) {
        const categories = await categoryModel.find({});
  
        const page = parseInt(req.query.page) || 1; // Current page number, default to 1 if not provided
        const limit = 10; // Number of products per page
        const skip = (page - 1) * limit; // Number of products to skip
        const search = req.query.search || ''; 

        const query = search ? { name: { $regex: search, $options: 'i' } } : {};

        // Pass skip and limit to the function
        const [products, totalProducts] = await Promise.all([
          getProductsFromDatabase(query,skip, limit),
          productModel.countDocuments(query)
        ]);
  
  
        const totalPages = Math.ceil(totalProducts / limit);
  
        const admin = req.session.admin;
        res.render("admin/Products", {
          products,
          admin: admin.username,
          categories,
          currentPage: page,
          totalPages: totalPages,
          search,
           activePage: 'products'
        });
      } else {
        res.redirect("/admin");
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  
  
  
  

const getAddProduct=async (req, res) => {
    try {
      if (req.session.isAdmin) {
        const categories = await categoryModel.find({});
        const admin = req.session.admin;
        res.render("admin/AddProducts", { categories, admin: admin.username, activePage: 'products' });
      } else {
        res.redirect("/admin");
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  const addProduct = async (req, res) => {
    try {
      const { productname, productdescription, price, stock, category } = req.body;
      const images = req.files;
      let croppedImages = [];
  
      // Ensure the directory exists
      const imagesDir = path.join(__dirname, "../../uploads");
      try {
        await fs.access(imagesDir);
      } catch (err) {
        await fs.mkdir(imagesDir, { recursive: true });
      }
  
      for (let i = 0; i < images.length; i++) {
        const imageKey = `croppedImage${i}`;
        if (req.body[imageKey]) {
          if (typeof req.body[imageKey] === "string") {
            console.log(`Processing cropped image for key: ${imageKey}`);
            const croppedImageBuffer = Buffer.from(
              req.body[imageKey].replace(/^data:image\/\w+;base64,/, ""),
              "base64"
            );
            const croppedImageFilename = `cropped_${Date.now()}_${images[i].originalname}`;
            const croppedImagePath = path.join(imagesDir, croppedImageFilename);
            await sharp(croppedImageBuffer)
              .resize(2000, 2000, {
                fit: sharp.fit.cover,
                quality: 100
              })
              .toFile(croppedImagePath);
            console.log(`Cropped image saved at: ${croppedImagePath}`);
            croppedImages.push(`/uploads/${croppedImageFilename}`);
          } else {
            console.error(`req.body[imageKey] is not a string: `, req.body[imageKey]);
          }
        } else {
          console.log(`Processing original image: ${images[i].filename}`);
          const originalImagePath = path.join(imagesDir, `cropped_${Date.now()}_${images[i].originalname}`);
          await sharp(images[i].path)
            .resize(2000, 2000, {
              fit: sharp.fit.cover,
              quality: 100
            })
            .toFile(originalImagePath);
          console.log(`Resized original image saved at: ${originalImagePath}`);
          croppedImages.push(`/uploads/${path.basename(originalImagePath)}`);
        }
      }
  
      console.log("Cropped Images Array: ", croppedImages);
  
      const newProduct = new productModel({
        name: productname,
        description: productdescription,
        price: price,
        stock: stock,
        category: category,
        images: croppedImages,
        status: true,
      });
  
      await newProduct.save();
  
      console.log("Product saved successfully");
  
      res.redirect("/admin/products");
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  };
  
  const addProductToDatabase = async (productData) => {
    const newProduct = new productModel(productData);
    await newProduct.save();
  };
  
  // Function to fetch all products from the database (if required)
  const getProductsFromDatabase = async (query,skip, limit) => {
    try {
      // Populate category and retrieve products with pagination
      const products = await productModel.find(query).populate('category').skip(skip).limit(limit).exec();
      return products;
    } catch (error) {
      console.error(error);
      throw new Error('Error retrieving products from database');
    }
  };




  const updateProduct = async (req, res) => {
    try {
        const { productname, productdescription, price, currency, stock, category, existingImages } = req.body;
        const productId = req.params.id;
        const product = await productModel.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Handle existing images
        product.images = existingImages || [];

        // Handle new images
        if (req.files && req.files.length > 0) {
            for (let file of req.files) {
                const resizedFilename = 'resized-' + file.filename;
                const resizedFilePath = path.join('uploads', resizedFilename);

                await sharp(file.path)
                    .resize(300, 200)
                    .toFormat('jpeg')
                    .toFile(resizedFilePath);

                // Try to delete the original file, but don't throw if it fails
                try {
                    await fs.unlink(file.path);
                } catch (unlinkError) {
                    console.warn(`Warning: Could not delete original file ${file.path}:`, unlinkError);
                }

                product.images.push('/uploads/' + resizedFilename);
            }
        }

        // Update other fields
        product.name = productname;
        product.description = productdescription;
        product.price = price;
        product.currency = currency;
        product.stock = stock;
        product.category = category;

        await product.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Error in updateProduct controller:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};




  

  const getEditProduct = async (req, res) => {
    try {
        if (req.session.isAdmin) {
        const admin = req.session.admin;
        const productId = req.params.productId;
        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).render('404', { pageTitle: 'Product Not Found' });
        }
        res.render('admin/editProduct', {
            pageTitle: 'Edit Product',
            product: product,
            admin: admin.username,
            categories: await categoryModel.find(), // Assuming you have a Category model
             activePage: 'products'
        });
    }else{
        res.redirect("/admin/products");
    }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// Controller to delete a product
const deleteProduct = async (req, res) => {
    try {
        if (req.session.isAdmin) {
            const productId = req.params.id;
            const deletedProduct = await productModel.findByIdAndDelete(productId);
            if (!deletedProduct) {
                return res.status(404).json({ error: "Product not found" });
            }
            res.status(200).json({ message: "Product deleted successfully" });
        } else {
            res.redirect("/admin/products");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// Controller to toggle the block/unblock status of a product
const blockUnblockProduct = async (req, res) => {
    try {
        const productId = req.params.productId;
        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).send('Product Not Found');
        }
        product.status = !product.status;
        await product.save();
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};



module.exports ={ getProducts ,getAddProduct,addProduct,getProductsFromDatabase,updateProduct,getEditProduct,deleteProduct,blockUnblockProduct}