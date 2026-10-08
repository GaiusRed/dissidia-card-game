interface CoverageReport {
  testResults?: Array<{
    name: string;
    status: string;
    assertionResults?: Array<{ status: string }>;
  }>;
  suites?: Array<{
    file?: string;
    specs?: Array<{
      file?: string;
      tests?: Array<{ status: string; results: Array<{ status: string }> }>;
    }>;
    suites?: CoverageReport['suites'];
  }>;
}

export function checkExecutionEvidence(report: CoverageReport | CoverageReport[], coverageMarkdown: string, root: string): string[];
