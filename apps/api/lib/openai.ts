import { z } from "zod";
import { logger } from "./logger";

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const defaultGeminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const geminiChatModel = process.env.GEMINI_CHAT_MODEL || defaultGeminiModel;
const geminiEvaluationModel = process.env.GEMINI_EVALUATION_MODEL || defaultGeminiModel;
const geminiStudyPlanModel = process.env.GEMINI_STUDY_PLAN_MODEL || defaultGeminiModel;
const geminiAnalysisModel = process.env.GEMINI_ANALYSIS_MODEL || defaultGeminiModel;

if (!geminiApiKey) {
  logger.warn("GEMINI_API_KEY/GOOGLE_API_KEY is not set. AI features will not work.");
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatResponse {
  content: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface GeminiRequestOptions {
  model: string;
  systemInstruction?: string;
  contents: GeminiContent[];
  responseMimeType?: "text/plain" | "application/json";
  responseSchema?: Record<string, unknown>;
  temperature?: number;
}

const EvaluationSchema = z.object({
  score: z.number().min(0),
  confidence: z.number().min(0),
  feedback: z.string().min(1),
});

const StudyPlanSchema = z.object({
  plan: z.string(),
  resources: z.array(
    z.object({
      title: z.string(),
      type: z.string(),
      url: z.string().optional(),
    })
  ),
});

const PerformanceAnalysisSchema = z.object({
  averageScore: z.number(),
  hardestQuestions: z.array(
    z.object({
      questionId: z.number(),
      question: z.string(),
      avgScore: z.number(),
    })
  ),
  recommendations: z.string(),
});

const evaluationResponseSchema = {
  type: "object",
  properties: {
    score: { type: "number" },
    confidence: { type: "number" },
    feedback: { type: "string" },
  },
  required: ["score", "confidence", "feedback"],
};

const studyPlanResponseSchema = {
  type: "object",
  properties: {
    plan: { type: "string" },
    resources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          type: { type: "string" },
          url: { type: "string" },
        },
        required: ["title", "type"],
      },
    },
  },
  required: ["plan", "resources"],
};

const performanceAnalysisResponseSchema = {
  type: "object",
  properties: {
    averageScore: { type: "number" },
    hardestQuestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          questionId: { type: "number" },
          question: { type: "string" },
          avgScore: { type: "number" },
        },
        required: ["questionId", "question", "avgScore"],
      },
    },
    recommendations: { type: "string" },
  },
  required: ["averageScore", "hardestQuestions", "recommendations"],
};

function handleGeminiError(status?: number): never {
  if (status === 429) {
    throw Object.assign(new Error("AI rate limit reached, try again shortly"), { status: 503 });
  }
  if (status === 503 || status === 502 || status === 500 || status === 504) {
    throw Object.assign(new Error("AI is unavailable right now"), { status: 503 });
  }
  throw Object.assign(new Error("AI is unavailable right now"), { status: 503 });
}

function buildGeminiContents(messages: ChatMessage[]): {
  systemInstruction?: string;
  contents: GeminiContent[];
} {
  const systemMessage = messages.find((message) => message.role === "system");
  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: (message.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: message.content }],
    }));

  return {
    systemInstruction: systemMessage?.content,
    contents,
  };
}

function extractGeminiText(data: any): string {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("")
      .trim() || ""
  );
}

async function callGemini({
  model,
  systemInstruction,
  contents,
  responseMimeType = "text/plain",
  responseSchema,
  temperature,
}: GeminiRequestOptions): Promise<string> {
  if (!geminiApiKey) {
    throw Object.assign(new Error("AI provider is not configured"), { status: 503 });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        ...(systemInstruction
          ? {
              systemInstruction: {
                parts: [{ text: systemInstruction }],
              },
            }
          : {}),
        contents,
        generationConfig: {
          responseMimeType,
          ...(responseSchema ? { responseSchema } : {}),
          ...(typeof temperature === "number" ? { temperature } : {}),
        },
      }),
    }
  );

  if (!response.ok) {
    handleGeminiError(response.status);
  }

  const data: any = await response.json();
  return extractGeminiText(data);
}

async function generateStructuredJson<T>({
  model,
  systemInstruction,
  userPrompt,
  responseSchema,
}: {
  model: string;
  systemInstruction: string;
  userPrompt: string;
  responseSchema: Record<string, unknown>;
}): Promise<T> {
  const text = await callGemini({
    model,
    systemInstruction,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    responseMimeType: "application/json",
    responseSchema,
    temperature: 0.2,
  });
  return JSON.parse(text) as T;
}

export function isChatProviderConfigured(): boolean {
  return Boolean(geminiApiKey);
}

export async function aiChat(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<ChatResponse> {
  try {
    const nextMessages = [...messages];

    if (systemPrompt) {
      const existingSystemIndex = nextMessages.findIndex((msg) => msg.role === "system");
      if (existingSystemIndex !== -1) {
        nextMessages[existingSystemIndex] = { role: "system", content: systemPrompt };
      } else {
        nextMessages.unshift({ role: "system", content: systemPrompt });
      }
    } else if (!nextMessages.some((msg) => msg.role === "system")) {
      nextMessages.unshift({
        role: "system",
        content:
          "You are an AI tutor for high school students. You're knowledgeable about physics, chemistry, mathematics, biology, and computer science. Provide clear, concise explanations. Include examples when helpful. For math problems, show step-by-step solutions. Keep explanations appropriate for high school level understanding. Be encouraging and supportive.",
      });
    }

    const { systemInstruction, contents } = buildGeminiContents(nextMessages);
    const content =
      (await callGemini({
        model: geminiChatModel,
        systemInstruction,
        contents,
      })) || "I don't have a response for that.";

    return { content };
  } catch (error: any) {
    logger.error("AI chat error:", error);
    handleGeminiError(error?.status);
  }
}

interface EvaluationResult {
  score: number;
  confidence: number;
  feedback: string;
}

export async function evaluateSubjectiveAnswer(
  studentAnswer: string,
  question: string,
  rubric: string,
  maxMarks: number
): Promise<EvaluationResult> {
  try {
    try {
      const parsed = await generateStructuredJson<z.infer<typeof EvaluationSchema>>({
        model: geminiEvaluationModel,
        systemInstruction:
          "You are an expert teacher evaluating student answers. Return only valid JSON that matches the requested schema.",
        userPrompt: `Evaluate the student's answer.\nQuestion: ${question}\nRubric: ${rubric}\nMax Marks: ${maxMarks}\nStudent Answer: ${studentAnswer}\n\nReturn:\n- score: a number between 0 and ${maxMarks}\n- confidence: a number between 0 and 100\n- feedback: concise constructive feedback`,
        responseSchema: evaluationResponseSchema,
      });
      const result = EvaluationSchema.parse(parsed);

      return {
        score: Math.max(0, Math.min(maxMarks, result.score)),
        confidence: Math.max(0, Math.min(100, result.confidence)),
        feedback: result.feedback,
      };
    } catch (parseError) {
      if ((parseError as { status?: number })?.status) {
        throw parseError;
      }
      logger.error("AI evaluation schema validation error:", parseError);
      return {
        score: 0,
        confidence: 0,
        feedback: "Error processing evaluation. Please review manually.",
      };
    }
  } catch (error) {
    logger.error("AI evaluation service error:", error);
    return {
      score: 0,
      confidence: 0,
      feedback: "The AI service is currently unavailable. Please check back later.",
    };
  }
}

export async function generateStudyPlan(
  weakTopics: string[],
  strongTopics: string[],
  subject: string
): Promise<{ plan: string; resources: Array<{ title: string; type: string; url?: string }> }> {
  try {
    try {
      const parsed = await generateStructuredJson<z.infer<typeof StudyPlanSchema>>({
        model: geminiStudyPlanModel,
        systemInstruction:
          "Generate concise, practical study plans for school students. Return only valid JSON that matches the requested schema.",
        userPrompt: `Create a personalized study plan.\nSubject: ${subject}\nWeak Topics: ${weakTopics.join(", ")}\nStrong Topics: ${strongTopics.join(", ")}\n\nReturn:\n- plan: a structured study plan with bullet points and time estimates\n- resources: an array of recommended resources, each with title, type, and optional url`,
        responseSchema: studyPlanResponseSchema,
      });
      return StudyPlanSchema.parse(parsed);
    } catch (parseError) {
      if ((parseError as { status?: number })?.status) {
        throw parseError;
      }
      logger.error("AI study plan schema validation error:", parseError);
      return {
        plan: "Error generating study plan. Please try again later.",
        resources: [{ title: "General review resources", type: "general" }],
      };
    }
  } catch (error) {
    logger.error("Study plan generation error:", error);
    return {
      plan: "Study plan generation failed. Please focus on reviewing the weak topics identified in your assessment.",
      resources: [{ title: "General review resources", type: "general" }],
    };
  }
}

export async function analyzeTestPerformance(
  testResults: Array<{
    studentId: number;
    score: number;
    answers: Array<{ questionId: number; score: number; question: string }>;
  }>
): Promise<{
  averageScore: number;
  hardestQuestions: Array<{ questionId: number; question: string; avgScore: number }>;
  recommendations: string;
}> {
  try {
    try {
      const parsed = await generateStructuredJson<z.infer<typeof PerformanceAnalysisSchema>>({
        model: geminiAnalysisModel,
        systemInstruction:
          "Analyze classroom test performance and return only valid JSON that matches the requested schema.",
        userPrompt: `Analyze the following test data and provide insights.\nTest Data: ${JSON.stringify(testResults)}\n\nReturn:\n- averageScore: the calculated average score\n- hardestQuestions: up to 3 questions with the lowest average scores\n- recommendations: concise teaching recommendations`,
        responseSchema: performanceAnalysisResponseSchema,
      });
      return PerformanceAnalysisSchema.parse(parsed);
    } catch (parseError) {
      if ((parseError as { status?: number })?.status) {
        throw parseError;
      }
      logger.error("AI test performance analysis schema validation error:", parseError);
      return {
        averageScore:
          testResults.reduce((sum, result) => sum + result.score, 0) / testResults.length,
        hardestQuestions: [],
        recommendations: "Error analyzing test performance. Please review individual results.",
      };
    }
  } catch (error) {
    logger.error("Test analysis error:", error);
    return {
      averageScore: testResults.reduce((sum, result) => sum + result.score, 0) / testResults.length,
      hardestQuestions: [],
      recommendations: "Performance analysis failed. Please review individual student results.",
    };
  }
}
