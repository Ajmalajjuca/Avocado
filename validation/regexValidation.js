// validation/regexValidation.js

// Regex patterns for validation
const isValidName = (name) => /^[a-zA-Z\s]+$/.test(name);
const isValidPassword = (password) => /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*[a-zA-Z]).{8,}$/.test(password) // At least one uppercase, one lowercase, one number, one special character, and minimum 8 characters
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) // Email format
const isValidconfirmpassword = (confirmpassword) => /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*[a-zA-Z]).{8,}$/.test(confirmpassword) // At least one uppercase, one lowercase, one number, one special character, and minimum 8 characters
const isValidPhone = (phone) => /^[0-9]{10}$/.test(phone);
const isValidPincode = (pincode) => /^[0-9]{6}$/.test(pincode);

module.exports = {
    isValidPhone,
    isValidPincode,
    isValidName,
    isValidPassword,
    isValidEmail,
    isValidconfirmpassword

};









