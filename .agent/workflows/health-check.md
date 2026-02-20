---
description: Run a project health check using chk
---

# Health Check

Run `chk` in the current project root to get a traffic-light health assessment.

// turbo
1. Run the health check:
```bash
chk
```

2. If any checks show ✖ (red) or ▲ (amber), review the details:
```bash
chk --verbose
```

3. Address any failing checks as appropriate before proceeding with work.
