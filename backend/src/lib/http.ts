import { Prisma } from "../generated/prisma/client.js";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function idParam(value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "Invalid id");
  return n;
}

export function queryString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

export function prismaCode(err: unknown): string | undefined {
  return err instanceof Prisma.PrismaClientKnownRequestError
    ? err.code
    : undefined;
}

// undefined = not provided
export function optInt(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new HttpError(
      400,
      `${field} must be a whole number between ${min} and ${max}`,
    );
  }
  return value;
}

// undefined = not provided, null = empty/cleared
export function optText(
  value: unknown,
  field: string,
  max: number,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string")
    throw new HttpError(400, `${field} must be text`);
  const t = value.trim();
  if (t.length > max)
    throw new HttpError(400, `${field} must be at most ${max} characters`);
  return t === "" ? null : t;
}

export function optDate(
  value: unknown,
  field: string,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const d = typeof value === "string" ? new Date(value) : new Date(NaN);
  if (Number.isNaN(d.getTime()))
    throw new HttpError(400, `${field} must be a date (YYYY-MM-DD)`);
  return d;
}
