# D2E Code Review Checklist

Use this checklist when reviewing pull requests for the Data2Evidence platform.

## Component-Specific Checks ✅

### Functions (Deno/TypeScript)
- [ ] Proper TypeScript typing for all functions
- [ ] Error handling with try/catch blocks
- [ ] Structured logging with context
- [ ] Function signatures are descriptive
- [ ] Async functions properly handle promises

**Example Pattern:**
```typescript
export async function processHealthData(
  data: HealthRecord[]
): Promise<ProcessedResult> {
  try {
    validateHealthData(data);
    return await transformToOmop(data);
  } catch (error) {
    logger.error('Health data processing failed', { 
      error: error.message,
      recordCount: data.length 
    });
    throw new ProcessingError('Failed to process health data');
  }
}
```

### Flows (Python/Prefect)
- [ ] Proper Prefect @flow and @task decorators
- [ ] Type hints for all function parameters
- [ ] Comprehensive error handling with logging
- [ ] Flow state management implemented
- [ ] Resource cleanup in finally blocks

**Example Pattern:**
```python
@task
def validate_omop_data(data: List[Dict]) -> bool:
    """Validate OMOP CDM compliance."""
    logger.info(f"Validating {len(data)} records")
    # Implementation with proper validation
    return True

@flow
def etl_pipeline(source_data: str) -> Dict:
    """Main ETL pipeline with proper error handling."""
    try:
        data = extract_data(source_data)
        validated = validate_omop_data(data)
        if not validated:
            raise ValueError("OMOP validation failed")
        return transform_and_load(data)
    except Exception as e:
        logger.error(f"ETL pipeline failed: {e}")
        raise
```

### UI (Vue.js/React)
- [ ] Vue 3 Composition API or React Hooks patterns
- [ ] Proper state management (Vuex/Pinia or Redux)
- [ ] Component props properly typed
- [ ] Error boundaries implemented
- [ ] Accessibility attributes included
- [ ] Permission-based UI rendering

**Example Pattern:**
```typescript
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/composables/auth'

export default {
  setup() {
    const { user, hasPermission } = useAuth()
    const patients = ref<Patient[]>([])
    
    const canViewPHI = computed(() => 
      hasPermission('view_phi') && user.value?.role === 'clinician'
    )
    
    const loadPatients = async () => {
      try {
        patients.value = await patientService.getPatients()
      } catch (error) {
        showError('Failed to load patients')
      }
    }
    
    onMounted(loadPatients)
    
    return { patients, canViewPHI, loadPatients }
  }
}
```


## Documentation ✅

### Code Documentation
- [ ] JSDoc/docstrings for all public functions
- [ ] API endpoint documentation with examples
- [ ] Configuration parameter descriptions
- [ ] Complex business logic explained with comments
- [ ] README updates for new features

## Common Anti-Patterns to Flag ❌

### Security Issues
- ❌ Hardcoded credentials or API keys
- ❌ SQL injection vulnerabilities (non-parameterized queries)
- ❌ XSS vulnerabilities (unescaped output)
- ❌ Overly permissive CORS settings
- ❌ Debug code left in production builds
- ❌ Sensitive data in logs or error messages

### Code Quality Issues
- ❌ Missing error handling in critical paths
- ❌ Functions without proper typing
- ❌ Magic numbers without explanation
- ❌ Deep nesting without refactoring
- ❌ Duplicate code that should be refactored
- ❌ Missing input validation
