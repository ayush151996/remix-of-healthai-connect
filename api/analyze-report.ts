import { handleReportAnalysis } from "./_lib/reportAnalysis";
import type { ApiRequest, ApiResponse } from "./_lib/http";

export const config = { api: { bodyParser: { sizeLimit: "4mb" } }, maxDuration: 60 };

export default async function analyzeReport(req: ApiRequest, res: ApiResponse): Promise<void> {
  await handleReportAnalysis(req, res);
}