/**
 * Dependency-cruiser rules encoding the Clean Architecture dependency rule
 * for the ANVESA backend (Requirement 31.1-31.3).
 *
 * Allowed direction (source may depend on target):
 *   presentation -> application -> domain
 *   infrastructure -> domain            (implements ports)
 *   application    -> domain
 * Forbidden:
 *   domain -> {application, infrastructure, presentation}
 *   application -> {presentation, infrastructure}   (only domain-declared ports)
 *   presentation -> {domain, infrastructure} directly
 *   any persistence (prisma) access outside infrastructure
 */
module.exports = {
  forbidden: [
    {
      name: 'domain-stays-pure',
      comment: 'Domain must not depend on outer layers or frameworks.',
      severity: 'error',
      from: { path: '^backend/src/domain' },
      to: {
        path: '^backend/src/(application|infrastructure|presentation)',
      },
    },
    {
      name: 'application-no-outer',
      comment: 'Application may depend on domain only, never on outer layers.',
      severity: 'error',
      from: { path: '^backend/src/application' },
      to: { path: '^backend/src/(infrastructure|presentation)' },
    },
    {
      name: 'presentation-no-direct-infra',
      comment: 'Presentation must go through application, not infrastructure/domain directly.',
      severity: 'error',
      from: { path: '^backend/src/presentation' },
      to: { path: '^backend/src/(infrastructure)' },
    },
    {
      name: 'no-prisma-outside-infra',
      comment: 'Persistence (Prisma) may only be accessed inside the infrastructure layer.',
      severity: 'error',
      from: { pathNot: '^backend/src/infrastructure' },
      to: { path: '@prisma/client|^backend/src/infrastructure/prisma' },
    },
    {
      name: 'no-orphans',
      comment: 'Modules should be reachable.',
      severity: 'warn',
      from: { orphan: true, pathNot: '\\.(d\\.ts|test\\.ts|spec\\.ts)$' },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'backend/tsconfig.json' },
  },
};
