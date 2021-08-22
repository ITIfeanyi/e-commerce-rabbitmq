const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

mongoose.connect(
  "mongodb://localhost:27017/auth-service",
  {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) return err;

    console.log("auth-service db connected ");
  }
);

//user schema
const User = require("./models/user");

const app = express();

const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res
      .status(404)
      .json({ message: "User with this email does not exist" });
  }
  if (password !== user.password) {
    return res.status(404).json({ message: "password incorrect" });
  }
  const payload = {
    email,
    name: user.name,
  };

  jwt.sign(payload, "secret", (err, token) => {
    if (err) {
      res.status(500).json(err);
    }
    return res.status(200).json({ token });
  });
});

app.post("/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: "user already exist" });
  }

  const newUser = new User({
    name,
    email,
    password,
  });

  await newUser.save();

  return res.status(201).json(newUser);
});

app.listen(PORT, () => console.log(`Auth service running on Port ${PORT}`));
