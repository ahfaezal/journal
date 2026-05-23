export const FALLBACK_PROJECT_ID = "PROJECT_001";

export function getInitialActiveProjectId() {
  if (typeof window === "undefined") {
    return FALLBACK_PROJECT_ID;
  }

  const params = new URLSearchParams(window.location.search);
  const queryProjectId = params.get("project_id")?.trim();
  const storedProjectId = localStorage.getItem("activeProjectId")?.trim();
  return queryProjectId || storedProjectId || FALLBACK_PROJECT_ID;
}

export function getInitialActiveProjectTitle() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("activeProjectTitle")?.trim() || "";
}

export function persistActiveProject(projectId: string, projectTitle?: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("activeProjectId", projectId);
  if (projectTitle) {
    localStorage.setItem("activeProjectTitle", projectTitle);
  }
}

export function withProjectQuery(path: string, projectId: string) {
  return `${path}?project_id=${encodeURIComponent(projectId)}`;
}
