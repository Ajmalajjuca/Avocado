const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartSchema = new Schema({
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'userDetails',
      required: true
    },
    items: [{
      productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      stock: {
        type: Number,
        required: true
      },
      quantity: {
        type: Number, 
        required: true
      },
      price: {
        type: Number,
        required: true
      },
      Product_total: {
        type: Number,
        required: true
      }
    }],
    Cart_total: {
      type: Number,
      required: true,
      default: 0
    }
  }, { strictPopulate: false });

const cartModel = mongoose.model('cart', cartSchema);

module.exports = cartModel;
