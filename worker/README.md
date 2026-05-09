# Worker Service Docs

This folder contains the documentation-first blueprint for the new worker service.

Target stack:
- AWS SQS (queue)
- AWS Lambda (consumer runtime)
- AWS SES (email delivery)
- react-email (template authoring)
- TypeScript end-to-end

## Docs Index

- `WORKER_IMPLEMENTATION_PLAN.md`
  - Full phased implementation plan
  - Environment setup
  - Deployment and rollout strategy
- `MODELS_AND_CONTRACTS.md`
  - Message models, event types, validation contracts
  - Error handling and retry behavior
- `SERVERLESS_INFRA_PLAN.md`
  - `serverless.yml` design
  - IAM, SQS, DLQ, Lambda trigger, alarms

## Proposed Worker Structure

```text
worker/
├── src/
│   ├── index.ts
│   ├── contracts/
│   │   └── emailJob.ts
│   ├── handlers/
│   │   ├── loginInvitation.ts
│   │   ├── forgotPassword.ts
│   │   └── resetPassword.ts
│   ├── templates/
│   │   ├── InviteEmail.tsx
│   │   ├── ForgotPasswordEmail.tsx
│   │   └── ResetPasswordEmail.tsx
│   ├── services/
│   │   ├── mailer.ts
│   │   ├── idempotency.ts
│   │   └── messageRouter.ts
│   ├── config/
│   │   └── env.ts
│   └── lib/
│       └── logger.ts
├── serverless.yml
├── tsconfig.json
├── package.json
└── .env.example
```

## Recommended Dependency Direction

- Keep:
  - `@aws-sdk/client-ses`
  - `@react-email/components`
  - `@react-email/render`
  - `react`, `react-dom`
  - `@types/aws-lambda`
  - `typescript`, `serverless`, `serverless-plugin-typescript`
- Optional:
  - `nodemailer` (if SMTP path is required)
  - `@aws-sdk/client-sqs` (only needed if publishing to SQS from Lambda)
- Add:
  - `zod` for env + payload validation
  - `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` for idempotency tracking

## Suggested Implementation Order

1. Read `WORKER_IMPLEMENTATION_PLAN.md`.
2. Implement contracts and payload validation from `MODELS_AND_CONTRACTS.md`.
3. Implement infra in `SERVERLESS_INFRA_PLAN.md`.
4. Connect backend producer to SQS contract.
5. Run staged rollout (invite first, then reset/forgot flows).
