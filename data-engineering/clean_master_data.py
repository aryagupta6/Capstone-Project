import pandas as pd
import os

# Load merged raw data
file_path = "dataset/merged_data/master_raw_india.csv"
df = pd.read_csv(file_path)

print("Original Shape:", df.shape)

# Keep only required columns
required_columns = [
    "MDDS STC",
    "STATE NAME",
    "MDDS DTC",
    "DISTRICT NAME",
    "MDDS Sub_DT",
    "SUB-DISTRICT NAME",
    "MDDS PLCN",
    "Area Name",
    "SOURCE_FILE"
]

df = df[required_columns]

# Drop fully empty rows
df.dropna(how="all", inplace=True)

# Standardize text columns
text_columns = [
    "STATE NAME",
    "DISTRICT NAME",
    "SUB-DISTRICT NAME",
    "Area Name"
]

for col in text_columns:
    df[col] = df[col].astype(str).str.strip().str.title()

# Remove duplicates
df.drop_duplicates(inplace=True)

print("After Cleaning Shape:", df.shape)

# Save cleaned master
os.makedirs("dataset/cleaned_data", exist_ok=True)
df.to_csv("dataset/cleaned_data/master_cleaned_india.csv", index=False)

print("\nCLEANED DATASET CREATED SUCCESSFULLY")
print("Saved at: dataset/cleaned_data/master_cleaned_india.csv")