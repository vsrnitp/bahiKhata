const mongoose = require('mongoose');

const saleDataSchema = mongoose.Schema({
   clientId:{
    type:String,
    required:true,
   },
   quantity:{
    type:Number,
    required:true
  },
    productName:{
     type:String,
     required:true,
   },
   productId:{
    type:String,
    required:true,
  },
  netPrice:{
    type:Number,
    required:true
},
   netCgst:{
       type:Number,
       required:true
   },
   netSgst:{
        type:Number,
        required:true
   },
   netPayableAmount:{
    type:Number,
    required:true
   },
   amountPaid:{
    type:Number,
    required:true
   },
   remainingAmount:{
    type:Number,
    required:true
   },
   saleDate:{
    type:String,
    required:true
   },
    date:{
        type:Date,
        default:Date.now()
    }
})
//saleDataSchema.index({productName:"text"});
const saleDataModel = mongoose.model('saleDataModel',saleDataSchema);

module.exports = {saleDataModel};