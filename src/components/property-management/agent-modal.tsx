"use client";

const flows: Record<string, { title: string; lines: { speaker: string; text: string }[]; note: string }> = {
  tenant: {
    title: "Tenant Inbound Agent",
    lines: [
      { speaker: "Agent", text: '"Good day, you\'ve reached Sandton Gardens. I\'m the AI assistant. May I have your name?"' },
      { speaker: "Caller", text: '"It\'s Thabo Nkosi."' },
      { speaker: "Agent", text: '"Hi Thabo, Unit A203. How can I help you today?"' },
    ],
    note: "Handles lease queries, maintenance requests, building info, escalates to PM if needed",
  },
  rent: {
    title: "Rent Collection Agent",
    lines: [
      { speaker: "Agent", text: '"Hi, am I speaking with Priya Pillay?"' },
      { speaker: "Tenant", text: '"Yes."' },
      { speaker: "Agent", text: '"Hi Priya, I\'m calling from Sandton Gardens regarding your outstanding rental of R8,200. Are you able to make payment today?"' },
    ],
    note: "Takes payment commitment, sends SMS confirmation, escalates disputes to PM",
  },
  vacancy: {
    title: "Vacancy Qualifying Agent",
    lines: [
      { speaker: "Agent", text: '"Thanks for calling about our available units! What size are you looking for?"' },
      { speaker: "Caller", text: '"2 bedroom."' },
      { speaker: "Agent", text: '"We have a great 2-bed available from April 1st at R10,500/month. What\'s your budget range?"' },
    ],
    note: "Captures name, phone, budget, move-in date, income bracket — logs to Leads tab",
  },
};

export function AgentModal({
  agentType,
  onClose,
}: {
  agentType: string;
  onClose: () => void;
}) {
  const flow = flows[agentType];
  if (!flow) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0d1520] border border-slate-700 rounded-2xl p-8 w-[480px] max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="inline-block w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
          <h3 className="font-bold text-lg text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            {flow.title}
          </h3>
        </div>
        <p className="text-xs text-slate-500 mb-5">This is what callers will experience</p>

        <div className="text-sm leading-7 text-slate-400">
          <div className="text-sky-400 mb-2 text-xs font-mono">// Sample call flow</div>
          {flow.lines.map((line, i) => (
            <div key={i} className={i > 0 ? "mt-2" : ""}>
              <span style={{ color: line.speaker === "Agent" ? "#4fc3f7" : "#f97316" }}>
                {line.speaker}:
              </span>{" "}
              {line.text}
            </div>
          ))}
          <div className="text-xs text-slate-600 mt-3">&rarr; {flow.note}</div>
        </div>

        <button
          onClick={() => {
            onClose();
            window.open(
              "https://jobix.ai/test-agent?hash=0b499104-8642-4969-ac95-8239380d17ea",
              "_blank"
            );
          }}
          className="mt-5 w-full bg-blue-800 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-xs uppercase tracking-wider font-mono transition-colors"
        >
          Chat with Alex (Live Demo) &rarr;
        </button>
      </div>
    </div>
  );
}
