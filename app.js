//app.js
const { join } = require("node:path");
const express = require("express");
const morgan = require("morgan");
const dotenv = require("dotenv");
const { connectToDatabase } = require("./database/database-connection");
const { AppError } = require("./utils/app-error");
const { addAdmin } = require("./utils/add-admin");
const appRouter = require("./routes/app-route");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { globalErrorHandler } = require("./controller/error-handler-controller");

// const { addCategoryAndSubCategory } = require("./utils/add-category-subCategory");

const dotenvConfig = dotenv.config({ path: join(__dirname, "./config.env") });

if (!!dotenvConfig.error) {
  console.error("[-] dotenv config", dotenvConfig.error.message);
  console.info("[i] process terminated.");

  process.exit(1);
}

const port = process.env.PORT;
const host = process.env.HOST;

//synchronous unhandled error(uncaught exception)
process.on("uncaughtException", (err) => {
  console.log(err.name, err.message);
  console.log("server  shutting down");
  process.exit(1);
});

const app = express();

connectToDatabase().then(() => {
  addAdmin();
  // addCategoryAndSubCategory();
});

app.use(morgan("dev"));

app.use(express.static(join(__dirname, "./public")));

app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

app.use("/", appRouter);

app.all("*", (req, res, next) => {
  const { method, originalUrl } = req;
  next(new AppError(404, `can't find ${method} ${originalUrl}`));
});

app.use(globalErrorHandler);

const server = app.listen(port, host, () => {
  console.info(`[i] app is running on ${host}:${port} ...`);
});

process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("server sgutting down");
  server.close(() => {
    process.exit(1);
  });
});
