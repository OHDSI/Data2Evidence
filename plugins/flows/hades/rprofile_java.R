# R profile for the hades plugin environment (activation env sets
# R_PROFILE_USER to this file). Aligns rJava's explicit JVM parameters with
# JAVA_TOOL_OPTIONS before rJava loads: rJava defaults to -Xmx512m, and the
# JVM rejects JAVA_TOOL_OPTIONS' -Xms1g combined with that (initial > max).
local({
  jto <- Sys.getenv("JAVA_TOOL_OPTIONS", unset = "")
  if (nzchar(jto)) {
    params <- strsplit(jto, "\\s+")[[1]]
    options(java.parameters = params[nzchar(params)])
  }
})
