import multer from "multer";

const imageMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const profileImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!imageMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Profile image must be a JPG, PNG, WEBP, or GIF file."));
    }
    return cb(null, true);
  },
});

export const taskAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});
