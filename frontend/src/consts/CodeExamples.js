// CodeExamples.js or top of EditorTab.js

export const JAVASCRIPT_EXAMPLE = `// Example JavaScript script
function processData(input) {
  const result = {
    processed: true,
    data: input,
    timestamp: new Date().toISOString()
  };
  return result;
}

// Main execution
return processData(data);`;

export const PYTHON_EXAMPLE = `# Example Python script
import json
from datetime import datetime

def process_workflow_data(context_data):
    """Process workflow data and return formatted result"""
    workflow_data = context_data.get("workflow_data", {})
    processed_data = {}

    for key, value in workflow_data.items():
        if isinstance(value, str):
            processed_data[key] = value.strip().title()
        elif isinstance(value, (int, float)):
            processed_data[f"{key}_formatted"] = f"{value:,.2f}"
        else:
            processed_data[key] = value

    result = {
        "original_data": workflow_data,
        "processed_data": processed_data,
        "processing_timestamp": datetime.now().isoformat()
    }

    print(f"Processed {len(workflow_data)} fields")
    return result

# Main execution
return process_workflow_data(context)`;

export const SQL_EXAMPLE = `-- Example SQL query
SELECT 
    id,
    name,
    email,
    created_at,
    CASE 
        WHEN status = 'active' THEN 'Active User'
        WHEN status = 'inactive' THEN 'Inactive User'
        ELSE 'Unknown Status'
    END as display_status,
    DATEDIFF(NOW(), created_at) as days_since_creation
FROM workflow_instances
WHERE created_at >= :start_date 
  AND created_at <= :end_date
  AND status IN ('active', 'inactive')
ORDER BY created_at DESC
LIMIT 100;`;

export const SHELL_EXAMPLE = `#!/bin/bash
# Example shell script for workflow processing

INPUT_FILE="$1"
OUTPUT_FILE="$2"
LOG_LEVEL="\${3:-INFO}"

log_message() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$LOG_LEVEL] $1"
}

if [ ! -f "$INPUT_FILE" ]; then
  log_message "ERROR: Input file '$INPUT_FILE' not found"
  exit 1
fi

if [ -z "$OUTPUT_FILE" ]; then
  log_message "ERROR: Output file not specified"
  exit 1
fi

log_message "Processing $INPUT_FILE..."
grep -v "^#" "$INPUT_FILE" | grep -v "^$" | sort > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
  LINES_PROCESSED=$(wc -l < "$OUTPUT_FILE")
  log_message "Processing complete. $LINES_PROCESSED lines written to $OUTPUT_FILE"
  exit 0
else
  log_message "ERROR: Processing failed"
  exit 1
fi`;
