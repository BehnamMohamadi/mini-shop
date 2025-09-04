// routes/wishlist-routes.js - Wishlist API routes

const router = require("express").Router();
const { protect } = require("../controller/auth-controller");
const {
  toggleWishlist,
  getWishlist,
  checkWishlistStatus,
  getWishlistCount,
  removeFromWishlist,
  clearWishlist,
} = require("../controller/wishlist-controller");

// Protect all routes - user must be logged in
router.use(protect);

// Toggle product in/out of wishlist
router.post("/toggle/:productId", toggleWishlist);

// Get user's wishlist
router.get("/", getWishlist);

// Get wishlist count
router.get("/count", getWishlistCount);

// Check if specific product is in wishlist
router.get("/check/:productId", checkWishlistStatus);

// Remove specific product from wishlist
router.delete("/:productId", removeFromWishlist);

// Clear entire wishlist
router.delete("/", clearWishlist);

module.exports = router;

// Add this to your main app.js:
// app.use("/api/wishlist", require("./routes/wishlist-routes"));
