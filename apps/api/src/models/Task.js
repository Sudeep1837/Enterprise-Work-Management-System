import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    type: { type: String, enum: ["Bug", "Feature", "Improvement", "task"], default: "Feature" },
    status: { type: String, enum: ["Todo", "In Progress", "Review", "Done"], default: "Todo" },
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    dueDate: { type: Date },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assigneeName: { type: String },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reporterName: { type: String },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    projectName: { type: String },
    attachments: [{ 
      id: { type: String },
      name: { type: String },
      url: { type: String },
      downloadUrl: { type: String },
      publicId: { type: String },
      resourceType: { type: String },
      type: { type: String },
      size: { type: Number },
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      uploadedByName: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    }],
    commentsCount: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

taskSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const Task = mongoose.model("Task", taskSchema);

export default Task;
