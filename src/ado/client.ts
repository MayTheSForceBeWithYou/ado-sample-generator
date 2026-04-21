import type { AppConfig } from '../models/config.js';

export interface WorkItemTypeResponse {
  value: Array<{ name: string }>;
}

export interface CreatedWorkItem {
  id: number;
  fields?: Record<string, unknown>;
}

interface WiqlResult {
  workItems: Array<{ id: number }>;
}

export interface AzureDevOpsClient {
  validateConnection(): Promise<void>;
  getWorkItemTypes(): Promise<string[]>;
  createWorkItem(type: string, patch: Array<Record<string, unknown>>): Promise<CreatedWorkItem>;
  addRelation(sourceId: number, rel: string, targetId: number, comment?: string): Promise<void>;
  addComment(workItemId: number, text: string): Promise<void>;
  queryWorkItemIdsByTag(tag: string): Promise<number[]>;
  deleteWorkItem(id: number): Promise<void>;
}

export class AzureDevOpsRestClient implements AzureDevOpsClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  public constructor(private readonly config: AppConfig, patToken: string) {
    this.baseUrl = `${config.organizationUrl}/${config.project}/_apis`;
    this.authHeader = `Basic ${Buffer.from(`:${patToken}`).toString('base64')}`;
  }

  public async validateConnection(): Promise<void> {
    await this.request('GET', `${this.config.organizationUrl}/_apis/projects/${encodeURIComponent(this.config.project)}?api-version=7.1`);
  }

  public async getWorkItemTypes(): Promise<string[]> {
    const body = await this.request<WorkItemTypeResponse>('GET', `${this.baseUrl}/wit/workitemtypes?api-version=7.1`);
    return body.value.map((entry) => entry.name);
  }

  public async createWorkItem(type: string, patch: Array<Record<string, unknown>>): Promise<CreatedWorkItem> {
    return this.request<CreatedWorkItem>('PATCH', `${this.baseUrl}/wit/workitems/$${encodeURIComponent(type)}?api-version=7.1`, patch, {
      'Content-Type': 'application/json-patch+json',
    });
  }

  public async addRelation(sourceId: number, rel: string, targetId: number, comment?: string): Promise<void> {
    const relationUrl = `${this.config.organizationUrl}/${this.config.project}/_apis/wit/workItems/${targetId}`;
    const value: Record<string, unknown> = { rel, url: relationUrl };
    if (comment) {
      value.attributes = { comment };
    }

    await this.request('PATCH', `${this.baseUrl}/wit/workitems/${sourceId}?api-version=7.1`, [{
      op: 'add',
      path: '/relations/-',
      value,
    }], {
      'Content-Type': 'application/json-patch+json',
    });
  }

  public async addComment(workItemId: number, text: string): Promise<void> {
    await this.request('POST', `${this.baseUrl}/wit/workItems/${workItemId}/comments?api-version=7.1-preview.4`, { text }, {
      'Content-Type': 'application/json',
    });
  }

  public async queryWorkItemIdsByTag(tag: string): Promise<number[]> {
    const escapedTag = tag.replace(/'/g, "''");
    const wiql = {
      query: `Select [System.Id] From WorkItems Where [System.TeamProject] = @project And [System.Tags] Contains '${escapedTag}'`,
    };
    const body = await this.request<WiqlResult>('POST', `${this.baseUrl}/wit/wiql?api-version=7.1`, wiql, {
      'Content-Type': 'application/json',
    });
    return body.workItems.map((item) => item.id);
  }

  public async deleteWorkItem(id: number): Promise<void> {
    await this.request('DELETE', `${this.baseUrl}/wit/workitems/${id}?api-version=7.1&destroy=true`);
  }

  private async request<T>(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
    const init: RequestInit = {
      method,
      headers: {
        Authorization: this.authHeader,
        ...headers,
      },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const response = await fetch(url, init);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Azure DevOps API error ${response.status}: ${text}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
