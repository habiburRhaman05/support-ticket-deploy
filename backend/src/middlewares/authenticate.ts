import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { verifyAccessToken, type JwtPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization header" },
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error: { code: "TOKEN_EXPIRED", message: "Access token expired or invalid" },
    });
  }
}
