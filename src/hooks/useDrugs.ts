// Re-export the shared drug cache from DrugsContext.
// All callers continue to `import { useDrugs } from '../hooks/useDrugs'`
// but now get the app-wide context value instead of per-component state.
export { useDrugs } from '../context/DrugsContext'
