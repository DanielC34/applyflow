import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Stop words for keyword extraction
const STOP_WORDS = new Set([
  "the", "and", "a", "an", "in", "on", "at", "to", "for", "of", "with", "by", "from",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
  "did", "will", "would", "should", "could", "may", "might", "can", "this", "that",
  "these", "those", "i", "you", "he", "she", "it", "we", "they", "my", "your", "his",
  "her", "its", "our", "their", "as", "if", "then", "else", "when", "where", "how",
  "what", "which", "who", "whom", "there", "here", "other", "others", "such", "so",
  "than", "them", "themselves", "their", "theirs", "they"
]);

// Expected result structure
interface JobMatchResult {
  matchScore: number;
  summary: string;
  strengths: string[];
  matchedSkills: string[];
  missingSkills: string[];
  atsKeywordsFound: string[];
  atsKeywordsMissing: string[];
  recommendations: string[];
}

Deno.serve(async (req: Request) => {
  // 1. Handle CORS pre-flight
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  // 2. Verify auth
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  // 3. Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body");
  }

  const { resume, jobDescription } = body as Record<string, unknown>;

  // Validate resume
  if (!resume || typeof resume !== "string") {
    return errorResponse("Missing or invalid resume");
  }
  if (resume.trim().length < 50) {
    return errorResponse("Resume must be at least 50 characters");
  }

  // Validate job description
  if (!jobDescription || typeof jobDescription !== "string") {
    return errorResponse("Missing or invalid job description");
  }
  if (jobDescription.trim().length < 50) {
    return errorResponse("Job description must be at least 50 characters");
  }

  // 4. Call AI with fallback
  const result = await analyzeWithFallback(
    resume.trim(),
    jobDescription.trim(),
    userId
  );

  // 5. Return success response
  return jsonResponse({
    analysisId: result.analysisId,
    analysisType: "job_match_score",
    result: result.data,
  }, 200);
});

// Helper: Validate input and return parsed values
function validateInput(body: unknown): { resume: string; jobDescription: string } | Response {
  if (!body || typeof body !== "object") {
    return errorResponse("Invalid request body", 400);
  }

  const { resume, jobDescription } = body as Record<string, unknown>;

  if (!resume || typeof resume !== "string") {
    return errorResponse("Missing or invalid resume", 400);
  }
  if (resume.trim().length < 50) {
    return errorResponse("Resume must be at least 50 characters", 400);
  }

  if (!jobDescription || typeof jobDescription !== "string") {
    return errorResponse("Missing or invalid job description", 400);
  }
  if (jobDescription.trim().length < 50) {
    return errorResponse("Job description must be at least 50 characters", 400);
  }

  return { resume: resume.trim(), jobDescription: jobDescription.trim() };
}

// Helper: Main analysis with fallback
async function analyzeWithFallback(
  resume: string,
  jobDescription: string,
  userId: string
): Promise<{ analysisId: string; data: JobMatchResult }> {
  // Try AI first
  try {
    const aiResult = await callGemini(resume, jobDescription);
    const analysisId = await storeAnalysis(userId, aiResult);
    return { analysisId, data: aiResult };
  } catch (error) {
    console.error("AI analysis failed, using fallback:", error);
    const fallbackResult = generateFallbackMatch(resume, jobDescription);
    const analysisId = await storeAnalysis(userId, fallbackResult);
    return { analysisId, data: fallbackResult };
  }
}

// Helper: Call Gemini API
async function callGemini(resume: string, jobDescription: string): Promise<JobMatchResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const prompt = getJobMatchPrompt(resume, jobDescription);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Gemini API error:", errorData);
    throw new Error(`AI service returned ${response.status}`);
  }

  const aiData = await response.json();
  const resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!resultText) {
    throw new Error("Empty response from AI");
  }

  // Parse and validate
  let result: JobMatchResult;
  try {
    result = JSON.parse(resultText) as JobMatchResult;
  } catch (e) {
    console.error("Failed to parse AI JSON:", resultText);
    throw new Error("Invalid JSON from AI");
  }

  // Validate structure
  if (
    typeof result.matchScore !== "number" ||
    result.matchScore < 0 ||
    result.matchScore > 100
  ) {
    throw new Error("Invalid matchScore from AI");
  }

  // Ensure all arrays exist
  result.strengths = result.strengths || [];
  result.matchedSkills = result.matchedSkills || [];
  result.missingSkills = result.missingSkills || [];
  result.atsKeywordsFound = result.atsKeywordsFound || [];
  result.atsKeywordsMissing = result.atsKeywordsMissing || [];
  result.recommendations = result.recommendations || [];
  result.summary = result.summary || "";

  return result;
}

// Helper: Generate prompt
function getJobMatchPrompt(resume: string, jobDescription: string): string {
  return `
You are an expert ATS (Applicant Tracking System) optimization specialist.
Analyze the following resume and job description to determine compatibility.

REQUIREMENTS:
1. Extract all relevant skills, technologies, and keywords from both documents
2. Calculate a match score (0-100) based on overlap and relevance
3. Identify ATS-relevant keywords (job titles, technologies, certifications, methodologies)
4. Return ONLY valid JSON with this exact schema:

{
  "matchScore": number (0-100),
  "summary": "string (1-2 sentences summarizing the match)",
  "strengths": ["string", ...] (max 5 key strengths from resume that match JD),
  "matchedSkills": ["string", ...] (skills/technologies present in both resume and JD),
  "missingSkills": ["string", ...] (required skills from JD missing from resume),
  "atsKeywordsFound": ["string", ...] (ATS keywords from JD found in resume),
  "atsKeywordsMissing": ["string", ...] (ATS keywords from JD not found in resume),
  "recommendations": ["string", ...] (max 5 actionable suggestions for improvement)
}

GUIDELINES:
- Focus on hard skills, technologies, and certifications
- matchScore calculation:
  - 60% weight: matchedSkills overlap
  - 20% weight: ATS keyword compatibility
  - 10% weight: experience alignment
  - 10% weight: missingSkills penalty
- Be specific and objective
- Prioritize missingSkills by importance to the role
- Make recommendations actionable and tailored

Resume Text:
${resume}

Job Description:
${jobDescription}

Return ONLY the raw JSON response. Do not include any other text, explanations, or markdown.
`.trim();
}

// Helper: Fallback keyword matching
function generateFallbackMatch(resume: string, jobDescription: string): JobMatchResult {
  const resumeKeywords = extractKeywords(resume);
  const jdKeywords = extractKeywords(jobDescription);

  const matchedSkills = resumeKeywords.filter(kw => jdKeywords.includes(kw));
  const missingSkills = jdKeywords.filter(kw => !resumeKeywords.includes(kw));

  const matchScore = Math.min(
    100,
    Math.round((matchedSkills.length / Math.max(jdKeywords.length, 1)) * 100)
  );

  const summary = `Based on keyword analysis, your resume matches ${matchScore}% of the job requirements.`;

  const recommendations: string[] = [];
  if (missingSkills.length > 0) {
    recommendations.push(
      `Add keywords from the job description: ${missingSkills.slice(0, 3).join(", ")}`
    );
  }
  if (matchedSkills.length === 0) {
    recommendations.push(
      "Your resume doesn't contain many keywords from the job description. Consider tailoring it more closely."
    );
  } else if (matchScore < 60) {
    recommendations.push(
      "Your match score is below 60%. Focus on adding more relevant skills and keywords."
    );
  }

  return {
    matchScore,
    summary,
    strengths: matchedSkills.slice(0, 5),
    matchedSkills,
    missingSkills,
    atsKeywordsFound: matchedSkills,
    atsKeywordsMissing: missingSkills,
    recommendations: recommendations.slice(0, 5),
  };
}

// Helper: Extract keywords from text
function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .split(/\W+/)
    .filter(word => word.length >= 3 && word.length <= 30)
    .filter(word => !STOP_WORDS.has(word));

  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  return Object.keys(frequency)
    .sort((a, b) => frequency[b] - frequency[a] || a.localeCompare(b))
    .slice(0, 50);
}

// Helper: Store analysis in database
async function storeAnalysis(
  userId: string,
  result: JobMatchResult
): Promise<string> {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const { data, error } = await supabase
    .from("ai_analyses")
    .insert({
      user_id: userId,
      analysis_type: "job_match_score",
      result_json: result,
    })
    .select()
    .single();

  if (error) {
    console.error("Database error storing analysis:", error);
    // Don't fail - return a generated ID
    return crypto.randomUUID();
  }

  return data.id;
}
