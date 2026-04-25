import express from "express";
import {
  signup,
  login,
  me,
  updateProfile,
  updateProfileImage,
  removeProfileImage,
  changePassword,
} from "../../controllers/auth/authController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { profileImageUpload } from "../../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authMiddleware, me);
router.patch("/profile", authMiddleware, updateProfile);
router.patch("/profile/image", authMiddleware, profileImageUpload.single("profileImage"), updateProfileImage);
router.delete("/profile/image", authMiddleware, removeProfileImage);
router.patch("/change-password", authMiddleware, changePassword);

export default router;
