const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const amqp = require("amqplib");
const Product = require("./models/product");
const { isAuthenticated } = require("../isAuthenticated");

let channel;
let connection;
var order;

mongoose.connect(
  "mongodb://localhost:27017/product-service",
  {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) return err;

    console.log("product-service db connected ");
  }
);

//user schema

const app = express();

const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

async function connect() {
  const amqpServer = "amqp://localhost:5672";
  connection = await amqp.connect(amqpServer);
  channel = await connection.createChannel();
  await channel.assertQueue("PRODUCT");
}
connect();
//Products
app.post("/product/create", isAuthenticated, async (req, res) => {
  const { name, description, price } = req.body;

  const newProduct = new Product({
    name,
    description,
    price,
  });

  await newProduct.save();
  return res.status(201).json(newProduct);
});

app.post("/product/buy", isAuthenticated, async (req, res) => {
  const { ids } = req.body;
  const products = await Product.find({ _id: { $in: ids } });
  //Send the products the users ordered to the Order to queue
  channel.sendToQueue(
    "ORDER",
    Buffer.from(
      JSON.stringify({
        products,
        userEmail: req.user.email,
      })
    )
  );

  //recieve the returns of the data after orders completed
  channel.consume("PRODUCT", (data) => {
    console.log("consuming product");
    order = JSON.parse(data.content);
    channel.ack(data);
  });
  return res.json({ order });
});

app.listen(PORT, () => console.log(`product service running on Port ${PORT}`));
