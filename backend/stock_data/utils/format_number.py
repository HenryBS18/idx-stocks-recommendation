import pandas as pd

def format_number(val):
  if pd.isna(val) or val == 0:
    return "0.00"
  
  abs_val = abs(val)
  if abs_val >= 1e12:
    return f"{val / 1e12:.2f}T"
  elif abs_val >= 1e9:
    return f"{val / 1e9:.2f}B"
  elif abs_val >= 1e6:
    return f"{val / 1e6:.2f}M"
  elif abs_val >= 1e3:
    return f"{val / 1e3:.2f}K"
  return f"{val:.2f}"