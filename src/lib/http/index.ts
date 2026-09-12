/**
 * HTTP conventions for Route Handlers. No domain types live here: callers
 * map service results to DTOs before `success()`.
 */

export {
  REQUEST_ID_HEADER,
  failure,
  newRequestId,
  readRequestId,
  success,
  type ErrorEnvelope,
  type PageMeta,
  type SuccessEnvelope,
} from "./envelope";
export { httpStatusForCode, toHttpError } from "./errors";
export { parseFilters } from "./filter";
export { logRequestEnd, logRequestError, logRequestStart } from "./logging";
export {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  paginate,
  parsePageQuery,
  type PageQuery,
} from "./pagination";
export { compareBy, parseSortQuery, type SortDirection, type SortQuery } from "./sort";
export { parseWithSchema, searchParamsObject } from "./validation";
