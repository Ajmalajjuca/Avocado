const userModel = require("../../models/userModel");
const bcrypt = require("bcrypt");

const {
    isValidName,
    isValidPassword,
    isValidEmail,
  } = require("../../validation/regexValidation");

const getAllUser = async (req, res) => {
  try {
    if (req.session.isAdmin) {
      const users = await userModel.find({ isAdmin: false });
      const admin = req.session.admin;
      res.render("admin/User", { users:users, admin: admin.username, activePage: 'users' });
      
    } else {
      res.redirect("/admin");
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const postUsers = async (req, res) => {
    try {
      const newUser = new User(req.body);
      await newUser.save();
      res.status(201).send(newUser);
    } catch (error) {
      res.status(400).send(error);
    }
  };

const putUsers = async (req, res) => {
    try {
      if (req.session.isAdmin) {
        const user = await userModel.findByIdAndUpdate(req.params.id, req.body, {
          new: true,
        });
        if (!user) {
          return res.status(404).send({ error: "User not found" });
        }
        res.send(user);
      } else {
        res.redirect("/admin");
      }
    } catch (error) {
      res.status(400).send(error);
    }
  };

  const getEditUser = async (req, res) => {
    try {
      if (req.session.isAdmin) {
        const userId = req.params.id;
        const user = await userModel.findById(userId);
        const admin = req.session.admin;
        if (!user) {
          return res.status(404).send({ error: "User not found" });
        }
        res.render("admin/editUser", { user:user, admin: admin.username, activePage: 'users'  });
      } else {
        res.redirect("/admin");
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  };


  const updateUser = async (req, res) => {
    try {
      if (req.session.isAdmin) {
        const userId = req.params.id;
        const updatedUser = await userModel.findByIdAndUpdate(userId, req.body, {
          
          username: req.body.username,
          email: req.body.email
        },{
            new: true,
            runValidators: true,
        });
  
        if (!updatedUser) {
          return res.status(404).send({ error: "User not found" });
        }
        res.redirect("/admin/users");
      } else {
        res.redirect("/admin");
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  const deleteUsers = async (req, res) => {
    try {
      if (req.session.isAdmin) {
        const userId = req.params.id;
        const deletedUser = await userModel.findByIdAndDelete(userId);
  
        if (!deletedUser) {
          return res.status(404).json({ error: "User not found" });
        }
  
        res.status(200).json({ message: "User deleted successfully" });
      } else {
        res.redirect("/admin/login");
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  const getcreateUser = (req, res) => {
    if (req.session.isAdmin) {
        const admin = req.session.admin;
      res.render("admin/createUser",{  admin: admin.username, activePage: 'users'  });
    } else {
      res.redirect("/admin/dashboard");
    }
  };

  const postcreateUser = async (req, res) => {
    try {
        const admin = req.session.admin;
      const { username, email, password, confirmPassword } = req.body;
  
      // Validation checks
      if (!isValidName(username)) {
        return res
          .status(400)
          .render("admin/createUser", { error: "Invalid username",admin });
      }
      if (!isValidEmail(email)) {
        return res.status(400).render("admin/createUser", { error: "Invalid email" });
      }
      if (!isValidPassword(password)) {
        return res
          .status(400)
          .render("admin/createUser", { error: "Invalid password",admin });
      }
      
      if (password !== confirmPassword) {
        return res
          .status(400)
          .render("admin/createUser", { error: "Passwords do not match" ,admin});
      }
  
      // Check if email already exists
      const existingUseremail = await userModel.findOne({ email });
      if (existingUseremail) {
        return res
          .status(409)
          .render("admin/createUser", { error: "Email already exists",admin });
      }
  
      // Check if username already exists
      const existingUserusername = await userModel.findOne({ username });
      if (existingUserusername) {
        return res
          .status(409)
          .render("admin/createUser", { error: "Username already exists" ,admin });
      }
  
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      // Create a new user instance
      const newUser = new userModel({
        username,
        email,
        password: hashedPassword,
        isAdmin: false,
      });
  
      // Save the new user
      await newUser.save();
      
  
      // Redirect to the admin dashboard or render a success view
      res.redirect("/admin/users");
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server errorrrr" });
    }
  };

  const blockUser = async (req, res) => {
    try {
      if (req.session.isAdmin) {
        const userId = req.params.id;
        const user = await userModel.findById(userId);
  
        if (!user) {
          return res.status(404).send({ error: 'User not found' });
        }
  
        user.blocked = !user.blocked;
        await user.save();
  
        res.json({ message: `User ${user.blocked ? 'blocked' : 'unblocked'} successfully` });
      } else {
        res.status(403).send({ error: 'Unauthorized' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
module.exports ={getAllUser,postUsers, putUsers,getEditUser,updateUser,deleteUsers,getcreateUser,postcreateUser,blockUser}