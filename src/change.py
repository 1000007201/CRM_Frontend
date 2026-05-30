import re, os

BASE = ""

# ── 1. Dashboard.jsx — remove Pipeline Value and My Value KPI cards ───────────
f = f"pages/Dashboard.jsx"
src = open(f, encoding="utf-8").read()

# Remove "Pipeline Value" admin kpi
src = re.sub(
    r'\s*\{[\s\S]*?label:\s*"Pipeline Value"[\s\S]*?\},\n',
    '\n',
    src
)
# Remove "My Value" rep kpi
src = re.sub(
    r'\s*\{[\s\S]*?label:\s*"My Value"[\s\S]*?\},\n',
    '\n',
    src
)
open(f, 'w', encoding="utf-8").write(src)
print(f"  PATCHED  pages/Dashboard.jsx")

# ── 2. StatCard — change default color (was used for Pipeline Value) ──────────
# No structural change needed — just removing from Dashboard above

# ── 3. RecentLeads.jsx — remove Value column ──────────────────────────────────
f = f"components/dashboard/RecentLeads.jsx"
src = open(f, encoding="utf-8").read()
# Remove <th>Value</th>
src = src.replace('<th>Value</th>', '')
# Remove the value <td> block
src = re.sub(
    r'\s*\{/\* Value \*/\}[\s\S]*?</span>\s*</td>\n',
    '\n',
    src
)
# Simpler: remove any td that contains formatCurrency
src = re.sub(
    r'\s*<td>[\s\S]*?formatCurrency[\s\S]*?</td>',
    '',
    src
)
open(f, 'w', encoding="utf-8").write(src)
print(f"  PATCHED  components/dashboard/RecentLeads.jsx")

# ── 4. PipelineOverview.jsx — remove total value under stage mini-cards ────────
f = f"components/dashboard/PipelineOverview.jsx"
src = open(f, encoding="utf-8").read()
src = re.sub(r'\s*<p style=\{.*?\}>\s*\{formatCurrency\(value\)\}\s*</p>', '', src)
src = src.replace("import { formatCurrency, STAGE_META } from \"@/utils/formatters\";",
                  "import { STAGE_META } from \"@/utils/formatters\";")
open(f, 'w', encoding="utf-8").write(src)
print(f"  PATCHED  components/dashboard/PipelineOverview.jsx")

# ── 5. PipelineStats.jsx — remove Pipeline Value stat ─────────────────────────
f = f"components/pipeline/PipelineStats.jsx"
src = open(f, encoding="utf-8").read()
src = re.sub(
    r"\s*\{\s*label:\s*\"Pipeline Value\"[\s\S]*?\},",
    "",
    src
)
src = src.replace("import { formatCurrency } from \"@/utils/formatters\";", "")
open(f, 'w', encoding="utf-8").write(src)
print(f"  PATCHED  components/pipeline/PipelineStats.jsx")

# ── 6. KanbanCard.jsx — remove value display ──────────────────────────────────
f = f"components/pipeline/KanbanCard.jsx"
src = open(f, encoding="utf-8").read()
src = re.sub(
    r'\s*\{/\* Value \*/\}[\s\S]*?</p>\n',
    '\n',
    src
)
# Remove the value block that checks lead.value
src = re.sub(
    r'\s*\{lead\.value && \(\s*<p[\s\S]*?formatCurrency[\s\S]*?</p>\s*\)\}',
    '',
    src
)
src = src.replace("import { formatCurrency, timeAgo, SOURCE_LABELS } from \"@/utils/formatters\";",
                  "import { timeAgo, SOURCE_LABELS } from \"@/utils/formatters\";")
open(f, 'w', encoding="utf-8").write(src)
print(f"  PATCHED  components/pipeline/KanbanCard.jsx")

# ── 7. LeadTable.jsx — remove Value column ────────────────────────────────────
f = f"components/leads/LeadTable.jsx"
src = open(f, encoding="utf-8").read()
src = src.replace('<th>Value</th>', '')
src = re.sub(
    r'\s*\{/\* Value \*/\}[\s\S]*?</td>\n',
    '\n',
    src
)
src = re.sub(
    r'\s*<td>\s*<span style=\{[^}]*accent[^}]*\}>\s*\{lead\.value[^}]*formatCurrency[^}]*\}[^<]*</span>\s*</td>',
    '',
    src
)
src = src.replace("import { formatCurrency, timeAgo, SOURCE_LABELS } from \"@/utils/formatters\";",
                  "import { timeAgo, SOURCE_LABELS } from \"@/utils/formatters\";")
open(f, 'w', encoding="utf-8").write(src)
print(f"  PATCHED  components/leads/LeadTable.jsx")

# ── 8. LeadForm.jsx — remove Deal Value field ─────────────────────────────────
f = f"components/leads/LeadForm.jsx"
src = open(f, encoding="utf-8").read()
src = re.sub(
    r'\s*<div className="form-group">\s*<label[^>]*>Deal Value[\s\S]*?</div>\n',
    '\n',
    src
)
open(f, 'w', encoding="utf-8").write(src)
print(f"  PATCHED  components/leads/LeadForm.jsx")

# ── 9. LeadInfo.jsx — remove Deal Value from info panel ───────────────────────
f = f"components/leads/LeadInfo.jsx"
src = open(f, encoding="utf-8").read()
src = re.sub(
    r'\s*<InfoItem label="Deal Value"[\s\S]*?/>\n',
    '\n',
    src
)
src = src.replace("import { formatCurrency, formatDate, formatDateTime, SOURCE_LABELS } from \"@/utils/formatters\";",
                  "import { formatDate, formatDateTime, SOURCE_LABELS } from \"@/utils/formatters\";")
open(f, 'w', encoding="utf-8").write(src)
print(f"  PATCHED  components/leads/LeadInfo.jsx")

# ── 10. LeadDetailHeader.jsx — remove value badge ─────────────────────────────
f = f"components/leads/LeadDetailHeader.jsx"
src = open(f, encoding="utf-8").read()
src = re.sub(
    r'\s*\{lead\.value && \(\s*<span[^>]*accent[^>]*>[\s\S]*?</span>\s*\)\}',
    '',
    src
)
src = src.replace("import { formatCurrency, formatDate, formatDateTime, SOURCE_LABELS } from \"@/utils/formatters\";",
                  "import { formatDate, formatDateTime, SOURCE_LABELS } from \"@/utils/formatters\";")
open(f, 'w', encoding="utf-8").write(src)
print(f"  PATCHED  components/leads/LeadDetailHeader.jsx")

print("\nDone — price removed from all 10 locations")