declare namespace uuid {
  function v1(options?: { node?: number[]; clockseq?: number; msecs?: number; nsecs?: number }): string;
  function v4(options?: { random?: number[]; rng?: () => number[] }): string;
  function v5(name: string, namespace: string, options?: { random?: number[]; rng?: () => number[] }): string;
}

declare const uuid: {
  v1: typeof uuid.v1;
  v4: typeof uuid.v4;
  v5: typeof uuid.v5;
};
