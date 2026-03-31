import { inviteUser } from "../controllers/admin.controller.js";

router.post(
  "/invite-user",
  authMiddleware,
  roleMiddleware(["ADMIN", "HR"]), 
  inviteUser
);
