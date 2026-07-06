export async function generateResumeApi(profileText, jobDescription) {
  const systemPrompt = `You are an expert resume writer and ATS optimization specialist. You will be given a candidate's master profile and a target job description. Select and rewrite the most relevant summary, skills, experience bullets, projects, education, and certifications to match the job description as closely as possible, using strong action verbs and quantified results where the profile supports it. Do not invent facts, employers, dates, or numbers not present in the profile. Keep bullets concise (one line each where possible).

IMPORTANT: For AI Automation Engineer, AI Systems Integration, AI Solutions Engineer, or similar hands-on technical roles, the candidate's personal projects are stronger evidence of real engineering ability than the employment history — they show independently built, production-style systems with real architecture and measurable impact. In these cases, select MORE projects (4-6) and give them equal or greater weight and space than the experience section; write each project bullet like a software engineering accomplishment (problem solved, architecture/tech stack, measurable business impact) rather than a feature list. For roles that are less technical, 2-3 projects is enough.

Return ONLY valid JSON, no markdown fences, no commentary, matching exactly this schema:
{
  "target_title": string,
  "full_name": string,
  "contact_line": string,
  "summary": string (2-3 sentences),
  "skills": [string] (10-14 most relevant items),
  "experience": [
    { "company": string, "location": string, "title": string, "dates": string, "bullets": [string] (3-5 most relevant bullets) }
  ],
  "projects": [
    { "name": string, "stack": string (short tech stack, e.g. "Next.js, OpenRouter, Supabase"), "dates": string, "bullets": [string] (2-3 bullets: problem/architecture, then measurable impact) }
  ] (2-6 most relevant projects depending on role, per the guidance above; omit only if truly not relevant),
  "education": [ { "degree": string, "school": string, "location": string, "dates": string, "details": [string] } ],
  "certifications": [string]
}
Include ALL THREE employers from the experience section (Chasm Opps, Bee Fearless Studios, Door of Faith), each with bullets re-weighted toward relevance to the job description — do not drop any employer, even if less relevant, just shorten and reframe its bullets. Prefer the quantified business-impact bullets (with specific numbers, percentages, or time savings) over generic ones when both are relevant.`;

  const userMsg = `MASTER PROFILE:\n${profileText}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nReturn the JSON now.`;

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, userMsg })
  });
  
  const textBody = await response.text();
  let data;
  try {
    data = JSON.parse(textBody);
  } catch (err) {
    throw new Error(`API Error (${response.status}): The server took too long to respond or returned invalid data.`);
  }

  if(data.error) throw new Error(data.error);

  const text = data.choices?.[0]?.message?.content || "";
  
  // Robust JSON extraction
  let jsonString = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
  } else {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if(start !== -1 && end !== -1 && end > start){
      jsonString = text.slice(start, end + 1);
    }
  }

  try {
    return JSON.parse(jsonString);
  } catch(parseErr) {
    console.error("JSON Parse Error on string:", jsonString);
    throw new Error("Failed to parse the AI response as JSON. Please try again.");
  }
}
