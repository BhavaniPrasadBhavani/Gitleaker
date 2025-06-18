import { NextRequest, NextResponse } from 'next/server';
import { scanForSecrets } from '../../../utils/scanner';

interface ScanRequest {
  projectPath: string;
  token: string;
}

export async function POST(request: Request) {
  try {
    const { projectPath, token }: ScanRequest = await request.json();

    if (!projectPath || !token) {
      return NextResponse.json(
        { message: 'Project path and token are required' },
        { status: 400 }
      );
    }

    // Initialize GitLab API client
    const gitlabApi = new GitLabAPI(token);

    // Get repository information
    const project = await gitlabApi.getProject(projectPath);
    if (!project) {
      return NextResponse.json(
        { message: 'Repository not found' },
        { status: 404 }
      );
    }

    // Get repository files
    const files = await gitlabApi.getRepositoryFiles(projectPath);
    
    // Scan files for vulnerabilities
    const vulnerabilities = await scanFiles(files, gitlabApi, projectPath);

    // Generate scan statistics
    const stats = {
      totalFiles: files.length,
      scannedFiles: files.length,
      vulnerabilities: vulnerabilities.length,
      critical: vulnerabilities.filter(v => v.severity === 'Critical').length,
      high: vulnerabilities.filter(v => v.severity === 'High').length,
      medium: vulnerabilities.filter(v => v.severity === 'Medium').length,
      low: vulnerabilities.filter(v => v.severity === 'Low').length,
    };

    return NextResponse.json({
      project,
      stats,
      vulnerabilities,
    });

  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { message: 'Failed to scan repository' },
      { status: 500 }
    );
  }
}

class GitLabAPI {
  private baseUrl = 'https://gitlab.com/api/v4';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async fetch(endpoint: string, isRaw = false) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'PRIVATE-TOKEN': this.token,
      },
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.statusText}`);
    }

    return isRaw ? response.text() : response.json();
  }

  async getProject(projectPath: string) {
    return this.fetch(`/projects/${encodeURIComponent(projectPath)}`);
  }

  async getRepositoryFiles(projectPath: string) {
    return this.fetch(`/projects/${encodeURIComponent(projectPath)}/repository/tree?recursive=true`);
  }

  async getFileContent(projectPath: string, filePath: string) {
    // Fetch raw file content as text
    return this.fetch(`/projects/${encodeURIComponent(projectPath)}/repository/files/${encodeURIComponent(filePath)}/raw?ref=main`, true);
  }
}

async function scanFiles(files: any[], gitlabApi: GitLabAPI, projectPath: string) {
  const vulnerabilities = [];
  const patterns = {
    secrets: [
      /(?:password|secret|key|token|api[_-]?key|aws[_-]?key|private[_-]?key)\s*[=:]\s*['"][^'"]+['"]/gi,
      /(?:BEGIN\s+(?:RSA|DSA|EC|OPENSSH)\s+PRIVATE\s+KEY)/i,
      /(?:ssh-rsa|ssh-dss|ssh-ed25519)\s+[A-Za-z0-9+/]+[=]{0,3}\s+[^@]+@[^@]+/i,
    ],
    sqlInjection: [
      /(?:SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\s+.*FROM\s+.*WHERE\s+.*['"][^'"]*['"]/gi,
    ],
    xss: [
      /(?:<script|javascript:|on\w+\s*=)/gi,
    ],
  };

  for (const file of files) {
    if (file.type !== 'blob') continue;

    try {
      const content = await gitlabApi.getFileContent(projectPath, file.path);
      
      // Check for secrets
      for (const pattern of patterns.secrets) {
        const matches = content.match(pattern);
        if (matches) {
          vulnerabilities.push({
            id: vulnerabilities.length + 1,
            title: `Potential Secret Exposure in ${file.path}`,
            severity: 'Critical',
            type: 'Secret Exposure',
            file: file.path,
            line: findLineNumber(content, matches[0]),
            description: 'Sensitive information or credentials found in code.',
            impact: 'Potential exposure of sensitive data or credentials.',
          });
        }
      }

      // Check for SQL injection
      for (const pattern of patterns.sqlInjection) {
        const matches = content.match(pattern);
        if (matches) {
          vulnerabilities.push({
            id: vulnerabilities.length + 1,
            title: `Potential SQL Injection in ${file.path}`,
            severity: 'High',
            type: 'Code Vulnerability',
            file: file.path,
            line: findLineNumber(content, matches[0]),
            description: 'Unsanitized SQL query detected.',
            impact: 'Potential database compromise.',
          });
        }
      }

      // Check for XSS
      for (const pattern of patterns.xss) {
        const matches = content.match(pattern);
        if (matches) {
          vulnerabilities.push({
            id: vulnerabilities.length + 1,
            title: `Potential XSS Vulnerability in ${file.path}`,
            severity: 'High',
            type: 'Code Vulnerability',
            file: file.path,
            line: findLineNumber(content, matches[0]),
            description: 'Potential cross-site scripting vulnerability detected.',
            impact: 'Potential client-side code execution.',
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning file ${file.path}:`, error);
    }
  }

  return vulnerabilities;
}

function findLineNumber(content: string, match: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(match)) {
      return i + 1;
    }
  }
  return 1;
} 