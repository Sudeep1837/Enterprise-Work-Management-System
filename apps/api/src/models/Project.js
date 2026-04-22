import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["Planning", "Active", "On Hold", "Completed"], default: "Active" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    owner: { type: String }, 
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    startDate: { type: Date },
    endDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

projectSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const Project = mongoose.model("Project", projectSchema);

export default Project;
