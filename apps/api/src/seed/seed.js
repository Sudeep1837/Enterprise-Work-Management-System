import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import env from "../config/env.js";
import User from "../models/User.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import ActivityLog from "../models/ActivityLog.js";

const runSeed = async () => {
  try {
    console.log("Connecting to MongoDB...");
    console.log(`[DEBUG] MONGODB_URI: ${env.mongoUri}`);
    await mongoose.connect(env.mongoUri);
    console.log("Connected.");

    console.log("Clearing existing data...");
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      Task.deleteMany({}),
      Comment.deleteMany({}),
      Notification.deleteMany({}),
      ActivityLog.deleteMany({}),
    ]);

    const salt = await bcrypt.genSalt(10);
    const passwordHash1 = await bcrypt.hash("Admin@123", salt);
    const passwordHash2 = await bcrypt.hash("Manager@123", salt);
    const passwordHash3 = await bcrypt.hash("Employee@123", salt);

    console.log("Creating users...");
    const admin = await User.create({
      name: "Admin User",
      email: "admin@demo.com",
      passwordHash: passwordHash1,
      role: "admin",
      active: true,
      avatar: "https://i.pravatar.cc/150?u=admin",
    });

    const manager = await User.create({
      name: "Manager Kunal",
      email: "manager@demo.com",
      passwordHash: passwordHash2,
      role: "manager",
      active: true,
      avatar: "https://i.pravatar.cc/150?u=manager",
    });

    const employee = await User.create({
      name: "Employee Jane",
      email: "employee@demo.com",
      passwordHash: passwordHash3,
      role: "employee",
      active: true,
      avatar: "https://i.pravatar.cc/150?u=employee",
    });

    console.log("Creating projects...");
    const project1 = await Project.create({
      name: "Website Redesign",
      description: "Overhaul the corporate website.",
      status: "Active",           // FIX: was "active"
      owner: manager.name,
      ownerId: manager._id,
      members: [manager._id, employee._id],
      createdBy: admin._id,
    });

    console.log("Creating tasks...");
    const task1 = await Task.create({
      title: "Design Homepage",
      description: "Create wireframes for the new homepage.",
      type: "Feature",            // FIX: was "task"
      status: "Todo",             // FIX: was "todo"
      priority: "High",           // FIX: was "high"
      assigneeId: employee._id,
      assigneeName: employee.name,
      reporterId: manager._id,
      reporterName: manager.name,
      projectId: project1._id,
      projectName: project1.name,
    });

    const task2 = await Task.create({
      title: "Review Design",
      description: "Review homepage wireframes.",
      type: "Feature",            // FIX: was "task"
      status: "In Progress",      // FIX: was "todo"
      priority: "Medium",         // FIX: was "medium"
      assigneeId: manager._id,
      assigneeName: manager.name,
      reporterId: admin._id,
      reporterName: admin.name,
      projectId: project1._id,
      projectName: project1.name,
    });

    console.log("Creating comment...");
    await Comment.create({
      taskId: task1._id,
      authorId: manager._id,
      authorName: manager.name,
      content: "Please prioritize the hero section.",
    });

    await Task.updateOne({ _id: task1._id }, { $inc: { commentsCount: 1 } });

    console.log("Creating activity log...");
    await ActivityLog.create({
      actorId: admin._id,
      actorName: admin.name,
      action: "Project Created",
      entityType: "project",
      entityId: project1._id,
      metadata: { projectName: project1.name },
    });

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

runSeed();

