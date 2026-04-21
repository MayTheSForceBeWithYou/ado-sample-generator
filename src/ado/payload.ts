import type { WorkItemDraft, WorkItemRelationDraft } from '../models/generator.js';

export const buildCreatePatch = (draft: WorkItemDraft): Array<Record<string, unknown>> => {
  const tagValue = draft.tags.join('; ');
  return [
    { op: 'add', path: '/fields/System.Title', value: draft.title },
    { op: 'add', path: '/fields/System.Description', value: draft.description },
    { op: 'add', path: '/fields/System.State', value: draft.state },
    ...(tagValue ? [{ op: 'add', path: '/fields/System.Tags', value: tagValue }] : []),
  ];
};

export const toAdoRelationType = (relation: WorkItemRelationDraft): string => {
  if (relation.relationType === 'parent') {
    return 'System.LinkTypes.Hierarchy-Reverse';
  }
  return 'System.LinkTypes.Related';
};
