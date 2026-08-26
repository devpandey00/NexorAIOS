# NexorAIOS Deployment Health

Deployment trigger checkpoint. Production should deploy from `main` and expose the API/web application through the linked Vercel project.

External Docker services (Postgres/Redis/MinIO/n8n) are intentionally separate from Vercel and require a Docker-capable runtime. They are defined in the repository compose files and are not claimed as running until their health checks pass.
