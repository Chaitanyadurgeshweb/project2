"use client";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";

export function SignOut() {
  const router = useRouter();
  return (
    <button
      className="btn-quiet py-1.5"
      onClick={async () => {
        await browserClient().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
