import { createAdminClient } from "@/lib/supabase/admin";

export type StatusWorkerName =
  | "research_job_processing"
  | "scheduled_paper_analysis"
  | "webhook_delivery"
  | "email_delivery";

/** Record the latest authenticated worker result without changing the worker response. */
export async function withStatusWorkerHeartbeat(
  worker: StatusWorkerName,
  run: () => Promise<Response>,
  isHealthy: (response: Response) => Promise<boolean> = async (response) => response.ok,
): Promise<Response> {
  const record = async (healthy: boolean, detail: string) => {
    try {
      const admin = createAdminClient();
      await admin.rpc("record_tic_status_worker_heartbeat", {
        p_worker_name: worker,
        p_healthy: healthy,
        p_detail: detail,
      });
    } catch {
      // Availability checks must never prevent the underlying worker response.
    }
  };

  try {
    const response = await run();
    if (response.status === 401 || response.status === 403) return response;
    let healthy = false;
    try { healthy = await isHealthy(response.clone()); } catch { healthy = false; }
    await record(healthy, healthy ? `Worker completed with HTTP ${response.status}.` : `Worker reported an unsuccessful outcome with HTTP ${response.status}.`);
    return response;
  } catch (error) {
    await record(false, "Worker request failed before completion.");
    throw error;
  }
}
