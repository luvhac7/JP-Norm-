import { levenshteinEditDistance as levenshtein } from 'levenshtein-edit-distance';

export interface NLPMetrics {
  bleu: number;
  rouge: number;
  editDistance: number;
  confidence: number;
}

/**
 * Simplified BLEU score implementation for demonstration.
 * In a real production system, you'd use a more robust library or NLTK.
 */
export function calculateBLEU(reference: string, candidate: string): number {
  const refTokens = reference.split('');
  const candTokens = candidate.split('');
  
  let matches = 0;
  const refCounts: Record<string, number> = {};
  
  refTokens.forEach(t => refCounts[t] = (refCounts[t] || 0) + 1);
  
  candTokens.forEach(t => {
    if (refCounts[t] > 0) {
      matches++;
      refCounts[t]--;
    }
  });
  
  const precision = matches / candTokens.length;
  const bp = Math.exp(Math.min(0, 1 - refTokens.length / candTokens.length));
  
  return precision * bp;
}

/**
 * Simplified ROUGE-L (Longest Common Subsequence)
 */
export function calculateROUGE(reference: string, candidate: string): number {
  const m = reference.length;
  const n = candidate.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (reference[i - 1] === candidate[j - 1]) {
        dp[i][j] = dp[i][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcs = dp[m][n];
  const recall = lcs / m;
  const precision = lcs / n;
  
  if (recall + precision === 0) return 0;
  return (2 * recall * precision) / (recall + precision);
}

export function getMetrics(reference: string, candidate: string, confidence: number): NLPMetrics {
  return {
    bleu: calculateBLEU(reference, candidate),
    rouge: calculateROUGE(reference, candidate),
    editDistance: levenshtein(reference, candidate),
    confidence: confidence
  };
}
