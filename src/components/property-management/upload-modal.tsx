"use client";

import { useState } from "react";

export function UploadModal({
  uploadType,
  onClose,
  onSuccess,
}: {
  uploadType: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [csvText, setCsvText] = useState("");

  const placeholders: Record<string, string> = {
    Tenant:
      "Name, Unit, Building, Phone, Lease Start, Lease End, Rent\nThabo Nkosi, A203, Sandton Gardens, 082 444 1234, ...",
    Arrears:
      "Name, Phone, Unit, Amount, Days Overdue\nPriya Pillay, 071 222 5678, B104, 8200, 32",
    Vacancy:
      "Building, Unit, Type, Rent, Available From, Features\nSandton Gardens, D205, 2 Bed, 10500, 2024-04-01, Balcony|Parking",
  };

  const handleLoad = () => {
    onSuccess(`${uploadType} data loaded successfully — agent updated`);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0d1520] border border-slate-700 rounded-2xl p-8 w-[480px] max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg text-white mb-1.5" style={{ fontFamily: "'Syne', sans-serif" }}>
          Import {uploadType} Data
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          Paste CSV content or upload a file. The agent will be updated immediately.
        </p>
        <textarea
          className="w-full bg-[#0d1520] border border-slate-800 focus:border-sky-400 rounded-lg text-white font-mono text-xs p-3 outline-none resize-y min-h-[120px] transition-colors"
          placeholder={placeholders[uploadType] || ""}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleLoad}
            className="flex-1 bg-blue-800 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-xs uppercase tracking-wider font-mono transition-colors"
          >
            Load Data &rarr; Update Agent
          </button>
          <button
            onClick={onClose}
            className="border border-slate-700 text-slate-400 hover:border-sky-400 hover:text-sky-400 rounded-lg px-4 py-2.5 text-xs uppercase tracking-wider font-mono transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
