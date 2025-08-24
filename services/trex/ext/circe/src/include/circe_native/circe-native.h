#ifndef __CIRCE_NATIVE_H
#define __CIRCE_NATIVE_H

#include <graal_isolate.h>


#if defined(__cplusplus)
extern "C" {
#endif

char* circe_build_cohort_sql(graal_isolatethread_t*, char*, char*);

int run_main(int argc, char** argv);

#if defined(__cplusplus)
}
#endif
#endif
