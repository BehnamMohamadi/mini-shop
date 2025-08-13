//multer-config.js

const multer = require("multer");
const { AppError } = require("./app-error");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  file.mimetype.startsWith("image")
    ? cb(null, true)
    : cb(new AppError(400, "not an image format."), false);
};

const multerUpload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

module.exports = { multerUpload };
