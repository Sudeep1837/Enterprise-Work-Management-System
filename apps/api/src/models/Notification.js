import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["info", "success", "warning", "error", "mention", "assignment"], default: "info" },
    read: { type: Boolean, default: false },
    relatedEntityType: { type: String, enum: ["task", "project", "comment", "user", "system"] },
    relatedEntityId: { type: mongoose.Schema.Types.ObjectId },
    actorName: { type: String },
    action: { type: String },
    entityName: { type: String },
    link: { type: String },
  },
  {
    timestamps: true,
  }
);

notificationSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
