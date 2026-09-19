import os
from pydantic import BaseModel


class EngineConfig(BaseModel):
    # CSV Constraints
    MAX_TRANSACTIONS: int = 100000
    
    # Cycle Detection Constraints
    MIN_CYCLE_LENGTH: int = 3
    MAX_CYCLE_LENGTH: int = 5
    MAX_CYCLE_TIME_WINDOW_HOURS: float = 168.0  # 7 days max for a circular loop
    
    # Smurfing (Structuring / Fan-in / Fan-out) Constraints
    SMURFING_MIN_SPOKES: int = 10               # Requirement: 10+ fan-in/fan-out
    SMURFING_WINDOW_HOURS: float = 72.0         # Requirement: within 72h
    STRUCTURING_LOWER_THRESHOLD: float = 8500.0 # Common AML threshold ~$10,000
    STRUCTURING_UPPER_THRESHOLD: float = 9999.0
    
    # Shell Account Network Constraints
    SHELL_MAX_TOTAL_TX: int = 4                 # Shells have very few transactions (2-4)
    SHELL_MIN_PASS_THROUGH_RATIO: float = 0.85  # Retains <15% of funds
    SHELL_MAX_DWELL_HOURS: float = 48.0         # Quick pass-through
    SHELL_MIN_CHAIN_HOPS: int = 3               # Requirement: 3+ hop chains
    SHELL_MAX_INTERMEDIARIES: int = 4
    
    # False Positive Filtering (Merchants & Payroll)
    MERCHANT_MIN_INCOMING_TX: int = 15
    MERCHANT_MIN_ACTIVE_DAYS: float = 14.0
    MERCHANT_MAX_TURNOVER_ON_BURST: float = 0.70  # Merchants don't immediately forward 95%+
    PAYROLL_MIN_RECIPIENTS: int = 8
    PAYROLL_AMOUNT_VARIANCE_TOLERANCE: float = 0.35 # Consistent salary distributions
    
    # Scoring Weights (Total 100)
    WEIGHT_CYCLE: float = 35.0
    WEIGHT_SMURFING: float = 25.0
    WEIGHT_SHELL: float = 20.0
    WEIGHT_TEMPORAL_BURST: float = 10.0
    WEIGHT_CENTRALITY: float = 10.0
    
    # Dampening
    MERCHANT_DAMPENING_FACTOR: float = 0.20       # Reduces score by 80%
    PAYROLL_DAMPENING_FACTOR: float = 0.15        # Reduces score by 85%
    
    # Suspicion Threshold for Ring Aggregation
    MIN_SUSPICION_SCORE_FOR_RING: float = 45.0
    MIN_SUSPICION_SCORE_TO_REPORT: float = 40.0


settings = EngineConfig()
