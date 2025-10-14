export interface FrameworkSkillContext {
  frameworks?: string[];
  languages?: string[];
}

export interface FrameworkSkillPlan {
  title: string;
  description: string;
  impact: string;
  actionItems: string[];
  usedFrameworks: string[];
}

const formatList = (items: string[], max = 3): string => {
  if (items.length === 0) {
    return '';
  }
  const limited = items.slice(0, max);
  if (limited.length === 1) {
    return limited[0];
  }
  if (limited.length === 2) {
    return `${limited[0]} and ${limited[1]}`;
  }
  return `${limited.slice(0, -1).join(', ')}, and ${limited[limited.length - 1]}`;
};

export const buildFrameworkSkillPlan = (
  context: FrameworkSkillContext
): FrameworkSkillPlan => {
  const frameworks = Array.from(
    new Set((context.frameworks ?? []).map((f) => f.trim()).filter(Boolean))
  );
  const languages = Array.from(
    new Set((context.languages ?? []).map((l) => l.trim()).filter(Boolean))
  );

  const plan: FrameworkSkillPlan = {
    title: '',
    description: '',
    impact: '',
    actionItems: [],
    usedFrameworks: frameworks,
  };

  if (frameworks.length > 0) {
    const formattedList = formatList(frameworks);
    plan.title = `Deepen expertise in ${formattedList}`;
    plan.description = `The repository already uses ${formattedList}, but the Frameworks & Libraries gap shows there is room to apply these tools more comprehensively.`;
    plan.impact = `Strengthening your ${formattedList} proficiency lets you implement advanced patterns, improve maintainability, and showcase delivery-ready practices in this codebase.`;

    const handledCategories = new Set<string>();
    frameworks.forEach((framework) => {
      const lower = framework.toLowerCase();
      if ((lower.includes('spring boot') || lower.includes('spring framework')) && !handledCategories.has('spring')) {
        handledCategories.add('spring');
        plan.actionItems.push(
          'Refactor a core service or controller using Spring Boot best practices (profiles, validation, exception handling).',
          'Add integration tests with Spring Test and document the application context wiring.',
          'Describe build and deployment steps (Maven/Gradle) in the README to highlight operational maturity.'
        );
      } else if (lower.includes('react') && !handledCategories.has('react')) {
        handledCategories.add('react');
        plan.actionItems.push(
          'Introduce typed hooks or component patterns (TypeScript/PropTypes) for a complex UI flow.',
          'Add React Testing Library coverage for interaction-heavy components.',
          'Document the React architecture (state management, routing) to explain design choices.'
        );
      } else if (lower.includes('next') && !handledCategories.has('next')) {
        handledCategories.add('next');
        plan.actionItems.push(
          'Adopt the recommended Next.js data-fetching approach (e.g. Server Components or Route Handlers) in at least one feature.',
          'Configure dynamic metadata/SEO and document deployment steps (Vercel/Node) for the app.',
          'Add integration tests (Playwright/Cypress) covering a full Next.js user flow.'
        );
      } else if (lower.includes('django') && !handledCategories.has('django')) {
        handledCategories.add('django');
        plan.actionItems.push(
          'Modularize the Django project into reusable apps and ensure migrations are committed.',
          'Add Django TestCase-based integration tests with fixtures to cover critical endpoints.',
          'Document local setup, management commands, and deployment instructions (Gunicorn/ASGI).'
        );
      } else if (lower.includes('flask') && !handledCategories.has('flask')) {
        handledCategories.add('flask');
        plan.actionItems.push(
          'Restructure the Flask app using blueprints and application factories.',
          'Add pytest-based unit tests for routes/services and wire them into CI.',
          'Document environment variables and production runtime guidance for Flask.'
        );
      } else if (lower.includes('fastapi') && !handledCategories.has('fastapi')) {
        handledCategories.add('fastapi');
        plan.actionItems.push(
          'Add Pydantic models and validation to existing FastAPI endpoints.',
          'Implement async dependencies and document how to run the FastAPI server (uvicorn).',
          'Write integration tests using httpx/pytest covering core APIs.'
        );
      } else if (lower.includes('angular') && !handledCategories.has('angular')) {
        handledCategories.add('angular');
        plan.actionItems.push(
          'Adopt Angular reactive forms or signals in a core component.',
          'Add Jest/Cypress tests for Angular components and CI integration.',
          'Document module boundaries and lazy-loading strategy in the repository.'
        );
      } else if (lower.includes('vue') && !handledCategories.has('vue')) {
        handledCategories.add('vue');
        plan.actionItems.push(
          'Refactor key Vue components to the Composition API or `<script setup>` syntax.',
          'Add unit tests with Vitest/Jest and component snapshots where appropriate.',
          'Document build and deployment steps (Vite/Vue CLI) for collaborators.'
        );
      } else if ((lower.includes('node.js') || lower === 'node') && !handledCategories.has('node')) {
        handledCategories.add('node');
        plan.actionItems.push(
          'Organize Node.js modules into controllers, services, and repositories for clearer boundaries.',
          'Add automated tests (Jest/Vitest) for critical business logic and run them in CI.',
          'Document environment configuration and production process manager usage (PM2/Nodemon).'
        );
      } else {
        plan.actionItems.push(
          `Build a feature that showcases advanced usage of ${framework}, including tests and documentation.`,
          `Record architectural notes describing how ${framework} fits into this repository.`
        );
      }
    });
  } else if (languages.length > 0) {
    const primaryLanguage = languages[0].toLowerCase();
    plan.title = `Adopt a production-grade framework for ${languages[0]}`;

    if (primaryLanguage.includes('java')) {
      plan.description = 'This Java project does not showcase Spring Boot or other enterprise frameworks.';
      plan.impact = 'Adding Spring Boot patterns highlights enterprise readiness and backend expertise.';
      plan.actionItems.push(
        'Introduce Spring Boot starters (web, data) and migrate key logic into annotated services/controllers.',
        'Add REST endpoints with validation, DTOs, and exception handling.',
        'Create integration tests and document how to run the Spring Boot application locally.'
      );
    } else if (primaryLanguage.includes('javascript') || primaryLanguage.includes('typescript')) {
      plan.description = 'The repository uses JavaScript/TypeScript without a clear application framework.';
      plan.impact = 'Adopting frameworks like Next.js, NestJS, or Express signals production-ready delivery skills.';
      plan.actionItems.push(
        'Bootstrap a NestJS/Express layer and organise routes/controllers with validation.',
        'Add middleware, logging, and error handling that mirror real-world services.',
        'Document build and deployment steps for the chosen framework.'
      );
    } else if (primaryLanguage.includes('python')) {
      plan.description = 'No Flask, Django, or FastAPI usage detected in this Python project.';
      plan.impact = 'Introducing a mainstream Python web framework showcases backend architecture skills.';
      plan.actionItems.push(
        'Create a FastAPI or Django layer exposing core functionality with typed models.',
        'Write API/integration tests and wire them into continuous integration.',
        'Document server startup, environment variables, and deployment strategy.'
      );
    } else {
      plan.description = `No major frameworks detected for ${languages[0]}.`;
      plan.impact = 'Adopting a mainstream framework demonstrates architectural thinking and accelerates feature delivery.';
      plan.actionItems.push(
        `Prototype a feature using a widely-adopted ${languages[0]} framework and commit the results.`,
        'Explain framework selection and how it improves project maintainability.'
      );
    }
  }

  if (plan.actionItems.length === 0) {
    plan.actionItems.push(
      'Select a widely-used framework in your primary language and build a feature demonstrating best practices.',
      'Add automated tests and update documentation to cover the new framework usage.'
    );
  }

  if (!plan.title) {
    plan.title = frameworks.length > 0
      ? `Deepen expertise in ${formatList(frameworks)}`
      : 'Strengthen Framework Adoption';
  }

  if (!plan.description) {
    plan.description = frameworks.length > 0
      ? `Broaden how ${formatList(frameworks)} is applied so your GitHub history reflects production depth.`
      : 'Your repositories do not highlight production-ready framework usage yet.';
  }

  if (!plan.impact) {
    plan.impact = 'Elevating framework depth strengthens your portfolio signaling for senior product and platform work.';
  }

  return plan;
};
