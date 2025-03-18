library("keyring")

keyring_create("system", password = Sys.getenv("STRATEGUS__KEYRING_PASSWORD"))