const mongoose = require('mongoose');

const stockItemSchema = mongoose.Schema({
   productName:{
     type:String,
     required:true,
     unique:1
   },
   quantity:{
     type:Number,
     required:true
   },
   price:{
      type:Number,
      required:true
   },
   cgst:{
       type:Number,
       required:true
   },
   sgst:{
        type:Number,
        required:true
   },
   netPrice:{
        type:Number,
        required:true
   },
    date:{
        type:Date,
        default:Date.now()
    }
})
stockItemSchema.index({productName:"text"});
const stockItemModel = mongoose.model('stockItemModel',stockItemSchema);

module.exports = {stockItemModel};