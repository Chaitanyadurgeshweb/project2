"use client";
import { useRef, useState } from "react";
import JSZip from "jszip";
import { browserClient } from "@/lib/supabase/browser";

interface RunResult {
  id: string;
  primaryMake: string;
  structure: "A" | "B";
  makeSource: "portal" | "cache";
  makesFetchedAt: string;
  stats: {
    filesRead: number; rowsRead: number; rowsSplitAtMidnight: number; zeroStartRemoved: number;
    dates: string[]; sections: string[];
    summary: { date: string; totalTrips: number; primaryTrips: number; otherTrips: number }[];
    notFound: { date: string; loco: string; trips: number }[];
  };
  skipped: { path: string; reason: string }[];
  warnings: string[];
}

type Picked = { kind: "zip"; file: File } | { kind: "folder"; files: File[]; name: string };
const EXCEL = /\.(xls|xlsx|xlsm)$/i;

export function LttRunner() {
  const zipInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [phase, setPhase] = useState<"idle" | "packing" | "uploading" | "processing">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);

  const busy = phase !== "idle";
  const label = picked ? (picked.kind === "zip" ? picked.file.name : `${picked.name} (${picked.files.length} Excel files)`) : "";

  function onFolder(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list).filter((f) => EXCEL.test(f.name) && !f.name.startsWith("~$"));
    const name = (list[0] as File & { webkitRelativePath: string }).webkitRelativePath.split("/")[0] || "folder";
    setResult(null); setError("");
    if (files.length === 0) { setPicked(null); setError("That folder has no Excel files (.xls, .xlsx)."); return; }
    setPicked({ kind: "folder", files, name });
  }

  async function run() {
    if (!picked) return;
    setError(""); setResult(null);
    try {
      let blob: Blob;
      let name: string;
      if (picked.kind === "zip") {
        blob = picked.file; name = picked.file.name;
      } else {
        setPhase("packing");
        const zip = new JSZip();
        for (const f of picked.files) zip.file((f as File & { webkitRelativePath: string }).webkitRelativePath, f);
        blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 1 } });
        name = `${picked.name}.zip`;
      }
      setPhase("uploading");
      const urlRes = await fetch("/api/ltt/upload-url", { method: "POST" });
      const urlJson = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlJson.error ?? "Could not start the upload");
      const up = await browserClient().storage.from("uploads").uploadToSignedUrl(urlJson.path, urlJson.token, blob);
      if (up.error) throw new Error(`Upload failed: ${up.error.message}`);

      setPhase("processing");
      const res = await fetch("/api/ltt/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: urlJson.path, name }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Processing failed");
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPhase("idle");
    }
  }

  const phaseText = { idle: "", packing: "Packing the folder…", uploading: "Uploading…", processing: "Processing the trials…" }[phase];

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="text-base font-semibold">1. Choose the data</h2>
        <p className="mt-1 text-sm text-muted">
          Either layout works and is detected automatically: date folders &gt; section folders &gt; loco folders, or section folders &gt; loco folders with several dates in the files.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn-quiet" disabled={busy} onClick={() => zipInput.current?.click()}>Choose a ZIP file</button>
          <button className="btn-quiet" disabled={busy} onClick={() => folderInput.current?.click()}>Choose a folder</button>
          <input ref={zipInput} type="file" accept=".zip" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPicked({ kind: "zip", file: f }); setResult(null); setError(""); } e.target.value = ""; }} />
          {/* @ts-expect-error webkitdirectory is not in the React typings */}
          <input ref={folderInput} type="file" webkitdirectory="" multiple hidden onChange={(e) => { onFolder(e.target.files); e.target.value = ""; }} />
          {picked && <span className="text-sm font-medium">{label}</span>}
        </div>
      </section>

      <section className="card flex flex-wrap items-center gap-4 p-5">
        <div>
          <h2 className="text-base font-semibold">2. Run</h2>
          <p className="text-sm text-muted">{busy ? phaseText : "Makes are read from the loco portal at the start of every run."}</p>
        </div>
        <button className="btn-primary ml-auto" disabled={!picked || busy} onClick={run}>{busy ? phaseText : "Run Daily Loco Trails"}</button>
      </section>

      {error && <p role="alert" className="rounded-md border border-stop/30 bg-stop-soft px-4 py-3 text-sm text-stop">{error}</p>}

      {result && <ResultView r={result} />}
    </div>
  );
}

function ResultView({ r }: { r: RunResult }) {
  const s = r.stats;
  return (
    <section className="card space-y-5 p-5" aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold">Result</h2>
        <span className="rounded-full bg-rail-soft px-2.5 py-0.5 text-xs font-semibold text-rail">Structure {r.structure} detected</span>
        {r.makeSource === "cache" && (
          <span className="rounded-full bg-caution-soft px-2.5 py-0.5 text-xs font-semibold text-caution">
            Portal unreachable: makes from the copy saved {new Date(r.makesFetchedAt).toLocaleString("en-IN")}
          </span>
        )}
        <a className="btn-primary ml-auto" href={`/api/runs/${r.id}/download`}>Download Excel</a>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Files read" value={s.filesRead} />
        <Stat label="Rows read" value={s.rowsRead} />
        <Stat label="Zero-start trips removed" value={s.zeroStartRemoved} />
        <Stat label="Sections" value={s.sections.join(", ")} />
      </dl>
      {r.structure === "B" && <p className="text-sm text-muted">{s.rowsSplitAtMidnight} rows crossing midnight were split at 00:00:00 before processing.</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse">
          <thead><tr><th className="th">Date</th><th className="th">Total trips</th><th className="th">{r.primaryMake} trips</th><th className="th">Other firms trips</th></tr></thead>
          <tbody>
            {s.summary.map((d) => (
              <tr key={d.date}><td className="td font-medium">{d.date}</td><td className="td">{d.totalTrips}</td><td className="td">{d.primaryTrips}</td><td className="td">{d.otherTrips}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {s.notFound.length > 0 && (
        <details className="rounded-md border border-line">
          <summary className="cursor-pointer px-4 py-2 text-sm font-medium">{s.notFound.length} loco/date entries have no make in the portal</summary>
          <ul className="grid gap-x-6 px-4 pb-3 text-sm sm:grid-cols-3">
            {s.notFound.map((n) => <li key={n.date + n.loco}>{n.loco} <span className="text-muted">· {n.date} · {n.trips} trip{n.trips > 1 ? "s" : ""}</span></li>)}
          </ul>
        </details>
      )}

      {r.skipped.length > 0 && (
        <div className="rounded-md border border-caution/40 bg-caution-soft">
          <h3 className="px-4 py-2 text-sm font-semibold text-caution">{r.skipped.length} file{r.skipped.length > 1 ? "s" : ""} skipped</h3>
          <ul className="max-h-64 divide-y divide-caution/20 overflow-auto px-4 pb-2 text-sm">
            {r.skipped.map((f) => <li key={f.path} className="py-1.5"><span className="font-medium">{f.path}</span><span className="text-muted"> — {f.reason}</span></li>)}
          </ul>
        </div>
      )}
      {r.warnings.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-caution">{r.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-paper px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-base font-semibold">{value}</dd>
    </div>
  );
}
