"use client";

import { t } from "@/lib/i18n";
import { Button } from "@/ui";
import { logoutAction } from "./actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="quiet">
        {t.account.signOut}
      </Button>
    </form>
  );
}
