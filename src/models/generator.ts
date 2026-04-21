export interface WorkItemDraft {
  logicalId: string;
  type: string;
  title: string;
  description: string;
  state: string;
  tags: string[];
  comments: string[];
  parentLogicalId?: string;
}

export interface WorkItemRelationDraft {
  sourceLogicalId: string;
  targetLogicalId: string;
  relationType: 'parent' | 'related';
}

export interface GeneratedDataset {
  items: WorkItemDraft[];
  relations: WorkItemRelationDraft[];
  skippedTypes: string[];
}

export interface GenerationContext {
  availableTypes: string[];
  markerTag: string;
}
