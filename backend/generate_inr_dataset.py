#!/usr/bin/env python3
"""
MuleNet - 50,000 INR Synthetic Transaction Dataset Generator

Generates a realistic Indian Rupee (INR) banking transaction dataset with:
- Planted Money Laundering Schemes: Circular routing, Smurfing/Structuring, Shell chains
- Legitimate High-Volume Entities: Merchants (UPI/E-Commerce) and Corporate Payrolls
- Realistic Background Noise: UPI P2P, NEFT, IMPS, RTGS, Bill payments

Usage:
    python generate_inr_dataset.py [--count 50000] [--output samples/transactions_50000_inr.csv]
"""

import random
import csv
import io
import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path


def generate_inr_transactions(target_count: int = 50000, seed: int = 42) -> str:
    random.seed(seed)
    # Start timestamp in IST (+05:30)
    ist = timezone(timedelta(hours=5, minutes=30))
    base_time = datetime(2026, 9, 1, 9, 0, 0, tzinfo=ist)

    rows = []
    tx_counter = 1

    # -------------------------------------------------------------
    # 1. Planted Cycle 1 (Length 3): Circular Fund Loop (₹2,50,000)
    # -------------------------------------------------------------
    cyc3_nodes = ["HDFC_CYC3_ACC_A", "ICIC_CYC3_ACC_B", "SBIN_CYC3_ACC_C"]
    c3_time = base_time + timedelta(days=2, hours=3)
    c3_amount = 250000.00
    for i in range(3):
        u = cyc3_nodes[i]
        v = cyc3_nodes[(i + 1) % 3]
        t = c3_time + timedelta(hours=i * 4)
        rows.append({
            "transaction_id": f"TXN-INR-CYC3-{tx_counter:06d}",
            "sender_account": u,
            "receiver_account": v,
            "amount": f"{c3_amount:.2f}",
            "timestamp": t.isoformat(),
            "currency": "INR",
            "description": "RTGS Software Consultancy Advance"
        })
        tx_counter += 1

    # -------------------------------------------------------------
    # 2. Planted Cycle 2 (Length 4): Circular Fund Loop (₹4,80,000)
    # -------------------------------------------------------------
    cyc4_nodes = ["KOTAK_CYC4_W", "AXIS_CYC4_X", "PUNB_CYC4_Y", "INDUS_CYC4_Z"]
    c4_time = base_time + timedelta(days=3, hours=8)
    c4_amount = 480000.00
    for i in range(4):
        u = cyc4_nodes[i]
        v = cyc4_nodes[(i + 1) % 4]
        t = c4_time + timedelta(hours=i * 5)
        rows.append({
            "transaction_id": f"TXN-INR-CYC4-{tx_counter:06d}",
            "sender_account": u,
            "receiver_account": v,
            "amount": f"{c4_amount:.2f}",
            "timestamp": t.isoformat(),
            "currency": "INR",
            "description": "NEFT Commercial Lease Settlement"
        })
        tx_counter += 1

    # -------------------------------------------------------------
    # 3. Planted Cycle 3 (Length 5): Circular Fund Loop (₹7,50,000)
    # -------------------------------------------------------------
    cyc5_nodes = [f"YESB_CYC5_{k}" for k in ["ALPHA", "BETA", "GAMMA", "DELTA", "EPSILON"]]
    c5_time = base_time + timedelta(days=4, hours=2)
    c5_amount = 750000.00
    for i in range(5):
        u = cyc5_nodes[i]
        v = cyc5_nodes[(i + 1) % 5]
        t = c5_time + timedelta(hours=i * 3)
        rows.append({
            "transaction_id": f"TXN-INR-CYC5-{tx_counter:06d}",
            "sender_account": u,
            "receiver_account": v,
            "amount": f"{c5_amount:.2f}",
            "timestamp": t.isoformat(),
            "currency": "INR",
            "description": "RTGS Industrial Equipment Rental"
        })
        tx_counter += 1

    # -------------------------------------------------------------
    # 4. Planted Smurfing Fan-In (14 UPI smurfs -> 1 aggregator)
    # Structured just below regulatory trigger (₹9,200 - ₹9,850)
    # -------------------------------------------------------------
    aggregator = "UPI_AGGREGATOR_HUB_01"
    smurf_senders = [f"UPI_MULE_SPOKE_{k:02d}" for k in range(1, 15)]
    smurf_time = base_time + timedelta(days=5, hours=10)
    for idx, smurf in enumerate(smurf_senders):
        t = smurf_time + timedelta(minutes=idx * 35)
        amount = round(random.uniform(9200.0, 9850.0), 2)
        rows.append({
            "transaction_id": f"TXN-INR-SMURF-IN-{tx_counter:06d}",
            "sender_account": smurf,
            "receiver_account": aggregator,
            "amount": f"{amount:.2f}",
            "timestamp": t.isoformat(),
            "currency": "INR",
            "description": "UPI P2P Fund Transfer"
        })
        tx_counter += 1

    # -------------------------------------------------------------
    # 5. Planted Smurfing Fan-Out (1 disperser -> 12 cash-out mules)
    # -------------------------------------------------------------
    disperser = "UPI_DISPERSER_HUB_01"
    fanout_recipients = [f"CASHOUT_INR_MULE_{k:02d}" for k in range(1, 13)]
    disperser_time = base_time + timedelta(days=6, hours=15)
    for idx, recip in enumerate(fanout_recipients):
        t = disperser_time + timedelta(minutes=idx * 25)
        amount = round(random.uniform(4500.0, 4950.0), 2)
        rows.append({
            "transaction_id": f"TXN-INR-SMURF-OUT-{tx_counter:06d}",
            "sender_account": disperser,
            "receiver_account": recip,
            "amount": f"{amount:.2f}",
            "timestamp": t.isoformat(),
            "currency": "INR",
            "description": "IMPS Instant Settlement"
        })
        tx_counter += 1

    # -------------------------------------------------------------
    # 6. Planted Layered Shell Chain (4 hops / 3 shell intermediaries)
    # High pass-through ratio (>99%), rapid turnover (₹15,00,000)
    # -------------------------------------------------------------
    shell_origin = "ORIGIN_ACC_MUMBAI"
    shell_1 = "SHELL_EXPORTS_DELHI_PVT"
    shell_2 = "SHELL_INFRA_KOLKATA_LLP"
    shell_3 = "SHELL_LOGISTICS_HYD_LTD"
    shell_dest = "CLEAN_VAULT_BENGALURU"

    shell_chain_nodes = [shell_origin, shell_1, shell_2, shell_3, shell_dest]
    chain_time = base_time + timedelta(days=7, hours=4)
    chain_amount = 1500000.00
    for i in range(len(shell_chain_nodes) - 1):
        u = shell_chain_nodes[i]
        v = shell_chain_nodes[i + 1]
        t = chain_time + timedelta(hours=i * 5)
        chain_amount = round(chain_amount * 0.995, 2)  # 0.5% cut
        rows.append({
            "transaction_id": f"TXN-INR-SHELL-{tx_counter:06d}",
            "sender_account": u,
            "receiver_account": v,
            "amount": f"{chain_amount:.2f}",
            "timestamp": t.isoformat(),
            "currency": "INR",
            "description": "RTGS Strategic Subcontracting"
        })
        tx_counter += 1

    # -------------------------------------------------------------
    # 7. Legitimate Merchants (High Fan-In, Should NOT be flagged)
    # -------------------------------------------------------------
    merchants = [
        ("MERCHANT_AMAZON_INDIA", "Amazon India Marketplace"),
        ("MERCHANT_FLIPKART_PAY", "Flipkart Checkout"),
        ("MERCHANT_SWIGGY_FOOD", "Swiggy Online Food"),
        ("MERCHANT_ZOMATO_PAY", "Zomato Delivery"),
        ("MERCHANT_TNEB_POWER", "Electricity Bill Payment")
    ]
    for m_acc, m_desc in merchants:
        for i in range(40):
            cust = f"INR_CUSTOMER_{random.randint(1, 1000):04d}"
            t = base_time + timedelta(days=random.uniform(1.0, 25.0), hours=random.randint(8, 22), minutes=random.randint(0, 59))
            amt = round(random.uniform(150.00, 3500.00), 2)
            rows.append({
                "transaction_id": f"TXN-INR-MERC-{tx_counter:06d}",
                "sender_account": cust,
                "receiver_account": m_acc,
                "amount": f"{amt:.2f}",
                "timestamp": t.isoformat(),
                "currency": "INR",
                "description": m_desc
            })
            tx_counter += 1

        # Merchant pays single wholesale supplier
        rows.append({
            "transaction_id": f"TXN-INR-MERC-{tx_counter:06d}",
            "sender_account": m_acc,
            "receiver_account": f"SUPPLIER_WHOLESALE_{m_acc[-4:]}",
            "amount": "125000.00",
            "timestamp": (base_time + timedelta(days=26)).isoformat(),
            "currency": "INR",
            "description": "Supplier Inventory Restock"
        })
        tx_counter += 1

    # -------------------------------------------------------------
    # 8. Legitimate Corporate Payroll (High Fan-Out, Should NOT be flagged)
    # -------------------------------------------------------------
    payrolls = [
        ("TCS_CORP_PAYROLL", 35, 65000.00, "TCS Monthly Salary"),
        ("INFOSYS_CORP_PAYROLL", 30, 72000.00, "Infosys Salary Batch"),
        ("WIPRO_CORP_PAYROLL", 25, 58000.00, "Wipro Tech Payroll")
    ]
    for p_acc, emp_count, base_sal, p_desc in payrolls:
        p_time = base_time + timedelta(days=27, hours=10)
        for i in range(emp_count):
            emp = f"EMP_{p_acc[:4]}_{i:03d}"
            # Consistent salaries with minor variance
            sal = round(base_sal * random.uniform(0.95, 1.05), 2)
            t = p_time + timedelta(minutes=i * 2)
            rows.append({
                "transaction_id": f"TXN-INR-PAY-{tx_counter:06d}",
                "sender_account": p_acc,
                "receiver_account": emp,
                "amount": f"{sal:.2f}",
                "timestamp": t.isoformat(),
                "currency": "INR",
                "description": p_desc
            })
            tx_counter += 1

    # -------------------------------------------------------------
    # 9. Realistic Background Indian Financial Noise (to reach target_count)
    # -------------------------------------------------------------
    remaining = target_count - len(rows)
    print(f"[*] Planted patterns generated: {len(rows)} transactions.")
    print(f"[*] Synthesizing {remaining:,} legitimate INR background transactions...")

    pool_size = max(500, remaining // 4)
    user_pool = [f"USER_INR_{k:05d}" for k in range(1, pool_size + 1)]

    # Acyclic forward contacts for personal transfers
    user_contacts = {u: user_pool[(i + 1) % pool_size] for i, u in enumerate(user_pool)}

    utilities = [
        ("MERCHANT_BESCOM", "BESCOM Electric Bill"),
        ("MERCHANT_AIRTEL_PAY", "Airtel Postpaid / Broadband"),
        ("MERCHANT_JIO_RECHARGE", "Jio Prepaid Recharge"),
        ("MERCHANT_HP_PETROL", "HPCL Fuel Station UPI"),
        ("MERCHANT_ZEPTO_GROCERY", "Zepto Quick Delivery"),
        ("MERCHANT_BLINKIT_INSTA", "Blinkit Quick Delivery"),
        ("MERCHANT_BIGBASKET", "BigBasket Monthly Grocery"),
        ("MERCHANT_CRED_CARD", "CRED Credit Card Settlement")
    ]

    p2p_memos = [
        "UPI Payment",
        "Rent Share",
        "Dinner Split",
        "Travel Expenses",
        "Cab Share Uber",
        "Personal Transfer",
        "Chai & Snacks UPI",
        "Groceries Split",
        "Medical Store UPI"
    ]

    for _ in range(remaining):
        u = random.choice(user_pool)
        tx_type = random.random()
        day_offset = random.uniform(0.1, 28.0)
        t = base_time + timedelta(
            days=day_offset,
            hours=random.randint(6, 23),
            minutes=random.randint(0, 59),
            seconds=random.randint(0, 59)
        )

        if tx_type < 0.60:
            # 60% bill payments, merchants, groceries
            v, desc = random.choice(utilities)
            amt = round(random.uniform(50.0, 2800.0), 2)
        else:
            # 40% personal P2P UPI transfers
            v = user_contacts[u]
            desc = random.choice(p2p_memos)
            amt = round(random.uniform(100.0, 12500.0), 2)

        rows.append({
            "transaction_id": f"TXN-INR-{tx_counter:06d}",
            "sender_account": u,
            "receiver_account": v,
            "amount": f"{amt:.2f}",
            "timestamp": t.isoformat(),
            "currency": "INR",
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

    return output.getvalue()


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic transaction dataset in INR.")
    parser.add_argument("--count", type=int, default=50000, help="Number of transactions (default: 50000)")
    parser.add_argument("--output", type=str, default="samples/transactions_50000_inr.csv", help="Output path")
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"[*] Generating {args.count:,} INR transactions...")
    csv_content = generate_inr_transactions(target_count=args.count)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        f.write(csv_content)

    file_size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"[+] Successfully written {args.count:,} rows to: {output_path.resolve()}")
    print(f"[+] File size: {file_size_mb:.2f} MB")


if __name__ == "__main__":
    main()
