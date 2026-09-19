from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum


class RiskLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class PatternType(str, Enum):
    CYCLE = "CYCLE"
    SMURFING_FAN_IN = "SMURFING_FAN_IN"
    SMURFING_FAN_OUT = "SMURFING_FAN_OUT"
    SMURFING_SCATTER_GATHER = "SMURFING_SCATTER_GATHER"
    SHELL_CHAIN = "SHELL_CHAIN"
    STRUCTURING = "STRUCTURING"


class AccountRole(str, Enum):
    ORCHESTRATOR = "ORCHESTRATOR"
    CYCLE_PARTICIPANT = "CYCLE_PARTICIPANT"
    SUSPICIOUS_INTERMEDIARY = "SUSPICIOUS_INTERMEDIARY"
    MULE = "MULE"
    AGGREGATOR = "AGGREGATOR"
    DISPERSER = "DISPERSER"
    SHELL = "SHELL"
    VICTIM_OR_SOURCE = "VICTIM_OR_SOURCE"
    DESTINATION = "DESTINATION"
    MERCHANT = "MERCHANT"
    PAYROLL = "PAYROLL"
    NORMAL = "NORMAL"


class Transaction(BaseModel):
    transaction_id: str
    sender_account: str
    receiver_account: str
    amount: float
    timestamp: str
    raw_timestamp: Optional[str] = None
    currency: Optional[str] = "USD"
    sender_name: Optional[str] = None
    receiver_name: Optional[str] = None
    description: Optional[str] = None


class AccountStats(BaseModel):
    account_id: str
    in_degree: int = 0
    out_degree: int = 0
    tx_in_count: int = 0
    tx_out_count: int = 0
    total_received: float = 0.0
    total_sent: float = 0.0
    net_flow: float = 0.0
    turnover_ratio: float = 0.0
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    active_span_hours: float = 0.0
    betweenness_centrality: float = 0.0
    pagerank: float = 0.0
    is_merchant: bool = False
    is_payroll: bool = False


class SuspiciousAccount(BaseModel):
    account_id: str
    suspicion_score: float = Field(..., ge=0, le=100)
    risk_level: RiskLevel
    role: AccountRole
    flags: List[str] = []
    associated_rings: List[str] = []
    patterns: List[PatternType] = []
    total_received: float
    total_sent: float
    tx_count: int
    score_breakdown: Dict[str, float] = {}


class DetectedCycle(BaseModel):
    cycle_id: str
    length: int
    accounts: List[str]
    total_amount: float
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    span_hours: float = 0.0
    transactions: List[str] = []


class DetectedSmurfing(BaseModel):
    pattern_id: str
    pattern_type: PatternType
    hub_account: str
    spoke_accounts: List[str]
    spoke_count: int
    total_amount: float
    time_window_hours: float
    transactions: List[str] = []


class DetectedShellChain(BaseModel):
    chain_id: str
    source_account: str
    destination_account: str
    intermediary_shells: List[str]
    hop_count: int
    total_amount: float
    avg_pass_through_ratio: float
    span_hours: float = 0.0
    transactions: List[str] = []


class FraudRing(BaseModel):
    ring_id: str
    risk_score: float
    severity: RiskLevel
    primary_pattern: str
    patterns_detected: List[str]
    member_count: int
    member_accounts: List[str]
    orchestrator: Optional[str] = None
    total_funds_routed: float
    transaction_count: int
    description: str


class CytoscapeNodeData(BaseModel):
    id: str
    label: str
    suspicion_score: float
    risk_level: RiskLevel
    is_suspicious: bool
    role: str
    ring_id: Optional[str] = None
    total_received: float
    total_sent: float
    tx_count: int
    in_degree: int
    out_degree: int
    flags: List[str] = []
    score_breakdown: Dict[str, float] = {}
    evidence_points: List[str] = []


class CytoscapeNode(BaseModel):
    data: CytoscapeNodeData


class CytoscapeEdgeData(BaseModel):
    id: str
    source: str
    target: str
    amount: float
    timestamp: str
    is_suspicious: bool = False
    ring_id: Optional[str] = None


class CytoscapeEdge(BaseModel):
    data: CytoscapeEdgeData


class GraphVisualizationData(BaseModel):
    nodes: List[CytoscapeNode]
    edges: List[CytoscapeEdge]


class AnalysisReport(BaseModel):
    report_metadata: Dict[str, Any]
    summary: Dict[str, Any]
    fraud_rings: List[FraudRing]
    suspicious_accounts: List[SuspiciousAccount]
    detected_patterns: Dict[str, Any]
    graph_data: Optional[GraphVisualizationData] = None


class HopDetail(BaseModel):
    hop_number: int
    from_account: str
    to_account: str
    amount: float
    timestamp: str
    time_delta_hours: float
    time_delta_display: str
    retained_amount: float
    retained_percent: float
    currency: str = "INR"
    description: Optional[str] = None
    from_account_risk: str = "LOW"
    from_account_score: float = 0.0
    from_account_role: str = "NORMAL"
    to_account_risk: str = "LOW"
    to_account_score: float = 0.0
    to_account_role: str = "NORMAL"


class FundTracePath(BaseModel):
    path_id: str
    direction: str  # "DOWNSTREAM" or "UPSTREAM"
    source_node: str
    target_node: str
    total_hops: int
    initial_amount: float
    final_amount: float
    total_retained: float
    total_span_hours: float
    hops: List[HopDetail]


class AccountDossier(BaseModel):
    account_id: str
    suspicion_score: float
    risk_level: RiskLevel
    role: str
    associated_rings: List[str] = []
    flags: List[str] = []
    total_received: float = 0.0
    total_sent: float = 0.0
    turnover_ratio: float = 0.0
    active_span_hours: float = 0.0
    upstream_traces: List[FundTracePath] = []
    downstream_traces: List[FundTracePath] = []
    case_narrative: str = ""
    score_breakdown: Dict[str, float] = {}
    evidence_points: List[str] = []


class InvestigationRequest(BaseModel):
    csv_content: Optional[str] = None
    account_id: str

