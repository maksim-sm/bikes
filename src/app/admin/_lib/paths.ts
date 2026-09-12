import type { Route } from "next";

export function adminHref(path: string): Route {
  return path as Route;
}
