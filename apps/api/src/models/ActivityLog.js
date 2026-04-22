import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String },
    action: { type: String, required: true },
    entityType: { type: String, enum: ["task", "project", "user", "system"] },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    entityName: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

activityLogSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

export default ActivityLog;
