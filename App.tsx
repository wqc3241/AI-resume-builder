
import React, { useState, useRef } from "react";
import { 
  extractKeywords, 
  parseResume, 
  generateTailoredResume, 
  performAtsScan,
  fetchJdFromUrl
} from "./services/geminiService";
import { generatePdf } from "./services/pdfService";
import type { 
  Keywords, 
  Experience, 
  Education, 
  ContactInfo, 
  RefinedResume, 
  AtsScanResult 
} from "./types";

const STEPS = ["paste_jd", "extract_keywords", "enter_experience", "generate_resume", "ats_scan"];
const STEP_LABELS: Record<string, string> = { 
  paste_jd: "Job Description", 
  extract_keywords: "Keywords", 
  enter_experience: "Your Experience", 
  generate_resume: "Resume Builder", 
  ats_scan: "ATS Score" 
};

export default function App() {
  const [step, setStep] = useState("paste_jd");
  const [jd, setJd] = useState("");
  const [jdUrl, setJdUrl] = useState("");
  const [keywords, setKeywords] = useState<Keywords | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingJd, setFetchingJd] = useState(false);
  const [err, setErr] = useState("");
  const [upSt, setUpSt] = useState("");
  const [upFn, setUpFn] = useState("");
  const fRef = useRef<HTMLInputElement>(null);
  
  const [ci, setCi] = useState<ContactInfo>({ name: "", email: "", phone: "", location: "", linkedin: "", portfolio: "" });
  const [exps, setExps] = useState<Experience[]>([{ company: "", title: "", startDate: "", endDate: "", bullets: [""] }]);
  const [sk, setSk] = useState("");
  const [edu, setEdu] = useState<Education[]>([{ school: "", degree: "", startDate: "", endDate: "" }]);
  const [refined, setRefined] = useState<RefinedResume | null>(null);
  const [ats, setAts] = useState<AtsScanResult | null>(null);

  const rb64 = (f: File): Promise<string> => new Promise((r, j) => { 
    const x = new FileReader(); 
    x.onload = () => r((x.result as string).split(",")[1]); 
    x.onerror = () => j(new Error("Read failed")); 
    x.readAsDataURL(f); 
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "txt"].includes(ext || "")) { setErr("Upload PDF, DOCX, or TXT."); return; }
    setErr(""); setUpFn(f.name); setUpSt("parsing");
    try {
      const b64 = await rb64(f);
      let mime = "application/pdf";
      if (ext === "docx") mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      if (ext === "txt") mime = "text/plain";
      
      const p = await parseResume(b64, mime);
      if (p.contact) setCi({ ...ci, ...p.contact });
      if (p.experiences?.length) setExps(p.experiences.map((x: any) => ({ 
        company: x.company || "", 
        title: x.title || "", 
        startDate: x.startDate || "", 
        endDate: x.endDate || "", 
        bullets: x.bullets?.length ? x.bullets : [""] 
      })));
      if (p.skills) setSk(p.skills);
      if (p.education?.length) setEdu(p.education.map((x: any) => ({ 
        school: x.school || "", 
        degree: x.degree || "", 
        startDate: x.startDate || "", 
        endDate: x.endDate || "" 
      })));
      setUpSt("done");
    } catch (e: any) { setErr("Parse failed: " + e.message); setUpSt("error"); }
    if (fRef.current) fRef.current.value = "";
  };

  const doFetchJd = async () => {
    if (!jdUrl.trim()) { setErr("Please enter a valid URL."); return; }
    setErr("");
    setFetchingJd(true);
    try {
      const { text } = await fetchJdFromUrl(jdUrl);
      setJd(text);
    } catch (e: any) {
      setErr("Failed to fetch URL. Please try pasting the description manually.");
    } finally {
      setFetchingJd(false);
    }
  };

  const doExtract = async () => {
    if (!jd.trim()) { setErr("Paste a job description first."); return; }
    setErr(""); setLoading(true);
    try {
      const p = await extractKeywords(jd);
      setKeywords(p); setStep("extract_keywords");
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };

  const doGenerate = async () => {
    if (!keywords) return;
    setErr(""); setLoading(true);
    try {
      const p = await generateTailoredResume({ contactInfo: ci, experiences: exps, skills: sk, education: edu, keywords });
      setRefined(p); setStep("generate_resume");
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };

  const doScan = async () => {
    if (!refined || !keywords) return;
    setErr(""); setLoading(true);
    try {
      const p = await performAtsScan(jd, refined, keywords);
      setAts(p); setStep("ats_scan");
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };

  const handleDownload = () => {
    if (!refined) return;
    // Basic text builder for PDF
    let content = `${ci.name}\n${[ci.phone, ci.email, ci.location, ci.linkedin, ci.portfolio].filter(Boolean).join(" | ")}\n\nEXPERIENCE\n\n`;
    refined.experiences.forEach(e => {
      content += `${e.company} | ${e.title} | ${e.startDate} - ${e.endDate}\n`;
      e.bullets.forEach(b => { content += `• ${b.replace(/\*\*/g, '')}\n`; });
      content += `\n`;
    });
    content += `SKILLS\n${refined.suggested_skills}\n\nEDUCATION\n`;
    edu.forEach(e => { content += `${e.school} | ${e.degree} | ${e.startDate} - ${e.endDate}\n`; });
    generatePdf(content);
  };

  const addExp = () => setExps([...exps, { company: "", title: "", startDate: "", endDate: "", bullets: [""] }]);
  const updExp = (i: number, f: keyof Experience, v: any) => { const e = [...exps]; (e[i] as any)[f] = v; setExps(e); };
  const addBul = (i: number) => { const e = [...exps]; e[i].bullets.push(""); setExps(e); };
  const updBul = (ei: number, bi: number, v: string) => { const e = [...exps]; e[ei].bullets[bi] = v; setExps(e); };
  const rmBul = (ei: number, bi: number) => { const e = [...exps]; e[ei].bullets.splice(bi, 1); setExps(e); };
  const rmExp = (i: number) => { const e = [...exps]; e.splice(i, 1); setExps(e); };
  const addEd = () => setEdu([...edu, { school: "", degree: "", startDate: "", endDate: "" }]);
  const updEd = (i: number, f: keyof Education, v: string) => { const e = [...edu]; e[i][f] = v; setEdu(e); };
  const clrUp = () => { setUpSt(""); setUpFn(""); setCi({ name: "", email: "", phone: "", location: "", linkedin: "", portfolio: "" }); setExps([{ company: "", title: "", startDate: "", endDate: "", bullets: [""] }]); setSk(""); setEdu([{ school: "", degree: "", startDate: "", endDate: "" }]); };

  const idx = STEPS.indexOf(step);

  const renderBullet = (text: string) => {
    return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  };

  const ScoreRing = ({ score, size = 140 }: { score: number, size?: number }) => {
    const r = (size - 16) / 2, c = 2 * Math.PI * r, off = c - (score / 100) * c;
    const col = score >= 85 ? "#16a34a" : score >= 70 ? "#ca8a04" : "#dc2626";
    return <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="8" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 1.2s ease" }} />
      <text x={size / 2} y={size / 2 - 8} textAnchor="middle" fill={col} fontSize="32" fontWeight="800" fontFamily="'DM Mono',monospace">{score}%</text>
      <text x={size / 2} y={size / 2 + 16} textAnchor="middle" fill="#94a3b8" fontSize="11">ATS SCORE</text>
    </svg>;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f1a", color: "#e2e8f0", fontFamily: "'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e293b", padding: "20px 32px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff" }}>R</div>
        <div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>ResumeForge</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: -2 }}>AI-Powered ATS Resume Builder</div>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", justifyContent: "center", padding: "24px 16px 8px" }}>
        {STEPS.map((s, i) => { 
          const a = i === idx; 
          const d = i < idx; 
          return <div key={s} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono',monospace", background: d ? "#6366f1" : a ? "linear-gradient(135deg,#6366f1,#a855f7)" : "#1e293b", color: d || a ? "#fff" : "#475569", border: a ? "2px solid #818cf8" : "2px solid transparent", boxShadow: a ? "0 0 16px rgba(99,102,241,0.4)" : "none", transition: "all 0.3s" }}>{d ? "✓" : i + 1}</div>
              <div style={{ fontSize: 10, marginTop: 6, color: a ? "#c7d2fe" : "#475569", fontWeight: a ? 600 : 400, whiteSpace: "nowrap" }}>{STEP_LABELS[s]}</div>
            </div>
            {i < 4 && <div style={{ width: 48, height: 2, background: d ? "#6366f1" : "#1e293b", margin: "0 4px", marginBottom: 18 }} />}
          </div>; 
        })}
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "16px 24px 40px" }}>
        {err && <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#fca5a5" }}>{err}</div>}

        {/* STEP 1: Paste JD */}
        {step === "paste_jd" && <div style={fadeIn}>
          <H2>Job Description</H2>
          <P>Enter the details of the job you're targeting. You can paste the text directly or provide a URL for AI extraction.</P>
          
          <div style={{ marginBottom: 20 }}>
            <div style={catLabel}>Option 1: Extract from URL</div>
            <div style={{ display: "flex", gap: 10 }}>
              <input 
                value={jdUrl} 
                onChange={e => setJdUrl(e.target.value)} 
                placeholder="https://linkedin.com/jobs/view/..." 
                style={{ ...iSt, flex: 1 }} 
              />
              <Btn onClick={doFetchJd} loading={fetchingJd}>
                {fetchingJd ? <Spinner /> : <><i className="fa-solid fa-globe"></i> Fetch</>}
              </Btn>
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>AI will browse the link and extract requirements.</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#1e293b" }}></div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>OR PASTE TEXT</div>
            <div style={{ flex: 1, height: 1, background: "#1e293b" }}></div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={catLabel}>Option 2: Paste Manually</div>
            <textarea 
              value={jd} 
              onChange={e => setJd(e.target.value)} 
              placeholder="Paste the full job description here..." 
              style={{ width: "100%", minHeight: 280, padding: 16, borderRadius: 12, border: "1px solid #1e293b", background: "#0f172a", color: "#e2e8f0", fontSize: 14, fontFamily: "'DM Sans',sans-serif", resize: "vertical", outline: "none", lineHeight: 1.6, boxSizing: "border-box" }} 
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <Btn onClick={doExtract} loading={loading}>Extract Keywords →</Btn>
          </div>
        </div>}

        {/* STEP 2: Keywords */}
        {step === "extract_keywords" && keywords && <div style={fadeIn}>
          <H2>Extracted ATS Keywords</H2>
          <P>These keywords will be woven into your resume.</P>
          {Object.entries(keywords).map(([c, items]) => <div key={c} style={{ marginBottom: 20 }}>
            <div style={catLabel}>{c.replace(/_/g, " ")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{(items as string[]).map((k, i) => <span key={i} style={tag}>{k}</span>)}</div>
          </div>)}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <BtnSec onClick={() => setStep("paste_jd")}>← Back</BtnSec>
            <Btn onClick={() => setStep("enter_experience")} loading={false}>Enter Your Experience →</Btn>
          </div>
        </div>}

        {/* STEP 3: Experience */}
        {step === "enter_experience" && <div style={fadeIn}>
          <H2>Your Experience</H2>
          <P>Upload your existing resume or enter details manually.</P>

          <div style={{ border: upSt === "done" ? "2px solid #16a34a" : upSt === "error" ? "2px solid #dc2626" : "2px dashed #334155", borderRadius: 14, padding: upSt === "done" || upSt === "error" ? "16px 24px" : "28px 24px", marginBottom: 28, textAlign: "center", background: "#0f172a", transition: "all 0.3s" }}>
            <input ref={fRef} type="file" accept=".pdf,.docx,.txt" onChange={handleUpload} style={{ display: "none" }} id="rup" />
            {upSt === "" && <>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 12px", display: "block", opacity: 0.6 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <label htmlFor="rup" style={{ display: "inline-block", padding: "10px 24px", borderRadius: 10, cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 10, boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}>Upload Your Resume</label>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>PDF, DOCX, TXT — AI auto-fills all fields below</div>
            </>}
            {upSt === "parsing" && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "8px 0" }}><Spinner /><div><div style={{ fontSize: 14, fontWeight: 600, color: "#c7d2fe" }}>AI is parsing your resume...</div><div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{upFn}</div></div></div>}
            {upSt === "done" && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#052e16", border: "1px solid #166534", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <div style={{ textAlign: "left" }}><div style={{ fontSize: 13, fontWeight: 600, color: "#4ade80" }}>Resume parsed successfully</div><div style={{ fontSize: 11, color: "#64748b" }}>{upFn} — fields populated below</div></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}><label htmlFor="rup" style={reupBtn}>Re-upload</label><button onClick={clrUp} style={clrBtn}>Clear</button></div>
            </div>}
          </div>

          <SL>Contact Information</SL>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            <In l="Full Name" v={ci.name} o={v => setCi({ ...ci, name: v })} />
            <In l="Email" v={ci.email} o={v => setCi({ ...ci, email: v })} />
            <In l="Phone" v={ci.phone} o={v => setCi({ ...ci, phone: v })} />
            <In l="Location" v={ci.location} o={v => setCi({ ...ci, location: v })} />
          </div>

          <SL>Work Experience</SL>
          {exps.map((x, ei) => <div key={ei} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#818cf8", fontFamily: "'DM Mono',monospace" }}>Experience #{ei + 1}</span>
              {exps.length > 1 && <button onClick={() => rmExp(ei)} style={dangerBtn}>Remove</button>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <In l="Company" v={x.company} o={v => updExp(ei, "company", v)} />
              <In l="Job Title" v={x.title} o={v => updExp(ei, "title", v)} />
              <In l="Start Date" v={x.startDate} o={v => updExp(ei, "startDate", v)} p="e.g. Jan 2024" />
              <In l="End Date" v={x.endDate} o={v => updExp(ei, "endDate", v)} p="e.g. Present" />
            </div>
            {x.bullets.map((b, bi) => <div key={bi} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={b} onChange={e => updBul(ei, bi, e.target.value)} placeholder="Achievement..." style={{ ...iSt, flex: 1 }} />
              {x.bullets.length > 1 && <button onClick={() => rmBul(ei, bi)} style={{ ...dangerBtn, padding: "6px 10px", fontSize: 14 }}>×</button>}
            </div>)}
            <button onClick={() => addBul(ei)} style={{ ...secBtn, fontSize: 12, padding: "6px 12px", marginTop: 4 }}>+ Add Bullet</button>
          </div>)}
          <button onClick={addExp} style={{ ...secBtn, marginBottom: 24 }}>+ Add Experience</button>

          <SL>Skills</SL>
          <input value={sk} onChange={e => setSk(e.target.value)} placeholder="e.g. Strategy, A/B Testing, SQL..." style={{ ...iSt, width: "100%", marginBottom: 24, boxSizing: "border-box" }} />

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <BtnSec onClick={() => setStep("extract_keywords")}>← Back</BtnSec>
            <Btn onClick={doGenerate} loading={loading}>Tailor My Resume →</Btn>
          </div>
        </div>}

        {/* STEP 4: Resume Preview */}
        {step === "generate_resume" && refined && <div style={fadeIn}>
          <H2>Your Tailored Resume</H2>
          <P>Optimized with metrics, action verbs, and keywords.</P>

          <div style={{ background: "#fff", color: "#111", borderRadius: 4, padding: "32px 36px", fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt", lineHeight: 1.45, boxShadow: "0 2px 24px rgba(0,0,0,0.3)", border: "1px solid #334155" }}>
            <div style={{ textAlign: "center", fontSize: "14pt", fontWeight: 700 }}>{ci.name || "Your Name"}</div>
            <div style={{ textAlign: "center", fontSize: "9pt", color: "#333", marginTop: 3, marginBottom: 8 }}>
              {[ci.phone, ci.email, ci.location, ci.linkedin, ci.portfolio].filter(Boolean).join(" | ")}
            </div>
            <hr style={{ border: "none", borderTop: "1.5px solid #000", margin: "6px 0 10px" }} />
            <div style={{ fontSize: "11pt", fontWeight: 700, textTransform: "uppercase", borderBottom: "1px solid #000", paddingBottom: 2, marginBottom: 6 }}>Professional Experience</div>
            {refined.experiences.map((exp, i) => <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700 }}>{exp.company}</span>
                <span>{exp.startDate} - {exp.endDate}</span>
              </div>
              <div style={{ fontStyle: "italic" }}>{exp.title}</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {exp.bullets.map((b, j) => <li key={j} dangerouslySetInnerHTML={{ __html: renderBullet(b) }} />)}
              </ul>
            </div>)}
            <div style={{ fontSize: "11pt", fontWeight: 700, textTransform: "uppercase", borderBottom: "1px solid #000", paddingBottom: 2, marginTop: 8, marginBottom: 4 }}>Skills</div>
            <div style={{ fontSize: "11pt" }}>{refined.suggested_skills}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <BtnSec onClick={() => setStep("enter_experience")}>← Edit</BtnSec>
            <div style={{ display: "flex", gap: 12 }}>
              <BtnSec onClick={handleDownload}>Download PDF</BtnSec>
              <Btn onClick={doScan} loading={loading}>Run ATS Scan →</Btn>
            </div>
          </div>
        </div>}

        {/* STEP 5: ATS Scan */}
        {step === "ats_scan" && ats && <div style={fadeIn}>
          <H2>ATS Scan Results</H2>
          <div style={{ display: "flex", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 28, flex: "1 1 200px", textAlign: "center" }}>
              <ScoreRing score={ats.overall_score || 0} />
              <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: (ats.overall_score || 0) >= 85 ? "#16a34a" : (ats.overall_score || 0) >= 70 ? "#ca8a04" : "#dc2626" }}>{(ats.overall_score || 0) >= 85 ? "🟢 STRONG PASS" : (ats.overall_score || 0) >= 70 ? "🟡 LIKELY PASS" : "🔴 AT RISK"}</div>
            </div>
            <div style={{ flex: "2 1 300px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
                <div style={catLabel}>Keyword Match — {ats.keyword_match?.score}%</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{ats.keyword_match?.matched.map((k, i) => <span key={i} style={{ padding: "4px 10px", borderRadius: 14, fontSize: 11, background: "#052e16", color: "#4ade80", border: "1px solid #166534" }}>✓ {k}</span>)}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>{ats.keyword_match?.missing.map((k, i) => <span key={i} style={{ padding: "4px 10px", borderRadius: 14, fontSize: 11, background: "#450a0a", color: "#fca5a5", border: "1px solid #7f1d1d" }}>✗ {k}</span>)}</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <BtnSec onClick={() => setStep("generate_resume")}>← Back</BtnSec>
            <Btn onClick={() => setStep("enter_experience")} loading={false}>Edit & Re-scan</Btn>
          </div>
        </div>}
      </div>

      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

// ── Shared UI Parts ──
const fadeIn = { animation: "fadeIn 0.4s ease" };
const iSt = { padding: "10px 14px", borderRadius: 8, border: "1px solid #1e293b", background: "#0f172a", color: "#e2e8f0", fontSize: 13, outline: "none" };
const catLabel = { fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, color: "#818cf8", marginBottom: 8, fontFamily: "'DM Mono',monospace" };
const tag = { padding: "6px 14px", borderRadius: 20, fontSize: 13, background: "#1e1b4b", color: "#c7d2fe", border: "1px solid #312e81" };
const secBtn = { padding: "10px 20px", borderRadius: 10, border: "1px solid #334155", cursor: "pointer", background: "transparent", color: "#94a3b8", fontSize: 13, fontWeight: 500 };
const dangerBtn = { padding: "4px 10px", borderRadius: 6, border: "1px solid #7f1d1d", cursor: "pointer", background: "#450a0a", color: "#fca5a5", fontSize: 11 };
const reupBtn = { padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "#818cf8", border: "1px solid #312e81" };
const clrBtn = { padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "#94a3b8", border: "1px solid #334155" };

const H2: React.FC<React.PropsWithChildren<{}>> = ({ children }) => <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 800, marginBottom: 4, color: "#f1f5f9" }}>{children}</h2>;
const P: React.FC<React.PropsWithChildren<{}>> = ({ children }) => <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>{children}</p>;
const SL: React.FC<React.PropsWithChildren<{}>> = ({ children }) => <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, color: "#818cf8", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 6 }}>{children}</div>;
const Spinner: React.FC = () => <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid #fff4", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />;

interface InProps { l: string; v: string; o: (v: string) => void; p?: string; }
const In: React.FC<InProps> = ({ l, v, o, p }) => <div><div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>{l}</div><input value={v} onChange={e => o(e.target.value)} placeholder={p || l} style={{ ...iSt, width: "100%", boxSizing: "border-box" }} /></div>;

interface BtnProps { onClick: () => void | Promise<void>; loading?: boolean; children: React.ReactNode; }
const Btn: React.FC<BtnProps> = ({ onClick, loading = false, children }) => <button onClick={onClick as any} disabled={loading} style={{ padding: "12px 28px", borderRadius: 10, border: "none", cursor: loading ? "wait" : "pointer", background: loading ? "#3730a3" : "linear-gradient(135deg,#6366f1,#a855f7)", color: "#fff", fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}>{loading ? <Spinner /> : children}</button>;

interface BtnSecProps { onClick: () => void | Promise<void>; children: React.ReactNode; }
const BtnSec: React.FC<BtnSecProps> = ({ onClick, children }) => <button onClick={onClick as any} style={secBtn}>{children}</button>;
