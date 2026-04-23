import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import env from "../config/env.js";
import User from "../models/User.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import ActivityLog from "../models/ActivityLog.js";

/**
 * Seed script — builds a clear 5-user hierarchy for testing all RBAC rules:
 *
 * Admin:
 *   admin@demo.com / Admin@123
 *
 * Managers:
 *   kunal@demo.com / Manager@123  → team: Engineering
 *   priya@demo.com / Manager@123  → team: Design
 *
 * Employees:
 *   jane@demo.com  / Employee@123 → team: Engineering, manager: Kunal
 *   alex@demo.com  / Employee@123 → team: Engineering, manager: Kunal
 *   raj@demo.com   / Employee@123 → team: Design,      manager: Priya
 *
 * Projects:
 *   "Platform Relaunch"  → owned by Kunal (Engineering)
 *   "Brand Identity"     → owned by Priya  (Design)
 *
 * Verification cases covered:
 *   ✓ same-team assignment (Kunal → Jane, Alex)
 *   ✓ cross-team restriction (Kunal cannot assign to Raj unless project member)
 *   ✓ employee self-assignment only
 *   ✓ admin cross-team assignment
 *   ✓ Reports To column displays correctly for all employees
 *   ✓ legacy graceful: admin has no managerId
 */
const runSeed = async () => {
  try {
    console.log("Connecting to MongoDB...");
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
    const adminHash    = await bcrypt.hash("Admin@123",    salt);
    const managerHash  = await bcrypt.hash("Manager@123",  salt);
    const employeeHash = await bcrypt.hash("Employee@123", salt);

    // ── 1. Admin ─────────────────────────────────────────────────────────────
    console.log("Creating users...");
    const admin = await User.create({
      name: "Admin User",
      email: "admin@demo.com",
      passwordHash: adminHash,
      role: "admin",
      team: "",        // admin has no required team
      managerId: null,
      active: true,
      avatar: "https://i.pravatar.cc/150?u=admin",
    });

    // ── 2. Managers ──────────────────────────────────────────────────────────
    const kunal = await User.create({
      name: "Manager Kunal",
      email: "kunal@demo.com",
      passwordHash: managerHash,
      role: "manager",
      team: "Engineering",
      managerId: null,
      active: true,
      avatar: "https://i.pravatar.cc/150?u=kunal",
    });

    const priya = await User.create({
      name: "Manager Priya",
      email: "priya@demo.com",
      passwordHash: managerHash,
      role: "manager",
      team: "Design",
      managerId: null,
      active: true,
      avatar: "https://i.pravatar.cc/150?u=priya",
    });

    // ── 3. Employees ─────────────────────────────────────────────────────────
    // Jane: Engineering → reports to Kunal
    const jane = await User.create({
      name: "Employee Jane",
      email: "jane@demo.com",
      passwordHash: employeeHash,
      role: "employee",
      team: "Engineering",
      managerId: kunal._id,
      active: true,
      avatar: "https://i.pravatar.cc/150?u=jane",
    });

    // Alex: Engineering → reports to Kunal
    const alex = await User.create({
      name: "Employee Alex",
      email: "alex@demo.com",
      passwordHash: employeeHash,
      role: "employee",
      team: "Engineering",
      managerId: kunal._id,
      active: true,
      avatar: "https://i.pravatar.cc/150?u=alex",
    });

    // Raj: Design → reports to Priya
    const raj = await User.create({
      name: "Employee Raj",
      email: "raj@demo.com",
      passwordHash: employeeHash,
      role: "employee",
      team: "Design",
      managerId: priya._id,
      active: true,
      avatar: "https://i.pravatar.cc/150?u=raj",
    });

    // ── 4. Projects ───────────────────────────────────────────────────────────
    console.log("Creating projects...");

    // Project 1: owned by Kunal — Engineering team + Raj as a cross-team member
    // This lets us test: Kunal can assign to Raj ONLY because Raj is a project member
    const project1 = await Project.create({
      name: "Platform Relaunch",
      description: "Full overhaul of the customer-facing platform.",
      status: "Active",
      owner: kunal.name,
      ownerId: kunal._id,
      members: [kunal._id, jane._id, alex._id, raj._id], // raj is cross-team but project member
      createdBy: admin._id,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-07-31"),
    });

    // Project 2: owned by Priya — Design team only
    const project2 = await Project.create({
      name: "Brand Identity",
      description: "Redesign the visual language and component library.",
      status: "Active",
      owner: priya.name,
      ownerId: priya._id,
      members: [priya._id, raj._id],
      createdBy: admin._id,
      startDate: new Date("2026-04-15"),
      endDate: new Date("2026-06-30"),
    });

    // ── 5. Tasks ──────────────────────────────────────────────────────────────
    console.log("Creating tasks...");

    // Task 1: Jane assigned (same-team, Kunal can assign)
    const task1 = await Task.create({
      title: "Build API authentication layer",
      description: "Implement JWT-based auth with refresh tokens.",
      type: "Feature",
      status: "In Progress",
      priority: "High",
      assigneeId: jane._id,
      assigneeName: jane.name,
      reporterId: kunal._id,
      reporterName: kunal.name,
      projectId: project1._id,
      projectName: project1.name,
      dueDate: new Date("2026-05-15"),
    });

    // Task 2: Alex assigned (same-team, Kunal can assign)
    const task2 = await Task.create({
      title: "Implement caching strategy",
      description: "Add Redis caching for high-traffic endpoints.",
      type: "Improvement",
      status: "Todo",
      priority: "Medium",
      assigneeId: alex._id,
      assigneeName: alex.name,
      reporterId: kunal._id,
      reporterName: kunal.name,
      projectId: project1._id,
      projectName: project1.name,
      dueDate: new Date("2026-05-30"),
    });

    // Task 3: Raj assigned on project1 (cross-team but project member — allowed)
    const task3 = await Task.create({
      title: "Design system integration",
      description: "Integrate Design team component library into the platform.",
      type: "Feature",
      status: "Review",
      priority: "High",
      assigneeId: raj._id,
      assigneeName: raj.name,
      reporterId: kunal._id,
      reporterName: kunal.name,
      projectId: project1._id,
      projectName: project1.name,
      dueDate: new Date("2026-05-10"),
    });

    // Task 4: Raj on project2 (Priya's project — same-team)
    const task4 = await Task.create({
      title: "Create color palette tokens",
      description: "Define and document the full color token system.",
      type: "Feature",
      status: "Todo",
      priority: "Medium",
      assigneeId: raj._id,
      assigneeName: raj.name,
      reporterId: priya._id,
      reporterName: priya.name,
      projectId: project2._id,
      projectName: project2.name,
      dueDate: new Date("2026-05-20"),
    });

    // Task 5: Priya assigned on her own project (manager self-assign)
    const task5 = await Task.create({
      title: "Audit existing brand assets",
      description: "Review all current logos, icons, and typefaces.",
      type: "Improvement",
      status: "Done",
      priority: "Low",
      assigneeId: priya._id,
      assigneeName: priya.name,
      reporterId: admin._id,
      reporterName: admin.name,
      projectId: project2._id,
      projectName: project2.name,
      dueDate: new Date("2026-04-25"),
    });

    // Task 6: Kunal assigned on his own project
    const task6 = await Task.create({
      title: "Sprint planning and backlog grooming",
      description: "Define Q2 sprint goals and prioritize backlog.",
      type: "Improvement",
      status: "Done",
      priority: "Critical",
      assigneeId: kunal._id,
      assigneeName: kunal.name,
      reporterId: admin._id,
      reporterName: admin.name,
      projectId: project1._id,
      projectName: project1.name,
      dueDate: new Date("2026-04-20"),
    });

    // ── 6. Comments ───────────────────────────────────────────────────────────
    console.log("Creating comments...");
    const comment1 = await Comment.create({
      taskId: task1._id,
      authorId: kunal._id,
      authorName: kunal.name,
      content: "Prioritize token refresh before the integration review on Friday.",
    });
    await Task.updateOne({ _id: task1._id }, { $inc: { commentsCount: 1 } });

    const comment2 = await Comment.create({
      taskId: task3._id,
      authorId: priya._id,
      authorName: priya.name,
      content: "Please align with the Figma component library v2 — the latest export is in Confluence.",
    });
    await Task.updateOne({ _id: task3._id }, { $inc: { commentsCount: 1 } });

    // ── 7. Activity Log ───────────────────────────────────────────────────────
    console.log("Creating activity log...");
    await ActivityLog.create([
      {
        actorId: admin._id,
        actorName: admin.name,
        action: "Project Created",
        entityType: "project",
        entityId: project1._id,
        entityName: project1.name,
        metadata: {
          projectName: project1.name,
          richText: `${admin.name} created project "${project1.name}"`,
        },
      },
      {
        actorId: admin._id,
        actorName: admin.name,
        action: "Project Created",
        entityType: "project",
        entityId: project2._id,
        entityName: project2.name,
        metadata: {
          projectName: project2.name,
          richText: `${admin.name} created project "${project2.name}"`,
        },
      },
      {
        actorId: kunal._id,
        actorName: kunal.name,
        action: "Task Created",
        entityType: "task",
        entityId: task1._id,
        entityName: task1.title,
        metadata: {
          taskTitle: task1.title,
          assigneeName: jane.name,
          richText: `${kunal.name} assigned "${task1.title}" to ${jane.name}`,
        },
      },
    ]);

    console.log("\n✅ Seed complete!");
    console.log("──────────────────────────────────────────");
    console.log("  Admin:    admin@demo.com   / Admin@123");
    console.log("  Manager:  kunal@demo.com   / Manager@123  (Engineering)");
    console.log("  Manager:  priya@demo.com   / Manager@123  (Design)");
    console.log("  Employee: jane@demo.com    / Employee@123 (Engineering → Kunal)");
    console.log("  Employee: alex@demo.com    / Employee@123 (Engineering → Kunal)");
    console.log("  Employee: raj@demo.com     / Employee@123 (Design → Priya)");
    console.log("──────────────────────────────────────────\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
};

runSeed();
