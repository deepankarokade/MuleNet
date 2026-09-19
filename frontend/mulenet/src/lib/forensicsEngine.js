/**
 * MuleNet In-Browser Financial Forensics Engine
 * Implements full graph-based AML detection:
 * - Cycle Detection (lengths 3 to 5)
 * - Smurfing (10+ Fan-In / Fan-Out in 72h)
 * - Shell Network Chains (3+ hops with 2-3 pass-throughs)
 * - Merchant & Payroll False-Positive Dampening
 * - Multi-Signal Suspicion Scoring (0-100)
 * - Fraud Ring Aggregation & Cytoscape.js Payload Generation
 */

export const RISK_LEVELS = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
};

export const ACCOUNT_ROLES = {
  ORCHESTRATOR: "ORCHESTRATOR",
  CYCLE_PARTICIPANT: "CYCLE_PARTICIPANT",
  SUSPICIOUS_INTERMEDIARY: "SUSPICIOUS_INTERMEDIARY",
  MULE: "MULE",
  AGGREGATOR: "AGGREGATOR",
  DISPERSER: "DISPERSER",
  SHELL: "SHELL",
  MERCHANT: "MERCHANT",
  PAYROLL: "PAYROLL",
  NORMAL: "NORMAL",
};

export function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error("CSV file is empty or missing data rows.");
  }

  const rawHeaders = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const headerMap = {};
  const aliases = {
    transaction_id: ["transaction_id", "txn_id", "tx_id", "id", "trans_id", "txid"],
    sender_account: ["sender_account", "sender_id", "sender", "source_account", "source", "from_account", "from", "account"],
    receiver_account: ["receiver_account", "receiver_id", "receiver", "destination_account", "destination", "to_account", "to", "account.1", "account_1"],
    amount: ["amount", "txn_amount", "tx_amount", "value", "amt", "amount_paid", "amount_received"],
    timestamp: ["timestamp", "tx_timestamp", "txn_timestamp", "date", "datetime", "time"],
    currency: ["currency", "curr", "payment_currency", "receiving_currency"],
    description: ["description", "memo", "note", "desc", "payment_format"]
  };

  const normalizedHeaders = rawHeaders.map((h) => h.toLowerCase().replace(/[\s-]/g, "_"));

  for (const [canon, aliasList] of Object.entries(aliases)) {
    const idx = normalizedHeaders.findIndex((h) => aliasList.includes(h));
    if (idx !== -1) {
      headerMap[canon] = idx;
    }
  }

  const required = ["sender_account", "receiver_account", "amount", "timestamp"];
  for (const req of required) {
    if (headerMap[req] === undefined) {
      throw new Error(`Missing required CSV column for '${req}'. Found: ${rawHeaders.join(", ")}`);
    }
  }

  const transactions = [];
  const maxRows = 100000;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (transactions.length >= maxRows) break;

    // Simple robust CSV split respecting quotes
    const parts = [];
    let cur = "";
    let inQuotes = false;
    for (let c of line) {
      if (c === '"' || c === "'") inQuotes = !inQuotes;
      else if (c === "," && !inQuotes) {
        parts.push(cur.trim());
        cur = "";
      } else cur += c;
    }
    parts.push(cur.trim());

    const tx_id = (headerMap.transaction_id !== undefined ? parts[headerMap.transaction_id] : null) || `TX-${i}`;
    const sender = parts[headerMap.sender_account];
    const receiver = parts[headerMap.receiver_account];
    const amountStr = parts[headerMap.amount]?.replace(/[\$,]/g, "");
    const timestampStr = parts[headerMap.timestamp];

    if (!sender || !receiver) continue;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) continue;

    let dt = new Date(timestampStr);
    if (isNaN(dt.getTime())) dt = new Date();

    transactions.push({
      transaction_id: tx_id,
      sender_account: sender,
      receiver_account: receiver,
      amount: Math.round(amount * 100) / 100,
      timestamp: dt.toISOString(),
      raw_timestamp: timestampStr,
      currency: parts[headerMap.currency] || "USD",
      description: parts[headerMap.description] || ""
    });
  }

  if (transactions.length === 0) {
    throw new Error("No valid transactions could be parsed from CSV.");
  }

  return transactions;
}

export function runInBrowserForensics(transactions) {
  const startTime = performance.now();

  // 1. Build Graph & Account Statistics
  const nodesMap = new Map();
  const edgesMap = new Map(); // "u->v" -> edge data
  const adjOut = new Map(); // u -> [v, ...]
  const adjIn = new Map();

  function getOrInitAccount(acc) {
    if (!nodesMap.has(acc)) {
      nodesMap.set(acc, {
        account_id: acc,
        in_counterparts: new Set(),
        out_counterparts: new Set(),
        tx_in_count: 0,
        tx_out_count: 0,
        total_received: 0,
        total_sent: 0,
        first_seen: null,
        last_seen: null,
        tx_incoming: [],
        tx_outgoing: [],
        is_merchant: false,
        is_payroll: false
      });
      adjOut.set(acc, new Set());
      adjIn.set(acc, new Set());
    }
    return nodesMap.get(acc);
  }

  for (let tx of transactions) {
    const u = tx.sender_account;
    const v = tx.receiver_account;
    const dt = new Date(tx.timestamp).getTime();

    const uStats = getOrInitAccount(u);
    const vStats = getOrInitAccount(v);

    uStats.out_counterparts.add(v);
    uStats.tx_out_count++;
    uStats.total_sent += tx.amount;
    uStats.tx_outgoing.push(tx);
    if (!uStats.first_seen || dt < uStats.first_seen) uStats.first_seen = dt;
    if (!uStats.last_seen || dt > uStats.last_seen) uStats.last_seen = dt;

    vStats.in_counterparts.add(u);
    vStats.tx_in_count++;
    vStats.total_received += tx.amount;
    vStats.tx_incoming.push(tx);
    if (!vStats.first_seen || dt < vStats.first_seen) vStats.first_seen = dt;
    if (!vStats.last_seen || dt > vStats.last_seen) vStats.last_seen = dt;

    adjOut.get(u).add(v);
    adjIn.get(v).add(u);

    const edgeKey = `${u}->${v}`;
    if (!edgesMap.has(edgeKey)) {
      edgesMap.set(edgeKey, { source: u, target: v, weight: 0, tx_count: 0, transactions: [] });
    }
    const edgeData = edgesMap.get(edgeKey);
    edgeData.weight += tx.amount;
    edgeData.tx_count++;
    edgeData.transactions.push(tx);
  }

  // Compute stats ratios
  for (let [acc, s] of nodesMap.entries()) {
    s.total_received = Math.round(s.total_received * 100) / 100;
    s.total_sent = Math.round(s.total_sent * 100) / 100;
    const maxFlow = Math.max(s.total_received, s.total_sent);
    const minFlow = Math.min(s.total_received, s.total_sent);
    s.turnover_ratio = maxFlow > 0 ? minFlow / maxFlow : 0;
    s.active_span_hours = s.first_seen && s.last_seen ? Math.round(((s.last_seen - s.first_seen) / 3600000) * 10) / 10 : 0;
    s.in_degree = s.in_counterparts.size;
    s.out_degree = s.out_counterparts.size;
  }

  // 2. Cycle Detection (Lengths 3 to 5)
  const allNodes = Array.from(nodesMap.keys()).sort();
  const nodeIndex = new Map(allNodes.map((n, i) => [n, i]));
  const cycles = [];
  const seenCanonicalCycles = new Set();

  for (let startNode of allNodes) {
    const startIdx = nodeIndex.get(startNode);
    const stack = [[startNode, [startNode], new Set([startNode])]];

    while (stack.length > 0) {
      const [currNode, path, visited] = stack.pop();
      const pathLen = path.length;

      const neighbors = adjOut.get(currNode) || [];
      for (let neighbor of neighbors) {
        if (neighbor === startNode) {
          if (pathLen >= 3 && pathLen <= 5) {
            // Canonical representation
            const minElem = path.reduce((m, x) => (x < m ? x : m), path[0]);
            const minIdx = path.indexOf(minElem);
            const canonical = [...path.slice(minIdx), ...path.slice(0, minIdx)].join("->");

            if (!seenCanonicalCycles.has(canonical)) {
              seenCanonicalCycles.add(canonical);

              let cycleAmount = 0;
              const txList = [];
              for (let i = 0; i < path.length; i++) {
                const u = path[i];
                const v = path[(i + 1) % path.length];
                const e = edgesMap.get(`${u}->${v}`);
                if (e) {
                  cycleAmount += e.weight;
                  txList.push(...e.transactions.map((t) => t.transaction_id));
                }
              }

              cycles.push({
                cycle_id: `CYC-${String(cycles.length + 1).padStart(4, "0")}`,
                length: pathLen,
                accounts: [...path.slice(minIdx), ...path.slice(0, minIdx)],
                total_amount: Math.round(cycleAmount * 100) / 100,
                transactions: Array.from(new Set(txList))
              });
            }
          }
        } else if (!visited.has(neighbor) && pathLen < 5) {
          if (nodeIndex.get(neighbor) >= startIdx) {
            const nextVisited = new Set(visited);
            nextVisited.add(neighbor);
            stack.push([neighbor, [...path, neighbor], nextVisited]);
          }
        }
      }
    }
  }

  // 3. False-Positive Filtering (Merchants & Payroll)
  const cycleAccounts = new Set(cycles.flatMap((c) => c.accounts));

  for (let [acc, s] of nodesMap.entries()) {
    if (cycleAccounts.has(acc)) continue;

    // Merchant check: high in-degree, diverse senders, retail amounts
    if (s.tx_in_count >= 15) {
      const inSenders = s.in_counterparts.size;
      const outReceivers = Math.max(1, s.out_counterparts.size);
      const ratio = inSenders / outReceivers;
      if (ratio >= 2.5) s.is_merchant = true;
    }

    // Payroll check: high out-degree, recurring distributions
    if (s.tx_out_count >= 8) {
      const outReceivers = s.out_counterparts.size;
      const inSenders = Math.max(1, s.in_counterparts.size);
      if (outReceivers / inSenders >= 3.0 && !s.is_merchant) {
        s.is_payroll = true;
      }
    }
  }

  // 4. Shell Network Chains (3+ hops with 2-3 intermediaries)
  const shellCandidates = new Set();
  for (let [acc, s] of nodesMap.entries()) {
    if (s.is_merchant || s.is_payroll || cycleAccounts.has(acc)) continue;
    const totalTx = s.tx_in_count + s.tx_out_count;
    if (totalTx >= 2 && totalTx <= 4 && s.in_degree >= 1 && s.out_degree >= 1) {
      if (s.turnover_ratio >= 0.85 && Math.min(s.total_received, s.total_sent) >= 2500 && s.active_span_hours <= 48) {
        shellCandidates.add(acc);
      }
    }
  }

  const candidateShellChains = [];
  const seenShellChains = new Set();

  for (let shellStart of shellCandidates) {
    const origins = Array.from(adjIn.get(shellStart) || []).filter(
      (u) => !nodesMap.get(u)?.is_merchant && !nodesMap.get(u)?.is_payroll && !cycleAccounts.has(u)
    );
    const stack = [[shellStart, [shellStart]]];

    while (stack.length > 0) {
      const [currShell, chainShells] = stack.pop();

      if (chainShells.length >= 2) {
        const dests = Array.from(adjOut.get(currShell) || []).filter(
          (v) => !nodesMap.get(v)?.is_merchant && !nodesMap.get(v)?.is_payroll && !cycleAccounts.has(v)
        );
        for (let dest of dests) {
          if (!chainShells.includes(dest)) {
            for (let origin of origins) {
              if (origin !== dest && !chainShells.includes(origin)) {
                const fullPath = [origin, ...chainShells, dest];
                const key = fullPath.join("->");
                if (!seenShellChains.has(key)) {
                  seenShellChains.add(key);

                  const txList = [];
                  let chainAmt = Infinity;
                  for (let i = 0; i < fullPath.length - 1; i++) {
                    const e = edgesMap.get(`${fullPath[i]}->${fullPath[i + 1]}`);
                    if (e) {
                      chainAmt = Math.min(chainAmt, e.weight);
                      txList.push(...e.transactions.map((t) => t.transaction_id));
                    }
                  }

                  candidateShellChains.push({
                    chain_id: "",
                    source_account: origin,
                    destination_account: dest,
                    intermediary_shells: [...chainShells],
                    hop_count: fullPath.length - 1,
                    total_amount: chainAmt === Infinity ? 0 : Math.round(chainAmt * 100) / 100,
                    transactions: Array.from(new Set(txList))
                  });
                }
              }
            }
          }
        }
      }

      if (chainShells.length < 3) {
        const nextShells = Array.from(adjOut.get(currShell) || []).filter((n) => shellCandidates.has(n) && !chainShells.includes(n));
        for (let n of nextShells) {
          stack.push([n, [...chainShells, n]]);
        }
      }
    }
  }

  // Deduplicate overlapping subpaths: keep only maximal chains
  candidateShellChains.sort((a, b) => b.hop_count - a.hop_count || b.total_amount - a.total_amount);
  const shellChains = [];
  for (let cand of candidateShellChains) {
    const candInterms = new Set(cand.intermediary_shells);
    const candPathStr = [cand.source_account, ...cand.intermediary_shells, cand.destination_account].join("->");
    let isRedundant = false;

    for (let acc of shellChains) {
      const accInterms = new Set(acc.intermediary_shells);
      const accPathStr = [acc.source_account, ...acc.intermediary_shells, acc.destination_account].join("->");

      let isSubset = true;
      for (let s of candInterms) {
        if (!accInterms.has(s)) { isSubset = false; break; }
      }
      if (isSubset) { isRedundant = true; break; }

      if (accPathStr.includes(candPathStr)) {
        isRedundant = true;
        break;
      }
    }

    if (!isRedundant) {
      cand.chain_id = `SHELL-${String(shellChains.length + 1).padStart(4, "0")}`;
      shellChains.push(cand);
    }
  }

  const shellIntermediaries = new Set(shellChains.flatMap((s) => s.intermediary_shells));

  // 5. Smurfing Detection (10+ spokes within 72h)
  const smurfingPatterns = [];
  const smurfWindowMs = 72 * 3600 * 1000;
  const fanInHubs = new Set();
  const fanOutHubs = new Set();

  for (let [acc, s] of nodesMap.entries()) {
    // Fan-in check (skip merchants)
    if (!s.is_merchant && s.tx_in_count >= 10) {
      const sortedIn = [...s.tx_incoming].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      let bestSpokes = new Set();
      let bestTxs = [];

      let left = 0;
      for (let right = 0; right < sortedIn.length; right++) {
        const tRight = new Date(sortedIn[right].timestamp).getTime();
        while (left <= right && tRight - new Date(sortedIn[left].timestamp).getTime() > smurfWindowMs) {
          left++;
        }
        const win = sortedIn.slice(left, right + 1);
        const senders = new Set(win.map((t) => t.sender_account));
        if (senders.size >= 10 && senders.size > bestSpokes.size) {
          bestSpokes = senders;
          bestTxs = win;
        }
      }

      if (bestSpokes.size >= 10) {
        fanInHubs.add(acc);
        smurfingPatterns.push({
          pattern_id: `SMURF-FI-${String(smurfingPatterns.length + 1).padStart(4, "0")}`,
          pattern_type: "SMURFING_FAN_IN",
          hub_account: acc,
          spoke_accounts: Array.from(bestSpokes),
          spoke_count: bestSpokes.size,
          total_amount: Math.round(bestTxs.reduce((sum, t) => sum + t.amount, 0) * 100) / 100,
          transactions: bestTxs.map((t) => t.transaction_id)
        });
      }
    }

    // Fan-out check (skip payroll)
    if (!s.is_payroll && s.tx_out_count >= 10) {
      const sortedOut = [...s.tx_outgoing].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      let bestSpokes = new Set();
      let bestTxs = [];

      let left = 0;
      for (let right = 0; right < sortedOut.length; right++) {
        const tRight = new Date(sortedOut[right].timestamp).getTime();
        while (left <= right && tRight - new Date(sortedOut[left].timestamp).getTime() > smurfWindowMs) {
          left++;
        }
        const win = sortedOut.slice(left, right + 1);
        const receivers = new Set(win.map((t) => t.receiver_account));
        if (receivers.size >= 10 && receivers.size > bestSpokes.size) {
          bestSpokes = receivers;
          bestTxs = win;
        }
      }

      if (bestSpokes.size >= 10) {
        fanOutHubs.add(acc);
        smurfingPatterns.push({
          pattern_id: `SMURF-FO-${String(smurfingPatterns.length + 1).padStart(4, "0")}`,
          pattern_type: "SMURFING_FAN_OUT",
          hub_account: acc,
          spoke_accounts: Array.from(bestSpokes),
          spoke_count: bestSpokes.size,
          total_amount: Math.round(bestTxs.reduce((sum, t) => sum + t.amount, 0) * 100) / 100,
          transactions: bestTxs.map((t) => t.transaction_id)
        });
      }
    }
  }

  // 6. Suspicion Scoring (0–100)
  const smurfHubsMap = new Map();
  const smurfSpokesMap = new Map();
  for (let sm of smurfingPatterns) {
    if (!smurfHubsMap.has(sm.hub_account)) smurfHubsMap.set(sm.hub_account, []);
    smurfHubsMap.get(sm.hub_account).push(sm);
    for (let sp of sm.spoke_accounts) {
      if (!smurfSpokesMap.has(sp)) smurfSpokesMap.set(sp, []);
      smurfSpokesMap.get(sp).push(sm);
    }
  }

  const suspiciousAccounts = [];

  for (let [acc, s] of nodesMap.entries()) {
    let score = 0;
    const flags = [];
    let role = ACCOUNT_ROLES.NORMAL;

    // Cycle signal
    const isCycle = cycleAccounts.has(acc);
    if (isCycle) {
      score += 55;
      flags.push("Involved in circular fund routing cycle");
      role = ACCOUNT_ROLES.CYCLE_PARTICIPANT;
    }

    // Smurfing signal
    if (smurfHubsMap.has(acc)) {
      score += 65;
      flags.push("High-velocity smurfing hub (10+ counterparties in 72h)");
      role = ACCOUNT_ROLES.AGGREGATOR;
    } else if (smurfSpokesMap.has(acc)) {
      score += 45;
      flags.push("Coordinated smurfing runner/mule");
      if (!isCycle) role = ACCOUNT_ROLES.MULE;
    }

    // Shell chain signal
    if (shellIntermediaries.has(acc)) {
      score += 60;
      flags.push("Pass-through intermediary in shell company network");
      if (!isCycle) role = ACCOUNT_ROLES.SUSPICIOUS_INTERMEDIARY;
    }

    // Temporal / pass-through amplifier (only if structural fraud pattern exists)
    if (score > 0) {
      if (s.turnover_ratio >= 0.85 && s.active_span_hours <= 72) {
        score += 10;
        flags.push("Rapid dwell time (<72h)");
      }
      if (s.turnover_ratio >= 0.95 && Math.max(s.total_received, s.total_sent) >= 5000) {
        score += 8;
        flags.push("High pass-through volume (>95%)");
      }
    }

    // Dampen if merchant or payroll
    if (s.is_merchant) {
      score *= 0.2;
      role = ACCOUNT_ROLES.MERCHANT;
    } else if (s.is_payroll) {
      score *= 0.15;
      role = ACCOUNT_ROLES.PAYROLL;
    }

    score = Math.min(100, Math.round(score * 10) / 10);

    let risk = RISK_LEVELS.LOW;
    if (score >= 80) risk = RISK_LEVELS.CRITICAL;
    else if (score >= 60) risk = RISK_LEVELS.HIGH;
    else if (score >= 40) risk = RISK_LEVELS.MEDIUM;

    if (score >= 40 || flags.length > 0) {
      suspiciousAccounts.push({
        account_id: acc,
        suspicion_score: score,
        risk_level: risk,
        role: role,
        flags: flags,
        total_received: s.total_received,
        total_sent: s.total_sent,
        tx_count: s.tx_in_count + s.tx_out_count,
        associated_rings: []
      });
    }
  }

  suspiciousAccounts.sort((a, b) => b.suspicion_score - a.suspicion_score);

  // 7. Fraud Ring Aggregation
  // Build adjacency of suspicious connections
  const ringAdj = new Map();
  function addRingEdge(u, v) {
    if (!ringAdj.has(u)) ringAdj.set(u, new Set());
    if (!ringAdj.has(v)) ringAdj.set(v, new Set());
    ringAdj.get(u).add(v);
    ringAdj.get(v).add(u);
  }

  for (let c of cycles) {
    for (let i = 0; i < c.accounts.length; i++) {
      for (let j = i + 1; j < c.accounts.length; j++) {
        addRingEdge(c.accounts[i], c.accounts[j]);
      }
    }
  }
  for (let sm of smurfingPatterns) {
    for (let sp of sm.spoke_accounts) {
      addRingEdge(sm.hub_account, sp);
    }
  }
  for (let sc of shellChains) {
    const chain = [sc.source_account, ...sc.intermediary_shells, sc.destination_account];
    for (let i = 0; i < chain.length - 1; i++) {
      const u = chain[i];
      const v = chain[i + 1];
      if (nodesMap.get(u)?.is_merchant || nodesMap.get(u)?.is_payroll) continue;
      if (nodesMap.get(v)?.is_merchant || nodesMap.get(v)?.is_payroll) continue;
      addRingEdge(u, v);
    }
  }

  // Connected components
  const visitedNodes = new Set();
  const fraudRings = [];
  const accountToRing = new Map();

  for (let startNode of ringAdj.keys()) {
    if (visitedNodes.has(startNode)) continue;

    const component = [];
    const queue = [startNode];
    visitedNodes.add(startNode);

    while (queue.length > 0) {
      const node = queue.shift();
      component.push(node);
      for (let neighbor of ringAdj.get(node) || []) {
        if (!visitedNodes.has(neighbor)) {
          visitedNodes.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    // Filter ring members: must be suspicious (score >= 40) and NOT merchant or payroll
    const fraudMembers = component.filter((m) => {
      const accObj = suspiciousAccounts.find((a) => a.account_id === m);
      const s = nodesMap.get(m);
      return accObj && accObj.suspicion_score >= 40 && !s?.is_merchant && !s?.is_payroll;
    });

    if (fraudMembers.length < 2) continue;

    const ringId = `RING-${String(fraudRings.length + 1).padStart(3, "0")}`;
    let maxScore = 50;
    let ringFunds = 0;
    const patternsDetected = new Set();

    for (let member of fraudMembers) {
      accountToRing.set(member, ringId);
      const accObj = suspiciousAccounts.find((a) => a.account_id === member);
      if (accObj && accObj.suspicion_score > maxScore) maxScore = accObj.suspicion_score;
      if (cycleAccounts.has(member)) patternsDetected.add("Circular Routing (Cycle)");
      if (smurfHubsMap.has(member) || smurfSpokesMap.has(member)) patternsDetected.add("Smurfing / Structuring");
      if (shellIntermediaries.has(member)) patternsDetected.add("Layered Shell Chain");
    }

    // Funds within ring
    const compSet = new Set(fraudMembers);
    for (let tx of transactions) {
      if (compSet.has(tx.sender_account) && compSet.has(tx.receiver_account)) {
        ringFunds += tx.amount;
      }
    }

    fraudRings.push({
      ring_id: ringId,
      risk_score: maxScore,
      severity: maxScore >= 80 ? RISK_LEVELS.CRITICAL : maxScore >= 60 ? RISK_LEVELS.HIGH : RISK_LEVELS.MEDIUM,
      primary_pattern: Array.from(patternsDetected)[0] || "Coordinated Flow",
      patterns_detected: Array.from(patternsDetected),
      member_count: fraudMembers.length,
      member_accounts: fraudMembers,
      total_funds_routed: Math.round(ringFunds * 100) / 100,
      description: `Coordinated fraud ring of ${fraudMembers.length} accounts involved in ${Array.from(patternsDetected).join(", ")}.`
    });
  }

  // Attach rings to suspicious accounts
  for (let acc of suspiciousAccounts) {
    if (accountToRing.has(acc.account_id)) {
      acc.associated_rings.push(accountToRing.get(acc.account_id));
    }
  }

  // 8. Cytoscape.js Graph Payload
  const cytoNodes = [];
  const cytoEdges = [];

  for (let [acc, s] of nodesMap.entries()) {
    const suspObj = suspiciousAccounts.find((a) => a.account_id === acc);
    const score = suspObj ? suspObj.suspicion_score : 0;
    const ringId = accountToRing.get(acc) || null;

    cytoNodes.push({
      data: {
        id: acc,
        label: acc,
        suspicion_score: score,
        risk_level: suspObj ? suspObj.risk_level : RISK_LEVELS.LOW,
        is_suspicious: score >= 40,
        role: suspObj ? suspObj.role : s.is_merchant ? "MERCHANT" : s.is_payroll ? "PAYROLL" : "NORMAL",
        ring_id: ringId,
        total_received: s.total_received,
        total_sent: s.total_sent,
        in_degree: s.in_degree,
        out_degree: s.out_degree,
        flags: suspObj ? suspObj.flags : []
      }
    });
  }

  let edgeIdx = 1;
  for (let [key, e] of edgesMap.entries()) {
    const ringU = accountToRing.get(e.source);
    const ringV = accountToRing.get(e.target);
    const sharedRing = ringU && ringU === ringV ? ringU : null;

    cytoEdges.push({
      data: {
        id: `e${edgeIdx++}`,
        source: e.source,
        target: e.target,
        amount: Math.round(e.weight * 100) / 100,
        is_suspicious: Boolean(sharedRing),
        ring_id: sharedRing
      }
    });
  }

  const durationMs = Math.round((performance.now() - startTime) * 10) / 10;

  return {
    report_metadata: {
      generated_at: new Date().toISOString(),
      analysis_duration_ms: durationMs,
      analysis_duration_seconds: Math.round(durationMs / 10) / 100,
      engine_version: "1.0.0-hybrid",
      engine_mode: "IN_BROWSER_WASM_FALLBACK"
    },
    summary: {
      total_transactions: transactions.length,
      total_accounts: nodesMap.size,
      total_suspicious_accounts: suspiciousAccounts.length,
      total_fraud_rings: fraudRings.length,
      total_cycles_detected: cycles.length,
      total_smurfing_patterns: smurfingPatterns.length,
      total_shell_chains: shellChains.length,
      total_volume_analyzed: Math.round(transactions.reduce((s, t) => s + t.amount, 0) * 100) / 100,
      total_suspicious_volume: Math.round(fraudRings.reduce((s, r) => s + r.total_funds_routed, 0) * 100) / 100
    },
    fraud_rings: fraudRings,
    suspicious_accounts: suspiciousAccounts,
    detected_patterns: {
      cycles,
      smurfing: smurfingPatterns,
      shell_chains: shellChains
    },
    graph_data: {
      nodes: cytoNodes,
      edges: cytoEdges
    }
  };
}
