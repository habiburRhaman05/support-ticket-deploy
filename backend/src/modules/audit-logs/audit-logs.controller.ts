import type { NextFunction, Request, Response } from "express";
import { auditLogsService } from "./audit-logs.service";

export class AuditLogsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const result = await auditLogsService.list(req.user!.agencyId, page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const auditLogsController = new AuditLogsController();
