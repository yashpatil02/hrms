const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const {
  getMonthlyAttendanceSummary,
} = require("../controllers/adminMonthlyAttendance.controller");

router.get(
  "/monthly-summary",
  auth,
  role(["ADMIN"]),
  getMonthlyAttendanceSummary
);

module.exports = router;
