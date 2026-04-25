import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });

    Readable.from(buffer).pipe(upload);
  });
}

export async function uploadProfileImage(file, userId) {
  if (!file?.buffer) {
    throw new Error("Profile image file is required.");
  }

  return uploadBuffer(file.buffer, {
    folder: "ewms/profile-images",
    public_id: `user-${userId}-${Date.now()}`,
    overwrite: true,
    resource_type: "image",
    transformation: [
      { width: 512, height: 512, crop: "fill", gravity: "face" },
      { quality: "auto", fetch_format: "auto" },
    ],
  });
}

export async function deleteCloudinaryAsset(publicId) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
