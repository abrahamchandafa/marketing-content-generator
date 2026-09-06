import type { ErrorRequestHandler, RequestHandler } from "express";
import { z } from "zod";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found.") {
    super(404, message);
  }
}

export class ValidationError extends HttpError {
  constructor(details: unknown) {
    super(400, "Validation failed.", details);
  }
}

export function validate<T extends z.ZodType>(schema: T): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ValidationError(result.error.issues));
      return;
    }
    req.body = result.data;
    next();
  };
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: error.message,
      details: error.details ?? null,
    });
    return;
  }
  if (error instanceof Error && "type" in error && error.type === "entity.too.large") {
    res.status(413).json({ error: "Payload too large.", details: null });
    return;
  }
  console.error(error);
  res.status(500).json({
    error: "Something went wrong while generating your poster. Please try again.",
    details: null,
  });
};
