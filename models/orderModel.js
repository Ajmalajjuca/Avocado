const mongoose = require('mongoose');
const shortid = require('shortid');
const Schema = mongoose.Schema;

const schema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'userDetails',
        required: true
    },
    orderId: {
        type: String,
        default: shortid.generate,
        unique: true
    },
    items: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        }
    }],
    wallet: {
        type: Number
    },
    status: {
        type: String,
        default: 'Pending',
        required: true
    },
    address: {
        type: {
            name: String,
            email: String,
            mobile: Number,
            housename: String,
            street: String,
            city: String,
            state: String,
            country: String,
            pincode: String,
            save_as: String
        },
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    payment: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    updated: {
        type: Date,
        default: Date.now,
        required: true
    },
    return: [{
        reason: {
            type: String
        },
        status: {
            type: String,
            default: 'Pending'
        }
    }]
});

const orderModel = mongoose.model('order', schema);

module.exports = orderModel;
