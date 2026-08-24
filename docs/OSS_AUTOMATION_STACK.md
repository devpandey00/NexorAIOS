# NexorAIOS OSS Automation Stack

This document records the selected open-source building blocks that NexorAIOS can integrate without replacing the existing product architecture.

## Selected foundations

- LangGraph (`langchain-ai/langgraph`) — durable/stateful AI workflow orchestration and approval-aware agent graphs.
- Crawlee (`apify/crawlee`) — TypeScript web crawling and extraction for research, lead discovery and opportunity ingestion.
- Firecrawl (`firecrawl/firecrawl`) — web-to-markdown/content extraction for research and enrichment.
- Qdrant (`qdrant/qdrant`, `qdrant/qdrant-js`) — vector retrieval for long-term knowledge and semantic memory.
- LlamaIndex (`run-llama/llama_index`) — document ingestion/retrieval pipelines where they add value beyond the existing AI package.
- n8n (`n8n-io/n8n`) — optional external workflow/integration runtime; Nexor remains the product control plane.
- Playwright (`microsoft/playwright`) — browser automation and end-to-end verification.
- OpenTelemetry (`open-telemetry/opentelemetry-js`) — traces/metrics for agent and workflow execution.

## Integration rule

Do not vendor entire external applications into the NexorAIOS monorepo. Prefer maintained npm packages, SDKs, HTTP/MCP adapters, and isolated service boundaries. NexorAIOS remains the source of truth for authentication, permissions, CRM state, workflow state, approvals, and audit history.

## Deferred candidates

CrewAI, Twenty CRM, Skyvern and similar systems are not installed by default because they overlap with existing NexorAIOS capabilities or add another orchestration/control plane. They should only be introduced when a concrete feature gap is verified.

## Verification requirement

Every integration must have:

1. a configuration/health check;
2. typed adapter boundaries;
3. unit/integration coverage for critical paths;
4. failure and timeout handling;
5. no fake success states;
6. production-safe secrets handling.
