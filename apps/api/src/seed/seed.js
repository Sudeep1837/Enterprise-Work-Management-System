import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import env from "../config/env.js";
import User from "../models/User.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import ActivityLog from "../models/ActivityLog.js";

const credentials = {
  admin: "Admin@123",
  manager: "Manager@123",
  employee: "Employee@123",
};

const dates = {
  past: (day) => new Date(`2026-04-${String(day).padStart(2, "0")}T09:00:00.000Z`),
  may: (day) => new Date(`2026-05-${String(day).padStart(2, "0")}T09:00:00.000Z`),
  june: (day) => new Date(`2026-06-${String(day).padStart(2, "0")}T09:00:00.000Z`),
  july: (day) => new Date(`2026-07-${String(day).padStart(2, "0")}T09:00:00.000Z`),
};

const clearDatabase = () =>
  Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Comment.deleteMany({}),
    Notification.deleteMany({}),
    ActivityLog.deleteMany({}),
  ]);

const runSeed = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(env.mongoUri);
    console.log("Connected.");

    console.log("Clearing existing data...");
    await clearDatabase();

    const salt = await bcrypt.genSalt(10);
    const passwordHashes = {
      admin: await bcrypt.hash(credentials.admin, salt),
      manager: await bcrypt.hash(credentials.manager, salt),
      employee: await bcrypt.hash(credentials.employee, salt),
    };

    const createUser = (user) =>
      User.create({
        ...user,
        passwordHash: passwordHashes[user.role],
        active: true,
        status: user.status || "offline",
      });

    console.log("Creating users...");
    const admin = await createUser({
      name: "Olivia Chen",
      email: "admin@demo.com",
      role: "admin",
      team: "",
      managerId: null,
      status: "online",
      avatar: "https://i.pravatar.cc/150?u=olivia.chen",
    });

    const manager1 = await createUser({
      name: "Kunal Shah",
      email: "kunal.manager@demo.com",
      role: "manager",
      team: "Engineering",
      managerId: null,
      status: "busy",
      avatar: "https://i.pravatar.cc/150?u=kunal.shah",
    });

    const manager2 = await createUser({
      name: "Priya Nair",
      email: "priya.manager@demo.com",
      role: "manager",
      team: "Design",
      managerId: null,
      status: "online",
      avatar: "https://i.pravatar.cc/150?u=priya.nair",
    });

    const employee1 = await createUser({
      name: "Maya Patel",
      email: "maya.employee@demo.com",
      role: "employee",
      team: "Engineering",
      managerId: manager1._id,
      status: "online",
      avatar: "https://i.pravatar.cc/150?u=maya.patel",
    });

    const employee2 = await createUser({
      name: "Ethan Brooks",
      email: "ethan.employee@demo.com",
      role: "employee",
      team: "Engineering",
      managerId: manager1._id,
      avatar: "https://i.pravatar.cc/150?u=ethan.brooks",
    });

    const employee3 = await createUser({
      name: "Anika Rao",
      email: "anika.employee@demo.com",
      role: "employee",
      team: "Design",
      managerId: manager2._id,
      status: "busy",
      avatar: "https://i.pravatar.cc/150?u=anika.rao",
    });

    const employee4 = await createUser({
      name: "Leo Martins",
      email: "leo.employee@demo.com",
      role: "employee",
      team: "Design",
      managerId: manager2._id,
      avatar: "https://i.pravatar.cc/150?u=leo.martins",
    });

    const users = {
      admin,
      manager1,
      manager2,
      employee1,
      employee2,
      employee3,
      employee4,
    };

    console.log("Creating projects...");
    const createProject = (project) => Project.create(project);

    const adminProject = await createProject({
      name: "Enterprise Operating Dashboard",
      description:
        "Executive reporting workspace for delivery health, resource allocation, and portfolio-level risk tracking.",
      status: "Active",
      owner: admin.name,
      ownerId: admin._id,
      members: [
        admin._id,
        manager1._id,
        manager2._id,
        employee1._id,
        employee3._id,
      ],
      createdBy: admin._id,
      startDate: dates.past(1),
      endDate: dates.july(31),
    });

    const engineeringProject = await createProject({
      name: "Customer Portal Modernization",
      description:
        "Modernize the customer portal with faster onboarding, clearer account workflows, and improved reliability.",
      status: "Active",
      owner: manager1.name,
      ownerId: manager1._id,
      members: [manager1._id, employee1._id, employee2._id],
      createdBy: admin._id,
      startDate: dates.past(8),
      endDate: dates.june(28),
    });

    const designProject = await createProject({
      name: "Design System Refresh",
      description:
        "Refresh product UI foundations, component guidance, and accessibility patterns for the next release cycle.",
      status: "Planning",
      owner: manager2.name,
      ownerId: manager2._id,
      members: [manager2._id, employee3._id, employee4._id],
      createdBy: admin._id,
      startDate: dates.past(15),
      endDate: dates.june(14),
    });

    const projects = {
      adminProject,
      engineeringProject,
      designProject,
    };

    const createTask = ({ assignee, reporter, project, ...task }) =>
      Task.create({
        ...task,
        assigneeId: assignee?._id,
        assigneeName: assignee?.name || "Unassigned",
        reporterId: reporter._id,
        reporterName: reporter.name,
        projectId: project._id,
        projectName: project.name,
      });

    console.log("Creating tasks...");
    const tasks = {};

    tasks.dashboardMetrics = await createTask({
      title: "Define executive KPI metric catalog",
      description:
        "Finalize the source, owner, refresh cadence, and calculation notes for each dashboard metric.",
      type: "Feature",
      status: "Done",
      priority: "High",
      assignee: manager1,
      reporter: admin,
      project: adminProject,
      dueDate: dates.past(12),
    });

    tasks.dashboardDataPipeline = await createTask({
      title: "Connect portfolio delivery data pipeline",
      description:
        "Integrate project, task, and team capacity data into the reporting service with daily refresh checks.",
      type: "Feature",
      status: "In Progress",
      priority: "Critical",
      assignee: employee1,
      reporter: admin,
      project: adminProject,
      dueDate: dates.may(9),
    });

    tasks.dashboardReview = await createTask({
      title: "Review portfolio risk visualization",
      description:
        "Validate the risk heatmap labels and drill-down behavior with operations stakeholders.",
      type: "Improvement",
      status: "Review",
      priority: "Medium",
      assignee: manager2,
      reporter: admin,
      project: adminProject,
      dueDate: dates.may(6),
    });

    tasks.dashboardUnassigned = await createTask({
      title: "Prepare quarterly leadership export",
      description:
        "Create a downloadable leadership summary with project health, overdue work, and team utilization.",
      type: "task",
      status: "Todo",
      priority: "Medium",
      reporter: admin,
      project: adminProject,
      dueDate: dates.may(18),
    });

    tasks.portalAuth = await createTask({
      title: "Implement single sign-on handoff",
      description:
        "Complete the customer SSO handoff, session renewal, and audit logging for enterprise accounts.",
      type: "Feature",
      status: "In Progress",
      priority: "Critical",
      assignee: employee1,
      reporter: manager1,
      project: engineeringProject,
      dueDate: dates.may(12),
    });

    tasks.portalAccountSettings = await createTask({
      title: "Build account settings workflow",
      description:
        "Deliver editable profile, billing contact, and notification preference screens for account admins.",
      type: "Feature",
      status: "Todo",
      priority: "High",
      assignee: employee2,
      reporter: manager1,
      project: engineeringProject,
      dueDate: dates.may(24),
    });

    tasks.portalBug = await createTask({
      title: "Resolve duplicate invitation bug",
      description:
        "Prevent duplicate onboarding invitations when an account admin retries a failed invite.",
      type: "Bug",
      status: "Review",
      priority: "High",
      assignee: employee2,
      reporter: manager1,
      project: engineeringProject,
      dueDate: dates.past(23),
    });

    tasks.portalCompleted = await createTask({
      title: "Retire legacy onboarding copy",
      description:
        "Move deprecated onboarding copy and screenshots into the release records for compliance reference.",
      type: "task",
      status: "Done",
      priority: "Low",
      assignee: manager1,
      reporter: admin,
      project: engineeringProject,
      dueDate: dates.past(18),
    });

    tasks.portalOverdue = await createTask({
      title: "Patch session timeout edge case",
      description:
        "Fix the expired-session redirect loop affecting customers who keep multiple portal tabs open.",
      type: "Bug",
      status: "Todo",
      priority: "Critical",
      assignee: employee1,
      reporter: manager1,
      project: engineeringProject,
      dueDate: dates.past(20),
    });

    tasks.portalUnassigned = await createTask({
      title: "Document portal release checklist",
      description:
        "Create the launch checklist covering smoke tests, rollback owners, analytics, and support readiness.",
      type: "Improvement",
      status: "Todo",
      priority: "Medium",
      reporter: manager1,
      project: engineeringProject,
      dueDate: dates.may(29),
    });

    tasks.designAudit = await createTask({
      title: "Audit high-traffic product screens",
      description:
        "Review the top product flows for visual inconsistency, accessibility gaps, and outdated components.",
      type: "Improvement",
      status: "Done",
      priority: "Medium",
      assignee: employee3,
      reporter: manager2,
      project: designProject,
      dueDate: dates.past(17),
    });

    tasks.designTokens = await createTask({
      title: "Publish updated color and spacing tokens",
      description:
        "Finalize token naming, usage notes, and migration examples for engineering handoff.",
      type: "Feature",
      status: "In Progress",
      priority: "High",
      assignee: employee3,
      reporter: manager2,
      project: designProject,
      dueDate: dates.may(10),
    });

    tasks.designComponents = await createTask({
      title: "Review data table component guidance",
      description:
        "Validate sorting, empty states, density controls, and accessibility notes for complex tables.",
      type: "Improvement",
      status: "Review",
      priority: "High",
      assignee: employee4,
      reporter: manager2,
      project: designProject,
      dueDate: dates.may(3),
    });

    tasks.designOverdue = await createTask({
      title: "Finalize accessibility annotation template",
      description:
        "Complete the annotation template used to mark focus order, keyboard behavior, and ARIA expectations.",
      type: "task",
      status: "Todo",
      priority: "High",
      assignee: employee4,
      reporter: manager2,
      project: designProject,
      dueDate: dates.past(22),
    });

    tasks.designUnassigned = await createTask({
      title: "Create release note illustrations",
      description:
        "Prepare lightweight product illustrations for release notes and internal enablement decks.",
      type: "task",
      status: "Todo",
      priority: "Low",
      reporter: manager2,
      project: designProject,
      dueDate: dates.may(21),
    });

    console.log("Creating comments...");
    const comments = await Comment.create([
      {
        taskId: tasks.dashboardDataPipeline._id,
        authorId: admin._id,
        authorName: admin.name,
        authorAvatar: admin.avatar,
        content:
          "Please include the refresh timestamp in the first dashboard slice so leadership can trust the snapshot.",
      },
      {
        taskId: tasks.portalAuth._id,
        authorId: manager1._id,
        authorName: manager1.name,
        authorAvatar: manager1.avatar,
        content:
          "Keep the audit event names aligned with the security review checklist before this moves to review.",
      },
      {
        taskId: tasks.portalBug._id,
        authorId: employee2._id,
        authorName: employee2.name,
        authorAvatar: employee2.avatar,
        content:
          "The duplicate invite path is covered by a regression test now. Ready for final review.",
      },
      {
        taskId: tasks.designComponents._id,
        authorId: manager2._id,
        authorName: manager2.name,
        authorAvatar: manager2.avatar,
        content:
          "Please add one compact-density example for operations teams before we publish the guidance.",
      },
    ]);

    const commentCounts = comments.reduce((counts, comment) => {
      const taskId = comment.taskId.toString();
      counts[taskId] = (counts[taskId] || 0) + 1;
      return counts;
    }, {});

    await Promise.all(
      Object.entries(commentCounts).map(([taskId, count]) =>
        Task.updateOne({ _id: taskId }, { $inc: { commentsCount: count } })
      )
    );

    console.log("Creating notifications...");
    await Notification.create([
      {
        userId: employee1._id,
        title: "New task assigned",
        message: `${manager1.name} assigned you "${tasks.portalAuth.title}".`,
        type: "assignment",
        read: false,
        relatedEntityType: "task",
        relatedEntityId: tasks.portalAuth._id,
        actorName: manager1.name,
        action: "Task Assigned",
        entityName: tasks.portalAuth.title,
        link: `/tasks/${tasks.portalAuth._id}`,
      },
      {
        userId: employee2._id,
        title: "Task ready for review",
        message: `"${tasks.portalBug.title}" is waiting for manager review.`,
        type: "info",
        read: false,
        relatedEntityType: "task",
        relatedEntityId: tasks.portalBug._id,
        actorName: employee2.name,
        action: "Moved to Review",
        entityName: tasks.portalBug.title,
        link: `/tasks/${tasks.portalBug._id}`,
      },
      {
        userId: employee4._id,
        title: "Task overdue",
        message: `"${tasks.designOverdue.title}" is past its due date.`,
        type: "warning",
        read: false,
        relatedEntityType: "task",
        relatedEntityId: tasks.designOverdue._id,
        actorName: manager2.name,
        action: "Due Date Missed",
        entityName: tasks.designOverdue.title,
        link: `/tasks/${tasks.designOverdue._id}`,
      },
      {
        userId: manager1._id,
        title: "Unassigned task available",
        message: `"${tasks.portalUnassigned.title}" is ready to be assigned to an Engineering team member.`,
        type: "info",
        read: true,
        relatedEntityType: "task",
        relatedEntityId: tasks.portalUnassigned._id,
        actorName: manager1.name,
        action: "Task Created",
        entityName: tasks.portalUnassigned.title,
        link: `/tasks/${tasks.portalUnassigned._id}`,
      },
      {
        userId: manager2._id,
        title: "Comment added",
        message: `${manager2.name} commented on "${tasks.designComponents.title}".`,
        type: "mention",
        read: false,
        relatedEntityType: "comment",
        relatedEntityId: comments[3]._id,
        actorName: manager2.name,
        action: "Comment Added",
        entityName: tasks.designComponents.title,
        link: `/tasks/${tasks.designComponents._id}`,
      },
    ]);

    console.log("Creating activity logs...");
    await ActivityLog.create([
      {
        actorId: admin._id,
        actorName: admin.name,
        action: "Project Created",
        entityType: "project",
        entityId: adminProject._id,
        entityName: adminProject.name,
        metadata: {
          projectName: adminProject.name,
          ownerName: admin.name,
          richText: `${admin.name} created project "${adminProject.name}" for portfolio reporting.`,
        },
      },
      {
        actorId: admin._id,
        actorName: admin.name,
        action: "Project Created",
        entityType: "project",
        entityId: engineeringProject._id,
        entityName: engineeringProject.name,
        metadata: {
          projectName: engineeringProject.name,
          ownerName: manager1.name,
          richText: `${admin.name} created project "${engineeringProject.name}" and assigned ${manager1.name} as owner.`,
        },
      },
      {
        actorId: admin._id,
        actorName: admin.name,
        action: "Project Created",
        entityType: "project",
        entityId: designProject._id,
        entityName: designProject.name,
        metadata: {
          projectName: designProject.name,
          ownerName: manager2.name,
          richText: `${admin.name} created project "${designProject.name}" and assigned ${manager2.name} as owner.`,
        },
      },
      {
        actorId: manager1._id,
        actorName: manager1.name,
        action: "Task Assigned",
        entityType: "task",
        entityId: tasks.portalAuth._id,
        entityName: tasks.portalAuth.title,
        metadata: {
          taskTitle: tasks.portalAuth.title,
          assigneeName: employee1.name,
          projectName: engineeringProject.name,
          richText: `${manager1.name} assigned "${tasks.portalAuth.title}" to ${employee1.name}.`,
        },
      },
      {
        actorId: manager1._id,
        actorName: manager1.name,
        action: "Task Created",
        entityType: "task",
        entityId: tasks.portalUnassigned._id,
        entityName: tasks.portalUnassigned.title,
        metadata: {
          taskTitle: tasks.portalUnassigned.title,
          assigneeName: "Unassigned",
          projectName: engineeringProject.name,
          richText: `${manager1.name} created unassigned task "${tasks.portalUnassigned.title}".`,
        },
      },
      {
        actorId: employee2._id,
        actorName: employee2.name,
        action: "Status Changed",
        entityType: "task",
        entityId: tasks.portalBug._id,
        entityName: tasks.portalBug.title,
        metadata: {
          fromStatus: "In Progress",
          toStatus: "Review",
          taskTitle: tasks.portalBug.title,
          richText: `${employee2.name} moved "${tasks.portalBug.title}" to Review.`,
        },
      },
      {
        actorId: employee3._id,
        actorName: employee3.name,
        action: "Task Completed",
        entityType: "task",
        entityId: tasks.designAudit._id,
        entityName: tasks.designAudit.title,
        metadata: {
          taskTitle: tasks.designAudit.title,
          projectName: designProject.name,
          richText: `${employee3.name} completed "${tasks.designAudit.title}".`,
        },
      },
      {
        actorId: manager2._id,
        actorName: manager2.name,
        action: "Comment Added",
        entityType: "task",
        entityId: tasks.designComponents._id,
        entityName: tasks.designComponents.title,
        metadata: {
          taskTitle: tasks.designComponents.title,
          commentPreview: comments[3].content,
          richText: `${manager2.name} commented on "${tasks.designComponents.title}".`,
        },
      },
    ]);

    const taskStatusMix = await Task.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const taskTypeMix = await Task.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const unassignedCount = await Task.countDocuments({
      $or: [{ assigneeId: { $exists: false } }, { assigneeId: null }],
    });

    console.log("\nSeed complete.");
    console.log("Users:");
    console.log(`  Admin:    ${admin.name} <${admin.email}> / ${credentials.admin}`);
    console.log(
      `  Manager:  ${manager1.name} <${manager1.email}> / ${credentials.manager} (Engineering)`
    );
    console.log(
      `  Manager:  ${manager2.name} <${manager2.email}> / ${credentials.manager} (Design)`
    );
    console.log(
      `  Employee: ${employee1.name} <${employee1.email}> / ${credentials.employee} (Engineering -> ${manager1.name})`
    );
    console.log(
      `  Employee: ${employee2.name} <${employee2.email}> / ${credentials.employee} (Engineering -> ${manager1.name})`
    );
    console.log(
      `  Employee: ${employee3.name} <${employee3.email}> / ${credentials.employee} (Design -> ${manager2.name})`
    );
    console.log(
      `  Employee: ${employee4.name} <${employee4.email}> / ${credentials.employee} (Design -> ${manager2.name})`
    );

    console.log("\nProjects:");
    Object.values(projects).forEach((project) => {
      console.log(`  ${project.name} - owner: ${project.owner}`);
    });

    console.log("\nTask status mix:");
    taskStatusMix.forEach((item) => console.log(`  ${item._id}: ${item.count}`));

    console.log("\nTask type mix:");
    taskTypeMix.forEach((item) => console.log(`  ${item._id}: ${item.count}`));

    console.log(`\nUnassigned tasks included: ${unassignedCount} total`);
    console.log("Seeded comments, notifications, and activity logs for demo workflows.\n");

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

runSeed();
