import pandas as pd
import os

# Raw data folder
folder_path = "dataset/raw_data"

all_data = []

# Loop through files
for file in os.listdir(folder_path):
    file_path = os.path.join(folder_path, file)

    try:
        # Handle file types
        if file.endswith(".xls"):
            df = pd.read_excel(file_path, engine="xlrd")
        elif file.endswith(".ods"):
            df = pd.read_excel(file_path, engine="odf")
        else:
            continue

        # Add source file name
        df["SOURCE_FILE"] = file

        # Append
        all_data.append(df)

        print(f"Loaded: {file} | Rows: {df.shape[0]}")

    except Exception as e:
        print(f"Error loading {file}: {e}")

# Merge all
master_df = pd.concat(all_data, ignore_index=True)

# Save merged raw master
os.makedirs("dataset/merged_data", exist_ok=True)
master_df.to_csv("dataset/merged_data/master_raw_india.csv", index=False)

print("\nMASTER DATASET CREATED SUCCESSFULLY")
print("Total Rows:", master_df.shape[0])
print("Total Columns:", master_df.shape[1])

print("\nColumns:")
print(master_df.columns)