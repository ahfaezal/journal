export const API_BASE_URL = "http://127.0.0.1:8000";

type StandardApiResponse<T> = {
  success: boolean;
  status: string;
  message: string;
  data: T;
};

export type HealthResponse = {
  status: string;
  service: string;
  version: string;
};

export type Project = {
  id: string;
  project_id?: string;
  human_readable_code?: string;
  name: string;
  title?: string;
  thesis_title?: string;
  thesis_type: string;
  research_type?: string;
  target_output?: string;
  target_template?: string;
  target_papers: number;
  progress: number;
  intelligence_score: number;
  status: string;
  primary_author?: string;
  institution?: string;
  last_activity?: string;
};

export type ProjectDetail = Project & {
  primary_author: string;
  institution: string;
  target_template: string;
  last_activity: string;
};

export type ProjectCreatePayload = {
  title: string;
  thesis_title?: string;
  research_type?: string;
  target_output?: string;
  target_template?: string;
  primary_author?: string;
  institution?: string;
  notes?: string;
};

export type IntelligenceSummary = {
  project_id: string;
  overall_score: number;
  citation_integrity: number;
  objective_alignment: number;
  methodology_consistency: number;
  reviewer_readiness: number;
  uploaded_chapters_count?: number;
  mfl_status?: string;
  headings_count?: number;
  paragraphs_count?: number;
  tables_count?: number;
  citations_count?: number;
  references_count?: number;
  objectives_count?: number;
  table_map?: Array<Record<string, string>>;
  citation_map?: {
    total_citations: number;
    mapped_citations: number;
    unmatched_citations: number;
    mfl_match_status: string;
  };
  objective_map?: Array<Record<string, string>>;
  audit_issues?: {
    unsupported_claims: number;
    citation_mismatch: number;
    terminology_inconsistency: number;
    objective_finding_gap: number;
  };
  audit: {
    unsupported_claims: number;
    citation_mismatch: number;
    terminology_inconsistency: number;
    objective_finding_gap: number;
  };
};

export type JournalSuggestedPaper = {
  paper_id: string;
  title: string;
  paper_type: string;
  thesis_scope: string;
  source_chapters: string[];
  objectives_used: string[];
  key_tables: string[];
  citation_readiness: string;
  audit_risk: string;
  novelty_angle: string;
  status: string;
};

export type JournalPhaseSeparation = {
  phase_id: string;
  phase_name: string;
  related_chapters: string[];
  recommended_paper: string;
};

export type JournalPlanner = {
  project_id: string;
  status: string;
  suggested_papers: JournalSuggestedPaper[];
  phase_separation: JournalPhaseSeparation[];
  overlap_warnings: string[];
  recommended_sequence: string[];
  planner_summary: {
    total_suggested_papers: number;
    citation_readiness: string;
    audit_risk: string;
    graph_health_score: number;
    primary_recommendation: string;
  };
};

export type UploadedThesisFile = {
  filename: string;
  file_type: string;
  chapter_label: string;
  size: number;
  status: string;
};

export type ParsedThesis = {
  project_id: string;
  status: string;
  project_files_parsed: number;
  chapters: Array<Record<string, string | number>>;
  headings: Array<Record<string, string | number>>;
  paragraphs: Array<Record<string, string | number>>;
  tables: Array<Record<string, unknown>>;
  citations: Array<Record<string, string | number>>;
  references: Array<Record<string, string | number>>;
  objectives: Array<Record<string, string | number>>;
  table_captions?: Array<Record<string, string | number>>;
};

export type CitationMapRow = {
  citation_text: string;
  detected_author: string;
  detected_year: string;
  source_file: string;
  source_section: string;
  mfl_status: string;
  issue: string;
};

export type CitationMap = {
  project_id: string;
  status: string;
  mfl_available: boolean;
  total_citations: number;
  unique_citations: number;
  matched_citations: number;
  unmatched_citations: number;
  duplicate_citations: number;
  citations: CitationMapRow[];
};

export type ObjectiveMapRow = {
  objective_id: string;
  objective_text: string;
  source_file: string;
  source_section: string;
  linked_findings: Array<Record<string, string>>;
  linked_discussion: Array<Record<string, string>>;
  alignment_status: string;
  issue: string;
  confidence_score: number;
};

export type ObjectiveMap = {
  project_id: string;
  status: string;
  total_objectives: number;
  mapped_objectives: number;
  unmapped_objectives: number;
  objectives: ObjectiveMapRow[];
};

export type TableMapRow = {
  table_id: string;
  table_number: string;
  table_title: string;
  source_file: string;
  source_section: string;
  source_chapter: string;
  detected_rows: number;
  detected_columns: number;
  suggested_paper_section: string;
  usage_status: string;
  issue: string;
  confidence_score: number;
};

export type TableMap = {
  project_id: string;
  status: string;
  total_tables: number;
  mapped_tables: number;
  unmapped_tables: number;
  findings_tables: number;
  tables: TableMapRow[];
};

export type ThesisAuditIssue = {
  issue_id: string;
  issue_type: string;
  severity: "low" | "medium" | "high";
  section: string;
  description: string;
  suggested_fix: string;
  related_source: string;
};

export type ThesisAudit = {
  project_id: string;
  status: string;
  audit_timestamp: string;
  overall_audit_score: number;
  citation_score: number;
  objective_alignment_score: number;
  table_mapping_score: number;
  methodology_consistency_score: number;
  reviewer_readiness_score: number;
  issues: ThesisAuditIssue[];
};

export type KnowledgeGraphNode = {
  id: string;
  label: string;
  type: "thesis" | "objective" | "methodology" | "findings" | "discussion" | "citation" | "table" | "reference" | "issue";
  status: string;
  score: number;
};

export type KnowledgeGraphEdge = {
  source: string;
  target: string;
  relationship: string;
  strength: number;
};

export type KnowledgeGraph = {
  project_id: string;
  status: string;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  summary: {
    total_nodes: number;
    total_edges: number;
    weak_links: number;
    strong_links: number;
    graph_health_score: number;
  };
};

export type PaperExtraction = {
  project_id: string;
  paper_id: string;
  paper_title: string;
  target_template: string;
  source_chapters: string[];
  extraction_map: Record<string, { source: string; note: string }>;
  extracted_content_preview: {
    key_claims: string[];
    supporting_citations: string[];
    tables_used: string[];
    excluded_content: string[];
  };
  quality_checks: Record<string, { status: string; detail: string }>;
  extraction_status: string;
};

export type SectionStructureItem = {
  section_name: string;
  purpose: string;
  suggested_subheadings: string[];
  source_chapters: string[];
  source_tables: string[];
  required_citations: string[];
  writing_notes: string[];
  audit_warnings: string[];
  estimated_word_count: number;
  readiness_status: string;
};

export type SectionStructure = {
  project_id: string;
  paper_id: string;
  paper_title: string;
  status: string;
  sections: SectionStructureItem[];
};

export type GeneratedSection = {
  paper_id: string;
  section_name: string;
  title: string;
  generated_text: string;
  source_context_used: string[];
  citations_used: string[];
  tables_used: string[];
  audit_warnings: string[];
  word_count: number;
  status: "drafted" | "locked";
  version: string;
  generated_at: string;
  locked_at?: string;
  ai_model?: string;
  ai_enabled?: boolean;
  prompt_version?: string;
  generation_mode?: string;
};

export type FullPaper = {
  paper_id: string;
  title: string;
  integrated_text: string;
  sections_included: Array<{
    section_name: string;
    status: string;
    version: string;
    word_count: number;
  }>;
  locked_sections_count: number;
  drafted_sections_count: number;
  missing_sections: string[];
  total_word_count: number;
  citation_count: number;
  integration_warnings: string[];
  continuity_notes: string[];
  status: string;
  generated_at: string;
};

export type ReferenceBankReference = {
  citation_text: string;
  apa_reference: string;
  mfl_status: string;
  issue: string;
  source_section: string;
};

export type ReferenceBank = {
  paper_id: string;
  title: string;
  total_in_text_citations: number;
  matched_references: number;
  unmatched_references: number;
  duplicate_references: number;
  apa_issues: number;
  references: ReferenceBankReference[];
  citation_guard: {
    fake_citation_risk: string;
    unsupported_claim_risk: string;
    mfl_dependency: string;
    notes: string[];
  };
};

export type FormattingReport = {
  paper_id: string;
  template_used: string;
  docx_path: string;
  sections_formatted: string[];
  reference_list_included: boolean;
  total_word_count: number;
  formatting_audit: {
    heading_consistency: string;
    citation_style: string;
    reference_list: string;
    table_numbering: string;
    figure_numbering: string;
    margin_font_compliance: string;
  };
  status: string;
  generated_at: string;
};

export type SubmissionStatus = {
  paper_id: string;
  submission_readiness_percentage: number;
  readiness_cards: Array<{
    label: string;
    value: string;
    status: string;
  }>;
  final_files: Array<{
    name: string;
    status: string;
    path: string;
    action: string;
  }>;
  checklist: Array<{
    label: string;
    status: boolean;
  }>;
  export_urls: {
    docx: string;
    markdown: string;
  };
  missing_items: string[];
  warnings: string[];
  regeneration_status?: {
    state: string;
    last_regenerated_at: string;
    last_revision_timestamp: string;
    triggered_by_revision: string;
  };
  status: string;
};

export type WorkflowRunSummary = {
  project_id: string;
  paper_id: string;
  pipeline_status: string;
  steps_completed: Array<{
    step: string;
    status: string;
  }>;
  completed_count: number;
  failed_step: string | null;
  error_message: string;
  generated_files_summary: Array<{
    label: string;
    path: string;
    exists: boolean;
    size: number;
  }>;
  final_download_urls: {
    docx: string;
    markdown: string;
  };
  generated_at: string;
};

export type ArtifactRegistryItem = {
  artifact_id: string;
  artifact_type: string;
  paper_id: string;
  section_name: string;
  file_path: string;
  file_format: string;
  version: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ArtifactRegistry = {
  project_id: string;
  total_artifacts: number;
  grouped_artifacts: Record<string, ArtifactRegistryItem[]>;
  latest_artifacts: Record<string, ArtifactRegistryItem>;
  counts_by_type: Record<string, number>;
  latest_docx: ArtifactRegistryItem | null;
  latest_markdown: ArtifactRegistryItem | null;
  latest_audit: ArtifactRegistryItem | null;
};

export type ReviewerPersona = {
  name: string;
  decision_tendency: string;
  major_comments: string;
  minor_comments: string;
  recommendation: string;
};

export type ReviewerSuggestion = {
  priority: string;
  suggestion: string;
  target_section: string;
};

export type ReviewerReport = {
  project_id: string;
  paper_id: string;
  overall_recommendation: string;
  acceptance_probability: number;
  major_issues: string[];
  minor_issues: string[];
  methodological_concerns: string[];
  novelty_concerns: string[];
  citation_concerns: string[];
  writing_quality_concerns: string[];
  revision_suggestions: ReviewerSuggestion[];
  reviewer_personas: ReviewerPersona[];
  ai_enabled: boolean;
  ai_model: string;
  review_mode: string;
  review_version: string;
  generated_at: string;
  status?: string;
};

export type RevisionItem = {
  revision_id: string;
  linked_issue: string;
  affected_section: string;
  revision_rationale: string;
  suggested_revision: string;
  improved_paragraph: string;
  before_text: string;
  after_text: string;
  comparison_summary: string;
  priority: string;
  apply_status: string;
};

export type RevisionReport = {
  project_id: string;
  paper_id: string;
  revisions: RevisionItem[];
  total_revisions: number;
  ai_enabled: boolean;
  ai_model: string;
  revision_mode: string;
  revision_version: string;
  generated_at: string;
  status?: string;
};

export type AppliedRevision = {
  project_id: string;
  paper_id: string;
  revision_id: string;
  linked_reviewer_issue: string;
  affected_section: string;
  before_version: string;
  revised_version: string;
  before_path: string;
  revised_path: string;
  current_section_path: string;
  revision_timestamp: string;
  applied_by: string;
  ai_enabled: boolean;
  ai_model: string;
  apply_mode: string;
  status: string;
  version: string;
};

export type AppliedRevisionResponse = {
  applied_revision: AppliedRevision;
  revised_section: GeneratedSection;
};

export type AppliedRevisionsList = {
  project_id: string;
  paper_id: string;
  applied_revisions: AppliedRevision[];
  total_applied: number;
  status: string;
};

export type AutoRegenerationSummary = {
  project_id: string;
  paper_id: string;
  regenerated_at: string;
  triggered_by_revision: string;
  updated_outputs: Array<{
    label: string;
    path: string;
    exists: boolean;
    size: number;
  }>;
  reviewer_readiness_metadata: {
    overall_recommendation: string;
    acceptance_probability: number;
    ai_enabled: boolean;
    review_mode: string;
  };
  submission_metadata: {
    readiness_percentage: number;
    status: string;
  };
  regeneration_version: string;
  status: string;
};

export type WorkflowActivity = {
  activity_id: string;
  project_id: string;
  paper_id: string;
  activity_type: string;
  activity_title: string;
  activity_description: string;
  source_module: string;
  status: string;
  created_at: string;
};

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<T>(response);
}

async function mutation<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<T>(response);
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | StandardApiResponse<T>;
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    const standardPayload = payload as StandardApiResponse<T>;
    if (!standardPayload.success) {
      throw new Error(standardPayload.message || "API request failed");
    }

    return standardPayload.data;
  }

  return payload as T;
}

async function readApiError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as StandardApiResponse<{ detail?: string }> | { detail?: string };
    if ("message" in payload && payload.message) {
      return payload.message;
    }
    if ("detail" in payload && payload.detail) {
      return payload.detail;
    }
    if ("data" in payload && payload.data?.detail) {
      return payload.data.detail;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function getHealth() {
  return request<HealthResponse>("/health");
}

export async function getProjects() {
  const data = await request<{ projects: Project[] }>("/projects");
  return data.projects;
}

export async function getProject(projectId: string) {
  const data = await request<{ project: ProjectDetail }>(`/projects/${projectId}`);
  return data.project;
}

export async function createProject(payload: ProjectCreatePayload) {
  const data = await mutation<{ project: ProjectDetail }>("/projects", "POST", payload);
  return data.project;
}

export async function updateProject(projectId: string, payload: Partial<ProjectCreatePayload>) {
  const data = await mutation<{ project: ProjectDetail }>(
    `/projects/${projectId}`,
    "PATCH",
    payload,
  );
  return data.project;
}

export async function deleteProject(projectId: string) {
  return mutation<{ project_id: string; deleted: boolean }>(`/projects/${projectId}`, "DELETE");
}

export function getIntelligence(projectId: string) {
  return request<IntelligenceSummary>(`/intelligence/${projectId}`);
}

export async function parseThesis(projectId: string) {
  const response = await fetch(`${API_BASE_URL}/parser/${projectId}/parse`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Parse thesis failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<ParsedThesis>(response);
}

export function getParsedThesis(projectId: string) {
  return request<ParsedThesis>(`/parser/${projectId}`);
}

export async function buildCitationMap(projectId: string) {
  const response = await fetch(`${API_BASE_URL}/citation/${projectId}/map`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Build citation map failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<CitationMap>(response);
}

export function getCitationMap(projectId: string) {
  return request<CitationMap>(`/citation/${projectId}`);
}

export async function buildObjectiveMap(projectId: string) {
  const response = await fetch(`${API_BASE_URL}/objective/${projectId}/map`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Build objective map failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<ObjectiveMap>(response);
}

export function getObjectiveMap(projectId: string) {
  return request<ObjectiveMap>(`/objective/${projectId}`);
}

export async function buildTableMap(projectId: string) {
  const response = await fetch(`${API_BASE_URL}/table/${projectId}/map`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Build table map failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<TableMap>(response);
}

export function getTableMap(projectId: string) {
  return request<TableMap>(`/table/${projectId}`);
}

export async function runThesisAudit(projectId: string) {
  const response = await fetch(`${API_BASE_URL}/audit/${projectId}/run`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Run thesis audit failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<ThesisAudit>(response);
}

export function getThesisAudit(projectId: string) {
  return request<ThesisAudit>(`/audit/${projectId}`);
}

export async function buildKnowledgeGraph(projectId: string) {
  const response = await fetch(`${API_BASE_URL}/knowledge-graph/${projectId}/build`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Build knowledge graph failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<KnowledgeGraph>(response);
}

export function getKnowledgeGraph(projectId: string) {
  return request<KnowledgeGraph>(`/knowledge-graph/${projectId}`);
}

export async function buildThesisIntelligence(projectId: string) {
  const response = await fetch(`${API_BASE_URL}/intelligence/${projectId}/build`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Build intelligence failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<IntelligenceSummary>(response);
}

export function getJournalPlanner(projectId: string) {
  return request<JournalPlanner>(`/journal/${projectId}/planner`);
}

export async function buildJournalPlanner(projectId: string) {
  const response = await fetch(`${API_BASE_URL}/journal/${projectId}/planner/build`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Build journal planner failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<JournalPlanner>(response);
}

export async function buildPaperExtraction(projectId: string, paperId: string) {
  const response = await fetch(
    `${API_BASE_URL}/journal/${projectId}/paper-extraction/${paperId}/build`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Build paper extraction failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<PaperExtraction>(response);
}

export function getPaperExtraction(projectId: string, paperId: string) {
  return request<PaperExtraction>(`/journal/${projectId}/paper-extraction/${paperId}`);
}

export async function buildSectionStructure(projectId: string, paperId: string) {
  const response = await fetch(
    `${API_BASE_URL}/journal/${projectId}/section-structure/${paperId}/build`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const message = await readApiError(
      response,
      `Build section structure failed: ${response.status} ${response.statusText}`,
    );
    console.error("Build section structure API request failed", {
      projectId,
      paperId,
      status: response.status,
      message,
    });
    throw new Error(message);
  }

  return parseApiResponse<SectionStructure>(response);
}

export function getSectionStructure(projectId: string, paperId: string) {
  return request<SectionStructure>(`/journal/${projectId}/section-structure/${paperId}`);
}

export async function generateSection(projectId: string, paperId: string, sectionName: string) {
  const response = await fetch(
    `${API_BASE_URL}/journal/${projectId}/section-writer/${paperId}/${encodeURIComponent(sectionName)}/generate`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Generate section failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<GeneratedSection>(response);
}

export async function getGeneratedSections(projectId: string, paperId: string) {
  const data = await request<{ project_id: string; paper_id: string; sections: GeneratedSection[] }>(
    `/journal/${projectId}/section-writer/${paperId}`,
  );

  return data.sections;
}

export function getGeneratedSection(projectId: string, paperId: string, sectionName: string) {
  return request<GeneratedSection>(
    `/journal/${projectId}/section-writer/${paperId}/${encodeURIComponent(sectionName)}`,
  );
}

export async function lockSection(projectId: string, paperId: string, sectionName: string) {
  const response = await fetch(
    `${API_BASE_URL}/journal/${projectId}/section-writer/${paperId}/${encodeURIComponent(sectionName)}/lock`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Lock section failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<GeneratedSection>(response);
}

export async function integrateFullPaper(projectId: string, paperId: string) {
  const response = await fetch(
    `${API_BASE_URL}/journal/${projectId}/full-paper/${paperId}/integrate`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Integrate full paper failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<FullPaper>(response);
}

export function getFullPaper(projectId: string, paperId: string) {
  return request<FullPaper>(`/journal/${projectId}/full-paper/${paperId}`);
}

export async function buildReferences(projectId: string, paperId: string) {
  const response = await fetch(
    `${API_BASE_URL}/journal/${projectId}/references/${paperId}/build`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Build references failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<ReferenceBank>(response);
}

export function getReferences(projectId: string, paperId: string) {
  return request<ReferenceBank>(`/journal/${projectId}/references/${paperId}`);
}

export async function generateFormattedDocx(projectId: string, paperId: string) {
  const response = await fetch(
    `${API_BASE_URL}/journal/${projectId}/formatting/${paperId}/generate-docx`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Generate formatted DOCX failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<FormattingReport>(response);
}

export function getFormattingReport(projectId: string, paperId: string) {
  return request<FormattingReport>(`/journal/${projectId}/formatting/${paperId}`);
}

export function getFormattedDocxDownloadUrl(projectId: string, paperId: string) {
  return `${API_BASE_URL}/journal/${projectId}/formatting/${paperId}/download-docx`;
}

export function getFullPaperMarkdownDownloadUrl(projectId: string, paperId: string) {
  return `${API_BASE_URL}/journal/${projectId}/full-paper/${paperId}/download-md`;
}

export function getSubmissionStatus(projectId: string, paperId: string) {
  return request<SubmissionStatus>(`/journal/${projectId}/submission/${paperId}`);
}

export async function runFullPipeline(projectId: string) {
  const response = await fetch(`${API_BASE_URL}/workflow/${projectId}/run-full-pipeline`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Run full pipeline failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<WorkflowRunSummary>(response);
}

export function getWorkflowStatus(projectId: string) {
  return request<WorkflowRunSummary>(`/workflow/${projectId}/status`);
}

export async function autoRegeneratePaper(projectId: string, paperId: string) {
  const response = await fetch(`${API_BASE_URL}/workflow/${projectId}/${paperId}/auto-regenerate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Auto regeneration failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<AutoRegenerationSummary>(response);
}

export function getArtifacts(projectId: string) {
  return request<ArtifactRegistry>(`/artifacts/${projectId}`);
}

export async function getProjectActivities(projectId: string) {
  const data = await request<{ project_id: string; activities: WorkflowActivity[]; total: number }>(
    `/activity/${projectId}`,
  );

  return data.activities;
}

export async function getPaperActivities(projectId: string, paperId: string) {
  const data = await request<{
    project_id: string;
    paper_id: string;
    activities: WorkflowActivity[];
    total: number;
  }>(`/activity/${projectId}/${paperId}`);

  return data.activities;
}

export async function runReviewerSimulation(projectId: string, paperId: string) {
  const response = await fetch(`${API_BASE_URL}/reviewer/${projectId}/${paperId}/run`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Run reviewer simulation failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<ReviewerReport>(response);
}

export function getReviewerReport(projectId: string, paperId: string) {
  return request<ReviewerReport>(`/reviewer/${projectId}/${paperId}`);
}

export async function generateRevisionReport(projectId: string, paperId: string) {
  const response = await fetch(`${API_BASE_URL}/revision/${projectId}/${paperId}/generate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Generate revision report failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<RevisionReport>(response);
}

export function getRevisionReport(projectId: string, paperId: string) {
  return request<RevisionReport>(`/revision/${projectId}/${paperId}`);
}

export async function applyRevision(projectId: string, paperId: string, revisionId: string) {
  const response = await fetch(`${API_BASE_URL}/revision/${projectId}/${paperId}/apply/${revisionId}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Apply revision failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<AppliedRevisionResponse>(response);
}

export function getAppliedRevisions(projectId: string, paperId: string) {
  return request<AppliedRevisionsList>(`/revision/${projectId}/${paperId}/applied`);
}

export async function uploadThesisFile(
  projectId: string,
  file: File,
  fileType: string,
  chapterLabel: string,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file_type", fileType);
  formData.append("chapter_label", chapterLabel);

  const response = await fetch(`${API_BASE_URL}/upload/thesis/${projectId}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  return parseApiResponse<UploadedThesisFile & { project_id: string }>(response);
}

export async function getUploadedFiles(projectId: string) {
  const data = await request<{ project_id: string; files: UploadedThesisFile[] }>(
    `/upload/thesis/${projectId}/files`,
  );

  return data.files;
}
