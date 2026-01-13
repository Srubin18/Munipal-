# MUNIPAL - Municipal Bill Verification System

AI-powered municipal bill verification for City of Johannesburg residents. Upload your bill, get instant verification against official tariffs with full citations.

## Features

- **Bill Parsing**: Extracts line items from CoJ municipal bills (electricity, water, sanitation, refuse, property rates)
- **Official Tariff Database**: Ingests and indexes official CoJ tariff documents with full citations
- **Verification Engine**:
  - Arithmetic checks (line items sum correctly)
  - VAT calculation verification (accounts for VAT-exempt services like property rates)
  - Tariff compliance checking against official rates
- **Full Citations**: Every verification finding includes document ID, source URL, page number, and exact excerpt

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma (Supabase)
- **Authentication**: Supabase Auth
- **PDF Ingestion**: Firecrawl API
- **Deployment**: Vercel

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   │   ├── admin/         # Admin APIs (documents, tariffs, sync)
│   │   ├── bills/         # Bill upload and analysis
│   │   └── test/          # Test endpoint
│   ├── admin/             # Admin dashboard
│   ├── dashboard/         # User dashboard
│   └── test/              # Test page
├── components/            # React components
├── lib/
│   ├── knowledge/         # Tariff knowledge base
│   │   ├── official-sources.ts    # CoJ document URLs
│   │   ├── tariff-extraction.ts   # Extract tariffs from PDFs
│   │   └── rule-matcher.ts        # Match charges to tariff rules
│   ├── parsers/           # Bill parsing
│   │   └── coj-bill.ts    # CoJ bill PDF parser
│   └── verification/      # Verification engine
│       ├── engine.ts      # Main verification orchestrator
│       └── checks/        # Individual verification checks
├── prisma/
│   └── schema.prisma      # Database schema
└── scripts/               # Utility scripts
    ├── e2e-verification-proof.ts  # End-to-end verification demo
    └── extract-tariffs.ts         # Tariff extraction script
```

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Set up your environment variables (see `.env.example`)
5. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
6. Run database migrations:
   ```bash
   npx prisma db push
   ```
7. Start development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string (with pgbouncer)
- `DIRECT_URL` - Direct PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `FIRECRAWL_API_KEY` - For PDF document ingestion
- `OPENAI_API_KEY` - For AI-powered extraction

## Key Concepts

### Bill Parsing
The CoJ bill parser (`src/lib/parsers/coj-bill.ts`) handles:
- Multiple service types in a single bill
- VAT-exempt services (property rates at 0% VAT)
- Different section formats (Pikitup, City Power, JHB Water)

### Verification Process
1. **Parse Bill**: Extract line items with amounts and service types
2. **Match Rules**: Find applicable tariff rules by provider, category, financial year
3. **Calculate Expected**: Use official tariff bands to calculate expected charges
4. **Compare**: Report findings with VERIFIED/LIKELY_WRONG/CANNOT_VERIFY status
5. **Cite Sources**: Include full citation with every finding

### VAT Handling
- Most services: 15% VAT
- Property rates: 0% VAT (exempt)
- System correctly handles mixed VAT scenarios

## Testing

Test the bill verification at `/test` page or use the E2E proof script:

```bash
npx tsx scripts/e2e-verification-proof.ts
```

## Deployment

Deployed on Vercel at https://www.munipal.tech

## License

Proprietary - All rights reserved
