"use client";
import { useCallback, useEffect, useState } from "react";

interface User { id: string; username: string; full_name: string | null; role: "admin" | "user"; active: boolean }
interface Alias { alias: string; canonical: string }

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export function AdminPanels({ meId }: { meId: string }) {
  return (
    <div className="space-y-6">
      <Users meId={meId} />
      <Aliases />
      <Company />
    </div>
  );
}

function Notice({ msg, ok }: { msg: string; ok?: boolean }) {
  if (!msg) return null;
  return <p role="status" className={`rounded-md px-3 py-2 text-sm ${ok ? "bg-go-soft text-go" : "bg-stop-soft text-stop"}`}>{msg}</p>;
}

function Users({ meId }: { meId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ username: "", password: "", role: "user" });
  const [msg, setMsg] = useState({ text: "", ok: false });
  const load = useCallback(async () => setUsers((await call("/api/admin/users", "GET")).users), []);
  useEffect(() => { load().catch((e) => setMsg({ text: e.message, ok: false })); }, [load]);

  async function act(fn: () => Promise<unknown>, done: string) {
    try { await fn(); setMsg({ text: done, ok: true }); await load(); } catch (e) { setMsg({ text: (e as Error).message, ok: false }); }
  }

  return (
    <section className="card space-y-4 p-5">
      <h2 className="text-base font-semibold">Users</h2>
      <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]" onSubmit={(e) => { e.preventDefault(); act(async () => { await call("/api/admin/users", "POST", form); setForm({ username: "", password: "", role: "user" }); }, "User created"); }}>
        <input className="field" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        <input className="field" type="text" placeholder="Password (8+ characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} autoComplete="off" />
        <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="user">User</option><option value="admin">Admin</option></select>
        <button className="btn-primary">Create user</button>
      </form>
      <Notice msg={msg.text} ok={msg.ok} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead><tr><th className="th">Username</th><th className="th">Role</th><th className="th">Status</th><th className="th">Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="td font-medium">{u.username}{u.id === meId && <span className="text-muted"> (you)</span>}</td>
                <td className="td">{u.role}</td>
                <td className="td">{u.active ? <span className="text-go">Active</span> : <span className="text-stop">Deactivated</span>}</td>
                <td className="td space-x-2">
                  <button className="btn-quiet px-2.5 py-1" onClick={() => { const p = window.prompt(`New password for ${u.username} (8+ characters)`); if (p) act(() => call("/api/admin/users", "PATCH", { id: u.id, password: p }), "Password changed"); }}>Reset password</button>
                  {u.id !== meId && (
                    <button className="btn-quiet px-2.5 py-1" onClick={() => act(() => call("/api/admin/users", "PATCH", { id: u.id, active: !u.active }), u.active ? "User deactivated" : "User reactivated")}>{u.active ? "Deactivate" : "Reactivate"}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Aliases() {
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [form, setForm] = useState({ alias: "", canonical: "" });
  const [msg, setMsg] = useState({ text: "", ok: false });
  const load = useCallback(async () => setAliases((await call("/api/admin/aliases", "GET")).aliases), []);
  useEffect(() => { load().catch((e) => setMsg({ text: e.message, ok: false })); }, [load]);
  async function act(fn: () => Promise<unknown>, done: string) {
    try { await fn(); setMsg({ text: done, ok: true }); await load(); } catch (e) { setMsg({ text: (e as Error).message, ok: false }); }
  }
  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="text-base font-semibold">Make names</h2>
        <p className="text-sm text-muted">Different spellings of a make are merged into one name. Matching ignores upper/lower case.</p>
      </div>
      <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); act(async () => { await call("/api/admin/aliases", "POST", form); setForm({ alias: "", canonical: "" }); }, "Saved"); }}>
        <input className="field" placeholder="Name as it appears (e.g. Gtronics)" value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} required />
        <input className="field" placeholder="Make it should become (e.g. GGTRONICS)" value={form.canonical} onChange={(e) => setForm({ ...form, canonical: e.target.value })} required />
        <button className="btn-primary">Add</button>
      </form>
      <Notice msg={msg.text} ok={msg.ok} />
      <table className="w-full border-collapse">
        <thead><tr><th className="th">Name as it appears</th><th className="th">Becomes</th><th className="th" /></tr></thead>
        <tbody>
          {aliases.map((a) => (
            <tr key={a.alias}>
              <td className="td">{a.alias}</td><td className="td font-medium">{a.canonical}</td>
              <td className="td text-right"><button className="btn-danger px-2.5 py-1" onClick={() => act(() => call(`/api/admin/aliases?alias=${encodeURIComponent(a.alias)}`, "DELETE"), "Removed")}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Company() {
  const [make, setMake] = useState("");
  const [msg, setMsg] = useState({ text: "", ok: false });
  useEffect(() => { call("/api/admin/settings", "GET").then((j) => setMake(String(j.settings.primary_make ?? "MEDHA"))).catch(() => undefined); }, []);
  return (
    <section className="card space-y-3 p-5">
      <div>
        <h2 className="text-base font-semibold">Company with its own column</h2>
        <p className="text-sm text-muted">Trips of this make are counted separately in the Date Wise Summary. Everything else counts as other firms.</p>
      </div>
      <form className="flex gap-3" onSubmit={async (e) => { e.preventDefault(); try { await call("/api/admin/settings", "PUT", { primary_make: make }); setMsg({ text: "Saved", ok: true }); } catch (err) { setMsg({ text: (err as Error).message, ok: false }); } }}>
        <input className="field max-w-xs" value={make} onChange={(e) => setMake(e.target.value)} required />
        <button className="btn-primary">Save</button>
      </form>
      <Notice msg={msg.text} ok={msg.ok} />
    </section>
  );
}
