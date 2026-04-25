/**
 * Unit tests for server/lib/openai.ts
 *
 * Strategy: mock global `fetch` so no real HTTP calls are made. Each test
 * controls exactly what the Gemini REST API returns (or throws), then asserts
 * on the utility function's output.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFetch } = vi.hoisted(() => {
  process.env.GOOGLE_API_KEY = "test-google-key";
  delete process.env.GEMINI_API_KEY;
  return {
    mockFetch: vi.fn(),
  };
});

// Import AFTER setting up the mock
import {
  aiChat,
  evaluateSubjectiveAnswer,
  generateStudyPlan,
  analyzeTestPerformance,
} from "../lib/openai";

vi.stubGlobal("fetch", mockFetch);

function fakeGeminiTextResponse(content: string) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({
      candidates: [{ content: { parts: [{ text: content }] } }],
    }),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// aiChat
// ════════════════════════════════════════════════════════════════════════════

describe("aiChat()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the AI response content as a string", async () => {
    mockFetch.mockResolvedValue(fakeGeminiTextResponse("Gravity is 9.8 m/s²."));

    const result = await aiChat([{ role: "user", content: "What is gravity?" }]);

    expect(result).toEqual({ content: "Gravity is 9.8 m/s²." });
  });

  it("should auto-inject a system message when none is provided", async () => {
    mockFetch.mockResolvedValue(fakeGeminiTextResponse("Sure!"));

    const messages = [{ role: "user" as const, content: "Help me." }];
    await aiChat(messages);

    const calledBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(calledBody.systemInstruction.parts[0].text).toMatch(/AI tutor for high school students/i);
    expect(calledBody.contents).toHaveLength(1);
  });

  it("should NOT inject a second system message when one is already present", async () => {
    mockFetch.mockResolvedValue(fakeGeminiTextResponse("Ok."));

    const messages = [
      { role: "system" as const, content: "You are a custom tutor." },
      { role: "user" as const, content: "Help." },
    ];
    await aiChat(messages);

    const calledBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(calledBody.systemInstruction.parts[0].text).toBe("You are a custom tutor.");
    expect(calledBody.contents).toHaveLength(1);
  });

  it("should throw when the Gemini API call fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn(),
    });

    await expect(aiChat([{ role: "user", content: "Test" }])).rejects.toThrow(
      "AI is unavailable right now"
    );
  });

  it("should return fallback content when API returns an empty choice", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ candidates: [] }),
    });

    const result = await aiChat([{ role: "user", content: "Test" }]);

    expect(result.content).toBe("I don't have a response for that.");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// evaluateSubjectiveAnswer
// ════════════════════════════════════════════════════════════════════════════

describe("evaluateSubjectiveAnswer()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should parse and return score, confidence, and feedback from a valid AI response", async () => {
    const aiResponse = JSON.stringify({ score: 8, confidence: 90, feedback: "Good answer." });
    mockFetch.mockResolvedValue(fakeGeminiTextResponse(aiResponse));

    const result = await evaluateSubjectiveAnswer(
      "Photosynthesis converts sunlight to glucose.",
      "What is photosynthesis?",
      "Award marks for: light, glucose, chlorophyll.",
      10
    );

    expect(result.score).toBe(8);
    expect(result.confidence).toBe(90);
    expect(result.feedback).toBe("Good answer.");
  });

  it("should clamp score to 0 when AI returns a negative value", async () => {
    mockFetch.mockResolvedValue(
      fakeGeminiTextResponse(JSON.stringify({ score: -3, confidence: 50, feedback: "Off topic." }))
    );

    const result = await evaluateSubjectiveAnswer("bad answer", "q", "rubric", 10);

    expect(result.score).toBe(0);
  });

  it("should clamp score to maxMarks when AI overshoots", async () => {
    mockFetch.mockResolvedValue(
      fakeGeminiTextResponse(JSON.stringify({ score: 99, confidence: 80, feedback: "Great." }))
    );

    const result = await evaluateSubjectiveAnswer("perfect answer", "q", "rubric", 10);

    expect(result.score).toBe(10); // clamped to maxMarks
  });

  it("should clamp confidence to 100 when AI returns more than 100", async () => {
    mockFetch.mockResolvedValue(
      fakeGeminiTextResponse(JSON.stringify({ score: 5, confidence: 150, feedback: "Fine." }))
    );

    const result = await evaluateSubjectiveAnswer("ok answer", "q", "rubric", 10);

    expect(result.confidence).toBe(100);
  });

  it("should return a fallback object when the API throws", async () => {
    mockFetch.mockRejectedValue(new Error("Rate limit exceeded"));

    const result = await evaluateSubjectiveAnswer("any", "q", "rubric", 10);

    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
    expect(result.feedback).toMatch(/currently unavailable/i);
  });

  it("should return a fallback object when AI returns invalid JSON", async () => {
    mockFetch.mockResolvedValue(fakeGeminiTextResponse("not json at all"));

    const result = await evaluateSubjectiveAnswer("any", "q", "rubric", 10);

    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
    expect(result.feedback).toMatch(/error processing evaluation/i);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// generateStudyPlan
// ════════════════════════════════════════════════════════════════════════════

describe("generateStudyPlan()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return a structured plan and resources on success", async () => {
    const payload = {
      plan: "1. Review Newton's Laws. 2. Practice problems.",
      resources: [
        { title: "Khan Academy Physics", type: "video", url: "https://khanacademy.org/physics" },
        { title: "Physics Textbook Ch. 3", type: "article" },
      ],
    };
    mockFetch.mockResolvedValue(fakeGeminiTextResponse(JSON.stringify(payload)));

    const result = await generateStudyPlan(["Newton's Laws", "Kinematics"], ["Optics"], "Physics");

    expect(result.plan).toContain("Newton's Laws");
    expect(result.resources).toHaveLength(2);
    expect(result.resources[0].type).toBe("video");
  });

  it("should return a fallback plan when the AI service throws", async () => {
    mockFetch.mockRejectedValue(new Error("Timeout"));

    const result = await generateStudyPlan(["Algebra"], ["Geometry"], "Math");

    expect(result.plan).toMatch(/failed|focus on reviewing/i);
    expect(result.resources).toBeInstanceOf(Array);
    expect(result.resources.length).toBeGreaterThan(0); // at least the fallback resource
  });

  it("should return a fallback plan when AI response is not valid JSON", async () => {
    mockFetch.mockResolvedValue(fakeGeminiTextResponse("Here is your plan: review everything."));

    const result = await generateStudyPlan(["Topic1"], ["Topic2"], "Science");

    expect(result.plan).toMatch(/error generating/i);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// analyzeTestPerformance
// ════════════════════════════════════════════════════════════════════════════

describe("analyzeTestPerformance()", () => {
  beforeEach(() => vi.clearAllMocks());

  const sampleResults = [
    {
      studentId: 1,
      score: 80,
      answers: [
        { questionId: 1, score: 8, question: "Q1" },
        { questionId: 2, score: 2, question: "Q2" },
      ],
    },
    {
      studentId: 2,
      score: 60,
      answers: [
        { questionId: 1, score: 6, question: "Q1" },
        { questionId: 2, score: 4, question: "Q2" },
      ],
    },
  ];

  it("should return averageScore, hardestQuestions, and recommendations on success", async () => {
    const payload = {
      averageScore: 70,
      hardestQuestions: [{ questionId: 2, question: "Q2", avgScore: 3 }],
      recommendations: "Focus more on Q2 type problems.",
    };
    mockFetch.mockResolvedValue(fakeGeminiTextResponse(JSON.stringify(payload)));

    const result = await analyzeTestPerformance(sampleResults);

    expect(result.averageScore).toBe(70);
    expect(result.hardestQuestions).toHaveLength(1);
    expect(result.recommendations).toMatch(/Q2/);
  });

  it("should compute averageScore locally as fallback when API throws", async () => {
    mockFetch.mockRejectedValue(new Error("Service unavailable"));

    const result = await analyzeTestPerformance(sampleResults);

    // Average of 80 and 60 = 70
    expect(result.averageScore).toBe(70);
    expect(result.hardestQuestions).toEqual([]);
    expect(result.recommendations).toMatch(/failed|review individual/i);
  });

  it("should compute averageScore locally when AI returns invalid JSON", async () => {
    mockFetch.mockResolvedValue(fakeGeminiTextResponse("Looks like students did okay overall."));

    const result = await analyzeTestPerformance(sampleResults);

    expect(result.averageScore).toBe(70);
  });
});
