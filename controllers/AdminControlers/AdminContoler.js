const userModel = require("../../models/userModel");
const bcrypt = require("bcrypt");


const getLogin = async (req, res) => {
        try{
                if (req.session.isAdmin) {
                        const user = await userModel.findOne({email:req.session.user.email})
                        res.redirect("/admin/dashboard",{user:user.username});
                      } else {
                        res.render("admin/adminLogin",{error:req.flash("error")});
                      }
        }catch(err){
                console.log("rendering error:",err);     
        }
  
};
const getLogout = async(req,res)=>{
    req.session.destroy((err)=>{
      if(err){
        console.log("Logout error:",err);
        return res.status(500).send("Unable to logout. Please try again.");

      }
      res.redirect("/admin")
    })
}
const postLogin = async (req, res) => {
        try {
          if (!req.session.isAdmin) {
            const { email, password } = req.body;
      
            // Logging for debugging
            
      
            const user = await userModel.findOne({ email });
      
            // Logging for debugging
            console.log("User: ", user);
      
            if (!user) {
              req.flash("error", "Invalid email");
              return res.redirect("/admin");
            }
            if (!user.isAdmin) {
              req.flash("error", "You are not an admin");
              return res.redirect("/admin");
            }
      
            // Ensure that user.password is defined
            if (!user.password) {
              req.flash("error", "User password not found");
              return res.redirect("/admin");
            }
      
            
      
            const isValidPassword = await bcrypt.compare(password, user.password);
      
            if (!isValidPassword) {
              req.flash("error", "Invalid password");
              return res.redirect("/admin");
            }
      
            req.session.isAdmin = true;
            req.session.admin = user;
            return res.redirect("/admin/dashboard");
          } else {
            return res.redirect("/admin/dashboard");
          }
        } catch (err) {
          console.error("Error logging in Admin login: ", err);
          req.flash("error", "Something went wrong");
          return res.redirect("/admin");
        }
      };
      

const getDashboard = async (req, res) => {
  try {
    if (req.session.isAdmin) {
        const users = await userModel.findOne({isAdmin:false})
        const admin = req.session.admin;
       
        res.render("admin/Dashboard",{users:users,admin:admin.username})
    }else{
        redirect("/admin")
    }
  } catch (err) {
        console.error("Error accuerd is getDashbard",err)
        req.flash("error", "something Went Wrong");
        return res.redirect("/admin");
  }
};




// const getOrders=async(req,res)=>{
//         try {
//                 if (req.session.isAdmin) {
//                     const users = await userModel.findOne({isAdmin:false})
//                     const admin = req.session.admin;
                   
//                     res.render("admin/Orders",{users:users,admin:admin.username})
//                 }else{
//                     redirect("/admin")
//                 }
//               } catch (err) {
//                     console.error("Error accuerd is getDashbard",err)
//                     req.flash("error", "something Went Wrong");
//                     return res.redirect("/admin");
//               }
// }

// const getaddProducts=async(req,res)=>{
//         try {
//                 if (req.session.isAdmin) {
//                     const users = await userModel.findOne({isAdmin:false})
//                     const admin = req.session.admin;
                   
//                     res.render("Admin/addProducts",{users:users,admin:admin.username})
//                 }else{
//                     redirect("/admin")
//                 }
//               } catch (err) {
//                     console.error("Error accuerd is getDashbard",err)
//                     req.flash("error", "something Went Wrong");
//                     return res.redirect("/admin");
//               }
// }



module.exports = { getLogin, postLogin, getDashboard ,getLogout};
