/**
 * ai.service.ts — Frontend helpers for invoking Supabase Edge Functions.
 *
 * All functions use `supabase.functions.invoke()` which automatically:
 * - attaches the user's auth token
 * - sets the correct base URL for the project's Edge Functions
 * - handles CORS
 *
 * Usage pattern in a component:
 *
 *   const mutation = useMutation({
 *     mutationFn: () => invokeResumeReview({ resumeId, parsedContent }),
 *     onSuccess: (data) => { ... },
 *     onError: (err) => toast.error(err.message),
 *   });
 */

import { supabase } from "@/integrations/supabase/client";
import type { AnalysisType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Shared response envelope from every Edge Function
// ---------------------------------------------------------------------------

export interface AiErrorResponse {
    error: string;
}

export interface AiSuccessResponse<T> {
    analysisId: string;
    analysisType: AnalysisType;
    result: T;
}

async function invokeFunction<T>(
    functionName: string,
    payload: Record<string, unknown>
): Promise<T> {
    const session = await supabase.auth.getSession();

    const token = session.data.session?.access_token;

    const { data, error } = await supabase.functions.invoke<T>(functionName, {
        body: payload,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`No response from ${functionName}`);
    return data;
}

// ---------------------------------------------------------------------------
// resume-review
// ---------------------------------------------------------------------------

export interface ResumeReviewResult {
    score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
    suggested_rewrites: Array<{ original: string; rewrite: string }>;
}

export interface ResumeReviewParams {
    resumeId: string;
    parsedContent: string;
    jobDescription?: string;
}

export function invokeResumeReview(params: ResumeReviewParams) {
    return invokeFunction<AiSuccessResponse<ResumeReviewResult>>(
        "resume-review",
        params
    );
}



// ---------------------------------------------------------------------------
// follow-up-generator
// ---------------------------------------------------------------------------

export interface FollowUpResult {
    subject: string;
    body: string;
    tone: string;
}

export interface FollowUpParams {
    applicationId: string;
    companyName: string;
    roleTitle: string;
    currentStage: string;
    contactName?: string;
    tone?: "professional" | "friendly" | "concise";
    context?: string;
}

export function invokeFollowUpGenerator(params: FollowUpParams) {
    return invokeFunction<AiSuccessResponse<FollowUpResult>>(
        "follow-up-generator",
        params
    );
}

// ---------------------------------------------------------------------------
// job-match-score
// ---------------------------------------------------------------------------

export interface JobMatchResult {
    matchScore: number;
    summary: string;
    strengths: string[];
    matchedSkills: string[];
    missingSkills: string[];
    atsKeywordsFound: string[];
    atsKeywordsMissing: string[];
    recommendations: string[];
}

export interface JobMatchParams {
    resume: string;
    jobDescription: string;
}

export function invokeJobMatchAnalysis(params: JobMatchParams) {
    return invokeFunction<AiSuccessResponse<JobMatchResult>>(
        "job-match-score",
        params
    );
}
