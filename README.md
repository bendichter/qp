# qp

A multi-tenant AI chat platform that hosts specialized AI assistants, each accessible via different subdomains. Built with React, TypeScript, and Vite on the frontend, with a Next.js API backend.

## Chat Assistants

This repository supports eight specialized chat applications:

### 1. **stan-assistant** — https://stan-assistant.neurosift.app/

Technical assistant for [Stan](https://mc-stan.org/) probabilistic programming. Provides guidance and code examples based on the Stan User's Guide and Reference Manual.

### 2. **nwb-assistant** — https://nwb-assistant.neurosift.app/

Assistant for [Neurodata Without Borders (NWB)](https://www.nwb.org/). Helps with PyNWB and related tools. Includes Jupyter integration for running Python code.

### 3. **neurosift-chat** — https://chat.neurosift.app/

Explores and queries neuroscience datasets across DANDI Archive, OpenNeuro, and EBRAINS repositories. Features dataset search, NWB file analysis, and data visualization capabilities.

### 4. **dandiset-explorer** — https://dandiset-explorer.neurosift.app/

Specialized assistant for exploring specific Dandisets with Python/Jupyter integration.

### 5. **test-chat** — https://test-chat.neurosift.app/

Development testing assistant with Jupyter support.

### 6. **figpack-assistant** — https://figpack-assistant.neurosift.app/

Assistant for [Figpack](https://flatironinstitute.github.io/figpack/).

### 7. **bids-assistant** — https://bids-assistant.neurosift.app/

Assistant for the [Brain Imaging Data Structure (BIDS)](https://bids.neuroimaging.io/) specification. Helps with organizing neuroimaging data according to BIDS standards.

### 8. **repronim-assistant** — https://repronim-assistant.neurosift.app/

Assistant for [ReproNim](https://repronim.org/) (Reproducible Neuroimaging). Helps with reproducibility tools and best practices including HeuDiConv, DataLad, Neurodocker, and related projects for data conversion, version control, and containerization.

## Architecture

- **Frontend**: React + Vite + TypeScript single-page application
- **Backend**: Next.js API (`nextjs/qp-api/`) handling chat persistence and LLM requests
- **Routing**: Subdomain-based assistant selection (e.g., `stan-assistant.vercel.app`)
- **LLM Integration**: OpenRouter for model flexibility
- **Storage**: MongoDB for chat history
- **Tools**: Custom tools per assistant (document retrieval, Python execution, dataset queries)

## Development

```bash
# Frontend
npm install
npm run dev

# Backend API
cd nextjs/qp-api
npm install
npm run dev
```

## Deployment

The frontend is automatically deployed to Cloudflare Pages when changes are pushed to the `main` branch via GitHub Actions. See [DEPLOYMENT.md](DEPLOYMENT.md) for setup instructions and details.
