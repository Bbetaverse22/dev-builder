/**
 * Sanitizer Agent - Client-side secret detection and sanitization
 * Purpose: Strip/mask secrets before any processing or network call
 */

export interface SecretMatch {
  type: string;
  pattern: string;
  match: string;
  startIndex: number;
  endIndex: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface SanitizationResult {
  originalText: string;
  sanitizedText: string;
  secretsFound: SecretMatch[];
  sanitizationLog: string[];
  isSanitized: boolean;
}

export interface SanitizationConfig {
  enableMasking: boolean;
  enableStripping: boolean;
  enableHashing: boolean;
  maskCharacter: string;
  showWarnings: boolean;
  strictMode: boolean;
  allowGitHubUrls: boolean;
  allowedDomains: string[];
}

// Default configuration
const DEFAULT_CONFIG: SanitizationConfig = {
  enableMasking: true,
  enableStripping: false,
  enableHashing: false,
  maskCharacter: '*',
  showWarnings: true,
  strictMode: true,
  allowGitHubUrls: true,
  allowedDomains: ['github.com', 'gitlab.com', 'bitbucket.org'],
};

// Secret detection patterns
const SECRET_PATTERNS = [
  // API Keys
  {
    type: 'api_key',
    pattern: /(sk|pk|ak|rk)_[a-zA-Z0-9]{20,}/gi,
    severity: 'critical' as const,
    description: 'API Key detected',
  },
  {
    type: 'openai_key',
    pattern: /sk-[a-zA-Z0-9]{48}/gi,
    severity: 'critical' as const,
    description: 'OpenAI API Key detected',
  },
  {
    type: 'github_token',
    pattern: /ghp_[a-zA-Z0-9]{36}/gi,
    severity: 'critical' as const,
    description: 'GitHub Personal Access Token detected',
  },
  
  // Passwords
  {
    type: 'password',
    pattern: /(password|pwd|pass)\s*[:=]\s*["']?[^"'\s]{8,}["']?/gi,
    severity: 'high' as const,
    description: 'Password detected',
  },
  
  // JWT Tokens
  {
    type: 'jwt_token',
    pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi,
    severity: 'high' as const,
    description: 'JWT Token detected',
  },
  
  // Database URLs
  {
    type: 'database_url',
    pattern: /(mongodb|postgres|mysql|redis):\/\/[^:]+:[^@]+@[^\/]+\/[^\s]+/gi,
    severity: 'critical' as const,
    description: 'Database connection string with credentials detected',
  },
  
  // Credit Cards
  {
    type: 'credit_card',
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/gi,
    severity: 'high' as const,
    description: 'Credit card number detected',
  },
  
  // SSN
  {
    type: 'ssn',
    pattern: /\b\d{3}-?\d{2}-?\d{4}\b/gi,
    severity: 'high' as const,
    description: 'Social Security Number detected',
  },
  
  // Email addresses
  {
    type: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
    severity: 'medium' as const,
    description: 'Email address detected',
  },
  
  // Phone numbers
  {
    type: 'phone',
    pattern: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/gi,
    severity: 'medium' as const,
    description: 'Phone number detected',
  },
  
  // IP addresses
  {
    type: 'ip_address',
    pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/gi,
    severity: 'low' as const,
    description: 'IP address detected',
  },
  
  // File paths (but not URLs)
  {
    type: 'file_path',
    pattern: /(?:[C-Z]:\\[^\\]+\\[^\\]+|\/[^\/]+\/[^\/]+)(?![^\s]*\.(com|org|net|io|dev))/gi,
    severity: 'low' as const,
    description: 'File path detected',
  },
  
  // AWS Access Keys
  {
    type: 'aws_access_key',
    pattern: /AKIA[0-9A-Z]{16}/gi,
    severity: 'critical' as const,
    description: 'AWS Access Key detected',
  },
  
  // Private Keys
  {
    type: 'private_key',
    pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
    severity: 'critical' as const,
    description: 'Private key detected',
  },
];

export class SanitizerAgent {
  private config: SanitizationConfig;
  private patterns: typeof SECRET_PATTERNS;

  constructor(config: Partial<SanitizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.patterns = SECRET_PATTERNS;
  }

  /**
   * Check if a URL is safe (whitelisted domains)
   */
  private isSafeUrl(text: string, startIndex: number, endIndex: number): boolean {
    if (!this.config.allowGitHubUrls) return false;
    
    // Extract the URL from the text
    const url = text.slice(startIndex, endIndex);
    
    // Check if it's a GitHub URL or other allowed domains
    return this.config.allowedDomains.some(domain => 
      url.toLowerCase().includes(domain.toLowerCase())
    );
  }

  /**
   * Check if text contains GitHub URLs that should be preserved
   */
  private containsGitHubUrl(text: string): boolean {
    const githubUrlPattern = /https?:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/gi;
    return githubUrlPattern.test(text);
  }

  /**
   * Detect secrets in text without sanitizing
   */
  detectSecrets(text: string): SecretMatch[] {
    const secrets: SecretMatch[] = [];
    
    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        // Skip if it's a safe URL (like GitHub URLs)
        if (this.isSafeUrl(text, match.index, match.index + match[0].length)) {
          continue;
        }
        
        secrets.push({
          type: pattern.type,
          pattern: pattern.pattern.source,
          match: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          severity: pattern.severity,
          description: pattern.description,
        });
      }
    }
    
    return secrets;
  }

  /**
   * Sanitize text by masking or stripping secrets
   */
  sanitize(text: string): SanitizationResult {
    // Special handling for GitHub URLs - preserve them
    if (this.containsGitHubUrl(text)) {
      // Extract GitHub URLs and temporarily replace them
      const githubUrlPattern = /https?:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/gi;
      const githubUrls: string[] = [];
      let tempText = text.replace(githubUrlPattern, (match) => {
        const placeholder = `__GITHUB_URL_${githubUrls.length}__`;
        githubUrls.push(match);
        return placeholder;
      });

      // Detect secrets in text without GitHub URLs
      const secrets = this.detectSecrets(tempText);
      let sanitizedText = tempText;
      const sanitizationLog: string[] = [];
      
      if (secrets.length === 0) {
        // No secrets found, restore GitHub URLs
        let finalText = text;
        githubUrls.forEach((url, index) => {
          finalText = finalText.replace(`__GITHUB_URL_${index}__`, url);
        });
        
        return {
          originalText: text,
          sanitizedText: finalText,
          secretsFound: [],
          sanitizationLog: ['No secrets detected'],
          isSanitized: false,
        };
      }

      // Sort secrets by start index in reverse order to avoid index shifting
      const sortedSecrets = secrets.sort((a, b) => b.startIndex - a.startIndex);
      
      for (const secret of sortedSecrets) {
        const replacement = this.getReplacement(secret);
        sanitizedText = 
          sanitizedText.slice(0, secret.startIndex) + 
          replacement + 
          sanitizedText.slice(secret.endIndex);
        
        sanitizationLog.push(
          `${secret.severity.toUpperCase()}: ${secret.type} - ${secret.description}`
        );
      }

      // Restore GitHub URLs
      githubUrls.forEach((url, index) => {
        sanitizedText = sanitizedText.replace(`__GITHUB_URL_${index}__`, url);
      });

      return {
        originalText: text,
        sanitizedText,
        secretsFound: secrets,
        sanitizationLog,
        isSanitized: true,
      };
    }

    // Regular sanitization for non-GitHub URLs
    const secrets = this.detectSecrets(text);
    let sanitizedText = text;
    const sanitizationLog: string[] = [];
    
    if (secrets.length === 0) {
      return {
        originalText: text,
        sanitizedText: text,
        secretsFound: [],
        sanitizationLog: ['No secrets detected'],
        isSanitized: false,
      };
    }

    // Sort secrets by start index in reverse order to avoid index shifting
    const sortedSecrets = secrets.sort((a, b) => b.startIndex - a.startIndex);
    
    for (const secret of sortedSecrets) {
      const replacement = this.getReplacement(secret);
      sanitizedText = 
        sanitizedText.slice(0, secret.startIndex) + 
        replacement + 
        sanitizedText.slice(secret.endIndex);
      
      sanitizationLog.push(
        `${secret.severity.toUpperCase()}: ${secret.type} - ${secret.description}`
      );
    }

    return {
      originalText: text,
      sanitizedText,
      secretsFound: secrets,
      sanitizationLog,
      isSanitized: true,
    };
  }

  /**
   * Get replacement text for a secret
   */
  private getReplacement(secret: SecretMatch): string {
    if (this.config.enableStripping) {
      return '';
    }
    
    if (this.config.enableHashing) {
      return `[HASHED_${secret.type.toUpperCase()}]`;
    }
    
    if (this.config.enableMasking) {
      const maskLength = Math.min(secret.match.length, 8);
      const mask = this.config.maskCharacter.repeat(maskLength);
      return `[${mask}]`;
    }
    
    return `[REDACTED_${secret.type.toUpperCase()}]`;
  }

  /**
   * Validate that no secrets remain in text
   */
  validate(text: string): { isValid: boolean; remainingSecrets: SecretMatch[] } {
    const remainingSecrets = this.detectSecrets(text);
    return {
      isValid: remainingSecrets.length === 0,
      remainingSecrets,
    };
  }

  /**
   * Get sanitization statistics
   */
  getStats(result: SanitizationResult) {
    const severityCounts = result.secretsFound.reduce((acc, secret) => {
      acc[secret.severity] = (acc[secret.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSecrets: result.secretsFound.length,
      severityBreakdown: severityCounts,
      isSanitized: result.isSanitized,
      sanitizationLog: result.sanitizationLog,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SanitizationConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const sanitizerAgent = new SanitizerAgent();
