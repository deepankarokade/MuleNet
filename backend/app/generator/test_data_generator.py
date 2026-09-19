import random
import csv
import io
from datetime import datetime, timezone, timedelta
from typing import Tuple, List, Dict, Set


def generate_synthetic_transactions(
    target_count: int = 1000,
    seed: int = 42
) -> Tuple[str, Dict[str, Set[str]]]:
    """
    Generates a realistic transaction dataset with planted fraud patterns
    and legitimate traffic (merchants & payroll) with ground truth labels.
    
    Returns:
        csv_text: CSV formatted string ready for upload
        ground_truth: Dict with sets of accounts for each planted fraud pattern
    """
    random.seed(seed)
    base_time = datetime(2026, 9, 1, 8, 0, 0, tzinfo=timezone.utc)
    
    rows: List[Dict[str, str]] = []
    tx_counter = 1

    ground_truth = {
        "cycle_accounts": set(),
        "smurfing_accounts": set(),
        "shell_accounts": set(),
        "all_fraud_accounts": set(),
        "legitimate_merchants": set(),
        "legitimate_payrolls": set()
    }

    # -------------------------------------------------------------
    # 1. Planted Cycle 1 (Length 3): CYC3_A -> CYC3_B -> CYC3_C -> CYC3_A
    # -------------------------------------------------------------
    cyc3_nodes = ["CYC3_ACC_A", "CYC3_ACC_B", "CYC3_ACC_C"]
    ground_truth["cycle_accounts"].update(cyc3_nodes)
    c3_time = base_time + timedelta(days=2, hours=4)
    c3_amount = 25000.00
    for i in range(3):
        u = cyc3_nodes[i]
        v = cyc3_nodes[(i + 1) % 3]
        t = c3_time + timedelta(hours=i * 5)
        rows.append({
            "transaction_id": f"TXN-CYC3-{tx_counter:05d}",
            "sender_account": u,
            "receiver_account": v,
            "amount": f"{c3_amount:.2f}",
            "timestamp": t.isoformat(),
            "currency": "USD",
            "description": "Consulting Service Agreement"
        })
        tx_counter += 1

    # -------------------------------------------------------------
    # 2. Planted Cycle 2 (Length 4): CYC4_A -> B -> C -> D -> A
    # -------------------------------------------------------------
    cyc4_nodes = ["CYC4_ACC_W", "CYC4_ACC_X", "CYC4_ACC_Y", "CYC4_ACC_Z"]
    ground_truth["cycle_accounts"].update(cyc4_nodes)
    c4_time = base_time + timedelta(days=3, hours=10)
    c4_amount = 48000.00
    for i in range(4):
        u = cyc4_nodes[i]
        v = cyc4_nodes[(i + 1) % 4]
        t = c4_time + timedelta(hours=i * 6)
        rows.append({
            "transaction_id": f"TXN-CYC4-{tx_counter:05d}",
            "sender_account": u,
            "receiver_account": v,
            "amount": f"{c4_amount:.2f}",
            "timestamp": t.isoformat(),
            "currency": "USD",
            "description": "Cross-Border Trade Invoice"
        })
        tx_counter += 1

    # -------------------------------------------------------------
    # 3. Planted Cycle 3 (Length 5): CYC5_A -> B -> C -> D -> E -> A
    # -------------------------------------------------------------
    cyc5_nodes = [f"CYC5_ACC_{k}" for k in ["ALPHA", "BETA", "GAMMA", "DELTA", "EPSILON"]]
    ground_truth["cycle_accounts"].update(cyc5_nodes)
    c5_time = base_time + timedelta(days=4, hours=2)
    c5_amount = 75000.00
    for i in range(5):
        u = cyc5_nodes[i]
        v = cyc5_nodes[(i + 1) % 5]
        t = c5_time + timedelta(hours=i * 4)
        rows.append({
            "transaction_id": f"TXN-CYC5-{tx_counter:05d}",
            "sender_account": u,
            "receiver_account": v,
            "amount": f"{c5_amount:.2f}",
            "timestamp": t.isoformat(),
            "currency": "USD",
            "description": "Equipment Lease"
        })
        tx_counter += 1

    # -------------------------------------------------------------
    # 4. Planted Smurfing Fan-In (14 smurfs fanning into 1 aggregator)
    # -------------------------------------------------------------
    aggregator = "SMURF_AGGREGATOR_01"
    ground_truth["smurfing_accounts"].add(aggregator)
    smurf_senders = [f"SMURF_MULE_{k:02d}" for k in range(1, 15)]
    ground_truth["smurfing_accounts"].update(smurf_senders)
    smurf_time = base_time + timedelta(days=5, hours=9)
    for idx, smurf in enumerate(smurf_senders):
        t = smurf_time + timedelta(minutes=idx * 45)
        # Amounts structured just below $10,000 threshold
        amount = round(random.uniform(9200.0, 9850.0), 2)
        rows.append({
            "transaction_id": f"TXN-SMURF-IN-{tx_counter:05d}",
            "sender_account": smurf,
            "receiver_account": aggregator,
            "amount": f"{amount:.2f}",
            "timestamp": t.isoformat(),
            "currency": "USD",
            "description": "P2P Transfer"
        })
        tx_counter += 1

    # -------------------------------------------------------------
    # 5. Planted Smurfing Fan-Out (1 disperser fanning out to 12 recipients)
    # -------------------------------------------------------------
    disperser = "SMURF_DISPERSER_01"
    ground_truth["smurfing_accounts"].add(disperser)
    fanout_recipients = [f"CASHOUT_MULE_{k:02d}" for k in range(1, 13)]
    ground_truth["smurfing_accounts"].update(fanout_recipients)
    disperser_time = base_time + timedelta(days=6, hours=14)
    for idx, recip in enumerate(fanout_recipients):
        t = disperser_time + timedelta(minutes=idx * 30)
        amount = round(random.uniform(4500.0, 4950.0), 2)
        rows.append({
            "transaction_id": f"TXN-SMURF-OUT-{tx_counter:05d}",
            "sender_account": disperser,
            "receiver_account": recip,
            "amount": f"{amount:.2f}",
            "timestamp": t.isoformat(),
            "currency": "USD",
            "description": "Digital Assets Settlement"
        })
        tx_counter += 1

    # -------------------------------------------------------------
    # 6. Planted Layered Shell Chain (4 hops / 3 shell intermediaries)
    # Origin -> Shell_1 -> Shell_2 -> Shell_3 -> Destination
    # -------------------------------------------------------------
    shell_origin = "DIRTY_ORIGIN_99"
    shell_1 = "SHELL_HOLDING_LTD_1"
    shell_2 = "SHELL_OFFSHORE_CORP_2"
    shell_3 = "SHELL_SERVICES_INC_3"
    shell_dest = "CLEAN_VAULT_FINAL"
    
    shells = [shell_1, shell_2, shell_3]
    ground_truth["shell_accounts"].update(shells)
    ground_truth["shell_accounts"].add(shell_origin)
    ground_truth["shell_accounts"].add(shell_dest)

    shell_chain_nodes = [shell_origin, shell_1, shell_2, shell_3, shell_dest]
    chain_time = base_time + timedelta(days=7, hours=3)
    chain_amount = 120000.0
    for i in range(len(shell_chain_nodes) - 1):
        u = shell_chain_nodes[i]
        v = shell_chain_nodes[i + 1]
        t = chain_time + timedelta(hours=i * 6)
        # Retain tiny fee 0.5% - 1%
        chain_amount = round(chain_amount * 0.995, 2)
        rows.append({
            "transaction_id": f"TXN-SHELL-{tx_counter:05d}",
            "sender_account": u,
            "receiver_account": v,
            "amount": f"{chain_amount:.2f}",
            "timestamp": t.isoformat(),
            "currency": "USD",
            "description": "Offshore Advisory Transfer"
        })
        tx_counter += 1

    # Combine all planted fraud accounts
    ground_truth["all_fraud_accounts"].update(ground_truth["cycle_accounts"])
    ground_truth["all_fraud_accounts"].update(ground_truth["smurfing_accounts"])
    ground_truth["all_fraud_accounts"].update(ground_truth["shell_accounts"])

    # -------------------------------------------------------------
    # 7. Legitimate Merchant (High Fan-In, Should NOT be flagged)
    # -------------------------------------------------------------
    merchant = "MERCHANT_NEXUS_RETAIL"
    ground_truth["legitimate_merchants"].add(merchant)
    for i in range(35):
        cust = f"RETAIL_CUSTOMER_{i:03d}"
        t = base_time + timedelta(days=i * 0.4, hours=random.randint(9, 21), minutes=random.randint(0, 59))
        amt = round(random.uniform(18.50, 480.00), 2)
        rows.append({
            "transaction_id": f"TXN-MERCHANT-{tx_counter:05d}",
            "sender_account": cust,
            "receiver_account": merchant,
            "amount": f"{amt:.2f}",
            "timestamp": t.isoformat(),
            "currency": "USD",
            "description": "E-Commerce Checkout"
        })
        tx_counter += 1

    # Merchant pays supplier once
    rows.append({
        "transaction_id": f"TXN-MERCHANT-{tx_counter:05d}",
        "sender_account": merchant,
        "receiver_account": "SUPPLIER_WHOLESALE_GLOBAL",
        "amount": "4500.00",
        "timestamp": (base_time + timedelta(days=12)).isoformat(),
        "currency": "USD",
        "description": "Inventory Restock Batch 44"
    })
    tx_counter += 1

    # -------------------------------------------------------------
    # 8. Legitimate Corporate Payroll (High Fan-Out, Should NOT be flagged)
    # -------------------------------------------------------------
    payroll_acc = "CORP_PAYROLL_GLOBAL"
    ground_truth["legitimate_payrolls"].add(payroll_acc)
    # Payroll gets funded from parent treasury
    rows.append({
        "transaction_id": f"TXN-PAYROLL-{tx_counter:05d}",
        "sender_account": "CORP_TREASURY_RESERVE",
        "receiver_account": payroll_acc,
        "amount": "250000.00",
        "timestamp": (base_time + timedelta(days=14, hours=8)).isoformat(),
        "currency": "USD",
        "description": "Monthly Payroll Treasury Allocation"
    })
    tx_counter += 1

    # Disperses to 25 employees
    pay_time = base_time + timedelta(days=14, hours=10)
    for emp_idx in range(1, 26):
        emp_acc = f"EMPLOYEE_ACC_{emp_idx:03d}"
        salary = round(random.uniform(4200.0, 8500.0), 2)
        rows.append({
            "transaction_id": f"TXN-PAYROLL-{tx_counter:05d}",
            "sender_account": payroll_acc,
            "receiver_account": emp_acc,
            "amount": f"{salary:.2f}",
            "timestamp": (pay_time + timedelta(minutes=emp_idx)).isoformat(),
            "currency": "USD",
            "description": "Monthly Salary Disbursement"
        })
        tx_counter += 1

    # -------------------------------------------------------------
    # 9. Fill remainder with realistic legitimate background traffic
    # Real-world traffic forms trees and star networks (utilities, retail, family)
    # rather than uniform random cycles.
    # -------------------------------------------------------------
    remaining = target_count - len(rows)
    if remaining > 0:
        # Common utility and service entities that people pay regularly
        utilities = [
            "UTILITY_METRO_POWER",
            "UTILITY_CITY_WATER",
            "TELECOM_APEX_MOBILE",
            "SUBSCRIPTION_STREAM_NOW",
            "MUNICIPAL_TAX_BOARD",
            "HEALTHCARE_CLINIC_CITY",
            "GROCERY_MARKET_CENTRAL"
        ]
        
        # User pool
        pool_size = max(100, remaining // 3)
        users = [f"USER_{k:04d}" for k in range(1, pool_size + 1)]
        
        # Pre-assign 1 or 2 fixed contacts per user (family/friends) to avoid random cycles
        user_contacts = {}
        for i, u in enumerate(users):
            # Assign forward-only contacts to maintain acyclic property for normal users
            contact_idx = (i + 1) % pool_size
            user_contacts[u] = users[contact_idx]
            
        for _ in range(remaining):
            u = random.choice(users)
            tx_type = random.random()
            day_offset = random.uniform(0.1, 28.0)
            t = base_time + timedelta(days=day_offset, hours=random.randint(7, 22), minutes=random.randint(0, 59))
            
            if tx_type < 0.65:
                # 65% of normal traffic is paying bills, utilities, or services
                v = random.choice(utilities)
                amt = round(random.uniform(25.0, 350.0), 2)
                desc = "Monthly Bill Payment"
            else:
                # 35% is personal P2P to a designated friend/family member
                v = user_contacts[u]
                amt = round(random.uniform(15.0, 500.0), 2)
                desc = "Personal Transfer"
                
            rows.append({
                "transaction_id": f"TXN-NORM-{tx_counter:06d}",
                "sender_account": u,
                "receiver_account": v,
                "amount": f"{amt:.2f}",
                "timestamp": t.isoformat(),
                "currency": "USD",
                "description": desc
            })
            tx_counter += 1

    # Write out CSV
    output = io.StringIO()
    fieldnames = [
        "transaction_id", "sender_account", "receiver_account",
        "amount", "timestamp", "currency", "description"
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
        
    return output.getvalue(), ground_truth
