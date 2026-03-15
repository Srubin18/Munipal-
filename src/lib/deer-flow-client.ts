/**
 * DeerFlow Client - Autonomous Research Agent Integration
 *
 * Connects Munipal to ByteDance's DeerFlow SuperAgent for:
 * - Automated tariff research and extraction
 * - Bill analysis with autonomous code execution
 * - Dispute letter drafting with legal citations
 * - Regulatory change monitoring
 *
 * DeerFlow runs as a sidecar service via Docker.
 * See: docker-compose.deer-flow.yml
 */

const DEER_FLOW_API = process.env.DEER_FLOW_API_URL || 'http://localhost:8024';

// ============================================================================
// TYPES
// ============================================================================

export interface DeerFlowTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  skill: string;
  input: string;
  output?: string;
  artifacts?: DeerFlowArtifact[];
  created_at: string;
  completed_at?: string;
}

export interface DeerFlowArtifact {
  type: 'report' | 'code' | 'file' | 'data';
  name: string;
  content: string;
  mime_type?: string;
}

export interface TariffResearchResult {
  service: string;
  category: string;
  rate_cents: number;
  effective_from: string;
  effective_to: string;
  source_document: string;
  source_page?: number;
  conditions?: string;
  confidence: number;
}

export interface DisputeLetter {
  subject: string;
  body: string;
  legal_references: string[];
  total_overcharge_cents: number;
  findings_count: number;
}

// ============================================================================
// CLIENT
// ============================================================================

class DeerFlowClient {
  private baseUrl: string;

  constructor(baseUrl: string = DEER_FLOW_API) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if DeerFlow agent is running and healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Submit a task to DeerFlow and get the task ID
   */
  async submitTask(skill: string, input: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill, input }),
    });

    if (!res.ok) {
      throw new Error(`DeerFlow task submission failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.task_id;
  }

  /**
   * Poll for task completion
   */
  async getTask(taskId: string): Promise<DeerFlowTask> {
    const res = await fetch(`${this.baseUrl}/api/tasks/${taskId}`);

    if (!res.ok) {
      throw new Error(`Failed to get task ${taskId}: ${res.status}`);
    }

    return res.json();
  }

  /**
   * Wait for a task to complete (with timeout)
   */
  async waitForTask(taskId: string, timeoutMs: number = 120000): Promise<DeerFlowTask> {
    const start = Date.now();
    const pollInterval = 2000;

    while (Date.now() - start < timeoutMs) {
      const task = await this.getTask(taskId);

      if (task.status === 'completed' || task.status === 'failed') {
        return task;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Task ${taskId} timed out after ${timeoutMs}ms`);
  }

  // ==========================================================================
  // HIGH-LEVEL OPERATIONS
  // ==========================================================================

  /**
   * Research tariff rates for a specific service and financial year
   */
  async researchTariffs(
    service: 'electricity' | 'water' | 'sanitation' | 'refuse' | 'rates',
    financialYear: string = '2025/26'
  ): Promise<TariffResearchResult[]> {
    const taskId = await this.submitTask('tariff-researcher', JSON.stringify({
      service,
      financial_year: financialYear,
      municipality: 'City of Johannesburg',
      instruction: `Find and extract all official ${service} tariff rates for the City of Johannesburg for the ${financialYear} financial year. Include all tiers, categories, and special conditions. Provide source document references.`,
    }));

    const task = await this.waitForTask(taskId, 180000); // 3 min for research

    if (task.status === 'failed') {
      throw new Error(`Tariff research failed: ${task.output}`);
    }

    return JSON.parse(task.output || '[]');
  }

  /**
   * Analyze a bill PDF using DeerFlow's sandboxed code execution
   */
  async analyzeBill(pdfBase64: string, accountNumber: string): Promise<DeerFlowTask> {
    const taskId = await this.submitTask('bill-analyzer', JSON.stringify({
      pdf_base64: pdfBase64,
      account_number: accountNumber,
      instruction: 'Parse this municipal bill PDF and verify all charges against known tariff rates. Report findings with citations.',
    }));

    return this.waitForTask(taskId, 120000);
  }

  /**
   * Draft a dispute letter based on verification findings
   */
  async draftDisputeLetter(
    accountNumber: string,
    propertyAddress: string,
    findings: Array<{
      service: string;
      charged_cents: number;
      expected_cents: number;
      tariff_source: string;
    }>
  ): Promise<DisputeLetter> {
    const taskId = await this.submitTask('dispute-drafter', JSON.stringify({
      account_number: accountNumber,
      property_address: propertyAddress,
      findings,
      instruction: 'Draft a formal dispute letter for these billing errors. Cite specific tariff documents and relevant legislation.',
    }));

    const task = await this.waitForTask(taskId, 60000);

    if (task.status === 'failed') {
      throw new Error(`Dispute drafting failed: ${task.output}`);
    }

    return JSON.parse(task.output || '{}');
  }

  /**
   * Monitor for regulatory changes (run periodically)
   */
  async checkForRegulatoryUpdates(): Promise<{
    updates_found: boolean;
    summary: string;
    sources: string[];
  }> {
    const taskId = await this.submitTask('regulation-monitor', JSON.stringify({
      instruction: 'Check for any new tariff publications, council resolutions, or regulatory changes from CoJ, NERSA, City Power, or Johannesburg Water in the past 7 days.',
    }));

    const task = await this.waitForTask(taskId, 180000);

    if (task.status === 'failed') {
      return { updates_found: false, summary: 'Check failed', sources: [] };
    }

    return JSON.parse(task.output || '{"updates_found": false, "summary": "No updates", "sources": []}');
  }
}

// Singleton export
export const deerFlow = new DeerFlowClient();
export default DeerFlowClient;
