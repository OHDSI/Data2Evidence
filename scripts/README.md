# Shell scripts
- [check-setupdemo-flow.mjs](check-setupdemo-flow.mjs) - check flows for setupdemo
- [check-setupdemohana-flow.mjs](check-setupdemohana-flow.mjs) - check flows for setupdemohana
- [cli.sh](cli.sh) - shell script for d2e cli
- [cli.ts](cli.ts) - typescript for d2e cli
- [create-cdm-schema.sh](create-cdm-schema.sh) - triggers plugin to create cdm schema and load synpuf data
- [lib.sh](lib.sh) - provides functions: random-password, random-uuid, gen-tls-internal, set-cpu-limit, set-memory-limit
- [lib.ts](lib.ts) - .ts version of `lib.sh`
- [load-demodatabase.mjs](load-demodatabase.mjs) - load demodatabase
- [load-demodataset.mjs](load-demodataset.mjs) - load demodataset
- [get-noproxy.mjs](get-noproxy.mjs) - get docker proxy configuration
- [setupdemo.mjs](setupdemo.mjs) - setup demo database
- [setupdemohana.mjs](setupdemohana.mjs) - setup demo database for hana

# For dev setup
- To compile cli.ts file 
```bash
yarn prepare 
# OR 
# npm run build:ts
```

- To start d2e: 
```bash
yarn local start
# OR 
yarn local --pull start # --pull flag: to pull latest docker image
```