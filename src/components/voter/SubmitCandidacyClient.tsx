"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { submitCandidacyApplication } from "@/app/actions/candidate";

type Position = { id: string; name: string };

type ExistingApplication = {
  id: string;
  status: string;
  position_id: string;
  position_name: string;
};

type Props = {
  profile: {
    id: string;
    full_name: string;
    student_id: string;
    strand: string | null;
    section: string | null;
  };
  positions: Position[];
  existingApplication: ExistingApplication | null;
  candidacyOpen: boolean;
  registrationStartsAt: string | null;
  registrationEndsAt: string | null;
};

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending:  { color: "#b45309", bg: "#fef3c7", label: "Under Review",   icon: "ti-clock-hour-4" },
  approved: { color: "#15803d", bg: "#dcfce7", label: "Approved",       icon: "ti-circle-check" },
  rejected: { color: "#be123c", bg: "#ffe4e6", label: "Rejected",       icon: "ti-circle-x"     },
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function isMatchingStrandPosition(positionName: string, strand: string) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, string[]> = {
    ict: ["ict", "informationandcommunicationstechnology", "informationandcommunicationtechnology"],
    abm: ["abm", "accountancybusinessandmanagement"],
    stem: ["stem", "science,technology,engineering,andmathematics", "sciencetechnologyengineeringandmathematics"],
    humss: ["humss", "humanitiesandsocialsciences"],
    gas: ["gas", "generalacademicstrand"],
    tvl: ["tvl", "technicalvocationalandlivelihood"],
  };
  const position = normalize(positionName);
  const key = normalize(strand);
  const known = Object.entries(aliases).find(([shortName, names]) =>
    key === shortName || names.some((alias) => key.includes(alias))
  );
  const choices = known?.[1] ?? [key];
  return choices.some((alias) => alias && position.includes(alias));
}

type ApplicationAnswers = { school_year:string; contact_number:string; academic_standing:string; previous_average:string; academic_awards:string; leadership_held:""|"yes"|"no"; leadership_details:string; organizations:string; volunteer_experience:string; why_representative:string; candidate_qualities:string; student_plans:string; represent_student_concerns:string; balance_responsibilities:string; declaration_signature:string; };
function ApplicationField({label,name,value,onChange,placeholder,multiline=false,required=true,maxLength=500,type="text"}:{label:string;name:keyof ApplicationAnswers;value:string;onChange:(name:keyof ApplicationAnswers,value:string)=>void;placeholder?:string;multiline?:boolean;required?:boolean;maxLength?:number;type?:string}){const style:React.CSSProperties={width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #cbd5e1",fontSize:14,boxSizing:"border-box",fontFamily:"inherit",color:"#1e293b",background:"#fff"};return <label style={{display:"flex",flexDirection:"column",gap:6,fontSize:12,fontWeight:700,color:"#475569"}}>{label}{required&&<span style={{color:"#be123c"}}>*</span>}{multiline?<textarea name={name} value={value} onChange={e=>onChange(name,e.target.value)} placeholder={placeholder} required={required} maxLength={maxLength} rows={3} style={{...style,resize:"vertical",lineHeight:1.5}}/>:<input name={name} type={type} value={value} onChange={e=>onChange(name,e.target.value)} placeholder={placeholder} required={required} maxLength={maxLength} style={style}/>}</label>}

export default function SubmitCandidacyClient({ profile, positions, existingApplication, candidacyOpen, registrationStartsAt, registrationEndsAt }: Props) {
const defaultPositionId = (() => {
  if (profile.strand) {
    const repPosition = positions.find((p) =>
      isMatchingStrandPosition(p.name, profile.strand!) &&
      p.name.toLowerCase().includes("representative")
    );
    if (repPosition) return repPosition.id;
  }
  return positions[0]?.id ?? "";
})();

  const [positionId, setPositionId] = useState(defaultPositionId);
  const [tagline, setTagline]       = useState("");
  const [bio, setBio]               = useState("");
  const [registrationFile, setRegistrationFile] = useState<File | null>(null);
  const [application, setApplication] = useState<ApplicationAnswers>({school_year:"",contact_number:"",academic_standing:"",previous_average:"",academic_awards:"",leadership_held:"",leadership_details:"",organizations:"",volunteer_experience:"",why_representative:"",candidate_qualities:"",student_plans:"",represent_student_concerns:"",balance_responsibilities:"",declaration_signature:""});
  const [photoFile, setPhotoFile]   = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [agreed, setAgreed]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [submitted, setSubmitted]   = useState(false);
  const [currentApp, setCurrentApp]         = useState(existingApplication);
  const [applicationOpen, setApplicationOpen] = useState(candidacyOpen);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      setApplicationOpen(Boolean(registrationStartsAt && registrationEndsAt &&
        now >= new Date(registrationStartsAt).getTime() && now < new Date(registrationEndsAt).getTime()));
    };
    update();
    const timer = setInterval(update, 15_000);
    return () => clearInterval(timer);
  }, [registrationStartsAt, registrationEndsAt]);

  useEffect(() => {
    const supabase = createClient();

    async function checkApplication() {
      const { data } = await supabase
        .from("candidates")
        .select("id, status, position_id, positions ( name )")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (!data) {
        // Application was deleted by admin — reset to form
        setCurrentApp(null);
        setSubmitted(false);
      } else {
        type ExistingRaw = {
          id: string;
          status: string;
          position_id: string;
          positions: { name: string } | null;
        };
        const raw = data as unknown as ExistingRaw;
        setCurrentApp({
          id:            raw.id,
          status:        raw.status,
          position_id:   raw.position_id,
          position_name: raw.positions?.name ?? "—",
        });
      }
    }

    // Check immediately on mount
    checkApplication();

    // Subscribe to real-time changes on this student's candidacy
    const channel = supabase
      .channel("candidacy-status")
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "candidates",
          filter: `user_id=eq.${profile.id}`,
        },
        checkApplication
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile.id]);

  function updateApplication(name:keyof ApplicationAnswers,value:string){setApplication(previous=>({...previous,[name]:name==="leadership_held"?value as ApplicationAnswers["leadership_held"]:value}));}

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!agreed) { setError("Please confirm that all information is true and correct."); return; }
    if (!positionId) { setError("Please select a position."); return; }
    if (!tagline.trim()) { setError("Please enter a campaign slogan."); return; }
    if (!registrationFile) { setError("Upload your official registration form or grade report."); return; }
    if (application.declaration_signature.trim().toLowerCase() !== profile.full_name.trim().toLowerCase()) { setError("Type your registered full name as your declaration signature."); return; }
    if (application.leadership_held === "yes" && !application.leadership_details.trim()) { setError("Please describe your previous leadership position."); return; }

    setLoading(true);
    setError("");

    const supabase = createClient();
    let photo_url: string | null = null;

    // Upload photo if provided
    if (photoFile) {
      const ext  = photoFile.name.split(".").pop();
      const path = `candidates/${profile.id}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("candidate-photos")
        .upload(path, photoFile, { upsert: true });

      if (uploadErr) {
        setError("Photo upload failed: " + uploadErr.message);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("candidate-photos")
        .getPublicUrl(path);
      photo_url = urlData.publicUrl;
    }

    const formData = new FormData();
    formData.set("position_id",positionId); formData.set("tagline",tagline.trim()); formData.set("bio",bio.trim()); formData.set("photo_url",photo_url??""); formData.set("registration_form",registrationFile);
    for(const [key,value] of Object.entries(application))formData.set(key,value);
    formData.set("declaration_date",new Date().toISOString().slice(0,10));
    const result=await submitCandidacyApplication(formData);
    if(!result.ok){setError(result.error);setLoading(false);return;}
    setSubmitted(true); setLoading(false);
  }

  // ── Already submitted view ────────────────────────────────────────────────

  if (currentApp || submitted) {
  const app = currentApp ?? { status: "pending", position_name: positions.find(p => p.id === positionId)?.name ?? "—" };
    const st  = STATUS_STYLE[app.status] ?? STATUS_STYLE.pending;

    return (
      <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <h1 style={{
          fontFamily: "var(--font-oswald), sans-serif",
          fontSize: "22px", fontWeight: 700,
          color: "#0d6b34", letterSpacing: "0.04em",
          textTransform: "uppercase", margin: 0,
        }}>
          Submit Candidacy
        </h1>

        <div style={{
          background: "#fff", borderRadius: "20px",
          border: "1px solid #e2e8f0", overflow: "hidden",
          maxWidth: "520px",
        }}>
          {/* Green header */}
          <div style={{ background: "#0d6b34", padding: "28px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", fontWeight: 700, color: "#fff", flexShrink: 0,
            }}>
              {getInitials(profile.full_name)}
            </div>
            <div>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "#fff" }}>{profile.full_name}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>ID: {profile.student_id}</div>
            </div>
          </div>

          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", background: st.bg, borderRadius: "12px", padding: "14px 16px" }}>
              <i className={`ti ${st.icon}`} style={{ fontSize: "24px", color: st.color }} />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: st.color }}>{st.label}</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  Your application is currently {app.status === "pending" ? "being reviewed by the admin." : app.status === "approved" ? "approved. You are cleared to run." : "rejected. Contact the admin for details."}
                </div>
              </div>
            </div>

            {/* Details */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                { label: "Applied For",  value: app.position_name },
                { label: "Student ID",   value: profile.student_id },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{label}</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{value}</div>
                </div>
              ))}
            </div>

            <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", textAlign: "center" }}>
              {app.status === "rejected"
                ? "You may contact the admin to appeal or reapply."
                : "You will be notified once the admin reviews your application."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ── Form view ─────────────────────────────────────────────────────────────

  const selectedPosition = positions.find((p) => p.id === positionId);

  if (!applicationOpen) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <h1 style={{ fontFamily: "var(--font-oswald), sans-serif", fontSize: "22px", fontWeight: 700, color: "#0d6b34", letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>Candidacy applications</h1>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "28px", maxWidth: "680px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, background: "#fff7ed", color: "#c2410c", display: "grid", placeItems: "center", flexShrink: 0 }}><i className="ti ti-lock" aria-hidden="true" /></span>
          <div><h2 style={{ margin: "0 0 6px", color: "#1e293b", fontSize: 17 }}>Candidate registration is closed</h2><p style={{ margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>Applications are accepted only during the scheduled candidate registration period. Your existing application remains available in its current status.</p></div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <h1 style={{
        fontFamily: "var(--font-oswald), sans-serif",
        fontSize: "22px", fontWeight: 700,
        color: "#0d6b34", letterSpacing: "0.04em",
        textTransform: "uppercase", margin: 0,
      }}>
        Submit Candidacy
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>

        {/* ── Left — main form ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Personal info card */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ background: "#0d6b34", padding: "16px 20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Personal Profile
              </div>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Name + ID — read only from profile */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>
                    Full Name
                  </label>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                    {profile.full_name}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>
                    Student ID
                  </label>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", fontWeight: 600, color: "#1e293b", fontFamily: "monospace" }}>
                    {profile.student_id}
                  </div>
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:5}}>GRADE AND SECTION</div><div style={{padding:"10px 12px",background:"#f8fafc",borderRadius:8,color:"#1e293b"}}>{profile.section || "Section not listed"}</div></div>
                <div><div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:5}}>STRAND</div><div style={{padding:"10px 12px",background:"#f8fafc",borderRadius:8,color:"#1e293b"}}>{profile.strand || "—"}</div></div>
                <ApplicationField label="School Year" name="school_year" value={application.school_year} onChange={updateApplication} placeholder="e.g. 2026–2027" maxLength={40}/>
                <ApplicationField label="Contact Number" name="contact_number" value={application.contact_number} onChange={updateApplication} placeholder="09XX XXX XXXX" maxLength={40}/>
              </div>

              {/* Position */}
<div>
  <label style={{
    fontSize: "12px", fontWeight: 700, color: "#64748b",
    textTransform: "uppercase", letterSpacing: "0.05em",
    display: "block", marginBottom: "6px",
  }}>
    Target Position <span style={{ color: "#be123c" }}>*</span>
  </label>

  {/* Regular positions */}
  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
    <div style={{
      fontSize: "11px", fontWeight: 700, color: "#94a3b8",
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      General Positions
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
      {positions
        .filter((p) => !p.name.toLowerCase().includes("representative"))
        .map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPositionId(p.id)}
            style={{
              padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
              fontSize: "13px", fontWeight: 700, textAlign: "left",
              transition: "all 0.15s",
              border: positionId === p.id
                ? "2px solid #0d6b34"
                : "1.5px solid #e2e8f0",
              background: positionId === p.id ? "#f0fdf4" : "#fff",
              color: positionId === p.id ? "#0d6b34" : "#1e293b",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <i className={`ti ${
                p.name === "Mayor"      ? "ti-building-community" :
                p.name === "Vice Mayor" ? "ti-user-star"          :
                p.name === "Secretary"  ? "ti-file-text"          :
                p.name === "Treasurer"  ? "ti-cash"               :
                p.name === "Auditor"    ? "ti-calculator"         :
                                          "ti-speakerphone"
              }`} aria-hidden="true" style={{ fontSize: "16px" }} />
              {p.name}
            </div>
            {positionId === p.id && (
              <i className="ti ti-check" aria-hidden="true" style={{
                float: "right", fontSize: "14px", color: "#0d6b34",
              }} />
            )}
          </button>
        ))}
    </div>

    {/* Representative section */}
    {positions.some((p) => p.name.toLowerCase().includes("representative")) && (
      <>
        <div style={{
          fontSize: "11px", fontWeight: 700, color: "#94a3b8",
          textTransform: "uppercase", letterSpacing: "0.05em",
          marginTop: "8px",
        }}>
          Strand Representative
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
          {positions
            .filter((p) => p.name.toLowerCase().includes("representative") && profile.strand && isMatchingStrandPosition(p.name, profile.strand))
            .map((p) => {
              const isSelected = positionId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPositionId(p.id)}
                  style={{
                    padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
                    fontSize: "13px", fontWeight: 700, textAlign: "left",
                    transition: "all 0.15s", position: "relative",
                    border: isSelected ? "2px solid #0d6b34" : "1.5px solid #e2e8f0",
                    background: isSelected ? "#f0fdf4" : "#fff",
                    color: isSelected ? "#0d6b34" : "#1e293b", opacity: 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="ti ti-users" aria-hidden="true" style={{ fontSize: "16px" }} />
                    {p.name}
                  </div>
                  <span style={{
                      position: "absolute", top: "-8px", right: "8px",
                      background: "#e8f5ed", color: "#0d6b34",
                      fontSize: "9px", fontWeight: 700,
                      borderRadius: "4px", padding: "2px 6px",
                      letterSpacing: "0.04em",
                    }}>
                      YOUR STRAND
                  </span>
                  {isSelected && (
                    <i className="ti ti-check" aria-hidden="true" style={{
                      float: "right", fontSize: "14px", color: "#0d6b34",
                    }} />
                  )}
                </button>
              );
            })}
          {profile.strand && !positions.some((p) => p.name.toLowerCase().includes("representative") && isMatchingStrandPosition(p.name, profile.strand!)) && <p style={{ color: "#64748b", fontSize: 13 }}>No representative position is configured for your saved strand ({profile.strand}). Contact an administrator.</p>}
          {!profile.strand && <p style={{ color: "#be123c", fontSize: 13 }}>Your strand is missing from your profile. Contact an administrator to update it before applying for a strand representative position.</p>}
        </div>
      </>
    )}
  </div>
{/* Hint for auto-selected representative */}
  {profile.strand &&
    isMatchingStrandPosition(positions.find((p) => p.id === positionId)?.name ?? "", profile.strand) &&
    positions.find((p) => p.id === positionId)
      ?.name.toLowerCase().includes("representative") && (
    <div style={{
      marginTop: "8px", fontSize: "12px", color: "#0d6b34",
      fontWeight: 600, display: "flex", alignItems: "center", gap: "5px",
      background: "#f0fdf4", borderRadius: "8px", padding: "8px 12px",
    }}>
      <i className="ti ti-info-circle" aria-hidden="true" />
      Auto-selected based on your strand ({profile.strand})
    </div>
  )}
              </div>
            </div>
          </div>

          {/* Academic qualifications */}
          <div style={{background:"#fff",borderRadius:16,border:"1px solid #e2e8f0",overflow:"hidden"}}>
            <div style={{background:"#0d6b34",padding:"14px 20px",color:"#fff",fontSize:13,fontWeight:800,letterSpacing:".05em"}}>ACADEMIC INFORMATION</div>
            <div style={{padding:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <ApplicationField label="Current Academic Standing / GPA" name="academic_standing" value={application.academic_standing} onChange={updateApplication} placeholder="e.g. GPA or current average"/>
              <ApplicationField label="Previous School Year Average" name="previous_average" value={application.previous_average} onChange={updateApplication} placeholder="e.g. 91.5"/>
              <div style={{gridColumn:"1 / -1"}}><ApplicationField label="Academic Awards or Achievements" name="academic_awards" value={application.academic_awards} onChange={updateApplication} placeholder="List awards, or leave blank if none" multiline required={false} maxLength={1000}/></div>
              <p style={{gridColumn:"1 / -1",margin:0,fontSize:12,color:"#64748b"}}>The uploaded registration form or official grade report is the evidence administrators will use to verify these self-reported details.</p>
            </div>
          </div>

          {/* Leadership experience */}
          <div style={{background:"#fff",borderRadius:16,border:"1px solid #e2e8f0",overflow:"hidden"}}>
            <div style={{background:"#1a2e1f",padding:"14px 20px",color:"#fff",fontSize:13,fontWeight:800,letterSpacing:".05em"}}>LEADERSHIP AND EXPERIENCE</div>
            <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
              <label style={{display:"flex",flexDirection:"column",gap:6,fontSize:12,fontWeight:700,color:"#475569"}}>Have you held a leadership position before? *<select value={application.leadership_held} onChange={e=>updateApplication("leadership_held",e.target.value)} required style={{padding:10,border:"1px solid #cbd5e1",borderRadius:8,background:"white"}}><option value="">Select an answer</option><option value="yes">Yes</option><option value="no">No</option></select></label>
              {application.leadership_held === "yes" && <ApplicationField label="Leadership position(s) held" name="leadership_details" value={application.leadership_details} onChange={updateApplication} placeholder="Role, organization, and year" multiline maxLength={1000}/>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <ApplicationField label="Organizations or Clubs" name="organizations" value={application.organizations} onChange={updateApplication} placeholder="List memberships, or write None" multiline maxLength={1000}/>
                <ApplicationField label="Volunteer or School Activity Experience" name="volunteer_experience" value={application.volunteer_experience} onChange={updateApplication} placeholder="Describe relevant activities, or write None" multiline maxLength={1000}/>
              </div>
            </div>
          </div>

          {/* Candidate essay questions */}
          <div style={{background:"#fff",borderRadius:16,border:"1px solid #e2e8f0",overflow:"hidden"}}>
            <div style={{background:"#1a2e1f",padding:"14px 20px",color:"#fff",fontSize:13,fontWeight:800,letterSpacing:".05em"}}>QUALIFICATIONS AND COMMITMENT</div>
            <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
              <ApplicationField label="Why do you want to become a School Representative?" name="why_representative" value={application.why_representative} onChange={updateApplication} multiline maxLength={2000}/>
              <ApplicationField label="What qualities make you a good candidate?" name="candidate_qualities" value={application.candidate_qualities} onChange={updateApplication} multiline maxLength={2000}/>
              <ApplicationField label="What plans or projects do you have for students?" name="student_plans" value={application.student_plans} onChange={updateApplication} multiline maxLength={2000}/>
              <ApplicationField label="How will you represent students’ concerns and interests?" name="represent_student_concerns" value={application.represent_student_concerns} onChange={updateApplication} multiline maxLength={2000}/>
              <ApplicationField label="How will you balance academics and leadership duties?" name="balance_responsibilities" value={application.balance_responsibilities} onChange={updateApplication} multiline maxLength={2000}/>
            </div>
          </div>

          {/* Campaign content card */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ background: "#1a2e1f", padding: "16px 20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Campaign Content
              </div>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Tagline */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>
                  Campaign Slogan <span style={{ color: "#be123c" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. To Build is to BITS"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  maxLength={120}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: "8px",
                    border: "1.5px solid #e2e8f0", fontSize: "14px", color: "#1e293b",
                    outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0d6b34"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                />
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", textAlign: "right" }}>
                  {tagline.length}/120
                </div>
              </div>
              {/* Bio */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>
                  Key Credentials / Bio <span style={{ color: "#94a3b8", fontWeight: 400, textTransform: "none" }}>(optional)</span>
                </label>
                <textarea
                  placeholder="List your achievements, experience, and reasons for running..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: "8px",
                    border: "1.5px solid #e2e8f0", fontSize: "14px", color: "#1e293b",
                    outline: "none", resize: "vertical", boxSizing: "border-box",
                    fontFamily: "inherit", lineHeight: 1.6,
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0d6b34"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right — photo + summary + submit ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Official grade evidence */}
          <div style={{background:"#fff",borderRadius:16,border:"1px solid #e2e8f0",overflow:"hidden"}}>
            <div style={{background:"#0d6b34",padding:"15px 18px",color:"#fff",fontSize:13,fontWeight:800}}>REGISTRATION FORM / OFFICIAL GRADE REPORT *</div>
            <div style={{padding:18}}>
              <p style={{margin:"0 0 12px",fontSize:12,color:"#64748b",lineHeight:1.55}}>Upload the school registration form or official grade report that shows your grades. Only administrators can open this private document. PDF, JPG, or PNG; maximum 10 MB.</p>
              <input type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required onChange={e=>{const f=e.target.files?.[0]??null;if(f&&f.size>10*1024*1024){setRegistrationFile(null);setError("The supporting document must be 10 MB or smaller.");e.currentTarget.value="";return;}if(f&&!(["application/pdf","image/jpeg","image/png"].includes(f.type))){setRegistrationFile(null);setError("Upload a PDF, JPG, or PNG document.");e.currentTarget.value="";return;}setError("");setRegistrationFile(f);}} style={{width:"100%",fontSize:12,color:"#334155"}} />
              {registrationFile&&<div style={{marginTop:8,fontSize:12,fontWeight:700,color:"#0d6b34"}}><i className="ti ti-file-check"/> {registrationFile.name}</div>}
            </div>
          </div>

          {/* Photo upload */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ background: "#0d6b34", padding: "16px 20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Candidate Photo
              </div>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
              {/* Preview */}
              <div style={{
                width: "120px", height: "120px", borderRadius: "50%",
                border: "3px solid #e2e8f0", overflow: "hidden",
                background: "#f8fafc", position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {photoPreview ? (
                  <Image src={photoPreview} alt="Preview" fill style={{ objectFit: "cover" }} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <i className="ti ti-user" style={{ fontSize: "32px", color: "#cbd5e1" }} />
                    <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>No photo</span>
                  </div>
                )}
              </div>

              <label style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "8px 18px", borderRadius: "8px",
                border: "1.5px solid #0d6b34", color: "#0d6b34",
                fontSize: "12px", fontWeight: 700, cursor: "pointer",
                transition: "all 0.15s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f0fdf4"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <i className="ti ti-upload" />
                {photoPreview ? "Change Photo" : "Upload Photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: "none" }}
                />
              </label>
              <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
                JPG, PNG or WEBP<br />Recommended: square, min 250×250px
              </p>
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: "#1a2e1f", borderRadius: "16px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Application Summary
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Name",     value: profile.full_name          },
                { label: "ID",       value: profile.student_id         },
                { label: "Position", value: selectedPosition?.name ?? "—" },
                { label: "Slogan",   value: tagline || "—"             },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "12px" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 600, flexShrink: 0 }}>{label}</span>
                  <span style={{ color: "#fff", fontWeight: 600, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Agreement + Submit */}
          <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <p style={{margin:"0 0 10px",fontSize:12,color:"#475569",lineHeight:1.55}}>I certify that my answers and uploaded document are true and correct. If selected, I will follow school policies and serve students honestly and fairly.</p>
            <ApplicationField label="Type your registered full name as your signature" name="declaration_signature" value={application.declaration_signature} onChange={updateApplication} placeholder={profile.full_name}/>
            <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>Declaration date: {new Date().toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}</div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
              <div
                onClick={() => setAgreed(!agreed)}
                style={{
                  width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0, marginTop: "1px",
                  border: `2px solid ${agreed ? "#0d6b34" : "#cbd5e1"}`,
                  background: agreed ? "#0d6b34" : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {agreed && <i className="ti ti-check" style={{ fontSize: "11px", color: "#fff" }} />}
              </div>
              <span style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
                I agree to this declaration and understand the responsibilities of the position.
              </span>
            </label>

            {error && (
              <div style={{ background: "#ffe4e6", color: "#be123c", borderRadius: "8px", padding: "10px 14px", fontSize: "13px" }}>
                {error}
              </div>
            )}

            <button
              disabled={loading || !agreed}
              onClick={handleSubmit}
              style={{
                width: "100%", padding: "13px", borderRadius: "10px", border: "none",
                background: agreed ? "#0d6b34" : "#e2e8f0",
                color: agreed ? "#fff" : "#94a3b8",
                fontFamily: "var(--font-oswald), sans-serif",
                fontSize: "16px", fontWeight: 700, letterSpacing: "0.06em",
                cursor: loading || !agreed ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1, transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (agreed && !loading) e.currentTarget.style.background = "#0a5229"; }}
              onMouseLeave={(e) => { if (agreed) e.currentTarget.style.background = "#0d6b34"; }}
            >
              {loading ? "Submitting…" : "SUBMIT APPLICATION"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
