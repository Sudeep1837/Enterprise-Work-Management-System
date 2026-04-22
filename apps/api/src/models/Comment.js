import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, required: true },
    authorAvatar: { type: String },
    content: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

commentSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
