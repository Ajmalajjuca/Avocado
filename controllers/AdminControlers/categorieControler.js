const categoriesModel = require("../../models/categorieModel");
const userModel = require("../../models/userModel");

const getCategories = async (req, res) => {
  try {
    if (req.session.isAdmin) {
      const users = await userModel.findOne({ isAdmin: false });
      const admin = req.session.admin;
      const updateSuccess = req.flash("update Success");
      const catSuccess = req.flash("catg  Success");
      const categories = await categoriesModel.find({  });

      res.render("admin/Categories", {
        users: users,
        admin: admin.username,
        category: categories,
        catSuccess,
        updateSuccess,
        activePage: 'categories'
      });
    } else {
      redirect("/admin");
    }
  } catch (err) {
    console.error("Error accuerd is getDashbard", err);
    req.flash("error", "something Went Wrong");
    return res.redirect("/admin");
  }
};

const postCreateCategory = async (req, res) => {
  try {
    if (req.session.isAdmin) {
      const { CategoryName, CategoryDescription } = req.body;
      
      // Validation regex patterns
      const nameRegex = /^[a-zA-Z\s]*$/; // Allows only letters and spaces
      // const descriptionRegex = /^[a-zA-Z0-9\s.,!?]*$/; // Allows letters, numbers, spaces, and common punctuation
      
      // Validate CategoryName
      if (!nameRegex.test(CategoryName)) {
        return res.status(400).json({ 
          success: false, 
          message: "Category name should only contain letters and spaces" 
        });
      }

      // Check if the category name already exists (case-sensitive)
      const existingCategory = await categoriesModel.findOne({ name: { $regex: `^${CategoryName}$`, $options: 'i' } });
      if (existingCategory) {
        return res.status(400).json({ 
          success: false, 
          message: "Category already exists" 
        });
      }

      // Validate CategoryDescription
      // if (!descriptionRegex.test(CategoryDescription)) {
      //   return res.status(400).json({ 
      //     success: false, 
      //     message: "Category description should only contain letters, numbers, spaces, and common punctuation" 
      //   });
      // }
      
      // Create new category
      await categoriesModel.create({ name: CategoryName, description: CategoryDescription })
      return res.status(201).json({ 
        success: true, 
        message: "Category added successfully" 
      });
      
    } else {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized: Admin access required" 
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

  const getEditCategories = async (req, res) => {
    try {
      if (req.session.isAdmin) {
        const categoryId = req.params.id;
        
        const category = await categoriesModel.findById(categoryId);
        const admin = req.session.admin;
        if (!category) {
          return res.status(404).send({ error: "User not found" });
        }
        res.render("admin/editCategory", { category:category, admin: admin.username, activePage: 'categories'  });
      } else {
        res.redirect("/admin");
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  };


  const updateCategory = async (req, res) => {
    try {
      if (req.session.isAdmin) {
        const categoryId = req.params.id;
        const { editCategoryName, editCategoryDescription } = req.body;
  
        // Validation regex pattern
        const nameRegex = /^[a-zA-Z\s]+$/;
  
        // Validate CategoryName
        if (!nameRegex.test(editCategoryName)) {
          return res.status(400).json({
            success: false,
            message: "Category name should only contain letters and spaces"
          });
        }
  
        const existingCategory = await categoriesModel.findById(categoryId);
        if (!existingCategory) {
          return res.status(404).json({
            success: false,
            message: "Category not found"
          });
        }
  
        // Check for duplicate category (case-insensitive)
        const duplicateCategory = await categoriesModel.findOne({
          name: { $regex: new RegExp(`^${editCategoryName}$`, 'i') },
          _id: { $ne: categoryId }
        });
  
        if (duplicateCategory) {
          return res.status(400).json({
            success: false,
            message: "Category with this name already exists"
          });
        }
  
        // Update category
        existingCategory.name = editCategoryName;
        existingCategory.description = editCategoryDescription;
        await existingCategory.save();
  
        return res.status(200).json({
          success: true,
          message: "Category updated successfully"
        });
      } else {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Admin access required"
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  };
  
  
  

   
  

  const blockcategory = async (req, res) => {
    try {
      if (req.session.isAdmin) {
        const categoryId = req.params.id;
        const category = await categoriesModel.findById(categoryId);
  
        if (!category) {
          return res.status(404).send({ error: 'Category not found' });
        }
  
        category.status = !category.status;
        await category.save();
  
        res.json({ message: `Category ${category.status ? 'activated' : 'blocked'} successfully` });
      } else {
        res.status(403).send({ error: 'Unauthorized' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  const checkCategoryName = async (req, res) => {
    const categoryName = req.params.name.toLowerCase();
    try {
      const category = await categoriesModel.findOne({
        name: new RegExp(`^${categoryName}$`, 'i')
      });
  
      if (category) {
        res.json({ exists: true, categoryId: category._id });
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      console.error('Error checking category name:', error);
      res.status(500).send('Server Error');
    }
  };
  
  
  


module.exports = { getCategories, postCreateCategory,getEditCategories,updateCategory, blockcategory,checkCategoryName};
