const express = require("express");
const mongoose = require("mongoose");
const amqp = require("amqplib");
const Order = require("./models/order");

let channel;
let connection;

mongoose.connect(
  "mongodb://localhost:27017/order-service",
  {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) return err;

    console.log("order-service db connected ");
  }
);

//user schema

const app = express();

const PORT = process.env.PORT || 3003;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

async function connect() {
  const amqpServer = "amqp://localhost:5672";
  connection = await amqp.connect(amqpServer);
  channel = await connection.createChannel();
  await channel.assertQueue("ORDER");
}

function createOrder(products, userEmail) {
  //calc the total  price in an array
  let total = 0;

  for (let t = 0; t < products.length; t++) {
    total += products[t].price;
  }
  const newOrder = new Order({
    products,
    user: userEmail,
    total_price: total,
  });
  newOrder.save();
  return newOrder;
}

connect().then(() => {
  channel.consume("ORDER", (data) => {
    const { products, userEmail } = JSON.parse(data.content);
    const newOrder = createOrder(products, userEmail);
    console.log("consuming order queue");
    channel.ack(data);

    //return a response to the product service that the new order was successful
    channel.sendToQueue("PRODUCT", Buffer.from(JSON.stringify(newOrder)));
  });
});

app.listen(PORT, () => console.log(`order service running on Port ${PORT}`));
