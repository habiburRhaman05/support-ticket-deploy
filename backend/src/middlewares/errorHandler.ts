import type { ErrorRequestHandler, RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    error: { code: "NOT_FOUND", message: "The requested resource was not found" },
  });
};

const addErrorToRequestLog: ErrorRequestHandler = (err, req, res, _next) => {
  const status = err.status || err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || "Internal server error";

  res.locals.err = err;

  if (status === StatusCodes.INTERNAL_SERVER_ERROR) {
    // Always leave a trace for 500s — these are bugs, not user errors.
    console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err?.stack || err);
  }

  res.status(status).json({
    success: false,
    error: {
      // AppError carries its own code; fall back to generic labels.
      code: err.code && typeof err.code === "string" && status !== StatusCodes.INTERNAL_SERVER_ERROR
        ? err.code
        : status === StatusCodes.INTERNAL_SERVER_ERROR ? "INTERNAL_ERROR" : "ERROR",
      message: status === StatusCodes.INTERNAL_SERVER_ERROR ? "Internal server error" : message,
    },
  });
};

export default (): [RequestHandler, ErrorRequestHandler] => [notFoundHandler, addErrorToRequestLog];
