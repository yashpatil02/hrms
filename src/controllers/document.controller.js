import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();

/*
========================================
GET ALL EMPLOYEES WITH DOCUMENT COUNT
ACCESS: ADMIN
========================================
*/
export const getEmployeesWithDocuments = async (req, res) => {
  try {

    const employees = await prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        documents: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const result = employees.map((emp) => ({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      documentCount: emp.documents.length,
    }));

    res.json(result);

  } catch (error) {

    console.error("Get employees documents error:", error);

    res.status(500).json({
      msg: "Failed to fetch employees",
    });

  }
};


/*
========================================
GET DOCUMENTS OF SPECIFIC EMPLOYEE
ACCESS: ADMIN
========================================
*/
export const getEmployeeDocuments = async (req, res) => {

  try {

    const { employeeId } = req.params;

    const documents = await prisma.employeeDocument.findMany({

      where: {
        employeeId: Number(employeeId),
      },

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        documentType: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
      },

    });

    res.json(documents);

  } catch (error) {

    console.error("Get employee documents error:", error);

    res.status(500).json({
      msg: "Failed to fetch documents",
    });

  }

};


/*
========================================
UPLOAD DOCUMENT
ACCESS: ADMIN, HR
========================================
*/
export const uploadDocument = async (req, res) => {

  try {

    const { employeeId, documentType } = req.body;

    const uploadedBy = req.user.id;

    if (!employeeId || !documentType) {

      return res.status(400).json({
        msg: "employeeId and documentType required",
      });

    }

    if (!req.file) {

      return res.status(400).json({
        msg: "File required",
      });

    }

    const document = await prisma.employeeDocument.create({

      data: {

        employeeId: Number(employeeId),

        uploadedBy,

        documentType,

        fileName: req.file.originalname,

        fileUrl: req.file.filename,

        mimeType: req.file.mimetype,

        fileSize: req.file.size,

      },

    });

    res.json({
      msg: "Document uploaded successfully",
      document,
    });

  } catch (error) {

    console.error("Upload document error:", error);

    res.status(500).json({
      msg: "Document upload failed",
    });

  }

};


/*
========================================
DOWNLOAD DOCUMENT
ACCESS: ADMIN, HR
========================================
*/
export const downloadDocument = async (req, res) => {

  try {

    const { id } = req.params;

    const document = await prisma.employeeDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({
        msg: "Document not found",
      });
    }

    const filePath = path.join(
      process.cwd(),
      "uploads",
      "employee-documents",
      document.fileUrl
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        msg: "File not found on server",
      });
    }

    // force download
    res.download(filePath, document.fileName);

  } catch (error) {

    console.error("Download error:", error);

    res.status(500).json({
      msg: "Download failed",
    });

  }

};


/*
========================================
PREVIEW DOCUMENT (VIEW IN BROWSER)
ACCESS: ADMIN, HR
========================================
*/
export const previewDocument = async (req, res) => {

  try {

    const { id } = req.params;

    const document = await prisma.employeeDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({
        msg: "Document not found",
      });
    }

    const filePath = path.join(
      process.cwd(),
      "uploads",
      "employee-documents",
      document.fileUrl
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        msg: "File missing",
      });
    }

    // VERY IMPORTANT HEADERS FOR PREVIEW
    res.setHeader("Content-Type", document.mimeType);

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${document.fileName}"`
    );

    res.setHeader("Cache-Control", "no-store");

    res.setHeader("Pragma", "no-cache");

    // BEST METHOD
    res.sendFile(filePath);

  } catch (error) {

    console.error("Preview error:", error);

    res.status(500).json({
      msg: "Preview failed",
    });

  }

};


/*
========================================
DELETE DOCUMENT
ACCESS: ADMIN ONLY
========================================
*/
export const deleteDocument = async (req, res) => {

  try {

    const { id } = req.params;

    const document = await prisma.employeeDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({
        msg: "Document not found",
      });
    }

    const filePath = path.join(
      process.cwd(),
      "uploads",
      "employee-documents",
      document.fileUrl
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.employeeDocument.delete({
      where: { id },
    });

    res.json({
      msg: "Document deleted",
    });

  } catch (error) {

    console.error("Delete error:", error);

    res.status(500).json({
      msg: "Delete failed",
    });

  }

};
