#!/usr/bin/env python3
"""
MuleNet - IBM AML Kaggle Dataset Extraction Utility

This standalone script downloads or locates the IBM Transactions for Anti-Money Laundering (AML)
dataset from Kaggle and extracts a representative, balanced slice (fraud + noise)
ready for direct ingestion into MuleNet without column modification.

Usage:
    python extract_kaggle_sample.py [--size 5000] [--output samples/ibm_aml_sample.csv]

Requirements (optional):
    pip install kagglehub pandas
"""

import os
import sys
import argparse
import csv
from pathlib import Path


def locate_or_download_dataset() -> str:
    """Attempts to locate the dataset via kagglehub or prompt user."""
    try:
        import kagglehub
        print("[*] Checking / downloading IBM AML dataset via kagglehub...")
        dataset_path = kagglehub.dataset_download("ealtman2019/ibm-transactions-for-anti-money-laundering-aml")
        print(f"[+] Dataset located at: {dataset_path}")
        return dataset_path
    except ImportError:
        print("[!] 'kagglehub' is not installed. To auto-download, run: pip install kagglehub")
        return ""
    except Exception as e:
        print(f"[!] Error downloading dataset with kagglehub: {e}")
        return ""


def find_target_csv(dataset_dir: str) -> Path:
    """Finds HI-Small_Trans.csv or another available IBM transaction CSV."""
    d = Path(dataset_dir)
    # Prefer HI-Small_Trans.csv (Smallest ~5M rows)
    candidates = list(d.rglob("*HI-Small_Trans.csv")) or list(d.rglob("*Trans.csv")) or list(d.rglob("*.csv"))
    if not candidates:
        raise FileNotFoundError(f"No CSV transaction files found inside: {dataset_dir}")
    return candidates[0]


def extract_slice(input_csv_path: Path, output_csv_path: Path, target_rows: int = 5000):
    """
    Extracts a slice containing both laundering and legitimate transactions.
    Preserves original IBM column headers for native MuleNet ingestion.
    """
    print(f"[*] Reading from: {input_csv_path}")
    print(f"[*] Target slice size: {target_rows} rows")

    output_csv_path.parent.mkdir(parents=True, exist_ok=True)

    fraud_rows = []
    normal_rows = []
    headers = []

    # Desired fraud ratio in slice ~10-20% to test detector recall
    target_fraud = max(10, int(target_rows * 0.15))
    target_normal = target_rows - target_fraud

    with open(input_csv_path, mode="r", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        try:
            headers = next(reader)
        except StopIteration:
            print("[!] Input CSV is empty.")
            return

        # Find "Is Laundering" column index
        laundering_idx = -1
        for idx, h in enumerate(headers):
            if "laundering" in h.lower():
                laundering_idx = idx
                break

        print(f"[*] Header detected: {len(headers)} columns. 'Is Laundering' column at index: {laundering_idx}")

        count = 0
        for row in reader:
            if not row or len(row) < len(headers):
                continue

            count += 1
            is_laundering = False
            if laundering_idx != -1 and laundering_idx < len(row):
                val = row[laundering_idx].strip()
                is_laundering = val in ("1", "true", "True")

            if is_laundering:
                if len(fraud_rows) < target_fraud:
                    fraud_rows.append(row)
            else:
                if len(normal_rows) < target_normal:
                    normal_rows.append(row)

            if len(fraud_rows) >= target_fraud and len(normal_rows) >= target_normal:
                break

            if count % 500000 == 0:
                print(f"    Processed {count:,} rows... Found {len(fraud_rows)} fraud, {len(normal_rows)} normal")

    combined = fraud_rows + normal_rows
    # Sort chronologically by the first column (Timestamp)
    try:
        combined.sort(key=lambda r: r[0])
    except Exception:
        pass

    with open(output_csv_path, mode="w", newline="", encoding="utf-8") as out_f:
        writer = csv.writer(out_f)
        writer.writerow(headers)
        writer.writerows(combined)

    print(f"[+] Successfully extracted {len(combined)} transactions ({len(fraud_rows)} fraud, {len(normal_rows)} normal)")
    print(f"[+] Output saved to: {output_csv_path.resolve()}")


def main():
    parser = argparse.ArgumentParser(description="Extract a slice of IBM AML transactions for MuleNet analysis.")
    parser.add_argument("--size", type=int, default=5000, help="Number of rows to extract (default: 5000, up to 100000)")
    parser.add_argument("--dataset-dir", type=str, default="", help="Path to IBM AML dataset directory (optional)")
    parser.add_argument("--output", type=str, default="samples/ibm_aml_sample.csv", help="Output path (default: samples/ibm_aml_sample.csv)")

    args = parser.parse_args()

    dataset_dir = args.dataset_dir
    if not dataset_dir:
        dataset_dir = locate_or_download_dataset()

    if not dataset_dir or not os.path.isdir(dataset_dir):
        print("\n[!] Dataset directory not available.")
        print("    You can either:")
        print("    1. Install kagglehub: `pip install kagglehub` and re-run this script")
        print("    2. Manually download from https://www.kaggle.com/datasets/ealtman2019/ibm-transactions-for-anti-money-laundering-aml")
        print("       and run: python extract_kaggle_sample.py --dataset-dir /path/to/extracted/folder")
        sys.exit(1)

    target_csv = find_target_csv(dataset_dir)
    output_path = Path(args.output)
    extract_slice(target_csv, output_path, target_rows=args.size)


if __name__ == "__main__":
    main()
