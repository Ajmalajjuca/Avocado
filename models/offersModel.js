const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    offerName: {
        type: String,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
    },
    endDate: {
        type: Date
    },
    offerType: {
        type: String,
        enum: ['category', 'product', 'refferal'],
        required: true
    },
    productId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    categoryId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'categories'
    }]
}, {
    timestamps: true 
});

const offerModel = mongoose.model('offer', offerSchema);

module.exports = offerModel;