"use client";

import { useState } from "react";
import { sampleTenants, sampleUnits, sampleRentCalls, sampleLeads } from "./sample-data";
import { TenantTab } from "./tenant-tab";
import { RentTab } from "./rent-tab";
import { VacancyTab } from "./vacancy-tab";
import { UploadModal } from "./upload-modal";
import { AgentModal } from "./agent-modal";

const TABS = ["Tenants & Units", "Rent Collection", "Vacancy & Leads"];

export default function AiployeePM() {
  const [activeTab, setActiveTab] = useState(0);
  const [tenants] = useState(sampleTenants);
  const [units] = useState(sampleUnits);
  const [rentCalls, setRentCalls] = useState(sampleRentCalls);
  const [leads] = useState(sampleLeads);
  const [uploadModal, setUploadModal] = useState<string | null>(null);
  const [agentModal, setAgentModal] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const markCalled = (id: number) => {
    setRentCalls((r) => r.map((c) => (c.id === id ? { ...c, status: "called" as const } : c)));
    showToast("Marked as called — agent log updated");
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-200 font-mono">
      {/* Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <header className="border-b border-slate-800 px-8">
        <div className="flex items-center justify-between pt-5 pb-3">
          <div className="flex items-baseline gap-3">
            <span
              className="text-xl text-sky-400 font-extrabold tracking-tight"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              AIPLOYEE
            </span>
            <span className="text-[11px] text-slate-700 uppercase tracking-[0.2em]">
              Property Manager
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
            <span className="text-[11px] text-sky-400 tracking-widest">AGENT LIVE</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 pb-5 mt-2">
          {[
            { label: "Total Tenants", value: tenants.length },
            { label: "Overdue", value: tenants.filter((t) => t.status === "overdue").length, accent: "#ef4444" },
            { label: "Vacant Units", value: units.length, accent: "#22c55e" },
            { label: "New Leads", value: leads.length, accent: "#f97316" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div
                className="text-2xl font-bold"
                style={{ fontFamily: "'Syne', sans-serif", color: s.accent || "#e8eaf0" }}
              >
                {s.value}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-2.5 text-xs uppercase tracking-wider border-b-2 transition-colors font-mono ${
                activeTab === i
                  ? "text-sky-400 border-sky-400"
                  : "text-slate-600 border-transparent hover:text-slate-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="px-8 py-7 max-w-[1100px]">
        {activeTab === 0 && (
          <TenantTab
            tenants={tenants}
            onImport={() => setUploadModal("Tenant")}
            onTestAgent={() => setAgentModal("tenant")}
          />
        )}
        {activeTab === 1 && (
          <RentTab
            rentCalls={rentCalls}
            onMarkCalled={markCalled}
            onImport={() => setUploadModal("Arrears")}
            onLaunchCampaign={() => setAgentModal("rent")}
          />
        )}
        {activeTab === 2 && (
          <VacancyTab
            units={units}
            leads={leads}
            onImport={() => setUploadModal("Vacancy")}
            onTestAgent={() => setAgentModal("vacancy")}
          />
        )}
      </main>

      {/* Modals */}
      {uploadModal && (
        <UploadModal
          uploadType={uploadModal}
          onClose={() => setUploadModal(null)}
          onSuccess={(msg) => {
            showToast(msg);
            setUploadModal(null);
          }}
        />
      )}
      {agentModal && <AgentModal agentType={agentModal} onClose={() => setAgentModal(null)} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0d2137] border border-slate-700 rounded-lg px-5 py-3.5 text-xs text-sky-400 z-[200] animate-[slideUp_0.3s_ease]">
          {toast}
        </div>
      )}
    </div>
  );
}
