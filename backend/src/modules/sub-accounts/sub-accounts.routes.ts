import { Router } from "express";
import { subAccountsController } from "./sub-accounts.controller";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { validateRequest } from "../../utils/httpHandlers";
import { connectLocationSchema, rejectSchema } from "./sub-accounts.schema";

const router = Router();

// Every route here is owner-only.
router.use(authenticate, authorize("AGENCY_OWNER"));

router.get("/", subAccountsController.listAll);
router.get("/requests", subAccountsController.listRequests);
// All GHL locations merged with connection status (?refresh=true bypasses cache).
router.get("/overview", subAccountsController.overview);
// Owner pre-approves one GHL location by its locationId (no portal knock needed).
router.post("/connect", validateRequest(connectLocationSchema), subAccountsController.connectLocation);
router.post("/:id/approve", subAccountsController.approve);
router.post("/:id/reject", validateRequest(rejectSchema), subAccountsController.reject);
router.post("/bulk-approve", subAccountsController.bulkApprove);

export { router as subAccountsRouter };
