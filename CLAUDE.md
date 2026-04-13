AI Hero Cohort taught by Matt Pocock (https://github.com/ai-hero-dev/cohort-003-project)


# Patterns
When you have a function with more than one parameter with the same type, use an object parameter instead of positional parameters:
```
// BAD
const addUserToPost = (userId: string, postId: string) => {};

// GOOD
const addUserToPost = (opts: { userId: string; postId: string }) => {};
```

Use consistent camelCase naming for variables, functions, and properties.

Handle errors explicitly — don't assume the happy path. Use try/catch, early returns, or validation as appropriate rather than letting failures pass silently.

Avoid using `any` types in TypeScript. Use specific types, generics, or `unknown` when the type isn't known.

# Testing

Any file named as a service (e.g., `bookmarkService.ts`, `auth-token-service.ts`) must have an accompanying `.test.ts` file with tests.
