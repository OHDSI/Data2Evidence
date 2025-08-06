#!/usr/bin/env zx
import fs from 'fs';
import path from 'path';

// Set node_modules_path
let node_modules_path;
const args = process.argv.slice(2); 
const vIndex_node_modules_path = args.indexOf("--script_full_path");
if (vIndex_node_modules_path !== -1 && !args[vIndex_node_modules_path + 1].startsWith('-')) {
  node_modules_path = (args[vIndex_node_modules_path + 1]);
} else {
  console.log("Can't find d2e cli node_modules dir. You can set D2ECLI_NODE_MODULES_PATH to define the path. Exiting");
  process.exit(1);
}
console.log(`Using node_modules path: ${node_modules_path}`);

// Set docker config path
let dockerConfigPath;
if (process.env.DOCKER_CONFIG_PATH) {
  dockerConfigPath = process.env.DOCKER_CONFIG_PATH;
} else if (fs.existsSync(`${process.env.HOME}/.docker/config.json`)) {
  dockerConfigPath = `${process.env.HOME}/.docker/config.json`;
} else {
  console.log("Can't find Docker config path. You can set DOCKER_CONFIG_PATH to define the path or create the config.json file. Exiting");
  process.exit(1);
}
console.log(`Using docker config at: ${dockerConfigPath}`);

// Get docker-compose.yml path
let dockerComposePath = path.join(node_modules_path, './docker-compose.yml');
let composeFile;
if (fs.existsSync(dockerComposePath)) {
  console.log(`Found docker-compose.yml at: ${dockerComposePath}`);
  composeFile = `${dockerComposePath}`;
} else {
  console.log(`No docker-compose.yml found at: ${dockerComposePath}`);
  process.exit(1);
}

// Get noProxy settings from docker-compose.yml
let dcContainerName;
dcContainerName = await $`docker compose -f ${composeFile} --profile "*" config 2>/dev/null | yq '.services[].container_name'`;
let containerNames = dcContainerName.stdout.trim().split('\n').filter(name => name).join(',');
let newNoProxy = `.alp.local,registry-1.docker.io,localhost,::1,${containerNames}`;
let newHttpProxy = process.env.HTTP_PROXY || '' ;
let newHttpsProxy = process.env.HTTPS_PROXY || '' ;

// Read existing Docker config
let dockerConfig = {};
if (fs.existsSync(dockerConfigPath)) {
  dockerConfig = JSON.parse(fs.readFileSync(dockerConfigPath, 'utf-8'));
}

// Concatenate new proxy values to existing ones if present
dockerConfig.proxies = dockerConfig.proxies || {};
dockerConfig.proxies.default = dockerConfig.proxies.default || {};
dockerConfig.proxies.default.httpProxy = [dockerConfig.proxies.default.httpProxy,newHttpProxy].filter(Boolean).join(',');
dockerConfig.proxies.default.httpsProxy = [dockerConfig.proxies.default.httpsProxy,newHttpsProxy].filter(Boolean).join(',');
dockerConfig.proxies.default.noProxy = [dockerConfig.proxies.default.noProxy,newNoProxy].filter(Boolean).join(',');

// Print updated config
console.log(`Updated docker proxy:\n${JSON.stringify(dockerConfig, null, 2)}`);
