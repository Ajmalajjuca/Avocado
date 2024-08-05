const mongoose = require("mongoose")

const categorieSchema = new mongoose.Schema(
    {
        name : {
            type : String,
            require : true
        },
        description : {
            type : String,
            require : true
        },
        status : {
            type : Boolean,
            require : true,
            default : true
        }
    }
)

const categorieModel = mongoose.model("categories", categorieSchema)

module.exports = categorieModel