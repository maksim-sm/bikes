import { redirect } from "next/navigation";
import { adminHref } from "../_lib/paths";

export default function AdminHomePage() {
  redirect(adminHref("/admin/products"));
}
