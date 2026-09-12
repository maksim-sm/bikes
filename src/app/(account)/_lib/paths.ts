import type { Route } from "next";

export function accountHref(path: string): Route {
  return path as Route;
}
