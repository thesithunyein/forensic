export type TimelineEvent = {
  ts: string;
  kind: "mint" | "lp_add" | "lp_remove" | "swap_buy" | "swap_sell" | "rug" | "other";
  label: string;
  usd?: number | null;
  tx?: string | null;
};

export type Extractor = {
  address: string;
  realized_usd: number;
  next_move?: string | null;
};

export type DeployerOtherToken = {
  address: string;
  symbol?: string | null;
  outcome?: string | null;
  chain?: string;
};

export type Deployer = {
  address: string;
  token_count?: number;
  rug_count?: number;
  chains?: string[];
  other_tokens?: DeployerOtherToken[];
};

export type Autopsy = {
  token_address: string;
  chain_name: string;
  symbol?: string | null;
  name?: string | null;
  total_drained_usd?: number | null;
  victim_count?: number | null;
  extractor_count?: number | null;
  lifespan_human?: string | null;
  summary?: string | null;
  timeline?: TimelineEvent[];
  extractors?: Extractor[];
  deployer?: Deployer | null;
  updated_at?: string;
  _debug?: Record<string, any>;
};
