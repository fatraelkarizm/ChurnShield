"""Post-build step for ChurnShield.flow.

Every node with an outgoing `error` edge needs inputs.errorHandlingEnabled = true.
`compile` + one `uip maestro flow format` leaves it unset on the inline agent nodes, and a
second `format` sets it but also drops the Gmail connection bindings, so it is set here instead.

Usage (from the project folder): python .flow-sdk/enable-error-handlers.py ChurnShield.flow
"""
import json
import sys

path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    flow = json.load(f)

sources = {e["sourceNodeId"] for e in flow.get("edges", []) if e.get("sourcePort") == "error"}
changed = []
for node in flow["nodes"]:
    if node["id"] in sources:
        inputs = node.setdefault("inputs", {})
        if inputs.get("errorHandlingEnabled") is not True:
            inputs["errorHandlingEnabled"] = True
            changed.append(node["id"])

with open(path, "w", encoding="utf-8") as f:
    json.dump(flow, f, indent=2, ensure_ascii=False)
    f.write("\n")
print("errorHandlingEnabled set on:", ", ".join(changed) or "(none needed)")
