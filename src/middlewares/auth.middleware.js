import jwt from "jsonwebtoken";
import prisma from "../../prisma/client.js";

const auth = async (req, res, next) => {
  try {

    let token = null;

    /*
    ========================================
    1. CHECK AUTH HEADER (NORMAL API)
    ========================================
    */
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {

      token = authHeader.split(" ")[1];

    }

    /*
    ========================================
    2. CHECK QUERY TOKEN (FOR PREVIEW / DOWNLOAD)
    Example:
    /api/documents/preview/:id?token=xxxxx
    ========================================
    */
    if (!token && req.query.token) {

      token = req.query.token;

    }

    /*
    ========================================
    3. NO TOKEN FOUND
    ========================================
    */
    if (!token) {

      return res.status(401).json({
        msg: "No token provided",
      });

    }

    /*
    ========================================
    4. VERIFY TOKEN
    ========================================
    */
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    /*
    ========================================
    5. LOAD FRESH USER FROM DATABASE
    ========================================
    */
    const user = await prisma.user.findUnique({

      where: {
        id: decoded.id,
      },

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        weeklyOff: true,
        weekoffBalance: true,
      },

    });

    if (!user) {

      return res.status(401).json({
        msg: "User not found",
      });

    }

    /*
    ========================================
    6. ATTACH USER TO REQUEST
    ========================================
    */
    req.user = user;

    next();

  } catch (error) {

    console.error("Auth middleware error:", error);

    return res.status(401).json({
      msg: "Invalid or expired token",
    });

  }

};

export default auth;
