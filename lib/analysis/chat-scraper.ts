const USER_PATTERNS = [
  /^(user|you|human|me|developer|customer)\s*[:\-]/i,
  /^\*?\*?\s*(user|you|human|me|developer|customer)\s*\*?\*?\s*[:\-]/i,
  /^q\d*\s*[:\-]/i,
  /^question\s*[:\-]/i,
];

const ASSISTANT_PATTERNS = [
  /^(assistant|ai|bot|system|mentor|coach)\s*[:\-]/i,
  /^\*?\*?\s*(assistant|ai|bot|system|mentor|coach)\s*\*?\*?\s*[:\-]/i,
  /^a\d*\s*[:\-]/i,
  /^answer\s*[:\-]/i,
];

const QUESTION_STARTERS = [
  'how',
  'what',
  'why',
  'when',
  'where',
  'who',
  'which',
  'can',
  'could',
  'would',
  'should',
  'do',
  'does',
  'did',
  'is',
  'are',
  'will',
  'am',
  'may',
  'might',
];

export type ScrapedSpeaker = 'user' | 'assistant' | 'system' | 'unknown';

export interface ChatTurn {
  speaker: ScrapedSpeaker;
  content: string;
}

export interface ScrapedQuestion {
  text: string;
  type: 'open-ended' | 'clarifying' | 'closed' | 'request';
  length: number;
}

export interface ChatScrapeResult {
  turns: ChatTurn[];
  userQuestions: ScrapedQuestion[];
  assistantMessages: string[];
  metadata: {
    totalTurns: number;
    questionCount: number;
    averageQuestionLength: number;
  };
}

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const QUESTION_WORDS = new Set(QUESTION_STARTERS);

const isLikelyQuestion = (input: string) => {
  const text = normalizeWhitespace(input).toLowerCase();
  if (!text) return false;
  if (text.includes('?')) return true;
  if (QUESTION_WORDS.has(text.split(' ')[0])) return true;
  if (/^(could|would|should|can|may|might)\b/.test(text)) return true;
  if (/\bplease\b.*\b(help|explain|show)\b/.test(text)) return true;
  return false;
};

const stripMarkdownArtifacts = (line: string) => {
  let normalized = line.trim();
  normalized = normalized.replace(/^[-*>\d\.()\s]+/, '');
  normalized = normalized.replace(/^#+\s*/, '');
  normalized = normalized.replace(/^\*{1,2}(.+?)\*{1,2}$/u, '$1');
  normalized = normalized.replace(/^_{1,2}(.+?)_{1,2}$/u, '$1');
  normalized = normalized.replace(/^>\s*/, '');
  return normalized.trim();
};

const detectSpeakerFromLine = (line: string): ScrapedSpeaker => {
  const normalized = stripMarkdownArtifacts(line);

  if (USER_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return 'user';
  }
  if (ASSISTANT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return 'assistant';
  }
  if (/^(system|note|context)\s*[:\-]/i.test(normalized)) {
    return 'system';
  }
  return 'unknown';
};

const stripSpeakerPrefix = (line: string) =>
  stripMarkdownArtifacts(
    line.replace(
      /^(user|you|human|me|developer|customer|assistant|ai|bot|system|mentor|coach|q\d*|a\d*|question|answer)\s*[:\-].?/i,
      ''
    )
  ).trim();

const classifyQuestion = (question: string): ScrapedQuestion['type'] => {
  const normalized = question.toLowerCase().trim();

  if (normalized.length === 0) {
    return 'request';
  }

  if (/should|could|would|can you|please/i.test(normalized)) {
    return 'clarifying';
  }

  if (/^do |^does |^did |^is |^are |^will |^can |^should/.test(normalized)) {
    return 'closed';
  }

  const startsWithKeyword = QUESTION_STARTERS.some((starter) =>
    normalized.startsWith(`${starter} `)
  );

  if (startsWithKeyword) {
    return 'open-ended';
  }

  return 'request';
};

const splitIntoSentences = (text: string) =>
  text
    .split(/(?<=[?.!])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

const extractQuestionsFromContent = (content: string): ScrapedQuestion[] => {
  const sentences = splitIntoSentences(content);

  const questions: ScrapedQuestion[] = [];
  
  sentences.forEach((sentence) => {
    const normalized = normalizeWhitespace(sentence);

    if (isLikelyQuestion(normalized)) {
      questions.push({
        text: normalized,
        type: classifyQuestion(sentence),
        length: normalized.split(' ').length,
      });
    }
  });

  return questions;
};

const shouldStartNewTurn = (line: string, currentSpeaker: ScrapedSpeaker) => {
  if (!line) return false;

  const detected = detectSpeakerFromLine(line);
  if (detected !== 'unknown' && detected !== currentSpeaker) {
    return true;
  }

  if (currentSpeaker === 'unknown') {
    if (isLikelyQuestion(line)) {
      return true;
    }
  }

  return false;
};

export const scrapeChatTranscript = (rawText: string): ChatScrapeResult => {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');
  const turns: ChatTurn[] = [];

  let currentSpeaker: ScrapedSpeaker = 'unknown';
  let buffer: string[] = [];
  let insideCodeBlock = false;

  const flushBuffer = () => {
    if (buffer.length === 0) {
      return;
    }

    const combined = normalizeWhitespace(buffer.join(' ').trim());
    if (!combined) {
      buffer = [];
      return;
    }

    const speaker = currentSpeaker === 'unknown' && combined.endsWith('?') ? 'user' : currentSpeaker;
    turns.push({
      speaker,
      content: combined,
    });

    buffer = [];
  };

  lines.forEach((line) => {
    const rawTrimmed = line.trim();

    if (rawTrimmed.startsWith('```')) {
      insideCodeBlock = !insideCodeBlock;
      return;
    }

    if (insideCodeBlock) {
      return;
    }

    const trimmed = stripMarkdownArtifacts(line);

    if (!trimmed) {
      if (buffer.length > 0) {
        buffer.push('');
      }
      return;
    }

    if (shouldStartNewTurn(trimmed, currentSpeaker)) {
      flushBuffer();
      currentSpeaker = detectSpeakerFromLine(trimmed) || 'unknown';
    }

    const detectedSpeaker = detectSpeakerFromLine(trimmed);
    if (detectedSpeaker !== 'unknown' && detectedSpeaker !== currentSpeaker) {
      flushBuffer();
      currentSpeaker = detectedSpeaker;
    }

    const content = stripSpeakerPrefix(trimmed);

    if (!content) {
      return;
    }

    if (currentSpeaker === 'unknown' && isLikelyQuestion(content)) {
      flushBuffer();
      currentSpeaker = 'user';
    }

    buffer.push(content);
  });

  flushBuffer();

  const userQuestions: ScrapedQuestion[] = [];
  const assistantMessages: string[] = [];

  turns.forEach((turn) => {
    if (turn.speaker === 'user') {
      const questions = extractQuestionsFromContent(turn.content);
      if (questions.length > 0) {
        userQuestions.push(...questions);
      }
    }

    if (turn.speaker === 'assistant') {
      assistantMessages.push(turn.content);
    }
  });

  const totalQuestionLength = userQuestions.reduce((sum, q) => sum + q.length, 0);

  return {
    turns,
    userQuestions,
    assistantMessages,
    metadata: {
      totalTurns: turns.length,
      questionCount: userQuestions.length,
      averageQuestionLength: userQuestions.length
        ? Math.round(totalQuestionLength / userQuestions.length)
        : 0,
    },
  };
};
