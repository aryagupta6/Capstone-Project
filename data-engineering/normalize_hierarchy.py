import pandas as pd
import os

# Load final village-only dataset
file_path = "dataset/final_data/india_villages_only.csv"
df = pd.read_csv(file_path, low_memory=False)

# Standardize codes
df["MDDS STC"] = df["MDDS STC"].astype(str).str.replace(".0", "", regex=False).str.zfill(2)
df["MDDS DTC"] = df["MDDS DTC"].astype(str).str.replace(".0", "", regex=False).str.zfill(3)
df["MDDS Sub_DT"] = df["MDDS Sub_DT"].astype(str).str.replace(".0", "", regex=False).str.zfill(5)
df["MDDS PLCN"] = df["MDDS PLCN"].astype(str).str.replace(".0", "", regex=False).str.zfill(6)

# STATES
states = df[["MDDS STC", "STATE NAME"]].drop_duplicates()
states.columns = ["state_code", "state_name"]

# DISTRICTS
districts = df[["MDDS DTC", "DISTRICT NAME", "MDDS STC"]].drop_duplicates()
districts.columns = ["district_code", "district_name", "state_code"]

# SUBDISTRICTS
subdistricts = df[["MDDS Sub_DT", "SUB-DISTRICT NAME", "MDDS DTC"]].drop_duplicates()
subdistricts.columns = ["subdistrict_code", "subdistrict_name", "district_code"]

# VILLAGES
villages = df[["MDDS PLCN", "Area Name", "MDDS Sub_DT"]].drop_duplicates()
villages.columns = ["village_code", "village_name", "subdistrict_code"]

# Save outputs
os.makedirs("dataset/normalized_data", exist_ok=True)

states.to_csv("dataset/normalized_data/states.csv", index=False)
districts.to_csv("dataset/normalized_data/districts.csv", index=False)
subdistricts.to_csv("dataset/normalized_data/subdistricts.csv", index=False)
villages.to_csv("dataset/normalized_data/villages.csv", index=False)

print("NORMALIZATION COMPLETE")
print("States:", states.shape)
print("Districts:", districts.shape)
print("SubDistricts:", subdistricts.shape)
print("Villages:", villages.shape)