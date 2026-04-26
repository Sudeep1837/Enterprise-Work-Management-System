import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    // Role is always lowercase internally: admin | manager | employee
    role: { type: String, enum: ["admin", "manager", "employee"], default: "employee" },
    // Team the user belongs to (required for manager and employee)
    team: { type: String, default: "" },
    // For employees: the manager they report to (must be a user with role="manager")
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    avatar: { type: String, default: "" },
    profileImageUrl: { type: String, default: "" },
    profileImagePublicId: { type: String, default: "" },
    active: { type: Boolean, default: true },
    status: { type: String, enum: ["online", "offline", "busy"], default: "offline" },
    lastActiveAt: { type: Date, default: Date.now },
    activityClearedAt: { type: Date },
    telemetryClearedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

userSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    delete returnedObject.passwordHash;
  },
});

const User = mongoose.model("User", userSchema);

export default User;
