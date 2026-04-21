import { describe, expect, it } from 'vitest';
import { buildCreatePatch, toAdoRelationType } from '../src/ado/payload.js';

describe('payload mapping', () => {
  it('maps internal model to ADO create patch', () => {
    const patch = buildCreatePatch({
      logicalId: 'x',
      type: 'Task',
      title: 'Title',
      description: 'Description',
      state: 'New',
      tags: ['A', 'B'],
      comments: [],
    });

    expect(patch).toContainEqual({ op: 'add', path: '/fields/System.Title', value: 'Title' });
    expect(patch).toContainEqual({ op: 'add', path: '/fields/System.Tags', value: 'A; B' });
  });

  it('maps relation types', () => {
    expect(toAdoRelationType({ sourceLogicalId: '1', targetLogicalId: '2', relationType: 'parent' })).toBe('System.LinkTypes.Hierarchy-Reverse');
    expect(toAdoRelationType({ sourceLogicalId: '1', targetLogicalId: '2', relationType: 'related' })).toBe('System.LinkTypes.Related');
  });
});
