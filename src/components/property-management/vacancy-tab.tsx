"use client";

import { Unit, Lead } from "./types";

function scoreColor(s: string) {
  return s === "hot" ? "#ef4444" : s === "warm" ? "#f97316" : "#6b7280";
}

export function VacancyTab({
  units,
  leads,
  onImport,
  onTestAgent,
}: {
  units: Unit[];
  leads: Lead[];
  onImport: () => void;
  onTestAgent: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-lg text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            Vacancies &amp; Lead Capture
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Agent qualifies inbound callers and logs leads here in real time
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onImport}
            className="border border-slate-700 text-slate-400 hover:border-sky-400 hover:text-sky-400 rounded-lg px-4 py-2 text-xs uppercase tracking-wider font-mono transition-colors"
          >
            Add Vacancies
          </button>
          <button
            onClick={onTestAgent}
            className="bg-blue-800 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-xs uppercase tracking-wider font-mono transition-colors"
          >
            Test Agent
          </button>
        </div>
      </div>

      {/* Available Units */}
      <div
        className="text-xs text-sky-400 uppercase tracking-widest font-semibold mb-3"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Available Units
      </div>
      {units.map((u) => (
        <div
          key={u.id}
          className="bg-[#0d1520] border border-slate-800 hover:border-slate-700 rounded-xl p-5 mb-3.5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-[15px] text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                  Unit {u.unit}
                </span>
                <span className="text-xs text-slate-500">{u.building}</span>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium bg-[#052e16] text-green-500">
                  Available
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1.5">
                {u.type} &middot; Floor {u.floor} &middot; From {u.available}
              </div>
              <div className="flex gap-1.5 mt-2">
                {u.features.map((f) => (
                  <span
                    key={f}
                    className="text-[10px] text-slate-500 bg-[#050d18] border border-slate-800 rounded-full px-2 py-0.5"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-xl text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                R{u.rent.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500">per month</div>
            </div>
          </div>
        </div>
      ))}

      {/* Captured Leads */}
      <div
        className="text-xs text-orange-500 uppercase tracking-widest font-semibold mt-6 mb-3"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Leads Captured by Agent
      </div>
      {leads.map((l) => (
        <div
          key={l.id}
          className="bg-[#0d1520] border border-slate-800 hover:border-slate-700 rounded-xl p-5 mb-3.5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-9 h-9 rounded-full bg-[#1a1a0a] flex items-center justify-center text-sm font-bold"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  border: `2px solid ${scoreColor(l.score)}`,
                }}
              >
                {l.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <div className="font-semibold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {l.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {l.phone} &middot; {l.interest} &middot; Budget {l.budget}
                </div>
                <div className="text-xs text-slate-500">
                  Move in: {l.moveIn} &middot; Income: {l.income}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium"
                  style={{ background: "#1a0a00", color: scoreColor(l.score) }}
                >
                  {l.score}
                </span>
                <div className="text-[10px] text-slate-600 mt-1">{l.captured}</div>
              </div>
              <button className="border border-slate-700 text-slate-400 hover:border-sky-400 hover:text-sky-400 rounded-lg px-4 py-2 text-xs uppercase tracking-wider font-mono transition-colors">
                Follow Up
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
