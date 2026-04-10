import os

file_path = r'c:\Users\cassi\teste\style.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace .hotspot-marker block
import re
pattern = re.compile(r'\.hotspot-marker\s*\{[^}]*\}', re.DOTALL)
new_marker = """.hotspot-marker {
    width: 20px;
    height: 20px;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}"""
content = pattern.sub(new_marker, content)

# Replace .hotspot-marker::after block
pattern_after = re.compile(r'\.hotspot-marker::after\s*\{[^}]*\}', re.DOTALL)
new_after = """.hotspot-marker::after {
    content: '';
    width: 8px;
    height: 8px;
    background: #22c55e;
    border-radius: 50%;
    box-shadow: 0 0 10px #22c55e, 0 0 20px rgba(34, 197, 94, 0.6);
}"""
content = pattern_after.sub(new_after, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement complete.")
