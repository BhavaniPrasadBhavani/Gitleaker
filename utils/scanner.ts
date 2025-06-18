export function scanForSecrets(code: string): string[] {
  const patterns = [
    /AKIA[0-9A-Z]{16}/g, // AWS key
    /ghp_[0-9a-zA-Z]{36}/g, // GitHub token
    /"secret"\s*:\s*"[^"]+"/g, // JSON secrets
  ];

  const findings: string[] = [];
  patterns.forEach((regex) => {
    const matches = code.match(regex);
    if (matches) findings.push(...matches);
  });

  return findings;
} 