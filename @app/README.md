# @app

This folder contains the various components (aka "packages") of our project. We
use [yarn workspaces](https://yarnpkg.com/lang/en/docs/workspaces/) to manage
this monorepo, to help us to keep things separate without slowing development
speed. All components of this project are named `@app/*` so that we can
reference them from each other in a straightforward manner, e.g.

```ts
import { useAppQuery } from "@/appgraphqlgenerated";
```

## Packages

- [@app/config](./config/README.md) - shared configuration for the entire stack,
  powered by [dotenv](https://github.com/motdotla/dotenv)
- [@app/client](./client/README.md) - the React frontend, powered by
  [Next.js](https://nextjs.org/)
- [@/appgraphqlgenerated](./graphql/README.md) - the autogenerated GraphQL types and
  Apollo React hooks, powered by
  [graphql-code-generator](https://github.com/dotansimha/graphql-code-generator)
- [@app/server](./server/README.md) - the Node.js backend and tests, powered by
  [Express](https://expressjs.com/), [Passport](http://www.passportjs.org/) and
  [PostGraphile](https://www.graphile.org/postgraphile/) (provides auth,
  GraphQL, SSR, etc)
- [@app/worker](./worker/README.md) - job queue (e.g. for sending emails),
  powered by [graphile-worker](https://github.com/graphile/worker)
- [@app/db](./db/README.md) - database migrations and tests, powered by
  [graphile-migrate](https://github.com/graphile/migrate)
- [@app/e2e](./e2e/README.md) - end-to-end tests for the entire stack, powered
  by [Cypress](https://www.cypress.io/)
- [@app/\_\_tests\_\_](./__tests__/README.md) - some test helpers
