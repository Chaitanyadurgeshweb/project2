import Link from "next/link";
import { getMe } from "@/lib/auth";
import { SignOut } from "./SignOut";

export async function Nav() {
  const me = await getMe().catch(() => null);
  if (!me) return null;
  const link = "rounded-md px-3 py-1.5 text-sm font-medium text-ink/80 hover:bg-paper hover:text-ink";
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-3">
        <Link href="/" className="mr-4 text-lg font-bold tracking-tight text-rail">Loco Trial Tools</Link>
        <nav className="flex flex-1 items-center gap-1">
          <Link className={link} href="/daily-loco-trails">Daily Loco Trails</Link>
          <Link className={link} href="/radtx">RadTx NMS</Link>
          <Link className={link} href="/history">History</Link>
          {me.role === "admin" && <Link className={link} href="/admin">Admin</Link>}
        </nav>
        <span className="text-sm text-muted">{me.username}</span>
        <SignOut />
      </div>
    </header>
  );
}
