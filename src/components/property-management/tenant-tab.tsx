"use client";

import { Tenant } from "./types";

function statusColor(s: string) {
  return s === "current" ? "#22c55e" : "#ef4444";
}

export function TenantTab({
  tenants,
  onImport,
  onTestAgent,
}: {
  tenants: Tenant[];
  onImport: () => void;
  onTestAgent: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-lg text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            Tenant Register
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Voice agent reads this data to identify callers and answer queries
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onImport}
            className="border border-slate-700 text-slate-400 hover:border-sky-400 hover:text-sky-400 rounded-lg px-4 py-2 text-xs uppercase tracking-wider font-mono transition-colors"
          >
            Import CSV
          </button>
          <button
            onClick={onTestAgent}
            className="bg-blue-800 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-xs uppercase tracking-wider font-mono transition-colors"
          >
            Test Agent
          </button>
        </div>
      </div>

      {tenants.map((t) => (
        <div
          key={t.id}
          className="bg-[#0d1520] border border-slate-800 hover:border-slate-700 rounded-xl p-5 mb-3.5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 font-bold text-sm"
                   style={{ fontFamily: "'Syne', sans-serif" }}>
                {t.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <div className="font-semibold text-[15px] text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {t.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {t.building} &middot; Unit {t.unit} &middot; {t.phone}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-semibold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                  R{t.rent.toLocaleString()}/mo
                </div>
                <div className="text-[10px] text-slate-500">Lease ends {t.leaseEnd}</div>
              </div>
              <span
                className="inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium"
                style={{
                  background: t.status === "current" ? "#052e16" : "#450a0a",
                  color: statusColor(t.status),
                }}
              >
                {t.status}
              </span>
            </div>
          </div>
        </div>
      ))}

      <div className="mt-2 p-3 bg-[#050d18] border border-dashed border-slate-800 rounded-lg text-xs text-slate-600">
        Export your tenant list from MDA / WCU as CSV and import above. The agent
        uses name + phone to identify callers automatically.
      </div>
    </div>
  );
}
