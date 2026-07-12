import type { NextFunction, Request, Response } from "express";
import { subAccountsService } from "./sub-accounts.service";

export class SubAccountsController {
  async listRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subAccountsService.listRequests(req.user!.agencyId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subAccountsService.listAll(req.user!.agencyId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subAccountsService.approve(req.user!.agencyId, req.user!.userId, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subAccountsService.reject(req.user!.agencyId, req.user!.userId, req.params.id, req.body?.comment);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async bulkApprove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subAccountsService.bulkApprove(req.user!.agencyId, req.user!.userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const subAccountsController = new SubAccountsController();
