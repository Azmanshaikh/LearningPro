import { useEffect, useMemo, useState } from "react";
import { useFirebaseAuth } from "@/contexts/firebase-auth-context";
import { BentoHeroCard } from "@/components/chat/bento-hero-card";
import { BentoSubjectCard } from "@/components/chat/bento-subject-card";
import { RagChatSheet } from "@/components/chat/rag-chat-sheet";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/runtime-config";
import { auth } from "@/lib/firebase";
import { Sparkles, Rocket, GraduationCap, Upload, FileText } from "lucide-react";

export default function AiTutor() {
  const { currentUser } = useFirebaseAuth();
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [focusSubject, setFocusSubject] = useState("");
  const [summaryMode, setSummaryMode] = useState<"summary" | "detailed">("summary");
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfResult, setPdfResult] = useState<string>("");
  const [pdfError, setPdfError] = useState("");

  const handleCloseChat = () => {
    setIsChatOpen(false);
    setActiveSubject(null);
    setInitialPrompt("");
  };

  // Use real subjects from profile or fallback
  const userSubjects = currentUser?.profile?.subjects || [];

  const subjects = useMemo(
    () =>
      userSubjects.length > 0
        ? userSubjects.map((s) => ({
            id: s.toLowerCase(),
            name: s,
            description: `Your enrolled ${s} module.`,
            tag: "ENROLLED",
            progress: 0,
            icon: <GraduationCap className="h-16 w-16 text-accent" strokeWidth={1.5} />,
            isLocked: false,
          }))
        : [
            {
              id: "general",
              name: "General Study",
              description: "Ask anything about your curriculum.",
              tag: "GUEST",
              progress: 0,
              icon: <Sparkles className="h-16 w-16 text-accent" strokeWidth={1.5} />,
              isLocked: false,
            },
          ],
    [userSubjects]
  );

  useEffect(() => {
    if (!focusSubject && subjects.length > 0) {
      setFocusSubject(subjects[0].name);
    }
  }, [focusSubject, subjects]);

  const handleAction = (subjectName: string, action: "revise" | "practice" | "chat") => {
    setActiveSubject(subjectName);
    setFocusSubject(subjectName);
    if (action === "chat") {
      setInitialPrompt("");
    } else if (action === "revise") {
      setInitialPrompt(
        `I want to revise the key concepts for ${subjectName}. Where should I start?`
      );
    } else if (action === "practice") {
      setInitialPrompt(`Give me a quick 3-question practice quiz for ${subjectName}.`);
    }
    setIsChatOpen(true);
  };

  const buildAuthHeader = async () => {
    if (auth?.currentUser) {
      try {
        return { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` };
      } catch {
        // Fall through to stored token.
      }
    }

    const storedToken = localStorage.getItem("auth_token");
    if (storedToken?.trim()) {
      return { Authorization: `Bearer ${storedToken}` };
    }

    return {};
  };

  const handlePdfSubmit = async () => {
    if (!selectedPdf) {
      setPdfError("Please choose a PDF file first.");
      return;
    }

    setIsUploadingPdf(true);
    setPdfError("");
    setPdfResult("");

    try {
      const formData = new FormData();
      formData.append("file", selectedPdf);
      formData.append("mode", summaryMode);
      formData.append("subject", focusSubject || "General Study");

      const headers = await buildAuthHeader();
      const response = await fetch(apiUrl("/api/ai/pdf-summary"), {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      const data = await response.json();
      setPdfResult(data?.content || "No output returned from the tutor.");
    } catch (error) {
      setPdfError(
        error instanceof Error
          ? error.message
          : "Unable to summarize this PDF right now. Please try again."
      );
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const activeFocusSubject = focusSubject || subjects[0]?.name || "General Study";

  return (
    <div className="animate-fade-in-up space-y-10">
      {/* Header Section */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/10 bg-accent-soft px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
              AI Intelligent Tutor
            </span>
          </div>
          <h1 className="mb-4 font-display text-4xl leading-tight text-foreground md:text-5xl">
            Welcome back, {currentUser?.profile?.displayName?.split(" ")[0] || "Scholar"}.
          </h1>
          <p className="max-w-2xl font-body text-lg leading-relaxed text-muted-foreground">
            Your personalized learning journey is evolving. Ask EduAI to clarify complex theories or
            generate practice paths tailored to your recent progress.
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <section className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <div className="mb-4 flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Focus Subject
          </label>
          <select
            value={activeFocusSubject}
            onChange={(e) => setFocusSubject(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.name}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <BentoHeroCard
          title={`Focus Session: ${activeFocusSubject}`}
          description={`EduAI will adapt this session for ${activeFocusSubject}. Start a guided learning conversation, revise key concepts, or generate quick practice prompts for this subject.`}
          ctaText="Start Learning Session"
          visual={
            <div className="group relative">
              <div className="absolute inset-0 scale-75 rounded-full bg-accent/20 blur-3xl transition-transform duration-700 group-hover:scale-100" />
              <Rocket
                className="relative z-10 h-24 w-24 text-accent drop-shadow-sm transition-transform duration-500 group-hover:-translate-y-2"
                strokeWidth={1.5}
              />
            </div>
          }
          onCtaClick={() => handleAction(activeFocusSubject, "chat")}
        />
      </section>

      {/* PDF Tutor Section */}
      <section className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="mb-2 flex items-center gap-2 font-display text-2xl text-foreground">
                <FileText className="h-6 w-6 text-accent" />
                PDF Tutor Lab
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Upload a PDF and get either a whole-document summary or a detailed explanation tailored
                to {" "}
                <span className="font-semibold text-foreground">{activeFocusSubject}</span> using your AI tutor.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                PDF File
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  setSelectedPdf(e.target.files?.[0] || null);
                  setPdfError("");
                }}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-xs file:font-bold file:uppercase file:tracking-widest file:text-accent"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Output Mode
              </label>
              <select
                value={summaryMode}
                onChange={(e) => setSummaryMode(e.target.value === "detailed" ? "detailed" : "summary")}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="summary">Whole Summary</option>
                <option value="detailed">Detailed Explanation</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              onClick={handlePdfSubmit}
              disabled={isUploadingPdf || !selectedPdf}
              className="rounded-full bg-accent px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-accent/90"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploadingPdf ? "Analyzing PDF..." : "Analyze PDF"}
            </Button>
            {selectedPdf && (
              <span className="text-xs text-muted-foreground">Selected: {selectedPdf.name}</span>
            )}
          </div>

          {pdfError && (
            <p className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {pdfError}
            </p>
          )}

          {pdfResult && (
            <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Tutor Output ({summaryMode === "detailed" ? "Detailed" : "Summary"})
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{pdfResult}</p>
            </div>
          )}
        </div>
      </section>

      {/* Subjects Section */}
      <section className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <GraduationCap className="h-4 w-4 text-accent" />
            Academic Curriculum
          </h2>
          <span className="rounded-md bg-muted/50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            {subjects.length} Active Modules
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {subjects.map((subject, index) => (
            <div
              key={subject.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${250 + index * 50}ms` }}
            >
              <BentoSubjectCard
                title={subject.name}
                description={subject.description}
                icon={subject.icon}
                tag={subject.tag}
                progressPercentage={subject.progress}
                isLocked={subject.isLocked}
                onAction={(action) => handleAction(subject.name, action)}
                className="h-full"
              />
            </div>
          ))}
        </div>
      </section>

      {/* RAG Chat Sheet Overlay */}
      {activeSubject && (
        <RagChatSheet
          isOpen={isChatOpen}
          onClose={handleCloseChat}
          subjectName={activeSubject}
          initialPrompt={initialPrompt}
        />
      )}
    </div>
  );
}
