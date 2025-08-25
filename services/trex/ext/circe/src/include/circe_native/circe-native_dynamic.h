#ifndef __CIRCE_NATIVE_H
#define __CIRCE_NATIVE_H

#include <graal_isolate_dynamic.h>


#if defined(__cplusplus)
extern "C" {
#endif

typedef char* (*circe_build_cohort_sql_fn_t)(graal_isolatethread_t*, char*, char*);

typedef int (*run_main_fn_t)(int argc, char** argv);

#if defined(__cplusplus)
}
#endif
#endif
