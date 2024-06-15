import bcrypt from "bcrypt";
import Joi from "joi";
export const hashPassword = async (password) => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    console.log(error);
  }
};

export const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};
export function generateUniqueId() {
  // Generate a random string of characters
  const randomChars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  // Generate a unique ID by concatenating random characters
  let uniqueId = "";
  for (let i = 0; i < 10; i++) {
    uniqueId += randomChars.charAt(
      Math.floor(Math.random() * randomChars.length)
    );
  }

  return uniqueId;
}
export function validateUser(user) {
  console.log(user);
  const schema = Joi.object().keys({
    username: Joi.string().min(5).max(255).required(),
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().min(8).max(255).required(),
  });
  return schema.validate(user);
}
