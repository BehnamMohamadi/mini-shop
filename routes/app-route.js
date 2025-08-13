//app-route.js
const router = require("express").Router();

const apiRouter = require("./api-route");
const viewRouter = require("./view-route");

router.use("/", viewRouter);
router.use("/api", apiRouter);

module.exports = router;
