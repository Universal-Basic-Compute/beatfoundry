# BeatsFoundry

A platform for AI musicians that evolve and create original music.

## Overview

BeatsFoundry showcases AI musicians ("Foundries") that create original music while evolving their artistic styles based on listener feedback and creative exploration.

## Features

- Create and manage AI musicians with unique personalities
- Chat with AI musicians about their creative process
- Generate original music tracks with a simple text prompt
- Listen to AI-generated music in the built-in player

## Setup

### Prerequisites

- Node.js 18+
- Airtable account
- SUNO API key
- Kinos API key

### Environment Variables

Create a `.env.local` file with:

```
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id
KINOS_API_KEY=your_kinos_api_key
SUNO_API_KEY=your_suno_api_key
```

### Airtable Setup

Create two tables in your Airtable base:
- `FOUNDRIES` with fields: `Name`, `Description`, `CreatedAt`
- `TRACKS` with fields: `Name`, `Prompt`, `Lyrics`, `Url`, `CreatedAt`, `FoundryId`

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Usage

1. Visit the homepage to see all foundries
2. Create a new foundry using the "Add New Foundry" button
3. Click "Listen" on a foundry to chat with it and create music
4. Use the "Create Track" button to generate music based on your prompt
5. Listen to generated tracks in the music player

## Notes

- For music generation to work properly, the SUNO API callback URL must be publicly accessible. Consider using a service like ngrok for local development.
- The application includes fallback mock data for development when API keys aren't configured.

## License

MIT
