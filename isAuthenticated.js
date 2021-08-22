const jwt = require("jsonwebtoken");

module.exports = {
  isAuthenticated: async (req, res, next) => {
    const token = req.headers["authorization"].split(" ")[1];
    jwt.verify(token, "secret", (err, user) => {
      if (err) {
        return res.status(400).json({ err });
      }
      req.user = user;
      next();
    });
  },
};
