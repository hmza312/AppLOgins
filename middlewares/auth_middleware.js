export const requireSignIn = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!req.headers.authorization) {
      return res.status(401).send("Unauthorized request");
    }
    let tokenSplit = req.headers.authorization.split(" ")[1];
    console.log(tokenSplit, token);
    if (tokenSplit === "null") {
      return res.status(401).send("Unauthorized request");
    }
    let payload = JWT.verify(tokenSplit, process.env.JWT_SECRET);
    if (!payload) {
      return res.status(401).send("Unauthorized request");
    }
    // if (!token) {
    //   return res
    //     .status(401)
    //     .json({ message: "Unauthorized Access: Token is missing." });
    // }
    // const decode = JWT.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    console.log(error);
  }
};
