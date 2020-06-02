const mongoose = require('mongoose');

const userRegSchema = mongoose.Schema({
    email:{
        type:String,
        required:true,
        trim:true,
        unique:1
    },
    password:{
        type:String,
        required:true
    },
    date:{
        type:Date,
        default:Date.now()
    }
})

const userRegModel = mongoose.model('userRegModel',userRegSchema);

module.exports = {userRegModel};