## 2026-04-20 - Task 0
- Record the IP-based Grafana URL (`http://10.0.0.161:3000/login`) as the Task 12 browser target because the `docker-vm` hostname does not resolve from the agent environment.
- Use the repo virtualenv (`/repos/oig-cloud/.venv/bin`) for baseline commands; the system interpreter lacked project test dependencies and produced collection failures before the venv-backed run.
- Treat Loki rendered-text proof as explicitly deferred instead of fabricating synthetic log injection, matching the plan's requirement for a supported warning path only.
