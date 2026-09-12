import { redirect } from "next/navigation";
import { adminHref } from "../_lib/paths";
import { adminHomePath, requireAdminStaff } from "../_lib/staff";

export default async function AdminHomePage() {
  const principal = await requireAdminStaff();
  redirect(adminHref(adminHomePath(principal)));
}
