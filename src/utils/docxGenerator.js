import JSZip from 'jszip';

function escXml(s){
  return (s || "").toString()
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}

const PAGE_W = 12240;   // 8.5in
const PAGE_H = 18720;   // 13in
const MARGIN = 1080;    // 0.75in
const USABLE = PAGE_W - (MARGIN * 2); // 10080 twips = 7in

function rXml(text, {bold, italics, size} = {}){
  let props = `<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>`;
  if(bold) props += `<w:b/>`;
  if(italics) props += `<w:i/>`;
  props += `<w:sz w:val="${size||22}"/><w:szCs w:val="${size||22}"/></w:rPr>`;
  return `<w:r>${props}<w:t xml:space="preserve">${escXml(text)}</w:t></w:r>`;
}

function tabXml(){
  return `<w:r><w:tab/></w:r>`;
}

function paraXml(runsXml, {align, before, after, borderBottom, tabsRight, keepNext} = {}){
  let pPr = `<w:pPr>`;
  if(align) pPr += `<w:jc w:val="${align}"/>`;
  
  let spacingAttr = `w:line="276" w:lineRule="auto"`;
  if(before !== undefined) spacingAttr += ` w:before="${before}"`;
  if(after !== undefined) spacingAttr += ` w:after="${after}"`;
  pPr += `<w:spacing ${spacingAttr}/>`;
  
  if(borderBottom) pPr += `<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="000000"/></w:pBdr>`;
  if(tabsRight) pPr += `<w:tabs><w:tab w:val="right" w:pos="${USABLE}"/></w:tabs>`;
  if(keepNext) pPr += `<w:keepNext/>`;
  pPr += `</w:pPr>`;
  return `<w:p>${pPr}${runsXml}</w:p>`;
}

function sectionHeaderXml(title){
  return paraXml(rXml(title.toUpperCase(), {bold:true, size:21}), { before:240, after:120, borderBottom:true, keepNext:true });
}

function rowXml(leftText, rightText, opts={}){
  const left = rXml(leftText||"", { bold: opts.boldLeft, italics: opts.italicLeft, size:21 });
  const right = rXml(rightText||"", { bold: opts.boldRight, italics: opts.italicRight, size:21 });
  return paraXml(left + tabXml() + right, { after:20, tabsRight:true, keepNext: opts.keepNext });
}

function bulletXml(text){
  const pPr = `<w:pPr><w:spacing w:line="276" w:lineRule="auto" w:after="40"/><w:ind w:left="360" w:hanging="180"/></w:pPr>`;
  return `<w:p>${pPr}${rXml("•  " + (text||""), {size:20})}</w:p>`;
}

function plainXml(text, opts={}){
  return paraXml(rXml(text||"", { size:21, ...opts }), { after:120 });
}

function buildDocumentXml(r){
  let body = "";

  body += paraXml(rXml((r.full_name||"").toUpperCase(), {bold:true, size:32}), { align:"center", after:60 });
  body += paraXml(rXml(r.contact_line||"", {size:19}), { align:"center", after:240 });

  body += sectionHeaderXml("Professional Summary");
  body += plainXml(r.summary);

  body += sectionHeaderXml("Core Skills");
  body += plainXml((r.skills||[]).join("   |   "));

  body += sectionHeaderXml("Work Experience");
  (r.experience||[]).forEach(job => {
    body += rowXml(job.company, job.location||"", { boldLeft:true, keepNext:true });
    body += rowXml(job.title, job.dates||"", { italicLeft:true, italicRight:true, keepNext:true });
    (job.bullets||[]).forEach(b => body += bulletXml(b));
  });

  if(r.projects && r.projects.length){
    body += sectionHeaderXml("Selected Projects");
    r.projects.forEach(p => {
      body += rowXml(p.name, p.dates||"", { boldLeft:true, keepNext:true });
      if(p.stack) body += rowXml(p.stack, "", { italicLeft:true, keepNext:true });
      (p.bullets||[]).forEach(b => body += bulletXml(b));
    });
  }

  body += sectionHeaderXml("Education");
  (r.education||[]).forEach(e => {
    body += rowXml(e.degree, e.location||"", { boldLeft:true, keepNext:true });
    body += rowXml(e.school, e.dates||"", { italicLeft:true, italicRight:true, keepNext:true });
    (e.details||[]).forEach(d => body += bulletXml(d));
  });

  if(r.certifications && r.certifications.length){
    body += sectionHeaderXml("Certifications");
    body += plainXml(r.certifications.join("   |   "));
  }

  const sectPr = `<w:sectPr><w:pgSz w:w="${PAGE_W}" w:h="${PAGE_H}"/><w:pgMar w:top="${MARGIN}" w:right="${MARGIN}" w:bottom="${MARGIN}" w:left="${MARGIN}" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body}${sectPr}</w:body>
</w:document>`;
}

export async function downloadDocx(resumeData) {
  try {
    const r = resumeData;
    const documentXml = buildDocumentXml(r);
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
    
    const zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypesXml);
    zip.folder("_rels").file(".rels", rootRelsXml);
    zip.folder("word").file("document.xml", documentXml);
    
    const blob = await zip.generateAsync({type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
    const safeTitle = (r.target_title || "Resume").replace(/[^a-z0-9]+/gi, "_");
    const filename = `Renthel_Cueto_${safeTitle}.docx`;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch(err) {
    console.error("Couldn't build the .docx file:", err);
    throw new Error("Couldn't build the .docx file: " + (err.message || err));
  }
}
