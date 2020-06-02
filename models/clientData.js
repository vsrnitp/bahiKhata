const mongoose = require('mongoose');

const clientDataSchema = mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true,
    },
    clientId:{
        type:String,
        required:true,
        unique:1
    },
    address:{
        type:String,
        required:true
    },
    mobNo:{
        type:Number,
        required:true
    },
    email:{
        type:String,
        default:'N/A'
    },
    leftBal:{
        type:Number,
        required:true
    },
    date:{
        type:Date,
        default:Date.now()
    }
})

const clientDataModel = mongoose.model('clientDataModel',clientDataSchema);

module.exports = {clientDataModel};