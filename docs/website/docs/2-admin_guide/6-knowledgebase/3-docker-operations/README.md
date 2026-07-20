# Docker Resource Stats

## Docker stats

- [https://docs.docker.com/reference/cli/docker/container/stats/](https://docs.docker.com/reference/cli/docker/container/stats/)

```bash
docker stats --no-stream --format json > ~/stats.json
cat ~/stats.json | jq -r '.Name + "\t" + (.MemUsage|split("/")|.[0])' | awk '{ if(index($2, "GiB")) {gsub("GiB","",$2); $2=$2*1000 } else {gsub("MiB","",$2)}; sum += $2; print $0,"MiB"} END {print "TOTAL",sum/1024,"GiB"}' | sort -nk2 | tee stats.tsv
```

## Docker top

- [https://docs.docker.com/reference/cli/docker/container/top/](https://docs.docker.com/reference/cli/docker/container/top/)

```bash
docker top
```

## htop

- [https://htop.dev](https://htop.dev)

```bash
htop -s PERCENT_MEM
```
