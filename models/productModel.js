const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'categories',
    required: true,
  },
  images: {
    type: [String], // Array of strings for multiple images
    required: true,
  },
  mainImage: {
    type: String, // URL of the main image to be used for previews
  },
  stock: {
    type: Number,
    required: true,
  },
  status: {
    type: Boolean,
    default: true,
  },
  tags: [String],
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  discount: {
    type: Number,
    default: 0 // Percentage or amount
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const productModel = mongoose.model("Product", productSchema);

module.exports = productModel;
