import os
from app.generator.test_data_generator import generate_synthetic_transactions

def generate_sample_files():
    os.makedirs("samples", exist_ok=True)
    
    for count in [100, 1000, 5000, 10000]:
        print(f"Generating {count} transaction sample...")
        csv_data, _ = generate_synthetic_transactions(target_count=count)
        filepath = f"samples/transactions_{count}.csv"
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(csv_data)
        print(f"Saved {filepath}")

if __name__ == "__main__":
    generate_sample_files()
