"use client"

import { useState } from "react"
import { Shield, GitBranch, AlertTriangle, CheckCircle, XCircle, Search, Download, Eye, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface Vulnerability {
  id: number
  title: string
  severity: string
  type: string
  file: string
  line: number
  description: string
  impact: string
}

interface ScanStats {
  totalFiles: number
  scannedFiles: number
  vulnerabilities: number
  critical: number
  high: number
  medium: number
  low: number
}

interface ScanResults {
  project: {
    name: string
    description: string
    web_url: string
  }
  stats: ScanStats
  vulnerabilities: Vulnerability[]
}

export default function GitLeakerDashboard() {
  const [repoUrl, setRepoUrl] = useState("")
  const [gitlabToken, setGitlabToken] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scanResults, setScanResults] = useState<ScanResults | null>(null)
  const [error, setError] = useState("")

  const handleScan = async () => {
    try {
      setIsScanning(true)
      setScanComplete(false)
      setProgress(0)
      setError("")

      // Validate inputs
      if (!repoUrl || !gitlabToken) {
        throw new Error("Repository URL and GitLab token are required")
      }

      // Extract project path from URL
      const projectPath = repoUrl.replace("https://gitlab.com/", "")

      // Start the scan
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectPath,
          token: gitlabToken,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to scan repository")
      }

      const results = await response.json()
      setScanResults(results)
      setScanComplete(true)
      setProgress(100)

    } catch (err: any) {
      setError(err.message || "An error occurred during scanning")
    } finally {
      setIsScanning(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-500 hover:bg-red-600"
      case "high":
        return "bg-orange-500 hover:bg-orange-600"
      case "medium":
        return "bg-yellow-500 hover:bg-yellow-600"
      case "low":
        return "bg-blue-500 hover:bg-blue-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">GitLeaker</h1>
                <p className="text-sm text-slate-400">GitLab Security Scanner</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                <GitBranch className="w-3 h-3 mr-1" />
                v2.1.0
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Scan Input Section */}
        <Card className="mb-8 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="w-5 h-5" />
              Repository Scanner
            </CardTitle>
            <CardDescription className="text-slate-400">
              Enter your GitLab repository URL and token to scan for security vulnerabilities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  placeholder="https://gitlab.com/username/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus-visible:ring-orange-500"
                />
                <Input
                  type="password"
                  placeholder="GitLab Personal Access Token"
                  value={gitlabToken}
                  onChange={(e) => setGitlabToken(e.target.value)}
                  className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus-visible:ring-orange-500"
                />
              </div>
              
              {error && (
                <div className="text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleScan}
                disabled={!repoUrl || !gitlabToken || isScanning}
                className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Start Scan
                  </>
                )}
              </Button>
            </div>

            {isScanning && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Scanning repository...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="[&>*]:bg-orange-500 bg-slate-700" />
              </div>
            )}
          </CardContent>
        </Card>

        {scanComplete && scanResults && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Total Files</p>
                      <p className="text-2xl font-bold text-white">{scanResults.stats.totalFiles.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Eye className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Vulnerabilities</p>
                      <p className="text-2xl font-bold text-red-400">{scanResults.stats.vulnerabilities}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Critical Issues</p>
                      <p className="text-2xl font-bold text-red-500">{scanResults.stats.critical}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Scan Time</p>
                      <p className="text-2xl font-bold text-green-400">2.1s</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Section */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      Security Vulnerabilities Found
                    </CardTitle>
                    <CardDescription className="text-slate-400 mt-1">
                      Critical security issues that require immediate attention.
                    </CardDescription>
                  </div>
                  <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="space-y-6">
                  {scanResults.vulnerabilities.map((vuln) => (
                    <div
                      key={vuln.id}
                      className="p-4 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-800/70 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3">
                        <h3 className="text-lg font-semibold text-white">{vuln.title}</h3>
                        <Badge className={`${getSeverityColor(vuln.severity)} text-white`}>
                          {vuln.severity}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-400 space-y-2">
                        <div className="flex items-center gap-2">
                          <strong>Type:</strong> 
                          <Badge variant="secondary" className="bg-slate-700 text-slate-300">{vuln.type}</Badge>
                        </div>
                        <p>
                          <strong>Location:</strong>{" "}
                          <code className="px-2 py-1 bg-slate-700 rounded text-red-400 font-mono">
                            {vuln.file}:{vuln.line}
                          </code>
                        </p>
                        <p>
                          <strong>Description:</strong> {vuln.description}
                        </p>
                        <p>
                          <strong>Impact:</strong> {vuln.impact}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!scanComplete && !isScanning && (
          <div className="text-center py-16">
            <Shield className="w-16 h-16 mx-auto text-slate-600 mb-4" />
            <h2 className="text-xl font-semibold text-slate-300">Ready to Scan</h2>
            <p className="text-slate-500">Enter a repository URL above to begin your security scan.</p>
          </div>
        )}
      </main>
    </div>
  )
}