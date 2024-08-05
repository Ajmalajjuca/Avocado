const addressModel = require("../../models/addressModel")
const userModal = require("../../models/userModel");
const { isValidName, isValidEmail, isValidPhone, isValidPincode } = require("../../validation/regexValidation");

const getAddresses = async (req, res) => {
    try {
        let userId;
        let user;

        if (req.user && req.user.id) {
            userId = req.user.id;
            user = await userModal.findById(userId);
        } else if (req.session && req.session.user) {
            user = await userModal.findOne({ email: req.session.user.email });
            userId = user._id;
        } else {
            return res.status(401).send('User not authenticated');
        }

        const addresses = await addressModel.findOne({ userId }).lean();

        if (!addresses) {
            return res.render('user/address', { user: user.username, userData: { address: [] } });
        }
        res.render('user/address', { user: user.username, userData: addresses });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

const getAddAddresses = async (req, res) => {
    try {
        const user = await userModal.findOne({ email: req.session.user.email });
        res.render("user/addAddress", { user: user.username });
    } catch (error) {
        res.status(500).send('Server Error');
    }
}

const addAddress = async (req, res) => {
    try {
        if (!req.user) {
            console.error('User not authenticated');
            return res.status(401).send('User not authenticated');
        }

        const userId = req.user._id;
        if (!userId) {
            console.error('User ID not found in req.user');
            return res.status(400).send('User ID not found');
        }

        const { name, email, mobile, housename, street, city, state, country, pincode, save_as } = req.body;

        // Backend validation
        if (!isValidName(name) || !isValidEmail(email) || !isValidPhone(mobile) || !isValidPincode(pincode)) {
            return res.status(400).send('Invalid input data');
        }

        const newAddress = {
            name,
            email,
            mobile,
            housename,
            street,
            city,
            state,
            country,
            pincode,
            save_as
        };

        let user = await userModal.findById(userId);
        if (!user) {
            console.error(`User not found with ID: ${userId}`);
            return res.status(404).send('User not found');
        }

        if (!user.address) {
            const newAddressDoc = new addressModel({
                userId: user._id,
                address: [newAddress]
            });
            await newAddressDoc.save();
            user.address = newAddressDoc._id;
            await user.save();
        } else {
            await addressModel.findByIdAndUpdate(
                user.address,
                { $push: { address: newAddress } },
                { new: true }
            );
        }

        res.redirect('/address');
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).send('Server Error');
    }
};

const getEditAddress = async (req, res) => {
    try {
        const messages = {
            error: req.flash('error'),
            info: req.flash('info'),
            success: req.flash('success')
        };
        const addressId = req.params.id;
        const address = await addressModel.findOne({ 'address._id': addressId });
        const user = await userModal.findOne({ email: req.session.user.email });

        if (!address) {
            return res.status(404).send('Address not found');
        }

        res.render('user/editAddress', {
            title: 'Edit Address',
            address: address.address.id(addressId),
            user: user.username,
            messages,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

const editAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressId = req.params.id;
        const { name, email, mobile, housename, street, city, state, country, pincode, save_as } = req.body;

        // Backend validation
        if (!isValidName(name) || !isValidEmail(email) || !isValidPhone(mobile) || !isValidPincode(pincode)) {
            return res.status(400).send('Invalid input data');
        }

        const updatedData = {
            name,
            email,
            mobile,
            housename,
            street,
            city,
            state,
            country,
            pincode,
            save_as
        };

        await addressModel.updateOne(
            { userId, 'address._id': addressId },
            { $set: { 'address.$': updatedData } }
        );

        res.redirect('/address');
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

const deleteAddress = async (req, res) => {
    try {
      const userId = req.user._id; // Assuming req.user contains the user document
      const addressId = req.params.id;
  
      const result = await addressModel.updateOne(
        { userId: userId },
        { $pull: { address: { _id: addressId } } }
      );
  
      if (result.modifiedCount === 0) {
        return res.status(404).send('Address not found');
      }
  
      res.redirect('/address');
    } catch (error) {
      console.error('Error deleting address:', error);
      res.status(500).send('Server Error');
    }
  };

const postEditAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const { name, email, mobile, housename, street, city, state, country, pincode, save_as } = req.body;

        // Backend validation
        if (!isValidName(name) || !isValidEmail(email) || !isValidPhone(mobile) || !isValidPincode(pincode)) {
            return res.status(400).send('Invalid input data');
        }

        const updatedData = {
            name,
            email,
            mobile,
            housename,
            street,
            city,
            state,
            country,
            pincode,
            save_as
        };

        const result = await addressModel.updateOne(
            { 'address._id': addressId },
            { $set: { 'address.$': updatedData } }
        );

        if (result.nModified === 0) {
            return res.status(404).send('Address not found');
        }

        res.redirect('/address');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getAddresses,
    addAddress,
    getAddAddresses,
    editAddress,
    deleteAddress,
    getEditAddress,
    postEditAddress
}
