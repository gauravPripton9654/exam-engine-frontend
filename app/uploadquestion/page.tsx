"use client";

import { useState, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type QtypeEnum = "MCQ" | "Multi" | "Match" | "Fill";

interface McqOptionCreate {
  option_text: string;
  sort_order: number;
  is_correct: boolean;
}

interface MatchPairCreate {
  left_text: string;
  right_text: string;
  sort_order: number;
}

interface FillBlankCreate {
  blank_index: number;
  accepted_answers: string[];
  sort_order: number;
}

interface QuestionCreate {
  subject: string;
  skill: string;
  level: string;
  qtype: QtypeEnum;
  stem: string;
  rationale: string;
  sort_order: number;
  mcq_options: McqOptionCreate[];
  match_pairs: MatchPairCreate[];
  fill_blanks: FillBlankCreate[];
}

interface CurriculumCreate {
  title?: string;
  role?: string;
  company?: string;
  sector?: string;
  n?: number;
  questions: QuestionCreate[];
}

type SaveStatus = "idle" | "saving" | "success" | "error";

// ── JSON → API payload transformer ──────────────────────────────────────────

function transformRawJson(raw: Record<string, unknown>): CurriculumCreate {
  const questions = (raw.questions as Record<string, unknown>[]) ?? [];

  const transformed: QuestionCreate[] = questions.map((q, idx) => {
    const qtype = (q.qtype as string).trim() as QtypeEnum;
    const options = (q.options as string[]) ?? [];
    const left = (q.left as string[]) ?? [];
    const right = (q.right as string[]) ?? [];
    const blanks = (q.blanks as Record<string, unknown>[]) ?? [];

    let mcq_options: McqOptionCreate[] = [];
    let match_pairs: MatchPairCreate[] = [];
    let fill_blanks: FillBlankCreate[] = [];

    if (qtype === "MCQ") {
      const correctIdx = q.answer as number;
      mcq_options = options.map((opt, i) => ({
        option_text: opt,
        sort_order: i,
        is_correct: i === correctIdx,
      }));
    } else if (qtype === "Multi") {
      const correctIdxs = new Set((q.answers as number[]) ?? []);
      mcq_options = options.map((opt, i) => ({
        option_text: opt,
        sort_order: i,
        is_correct: correctIdxs.has(i),
      }));
    } else if (qtype === "Match") {
      const answerMap = (q.answer as number[]) ?? [];
      match_pairs = left.map((l, i) => ({
        left_text: l,
        right_text: right[answerMap[i]] ?? right[i] ?? "",
        sort_order: i,
      }));
    } else if (qtype === "Fill") {
      fill_blanks = blanks.map((b, i) => ({
        blank_index: i,
        accepted_answers: (b.accept as string[]) ?? [],
        sort_order: i,
      }));
    }

    return {
      subject: (q.subject as string) ?? "",
      skill: (q.skill as string) ?? "",
      level: (q.level as string) ?? "",
      qtype,
      stem: (q.stem as string) ?? "",
      rationale: (q.rationale as string) ?? "",
      sort_order: idx,
      mcq_options,
      match_pairs,
      fill_blanks,
    };
  });

  return {
    title: (raw.title as string) ?? `${raw.company ?? ""} – ${raw.role ?? ""}`.trim(),
    role: raw.role as string,
    company: raw.company as string,
    sector: raw.sector as string,
    n: raw.n as number,
    questions: transformed,
  };
}

// ── Qtype badge ──────────────────────────────────────────────────────────────

const QTYPE_COLORS: Record<QtypeEnum, { bg: string; text: string; label: string }> = {
  MCQ:   { bg: "#EEF2FF", text: "#4338CA", label: "MCQ" },
  Multi: { bg: "#FEF3C7", text: "#92400E", label: "Multi-select" },
  Match: { bg: "#F0FDF4", text: "#166534", label: "Matching" },
  Fill:  { bg: "#FDF2F8", text: "#86198F", label: "Fill in blank" },
};

function QtypeBadge({ type }: { type: QtypeEnum }) {
  const c = QTYPE_COLORS[type];
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 99,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        display: "inline-block",
      }}
    >
      {c.label}
    </span>
  );
}

// ── Question preview card ────────────────────────────────────────────────────

function QuestionCard({ q, index }: { q: QuestionCreate; index: number }) {
  return (
    <div
      style={{
        background: "var(--color-background-primary, #fff)",
        border: "0.5px solid var(--color-border-tertiary, #e5e7eb)",
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 16,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <span
          style={{
            minWidth: 28,
            height: 28,
            borderRadius: "50%",
            background: "#6C63FF",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <QtypeBadge type={q.qtype} />
            {q.level && (
              <span style={{ fontSize: 11, color: "var(--color-text-secondary, #6b7280)", fontWeight: 500 }}>
                {q.level}
              </span>
            )}
            {q.subject && (
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary, #9ca3af)" }}>
                {q.subject}
                {q.skill ? ` · ${q.skill}` : ""}
              </span>
            )}
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.65,
              color: "var(--color-text-primary, #111827)",
              fontWeight: 500,
            }}
          >
            {q.stem}
          </p>
        </div>
      </div>

      {/* MCQ / Multi options */}
      {(q.qtype === "MCQ" || q.qtype === "Multi") && q.mcq_options.length > 0 && (
        <div style={{ paddingLeft: 40, display: "flex", flexDirection: "column", gap: 6 }}>
          {q.mcq_options.map((opt, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 8,
                background: opt.is_correct ? "#F0FFF4" : "var(--color-background-secondary, #f9fafb)",
                border: opt.is_correct
                  ? "1px solid #10B981"
                  : "0.5px solid var(--color-border-tertiary, #e5e7eb)",
              }}
            >
              <span
                style={{
                  minWidth: 20,
                  height: 20,
                  borderRadius: q.qtype === "Multi" ? 4 : "50%",
                  border: `1.5px solid ${opt.is_correct ? "#10B981" : "#d1d5db"}`,
                  background: opt.is_correct ? "#10B981" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {opt.is_correct && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: opt.is_correct ? "#065F46" : "var(--color-text-primary, #111827)",
                  fontWeight: opt.is_correct ? 500 : 400,
                }}
              >
                {opt.option_text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Match pairs */}
      {q.qtype === "Match" && q.match_pairs.length > 0 && (
        <div style={{ paddingLeft: 40 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 24px 1fr",
              gap: "6px 8px",
              alignItems: "center",
            }}
          >
            {q.match_pairs.map((pair, i) => (
              <>
                <div
                  key={`l-${i}`}
                  style={{
                    padding: "8px 12px",
                    background: "#EEF2FF",
                    borderRadius: 8,
                    fontSize: 13,
                    color: "#3730A3",
                    fontWeight: 500,
                  }}
                >
                  {pair.left_text}
                </div>
                <svg key={`a-${i}`} width="24" height="16" viewBox="0 0 24 16" fill="none">
                  <path d="M4 8h16M14 3l6 5-6 5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div
                  key={`r-${i}`}
                  style={{
                    padding: "8px 12px",
                    background: "#F0FDF4",
                    borderRadius: 8,
                    fontSize: 13,
                    color: "#166534",
                    fontWeight: 500,
                    border: "1px solid #10B981",
                  }}
                >
                  {pair.right_text}
                </div>
              </>
            ))}
          </div>
        </div>
      )}

      {/* Fill blanks */}
      {q.qtype === "Fill" && q.fill_blanks.length > 0 && (
        <div style={{ paddingLeft: 40, display: "flex", flexDirection: "column", gap: 8 }}>
          {q.fill_blanks.map((blank, i) => (
            <div key={i}>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary, #6b7280)", marginBottom: 4, display: "block" }}>
                Blank {i + 1} — accepted answers:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {blank.accepted_answers.map((ans, j) => (
                  <span
                    key={j}
                    style={{
                      background: "#FDF2F8",
                      color: "#86198F",
                      border: "1px solid #E879F9",
                      borderRadius: 6,
                      padding: "3px 10px",
                      fontSize: 13,
                      fontWeight: 500,
                      fontFamily: "monospace",
                    }}
                  >
                    {ans}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rationale */}
      {q.rationale && (
        <details style={{ marginTop: 14, paddingLeft: 40 }}>
          <summary
            style={{
              fontSize: 12,
              color: "var(--color-text-secondary, #6b7280)",
              cursor: "pointer",
              userSelect: "none",
              listStyle: "none",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 10 }}>▶</span> Rationale
          </summary>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--color-text-secondary, #6b7280)",
              background: "var(--color-background-secondary, #f9fafb)",
              borderRadius: 8,
              padding: "10px 14px",
              borderLeft: "3px solid #6C63FF",
            }}
          >
            {q.rationale}
          </p>
        </details>
      )}
    </div>
  );
}

// ── Curriculum meta header ───────────────────────────────────────────────────

function CurriculumMeta({ data }: { data: CurriculumCreate }) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)",
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 20,
        color: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: "#A5B4FC", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Curriculum Preview
          </p>
          <h2 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 600, color: "#fff" }}>
            {data.role ?? "Untitled Role"}
          </h2>
          {data.company && (
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#C7D2FE" }}>
              {data.company} · {data.sector}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Questions", value: data.questions.length },
            { label: "MCQ", value: data.questions.filter(q => q.qtype === "MCQ").length },
            { label: "Multi", value: data.questions.filter(q => q.qtype === "Multi").length },
            { label: "Match", value: data.questions.filter(q => q.qtype === "Match").length },
            { label: "Fill", value: data.questions.filter(q => q.qtype === "Fill").length },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{value}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#A5B4FC" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

const SAMPLE_HINT = `{
  "role": "Business Intelligence Intern",
  "company": "Pilgrim",
  "sector": "e-commerce",
  "n": 2,
  "questions": [...]
}`;

export default function CurriculumImportPage() {
  const [jsonText, setJsonText] = useState("");
  const [parsed, setParsed] = useState<CurriculumCreate | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedId, setSavedId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<QtypeEnum | "All">("All");

  const handleParse = useCallback(() => {
    setParseError(null);
    try {
      const raw = JSON.parse(jsonText);
      const transformed = transformRawJson(raw);
      setParsed(transformed);
      setSaveStatus("idle");
      setSavedId(null);
    } catch (e) {
      setParseError((e as Error).message);
      setParsed(null);
    }
  }, [jsonText]);

  const handleSave = useCallback(async () => {
    if (!parsed) return;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/curricula/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSavedId(data.id);
      setSaveStatus("success");
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
    }
  }, [parsed]);

  const filteredQuestions = parsed
    ? activeFilter === "All"
      ? parsed.questions
      : parsed.questions.filter(q => q.qtype === activeFilter)
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "#F8F7FF", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Top navbar */}
      <header
        style={{
          background: "#fff",
          borderBottom: "0.5px solid #E5E7EB",
          padding: "0 32px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "#6C63FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1.5" fill="#fff" />
              <rect x="8" y="1" width="5" height="5" rx="1.5" fill="#fff" fillOpacity="0.6" />
              <rect x="1" y="8" width="5" height="5" rx="1.5" fill="#fff" fillOpacity="0.6" />
              <rect x="8" y="8" width="5" height="5" rx="1.5" fill="#fff" />
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>Curriculum Studio</span>
        </div>
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>Import · Preview · Save</span>
      </header>

      {/* Split layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "420px 1fr",
          gap: 0,
          minHeight: "calc(100vh - 56px)",
        }}
      >
        {/* Left: JSON editor pane */}
        <div
          style={{
            background: "#1E1B4B",
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: "calc(100vh - 56px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#A5B4FC", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              JSON Input
            </h2>
            <span style={{ fontSize: 11, color: "#6B7280" }}>
              {jsonText.length > 0 ? `${jsonText.length} chars` : ""}
            </span>
          </div>

          <textarea
            value={jsonText}
            onChange={e => { setJsonText(e.target.value); setParsed(null); setParseError(null); }}
            placeholder={SAMPLE_HINT}
            spellCheck={false}
            style={{
              flex: 1,
              width: "100%",
              minHeight: 420,
              background: "#0F0D2E",
              color: "#E0E7FF",
              border: parseError ? "1px solid #EF4444" : "0.5px solid #312E81",
              borderRadius: 10,
              padding: "14px 16px",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 12,
              lineHeight: 1.7,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          {parseError && (
            <div
              style={{
                background: "#450A0A",
                border: "1px solid #EF4444",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 12,
                color: "#FCA5A5",
                fontFamily: "monospace",
              }}
            >
              ✗ {parseError}
            </div>
          )}

          <button
            onClick={handleParse}
            disabled={!jsonText.trim()}
            style={{
              background: jsonText.trim() ? "#6C63FF" : "#312E81",
              color: jsonText.trim() ? "#fff" : "#6B7280",
              border: "none",
              borderRadius: 8,
              padding: "12px 0",
              fontSize: 14,
              fontWeight: 600,
              cursor: jsonText.trim() ? "pointer" : "not-allowed",
              transition: "background 0.15s",
            }}
          >
            Parse & Preview →
          </button>

          {parsed && (
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving" || saveStatus === "success"}
              style={{
                background: saveStatus === "success" ? "#10B981" : saveStatus === "error" ? "#EF4444" : "#059669",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px 0",
                fontSize: 14,
                fontWeight: 600,
                cursor: saveStatus === "idle" ? "pointer" : "not-allowed",
                transition: "background 0.2s",
              }}
            >
              {saveStatus === "idle" && "Save to Database ↑"}
              {saveStatus === "saving" && "Saving…"}
              {saveStatus === "success" && `✓ Saved (ID: ${savedId})`}
              {saveStatus === "error" && "✗ Save failed — retry"}
            </button>
          )}

          {/* Subject breakdown */}
          {parsed && (
            <div style={{ marginTop: 8 }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Subjects
              </p>
              {Object.entries(
                parsed.questions.reduce<Record<string, number>>((acc, q) => {
                  acc[q.subject] = (acc[q.subject] ?? 0) + 1;
                  return acc;
                }, {})
              ).map(([subject, count]) => (
                <div key={subject} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "0.5px solid #312E81" }}>
                  <span style={{ fontSize: 12, color: "#C7D2FE" }}>{subject}</span>
                  <span style={{ fontSize: 12, color: "#A5B4FC", fontWeight: 600 }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Preview pane */}
        <div style={{ padding: "24px 28px", overflowY: "auto" }}>
          {!parsed && !parseError && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                minHeight: 400,
                color: "#9CA3AF",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 48 }}>📋</div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "#6B7280" }}>
                Paste your curriculum JSON on the left
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#9CA3AF" }}>
                Hit "Parse & Preview" to see your questions rendered here
              </p>
            </div>
          )}

          {parsed && (
            <>
              <CurriculumMeta data={parsed} />

              {/* Filter tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {(["All", "MCQ", "Multi", "Match", "Fill"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    style={{
                      background: activeFilter === f ? "#6C63FF" : "#fff",
                      color: activeFilter === f ? "#fff" : "#6B7280",
                      border: `0.5px solid ${activeFilter === f ? "#6C63FF" : "#E5E7EB"}`,
                      borderRadius: 99,
                      padding: "5px 14px",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {f === "All" ? `All (${parsed.questions.length})` : `${f} (${parsed.questions.filter(q => q.qtype === f).length})`}
                  </button>
                ))}
              </div>

              {filteredQuestions.map((q, i) => (
                <QuestionCard
                  key={i}
                  q={q}
                  index={parsed.questions.indexOf(q)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}