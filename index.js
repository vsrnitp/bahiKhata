const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require("body-parser"); 
const fs = require('fs');
const url = require('url'); 
var converter = require('number-to-words');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const saltRounds = 10;
// initializing the APP.....
const app = express();

//setting up the view engine....
app.set("view engine","ejs");

//telling express where are we keeping our index.js...
app.set("views",__dirname+"/views");

//using body-parser...
app.use(bodyParser.urlencoded({extended:false}));
//using cookie parser...
app.use(cookieParser());

//setting up static folder...
app.use( express.static( "public" ) );

//some more settings.....
app.use(bodyParser.json());
app.use(cookieParser());



// connecting to the database (mongoDB)...
const databaseURL = 'mongodb+srv://vsrnitp:king12345@cluster0-fy7sb.mongodb.net/test?retryWrites=true&w=majority'
mongoose.connect(databaseURL,{useNewUrlParser : true})
.then(()=>{
    console.log('Database connected succesfully...')
}).catch((err)=>{
    console.log(err);
})

//bringing up the database models....
const {userRegModel} = require('./models/regModel');
const {stockItemModel} = require('./models/stockModel');
const {clientDataModel} = require('./models/clientData');
const {saleDataModel} = require('./models/saleData');

// setting up the primary route....(For login only... separate route for register)
app.get('/',(req,res)=>{
    res.status(200).render("index");

})

//setting up the GET route for registration.....
app.get('/register',(req,res)=>{
    res.status(200).render("register");
})
// setting up post route for Registration....
app.post('/register',(req,res,next)=>{
    var userData = new userRegModel({
        email:req.body.email,
        password:req.body.password,
        repPassword:req.body.repPassword
    })
    //finding if the email is already registered...
    userRegModel.findOne({'email':req.body.email},(err,user)=>{
       if(err){res.send(err)}
       else if(user){res.send('User already exists.....Try logging in.')}
       else{
           if(req.body.password!==req.body.repPassword){
               res.send('Both passwords dont match...');
           }
           else{
               // hashing the password before saving it....
               bcrypt.hash(userData.password,saltRounds,(err,hash)=>{
                   if(err) res.send(err);
                   else{
                       userData.password=hash;
                       //saving regData to database....
                       userData.save((err,doc)=>{
                           if(err) res.status(400).send(err);
                           else{
                               res.status(400).send(userData+'Registration Successful , Go back to the login page...');
                           }
                       })
                   }
               })
           }
       }
    })
})

//setting up post route for login...
//NOTE:- Password will be saved in the cookie of the browser...
app.post('/login',(req,res)=>{
    const email = req.body.email;
    const password = req.body.password;

    //finding if user exist in the database...
    userRegModel.findOne({'email':email},(err,user)=>{
        if(err) res.send(err);
        else if(!user) res.send('No account exists with this email...Create one.');
        else{
            bcrypt.compare(password,user.password,(err,valid)=>{
                if(err)res.send(err)
                else if(valid){
                    //creating the cookie...
                    var token = jwt.sign(user._id.toHexString(),'secret');
                    res.cookie('userLoginToken',token);
                    //here user should be directed to the sales dashboard...
                    res.redirect(url.format({
                      pathname:"/dashboard",
                      query:{
                          email:req.body.email
                      }  
                    }))
                    
                }
                else{
                    res.send('Incorrect Password.')
                }
            })
        }
    })
})

//creating a PRIVATE rote for LOGOUT...
app.post('/logout',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else{
            userRegModel.findOne({"_id":decode},(err,user)=>{
                if(err) res.send(err);
                else if(!user) res.status(404).send('Login first.')
                else{
                    res.clearCookie('userLoginToken',{path:'/'}).redirect('/');
                }
            })
        }
    })
})

//setting up PRIVATE route for sales dashboard....
app.get('/dashboard',(req,res)=>{
   // res.status(200).send('Welcome to your sales dashboard.Your email is '+req.query.email)
   //  res.status(200).render("dashboard",{user:req.query.email});

   const token = req.cookies.userLoginToken;
   jwt.verify(token,'secret',(err,decode)=>{
       if(err) res.status(401).send('Unauthorized!');
       else{
           userRegModel.findOne({"_id":decode},(err,user)=>{
               if(err) res.send(err);
               else if(!user) res.status(404).send('Login first.')
               else{
                   //sending dates too...
                 

let date_ob = new Date();

// current date
// adjust 0 before single digit date
let date = ("0" + date_ob.getDate()).slice(-2);

// current month
let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

// current year
let year = date_ob.getFullYear();

      // here we will populate the dashboard with stock items...
    
      stockItemModel.find().then(data => res.status(200).render("dashboard",{user:user.email,date:date,month:month,year:year,dataLoad:data}))
      .catch(err => console.log(err))
      

                  // res.status(200).render("dashboard",{user:req.query.email,date:date,month:month,year:year});
               }
           })
       }
   })
})

//setting up a PRIVATE route(POST) for adding items to stock...
app.post('/setStocks',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else{
            userRegModel.findOne({"_id":decode},(err,user)=>{
                if(err) res.send(err);
                else if(!user) res.status(404).send('Login first.')
                else{
                    // calculating sgst,cgst and net price first...
                    var cgst = Math.floor((((req.body.price*9)/100)*100)/100);
                    var sgst = cgst;
                    var stockItemData = new stockItemModel({
                        productName:req.body.itemName.toLowerCase(),
                        quantity:req.body.quantity,
                        price:req.body.price,
                        cgst:cgst,
                        sgst:sgst,
                        netPrice:0
                        
                    })
                    var netCost = Math.round(stockItemData.price+cgst+sgst);
                    stockItemData.netPrice=Math.round(netCost);     
                    
                    // saving  this data to the database....
                    //name should be unique otherwise it will give errors...
                    stockItemData.save((err,doc)=>{
                        if(err) res.send(err);
                        else{
                            res.status(200).redirect('/dashboard');
                        }
                    })

                }
            })
        }
})
})
//setting up a PRIVATE route (GET) for updating stocks...
app.get('/updateStock/:id',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else {
            var stockId = req.params.id;
            res.status(200).render("updateStock",{eachData:stockId});
        }
    })
})

//setting up a PRIVATE route(POST) for updating the stock...
app.post('/updateStock/:id',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else{
            var itemId = req.params.id;
            var incrementData = req.body.incQuantity;
            var newerPrice = req.body.newPrice;
            var cgst = Math.floor((((newerPrice*9)/100)*100)/100);
            var sgst = cgst;
            var netCost = parseFloat(2*cgst)+parseFloat(newerPrice);

          /*  stockItemModel.findOneAndUpdate({_id :itemId},{price:newPrice},{cgst:cgst},{sgst:sgst},{netPrice:netCost}, {$inc : {'quantity' :incrementData }},(err,data)=>{
                if(err) res.send(err);
                else(res.send(data));
            })
            */
           stockItemModel.update({'_id':itemId},{$set:{'price':newerPrice,'cgst':cgst,'sgst':sgst,'netPrice':netCost}},(err,data)=>{
               if(err) res.send(err);
               else {
                   stockItemModel.update({'_id':itemId},{$inc:{'quantity':incrementData}},(err,data)=>{
                       if(err) res.send(err);
                       else res.status(200).redirect('/dashboard');
                   })
               }
           })
       
        
        }

    })
})


//creating a PRIVATE (POST) route for creating a client...
app.post('/createClient',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else{
            // get the client data from form...
            var name = req.body.clientName;
            var clientId = req.body.clientId;
            var address = req.body.clientAddress;
            var mobNo = req.body.clientMobileNo;
            var email = req.body.clientEmail;
            var leftBal = req.body.clientRemainingBalance;

            // bring the model here and store the data....
            clientDataModel.findOne({'clientId':req.body.clientId},(err,client)=>{
                if(err) res.status(500).send(err);
                else if(client) res.status(401).send('Client alredy exists...');
                else{
                    var clientDataForSaving = new clientDataModel({
                        name:name,
                        clientId:clientId,
                        address:address,
                        mobNo:mobNo,
                        email:email,
                        leftBal:leftBal
                    })
                    clientDataForSaving.save((err,doc)=>{
                        if(err) res.send(err);
                        else{
                            res.status(200).redirect('dashboard');
                        }
                    })
                }
            })
          
        }
    })
})

//creating PRIVATE route(POST) for bill clearance of clients....
app.post('/clearBill',(req,res)=>{

    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.send('Unauthorized!');
        else{

    var clientId = req.body.clientId;
    var balancePaid = req.body.balancePaid;

    clientDataModel.findOne({'clientId':clientId},(err,client)=>{
        if(err) res.send('Customer doesnt exist...');
        else if(client){
            if(balancePaid>client.leftBal)
              res.send('You cant pay more balance than due....');
              else{
                  clientDataModel.update({"clientId":clientId},{$inc:{'leftBal':-balancePaid}},(err,data)=>{
                      if(err) res.send(err);
                      else{
                          console.log(balancePaid+' '+client.leftBal);
                          res.status(200).redirect('/dashboard');
                      }
                  })
              }
        }
        else res.send('client doesnt exist..');
    })
         
}
})
})


// creating a PRIVATE (GET) route for list of clients....(and other details)
app.get('/clientList',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.send('Unauthorized!');
        else{
            // here we need to send the data from backend to frontend.....
            clientDataModel.find().then(data => {res.status(200).render("clientLog",{clientData:data})});
        }
    })
})

// creating a PRIVATE route (POST) for search....
app.post('/search',(req,res)=>{
    const token=req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else{
            var searchQuery = req.body.searchQuery;
            //finding in the database...
            //creating text index....
            
            stockItemModel.find({ $text: { $search: searchQuery } },(err,data)=>{
                if(err) res.send(err);
                else if(!data) res.send('Product doesnt exist.Try searching with correct name.');
                else{
                      var searchData = data;
                      res.status(200).render("salesFinalPage",{outputData:searchData});
                      
                }
            })
        }
    })
})


//set up a PRIVATE route (GET) for sale.......

app.get('/sale',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else{
        
            res.status(200).render("salesPage");
        }
    })
})


// now setting up PRIVATE routes(GET as well as POST) for sell....
app.get('/sell/:id',(req,res)=>{
    var id = req.params.id;
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send(err);
        else{
            // finding all the details of the product...
            stockItemModel.findOne({_id:id},(err,data)=>{
                if(err) res.status(404).send(err)
                else if(data){
                    var productName = data.productName;
                    var availableQuantity = parseFloat(data.quantity);
                    var price = parseFloat(data.price);
                    var cgst = parseFloat(data.cgst);
                    var sgst = parseFloat(data.sgst);
                    var pid = data._id;

                    // calculating net payble price....
                  //  var netPrice = price*quantity;
                  //  var netCgst =  cgst*quantity;
                   // var netSgst =  netCgst;

                    //calculating final payable cost...
                    //var finalCost = parseFloat(netPrice)+parseFloat(netSgst)+parseFloat(netCgst);

                    //sending data to the frontend...
                    res.status(200).render("sellDetails",{pName:productName,availQuantity:availableQuantity,price:price,cgst:cgst,sgst:sgst,pid:pid});

                   // console.log(netPrice);
                }
                else{
                    res.send('Product not found...')
                }
            })
        }
    })

   // res.render("sellDetails");
})

//setting up PRIVATE route (POST) for sale...
app.post('/sell',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(200).send('Unauthorized!');
        else{
     
    var clientId = req.body.clientId;
    var quantity = parseFloat(req.body.quantity);
    var productName = req.body.pName;
    var productId = req.body.pid;
    var payment = req.body.payment;
    var saleDate = req.body.saleDate.toString();
    //these wont be stored....
    var quantityAvailable = parseFloat(req.body.availQuantity);
    var price = parseFloat(req.body.price);
    var cgst = parseFloat(req.body.cgst);
    var sgst = parseFloat(req.body.sgst);

    // some calculation here......
    var netPrice = quantity*price;
    var netCgst = quantity*cgst;
    var netSgst = netCgst;
    var netPayableAmount = (2*netCgst)+parseFloat(netPrice);


    // doing some check...
    if(quantity>quantityAvailable){res.send('STOCK DOESNT HAS SUFFICIENT QUANTITY')}
    else{
        clientDataModel.findOne({'clientId':clientId},(err,clientData)=>{
            if(err) res.send(err);
            else if(!clientData) res.send('No client exists with this clientId....Try creating client first...');
            else{
                 if(payment>parseFloat(netPayableAmount)+parseFloat(clientData.leftBal)){
                     res.send('You cant pay more.....');
                 }
                 else{
                     var remainingAmount = parseFloat(netPayableAmount)-parseFloat(payment);

                    var saleDataForSaving = new saleDataModel({
                        clientId:clientId,
                        quantity:quantity,
                        productName:productName,
                        productId:productId,
                        netPrice:netPrice,
                        netCgst:netCgst,
                        netSgst:netSgst,
                        netPayableAmount:netPayableAmount,
                        amountPaid:payment,
                        remainingAmount:remainingAmount,
                        saleDate:saleDate
                    })
                    //saving sell data.....
                    saleDataForSaving.save((err,doc)=>{
                        if(err)res.send(err);
                        else{
                            //updating the stock....
                            stockItemModel.update({'_id':productId},{$inc:{'quantity':-quantity}},(err,newQuant)=>{
                                if(err) res.send(err);
                                else{
                                    //updating the unpaid balance of the client....
                                    clientDataModel.update({'clientId':clientId},{$inc:{'leftBal': remainingAmount}},(err,fDoc)=>{
                                        if(err) res.send(err);
                                        else{
                                            res.status(200).redirect('/sale');
                                        }
                                    })
                                }
                            })
                        }
                    })
                 }
            }
        })
    }
    

       
}
})


})

//PRIVATE route (POST) for bill generation...
app.post('/billGenerate',(req,res)=>{
    const token =req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else{
            var clientId = req.body.clientId;
            var date = req.body.date.toString();

              saleDataModel.find({"clientId":clientId,"saleDate":date},(err,doc)=>{
                if(err) res.send(err);
                else{
                    clientDataModel.findOne({"clientId":clientId},(err,clientData)=>{
                        if(err) res.send(err);
                        else if(clientData){
                            var paidNow = 0;
                            var totalCostOfItems=0;
                            for (const index in doc) {  
                                paidNow=paidNow+doc[index].amountPaid;
                              }
                              for (const i in doc) {  
                                totalCostOfItems=totalCostOfItems+doc[i].netPayableAmount;
                              }
                              var currentUnsettledAmount = parseFloat(totalCostOfItems)-parseFloat(paidNow);
                              //converting number to words..
                              var inWords = converter.toWords(totalCostOfItems);
                            res.status(200).render("bill",{billData:doc,clientLog:clientData,paidAmount:paidNow,totalBill:totalCostOfItems,currUnsettled:currentUnsettledAmount,wordFig:inWords});
                         
                            // getting the pdf of the document.....(bill)

                        }
                        else{res.send('No client data available...')}
                    })
                    // here find by date and generate bill.....
                   /**/
                }
            })
        }
    })
})




// starting the server..
const port = process.env.PORT || 8080;
app.listen(port,()=>{
    console.log(`Server is up and running at port ${port}`);
})
