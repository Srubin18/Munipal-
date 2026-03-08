"use client";

import { RentCall } from "./types";

export function RentTab({
  rentCalls,
  onMarkCalled,
  onImport,
  onLaunchCampaign,
}: {
  rentCalls: RentCall[];
  onMarkCalled: (id: number) => void;
  onImport: () => void;
  onLaunchCampaign: () => void;
}) {
  const totalOverdue = rentCalls.reduce((a, c) => a + c.amount, 0);
  const pending = rentCalls.filter((c) => c.status === "pending").length;
  const done = rentCalls.filter((c) => c.status === "called").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-lg text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            Rent Collection Calls
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Agent auto-dials overdue tenants, logs outcomes, escalates where needed
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onImport}
            className="border border-slate-700 text-slate-400 hover:border-sky-400 hover:text-sky-400 rounded-lg px-4 py-2 text-xs uppercase tracking-wider font-mono transition-colors"
          >
            Import Arrears
          </button>
          <button
            onClick={onLaunchCampaign}
            className="bg-blue-800 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-xs uppercase tracking-wider font-mono transition-colors"
          >
            Launch Campaign
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3.5 mb-5">
        {[
          { label: "Total Overdue", value: `R${totalOverdue.toLocaleString()}`, color: "#ef4444" },
          { label: "Calls Pending", value: pending, color: "#f97316" },
          { label: "Calls Done", value: done, color: "#22c55e" },
        ].map((s) => (
          <div key={s.label} className="bg-[#0d1520] border border-slate-800 rounded-xl p-5">
            <div className="font-bold text-[22px]" style={{ fontFamily: "'Syne', sans-serif", color: s.color }}>
              {s.value}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {rentCalls.map((c) => (
        <div
          key={c.id}
          className="bg-[#0d1520] border border-slate-800 hover:border-slate-700 rounded-xl p-5 mb-3.5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: c.status === "pending" ? "#ef4444" : "#22c55e" }}
              />
              <div>
                <div className="font-semibold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {c.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Unit {c.unit} &middot; {c.phone} &middot; {c.overdue} days overdue
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-bold text-lg text-red-500" style={{ fontFamily: "'Syne', sans-serif" }}>
                R{c.amount.toLocaleString()}
              </div>
              {c.status === "pending" ? (
                <button
                  onClick={() => onMarkCalled(c.id)}
                  className="bg-blue-800 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-xs uppercase tracking-wider font-mono transition-colors"
                >
                  Mark Called
                </button>
              ) : (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium bg-[#052e16] text-green-500">
                  Done
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="mt-2 p-3 bg-[#050d18] border border-dashed border-slate-800 rounded-lg text-xs text-slate-600">
        Export your arrears report from MDA / WCU / PayProp — 5 columns needed:
        Name, Phone, Unit, Amount, Days Overdue.
      </div>
    </div>
  );
}
