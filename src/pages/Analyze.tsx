import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { invokeJobMatchAnalysis, type JobMatchResult } from "@/lib/services/ai.service";

export default function Analyze() {
  const [resumeText, setResumeText] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<JobMatchResult | null>(null);

  const { mutate: runAnalysis, isPending } = useMutation({
    mutationFn: invokeJobMatchAnalysis,
    onSuccess: (response) => {
      setAnalysisResult(response.result);
      toast.success("Analysis complete!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to analyze. Please try again.");
      setAnalysisResult(null);
    },
  });

  const handleAnalyze = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      toast.error("Please provide both resume content and job description");
      return;
    }

    if (resumeText.trim().length < 50 || jobDescription.trim().length < 50) {
      toast.error("Both resume and job description must be at least 50 characters");
      return;
    }

    runAnalysis({
      resume: resumeText.trim(),
      jobDescription: jobDescription.trim(),
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Strong Match";
    if (score >= 60) return "Moderate Match";
    return "Needs Improvement";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader title="Job Match Analysis" />

        <div className="max-w-4xl mx-auto space-y-4">
          {/* Resume Input */}
          <div>
            <Label htmlFor="resume" className="text-lg font-medium">
              Resume Content
            </Label>
            <p className="text-sm text-gray-500 mb-4">
              Paste your resume text below for analysis
            </p>
            <Textarea
              id="resume"
              placeholder="Paste your resume text here...e.g. Software Engineer with 5+ years experience in React, TypeScript, and Node.js"
              className="min-h-[300px] font-mono text-sm"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-1">
              {resumeText.length > 0 ? `${resumeText.length} characters` : ""}
            </p>
          </div>

          {/* Job Description Input */}
          <div>
            <Label htmlFor="job-description" className="text-lg font-medium">
              Job Description
            </Label>
            <p className="text-sm text-gray-500 mb-4">
              Paste the job description you want to match against
            </p>
            <Textarea
              id="job-description"
              placeholder="Paste job description here...e.g. Senior Frontend Engineer - React, TypeScript, 5+ years experience"
              className="min-h-[300px] font-mono text-sm"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-1">
              {jobDescription.length > 0 ? `${jobDescription.length} characters` : ""}
            </p>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleAnalyze}
              disabled={isPending || !resumeText.trim() || !jobDescription.trim()}
              className="px-6 gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze Match"
              )}
            </Button>
          </div>

          {/* Loading State */}
          {isPending && (
            <div className="mt-8 p-6 bg-white border rounded-lg shadow-sm">
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <p className="text-lg font-medium">Analyzing your match...</p>
                  <p className="text-sm text-muted-foreground">
                    This may take 10-30 seconds
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Results Display */}
          {analysisResult && (
            <div className="mt-8 p-6 bg-white border rounded-lg shadow-sm">
              <h2 className="text-2xl font-bold mb-6">Analysis Results</h2>

              {/* Match Score */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">Match Score</h3>
                    <p className="text-sm text-gray-500">{getScoreLabel(analysisResult.matchScore)}</p>
                  </div>
                  <div className={`text-5xl font-bold ${getScoreColor(analysisResult.matchScore)}`}>
                    {analysisResult.matchScore}%
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${getScoreBackground(analysisResult.matchScore)}`}
                    style={{ width: `${analysisResult.matchScore}%` }}
                  ></div>
                </div>

                {/* Summary */}
                <p className="mt-4 text-gray-600">{analysisResult.summary}</p>
              </div>

              {/* Three Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Strengths */}
                <div>
                  <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Strengths
                  </h3>
                  {analysisResult.strengths && analysisResult.strengths.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-2">
                      {analysisResult.strengths.map((strength, index) => (
                        <li key={index} className="text-gray-700">{strength}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic text-sm">No strengths identified</p>
                  )}
                </div>

                {/* Missing Skills */}
                <div>
                  <h3 className="text-lg font-semibold text-yellow-700 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Missing Skills
                  </h3>
                  {analysisResult.missingSkills && analysisResult.missingSkills.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-2">
                      {analysisResult.missingSkills.map((skill, index) => (
                        <li key={index} className="text-gray-700">{skill}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic text-sm">No missing skills identified</p>
                  )}
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-700 mb-3 flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Recommendations
                  </h3>
                  {analysisResult.recommendations && analysisResult.recommendations.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-2">
                      {analysisResult.recommendations.map((rec, index) => (
                        <li key={index} className="text-gray-700">{rec}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic text-sm">No recommendations</p>
                  )}
                </div>
              </div>

              {/* ATS Keywords Section */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">ATS Keyword Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Keywords Found
                    </h4>
                    {analysisResult.atsKeywordsFound && analysisResult.atsKeywordsFound.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.atsKeywordsFound.map((keyword, index) => (
                          <span key={index} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">No ATS keywords found</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-600 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Keywords Missing
                    </h4>
                    {analysisResult.atsKeywordsMissing && analysisResult.atsKeywordsMissing.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.atsKeywordsMissing.map((keyword, index) => (
                          <span key={index} className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">No ATS keywords missing</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Matched Skills Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Matched Skills</h3>
                {analysisResult.matchedSkills && analysisResult.matchedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.matchedSkills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-sm">No matched skills identified</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
