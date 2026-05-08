import pandas as pd
import os

# Load cleaned dataset
file_path = "dataset/cleaned_data/master_cleaned_india.csv"
df = pd.read_csv(file_path, low_memory=False)

print("Before Village Filtering:", df.shape)

# Check sample unique problematic values
print("\nSample MDDS PLCN values:")
print(df["MDDS PLCN"].head(20))

# Convert safely
df["MDDS PLCN"] = (
    df["MDDS PLCN"]
    .astype(str)
    .str.replace(".0", "", regex=False)
    .str.strip()
    .str.zfill(6)
)

print("\nAfter Standardization Sample:")
print(df["MDDS PLCN"].head(20))

# Remove hierarchy rows
df_villages = df[df["MDDS PLCN"] != "000000"]

print("\nAfter Village Filtering:", df_villages.shape)

# Save final dataset
os.makedirs("dataset/final_data", exist_ok=True)
df_villages.to_csv("dataset/final_data/india_villages_only.csv", index=False)

print("\nFINAL VILLAGE DATASET CREATED SUCCESSFULLY")
print("Saved at: dataset/final_data/india_villages_only.csv")