export type Verdict = "green" | "yellow" | "red";

export type VerdictResult = {
  verdict: Verdict;
  reason: string;
};

export class VerdictParseError extends Error {
  constructor(rawResponse: string) {
    super(`Resposta da IA não é um Verdict válido: ${rawResponse}`);
    this.name = "VerdictParseError";
  }
}
