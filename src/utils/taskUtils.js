export const normalizeModuleId = (rawModuleId) => {
  if (rawModuleId === null || rawModuleId === undefined) {
    return null;
  }
  if (typeof rawModuleId !== 'string') {
    return rawModuleId;
  }
  const trimmed = rawModuleId.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const lowered = trimmed.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') {
    return null;
  }
  return trimmed;
};

export const isUnassignedModule = (moduleId) => normalizeModuleId(moduleId) === null;

export const resolveModuleId = (moduleId, modules = []) => {
  const normalized = normalizeModuleId(moduleId);
  if (normalized === null) {
    return null;
  }
  for (const item of modules) {
    const candidateId = normalizeModuleId(item?.id);
    if (candidateId && candidateId === normalized) {
      return item.id;
    }
  }
  return normalized;
};
