export type KnowledgeBaseSource = {
  id: string;
  title: string;
  url?: string;
  snippet: string;
  similarity?: number;
  relevancy?: number;
  metadata?: Record<string, unknown>;
};

export type KnowledgeBaseContext = {
  content: string;
  sources: KnowledgeBaseSource[];
};

export type KnowledgeBaseRequest = {
  query: string;
  topK?: number;
  filter?: Record<string, unknown>;
};

export type KnowledgeBaseResponse = KnowledgeBaseContext & {
  retrievedAt: string;
};

export type KnowledgeBaseMetadata = {
  routedAgent?: string;
  sanitizationApplied?: boolean;
};

