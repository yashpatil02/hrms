import { PrismaClient } from "@prisma/client";
import { createNotification } from "../utils/createNotification.js";
import { sendDocumentRequestEmail } from "../utils/mailer.js";
import cloudinary from "../utils/cloudinary.js";

const prisma = new PrismaClient();

/* ─── helper: upload buffer to Cloudinary ─── */
const uploadToCloudinary = (buffer, mimetype) =>
  new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return reject(new Error("Cloudinary env vars not configured (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)"));
    }
    const resourceType = mimetype.includes("pdf") ? "raw" : "image";
    const stream = cloudinary.uploader.upload_stream(
      { folder: "employee-documents", resource_type: resourceType, unique_filename: true },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

/* ─────────────────────────────────────────────────────────────
   GET ALL USERS WITH DOCUMENT COUNT  (Admin / HR)
───────────────────────────────────────────────────────────── */
export const getEmployeesWithDocuments = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        designation: true,
        avatar: true,
        documents: { select: { id: true } },
        documentRequests: {
          where:  { status: "PENDING" },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json(users.map((u) => ({
      id:              u.id,
      name:            u.name,
      email:           u.email,
      role:            u.role,
      department:      u.department,
      designation:     u.designation,
      avatar:          u.avatar,
      documentCount:   u.documents.length,
      pendingRequests: u.documentRequests.length,
    })));
  } catch (err) {
    console.error("getEmployeesWithDocuments error:", err);
    res.status(500).json({ msg: "Failed to fetch users" });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET DOCUMENTS OF A SPECIFIC USER  (Admin / HR)
───────────────────────────────────────────────────────────── */
export const getEmployeeDocuments = async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);

    const [documents, requests, user] = await Promise.all([
      prisma.employeeDocument.findMany({
        where:   { employeeId },
        orderBy: { createdAt: "desc" },
        include: { admin: { select: { id: true, name: true, role: true } } },
      }),
      prisma.documentRequest.findMany({
        where:   { userId: employeeId },
        orderBy: { createdAt: "desc" },
        include: { requestedByUser: { select: { id: true, name: true } } },
      }),
      prisma.user.findUnique({
        where:  { id: employeeId },
        select: { id: true, name: true, email: true, role: true, department: true, designation: true, avatar: true },
      }),
    ]);

    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json({ user, documents, requests });
  } catch (err) {
    console.error("getEmployeeDocuments error:", err);
    res.status(500).json({ msg: "Failed to fetch documents" });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET MY DOCUMENTS  (Employee — own documents + pending requests)
───────────────────────────────────────────────────────────── */
export const getMyDocuments = async (req, res) => {
  try {
    const userId = req.user.id;

    const [documents, requests] = await Promise.all([
      prisma.employeeDocument.findMany({
        where:   { employeeId: userId },
        orderBy: { createdAt: "desc" },
        include: { admin: { select: { id: true, name: true, role: true } } },
      }),
      prisma.documentRequest.findMany({
        where:   { userId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: { requestedByUser: { select: { id: true, name: true } } },
      }),
    ]);

    res.json({ documents, requests });
  } catch (err) {
    console.error("getMyDocuments error:", err);
    res.status(500).json({ msg: "Failed to fetch your documents" });
  }
};

/* ─────────────────────────────────────────────────────────────
   UPLOAD DOCUMENT  (Admin/HR — uploads for any user)
───────────────────────────────────────────────────────────── */
export const uploadDocument = async (req, res) => {
  try {
    const { employeeId, documentType } = req.body;
    const uploadedBy = req.user.id;

    if (!employeeId || !documentType)
      return res.status(400).json({ msg: "employeeId and documentType required" });
    if (!req.file)
      return res.status(400).json({ msg: "File required" });

    const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);

    const document = await prisma.employeeDocument.create({
      data: {
        employeeId:  Number(employeeId),
        uploadedBy,
        documentType,
        fileName:    req.file.originalname,
        fileUrl:     result.secure_url,
        publicId:    result.public_id,
        mimeType:    req.file.mimetype,
        fileSize:    req.file.size,
      },
    });

    await createNotification({
      userId:      Number(employeeId),
      title:       "Document Added to Your Profile",
      message:     `A "${documentType}" has been added to your profile by HR/Admin.`,
      type:        "INFO",
      entity:      "DOCUMENT",
      entityId:    null,
      socketEvent: "notification:new",
    });

    res.json({ msg: "Document uploaded successfully", document });
  } catch (err) {
    console.error("uploadDocument error:", err?.message || err);
    res.status(500).json({ msg: err?.message?.includes("Cloudinary") ? "File storage not configured on server" : "Document upload failed" });
  }
};

/* ─────────────────────────────────────────────────────────────
   SELF UPLOAD  (Employee — uploads their own document)
───────────────────────────────────────────────────────────── */
export const selfUploadDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const { documentType, requestId } = req.body;

    if (!documentType)
      return res.status(400).json({ msg: "documentType required" });
    if (!req.file)
      return res.status(400).json({ msg: "File required" });

    const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);

    const document = await prisma.employeeDocument.create({
      data: {
        employeeId:  userId,
        uploadedBy:  userId,
        documentType,
        fileName:    req.file.originalname,
        fileUrl:     result.secure_url,
        publicId:    result.public_id,
        mimeType:    req.file.mimetype,
        fileSize:    req.file.size,
      },
    });

    if (requestId) {
      await prisma.documentRequest.updateMany({
        where: { id: Number(requestId), userId, status: "PENDING" },
        data:  { status: "FULFILLED", fulfilledAt: new Date() },
      });
    }

    await createNotification({
      userId:      null,
      title:       "Employee Uploaded Document",
      message:     `${req.user.name} uploaded "${documentType}".`,
      type:        "INFO",
      entity:      "DOCUMENT",
      entityId:    null,
      socketEvent: "notification:new",
    });

    res.json({ msg: "Document uploaded successfully", document });
  } catch (err) {
    console.error("selfUploadDocument error:", err);
    res.status(500).json({ msg: "Upload failed" });
  }
};

/* ─────────────────────────────────────────────────────────────
   REQUEST DOCUMENT  (Admin/HR — asks employee to upload)
───────────────────────────────────────────────────────────── */
export const requestDocument = async (req, res) => {
  try {
    const { userId, documentType, message } = req.body;
    if (!userId || !documentType)
      return res.status(400).json({ msg: "userId and documentType required" });

    const employee = await prisma.user.findUnique({
      where:  { id: Number(userId) },
      select: { id: true, name: true, email: true },
    });
    if (!employee) return res.status(404).json({ msg: "User not found" });

    const docRequest = await prisma.documentRequest.create({
      data: {
        userId:      Number(userId),
        requestedBy: req.user.id,
        documentType,
        message:     message?.trim() || null,
      },
    });

    await createNotification({
      userId:      employee.id,
      title:       "Document Upload Required",
      message:     `Please upload your "${documentType}".${message ? " — " + message : ""}`,
      type:        "WARNING",
      entity:      "DOCUMENT",
      entityId:    null,
      socketEvent: "notification:new",
    });

    sendDocumentRequestEmail(employee.email, { name: employee.name }, {
      documentType,
      message,
      requestedBy: req.user.name,
    });

    res.json({ msg: "Document request sent", request: docRequest });
  } catch (err) {
    console.error("requestDocument error:", err);
    res.status(500).json({ msg: "Failed to send document request" });
  }
};

/* ─────────────────────────────────────────────────────────────
   CANCEL REQUEST  (Admin/HR)
───────────────────────────────────────────────────────────── */
export const cancelDocumentRequest = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.documentRequest.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ msg: "Request not found" });

    await prisma.documentRequest.update({ where: { id }, data: { status: "CANCELLED" } });
    res.json({ msg: "Request cancelled" });
  } catch (err) {
    console.error("cancelDocumentRequest error:", err);
    res.status(500).json({ msg: "Cancel failed" });
  }
};

/* ─────────────────────────────────────────────────────────────
   DOWNLOAD  — redirect to Cloudinary URL
───────────────────────────────────────────────────────────── */
export const downloadDocument = async (req, res) => {
  try {
    const document = await prisma.employeeDocument.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ msg: "Document not found" });

    if (req.user.role === "EMPLOYEE" && document.employeeId !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    // For Cloudinary-hosted files redirect with download disposition
    if (document.fileUrl?.startsWith("http")) {
      return res.redirect(document.fileUrl);
    }

    return res.status(404).json({ msg: "File not found" });
  } catch (err) {
    console.error("downloadDocument error:", err);
    res.status(500).json({ msg: "Download failed" });
  }
};

/* ─────────────────────────────────────────────────────────────
   PREVIEW  — redirect to Cloudinary URL
───────────────────────────────────────────────────────────── */
export const previewDocument = async (req, res) => {
  try {
    const document = await prisma.employeeDocument.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ msg: "Document not found" });

    if (req.user.role === "EMPLOYEE" && document.employeeId !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    if (document.fileUrl?.startsWith("http")) {
      return res.redirect(document.fileUrl);
    }

    return res.status(404).json({ msg: "File not found" });
  } catch (err) {
    console.error("previewDocument error:", err);
    res.status(500).json({ msg: "Preview failed" });
  }
};

/* ─────────────────────────────────────────────────────────────
   DELETE  — also removes from Cloudinary
───────────────────────────────────────────────────────────── */
export const deleteDocument = async (req, res) => {
  try {
    const document = await prisma.employeeDocument.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ msg: "Document not found" });

    if (req.user.role === "EMPLOYEE") {
      if (document.employeeId !== req.user.id || document.uploadedBy !== req.user.id)
        return res.status(403).json({ msg: "You can only delete documents you uploaded" });
    }

    // Delete from Cloudinary if publicId exists
    if (document.publicId) {
      const resourceType = document.mimeType?.includes("pdf") ? "raw" : "image";
      await cloudinary.uploader.destroy(document.publicId, { resource_type: resourceType }).catch(() => {});
    }

    await prisma.employeeDocument.delete({ where: { id: req.params.id } });
    res.json({ msg: "Document deleted" });
  } catch (err) {
    console.error("deleteDocument error:", err);
    res.status(500).json({ msg: "Delete failed" });
  }
};
