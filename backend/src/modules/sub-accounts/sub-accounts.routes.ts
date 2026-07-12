import { Router } from "express";
import { subAccountsController } from "./sub-accounts.controller";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { validateRequest } from "../../utils/httpHandlers";
import { rejectSchema } from "./sub-accounts.schema";

const router = Router();

// Every route here is owner-only.
router.use(authenticate, authorize("AGENCY_OWNER"));

router.get("/", subAccountsController.listAll);
router.get("/requests", subAccountsController.listRequests);
router.post("/:id/approve", subAccountsController.approve);
router.post("/:id/reject", validateRequest(rejectSchema), subAccountsController.reject);
router.post("/bulk-approve", subAccountsController.bulkApprove);

export { router as subAccountsRouter };
